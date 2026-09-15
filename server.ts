import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { KorailService } from './server/korail';
import { sniperManager } from './server/sniperManager';
import { sendTelegramMessage } from './server/telegram';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.get('/api/health', (req, res) => {
    const status = sniperManager.getStatus();
    res.json({
      status: 'online',
      service: 'KTX Sniper Full-Stack Engine',
      workerStatus: status.status,
      isRunning: status.isRunning,
    });
  });

  // 1. 코레일 실제 로그인 엔드포인트
  app.post('/api/korail/login', async (req, res) => {
    const { membershipNumber, password } = req.body;
    if (!membershipNumber || !password) {
      return res.status(400).json({ success: false, message: '회원번호와 비밀번호를 입력해주세요.' });
    }

    try {
      const korail = new KorailService();
      const loginRes = await korail.login(membershipNumber, password);
      // 안전을 위해 세션 즉시 로그아웃
      if (loginRes.success) {
        await korail.logout();
      }
      return res.json(loginRes);
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        message: e.message || '코레일 로그인 중 오류가 발생했습니다.',
      });
    }
  });

  // 2. 코레일 실제 실시간 KTX 시간표 & 좌석 조회 엔드포인트
  app.post('/api/korail/search', async (req, res) => {
    const {
      departureStation = '서울',
      arrivalStation = '부산',
      date,
      time = '000000',
      trainType = '100',
      passengers = 1,
    } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: '출발일자(date)가 필요합니다.' });
    }

    try {
      const korail = new KorailService();
      const schedules = await korail.searchTrains({
        dep: departureStation,
        arr: arrivalStation,
        date,
        time,
        trainType,
        passengers: Number(passengers),
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
  app.post('/api/sniper/start', async (req, res) => {
    try {
      const result = await sniperManager.start(req.body);
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
    const status = sniperManager.getStatus();
    return res.json(status);
  });

  // 6. 테스트 모의 선점 트리거
  app.post('/api/sniper/mock-trigger', async (req, res) => {
    const ticket = await sniperManager.triggerMockSuccess(req.body.targetTrain);
    return res.json({ success: true, ticket });
  });

  // 7. 텔레그램 테스트
  app.post('/api/telegram/test', async (req, res) => {
    const { botToken, chatId } = req.body;
    const testMsg = `🚄 <b>[KTX Sniper] 텔레그램 연동 성공!</b>\n\n알림 파이프라인이 정상적으로 연결되었습니다.\n취소표가 포착되면 10분 결제 시한과 함께 즉시 푸시 알림이 발송됩니다.`;
    const result = await sendTelegramMessage(botToken, chatId, testMsg);
    return res.json(result);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚄 KTX Sniper Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
