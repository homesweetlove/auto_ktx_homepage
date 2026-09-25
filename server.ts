import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { KorailService } from './server/korail';
import { sniperManager, KorailCredentials } from './server/sniperManager';
import { sendTelegramMessage } from './server/telegram';
import { isLoopbackHost, rateLimit, requireAdminToken } from './server/security';
import {
  validateBody,
  loginSchema,
  searchSchema,
  startSchema,
  mockTriggerSchema,
  telegramTestSchema,
} from './server/validation';
import type { KorailSessionResponse } from './shared/types';

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || undefined;

  // 외부에 노출되는 주소로 바인딩할 때는 반드시 관리자 토큰을 요구한다.
  if (!isLoopbackHost(HOST) && !ADMIN_TOKEN) {
    console.error(
      `HOST=${HOST} 로 외부에 노출하려면 ADMIN_TOKEN 환경변수를 설정해야 합니다. ` +
        '로컬에서만 쓰려면 HOST를 비워두세요 (기본값 127.0.0.1).'
    );
    process.exit(1);
  }

  // 코레일 계정 정보는 서버 메모리(또는 환경변수)에만 보관하고 클라이언트로 돌려보내지 않는다.
  let korailCredentials: KorailCredentials | null =
    process.env.KORAIL_ID && process.env.KORAIL_PASSWORD
      ? { id: process.env.KORAIL_ID, password: process.env.KORAIL_PASSWORD }
      : null;
  let korailProfile: { membershipNumber?: string; userName?: string } = {};

  const app = express();
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (req, res) => {
    const status = sniperManager.getStatus();
    res.json({
      status: 'online',
      service: 'KTX Sniper',
      workerStatus: status.status,
      isRunning: status.isRunning,
    });
  });

  // /api/health 외의 모든 API는 관리자 토큰 필요 (ADMIN_TOKEN 설정 시)
  app.use('/api', requireAdminToken(ADMIN_TOKEN));

  // 1. 코레일 로그인 확인 (성공 시 계정 정보를 서버 메모리에 보관)
  app.post(
    '/api/korail/login',
    rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }),
    validateBody(loginSchema),
    async (req, res) => {
      const { membershipNumber, password } = req.body;
      try {
        const korail = new KorailService();
        const loginRes = await korail.login(membershipNumber, password);
        // 안전을 위해 세션 즉시 로그아웃
        if (loginRes.success) {
          await korail.logout();
          korailCredentials = { id: membershipNumber, password };
          korailProfile = { membershipNumber: loginRes.membershipNumber, userName: loginRes.userName };
        }
        return res.json(loginRes);
      } catch (e: any) {
        return res.status(500).json({
          success: false,
          message: e.message || '코레일 로그인 중 오류가 발생했습니다.',
        });
      }
    }
  );

  app.post('/api/korail/logout', (req, res) => {
    korailCredentials = null;
    korailProfile = {};
    return res.json({ success: true });
  });

  app.get('/api/korail/session', (req, res) => {
    const body: KorailSessionResponse = korailCredentials
      ? { loggedIn: true, ...korailProfile }
      : { loggedIn: false };
    return res.json(body);
  });

  // 2. 코레일 KTX 시간표 & 좌석 조회
  app.post('/api/korail/search', validateBody(searchSchema), async (req, res) => {
    const { departureStation, arrivalStation, date, time, trainType, passengers } = req.body;

    try {
      const korail = new KorailService();
      const schedules = await korail.searchTrains({
        dep: departureStation,
        arr: arrivalStation,
        date,
        time,
        trainType,
        passengers,
      });

      return res.json({
        success: true,
        departureStation,
        arrivalStation,
        date,
        totalCount: schedules.length,
        schedules,
      });
    } catch (e: any) {
      console.error('시간표 조회 오류:', e);
      return res.status(500).json({
        success: false,
        message: e.message || '시간표 조회 중 오류가 발생했습니다.',
        schedules: [],
      });
    }
  });

  // 3. 스나이퍼 시작
  app.post('/api/sniper/start', validateBody(startSchema), async (req, res) => {
    if (!req.body.isSimulationMode && !korailCredentials) {
      return res.status(400).json({
        success: false,
        message: '서버에 저장된 코레일 로그인 정보가 없습니다. 다시 로그인해주세요.',
      });
    }
    try {
      const result = await sniperManager.start(req.body, korailCredentials);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message || '스나이퍼 기동 실패' });
    }
  });

  // 4. 스나이퍼 정지
  app.post('/api/sniper/stop', async (req, res) => {
    try {
      const result = await sniperManager.stop();
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message || '스나이퍼 정지 실패' });
    }
  });

  // 5. 스나이퍼 실시간 상태 및 로그 조회
  app.get('/api/sniper/status', (req, res) => {
    return res.json(sniperManager.getStatus());
  });

  // 6. 테스트 모의 선점 트리거 (실제 예약 아님)
  app.post('/api/sniper/mock-trigger', validateBody(mockTriggerSchema), async (req, res) => {
    const ticket = await sniperManager.triggerMockSuccess(req.body.targetTrain);
    return res.json({ success: true, ticket });
  });

  // 7. 텔레그램 테스트
  app.post(
    '/api/telegram/test',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validateBody(telegramTestSchema),
    async (req, res) => {
      const { botToken, chatId } = req.body;
      const testMsg = `🚄 <b>[KTX Sniper] 텔레그램 연동 성공!</b>\n\n알림 파이프라인이 정상적으로 연결되었습니다.\n취소표가 포착되면 결제 기한과 함께 즉시 푸시 알림이 발송됩니다.`;
      const result = await sendTelegramMessage(botToken, chatId, testMsg);
      return res.json(result);
    }
  );

  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: '존재하지 않는 API입니다.' });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚄 KTX Sniper server running on http://${HOST}:${PORT}`);
    if (!ADMIN_TOKEN) console.log('ADMIN_TOKEN 미설정: 로컬(루프백) 접속만 허용됩니다.');
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
