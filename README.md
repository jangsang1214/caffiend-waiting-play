# CAFFIEND PLAY

카피엔드의 대기시간을 모바일 웹 게임 경험으로 바꾸는 QR 기반 프로젝트입니다.

현재 홈에서 선택할 수 있는 게임:
1. **디굴디굴** — 실제 카페 메뉴를 합치는 물리 머지 게임
2. **수플레 만들기** — 실제 조리 흐름을 12단계로 압축한 체험형 게임
3. **비밀예약자는 누구?** — 세 가지 단서로 예약자를 찾는 30초 추리 게임

> 수플레 대기시간이 실제 고객 불만이나 이탈을 만든다는 점은 아직 현장 검증 전입니다.  
> 현재 MVP의 목적은 “수플레 제작 체험이 재미있는가 / 체감 대기시간이 덜 지루한가 / 실제 메뉴 기대감이 높아지는가”를 측정하는 것입니다.

## v2.0.0 — Soufflé Maker Field MVP

### 플레이 흐름

`QR → CAFFIEND PLAY → 수플레 선택 → 4개 제스처 안내 → 12단계 조리 → 완성 → 결과 → 3문항 피드백`

회원가입은 없으며 기존 CAFFIEND PLAY 닉네임과 기기별 player ID를 사용합니다.

### 12단계 조리

1. 달걀 분리
2. 노른자 반죽 — 설탕·우유·바닐라·소금
3. 박력분 체치기
4. 노른자 반죽 섞기
5. 흰자 풀기
6. 설탕 3회 + 휘핑 3회
7. 머랭 뿔 확인
8. 머랭 1/3 섞기
9. 마지막 폴딩
10. 팬 준비 — 기름 + 반죽
11. 물 + 뚜껑 + 20초 압축 굽기
12. 뒤집기 + 물 + 뚜껑 + 마지막 타이밍

실제 조리시간을 그대로 시뮬레이션하지 않습니다. 긴 굽기 구간은 모바일 게임 플레이에 맞게 압축합니다.

### 공통 입력 시스템

- **Tap** — 달걀 깨기, 뚜껑 닫기
- **Drag & Drop** — 재료·물·반죽 옮기기
- **Swipe** — 체치기, 기름 바르기, 뒤집기
- **Continuous Drag** — 휘핑, 반죽 섞기, 폴딩

12개의 독립 미니게임 대신 네 가지 입력 시스템을 재사용합니다.

### 게임 규칙

- 머랭 설탕은 3회로 나눠 넣음
- 머랭/노른자 반죽 폴딩은 너무 빠르면 PERFECT를 받지 못함
- 마지막 굽기는 타이밍 점수 0~100점
- 4분 30초 초과 시 강제 종료하지 않고 오버타임 + 초당 2점 감점
- 게임 결과가 실제 주문 진행 상황처럼 보이지 않도록 결과 화면에 **“실제 주문 준비 상황과 연동되지 않습니다.”**를 명시
- 정상 점수 범위는 조작 결과에 따라 약 **1225~1430점**이며 오버타임 감점이 추가될 수 있음

### 메뉴

`config.js`의 메뉴 데이터 중 수플레 항목을 사용합니다.

- 로투스 수플레
- 밤 수플레
- 흑임자 수플레
- 복숭아 수플레
- 두바이 초코 수플레
- 인절미 수플레
- 크림브륄레 수플레

### 사계절 비주얼

KST 기준 현재 월에 따라 배경 경험 레이어를 봄·여름·가을·겨울로 변경할 수 있는 구조입니다. 이는 실제 시즌 메뉴 정보를 임의로 생성하는 기능이 아닙니다.

## 현장 검증용 3문항

게임 완료 후 1~5점으로 다음을 묻습니다.

1. 게임이 재미있었나요?
2. 기다림이 덜 지루하게 느껴졌나요?
3. 실제 수플레가 더 기대되나요?

세 문항은 현재 MVP 가설과 직접 연결됩니다.

## 수플레 기록 저장

현재 클라이언트는 **local-first**로 동작합니다.

