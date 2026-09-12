# CAFFIEND MOMENTS — RISE

CAFFIEND의 기다림을 **Playable Brand Experience**로 바꾸는 모바일 웹 프로젝트입니다.

> **기다리는 순간도, 카피엔드답게.**

현재 버전: **v0.4**

## 제품 정의

이 프로젝트의 목적은 “대기시간에 게임 하나를 제공하는 것”이 아닙니다. 고객이 이미 휴대폰을 사용하는 시간을 `Waiting Time → Brand Time`으로 전환하고, 카피엔드의 사계절·디저트 제작 과정·기록 경쟁·친구/테이블 경쟁·공유·재방문을 하나의 흐름으로 연결합니다.

### 핵심 루프

`매장 방문 → QR → 시즌 발견 → 플레이 → 재도전/테이블 경쟁 → 기록 → 시즌 메뉴 관심 → 공유/친구 도전 → 다음 시즌 재방문`

## v0.4에서 추가된 것

### 1. Brand System
- 상위 경험 브랜드: `CAFFIEND MOMENTS`
- 게임: `RISE`
- 캠페인 문장: `기다리는 순간도, 카피엔드답게.`
- 브랜드 약속: `맛있는 메뉴와 기분 좋은 기다림, 더 좋은 경험을 선물하는 공간.`
- Signature: `GOOD TASTE TAKES A MOMENT.`

### 2. Four Seasons Campaign
- SPRING — `BLOOM MODE`
- SUMMER — `BRIGHT MODE`
- AUTUMN — `RHYTHM MODE`
- WINTER — `PRECISION MODE`

계절마다 게임 속도, 판정 폭, 리듬, 보너스, 스토리, 결과 카드가 달라집니다.

실제 제철 과일/메뉴명은 대표님·매장 데이터 확인 전 임의로 고정하지 않습니다. `config.js`의 시즌 데이터만 교체하면 실제 메뉴로 연결할 수 있습니다.

### 3. Growth / Marketing Layer
- 친구 기록을 링크로 보내는 `FRIEND CHALLENGE`
- 링크를 받은 고객에게 목표 점수 노출
- 친구 기록을 넘겼는지 결과에서 즉시 판정
- `SOLO / TABLE CHALLENGE`
- 공유용 결과 카드 생성
- 시즌 메뉴/스토리/먹는 방법 CTA
- QR/UTM/source/table 파라미터 attribution 기록
- 플레이 시작·완료·공유·도전·시즌 선택 등의 로컬 퍼널 데이터

### 4. Four Seasons Passport
각 계절에서 플레이하면 브라우저에 시즌 스탬프가 누적됩니다.

이 기능의 목적은 단순 수집이 아니라 **사계절 제철 경험과 재방문 이유를 연결하는 것**입니다. 실제 리워드와 연결할지는 매장 정책 확정 후 결정합니다.

### 5. Leaderboard Architecture
현재 프론트는 두 모드를 지원합니다.

- `LOCAL PREVIEW`: 서버 연결 전. 해당 기기의 오늘 기록을 사용.
- `STORE LIVE`: `config.js > store.leaderboardApi`에 실제 API를 넣으면 매장 전체 Daily Leaderboard로 전환.

프론트 UI는 두 상태를 명확히 구분하여 **가짜 실시간 순위를 표시하지 않습니다.**

## Production backend scaffold

`supabase/`에 실제 매장 전체 순위를 위한 서버 구조를 추가했습니다.

```text
supabase/
├─ migrations/
│  └─ 001_rise.sql
└─ functions/
   └─ rise-api/
      └─ index.ts
```

### DB
`rise_scores`
- store / season / day 단위 점수
- play_id 중복 제출 방지
- device hash
- perfect rate / combo / tap count
- 제출 metadata

`rise_reward_claims`
- 기록 보상 코드
- 기기당 일일 중복 발급 방지
- issued / redeemed / void 상태

브라우저에서 DB에 직접 쓰지 않도록 RLS를 켜고, 쓰기는 Edge Function의 Service Role을 통해 처리하도록 설계했습니다.

### Edge Function API

`GET /rise-api`

Query:
- `storeId`
- `seasonId`
- `date`
- `deviceId`
- `limit`

Return:
- dailyBest
- allTimeBest
- my rank
- top leaderboard

`POST /rise-api`

Body:
- storeId
- seasonId
- score
- date
- playId
- deviceId
- sessionId
- attribution
- metrics

서버에서 기본 범위 검증, 중복 play_id, 짧은 시간 반복 제출을 차단하도록 구성했습니다. 완전한 anti-cheat는 아니므로 실제 금전성 보상 도입 전에는 서버 검증을 더 강화해야 합니다.

### 필요한 환경변수

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RISE_ALLOWED_ORIGIN
RISE_REWARDS_ENABLED=false
RISE_REWARD_MIN_SCORE=1800
```

**Service Role Key는 절대로 GitHub/프론트 코드에 넣지 않습니다.**

Edge Function 배포 후 `config.js`의 아래 값만 실제 URL로 바꾸면 됩니다.

```js
store: {
  leaderboardApi: "https://<project>.supabase.co/functions/v1/rise-api"
}
```

## 파일 구조

```text
index.html          브랜드/게임/마케팅 화면
style.css           모바일 우선 프리미엄 UI
config.js           브랜드·난이도·시즌·매장·보상 설정
experience.js       친구 도전·사계절 패스포트·attribution·익명 device/session
leaderboard.js      LOCAL PREVIEW / STORE LIVE 어댑터
game.js             게임·결과·공유·테이블·브랜드 루프
analytics.js        현장 실험용 이벤트/퍼널 기록
.github/workflows/  JS syntax CI
supabase/            실시간 매장 순위 backend scaffold
```

## 현재 확정하지 않은 것

다음은 실제 매장 확인 전 의도적으로 가짜로 만들지 않았습니다.

- 실제 사계절 제철 과일/메뉴명
- 대표님이 권장하는 정확한 `HOW TO ENJOY`
- 기록 갱신 보상의 실제 혜택/금액
- POS/주문번호 연동

## 현장 테스트 KPI

1. QR → 게임 시작률
2. 게임 완료율
3. 2회 이상 재도전율
4. TABLE CHALLENGE 참여율
5. 친구 도전/결과 공유율
6. 시즌 메뉴 관심/스토리 열람
7. 대기시간 체감 전·후
8. `CAFFIEND / 수플레 / 사계절 / 기다림` 브랜드 회상
9. 다음 시즌 재방문 의향

인터넷 조사만으로 “고객이 대기시간을 불편해한다”고 결론내리지 않습니다. 현재 현장 입력상 큰 대기 컴플레인은 확인되지 않았으므로, 이 프로젝트는 **불만 제거가 아니라 사용되지 않던 기다림 접점을 더 좋은 브랜드 경험으로 전환하는 실험**입니다.

## IP Boundary

이 저장소는 `2026 경북 스타트업 AI 콘텐츠 마케팅 해커톤 / CAFFIEND` 전용입니다.

**GARANG의 코드, 프롬프트, 브랜드 자산, Agent 구조, 데이터, 사업 전략을 사용하지 않습니다.**
