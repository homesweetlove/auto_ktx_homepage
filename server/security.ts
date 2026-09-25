import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

/**
 * ADMIN_TOKEN이 설정되어 있으면 `Authorization: Bearer <token>` 헤더를 요구한다.
 * 설정되지 않은 경우는 서버가 루프백에만 바인딩된 경우뿐이다 (server.ts에서 강제).
 */
export function requireAdminToken(adminToken: string | undefined) {
  const expected = adminToken ? Buffer.from(adminToken, 'utf-8') : null;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!expected) return next();

    const header = req.get('authorization') || '';
    const match = /^Bearer (.+)$/.exec(header);
    const given = match ? Buffer.from(match[1], 'utf-8') : null;

    if (!given || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      return res.status(401).json({ success: false, message: '관리자 토큰이 필요합니다.' });
    }
    next();
  };
}

/**
 * 단순 고정 윈도우 방식의 IP별 요청 제한 (단일 프로세스용).
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message: `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도해주세요.`,
      });
    }

    if (hits.size > 1000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    next();
  };
}
