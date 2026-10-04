# 디굴디굴 · CAFFIEND

카피엔드에서 메뉴를 기다리는 동안 QR로 바로 즐기는 모바일 웹 디저트 합체 게임입니다.

**디굴디굴 = 디저트 + 데굴데굴**

현재 제품 방향은 기존 `CAFFIEND MOMENTS — RISE`에서 **실제 메뉴 11종을 사용하는 물리 합체 게임**으로 전환되었습니다.

## 현재 구현

- 닉네임 2~10자: 한글·영문·숫자
- 기기별 `player_id` 별도 저장
- 동일 기기 재접속 시 닉네임 복원
- 스마트폰 세로 화면 우선
- 손가락으로 좌우 이동 → 손을 떼면 한 개 투하
- Matter.js 기반 낙하/충돌/굴림
- 1~5단계 동일 확률 등장
- 6~11단계는 합체로만 생성
- 동일 단계 2개 → 다음 단계 1개
- 11단계 2개 → 제거 + 150점
- 연쇄 합체 가능
- 중복 합체 방지
- 투하 간격 0.5초
- 위험선 2초 유지 시 종료
- 일시정지
- 브라우저 백그라운드 이동 시 자동 정지
- 합체 순서 패널
- 주간 실시간 순위 패널
- 패널 오픈 중 게임 물리 정지
- KST 기준 **월요일~일요일 주간 리더보드**
- 서버 미연결 시 `LOCAL` 미리보기로 정확히 표시

## 메뉴 / 점수

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

11단계 두 개가 합쳐지면 둘 다 사라지고 **+150점**입니다.

## 메뉴 이미지

공개 이미지 폴더:
https://drive.google.com/drive/folders/1gg78Qi7YoIfTiVtpktLcr-UqxJIUaVIo?usp=drive_link

프론트는 `assets/menu/` 아래의 실제 PNG를 우선 사용하고, 아직 파일이 배치되지 않았거나 로딩에 실패하면 색상 원형 fallback을 사용합니다.

정확한 파일명은 `assets/menu/README.md`를 참고하세요.

## 주간 순위

최신 요구사항에 따라 순위 집계 단위를 **일간 → 주간**으로 변경했습니다.

- 기간: KST 월요일 00:00 ~ 일요일 23:59:59
- 기준: 플레이어별 해당 주 최고점
- 동점: 해당 최고점에 먼저 도달한 플레이어 우선
- 닉네임은 표시용이며 식별자는 별도 player ID
- 새 게임에서 점수가 낮아도 기존 주간 최고점 유지
- 기존 최고점 초과 시 주간 순위 갱신

프론트는 약 1초 단위로 합체 이벤트를 묶어 서버에 전송하도록 구성되어 있습니다.

## 실시간 서버 구조

Supabase 예제 구현:
- `supabase/migrations/002_digul.sql`
- `supabase/functions/digul-api/index.ts`

서버는 클라이언트가 보낸 최종 점수 숫자만 믿지 않습니다.

1. 게임 시작 시 `game_id` 등록
2. `drop / merge` 이벤트에 순번 부여
3. 중복/역순 이벤트 무시
4. 단계별 허용 점수를 서버에서 다시 계산
5. 검증된 이벤트 점수만 게임 점수에 누적
6. 주간 최고 기록 갱신
7. 주간 리더보드 반환

초기 버전은 이벤트 순서·점수 규칙·투하 속도를 검증합니다. 실제 물리 충돌 전체를 서버에서 재시뮬레이션하는 수준의 강한 anti-cheat는 후속 범위입니다.

## Supabase 연결

1. migration 적용
2. Edge Function `digul-api` 배포
3. Function secret:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DIGUL_ALLOWED_ORIGIN`
4. `config.js`에 API 주소 입력

예:
```js
store: {
  id: "caffiend-yangdeok",
  leaderboardApi: "https://PROJECT.supabase.co/functions/v1/digul-api",
  requestTimeoutMs: 3500
}
```

**service-role key를 브라우저 코드에 넣으면 안 됩니다.**

## 파일 구조

```text
index.html
style.css
config.js
experience.js
leaderboard.js
analytics.js
game.js
assets/
  menu/
    README.md
supabase/
  migrations/
    001_rise.sql
    002_digul.sql
  functions/
    rise-api/
    digul-api/
.github/
  workflows/
    validate.yml
```

## 현장 QA 체크

- iPhone Safari / Android Chrome
- 작은 화면에서도 세로 스크롤 없이 플레이
- 손가락 이동 중 페이지 스크롤 차단
- 패널 버튼이 투하로 이어지지 않음
- 디저트 크기/식별성
- 이미지 중심과 실제 충돌 반경 정렬
- 합체 중복 지급 없음
- 연쇄 합체 정상 작동
- 일시정지 시 물리/위험선 정지
- 두 기기에서 주간 순위 동기화
- 같은 닉네임이어도 기록 분리
- 네트워크 끊김 시 OFFLINE/LOCAL 상태 정확히 표시

## 아직 필요한 운영 입력

- 실제 PNG 11종을 repo의 `assets/menu/`에 업로드
- Supabase 프로젝트 생성 및 `leaderboardApi` 연결
- 현장 기기 2대 이상 실시간 검증
- 실제 플레이 테스트로 반경/마찰/위험선 조정

## IP Boundary

이 저장소는 해커톤용 CAFFIEND 프로젝트입니다. 다른 개인/상업 프로젝트의 코드·프롬프트·브랜드 자산을 가져오지 않습니다.
