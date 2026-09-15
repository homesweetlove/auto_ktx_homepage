import { KorailService } from './korail';
import { sendTelegramMessage, buildReservationAlertHtml } from './telegram';

export interface TargetTrainSpec {
  trainNumber: string;
  trainType: string;
  departureTime: string;
  arrivalTime: string;
  seatPreference: 'NORMAL' | 'SPECIAL' | 'ANY';
}

export interface SniperConfigPayload {
  departureStation: string;
  arrivalStation: string;
  date: string;
  baseTime?: string;
  passengers?: number;
  targets: TargetTrainSpec[];
  minJitter?: number;
  maxJitter?: number;
  membershipNumber?: string;
  password?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  isSimulationMode?: boolean;
}

export interface LogItem {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
  tag: 'ENGINE' | 'KORAIL' | 'HTTP' | 'TELEGRAM' | 'SECURITY';
  message: string;
  latencyMs?: number;
}

export class SniperManager {
  private isRunning = false;
  private status: 'IDLE' | 'LOGGING_IN' | 'POLLING' | 'RESERVING' | 'SUCCESS' | 'STOPPED' | 'ERROR' = 'IDLE';
  private pollCount = 0;
  private lastLatencyMs = 0;
  private currentJitter = 1.65;
  private logs: LogItem[] = [];
  private activeConfig: SniperConfigPayload | null = null;
  private korailService: KorailService | null = null;
  private reservedTicket: any = null;
  private loopTimeout: NodeJS.Timeout | null = null;

  public getStatus() {
    return {
      status: this.status,
      isRunning: this.isRunning,
      pollCount: this.pollCount,
      lastLatencyMs: this.lastLatencyMs,
      currentJitter: this.currentJitter,
      reservedTicket: this.reservedTicket,
      logs: this.logs,
    };
  }

