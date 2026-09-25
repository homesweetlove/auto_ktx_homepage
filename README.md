# KTX Sniper

코레일 KTX 시간표와 좌석을 조회하고, 사용자가 지정한 열차의 취소표를 반복 확인해 **개인용 자동 선점 흐름을 실험하기 위한 풀스택 프로젝트**입니다.

React 대시보드, Node/Express API, 코레일 연동 로직, 감시 워커, Telegram 알림으로 구성됩니다.

> 코레일의 비공개/내부 동작에 의존하는 부분은 서비스 변경에 따라 언제든 동작하지 않을 수 있습니다. 실제 사용 시 코레일 이용약관, 접근 정책 및 관련 규정을 확인하세요.

## 주요 기능

- 코레일 계정 로그인 확인
- 출발역 / 도착역 / 날짜 / 시간 기준 열차 조회
- 일반실·특실 등 대상 열차 선택
- 지정 열차 취소표 반복 감시
- 감시 상태, 조회 횟수, 지연시간과 로그 표시
- 조건 충족 시 선점 흐름 실행
- 예약 결과 및 결제 기한 안내 (코레일 응답에서 확인한 값만 표시)
- Telegram 알림 연동
- 테스트용 모의 선점 트리거 (결과에 `[테스트]`로 표시되며 실제 예약이 아님)

## 구조

```text
server.ts              Express API + Vite 개발 서버 / 정적 파일 서빙
server/
├─ korail.ts           코레일 로그인·열차 조회·예약
├─ sniperManager.ts    취소표 감시 워커 및 상태 관리
├─ telegram.ts         Telegram 메시지 전송
├─ security.ts         관리자 토큰 인증, 요청 횟수 제한
└─ validation.ts       요청 본문 검증 (zod)
shared/
└─ types.ts            서버·클라이언트 공용 API 타입
src/                   React 19 대시보드
```

## 기술 스택

- React 19, TypeScript, Vite, Tailwind CSS, Motion
- Express, zod
- 패키지 매니저: Bun (`bun.lock`). npm으로도 설치할 수 있습니다.

## 로컬 실행

```bash
bun install          # 또는 npm install
cp .env.example .env # 필요 시 값 수정
bun run dev          # http://127.0.0.1:3000
```

타입 검사와 프로덕션 빌드:

```bash
bun run lint
bun run build
bun run start
```

## 환경변수

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 바인딩 주소. 루프백 이외의 주소로 바인딩하면 `ADMIN_TOKEN`이 **필수**이며, 없으면 서버가 시작되지 않습니다. |
| `PORT` | `3000` | 포트 |
| `ADMIN_TOKEN` | (없음) | 설정하면 `/api/health`를 제외한 모든 API에 `Authorization: Bearer <토큰>`이 필요합니다. 대시보드는 처음 401을 받으면 토큰을 입력받아 브라우저에 저장합니다. |
| `TRUST_PROXY` | (없음) | 리버스 프록시 뒤에서 실행할 때 설정 (예: `1`). 요청 제한이 실제 클라이언트 IP 기준으로 동작합니다. |
| `KORAIL_ID`, `KORAIL_PASSWORD` | (없음) | 설정하면 대시보드에서 로그인하지 않아도 감시를 시작할 수 있습니다. |

## 계정 정보 처리

- 대시보드에서 로그인에 성공하면 계정 정보는 **서버 메모리에만** 보관되고, 브라우저에는 비밀번호를 저장하거나 다시 보내지 않습니다.
- 로그아웃하거나 서버를 재시작하면 삭제됩니다. 재시작 후에는 다시 로그인하거나 `KORAIL_ID`/`KORAIL_PASSWORD`를 사용하세요.

## Docker

```bash
echo "ADMIN_TOKEN=$(openssl rand -hex 32)" >> .env
docker compose up -d --build
```

`docker-compose.yml`은 컨테이너 포트를 호스트의 `127.0.0.1:3000`에만 노출합니다. 외부에서 접속해야 하면 HTTPS 리버스 프록시 뒤에 두세요.

## API

`/api/health` 외 모든 엔드포인트는 `ADMIN_TOKEN` 설정 시 인증이 필요합니다.

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 서비스 및 워커 상태 |
| POST | `/api/korail/login` | 코레일 로그인 확인 (IP당 10분에 5회 제한) |
| POST | `/api/korail/logout` | 서버에 보관된 계정 정보 삭제 |
| GET | `/api/korail/session` | 서버에 계정 정보가 있는지 확인 |
| POST | `/api/korail/search` | 열차 및 좌석 조회 |
| POST | `/api/sniper/start` | 취소표 감시 시작 |
| POST | `/api/sniper/stop` | 감시 중지 |
| GET | `/api/sniper/status` | 실시간 상태 및 로그 |
| POST | `/api/sniper/mock-trigger` | 테스트용 가상 선점 결과 생성 |
| POST | `/api/telegram/test` | Telegram 연동 테스트 (IP당 1분에 5회 제한) |

요청 본문은 서버에서 검증되며, 형식이 맞지 않으면 `400`과 함께 이유를 돌려줍니다. 조회 주기(`minJitter`/`maxJitter`)는 1초 이상이어야 합니다.

## 보안 주의사항

- 코레일 비밀번호, Telegram Bot Token, `ADMIN_TOKEN` 등을 Git에 커밋하지 마세요. `.gitignore`는 `.env.example`을 제외한 `.env*` 파일을 무시합니다.
- 개인 계정 정보는 로그나 스크린샷에 남기지 않는 것을 권장합니다.
- 자동 조회 주기를 과도하게 짧게 설정하면 대상 서비스에 부담을 줄 수 있습니다.
- 외부 서비스의 API·웹 동작을 이용하는 코드는 서비스 변경으로 깨질 수 있습니다.

## 프로젝트 성격

개인 사용 및 구현 연구를 위한 프로젝트입니다. 공식 코레일 애플리케이션이나 코레일에서 제공·보증하는 서비스가 아닙니다.
