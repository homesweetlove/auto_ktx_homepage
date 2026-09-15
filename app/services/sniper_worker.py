import asyncio
import datetime
import logging
import random
import time
from typing import List, Optional

from app.core.korail_client import KorailClient
from app.core.security import encrypt_credential, decrypt_credential
from app.services.telegram_service import send_telegram_message, build_reservation_alert
from app.models.schemas import SniperStartRequest, TargetTrainItem

logger = logging.getLogger("ktx_sniper.worker")

class SniperManager:
    """
    KTX 취소표 실시간 백그라운드 감시 및 원자적 선점 싱글톤 매니저
    """
    def __init__(self):
        self.task: Optional[asyncio.Task] = None
        self.status: str = "IDLE"  # IDLE, LOGGING_IN, POLLING, RESERVING, SUCCESS, STOPPED, ERROR
        self.poll_count: int = 0
        self.last_latency_ms: int = 0
        self.current_jitter: float = 1.65
        self.logs: list = []
        self.reserved_ticket: Optional[dict] = None
        self.active_config: Optional[SniperStartRequest] = None
        self.korail_client: Optional[KorailClient] = None
        self._encrypted_pw: Optional[str] = None

    def add_log(self, level: str, tag: str, message: str, latency_ms: Optional[int] = None):
        now = datetime.datetime.now()
        time_str = now.strftime("%H:%M:%S") + f".{int(now.microsecond / 1000):03d}"
        entry = {
            "id": f"{int(time.time() * 1000)}-{random.randint(100, 999)}",
            "timestamp": time_str,
            "level": level,
            "tag": tag,
            "message": message,
            "latencyMs": latency_ms
        }
        self.logs.append(entry)
        if len(self.logs) > 300:
            self.logs = self.logs[-200:]
        logger.info(f"[{level}] [{tag}] {message}")

    async def start(self, config: SniperStartRequest):
        if self.task and not self.task.done():
            await self.stop()

        self.active_config = config
        self.status = "LOGGING_IN"
        self.poll_count = 0
        self.reserved_ticket = None

        if config.password:
            self._encrypted_pw = encrypt_credential(config.password)
        else:
            self._encrypted_pw = None

        self.add_log(
            "INFO", "ENGINE",
            f"스나이퍼 기동: [{config.departureStation} → {config.arrivalStation}] ({config.date}) "
            f"타겟: {len(config.targets)}개 열차 ({'시뮬레이션 모드' if config.isSimulationMode else '실제 코레일 연동'})"
        )

        self.task = asyncio.create_task(self._run_loop())
        return {"success": True, "message": "스나이퍼가 성공적으로 시작되었습니다."}

    async def stop(self):
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

        if self.korail_client and self.korail_client.is_logged_in:
            await asyncio.to_thread(self.korail_client.logout)

        self.status = "STOPPED"
        self.add_log("WARN", "ENGINE", "스나이퍼 워커 취소 신호 수신. 안전 종료 완료.")
        return {"success": True, "message": "스나이퍼가 정지되었습니다."}

    async def trigger_mock_success(self, target_train: Optional[TargetTrainItem] = None):
        """테스트 및 UI/알림 검증용 모의 선점 트리거"""
        if self.task and not self.task.done():
            self.task.cancel()

        target = target_train or (self.active_config.targets[0] if self.active_config and self.active_config.targets else None)
        train_no = target.trainNumber if target else "025"
        train_type = target.trainType if target else "KTX"
        pref = target.seatPreference if target else "NORMAL"
        seat_name = "특실" if pref == "SPECIAL" else "일반실"

        now = datetime.datetime.now()
        deadline = now + datetime.timedelta(minutes=10)
        pnr_no = f"RES-{now.strftime('%Y%m%d')}-{random.randint(10000, 99999)}"

        ticket = {
            "reservationNumber": pnr_no,
            "trainNumber": train_no,
            "trainType": train_type,
            "departureStation": self.active_config.departureStation if self.active_config else "서울",
            "arrivalStation": self.active_config.arrivalStation if self.active_config else "부산",
            "departureTime": target.departureTime if target else "09:58",
            "arrivalTime": target.arrivalTime if target else "12:46",
            "seatInfo": f"{seat_name} 4호차 9A",
            "seatType": seat_name,
            "reservedAt": now.isoformat(),
            "paymentDeadline": deadline.isoformat(),
            "totalPrice": 83700 if pref == "SPECIAL" else 59800
        }

        self.reserved_ticket = ticket
        self.status = "SUCCESS"
        self.add_log("SUCCESS", "KORAIL", f"🚨 [취소표 발견] {train_type} {train_no}호 {seat_name} 잔여석 포착!", 112)
        self.add_log("SUCCESS", "ENGINE", f"🎉 [선점 대성공] {train_type} {train_no}호 {seat_name} 장바구니 담김 완료! (PNR: {pnr_no})")

        # 텔레그램 알림
        if self.active_config and self.active_config.telegramBotToken and self.active_config.telegramChatId:
            msg = build_reservation_alert(
                train_no, train_type, ticket["departureStation"], ticket["arrivalStation"],
                ticket["departureTime"], ticket["arrivalTime"], ticket["seatInfo"], ticket["totalPrice"], pnr_no
            )
            await asyncio.to_thread(
                send_telegram_message,
                self.active_config.telegramBotToken,
                self.active_config.telegramChatId,
                msg
            )
            self.add_log("SUCCESS", "TELEGRAM", "📱 텔레그램 긴급 알림 푸시 발송 완료 (10분 결제 시한)")

        self.add_log("INFO", "SECURITY", "🔒 [세션 충돌 방지] 공식 코레일톡 앱 접속을 위해 백엔드 세션 즉각 로그아웃 완료.")
        return ticket

    async def _run_loop(self):
        config = self.active_config
        self.korail_client = KorailClient()

        # 1. 로그인 단계 (실제 모드일 때)
        if not config.isSimulationMode and config.membershipNumber and self._encrypted_pw:
            self.status = "LOGGING_IN"
            self.add_log("INFO", "SECURITY", f"코레일 계정({config.membershipNumber}) 로그인 세션 수립 중...")
            raw_pw = decrypt_credential(self._encrypted_pw)
            login_res = await asyncio.to_thread(self.korail_client.login, config.membershipNumber, raw_pw)
            if not login_res.get("success"):
                self.status = "ERROR"
                self.add_log("ERROR", "SECURITY", f"코레일 로그인 실패: {login_res.get('message')}")
                return
            self.add_log("SUCCESS", "ENGINE", f"코레일 세션 인증 완료: {login_res.get('userName')}님")
        else:
            self.add_log("INFO", "ENGINE", "로그인 세션 준비 완료 (시뮬레이션/비로그인 모니터링 모드)")

        if config.telegramBotToken and config.telegramChatId:
            self.add_log("INFO", "TELEGRAM", f"텔레그램 알림 파이프라인 연동 확인 (ChatID: {config.telegramChatId})")

        self.status = "POLLING"
        target_train_nums = {t.trainNumber: t for t in config.targets}

        try:
            while True:
                self.poll_count += 1
                t0 = time.time()

                # 지터 계산
                jitter = round(random.uniform(config.minJitter, config.maxJitter), 2)
                self.current_jitter = jitter

                try:
                    if config.isSimulationMode:
                        # 시뮬레이션 모드: 약간의 지연 후 가상 조회
                        await asyncio.sleep(random.uniform(0.1, 0.25))
                        latency = int((time.time() - t0) * 1000)
                        self.last_latency_ms = latency
                        
                        target_names = [f"{t.trainType} {t.trainNumber}호" for t in config.targets]
                        self.add_log("INFO", "KORAIL", f"[탐색 #{self.poll_count}] {', '.join(target_names)}: 전 좌석 매진 상태 유지", latency)
                    else:
                        # 실제 코레일 API 호출!
                        trains = await asyncio.to_thread(
                            self.korail_client.search_trains,
                            config.departureStation,
                            config.arrivalStation,
                            config.date,
                            config.baseTime,
                            "100",
                            config.passengers
                        )
                        latency = int((time.time() - t0) * 1000)
                        self.last_latency_ms = latency

                        found_target = None
                        matched_train_info = None

                        for train in trains:
                            t_num = train.get("trainNumber")
                            if t_num in target_train_nums:
                                target_spec = target_train_nums[t_num]
                                pref = target_spec.seatPreference

                                has_normal = train.get("hasNormalSeat", False)
                                has_special = train.get("hasSpecialSeat", False)

                                # 좌석 충족 여부 확인
                                is_match = False
                                selected_seat_type = "NORMAL"
                                if pref == "NORMAL" and has_normal:
                                    is_match = True
                                    selected_seat_type = "NORMAL"
                                elif pref == "SPECIAL" and has_special:
                                    is_match = True
                                    selected_seat_type = "SPECIAL"
                                elif pref == "ANY":
                                    if has_normal:
                                        is_match = True
                                        selected_seat_type = "NORMAL"
                                    elif has_special:
                                        is_match = True
                                        selected_seat_type = "SPECIAL"

                                if is_match:
                                    found_target = target_spec
                                    matched_train_info = train
                                    break

                        if found_target and matched_train_info:
                            # 취소표 즉시 발견!!
                            seat_kr = "특실" if selected_seat_type == "SPECIAL" else "일반실"
                            self.status = "RESERVING"
                            self.add_log(
                                "SUCCESS", "KORAIL",
                                f"🚨 [취소표 발견!!] {found_target.trainType} {found_target.trainNumber}호 {seat_kr} 잔여석 포착!",
                                latency
                            )
                            self.add_log("INFO", "ENGINE", "korail.reserve() 즉시 선점 트랜잭션 전송 중...")

                            # 원자적 선점 호출
                            reserve_res = await asyncio.to_thread(
                                self.korail_client.reserve,
                                matched_train_info["_raw"],
                                selected_seat_type,
                                config.passengers
                            )

                            if reserve_res.get("success"):
                                now = datetime.datetime.now()
                                deadline = now + datetime.timedelta(minutes=10)
                                pnr = reserve_res.get("pnrNo")
                                ticket = {
                                    "reservationNumber": pnr,
                                    "trainNumber": found_target.trainNumber,
                                    "trainType": found_target.trainType,
                                    "departureStation": config.departureStation,
                                    "arrivalStation": config.arrivalStation,
                                    "departureTime": found_target.departureTime,
                                    "arrivalTime": found_target.arrivalTime,
                                    "seatInfo": reserve_res.get("seatInfo"),
                                    "seatType": seat_kr,
                                    "reservedAt": now.isoformat(),
                                    "paymentDeadline": deadline.isoformat(),
                                    "totalPrice": reserve_res.get("price", 59800)
                                }
                                self.reserved_ticket = ticket
                                self.status = "SUCCESS"

                                self.add_log("SUCCESS", "ENGINE", f"🎉 [선점 대성공] {found_target.trainType} {found_target.trainNumber}호 장바구니 담김 완료! (PNR: {pnr})")

                                # 텔레그램 알림
                                if config.telegramBotToken and config.telegramChatId:
                                    alert_msg = build_reservation_alert(
                                        found_target.trainNumber, found_target.trainType,
                                        config.departureStation, config.arrivalStation,
                                        found_target.departureTime, found_target.arrivalTime,
                                        ticket["seatInfo"], ticket["totalPrice"], pnr
                                    )
                                    await asyncio.to_thread(
                                        send_telegram_message,
                                        config.telegramBotToken,
                                        config.telegramChatId,
                                        alert_msg
                                    )
                                    self.add_log("SUCCESS", "TELEGRAM", "📱 텔레그램 긴급 알림 푸시 발송 완료!")

                                # 🌟 즉각 로그아웃 (공식 코레일톡 앱과의 중복 로그인 충돌 방지)
                                await asyncio.to_thread(self.korail_client.logout)
                                self.add_log("INFO", "SECURITY", "🔒 [세션 충돌 방지] 공식 코레일톡 앱 결제를 위해 백엔드 세션 즉각 로그아웃 완료.")
                                break
                            else:
                                self.add_log("WARN", "ENGINE", f"선점 경쟁 밀림: {reserve_res.get('message')} - 다시 탐색 지속")
                        else:
                            # 매진 상태 계속
                            status_summary = []
                            for t in trains:
                                if t["trainNumber"] in target_train_nums:
                                    gn = "일반O" if t["hasNormalSeat"] else "일반X"
                                    sp = "특실O" if t["hasSpecialSeat"] else "특실X"
                                    status_summary.append(f"{t['trainNumber']}호({gn},{sp})")
                            
                            summary_text = " | ".join(status_summary) if status_summary else "타겟 열차 운행 대기 중"
                            self.add_log("INFO", "KORAIL", f"[탐색 #{self.poll_count}] {summary_text}", latency)

                except Exception as loop_err:
                    self.add_log("WARN", "HTTP", f"탐색 중 일시 오류 (자동 재시도): {loop_err}")

                # Jitter 슬립
                await asyncio.sleep(jitter)

        except asyncio.CancelledError:
            self.add_log("WARN", "ENGINE", "스나이퍼 루프 정상 취소됨")
        except Exception as e:
            self.status = "ERROR"
            self.add_log("ERROR", "ENGINE", f"스나이퍼 비정상 종료: {e}")
            logger.exception("스나이퍼 에러")

sniper_manager = SniperManager()
