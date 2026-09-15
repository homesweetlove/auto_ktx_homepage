import { BackendFile } from '../types/sniper';

export const BACKEND_PROJECT_STRUCTURE = `
ktx-sniper-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI 메인 인스턴스, 라이프사이클, 라우팅
│   ├── config.py                # Pydantic Settings 기반 환경변수 관리
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py            # 시간표 조회 & 스나이퍼 제어 REST API 엔드포인트
│   ├── core/
│   │   ├── __init__.py
│   │   ├── korail_client.py     # korail2 래핑, 시간표 파싱, 세션 복구 및 선점
│   │   └── security.py          # 코레일 계정 대칭키(AES/Fernet) 암호화
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # 시간표/타겟/선점 요청 Pydantic 스키마
│   └── services/
│       ├── __init__.py
│       ├── sniper_worker.py     # 선택 열차/좌석별 비동기 감시 & 즉시 선점 엔진
│       └── telegram_service.py  # 텔레그램 봇 즉시 푸시 알림 파이프라인
├── requirements.txt             # Python 의존성 목록
├── Dockerfile                   # 컨테이너화 빌드 파일
├── docker-compose.yml           # 무중단 서비스 구동 파일
├── ktx-sniper.service           # Ubuntu systemd 서비스 데몬 파일
└── deploy.sh                    # 원클릭 서버 배포 스크립트
`;

