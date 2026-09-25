import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

const stationName = z.string().trim().min(1).max(20);
// YYYYMMDD 또는 YYYY-MM-DD → YYYYMMDD
const dateString = z
  .string()
  .regex(/^\d{4}-?\d{2}-?\d{2}$/, '날짜는 YYYYMMDD 형식이어야 합니다.')
  .transform((v) => v.replace(/-/g, ''));
// HHMMSS 또는 HH:MM[:SS] → HHMMSS
const timeString = z
  .string()
  .regex(/^\d{2}:?\d{2}(:?\d{2})?$/, '시간은 HHMMSS 형식이어야 합니다.')
  .transform((v) => v.replace(/:/g, '').padEnd(6, '0'));
const passengers = z.coerce.number().int().min(1).max(9);

export const targetTrainSchema = z.object({
  trainNumber: z.string().regex(/^[0-9A-Za-z]{1,6}$/),
  trainType: z.string().max(20),
  departureTime: z.string().max(8),
  arrivalTime: z.string().max(8),
  seatPreference: z.enum(['NORMAL', 'SPECIAL', 'ANY']),
});

export const loginSchema = z.object({
  membershipNumber: z.string().trim().min(1, '회원번호를 입력해주세요.').max(100),
  password: z.string().min(1, '비밀번호를 입력해주세요.').max(100),
});

export const searchSchema = z.object({
  departureStation: stationName.default('서울'),
  arrivalStation: stationName.default('부산'),
  date: dateString,
  time: timeString.default('000000'),
  trainType: z.string().regex(/^\d{3}$/).default('100'),
  passengers: passengers.default(1),
});

// 조회 주기 하한(초). 너무 짧은 주기로 대상 서비스에 부담을 주지 않도록 서버에서 강제한다.
export const MIN_POLL_INTERVAL_SEC = 1.0;

export const startSchema = z
  .object({
    departureStation: stationName,
    arrivalStation: stationName,
    date: dateString,
    baseTime: timeString.optional(),
    passengers: passengers.optional(),
    targets: z.array(targetTrainSchema).min(1, '감시할 열차를 1개 이상 선택해주세요.').max(20),
    minJitter: z.number().min(MIN_POLL_INTERVAL_SEC).max(60).optional(),
    maxJitter: z.number().min(MIN_POLL_INTERVAL_SEC).max(60).optional(),
    telegramBotToken: z.string().max(100).optional(),
    telegramChatId: z.string().max(50).optional(),
    isSimulationMode: z.boolean().optional(),
  })
  .refine((v) => v.minJitter === undefined || v.maxJitter === undefined || v.minJitter <= v.maxJitter, {
    message: 'minJitter는 maxJitter보다 클 수 없습니다.',
    path: ['minJitter'],
  });

export const mockTriggerSchema = z.object({
  targetTrain: targetTrainSchema.optional(),
});

export const telegramTestSchema = z.object({
  // 토큰이 URL 경로에 들어가므로 형식을 엄격히 제한한다.
  botToken: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/, '봇 토큰 형식이 올바르지 않습니다.'),
  chatId: z.string().regex(/^(-?\d+|@[A-Za-z0-9_]{5,})$/, 'Chat ID 형식이 올바르지 않습니다.'),
});

/**
 * req.body를 스키마로 검증해 변환된 값으로 교체한다. 실패 시 400.
 */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? ` (${issue.path.join('.')})` : '';
      return res.status(400).json({ success: false, message: `${issue?.message ?? '잘못된 요청입니다.'}${where}` });
    }
    req.body = parsed.data;
    next();
  };
}
