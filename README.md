# CAFFIEND PLAY

카피엔드의 대기시간을 세 가지 짧은 모바일 게임으로 바꾸는 QR 웹 경험입니다.

현재 홈에서 바로 선택할 수 있는 게임:
1. **디굴디굴** — 실제 카페 메뉴를 합치는 물리 머지 게임
2. **수플레 만들기** — 휘젓기 → 오븐 타이밍 → 토핑 선택
3. **비밀예약자는 누구?** — 세 가지 단서로 예약자를 찾는 30초 추리 게임

## v1.2.1 현재 상태

- 모바일 세로 화면 우선
- 회원가입 없이 닉네임 + 기기별 player ID
- CAFFIEND 홈 → 3게임 선택
- Matter.js 기반 디굴디굴 물리 합체
- 수플레 만들기 플레이 가능
- 비밀예약자 추리 플레이 가능
- KST 월요일~일요일 기준 **Supabase 주간 실시간 리더보드 연결**
- 게임 이벤트를 약 1초 단위로 묶어 서버 전송
- 서버가 허용 단계/점수를 다시 검증
- RLS 활성화 + 브라우저 직접 DB 쓰기 차단
- Edge Function에서만 service-role 권한 사용
- SVG 메뉴 모델 사용 금지
- 메뉴 비주얼은 현재 **Canvas 기반 raster 렌더링**
- 디굴디굴 메뉴 물리 크기와 화면 표시 크기를 v1.2.1에서 확대
- 합체 단계가 올라갈수록 메뉴 크기와 시각적 강조가 커짐

## 디굴디굴 규칙

| 단계 | 메뉴 | 합체 생성 점수 | 상대 지름 |
|---:|---|---:|---:|
| 1 | 로투스 수플레 | - | 1.00 |
| 2 | 꿀자몽빙수 | +3 | 1.25 |
| 3 | 밤 수플레 | +6 | 1.50 |
| 4 | 흑임자 수플레 | +10 | 1.80 |
| 5 | 복숭아 수플레 | +15 | 2.10 |
| 6 | 옛날인절미팥빙수 | +21 | 2.45 |
| 7 | 두바이 초코 수플레 | +28 | 2.80 |
| 8 | 코코망고리치빙수 | +36 | 3.20 |
| 9 | 인절미 수플레 | +45 | 3.65 |
| 10 | 흑임자빙수 | +55 | 4.10 |
| 11 | 크림브륄레 수플레 | +66 | 4.60 |

- 새 투하 메뉴: 1~5단계 동일 확률
- 6~11단계: 합체로만 생성
- 11단계 두 개 합체: 두 개 제거 + **150점**
- 투하 쿨다운: 0.5초
- 위험선 위 2초 연속 유지: 게임 종료
- 합체 순서/순위 패널을 열면 게임 물리 일시정지

## 주간 실시간 순위

Supabase 프로젝트: `caffiend-play`

Edge Function:
```text
https://pygyhbtipxhpuypjofqe.supabase.co/functions/v1/digul-api
```

집계 방식:
- KST 월요일 00:00 ~ 일요일 23:59:59
- 플레이어별 주간 최고점
- 동점이면 먼저 해당 점수에 도달한 플레이어 우선
- 닉네임은 표시용, 식별은 별도 player ID
- 새 게임 점수가 낮아도 기존 주간 최고점 유지
- 최고점 초과 시 즉시 갱신

서버는 브라우저가 보내는 최종 점수를 그대로 믿지 않고:
1. `game_id` 생성
2. drop / merge 이벤트 순번 확인
3. 중복/역순 이벤트 차단
4. 단계별 허용 점수 재계산
5. 검증된 점수만 DB 누적
6. 주간 최고점/순위 계산

## Supabase

마이그레이션:
- `supabase/migrations/002_digul.sql`
- `supabase/migrations/003_digul_rank_view_security.sql`

함수:
- `supabase/functions/digul-api/index.ts`

보안:
- `digul_games`, `digul_game_events`, `digul_weekly_best` 모두 RLS 활성화
- anon용 테이블 policy 없음 → 브라우저 직접 읽기/쓰기 차단
- `digul_weekly_ranked` view는 `security_invoker=true`
- service-role/secret은 클라이언트 코드에 포함하지 않음

## 비주얼 정책

현재 프로젝트에서는 **SVG 메뉴 일러스트를 사용하지 않습니다.**

허용:
- 실제 메뉴 PNG/WebP
- 고해상도 raster 생성 이미지
- Canvas raster 렌더링

원칙:
- 작은 메뉴에서도 토핑 특징이 보일 것
- 메뉴 단계가 커질수록 화면상 크기 차이가 명확할 것
- 게임 물리 충돌 반경과 보이는 메뉴 크기가 크게 어긋나지 않을 것
- 품질이 떨어지는 임시 벡터/SVG는 production UI에 넣지 않을 것

CI의 static smoke check에서도 SVG UI 자산을 감지하면 실패하도록 구성되어 있습니다.

## 파일 구조

```text
index.html
style.css
config.js
experience.js
leaderboard.js
analytics.js
dessert-art.js
game.js
side-games.js
scripts/
  smoke-check.mjs
supabase/
  migrations/
    002_digul.sql
    003_digul_rank_view_security.sql
  functions/
    digul-api/
      index.ts
.github/
  workflows/
    validate.yml
```

## 배포

GitHub Pages:
```text
https://jangsang1214.github.io/caffiend-waiting-play/
```

푸시마다:
1. JavaScript 문법 검사
2. 필수 DOM/파일 검사
3. 11단계 메뉴/150점/주간 순위 설정 검사
4. SVG 금지 검사
5. Supabase API 연결 검사
6. GitHub Pages 배포

## 다음 현장 QA

- iPhone Safari
- Android Chrome
- 실제 휴대폰 2대 이상에서 동시 랭킹 갱신
- 메뉴 크기/충돌감 재조정
- 작은 1~5단계 메뉴 식별성
- 실제 대기시간 중 재플레이율/체감시간 테스트

## IP Boundary

이 저장소는 해커톤용 CAFFIEND 프로젝트입니다. 별도 개인/상업 프로젝트의 코드·프롬프트·브랜드 자산을 가져오지 않습니다.