export const BACKEND_FILES: BackendFile[] = [
  {
    name: 'main.py',
    path: 'app/main.py',
    category: 'core',
    description: 'FastAPI 애플리케이션 진입점, CORS 설정, 라이프사이클 및 라우터 등록',
    language: 'python',
    content: `"""
KTX 취소표 자동 선점 시스템 - FastAPI 메인 엔트리포인트
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.routes import router as sniper_router
from app.services.sniper_worker import sniper_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] (%(name)s) %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("ktx_sniper.main")
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 시작 및 종료 라이프사이클 핸들러"""
    logger.info("🚄 KTX 취소표 자동 선점 백엔드 서버 기동 중...")
    logger.info(f"운영 환경: {settings.ENVIRONMENT} | 포트: {settings.PORT}")
    yield
    logger.info("🛑 서버 종료 감지: 백그라운드 스나이퍼 워커 정리 중...")
    await sniper_manager.stop_all()
    logger.info("✅ 모든 워커 안전 종료 완료.")

app = FastAPI(
    title="KTX Ticket Sniper API",
    description="코레일(Korail) KTX 실시간 시간표 조회 및 취소표 지정 선점 엔진",
    version="1.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"처리되지 않은 오류 발생: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "서버 내부 처리 오류", "detail": str(exc)}
    )

app.include_router(sniper_router, prefix="/api/v1/sniper", tags=["Sniper"])

@app.get("/health", tags=["Health"])
async def health_check():
    is_running = sniper_manager.is_running()
    return {
        "status": "healthy",
        "service": "ktx-sniper-backend",
        "sniper_active": is_running,
        "active_targets_count": len(sniper_manager.current_targets) if is_running else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
`
  },
  {
    name: 'schemas.py',
    path: 'app/models/schemas.py',
    category: 'core',
    description: '시간표 조회, 타겟 열차/좌석 등급 선택 및 스나이퍼 DTO 스키마',
    language: 'python',
    content: `"""
데이터 전송 객체(DTO) 및 Pydantic 스키마 정의
- 시간표 조회 요청/응답
- 사용자가 선택한 특정 열차 번호 + 좌석 등급(일반실/특실) 타겟 모델
"""
from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class KorailCredential(BaseModel):
    membership_number: str = Field(..., description="코레일 멤버십 번호 또는 휴대폰 번호 (하이픈 제외)")
    password: str = Field(..., description="코레일 4~6자리 비밀번호")

class ScheduleSearchRequest(BaseModel):
    departure_station: str = Field(default="서울", description="출발역")
    arrival_station: str = Field(default="부산", description="도착역")
    date: str = Field(..., description="출발일자 (YYYYMMDD 형식)")
    time: str = Field(default="090000", description="출발 기준 시간 (HHMMSS 형식)")
    passengers: int = Field(default=1, ge=1, le=4, description="승객 인원수")
    credential: Optional[KorailCredential] = Field(default=None, description="계정 정보 (선택)")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if len(v) != 8 or not v.isdigit():
            raise ValueError("날짜는 8자리 숫자(YYYYMMDD)여야 합니다.")
        return v

class TrainScheduleItem(BaseModel):
    train_number: str = Field(..., description="열차 번호 (예: '015')")
    train_type: str = Field(..., description="열차 종류 (KTX, KTX-산천, KTX-청룡 등)")
    departure_time: str = Field(..., description="출발 시각 (HH:MM)")
    arrival_time: str = Field(..., description="도착 시각 (HH:MM)")
    duration: str = Field(..., description="소요 시간 (예: '2시간 15분')")
    departure_station: str
    arrival_station: str
    general_seat_status: Literal["SOLD_OUT", "AVAILABLE"] = Field(..., description="일반실 상태")
    special_seat_status: Literal["SOLD_OUT", "AVAILABLE", "NOT_AVAILABLE"] = Field(..., description="특실 상태")
    general_price: int = Field(default=59800, description="일반실 운임")
    special_price: int = Field(default=83700, description="특실 운임")

class TargetTrainItem(BaseModel):
    """사용자가 시간표 목록에서 직접 선택한 타겟 열차 및 좌석 등급"""
    train_number: str = Field(..., description="타겟 열차 번호 (예: '015')")
    train_type: str = Field(default="KTX", description="열차 종류")
    departure_time: str = Field(..., description="출발 시각")
    arrival_time: Optional[str] = Field(default="", description="도착 시각")
    seat_preference: Literal["NORMAL", "SPECIAL", "ANY"] = Field(
        default="NORMAL",
        description="NORMAL(일반실만), SPECIAL(특실만), ANY(일반/특실 먼저 나오는 것)"
    )

class SniperStartRequest(BaseModel):
    # 기본 여정 정보
    departure_station: str = Field(default="서울")
    arrival_station: str = Field(default="부산")
    date: str = Field(..., description="YYYYMMDD")
    time: str = Field(default="090000", description="HHMMSS")
    passengers: int = Field(default=1, ge=1, le=4)
    
    # 사용자가 시간표에서 선택한 열차 및 좌석 목록 (핵심)
    targets: List[TargetTrainItem] = Field(
        ...,
        min_length=1,
        description="사용자가 시간표 목록에서 직접 선택한 1개 이상의 감시 대상 열차들"
    )
    
    # 코레일 계정
    credential: KorailCredential
    
    # 차단 방지 지터
    min_jitter: float = Field(default=1.3, ge=0.8, le=5.0)
    max_jitter: float = Field(default=2.2, ge=1.0, le=10.0)
    
    # 알림 설정
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    auto_logout_on_success: bool = True

class ReservedTicketInfo(BaseModel):
    reservation_number: str
    train_number: str
    train_type: str
    departure_station: str
    arrival_station: str
    departure_time: str
    arrival_time: str
    seat_info: str
    seat_type: str
    reserved_at: datetime
    payment_deadline: datetime
    total_price: int

class SniperStatusResponse(BaseModel):
    is_running: bool
    status: str
    departure_station: Optional[str] = None
    arrival_station: Optional[str] = None
    date: Optional[str] = None
    targets_count: int = 0
    target_summary: Optional[str] = None
    poll_count: int = 0
    last_poll_at: Optional[datetime] = None
    last_latency_ms: Optional[float] = None
    error_message: Optional[str] = None
    reserved_ticket: Optional[ReservedTicketInfo] = None
`
  },
  {
    name: 'korail_client.py',
    path: 'app/core/korail_client.py',
    category: 'core',
    description: 'korail2 패킷 래핑, 시간표 실시간 목록 파싱 및 선점 엔진',
    language: 'python',
    content: `"""
korail2 라이브러리 기반 래퍼 클래스
- 시간표 목록 조회 및 Pydantic TrainScheduleItem 변환
- 세션 갱신 및 지정 열차/좌석 선점
"""
import logging
from typing import List, Optional, Tuple, Any
from datetime import datetime

from app.models.schemas import TrainScheduleItem

try:
    from korail2 import Korail, AdultPassenger, ReserveOption
except ImportError:
    Korail = None
    AdultPassenger = None
    ReserveOption = None

logger = logging.getLogger("ktx_sniper.korail_client")

class KorailClientWrapper:
    def __init__(self, membership_number: str, password: str):
        self.membership_number = membership_number
        self.password = password
        self.korail: Optional[Any] = None
        self.is_logged_in = False
        self.last_login_at: Optional[datetime] = None

    def login(self) -> bool:
        """코레일 로그인 수행 및 세션 초기화"""
        if Korail is None:
            raise RuntimeError("korail2 라이브러리가 설치되지 않았습니다. pip install korail2 필요")
        
        try:
            logger.info(f"코레일 계정 로그인 시도... (ID: {self.membership_number[:4]}****)")
            self.korail = Korail(self.membership_number, self.password, auto_login=True)
            self.is_logged_in = True
            self.last_login_at = datetime.now()
            logger.info("✅ 코레일 로그인 및 모바일 세션 획득 성공")
            return True
        except Exception as e:
            self.is_logged_in = False
            logger.error(f"❌ 코레일 로그인 실패: {str(e)}")
            raise e

    def ensure_session(self):
        """세션이 만료되었거나 10분 이상 지났으면 재로그인"""
        if not self.is_logged_in or self.korail is None:
            self.login()
            return

        if self.last_login_at:
            elapsed = (datetime.now() - self.last_login_at).total_seconds()
            if elapsed > 600:
                logger.info("⏱️ 세션 유지시간 10분 경과: 선제적 세션 리프레시 수행")
                self.login()

    def fetch_train_schedules(
        self,
        dep: str,
        arr: str,
        date: str,
        time: str,
        passengers: int = 1
    ) -> List[TrainScheduleItem]:
        """
        운행 중인 시간표 목록을 조회하여 가독성 높은 DTO 리스트로 파싱 반환
        """
        raw_trains = self.search_trains(dep, arr, date, time, passengers)
        schedule_items: List[TrainScheduleItem] = []

        for t in raw_trains:
            t_no = str(getattr(t, 'train_number', '000'))
            t_type = str(getattr(t, 'train_type_name', 'KTX'))
            dep_time_raw = str(getattr(t, 'dep_time', '000000'))
            arr_time_raw = str(getattr(t, 'arr_time', '000000'))

            dep_fmt = f"{dep_time_raw[:2]}:{dep_time_raw[2:4]}" if len(dep_time_raw) >= 4 else dep_time_raw
            arr_fmt = f"{arr_time_raw[:2]}:{arr_time_raw[2:4]}" if len(arr_time_raw) >= 4 else arr_time_raw

            # 좌석 상태 판별
            has_gen = False
            has_spec = False
            if hasattr(t, 'has_general_seat'):
                has_gen = t.has_general_seat()
            if hasattr(t, 'has_special_seat'):
                has_spec = t.has_special_seat()

            schedule_items.append(TrainScheduleItem(
                train_number=t_no,
                train_type=t_type,
                departure_time=dep_fmt,
                arrival_time=arr_fmt,
                duration=str(getattr(t, 'run_time', '약 2시간 30분')),
                departure_station=dep,
                arrival_station=arr,
                general_seat_status="AVAILABLE" if has_gen else "SOLD_OUT",
                special_seat_status="AVAILABLE" if has_spec else "SOLD_OUT",
                general_price=getattr(t, 'general_cost', 59800),
                special_price=getattr(t, 'special_cost', 83700)
            ))

        return schedule_items

    def search_trains(
        self,
        dep: str,
        arr: str,
        date: str,
        time: str,
        passengers: int = 1
    ) -> List[Any]:
        """열차 원시 객체 조회 수행"""
        self.ensure_session()
        try:
            trains = self.korail.search_train(
                dep=dep,
                arr=arr,
                date=date,
                time=time,
                passengers=[AdultPassenger() for _ in range(passengers)],
                include_no_seats=True
            )
            return trains or []
        except Exception as e:
            error_msg = str(e)
            if "로그인" in error_msg or "세션" in error_msg or "9999" in error_msg:
                logger.warning("⚠️ 세션 무효화 감지. 재로그인 후 재시도...")
                self.login()
                return self.korail.search_train(
                    dep=dep, arr=arr, date=date, time=time,
                    passengers=[AdultPassenger() for _ in range(passengers)],
                    include_no_seats=True
                )
            raise e

    def check_seat_available(self, train: Any, seat_type: str = "ANY") -> Tuple[bool, str]:
        """열차 객체에서 지정된 좌석 등급의 잔여석 여부 확인"""
        has_general = False
        has_special = False

        if hasattr(train, 'has_general_seat'):
            has_general = train.has_general_seat()
        elif hasattr(train, 'general_seat'):
            has_general = "가능" in str(train.general_seat)

        if hasattr(train, 'has_special_seat'):
            has_special = train.has_special_seat()
        elif hasattr(train, 'special_seat'):
            has_special = "가능" in str(train.special_seat)

        if seat_type == "NORMAL" and has_general:
            return True, "NORMAL"
        elif seat_type == "SPECIAL" and has_special:
            return True, "SPECIAL"
        elif seat_type == "ANY":
            if has_general:
                return True, "NORMAL"
            if has_special:
                return True, "SPECIAL"

        return False, ""

    def reserve_train(self, train: Any, seat_type: str, passengers: int = 1) -> Any:
        """좌석 발견 즉시 장바구니 선점 트랜잭션 호출"""
        self.ensure_session()
        logger.info(f"🚨 [선점 트랜잭션 시작] 열차 {train.train_number} ({seat_type}) 예약 시도!")
        
        option = ReserveOption.GENERAL_FIRST
        if seat_type == "SPECIAL":
            option = ReserveOption.SPECIAL_ONLY

        try:
            reservation = self.korail.reserve(
                train=train,
                passengers=[AdultPassenger() for _ in range(passengers)],
                option=option
            )
            logger.info(f"🎉 [선점 대성공] 예약 완료: {reservation}")
            return reservation
        except Exception as e:
            logger.error(f"❌ 선점 API 호출 실패: {str(e)}")
            raise e

    def logout(self):
        try:
            if self.korail and hasattr(self.korail, 'logout'):
                self.korail.logout()
            self.is_logged_in = False
            logger.info("👋 코레일 세션 안전 로그아웃 완료")
        except Exception as e:
            logger.warning(f"로그아웃 중 예외 무시: {str(e)}")
`
  },
  {
    name: 'sniper_worker.py',
    path: 'app/services/sniper_worker.py',
    category: 'service',
    description: '사용자가 선택한 특정 열차와 좌석 등급만을 타겟팅하는 비동기 스나이퍼 엔진',
    language: 'python',
    content: `"""
선택된 타겟 열차/좌석별 비동기 감시 & 선점 워커 엔진
- 사용자가 시간표에서 콕 짚어 지정한 열차 번호와 좌석 선호도(일반/특실)만 정밀 감시
- Jitter 난수 슬립 및 10분 골든타임 알림
"""
import asyncio
import random
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict

from app.models.schemas import (
    SniperStartRequest, SniperStatusResponse, ReservedTicketInfo, TargetTrainItem
)
from app.core.korail_client import KorailClientWrapper
from app.services.telegram_service import telegram_notifier

logger = logging.getLogger("ktx_sniper.worker")

class SniperManager:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._client: Optional[KorailClientWrapper] = None
        self._current_request: Optional[SniperStartRequest] = None
        self.current_targets: List[TargetTrainItem] = []
        
        self.status: str = "IDLE"
        self.poll_count: int = 0
        self.last_poll_at: Optional[datetime] = None
        self.last_latency_ms: Optional[float] = None
        self.error_message: Optional[str] = None
        self.reserved_ticket: Optional[ReservedTicketInfo] = None
        self._lock = asyncio.Lock()

    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    async def start(self, request: SniperStartRequest) -> SniperStatusResponse:
        async with self._lock:
            if self.is_running():
                raise RuntimeError("이미 실행 중인 취소표 감시 작업이 있습니다.")

            self._current_request = request
            self.current_targets = request.targets
            self.status = "LOGGING_IN"
            self.poll_count = 0
            self.last_poll_at = None
            self.last_latency_ms = None
            self.error_message = None
            self.reserved_ticket = None

            self._task = asyncio.create_task(self._run_loop(request))
            logger.info(f"🚀 스나이퍼 작업 백그라운드 기동: {len(request.targets)}개 열차 타겟 지정")
            return self.get_status()

    async def stop(self) -> SniperStatusResponse:
        async with self._lock:
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            
            if self._client:
                self._client.logout()
                self._client = None

            self.status = "STOPPED"
            return self.get_status()

    async def stop_all(self):
        if self.is_running():
            await self.stop()

    def get_status(self) -> SniperStatusResponse:
        req = self._current_request
        target_summary = ""
        if req and req.targets:
            parts = [f"{t.train_type} {t.train_number}({t.seat_preference})" for t in req.targets[:3]]
            target_summary = ", ".join(parts)
            if len(req.targets) > 3:
                target_summary += f" 외 {len(req.targets) - 3}편"

        return SniperStatusResponse(
            is_running=self.is_running(),
            status=self.status,
            departure_station=req.departure_station if req else None,
            arrival_station=req.arrival_station if req else None,
            date=req.date if req else None,
            targets_count=len(req.targets) if req else 0,
            target_summary=target_summary,
            poll_count=self.poll_count,
            last_poll_at=self.last_poll_at,
            last_latency_ms=self.last_latency_ms,
            error_message=self.error_message,
            reserved_ticket=self.reserved_ticket
        )

    async def _run_loop(self, req: SniperStartRequest):
        backoff_delay = 0.0

        # 빠른 매칭을 위한 딕셔너리 구성: { "015": TargetTrainItem, "023": TargetTrainItem }
        target_map: Dict[str, TargetTrainItem] = {
            t.train_number: t for t in req.targets
        }

        try:
            self._client = KorailClientWrapper(
                membership_number=req.credential.membership_number,
                password=req.credential.password
            )
            await asyncio.to_thread(self._client.login)
            self.status = "POLLING"

            # 텔레그램 시작 알림
            if req.telegram_bot_token and req.telegram_chat_id:
                target_str = "\\n".join([f"• {t.train_type} {t.train_number} ({t.departure_time} 출발, {t.seat_preference})" for t in req.targets])
                asyncio.create_task(
                    telegram_notifier.send_message(
                        token=req.telegram_bot_token,
                        chat_id=req.telegram_chat_id,
                        text=(
                            f"🚄 *KTX 지정 취소표 자동 감시 시작*\\n"
                            f"• 구간: {req.departure_station} → {req.arrival_station} ({req.date})\\n"
                            f"• 승객: {req.passengers}명\\n\\n"
                            f"*감시 대상 열차 ({len(req.targets)}편):*\\n{target_str}\\n\\n"
                            f"취소표 발생 시 즉시 선점하고 알려드립니다!"
                        )
                    )
                )

            while True:
                loop_start = time.perf_counter()
                self.poll_count += 1
                self.last_poll_at = datetime.now()

                try:
                    trains = await asyncio.to_thread(
                        self._client.search_trains,
                        dep=req.departure_station,
                        arr=req.arrival_station,
                        date=req.date,
                        time=req.time,
                        passengers=req.passengers
                    )
                    
                    self.last_latency_ms = round((time.perf_counter() - loop_start) * 1000, 1)
                    backoff_delay = 0.0

                    target_found_train = None
                    target_seat_type = None

                    for train in trains:
                        t_no = str(getattr(train, 'train_number', ''))
                        # 사용자가 선택한 타겟 목록에 있는 열차인지 검사
                        if t_no in target_map:
                            pref = target_map[t_no].seat_preference
                            # 해당 열차의 지정 좌석(일반실/특실) 확인
                            available, seat_cls = self._client.check_seat_available(train, pref)
                            if available:
                                target_found_train = train
                                target_seat_type = seat_cls
                                logger.info(f"🎯 [타겟 좌석 포착] 열차: {train} | 등급: {seat_cls}")
                                break

                    # 잔여석 발견 시 선점 트랜잭션
                    if target_found_train and target_seat_type:
                        self.status = "RESERVING"
                        
                        reservation = await asyncio.to_thread(
                            self._client.reserve_train,
                            target_found_train,
                            target_seat_type,
                            req.passengers
                        )

                        now = datetime.now()
                        deadline = now + timedelta(minutes=10)

                        self.reserved_ticket = ReservedTicketInfo(
                            reservation_number=str(getattr(reservation, 'rsv_no', 'RES-OK-7789')),
                            train_number=str(getattr(target_found_train, 'train_number', 'KTX-001')),
                            train_type=str(getattr(target_found_train, 'train_type_name', 'KTX')),
                            departure_station=req.departure_station,
                            arrival_station=req.arrival_station,
                            departure_time=str(getattr(target_found_train, 'dep_time', req.time)),
                            arrival_time=str(getattr(target_found_train, 'arr_time', '')),
                            seat_info="호차 및 좌석은 공식 앱 장바구니에서 확인",
                            seat_type="일반실" if target_seat_type == "NORMAL" else "특실/우등실",
                            reserved_at=now,
                            payment_deadline=deadline,
                            total_price=getattr(reservation, 'total_cost', 59800)
                        )
                        
                        self.status = "SUCCESS"
                        logger.info("🎉 지정 열차 취소표 선점 대성공!")

                        if req.telegram_bot_token and req.telegram_chat_id:
                            await telegram_notifier.send_reservation_success(
                                token=req.telegram_bot_token,
                                chat_id=req.telegram_chat_id,
                                ticket=self.reserved_ticket
                            )

                        if req.auto_logout_on_success:
                            await asyncio.to_thread(self._client.logout)
                            self._client = None

                        break

                except Exception as poll_err:
                    err_text = str(poll_err)
                    logger.warning(f"조회 주기 예외: {err_text}")
                    self.last_latency_ms = round((time.perf_counter() - loop_start) * 1000, 1)

                    if "429" in err_text or "차단" in err_text:
                        backoff_delay = min(15.0, (backoff_delay + 3.0) * 1.5)

                jitter = random.uniform(req.min_jitter, req.max_jitter) + backoff_delay
                await asyncio.sleep(jitter)

        except asyncio.CancelledError:
            self.status = "STOPPED"
        except Exception as fatal_e:
            self.status = "ERROR"
            self.error_message = str(fatal_e)
        finally:
            if self._client:
                try:
                    await asyncio.to_thread(self._client.logout)
                except Exception:
                    pass
                self._client = None

sniper_manager = SniperManager()
`
  },
  {
    name: 'routes.py',
    path: 'app/api/routes.py',
    category: 'api',
    description: '시간표 실시간 조회 및 스나이퍼 제어 REST API 엔드포인트',
    language: 'python',
    content: `"""
시간표 조회 및 스나이퍼 제어 REST API 엔드포인트
- POST /api/v1/sniper/search-schedules : 운행 시간표 및 일반/특실 잔여석 목록 조회
- POST /api/v1/sniper/start            : 선택된 타겟 열차/좌석 감시 및 선점 시작
- POST /api/v1/sniper/stop             : 감시 중지
- GET  /api/v1/sniper/status           : 실시간 상태 조회
"""
from typing import List
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ScheduleSearchRequest, TrainScheduleItem, SniperStartRequest, SniperStatusResponse
)
from app.core.korail_client import KorailClientWrapper
from app.services.sniper_worker import sniper_manager
from app.services.telegram_service import telegram_notifier

router = APIRouter()

@router.post("/search-schedules", response_model=List[TrainScheduleItem])
async def search_schedules(req: ScheduleSearchRequest):
    """
    [시간표 조회]
    출발/도착역, 날짜, 시간대를 기준으로 운행하는 열차 시간표 목록과
    각 열차별 일반실/특실 상태를 조회하여 반환합니다.
    """
    try:
        # 로그인 정보가 있으면 해당 계정 세션 사용, 없으면 익명 세션 조회
        user_id = req.credential.membership_number if req.credential else "ANONYMOUS"
        user_pw = req.credential.password if req.credential else "ANONYMOUS"
        
        client = KorailClientWrapper(user_id, user_pw)
        schedules = client.fetch_train_schedules(
            dep=req.departure_station,
            arr=req.arrival_station,
            date=req.date,
            time=req.time,
            passengers=req.passengers
        )
        return schedules
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시간표 조회 실패: {str(e)}")

@router.post("/start", response_model=SniperStatusResponse)
async def start_sniper(request: SniperStartRequest):
    """
    [지정 열차 취소표 선점 시작]
    사용자가 시간표에서 선택한 열차 목록(targets)의 일반/특실 취소표를 감시합니다.
    """
    if not request.targets:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 타겟 열차를 선택해야 합니다.")
    
    try:
        status = await sniper_manager.start(request)
        return status
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시작 실패: {str(e)}")

@router.post("/stop", response_model=SniperStatusResponse)
async def stop_sniper():
    status = await sniper_manager.stop()
    return status

@router.get("/status", response_model=SniperStatusResponse)
async def get_sniper_status():
    return sniper_manager.get_status()

@router.post("/test-telegram")
async def test_telegram(token: str, chat_id: str):
    success = await telegram_notifier.send_message(
        token=token,
        chat_id=chat_id,
        text="🔔 *KTX Sniper 텔레그램 연동 테스트 성공!*"
    )
    if not success:
        raise HTTPException(status_code=400, detail="텔레그램 메시지 전송 실패")
    return {"success": True, "message": "발송 완료"}
`
  },
  {
    name: 'telegram_service.py',
    path: 'app/services/telegram_service.py',
    category: 'service',
    description: '텔레그램 봇 API 비동기 즉각 푸시 알림 파이프라인 (10분 결제 마감 경고)',
    language: 'python',
    content: `"""
텔레그램 봇 API 비동기 발송 모듈
"""
import logging
import httpx
from app.models.schemas import ReservedTicketInfo

logger = logging.getLogger("ktx_sniper.telegram")

class TelegramNotifier:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=5.0)

    async def send_message(self, token: str, chat_id: str, text: str) -> bool:
        if not token or not chat_id:
            return False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True
        }

        try:
            resp = await self.client.post(url, json=payload)
            return resp.status_code == 200
        except Exception as e:
            logger.error(f"텔레그램 전송 중 오류: {str(e)}")
            return False

    async def send_reservation_success(self, token: str, chat_id: str, ticket: ReservedTicketInfo) -> bool:
        deadline_str = ticket.payment_deadline.strftime("%H시 %M분 %S초")
        
        msg = (
            f"🚨🚨 *[긴급] 지정 KTX 취소표 선점 성공!* 🚨🚨\\n\\n"
            f"지금 즉시 *공식 코레일톡 앱*에 접속하여 결제하세요!\\n"
            f"결제 마감 시각: *{deadline_str} 까지* (약 10분 이내)\\n\\n"
            f"━━━━━━━━━━━━━━━━━━━━\\n"
            f"• *열차*: {ticket.train_type} {ticket.train_number}\\n"
            f"• *구간*: {ticket.departure_station} → {ticket.arrival_station}\\n"
            f"• *출발 시각*: {ticket.departure_time}\\n"
            f"• *선점 좌석*: {ticket.seat_type}\\n"
            f"• *예약 번호*: \`{ticket.reservation_number}\`\\n"
            f"• *결제 예정액*: {ticket.total_price:,}원\\n"
            f"━━━━━━━━━━━━━━━━━━━━\\n\\n"
            f"⚠️ 공식 코레일톡 앱 [장바구니] 또는 [승차권 확인]에서 결제 가능합니다."
        )

        return await self.send_message(token, chat_id, msg)

telegram_notifier = TelegramNotifier()
`
  },
  {
    name: 'config.py',
    path: 'app/config.py',
    category: 'config',
    description: '환경변수 및 애플리케이션 전역 설정 (Pydantic Settings)',
    language: 'python',
    content: `"""
환경변수 및 애플리케이션 전역 설정 모듈
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    PORT: int = 8000
    
    SECRET_ENCRYPTION_KEY: str = os.getenv("SECRET_ENCRYPTION_KEY", "bXlfc2VjcmV0X2Zlcm5ldF9rZXlfZm9yX2tveF9zbmk=")
    DEFAULT_TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    DEFAULT_TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    
    DEFAULT_MIN_JITTER: float = 1.3
    DEFAULT_MAX_JITTER: float = 2.2
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

@lru_cache
def get_settings() -> Settings:
    return Settings()
`
  },
  {
    name: 'security.py',
    path: 'app/core/security.py',
    category: 'core',
    description: '코레일 계정 비밀번호 메모리 암호화 유틸 (Fernet / AES-256)',
    language: 'python',
    content: `"""
코레일 계정정보 대칭키 암호화 모듈
"""
import base64
import hashlib
from cryptography.fernet import Fernet
from app.config import get_settings

class CredentialProtector:
    def __init__(self):
        settings = get_settings()
        key_hash = hashlib.sha256(settings.SECRET_ENCRYPTION_KEY.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(key_hash)
        self.cipher = Fernet(fernet_key)

    def encrypt(self, plain_text: str) -> str:
        return self.cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")

    def decrypt(self, cipher_text: str) -> str:
        return self.cipher.decrypt(cipher_text.encode("utf-8")).decode("utf-8")

credential_protector = CredentialProtector()
`
  },
  {
    name: 'requirements.txt',
    path: 'requirements.txt',
    category: 'config',
    description: 'Python 패키지 의존성 정의 파일',
    language: 'text',
    content: `fastapi==0.115.0
uvicorn[standard]==0.31.0
korail2==0.3.2
pydantic==2.9.2
pydantic-settings==2.5.2
httpx==0.27.2
cryptography==43.0.1
python-dotenv==1.0.1
`
  },
  {
    name: 'Dockerfile',
    path: 'Dockerfile',
    category: 'deploy',
    description: '경량화 Python 3.11 슬림 멀티스테이지 Docker 컨테이너',
    language: 'dockerfile',
    content: `FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

WORKDIR /app
RUN useradd -m -u 1000 sniperuser

COPY --from=builder /root/.local /home/sniperuser/.local
COPY app/ /app/app/

ENV PATH=/home/sniperuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

USER sniperuser
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`
  },
  {
    name: 'docker-compose.yml',
    path: 'docker-compose.yml',
    category: 'deploy',
    description: 'Docker Compose 무중단 자동 재시작 설정',
    language: 'yaml',
    content: `version: '3.8'

services:
  ktx-sniper:
    build: .
    container_name: ktx-sniper-backend
    restart: always
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - PORT=8000
      - TELEGRAM_BOT_TOKEN=\${TELEGRAM_BOT_TOKEN:-}
      - TELEGRAM_CHAT_ID=\${TELEGRAM_CHAT_ID:-}
`
  },
  {
    name: 'ktx-sniper.service',
    path: 'ktx-sniper.service',
    category: 'deploy',
    description: 'Ubuntu Linux systemd 24시간 무중단 백그라운드 데몬 서비스',
    language: 'ini',
    content: `[Unit]
Description=KTX Ticket Sniper FastAPI Daemon Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ktx-sniper-backend
Environment="PATH=/home/ubuntu/ktx-sniper-backend/venv/bin"
ExecStart=/home/ubuntu/ktx-sniper-backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
`
  },
  {
    name: 'deploy.sh',
    path: 'deploy.sh',
    category: 'deploy',
    description: 'Ubuntu 서버 원클릭 자동 설치 및 배포 스크립트',
    language: 'bash',
    content: `#!/bin/bash
set -e
echo "🚄 [KTX Sniper] 배포 시작..."
sudo apt update && sudo apt install -y python3 python3-pip python3-venv git
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
sudo cp ktx-sniper.service /etc/systemd/system/ktx-sniper.service
sudo systemctl daemon-reload
sudo systemctl enable --now ktx-sniper
echo "✅ 배포 완료! 상태: sudo systemctl status ktx-sniper"
`
  }
];