  public addLog(
    level: LogItem['level'],
    tag: LogItem['tag'],
    message: string,
    latencyMs?: number
  ) {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    const item: LogItem = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timeStr,
      level,
      tag,
      message,
      latencyMs,
    };
    this.logs.push(item);
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(-150);
    }
  }

  public async start(config: SniperConfigPayload): Promise<{ success: boolean; message: string }> {
    await this.stop();

    this.activeConfig = config;
    this.isRunning = true;
    this.status = 'LOGGING_IN';
    this.pollCount = 0;
    this.reservedTicket = null;
    this.korailService = new KorailService();

    const targetSummary = config.targets
      .map((t) => `${t.trainType} ${t.trainNumber}호(${t.seatPreference})`)
      .join(', ');

    this.addLog(
      'INFO',
      'ENGINE',
      `스나이퍼 기동: [${config.departureStation} → ${config.arrivalStation}] (${config.date}) 타겟: ${targetSummary}`
    );

    // 1. 코레일 실제 로그인 (실제 모드 및 계정 제공 시)
    if (!config.isSimulationMode && config.membershipNumber && config.password) {
      this.addLog('INFO', 'SECURITY', `코레일 계정(${config.membershipNumber}) 실시간 세션 인증 요청 중...`);
      const loginRes = await this.korailService.login(config.membershipNumber, config.password);

      if (!loginRes.success) {
        this.status = 'ERROR';
        this.isRunning = false;
        this.addLog('ERROR', 'SECURITY', `코레일 로그인 실패: ${loginRes.message}`);
        return { success: false, message: loginRes.message || '코레일 로그인 실패' };
      }

      this.addLog(
        'SUCCESS',
        'ENGINE',
        `코레일 세션 인증 완료: ${loginRes.userName || '회원'}님 (${loginRes.membershipNumber})`
      );
    } else {
      this.addLog('INFO', 'ENGINE', '로그인 세션 준비 완료 (비로그인 모니터링 / 시뮬레이션 모드)');
    }

    if (config.telegramBotToken && config.telegramChatId) {
      this.addLog('INFO', 'TELEGRAM', `텔레그램 알림 파이프라인 연동 확인 (ChatID: ${config.telegramChatId})`);
    }

    this.status = 'POLLING';
    this.scheduleNextPoll();
    return { success: true, message: '스나이퍼 엔진이 정상 기동되었습니다.' };
  }

  public async stop(): Promise<{ success: boolean; message: string }> {
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.isRunning = false;
    this.status = 'STOPPED';

    if (this.korailService) {
      await this.korailService.logout();
      this.korailService = null;
    }

    this.addLog('WARN', 'ENGINE', '스나이퍼 안전 종료 완료 (코레일 세션 로그아웃)');
    return { success: true, message: '스나이퍼가 정지되었습니다.' };
  }

  public async triggerMockSuccess(targetTrain?: TargetTrainSpec) {
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }

    const config = this.activeConfig;
    const target = targetTrain || config?.targets[0] || {
      trainNumber: '025',
      trainType: 'KTX',
      departureTime: '09:58',
      arrivalTime: '12:46',
      seatPreference: 'NORMAL',
    };

    const seatKr = target.seatPreference === 'SPECIAL' ? '특실' : '일반실';
    const now = new Date();
    const deadline = new Date(now.getTime() + 10 * 60 * 1000);
    const pnrNo = `RES-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;

    const ticket = {
      reservationNumber: pnrNo,
      trainNumber: target.trainNumber,
      trainType: target.trainType,
      departureStation: config?.departureStation || '서울',
      arrivalStation: config?.arrivalStation || '부산',
      departureTime: target.departureTime,
      arrivalTime: target.arrivalTime,
      seatInfo: `${seatKr} 4호차 9A`,
      seatType: seatKr,
      reservedAt: now.toISOString(),
      paymentDeadline: deadline.toISOString(),
      totalPrice: target.seatPreference === 'SPECIAL' ? 83700 : 59800,
    };

    this.reservedTicket = ticket;
    this.status = 'SUCCESS';
    this.isRunning = false;

    this.addLog('SUCCESS', 'KORAIL', `🚨 [취소표 발견] ${target.trainType} ${target.trainNumber}호 ${seatKr} 잔여석 포착!`, 95);
    this.addLog('SUCCESS', 'ENGINE', `🎉 [선점 대성공] ${target.trainType} ${target.trainNumber}호 ${seatKr} 장바구니 담김 완료! (PNR: ${pnrNo})`);

    if (config?.telegramBotToken && config?.telegramChatId) {
      const msg = buildReservationAlertHtml({
        trainNumber: target.trainNumber,
        trainType: target.trainType,
        depStation: ticket.departureStation,
        arrStation: ticket.arrivalStation,
        depTime: ticket.departureTime,
        arrTime: ticket.arrivalTime,
        seatInfo: ticket.seatInfo,
        price: ticket.totalPrice,
        pnrNo,
      });
      await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, msg);
      this.addLog('SUCCESS', 'TELEGRAM', '📱 텔레그램 긴급 알림 푸시 발송 완료 (10분 결제 시한)');
    }

    this.addLog('INFO', 'SECURITY', '🔒 [세션 충돌 방지] 공식 코레일톡 앱 접속을 위해 백엔드 세션 즉각 로그아웃.');
    return ticket;
  }

  private scheduleNextPoll() {
    if (!this.isRunning || this.status !== 'POLLING') return;

    const minJ = this.activeConfig?.minJitter ?? 1.3;
    const maxJ = this.activeConfig?.maxJitter ?? 2.2;
    const jitter = parseFloat((Math.random() * (maxJ - minJ) + minJ).toFixed(2));
    this.currentJitter = jitter;

    this.loopTimeout = setTimeout(async () => {
      await this.executePollCycle();
      this.scheduleNextPoll();
    }, jitter * 1000);
  }

  private async executePollCycle() {
    if (!this.isRunning || !this.activeConfig || !this.korailService) return;

    this.pollCount++;
    const config = this.activeConfig;
    const t0 = Date.now();

    try {
      if (config.isSimulationMode) {
        // 시뮬레이션 모드
        await new Promise((r) => setTimeout(r, 120));
        const latency = Date.now() - t0;
        this.lastLatencyMs = latency;
        const targetNames = config.targets.map((t) => `${t.trainType} ${t.trainNumber}호`).join(', ');
        this.addLog('INFO', 'KORAIL', `[탐색 #${this.pollCount}] 타겟 열차(${targetNames}): 전 좌석 매진 상태`, latency);
        return;
      }

      // 실제 코레일 시간표 및 잔여석 실시간 조회!
      const trains = await this.korailService.searchTrains({
        dep: config.departureStation,
        arr: config.arrivalStation,
        date: config.date,
        time: config.baseTime || '000000',
        trainType: '100',
        passengers: config.passengers || 1,
      });

      const latency = Date.now() - t0;
      this.lastLatencyMs = latency;

      const targetMap = new Map<string, TargetTrainSpec>();
      for (const t of config.targets) {
        targetMap.set(t.trainNumber, t);
      }

      let foundTarget: TargetTrainSpec | null = null;
      let matchedTrainRaw: any = null;
      let matchedSeatPref: 'NORMAL' | 'SPECIAL' = 'NORMAL';

      for (const train of trains) {
        const spec = targetMap.get(train.trainNumber);
        if (spec) {
          const pref = spec.seatPreference;
          const hasNormal = train.hasNormalSeat;
          const hasSpecial = train.hasSpecialSeat;

          if (pref === 'NORMAL' && hasNormal) {
            foundTarget = spec;
            matchedTrainRaw = train._raw;
            matchedSeatPref = 'NORMAL';
            break;
          } else if (pref === 'SPECIAL' && hasSpecial) {
            foundTarget = spec;
            matchedTrainRaw = train._raw;
            matchedSeatPref = 'SPECIAL';
            break;
          } else if (pref === 'ANY') {
            if (hasNormal) {
              foundTarget = spec;
              matchedTrainRaw = train._raw;
              matchedSeatPref = 'NORMAL';
              break;
            } else if (hasSpecial) {
              foundTarget = spec;
              matchedTrainRaw = train._raw;
              matchedSeatPref = 'SPECIAL';
              break;
            }
          }
        }
      }

      if (foundTarget && matchedTrainRaw) {
        // 취소표 즉시 포착!!
        const seatKr = matchedSeatPref === 'SPECIAL' ? '특실' : '일반실';
        this.status = 'RESERVING';
        this.addLog(
          'SUCCESS',
          'KORAIL',
          `🚨 [취소표 발견!!] ${foundTarget.trainType} ${foundTarget.trainNumber}호 ${seatKr} 잔여석 포착!`,
          latency
        );
        this.addLog('INFO', 'ENGINE', '즉각 선점 트랜잭션 TicketReservation 전송 중...');

        const reserveRes = await this.korailService.reserve(
          matchedTrainRaw,
          matchedSeatPref,
          config.passengers || 1
        );

        if (reserveRes.success) {
          const now = new Date();
          const deadline = new Date(now.getTime() + 10 * 60 * 1000);
          const pnr = reserveRes.pnrNo || `RES-${now.getFullYear()}${now.getMonth() + 1}-${Math.floor(Math.random() * 89999 + 10000)}`;

          const ticket = {
            reservationNumber: pnr,
            trainNumber: foundTarget.trainNumber,
            trainType: foundTarget.trainType,
            departureStation: config.departureStation,
            arrivalStation: config.arrivalStation,
            departureTime: foundTarget.departureTime,
            arrivalTime: foundTarget.arrivalTime,
            seatInfo: reserveRes.seatInfo || `${seatKr} 4호차 9A`,
            seatType: seatKr,
            reservedAt: now.toISOString(),
            paymentDeadline: deadline.toISOString(),
            totalPrice: reserveRes.price || 59800,
          };

          this.reservedTicket = ticket;
          this.status = 'SUCCESS';
          this.isRunning = false;

          this.addLog(
            'SUCCESS',
            'ENGINE',
            `🎉 [선점 대성공] ${foundTarget.trainType} ${foundTarget.trainNumber}호 장바구니 담김 완료! (PNR: ${pnr})`
          );

          if (config.telegramBotToken && config.telegramChatId) {
            const msg = buildReservationAlertHtml({
              trainNumber: foundTarget.trainNumber,
              trainType: foundTarget.trainType,
              depStation: config.departureStation,
              arrStation: config.arrivalStation,
              depTime: foundTarget.departureTime,
              arrTime: foundTarget.arrivalTime,
              seatInfo: ticket.seatInfo,
              price: ticket.totalPrice,
              pnrNo: pnr,
            });
            await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, msg);
            this.addLog('SUCCESS', 'TELEGRAM', '📱 텔레그램 긴급 알림 푸시 발송 완료 (10분 결제 시한)');
          }

          // 세션 즉시 해제
          await this.korailService.logout();
          this.addLog('INFO', 'SECURITY', '🔒 [세션 충돌 방지] 공식 코레일톡 앱 접속을 위해 백엔드 세션 즉각 로그아웃.');
        } else {
          this.addLog('WARN', 'ENGINE', `선점 실패(다른 예약자 선점 등): ${reserveRes.message} - 탐색 재개`);
          this.status = 'POLLING';
        }
      } else {
        // 계속 매진
        const summaries: string[] = [];
        for (const t of trains) {
          if (targetMap.has(t.trainNumber)) {
            const gn = t.hasNormalSeat ? '일반O' : '일반X';
            const sp = t.hasSpecialSeat ? '특실O' : '특실X';
            summaries.push(`${t.trainNumber}호(${gn},${sp})`);
          }
        }
        const summaryStr = summaries.length > 0 ? summaries.join(' | ') : '타겟 열차 상태 모니터링 중';
        this.addLog('INFO', 'KORAIL', `[탐색 #${this.pollCount}] ${summaryStr}`, latency);
      }
    } catch (err: any) {
      this.addLog('WARN', 'HTTP', `일시 통신 에러 (자동 재시도): ${err.message || err}`);
    }
  }
}

export const sniperManager = new SniperManager();
