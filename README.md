# CAFFIEND RISE

CAFFIEND의 기다림을 **Playable Brand Experience**로 전환하기 위한 모바일 웹 MVP입니다.

> Waiting Time → Brand Time

## v0.2 방향

이 프로젝트는 단순한 수플레 제작 시뮬레이션이 아니라, 고객이 25초 동안 반복적으로 타이밍을 맞추며 기록을 갱신하고 카피엔드의 계절·제작 과정·먹는 방식을 자연스럽게 경험하도록 설계합니다.

### 핵심 게임 루프

1. QR 또는 URL로 접속
2. 계절 테마 선택 또는 현재 시즌 자동 선택
3. 수플레가 부풀어 오르는 흐름을 보고 가장 좋은 순간에 TAP
4. PERFECT 연속 성공 시 콤보와 점수 증가
5. 실수해도 게임은 끝나지 않고 콤보가 초기화되며 일부 점수만 손실
6. 시즌 보너스와 제작 과정 메시지 노출
7. 결과 화면에서 기록, PERFECT 비율, 먹는 방법 확인
8. 즉시 재도전 또는 공유

## 난이도 곡선

| 구간 | 모드 | 특징 |
| --- | --- | --- |
| 0–5초 | EASY | 넓은 PERFECT 구간, 학습 구간 |
| 5–12초 | FLOW | 판정 범위 축소, 속도 상승 |
| 12–20초 | HARD | 더 좁은 판정, 리듬 압박 |
| 20–25초 | FINAL RISE | 가장 정밀한 타이밍, 최고 배수 |

콤보가 높아질수록 미세하게 속도가 올라가므로 입문은 쉽지만 고득점은 어렵습니다.

## Four Seasons Engine

사계절은 단순 색상 스킨이 아니라 서로 다른 플레이 감각을 가집니다.

- **SPRING / BLOOM MODE** — 조금 더 여유로운 판정과 빠른 시즌 보너스
- **SUMMER / BRIGHT MODE** — 전체 템포가 빠른 플레이
- **AUTUMN / RHYTHM MODE** — 리듬이 흔들리는 타이밍 플레이
- **WINTER / PRECISION MODE** — 가장 좁은 판정 대신 높은 점수 배수

실제 매장 제철 과일명은 확정 데이터와 연결한 뒤 `config.js`에서 교체하도록 구성했습니다.

## 파일 구조

```text
index.html       # 화면 구조
style.css        # 모바일 우선 프리미엄 UI 및 사계절 테마
config.js        # 난이도·사계절·브랜드 카피 설정
game.js          # 플레이 루프·점수·결과 처리
leaderboard.js   # 기록 저장 Adapter
```

## 기록 시스템

현재 v0.2는 브라우저 `localStorage`를 사용하는 MVP입니다. `leaderboard.js`를 별도 Adapter로 분리해 추후 Supabase/Firebase/API 기반 실시간 매장 랭킹으로 교체할 수 있도록 했습니다.

현재 화면의 `TODAY · THIS DEVICE`는 **실제 매장 전체 랭킹이 아니라 해당 기기의 기록**입니다.

향후 목표:

```text
Local Adapter
    ↓
Realtime Leaderboard API
    ↓
Daily / Seasonal Ranking
    ↓
Record-break Reward
```

## 브랜드 원칙

- 게임은 단순하게
- 높은 기록은 어렵게
- 실패는 스트레스가 아니라 재도전 이유가 되게
- 제작 과정은 설명하지 말고 플레이 속에서 경험하게
- 계절 변화는 실제 메뉴와 재방문 이유로 연결
- 할인보다 기록 자체가 먼저 보상이 되게

## 실행

정적 HTML/CSS/JS 프로젝트라 별도 빌드가 필요하지 않습니다.

로컬에서는 `index.html`을 열거나 간단한 정적 서버를 사용할 수 있습니다. GitHub Pages에서는 `main` 브랜치의 `/root`를 publishing source로 설정하면 됩니다.

## 다음 단계

- 실제 고객 대상 반복 플레이율 테스트
- 시즌별 체감 난이도 테스트
- 실제 카피엔드 제철 메뉴/먹는 법 카피 반영
- Supabase 기반 실시간 Daily Leaderboard
- 기록 갱신 보상 운영 룰
- 결과 이미지/스토리 공유 카드
- QR 기반 매장 실사용 실험

---

CAFFIEND RISE v0.2 — 2026 AI Content Marketing Hackathon MVP
