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

export interface TargetTrain {
  trainNumber: string;
  trainType: string;
  departureTime: string;
  arrivalTime: string;
  seatPreference: 'NORMAL' | 'SPECIAL' | 'ANY';
}

export interface SniperConfig {
  departureStation: string;
  arrivalStation: string;
  date: string; // YYYYMMDD
  time: string; // HHMMSS
  passengers: number;
  targets: TargetTrain[];
  minJitter: number;
  maxJitter: number;
  membershipNumber: string;
  password: string;
  telegramBotToken: string;
  telegramChatId: string;
  stopOnSuccess: boolean;
  autoLogoutOnSuccess: boolean;
}

export type SniperStatus = 'IDLE' | 'LOGGING_IN' | 'POLLING' | 'RESERVING' | 'SUCCESS' | 'ERROR' | 'STOPPED';

export interface ReservedTicket {
  reservationNumber: string;
  trainNumber: string;
  trainType: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  seatInfo: string;
  seatType: string;
  reservedAt: Date;
  paymentDeadline: Date;
  totalPrice: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
  tag: 'ENGINE' | 'HTTP' | 'KORAIL' | 'TELEGRAM' | 'SECURITY';
  message: string;
  latencyMs?: number;
}

export interface BackendFile {
  name: string;
  path: string;
  category: 'core' | 'api' | 'service' | 'config' | 'deploy';
  description: string;
  language: 'python' | 'bash' | 'dockerfile' | 'yaml' | 'ini' | 'text';
  content: string;
}
