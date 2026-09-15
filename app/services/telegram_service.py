import logging
import requests

logger = logging.getLogger("ktx_sniper.telegram")

def send_telegram_message(bot_token: str, chat_id: str, text: str) -> dict:
    """
    텔레그램 봇 API를 통해 즉시 푸시 알림 발송
    """
    if not bot_token or not chat_id:
        return {"success": False, "message": "텔레그램 토큰 또는 Chat ID가 설정되지 않았습니다."}

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }

    try:
        res = requests.post(url, json=payload, timeout=8)
        data = res.json()
        if data.get("ok"):
            logger.info(f"텔레그램 발송 성공 (chat_id: {chat_id})")
            return {"success": True, "result": data.get("result")}
        else:
            desc = data.get("description", "텔레그램 API 오류")
            logger.warning(f"텔레그램 발송 실패: {desc}")
            return {"success": False, "message": desc}
    except Exception as e:
        logger.error(f"텔레그램 발송 예외: {e}")
        return {"success": False, "message": str(e)}

def build_reservation_alert(
    train_number: str,
    train_type: str,
    dep_station: str,
    arr_station: str,
    dep_time: str,
    arr_time: str,
    seat_info: str,
    price: int,
    pnr_no: str
) -> str:
    """
    10분 결제 골든타임 경고를 포함한 긴급 알림 템플릿
    """
    return f"""🚨 <b>[KTX 취소표 자동 선점 성공!]</b> 🚨

🚄 <b>열차</b>: {train_type} {train_number}호
📍 <b>구간</b>: {dep_station} ({dep_time}) ➔ {arr_station} ({arr_time})
💺 <b>좌석</b>: {seat_info}
💳 <b>결제금액</b>: {price:,}원
🎫 <b>예약번호(PNR)</b>: <code>{pnr_no}</code>

⚠️ <b>[필독] 10분 이내 결제 필수!</b>
지금 즉시 <b>코레일톡(공식 앱)</b> 실행 ➔ [장바구니/승차권] 메뉴에서 결제를 완료해 주세요!
(※ 세션 충돌 방지를 위해 백엔드는 즉각 로그아웃되었습니다)
"""
