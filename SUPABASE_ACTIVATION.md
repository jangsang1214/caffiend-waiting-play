# Soufflé Backend Activation

현재 저장소에는 Soufflé Maker용 데이터 스키마와 Edge Function이 준비되어 있습니다. 실제 원격 수집을 활성화할 때 아래 순서로 진행합니다.

## 준비된 파일

- `supabase/migrations/004_souffle_mvp.sql`
- `supabase/functions/souffle-api/index.ts`
- `souffle-service.js`
- `scripts/souffle-contract-check.mjs`

## 1. DB migration 적용

Supabase project: `pygyhbtipxhpuypjofqe`

`004_souffle_mvp.sql`을 적용하면 다음 테이블이 생성됩니다.

- `public.souffle_runs`
- `public.souffle_feedback`

두 테이블 모두 RLS가 활성화되고 브라우저용 anonymous write policy는 만들지 않습니다.

## 2. Edge Function 배포

함수 이름:

```text
souffle-api
```

예상 URL:

```text
https://pygyhbtipxhpuypjofqe.supabase.co/functions/v1/souffle-api
```

브라우저는 DB에 직접 쓰지 않고 이 함수만 호출합니다. service-role key는 클라이언트 코드에 포함하지 않습니다.

## 3. Health check

배포 후:

```text
GET /health
```

정상 응답 예시:

```json
{"ok":true,"service":"souffle-api","version":2}
```

## 4. API 계약

### POST /run

서버가 다음을 다시 검증합니다.

- player/session/menu/season 형식
- 12개 step result 존재
- 단계별 허용 점수
- STEP 8, 9 느린 폴딩 분기
- STEP 12 timing 점수
- 4분 30초 이후 overtime 감점
- 15분 동안 플레이어당 최대 20회 rate limit

### POST /feedback

완료된 run과 같은 player/session만 피드백을 저장할 수 있습니다.

### GET /summary?storeId=caffiend-yangdeok

최근 30일 기준으로 다음을 반환합니다.

- 완료 run 수
- 평균 점수
- 평균 플레이 시간
- overtime 비율
- 피드백 응답 수
- 평균 재미 점수
- 평균 체감 대기 개선 점수
- 평균 기대감 점수
- 메뉴별 플레이 수

## 5. 앱 동작

`config.js`의 Soufflé API 주소는 이미 설정되어 있습니다. `souffle-service.js`는 다음 순서로 동작합니다.

1. `/health` 확인
2. 백엔드가 정상이면 run/feedback 전송
3. 서버가 없거나 네트워크가 끊기면 결과를 local archive에 먼저 보존
4. 전송 실패 항목은 local queue에 저장
5. 네트워크 복구 시 자동 재전송

개발자 콘솔 진단:

```js
CaffiendSouffleService.status()
CaffiendSouffleService.exportLocal()
CaffiendSouffleService.probeHealth(true)
CaffiendSouffleService.flushQueue({forceHealth:true})
```

## 현재 상태

현재 연결된 Supabase 프로젝트에서 확인되는 활성 Edge Function은 `digul-api`입니다. `souffle-api`의 migration/function 배포는 저장소에는 준비되어 있으나, 현재 ChatGPT 연결 권한에서는 Supabase write 작업이 거부되어 원격 활성화까지 완료하지 못했습니다.

따라서 현 버전은 **게임 플레이 자체에는 영향 없이 local-first로 동작**하며, 원격 Soufflé 분석 데이터 수집은 위 두 배포가 완료된 이후 활성화됩니다.
