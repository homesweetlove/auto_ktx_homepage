from pydantic import BaseModel, Field
from typing import List, Optional

class SearchSchedulesRequest(BaseModel):
    departureStation: str = Field("서울", description="출발역")
    arrivalStation: str = Field("부산", description="도착역")
    date: str = Field(..., description="출발일자 (YYYYMMDD)")
    time: str = Field("090000", description="출발 기준시각 (HHMMSS)")
    passengers: int = Field(1, ge=1, le=9, description="승차인원")
    trainType: str = Field("100", description="100: KTX/KTX-산천, 109: 전체")

class TargetTrainItem(BaseModel):
    trainNumber: str
    trainType: str
    departureTime: str
    arrivalTime: str
    seatPreference: str = Field("NORMAL", description="NORMAL | SPECIAL | ANY")

class KorailLoginRequest(BaseModel):
    membershipNumber: str = Field(..., description="멤버십 번호 / 휴대전화 / 이메일")
    password: str = Field(..., description="코레일 비밀번호")

class TelegramTestRequest(BaseModel):
    botToken: str
    chatId: str

class SniperStartRequest(BaseModel):
    departureStation: str
    arrivalStation: str
    date: str
    baseTime: str = "000000"
    passengers: int = 1
    targets: List[TargetTrainItem]
    minJitter: float = 1.3
    maxJitter: float = 2.2
    membershipNumber: Optional[str] = None
    password: Optional[str] = None
    telegramBotToken: Optional[str] = None
    telegramChatId: Optional[str] = None
    isSimulationMode: bool = False # 시뮬레이션 모드 지원 (실제 계정 없을 때 안전 테스트용)

class MockTriggerRequest(BaseModel):
    targetTrain: Optional[TargetTrainItem] = None
