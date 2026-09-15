"""
KTX 취소표 자동 선점 시스템 - FastAPI 메인 애플리케이션
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.services.sniper_worker import sniper_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] (%(name)s) %(message)s"
)
logger = logging.getLogger("ktx_sniper.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚄 KTX Sniper 백엔드 엔진 시동 완료")
    yield
    logger.info("🛑 KTX Sniper 백엔드 안전 종료 중...")
    if sniper_manager.status == "POLLING":
        await sniper_manager.stop()

app = FastAPI(
    title="KTX Sniper Backend API",
    description="코레일 취소표 실시간 모니터링 및 자동 선점 REST API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
