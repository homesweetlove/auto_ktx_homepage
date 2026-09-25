// 서버(server/)와 클라이언트(src/)가 함께 쓰는 API 타입

export type SeatPreference = 'NORMAL' | 'SPECIAL' | 'ANY';

export interface TargetTrain {
  trainNumber: string;
  trainType: string;
  departureTime: string;
  arrivalTime: string;
  seatPreference: SeatPreference;
}

export type SniperStatus = 'IDLE' | 'LOGGING_IN' | 'POLLING' | 'RESERVING' | 'SUCCESS' | 'ERROR' | 'STOPPED';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
  tag: 'ENGINE' | 'HTTP' | 'KORAIL' | 'TELEGRAM' | 'SECURITY';
  message: string;
  latencyMs?: number;
}

/**
 * 예약 결과. 코레일 응답에서 확인하지 못한 값은 추정값으로 채우지 않고 null로 둔다.
 */
export interface ReservedTicket {
  reservationNumber: string | null;
  trainNumber: string;
  trainType: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  seatInfo: string | null;
  seatType: string;
  reservedAt: string; // ISO 8601
  paymentDeadline: string | null; // ISO 8601
  totalPrice: number | null;
  /** 예약번호·결제기한을 코레일 응답에서 모두 확인했는지 여부 */
  verified: boolean;
  /** 테스트 트리거로 만든 가짜 결과인지 여부 */
  isMock: boolean;
}

export interface SniperStartRequest {
  departureStation: string;
  arrivalStation: string;
  date: string; // YYYYMMDD
  baseTime?: string; // HHMMSS
  passengers?: number;
  targets: TargetTrain[];
  minJitter?: number;
  maxJitter?: number;
  telegramBotToken?: string;
  telegramChatId?: string;
  isSimulationMode?: boolean;
}

export interface SniperStatusResponse {
  status: SniperStatus;
  isRunning: boolean;
  pollCount: number;
  lastLatencyMs: number;
  currentJitter: number;
  reservedTicket: ReservedTicket | null;
  logs: LogEntry[];
}

export interface KorailSessionResponse {
  loggedIn: boolean;
  membershipNumber?: string;
  userName?: string;
}
