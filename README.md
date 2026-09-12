# CAFFIEND MOMENTS — RISE

CAFFIEND의 기다림을 짧은 플레이, 계절 경험, 기록 경쟁, 공유로 전환하는 모바일 웹 MVP입니다.

> **기다리는 순간도, 카피엔드답게.**

## v0.3 방향

이 프로젝트의 목적은 단순히 대기시간에 게임을 제공하는 것이 아닙니다. 고객이 이미 휴대폰을 사용하는 대기시간을 `Waiting Time → Brand Time`으로 바꾸고, CAFFIEND의 디저트 제작 과정·사계절 제철 경험·기록·공유를 하나의 플레이어블 브랜드 경험으로 연결합니다.

### Brand
- 상위 경험 브랜드: `CAFFIEND MOMENTS`
- 게임: `RISE`
- 브랜드 카피: `기다리는 순간도, 카피엔드답게.`
- 대표 인터뷰 방향: 맛있는 메뉴와 기분 좋은 기다림, 더 좋은 경험을 선물하는 공간

### Play
- 25초 ONE TAP 타이밍 게임
- `EASY → FLOW → HARD → FINAL RISE` 난이도 곡선
- 실패 시 즉시 종료가 아니라 콤보/점수 손실
- 계절별 리듬·판정·보너스가 다름
- SOLO / TABLE CHALLENGE 지원

### Four Seasons
- SPRING — BLOOM MODE
- SUMMER — BRIGHT MODE
- AUTUMN — RHYTHM MODE
- WINTER — PRECISION MODE

실제 제철 과일/메뉴명은 운영 데이터 확인 전 임의로 고정하지 않고 `config.js`에서 쉽게 교체할 수 있는 구조로 유지합니다.

### Marketing Loop

`매장 방문 → QR → 시즌 발견 → 플레이 → 재도전/테이블 경쟁 → 기록 → 시즌 디저트 관심 → 공유 → 다음 방문`

결과 화면은 단순 점수 화면이 아니라 CAFFIEND 브랜드 광고물 역할을 하도록 설계했습니다.
- 시즌별 결과 카드
- `너는 몇 점?` Challenge Share
- 시즌 디저트 CTA
- 시즌 스토리 / HOW TO ENJOY
- 로컬 Daily Record
- 향후 매장 전체 실시간 랭킹 및 기록 갱신 보상 확장

### MVP Analytics

`analytics.js`는 오늘의 주요 행동 수를 localStorage에 기록합니다.
- season_select
- play_mode_select
- game_start
- game_complete
- new_local_record
- table_player_complete
- season_story_open
- result_share
- challenge_share

현재는 실험용 로컬 데이터이며, 실제 현장 검증 단계에서는 Supabase/Firebase 또는 별도 분석 도구로 교체합니다.

## 구조

```text
index.html       화면/브랜드 경험 구조
style.css        모바일 우선 프리미엄 UI
config.js        브랜드/사계절/난이도/시즌 콘텐츠 설정
game.js          게임 및 공유/테이블 챌린지 로직
leaderboard.js   기록 어댑터 (현재 local/session storage)
analytics.js     마케팅 실험 이벤트 어댑터
```

## 운영 전 필요한 것

1. 실제 사계절 메뉴/제철 과일 정보 반영
2. 대표님이 원하는 정확한 `HOW TO ENJOY` 문구 확정
3. 실제 보상 정책 확정
4. Supabase 등으로 매장 전체 Daily Leaderboard 구현
5. 기록 조작/중복 보상 방지
6. iOS Safari / Android Chrome 실기기 테스트
7. 고객 A/B 테스트: 대기 체감, 재도전, 공유, 브랜드 기억, 시즌 메뉴 관심

## 현재 제한

현재 `TODAY` 최고 기록은 매장 전체 기록이 아니라 **해당 기기의 로컬 기록**입니다. TABLE CHALLENGE 역시 같은 브라우저 세션 안에서 작동합니다. UI 문구는 이 MVP 상태를 과장하지 않도록 유지해야 합니다.

## Run

정적 HTML/CSS/JS 프로젝트이므로 별도 빌드가 필요 없습니다. GitHub Pages에서 `main / (root)`로 배포할 수 있습니다.
