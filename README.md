# CAFFIEND PLAY

카피엔드의 대기시간을 짧은 모바일 웹 게임 경험으로 바꾸는 QR 기반 프로젝트입니다.

현재 홈에서 선택할 수 있는 게임:
1. **디굴디굴** — 실제 카페 메뉴를 합치는 물리 머지 게임
2. **수플레 만들기** — 실제 조리 흐름을 12단계로 압축한 체험형 게임
3. **비밀예약자는 누구?** — 세 가지 단서로 예약자를 찾는 30초 추리 게임

> 수플레 대기시간이 실제로 고객 불만이나 이탈을 만든다는 점은 아직 현장 검증 전입니다.  
> v2.0.0의 목적은 “수플레 제작 체험이 재미있는가 / 체감 대기시간이 덜 지루한가 / 실제 메뉴 기대감이 높아지는가”를 측정하는 것입니다.

## v2.0.0 — Soufflé Maker Field MVP

수플레 만들기를 단순 데모에서 **현장 검증 가능한 MVP**로 확장했습니다.

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
12. 뒤집기 + 물 + 뚜껑 + 12초 압축 굽기 + 마지막 타이밍

실제 조리시간을 그대로 시뮬레이션하지 않습니다. 긴 굽기 구간은 게임 플레이에 맞게 압축되어 있습니다.

### 공통 입력 시스템

- **Tap** — 달걀 깨기, 뚜껑 닫기
- **Drag & Drop** — 재료·물·반죽 옮기기
- **Swipe** — 체치기, 기름 바르기, 뒤집기
- **Continuous Drag** — 휘핑, 반죽 섞기, 폴딩

12개의 독립 미니게임 대신 네 가지 입력 시스템을 재사용합니다.

### 조리 감각을 게임 규칙으로 반영

- 머랭 설탕은 3회로 나눠 넣음
- 머랭/노른자 반죽 폴딩은 너무 빠르면 PERFECT를 받지 못함
- 마지막 굽기는 타이밍 점수 0~100점
- 시간 초과 시 강제 종료하지 않고 오버타임 + 점수 감점
- 게임 결과가 실제 주문 진행 상황처럼 보이지 않도록 결과 화면에 **“실제 주문 준비 상황과 연동되지 않습니다.”**를 명시

### 메뉴

수플레 선택 목록은 별도 하드코딩 목록이 아니라 `config.js`의 실제 메뉴 데이터 중 `수플레` 항목을 필터링해 사용합니다.

현재 구성:
- 로투스 수플레
- 밤 수플레
- 흑임자 수플레
- 복숭아 수플레
- 두바이 초코 수플레
- 인절미 수플레
- 크림브륄레 수플레

메뉴 데이터가 변경되면 공용 `config.js`를 기준으로 게임 선택 화면도 함께 바뀌도록 구성했습니다.

### 사계절 비주얼

KST 기준 현재 월에 따라 자동으로:
- 봄: 3–5월
- 여름: 6–8월
- 가을: 9–11월
- 겨울: 12–2월

수플레 게임의 창밖 배경과 시즌 카피가 변경됩니다.

이는 실제 시즌 메뉴 정보를 임의로 생성하는 기능이 아니라 **배경 경험 레이어**입니다.

## 현장 검증용 3문항

게임 완료 후 1~5점으로 다음을 묻습니다.

1. 게임이 재미있었나요?
2. 기다림이 덜 지루하게 느껴졌나요?
3. 실제 수플레가 더 기대되나요?

이 세 문항은 v2.0.0의 핵심 MVP 가설과 직접 연결됩니다.

## 수플레 데이터 백엔드

Supabase Edge Function:

```text
https://pygyhbtipxhpuypjofqe.supabase.co/functions/v1/souffle-api
```

클라이언트는 service-role key를 가지지 않습니다.

### 저장 데이터

`souffle_runs`
- session ID
- store ID
- hashed player ID
- nickname
- selected menu
- season
- elapsed time
- overtime
- verified score
- final timing score
- 12단계 결과

