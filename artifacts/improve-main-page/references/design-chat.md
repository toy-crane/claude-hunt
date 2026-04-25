# 메인 페이지 개선안

_Started 2026-04-24 06:33 UTC_

---

## User

메인 페이지 개선하고 싶어 안 3가지 제시해줘

## Assistant

메인 페이지를 개선하는 3가지 안을 제시하기 위해, 먼저 현재 메인 페이지를 살펴보고 디자인 시스템의 컴포넌트를 확인할게요.

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

Let me look at the key components to understand the existing design, and also check what the current main page looks like.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

현재 메인 페이지를 잘 이해했어요. claude-hunt.com은 Product Hunt 스타일의 한국어 프로젝트 보드죠. 현재 구조는 단순한 그리드 + 코호트 필터뿐이라서, 개선할 여지가 많이 보여요.

3가지 방향을 서로 다른 축으로 잡아서 디자인 캔버스로 나란히 보여드릴게요:

**🅰️ "Today's Hunt" — 히어로 + 오늘의 1등 강조**
상단에 오늘 1등 프로젝트를 크게 featured로 띄우고, 나머지는 기존 그리드. Product Hunt의 정석. 오늘 뭘 볼지 명확해짐.

**🅱️ "Terminal Board" — 랭킹 리스트 뷰 (터미널 스타일)**
Claude Hunt의 `>_` 터미널 DNA를 극단까지. 카드 그리드 대신 번호 매긴 리스트(1위부터 순위별로). 밀도 높고 스캔하기 쉬움. `ls -la` 같은 느낌.

**🅲️ "Live Activity" — 실시간 피드 + 사이드바**
메인에 그리드 + 오른쪽 사이드바에 "방금 투표", "방금 제출됨" 라이브 활동 피드. 코호트 통계, 주간 탑 기여자도 함께. 커뮤니티 바이브 강조.

세 안 모두 동일한 디자인 시스템(모노크롬, 테라코타 악센트, JetBrains Mono 헤딩, 각진 모서리) 안에서 작업해요. 디자인 캔버스에 나란히 배치해서 비교하실 수 있게 할게요.

_[tool: update_todos]_

_[tool: copy_files]_

_[tool: copy_starter_component]_

Now let me build the shared data + three option components.

_[tool: write_file]_

Now let me build Option A — Today's Hunt (hero + grid):

_[tool: write_file]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: snip]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: snip]_

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

디자인 캔버스에 3가지 안을 나란히 올려뒀어요. 각 아트보드는 드래그로 순서 바꾸거나, 클릭해서 풀스크린으로 볼 수 있어요.

**세 안 비교**

| 축 | A · Today's Hunt | B · Terminal Board | C · Live Activity |
|---|---|---|---|
| 레이아웃 | 히어로 + 그리드 | 밀도 높은 테이블 | 그리드 + 사이드바 |
| 핵심 감정 | "오늘 뭐 볼지 명확" | "터미널 유틸 바이브" | "커뮤니티가 살아있다" |
| 시그니처 | Featured 카드 + Top 3 strip | `$ claude-hunt ls` 프롬프트 | 실시간 피드 + Top Hunters |
| 밀도 | 낮음 (3열) | 매우 높음 (리스트) | 중간 (2열 + 사이드) |
| 기존 대비 강점 | 1등 프로젝트가 숨 쉴 공간 | 정보를 한눈에, 빠른 스캔 | 머무르게 만드는 사회적 신호 |

셋 다 디자인 시스템 규칙(모노크롬, 터라코타 악센트 `>_`만, 각진 모서리, JetBrains Mono 헤딩)을 지켰어요.

**다음 단계 제안**
- 한 방향을 정해서 디테일(빈 상태, 다크모드, 모바일 반응형, 인터랙션)까지 밀어붙이거나
- 두 안을 섞어서 하이브리드 만들 수도 있어요 (예: A의 히어로 + C의 라이브 피드)

어느 안이 가장 와닿으세요?

## User

B로 진행하고 싶은데, 자세히 이야기 해보자.

## Assistant

_[tool: snip]_

