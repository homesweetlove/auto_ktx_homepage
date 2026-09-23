# KTX Sniper

코레일 KTX 시간표와 좌석을 조회하고, 사용자가 지정한 열차의 취소표를 반복 확인해 **개인용 자동 선점 흐름을 실험하기 위한 풀스택 프로젝트**입니다.

이 저장소는 UI 프로토타입만 있는 프로젝트가 아니라 React 대시보드, Node/Express API, 코레일 연동 로직, 감시 워커, Telegram 알림 코드와 별도의 FastAPI 구현까지 함께 포함하고 있습니다.

> 코레일의 비공개/내부 동작에 의존하는 부분은 서비스 변경에 따라 언제든 동작하지 않을 수 있습니다. 실제 사용 시 코레일 이용약관, 접근 정책 및 관련 규정을 확인하세요.

## 주요 기능

- 코레일 계정 로그인 확인
- 출발역 / 도착역 / 날짜 / 시간 기준 열차 조회
- 일반실·특실 등 대상 열차 선택
- 지정 열차 취소표 반복 감시
- 감시 상태, 조회 횟수, 지연시간과 로그 표시
- 조건 충족 시 선점 흐름 실행
- 성공 결과 및 결제 제한시간 안내
- Telegram 알림 연동
- 테스트용 모의 선점 트리거
- 대시보드 / 코드 보기 / 계획 / Android 안내 UI

## 현재 구조

이 저장소에는 두 개의 백엔드 계열이 공존합니다.

### 1. Node / Express + React

현재 `npm run dev`와 `npm run build`가 사용하는 주 실행 경로입니다.

```text
server.ts
server/
├─ korail.ts
├─ sniperManager.ts
└─ telegram.ts

src/
├─ App.tsx
├─ components/
├─ data/
├─ types/
└─ utils/
```

- `server.ts` — Express API와 Vite 개발 서버
- `server/korail.ts` — 코레일 로그인·열차 조회 관련 로직
- `server/sniperManager.ts` — 취소표 감시 워커 및 상태 관리
- `server/telegram.ts` — Telegram 메시지 전송
- `src/` — React 19 기반 사용자 인터페이스

### 2. Python / FastAPI

`app/` 디렉터리에는 별도의 FastAPI 백엔드 구현이 있습니다.

```text
app/
├─ api/
├─ core/
├─ models/
├─ services/
└─ main.py
```

루트의 `Dockerfile`과 `docker-compose.yml`은 이 **FastAPI 백엔드**를 기준으로 구성되어 있습니다.

즉, 현재 저장소의 Node/React 실행 경로와 Docker/FastAPI 실행 경로는 동일한 엔트리포인트가 아닙니다.

## 기술 스택

### Frontend / Node 경로

- React 19
- TypeScript
- Vite
- Express
- Motion
- Tailwind CSS
- Bun lockfile 포함

### Python 경로

- Python 3.11
- FastAPI
- Uvicorn
- korail2
- Pydantic
- HTTPX
- Cryptography

## 로컬 실행 — Node/React

### 요구사항

- Node.js
- npm

### 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

기본 서버 포트는 코드 기준 `3000`입니다.

### 타입 검사

```bash
npm run lint
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

빌드 시 Vite 프런트엔드와 `server.ts` Express 서버를 함께 준비합니다.

## FastAPI 백엔드 실행

### 가상환경

```bash
python -m venv venv
```

Windows:

```powershell
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Linux/macOS:

```bash
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Docker

루트 Docker 구성은 FastAPI 백엔드를 실행합니다.

```bash
docker compose up -d --build
```

기본 매핑:

```text
localhost:8000 → container:8000
```

`docker-compose.yml`은 다음 환경변수를 선택적으로 전달할 수 있도록 되어 있습니다.

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## 환경변수

`.env.example`에는 AI Studio에서 사용하던 다음 플레이스홀더도 남아 있습니다.

```env
GEMINI_API_KEY=
APP_URL=
```

실제 비밀값이 들어간 `.env` 파일은 커밋하지 마세요. 현재 `.gitignore`는 `.env.example`을 제외한 `.env*` 파일을 무시합니다.

## 주요 API — Node/Express 경로

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 서비스 및 워커 상태 |
| POST | `/api/korail/login` | 코레일 로그인 확인 |
| POST | `/api/korail/search` | 열차 및 좌석 조회 |
| POST | `/api/sniper/start` | 취소표 감시 시작 |
| POST | `/api/sniper/stop` | 감시 중지 |
| GET | `/api/sniper/status` | 실시간 상태 및 로그 |
| POST | `/api/sniper/mock-trigger` | 테스트 성공 트리거 |
| POST | `/api/telegram/test` | Telegram 연동 테스트 |

## 배포 관련 참고

`deploy.sh`는 systemd 서비스 설치를 전제로 작성되어 있지만 현재 저장소 루트에는 스크립트가 참조하는 `ktx-sniper.service` 파일이 없습니다.

따라서 현 상태에서 `deploy.sh`를 그대로 실행하는 것보다는:

- Node/Express 경로는 `npm run build && npm start`
- FastAPI 경로는 Docker 또는 직접 Uvicorn 실행

방식을 사용하는 편이 현재 저장소 구조와 일치합니다.

## 보안 주의사항

- 코레일 비밀번호, Telegram Bot Token, Chat ID 등을 Git에 커밋하지 마세요.
- 개인 계정 정보는 로그나 스크린샷에 남기지 않는 것을 권장합니다.
- 자동 조회 주기를 과도하게 짧게 설정하면 대상 서비스에 부담을 줄 수 있습니다.
- 외부 서비스의 API·웹 동작을 이용하는 코드는 서비스 변경으로 깨질 수 있습니다.

## 프로젝트 성격

개인 사용 및 구현 연구를 위한 프로젝트입니다. 공식 코레일 애플리케이션이나 코레일에서 제공·보증하는 서비스가 아닙니다.
