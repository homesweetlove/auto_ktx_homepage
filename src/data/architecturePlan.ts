export interface PlanComparisonItem {
  dimension: string;
  originalPlan: string;
  revisedPlan: string;
  advantage: string;
}

export interface RiskFactor {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  cause: string;
  countermeasure: string;
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  period: string;
  status: 'CURRENT' | 'UPCOMING' | 'FUTURE';
  tasks: string[];
}

export const PLAN_COMPARISONS: PlanComparisonItem[] = [
  {
    dimension: '동시 세션 충돌 방지',
    originalPlan: '선점 후 즉시 알림만 발송',
    revisedPlan: '선점 성공 즉시 백엔드 워커 kill + 세션 자동 로그아웃 수행',
    advantage: '사용자가 공식 코레일톡 앱 접속 시 "다른 기기에서 로그인됨"으로 튕기는 치명적 결제 방해 원천 차단'
  },
  {
    dimension: '차단 방지 (Anti-Blocking)',
    originalPlan: '단순 1.3초 ~ 2.2초 난수 슬립',
    revisedPlan: '가변 Jitter + WAF(429/403) 감지 시 지수 백오프 + 정품 코레일톡 Android User-Agent 헤더 스푸핑',
    advantage: '코레일 Akamai WAF의 주기적 패턴 감지 우회 및 일시적 IP 밴 자동 회피'
  },
  {
    dimension: '10분 결제 골든타임 관리',
    originalPlan: '텍스트 알림 1회 전송',
    revisedPlan: '예약 성공 즉시 남은 시간(초단위) 계산 + 텔레그램 고음량 긴급 알림 + 예약번호/금액 포맷팅',
    advantage: '장바구니 담김 후 10분 초과 자동 취소 방지 (사용자가 놓치지 않고 10분 내 결제 가능)'
  },
  {
    dimension: '스케줄러 아키텍처',
    originalPlan: '단순 멀티스레드 기반',
    revisedPlan: 'FastAPI asyncio 비동기 이벤트 루프 + Task 취소 토큰 + 동시성 락(asyncio.Lock)',
    advantage: '서버 메모리 누수 방지, 원자적(Atomic) 취소표 선점 보장 및 안전한 셧다운'
  },
  {
    dimension: '클라이언트 통신 (Android)',
    originalPlan: '주기적 HTTP Polling',
    revisedPlan: 'RESTful Polling + SSE(Server-Sent Events) 또는 WebSocket 옵션',
    advantage: '스마트폰 배터리 소모 극소화 및 실시간 상태 동기화'
  }
];

export const CRITICAL_RISKS: RiskFactor[] = [
  {
    id: 'risk-1',
    title: '동시 접속 세션 폭파 (가장 치명적)',
    severity: 'CRITICAL',
    cause: '백엔드가 코레일 세션을 물고 있는 상태에서, 사용자가 푸시를 받고 폰에서 코레일톡 앱을 켜면 즉시 "중복 로그인"으로 둘 다 로그아웃됨.',
    countermeasure: '백엔드는 reserve() 성공 응답을 수신하는 즉시 세션을 disconnect/logout 하고 감시 루프를 완전히 종료시킵니다. 사용자가 폰에서 로그인할 때 단 1초의 간섭도 없도록 설계.'
  },
  {
    id: 'risk-2',
    title: 'Akamai / WAF IP 일시 차단',
    severity: 'HIGH',
    cause: '클라우드 VPS(AWS, 오라클, Vultr 등) IP 대역에서 24시간 균일한 간격으로 HTTP 요청이 지속되면 방화벽에서 403 Forbidden 또는 캡차를 트리거함.',
    countermeasure: '랜덤 지터(1.3~2.2s)에 추가로 50회 조회마다 3~6초의 휴식(Pause) 간격을 부여하고, 429 감지 시 지수 백오프(Exponential Backoff)로 자동 쿨다운.'
  },
  {
    id: 'risk-3',
    title: '10분 결제 만료로 인한 표 상실',
    severity: 'HIGH',
    cause: '취소표는 "결제 완료"가 아니라 "장바구니 담김(예약)" 상태이므로, 보통 10분(심야 20분) 내에 결제하지 않으면 자동 증발.',
    countermeasure: '텔레그램 봇 알림에 마감 시각(예: 14시 23분 15초)을 굵은 글씨로 볼드 처리하고, 안드로이드 앱에 알림 채널 중요도를 HIGH로 설정하여 진동+소리 강제 울림.'
  },
  {
    id: 'risk-4',
    title: '새벽 코레일 시스템 점검 시간(02:00~04:30)',
    severity: 'MEDIUM',
    cause: '매일 새벽 코레일 정기 점검 시 모든 API가 에러를 뿜으며, 무작정 요청하면 차단 목록에 등록될 위험.',
    countermeasure: '02:00~04:30 시간대에는 스나이퍼를 자동 슬립(Sleep) 상태로 전환하고 04:30에 자동 세션 재연결.'
  }
];

export const REVISED_ROADMAP: RoadmapPhase[] = [
  {
    phase: 'Phase 1',
    title: 'FastAPI 백엔드 코어 & korail2 비동기 엔진 구축',
    period: '1~2일차 (현재 단계)',
    status: 'CURRENT',
    tasks: [
      'FastAPI 프로젝트 아키텍처 및 Pydantic v2 데이터 모델 정립',
      'korail2 래퍼 모듈 구현 (세션 자동 갱신 및 좌석 잔여 판별 로직)',
      'asyncio.Task 기반 가변 Jitter(1.3~2.2s) 폴링 워커 및 원자적 선점 트랜잭션',
      'REST API 엔드포인트 (/start, /stop, /status) 및 보안 계정 암호화'
    ]
  },
  {
    phase: 'Phase 2',
    title: '텔레그램 즉시 알림 파이프라인 및 골든타임 경보',
    period: '3일차',
    status: 'UPCOMING',
    tasks: [
      'HTTPX 비동기 텔레그램 봇 API 클라이언트 구현',
      '10분 결제 마감 시각 자동 계산 및 고음량/진동 트리거 메시지 포맷팅',
      '테스트용 즉시 발송 API 및 토큰/챗ID 유효성 검증 로직'
    ]
  },
  {
    phase: 'Phase 3',
    title: '클라우드 리눅스 서버 무중단 배포 & 네트워킹',
    period: '4일차',
    status: 'UPCOMING',
    tasks: [
      'Ubuntu VPS(AWS Lightsail / Oracle Cloud 등) 환경 구성',
      'systemd 서비스 데몬(ktx-sniper.service) 등록 및 24시간 자동 재시작 보장',
      'UFW 방화벽 및 Nginx 리버스 프록시 + Let\'s Encrypt SSL/HTTPS 적용'
    ]
  },
  {
    phase: 'Phase 4',
    title: '안드로이드 클라이언트 (Kotlin / Jetpack Compose) 연동',
    period: '5~6일차',
    status: 'FUTURE',
    tasks: [
      'Retrofit2 REST API 통신 모듈 및 코루틴 기반 상태 폴링',
      '코레일 계정 EncryptedSharedPreferences 보안 저장',
      'Material 3 기반 열차 조회/감시 리모컨 UI 및 FCM 고음량 긴급 알림 채널 구축'
    ]
  }
];