B안 ("Terminal Board") 좋은 선택이에요. 이 방향이 claude-hunt의 DNA와 가장 잘 맞아요 — 개발자들을 위한 터미널 바이브, 밀도 높은 정보, `>_` 프롬프트의 연장선.

더 깊이 파고들기 전에 몇 가지 방향을 정하고 싶어서 질문 몇 개 드릴게요. 그래야 한 번에 제대로 만들 수 있어요.

_[tool: questions_v2]_

## User

Questions answered:
- terminal_intensity: 진하게 — 전체 페이지가 터미널 창처럼, ANSI 컬러, 배경도 어두운 IDE 느낌
- dark_mode_priority: 이미 토글이 지원되고 있음 현재 페이지 확인
- row_info: 순위 번호, 썸네일 (작게), 프로젝트 이름, 한 줄 소개, 작성자, 투표 수 + 버튼
- interactions: 행 hover 시 세부정보 프리뷰 (썸네일 확대 등)
- top_three_treatment: 색상 dot만 (현재안처럼 미니멀)
- filter_style: 현재처럼 버튼 칩 가로로 배치
- empty_hero: 현재처럼 bash 창 헤더 (신호등 dot + 커맨드 라인)
- submit_placement: 헤더 우측 (일반적)
- novel_ideas: ASCII 막대 그래프로 투표 수 시각화 (행 옆에 `████░░`), 블링커 커서가 현재 선택된 행 옆에 따라다님, 행에 hover하면 상단 statusline에 파일 경로처럼 정보 표시
- scope: 메인 + 모바일 반응형

## Assistant

_[tool: snip]_

_[tool: update_todos]_

<cursor: I'll build this as a full-bleed terminal-themed page with all the requested features.>

_[tool: snip]_

<cursor: Let me build the terminal board v2 with all the requested features. I'll need to plan the ANSI color palette, ASCII vote bars, blinking cursor on selected row, statusline hover, and mobile responsive. Since this is now a focused standalone experience, I'll build it as a dedicated page rather than inside the canvas.>

_[tool: write_file]_

## Assistant

Let me build the Terminal Board v2. I'll create a standalone page with the dark IDE feel as the default, with light toggle, ASCII vote bars, blinking cursor, hover statusline, thumbnail preview, and mobile responsive.

_[tool: write_file]_

<cursor>

_[tool: snip]_

_[tool: write_file]_

<cursor>

_[tool: snip]_

_[tool: done]_

<cursor>

_[tool: fork_verifier_agent]_

<cursor>

_[tool: snip]_

B v2 "Terminal Board" 완성했어요. 요청하신 모든 요소 들어갔어요:

**터미널 메타포 극대화**
- 전체 페이지가 IDE 다크 톤 (`#0d1117` 배경) — 라이트 토글도 지원
- bash 창 헤더에 신호등 dot + 실시간 시계 + 실제 터미널 프롬프트 (`toycrane@claude-hunt:~$`)
- ANSI 컬러로 커맨드 토큰 구분 (`--sort`=yellow, `votes`=green, 카테고리별 컬러 태그)
- 커서가 H1 옆에서, 그리고 EOL `$ submit_` 옆에서 깜빡임

**ASCII 막대 그래프**
- 각 행에 `████████░░` + 퍼센트 (최고 득표 대비)
- 순위에 따라 바 컬러 변화 (1-3위는 rank 컬러, 나머지는 ANSI green)

**블링커 커서가 따라다님**
- 마우스가 올라간 행 좌측에 `▸` 터라코타 화살표가 깜빡이며 나타남
- 해당 행 배경도 살짝 밝아짐 (vim 현재 라인 하이라이트 느낌)

**hover 시 statusline 업데이트**
- 하단 고정 statusline에 vim-style 모드 뱃지 (`NORMAL` / `VIEW`)
- 파일 경로 형태로 표시: `~/claude-hunt/c1/김개발/코딩_학습_트래커.md`
- 투표/태그/시간 메타 + 실시간 시계

**썸네일 확대 프리뷰**
- hover 시 썸네일이 1.8배로 확대되어 오른쪽으로 커짐 (다른 행을 가리지 않게)

