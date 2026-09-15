import asyncio
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    SearchSchedulesRequest, KorailLoginRequest,
    TelegramTestRequest, SniperStartRequest, MockTriggerRequest
)
from app.core.korail_client import KorailClient
from app.services.telegram_service import send_telegram_message
from app.services.sniper_worker import sniper_manager

router = APIRouter(prefix="/api")

@router.get("/health")
async def health_check():
    return {
        "status": "online",
        "service": "KTX Sniper Engine",
        "workerStatus": sniper_manager.status,
        "pollCount": sniper_manager.poll_count,
    }

@router.post("/korail/search")
async def search_schedules(req: SearchSchedulesRequest):
    """
    실시간 코레일 KTX 열차 시간표 및 좌석 현황 조회
    """
    client = KorailClient()
    try:
        trains = await asyncio.to_thread(
            client.search_trains,
            req.departureStation,
            req.arrivalStation,
            req.date,
            req.time,
            req.trainType,
            req.passengers
        )
        return {
            "success": True,
            "totalCount": len(trains),
            "date": req.date,
            "departureStation": req.departureStation,
            "arrivalStation": req.arrivalStation,
            "schedules": trains
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"열차 조회 실패: {str(e)}",
            "schedules": []
        }

@router.post("/korail/login")
async def test_korail_login(req: KorailLoginRequest):
    """
    코레일 계정 로그인 검증 테스트
    """
    client = KorailClient()
    try:
        res = await asyncio.to_thread(client.login, req.membershipNumber, req.password)
        # 보안을 위해 즉시 로그아웃
        if res.get("success"):
            await asyncio.to_thread(client.logout)
        return res
    except Exception as e:
        return {"success": False, "message": f"로그인 통신 실패: {str(e)}"}

@router.post("/telegram/test")
async def test_telegram(req: TelegramTestRequest):
    """
    텔레그램 봇 토큰 및 Chat ID 발송 테스트
    """
    test_msg = (
        "🚄 <b>[KTX Sniper] 텔레그램 연동 성공!</b>\n\n"
        "알림 파이프라인이 정상적으로 연결되었습니다.\n"
        "취소표가 포착되면 10분 결제 시한과 함께 즉시 푸시 알림이 발송됩니다."
    )
    res = await asyncio.to_thread(send_telegram_message, req.botToken, req.chatId, test_msg)
    return res

@router.post("/sniper/start")
async def start_sniper(req: SniperStartRequest):
    """
    스나이퍼 감시 및 선점 프로세스 기동
    """
    res = await sniper_manager.start(req)
    return res

@router.post("/sniper/stop")
async def stop_sniper():
    """
    스나이퍼 안전 종료
    """
    res = await sniper_manager.stop()
    return res

@router.get("/sniper/status")
async def get_sniper_status():
    """
    실시간 스나이퍼 관제 상태 조회
    """
    return {
        "status": sniper_manager.status,
        "pollCount": sniper_manager.poll_count,
        "lastLatencyMs": sniper_manager.last_latency_ms,
        "currentJitter": sniper_manager.current_jitter,
        "reservedTicket": sniper_manager.reserved_ticket,
        "logs": sniper_manager.logs
    }

@router.post("/sniper/mock-trigger")
async def trigger_mock(req: MockTriggerRequest):
    """
    테스트용 모의 선점 트리거
    """
    ticket = await sniper_manager.trigger_mock_success(req.targetTrain)
    return {"success": True, "ticket": ticket}