`souffle_feedback`
- session ID
- 재미 1~5
- 체감 대기 1~5
- 기대감 1~5

### 서버 검증

브라우저가 보내는 최종 점수를 그대로 저장하지 않습니다.

서버는:
1. 12개 단계가 순서대로 모두 존재하는지 검사
2. 단계별 허용 점수/등급 검사
3. 마지막 타이밍 점수와 12단계 점수 일치 검사
4. 서버 규칙으로 총점을 다시 계산
5. 4분 30초 이후 오버타임 감점을 다시 계산
6. 비정상적으로 짧거나 긴 완료시간 차단
7. 동일 플레이어의 과도한 제출 제한
8. 중복 session ID는 idempotent 처리

### 오프라인/불안정 네트워크

게임 플레이 자체는 네트워크에 의존하지 않습니다.

완료 기록이나 피드백 전송이 실패하면 브라우저 `localStorage`에 제한된 개수의 전송 대기 항목을 보관하고, 다음 온라인 시점 또는 다음 게임 진입 때 재전송합니다. 실행 기록을 피드백보다 먼저 재전송하고, 결과 저장 직후 피드백을 빠르게 보내는 경우에는 짧은 재시도 후 큐로 넘겨 순서 경쟁도 완화합니다.

## 운영 확인 API

최근 30일 집계:

```text
GET /summary?storeId=caffiend-yangdeok
```

반환 예:
- 완료 플레이 수
- 평균 점수
- 평균 플레이시간
- 오버타임 비율
- 피드백 수
- 평균 재미 점수
- 평균 체감대기 점수
- 평균 기대감 점수
- 메뉴별 완료 수

헬스체크:

```text
GET /health
```

## 디굴디굴

기존 Matter.js 물리 머지 게임과 KST 월~일 주간 Supabase 리더보드는 유지됩니다.

- 새 투하 메뉴: 1~5단계
- 6~11단계: 합체로 생성
- 11단계 두 개 합체: 두 개 제거 + 150점
- 서버가 drop/merge 이벤트를 검증하고 점수를 재계산
- RLS 활성화
- 브라우저 직접 DB 쓰기 차단

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

scripts/
  smoke-check.mjs

supabase/
  migrations/
    002_digul.sql
    003_digul_rank_view_security.sql
    004_souffle_mvp.sql
  functions/
    digul-api/
      index.ts
    souffle-api/
      index.ts

.github/
  workflows/
    validate.yml
```

## CI / 정적 검증

푸시마다:
1. 모든 클라이언트 JavaScript syntax check
2. 필수 DOM ID 검사
3. script load order 검사
4. 11단계 디굴디굴 설정 검사
5. 수플레 12단계 / 4입력 / 4계절 / 7메뉴 설정 검사
6. 수플레 피드백 3문항 × 5점 UI 검사
7. 수플레 오프라인 sync queue 검사
8. 수플레 DB migration / Edge Function route 검사
9. SVG UI 금지 검사
10. GitHub Pages 배포

## 배포

```text
https://jangsang1214.github.io/caffiend-waiting-play/
```

## 아직 남은 현장 QA

코드/CI/배포와 별개로 다음은 실제 기기에서 검증해야 합니다.

- iPhone Safari 터치/드래그 감도
- Android Chrome 터치/드래그 감도
- 12단계 전체 완주 시 막히는 구간
- 20초 + 12초 굽기 구간 체감
- 작은 화면에서 결과 + 설문 스크롤
- 카페 실제 테이블 QR 진입
- 고객 재플레이율
- 실제 체감 대기시간 변화
- 피드백 응답률

자동 브라우저 유료 플레이 테스트는 수행하지 않은 상태입니다.

## IP Boundary

이 저장소는 해커톤용 CAFFIEND 프로젝트입니다. 별도 개인/상업 프로젝트의 코드·프롬프트·브랜드 자산을 가져오지 않습니다.