**모바일 반응형 (< 720px)**
- 테이블 대신 스택 카드 형태
- 작은 썸네일 + 제목/태그 + 작성자/시간 + ASCII 바 + 세로 투표 버튼
- 헤더 간소화, statusline은 시계만

다음에 뭘 더 해볼 수 있을까요?
- 키보드 네비게이션 (j/k, ↑↓, Enter)
- `--help` 모달 / 단축키 치트시트
- 프로젝트 상세 페이지 (man page 스타일)
- 빈 상태 / 투표 결과 없음 상태
- 실시간 새 제출 알림 (`NEW` 태그가 잠깐 깜빡)

## User

Verifier agent check completed

## Assistant

<cursor>

_[tool: snip]_

Terminal Board v2 완성돼서 미리보기 패널에 열려있어요. 다크/라이트 토글, ASCII 막대 그래프, hover 시 `▸` 깜빡 커서, 파일 경로 statusline, 모바일 반응형까지 다 들어갔어요.

계속 발전시키고 싶은 방향 있으세요? 제안 몇 개:

1. **키보드 네비게이션** — j/k, ↑↓로 행 이동, Enter로 열기, `/`로 검색
2. **`--help` 모달** — 단축키 치트시트 (실제 man page 스타일)
3. **프로젝트 상세 페이지** — 클릭하면 man page 형태로 확장
4. **빈 상태 / 로딩 상태** — `no matches found`, ASCII 스피너 등
5. **실시간 새 제출 피드** — 리스트 맨 위에 `[NEW]` 태그가 잠깐 깜빡였다가 사라짐
6. **세부 마이크로 인터랙션** — 투표 시 숫자 카운트 애니메이션, 추가 사운드 hint 등

어느 쪽으로 갈까요?

## User

지금 전체적으로 너무 정신이 없고, 미니멀한 스타일로 바꿔야 해.
어떤것을 뺄수 있는지 고민해봐

## Assistant

<cursor>

_[tool: snip]_

_[tool: read_file]_

맞아요, 지금 너무 과해요. 제가 "터미널 메타포 극대화"에 취해서 미니멀리즘 원칙을 놓쳤네요. 정리해볼게요.

**뺄 수 있는 것들 (우선순위 높음 → 낮음)**

1. **ANSI 무지개 컬러** — 커맨드 라인의 yellow/green/blue/cyan 토큰, 태그별 5가지 색. 디자인 시스템 원칙상 `>_`의 터라코타만 유일한 색이어야 해요. 전부 단색(fg/dim)으로.

2. **bash 신호등 dot (🔴🟡🟢)** — 장식일 뿐. 창 크기/시간/사용자명 문자열도 과해요.

3. **ASCII 막대 그래프 + 퍼센트** — 투표 수 숫자가 이미 있는데 중복 시각화. 스캔을 더 어렵게 만들어요.

4. **하단 statusline 전체** — vim 흉내지만 hover 상태를 이미 행 배경 변화로 보여주고 있어요. 중복이고 주의 분산.

5. **실시간 시계** — 기능적 가치 0.

6. **`▸` 깜빡 커서** — 행 배경 하이라이트만으로 충분.

7. **터라코타 blinking 커서 3개** (H1 옆, `$ submit_` 옆, statusline) → 브랜드 wordmark `>_`에서만.

8. **EOL 프롬프트 `$ claude-hunt submit #...`** — 헤더 제출 버튼과 중복.

9. **H1 아래 서브타이틀 "마음에 드는 프로젝트에..."** — 바로 위 `> found 9 projects...`와 정보가 겹침.

10. **카테고리별 태그 컬러** — `[개발도구]` 같은 라벨은 유지하되 모두 dim 색으로.

11. **헤더의 "— 함께 배우는 사람들의 프로젝트"** — wordmark 옆 tagline. 필수 아님.

