export type {
  SeatPreference,
  TargetTrain,
  SniperStatus,
  LogEntry,
  ReservedTicket,
  SniperStartRequest,
  SniperStatusResponse,
  KorailSessionResponse,
} from '../../shared/types';

import type { TargetTrain } from '../../shared/types';

export interface TrainScheduleItem {
  trainNumber: string;
  trainType: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  departureStation: string;
  arrivalStation: string;
  generalSeatStatus: 'SOLD_OUT' | 'AVAILABLE';
  specialSeatStatus: 'SOLD_OUT' | 'AVAILABLE' | 'NOT_AVAILABLE';
  generalPrice: number;
  specialPrice: number;
}

/** 대시보드에서 입력받는 감시 설정 (계정 정보는 서버에만 보관) */
export interface SniperConfig {
  departureStation: string;
  arrivalStation: string;
  date: string; // YYYYMMDD
  time: string; // HHMMSS
  passengers: number;
  targets: TargetTrain[];
  minJitter: number;
  maxJitter: number;
  telegramBotToken: string;
  telegramChatId: string;
}