`souffle-service.js`는:
1. 완료 run/feedback을 브라우저 local archive에 먼저 저장
2. 원격 API `/health`를 확인
3. API가 정상일 때 서버 전송
4. 전송 실패 시 queue에 보관
5. 네트워크 복구 시 자동 재전송
6. 백엔드 장애 시 30초 circuit-breaker cooldown으로 불필요한 반복 요청 방지

개발자 콘솔:

```js
CaffiendSouffleService.status()
CaffiendSouffleService.exportLocal()
CaffiendSouffleService.probeHealth(true)
CaffiendSouffleService.flushQueue({forceHealth:true})
```

### 원격 백엔드 준비 상태

저장소에는 아래가 준비되어 있습니다.

- `supabase/migrations/004_souffle_mvp.sql`
- `supabase/functions/souffle-api/index.ts`

예정 API:

```text
https://pygyhbtipxhpuypjofqe.supabase.co/functions/v1/souffle-api
```

서버는 브라우저 점수를 그대로 믿지 않고 12단계 결과, 폴딩 분기, 마지막 타이밍 점수, 오버타임 감점을 다시 검증하도록 작성되어 있습니다.

**현재 원격 Soufflé 백엔드는 아직 활성화되지 않았습니다.** 연결된 Supabase 프로젝트에서 활성 Edge Function으로 확인되는 것은 `digul-api`뿐이며, 현재 ChatGPT 연결 권한에서는 migration/Edge Function write 작업이 거부되었습니다. 따라서 게임은 정상 플레이 가능하고 기록은 로컬에 보존되지만, Soufflé 원격 분석 수집은 Supabase 배포 완료 후 활성화됩니다.

배포 절차는 `SUPABASE_ACTIVATION.md`를 참고합니다.

## 디굴디굴

Matter.js 물리 머지 게임과 KST 월~일 주간 Supabase 리더보드를 유지합니다.

- 새 투하 메뉴: 1~5단계
- 6~11단계: 합체로 생성
- 11단계 두 개 합체: 제거 + 150점
- 서버가 drop/merge 이벤트를 검증하고 점수 재계산
- RLS 활성화
- 브라우저 직접 DB 쓰기 차단

## 자동 검증

GitHub Actions에서 푸시마다 수행합니다.

- 모든 JavaScript syntax check
- 필수 파일/DOM ID 검사
- script load order 검사
- SVG UI 금지 검사
- 디굴디굴 설정 검사
- 수플레 12단계/4입력/피드백 UI 검사
- Soufflé client/server scoring contract 검사
- 7개 메뉴 ID의 client/API/DB 일치 검사
- 4분 30초 timer 및 overtime 점수 규칙 일치 검사
- 백엔드 local-first archive/health probe 구조 검사
- GitHub Pages 배포

최근 contract test가 검증하는 Soufflé 점수 envelope는 **1225~1430점**입니다.

## 현장 테스트

`FIELD_TEST.md`에 실제 스마트폰 무료 QA와 MVP 성공 기준을 정리했습니다.

핵심 권장 지표:
- 완료율
- 재미 평균
- 체감 대기 개선 평균
- 수플레 기대감 평균
- 평균 플레이 시간
- 오버타임 비율
- 재도전 비율
- 단계별 수행 품질

유료 브라우저 자동 플레이 테스트는 사용하지 않습니다. 실제 터치 감각은 iPhone Safari / Android Chrome 현장 QA를 최종 기준으로 봅니다.

## 파일 구조

```text
index.html
style.css
souffle.css
souffle-v2.css
config.js
experience.js
leaderboard.js
analytics.js
dessert-art.js
sprite-renderer.js
game.js
side-games.js
souffle-service.js
souffle-game.js
FIELD_TEST.md
SUPABASE_ACTIVATION.md

scripts/
  smoke-check.mjs
  souffle-contract-check.mjs

supabase/
  migrations/
    002_digul.sql
    003_digul_rank_view_security.sql
    004_souffle_mvp.sql
  functions/
    digul-api/index.ts
    souffle-api/index.ts
```

## 배포

```text
https://jangsang1214.github.io/caffiend-waiting-play/
```

## IP Boundary

이 저장소는 해커톤용 CAFFIEND 프로젝트입니다. 별도 개인/상업 프로젝트의 코드·프롬프트·브랜드 자산을 가져오지 않습니다.