**남길 핵심 (이게 터미널 보드의 본질)**
- 등간격 모노스페이스 테이블
- 순위 번호 + 작은 rank dot (1-3위만)
- 작은 썸네일, 제목, 한 줄 소개, 작성자, 투표 버튼
- `$ claude-hunt ls --sort=votes` 프롬프트 **한 줄** (장식 아닌 '뭘 보고 있는지' 정보)
- 필터 칩 가로 배치
- hover = 행 배경 살짝 변화 + 썸네일 확대 (이건 기능적이라 유지)
- 라이트/다크 토글

어떻게 정리할까요 — 제가 제시한 1~11번 중 **전부 빼도 괜찮은 것**과 **남기고 싶은 것** 알려주시면 바로 v3로 만들게요. 아니면 "1-9 전부 제거, 10-11은 유지" 같이 일괄로 말씀해주셔도 돼요.

## User

너가 이야기한 대로 진행

## Assistant

<cursor>

_[tool: snip]_

<cursor>

_[tool: write_file]_

<cursor>

_[tool: snip]_

_[tool: done]_

<cursor>

_[tool: snip]_

미니멀하게 정리했어요. 뺀 것들:

- ANSI 무지개 컬러 전부 (커맨드 토큰, 태그별 색)
- bash 신호등 + 창 이름 + 실시간 시계
- ASCII 막대 그래프 + 퍼센트
- 하단 statusline 전체
- 행의 `▸` 깜빡 커서 (배경 변화로 충분)
- EOL `$ submit_` 프롬프트 (헤더 버튼과 중복)
- H1 옆 깜빡 커서 (wordmark `_`에서만)
- "함께 배우는 사람들의 프로젝트" 헤더 부제
- VOTES 컬럼에 있던 `▓▓▓░░` 아스키 장식

남긴 것들:
- 등간격 모노스페이스 테이블
- 순위 dot (1-3위만)
- 작은 썸네일 + hover 시 확대 (기능적)
- 행 hover 배경 변화
- 단일 프롬프트 라인 `$ claude-hunt ls --sort=votes`
- 필터 칩
- 다크/라이트 토글, 모바일 반응형

훨씬 조용해졌을 거예요. 확인해보시고 더 덜어낼 부분 있으면 알려주세요.

## User

그리고 현재 페이지의 구성을 따르지 않는 것 같은데, 현재 페이지도 참고해봐 

그리고 지금 필터는 클래스 밖에 안되고, tag는 없어.

## Assistant

<cursor>

_[tool: snip]_

_[tool: view_image]_

<cursor>

_[tool: snip]_

<cursor>

현재 페이지를 보니 제가 놓친 게 많네요:

**현재 페이지 실제 구조**
- 헤더: wordmark 좌, 계정 아바타 "테" 우 (테마 토글은 아바타 클릭 드롭다운 안에)
- 제목 "프로젝트 보드" + 서브 "마음에 드는 프로젝트에 응원을 보내주세요." (왼쪽 정렬, 단일 프롬프트 라인 없음)
- 우측에 "프로젝트 제출" 버튼 + "모든 클래스" 드롭다운 (세로로 쌓임)
- **카드 그리드** (3열) — 리스트가 아니라 카드!
- 필터는 **클래스(Cohort) 드롭다운만** — 태그 칩 없음
- 각 카드에 순위 뱃지 "1st" "2nd" "3rd" (top 3만)
- 카드에 썸네일 + 제목 + 두 줄 소개 + 작성자 + 투표 버튼

제가 리스트 뷰로 갔지만, 사용자는 원래 카드 그리드를 **터미널 스타일로 개선**하고 싶으신 거였네요. 그리고 태그는 실제로 없는 필드라 제가 임의로 만든 거였어요.

수정해야 할 것:
1. 리스트 → **카드 그리드** 복원 (현재 페이지 구조 유지)
2. 태그 칩/필터 전부 제거, **클래스 드롭다운만**
3. 테마 토글은 아바타 드롭다운 안으로
4. "프로젝트 제출" + 클래스 드롭다운 우측 정렬 영역
5. 단일 프롬프트 라인 `$ claude-hunt ls...` 도 제거 (현재 페이지엔 없음)
6. 터미널 메타포는 **다크 테마 톤, 모노스페이스 타이포, 각진 모서리, ranking dot**로만 미묘하게

즉, 이건 "리스트로 리디자인"이 아니라 **"기존 카드 그리드를 터미널 감성으로 리파인"** 이 돼야 해요. 이 방향으로 다시 만들까요? 확인해주시면 바로 진행할게요.

## User

아니, 헤더랑 footer는 그대로 유지하라는거고, 나머지는 너가 작성한 디자인 대로 할꺼야. 그리고 지금 Preview 확대가 너무 큰데 그것도 수정해줘

## Assistant

<cursor>

_[tool: snip]_

_[tool: str_replace_edit]_

<cursor>

_[tool: snip]_

_[tool: done]_

<cursor>

_[tool: snip]_

수정했어요:

- **헤더**: 현재 사이트처럼 wordmark + "테" 아바타 (드롭다운 안에 라이트/다크/설정/로그아웃)
- **푸터**: © 2026 claude-hunt, 이용약관, 개인정보, GitHub, Feedback, Built by toycrane — 원본 구조 그대로
- **썸네일 확대**: 1.8배 → 1.08배로 자연스럽게

본문(리스트 테이블, 필터 칩, 프롬프트 라인)은 그대로 유지했어요.

## User

tag 개념이 없기 때문에, 필터에서 삭제해야 되고, 이름에서도 삭제 해야돼
그리고 프로젝트 제출 버튼이 없는데 어디에 두려고 하는거지?

## Assistant

<cursor>

_[tool: snip]_

_[tool: read_file]_

<cursor>

_[tool: snip]_

_[tool: grep]_

_[tool: grep]_

<cursor>

_[tool: read_file]_

<cursor>

_[tool: snip]_

_[tool: str_replace_edit]_

이제 "프로젝트 제출" 버튼 위치 질문에 답할게요.

**맞아요, 제가 이전에 제출 버튼을 아예 빼버렸네요.** 원래 사이트엔 h1 제목 우측에 "프로젝트 제출" 버튼이 있었는데, 헤더를 원본과 맞추면서 헤더에서 뺀 뒤 본문에도 다시 넣지 않았어요.

터미널 보드에도 복원해야 해요. 두 가지 옵션:

**A. 원본과 동일한 위치** — h1 "프로젝트 보드" 우측에 primary 버튼
```
프로젝트 보드                    [ 프로젝트 제출 ]
24개 프로젝트 · 마음에 드는 곳에...
```

**B. 프롬프트 라인 우측** — 필터 칩 라인에 함께 배치
```
[ 모든 클래스 ] [ Cohort 1 ] [ Cohort 2 ]      [ + 제출 ]
```

원본에 맞추는 A가 자연스러워요. A로 진행할까요? 아니면 B?

## User

A


$ claude-hunt ls --sort=votes 필터에 따라 이 이름도 바뀌어야 하는거 아닌가?

## Assistant

<cursor>

맞아요, 필터 바뀌면 프롬프트 명령어도 바뀌어야 실제 터미널답죠. 두 가지 다 반영할게요:

- `$ claude-hunt ls --sort=votes` (전체)
- `$ claude-hunt ls --cohort=1 --sort=votes` (Cohort 1)
- `$ claude-hunt ls --cohort=2 --sort=votes` (Cohort 2)

_[tool: str_replace_edit]_

<cursor>

_[tool: snip]_

_[tool: done]_

<cursor>

_[tool: snip]_

반영했어요:

- **태그 제거**: 프로젝트 이름 옆 `[개발도구]` 같은 칩 삭제, 필터에서도 태그 옵션 제거 (이제 `모든 클래스 / Cohort 1 / Cohort 2`만)
- **프로젝트 제출 버튼**: 원본처럼 h1 "프로젝트 보드" 우측에 primary 버튼으로 복원
- **프롬프트 라인 동적**: 필터 바뀌면 명령어도 반영
  - 전체: `$ claude-hunt ls --sort=votes`
  - Cohort 1: `$ claude-hunt ls --cohort=1 --sort=votes`
  - Cohort 2: `$ claude-hunt ls --cohort=2 --sort=votes`

