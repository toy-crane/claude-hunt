# OG Image 옵션 검토

_Started 2026-04-24 02:32 UTC_

---

## User

Og Image 디자인 개선하고 싶은데 3가지 옵션 제시해줘

## Assistant

I'll explore the design system and current OG image first, then create 3 improved options.

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: local_ls]_

Let me look at the current OG image implementation.

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

I understand the current OG image — a big wordmark + tagline + URL on white. Clean but a bit static. Let me design 3 distinct improvement directions, all faithful to the terminal/monochrome system with the terracotta accent.

My plan — 3 options on a design canvas, each at 1200×630 (actual OG dimensions):

1. **Terminal Session** — Renders the OG like an actual shell session with prompt, typed command, and ASCII output listing real project cards. Most "on-brand" to the terminal vibe.
2. **Project Grid Peek** — The wordmark sits left, with a tilted/faded preview of actual project cards on the right. Shows rather than tells what the site is.
3. **Typographic Statement** — Huge Korean tagline as the hero ("함께 배우는 사람들의 프로젝트"), wordmark demoted to corner. More editorial/poster, Korean-first.

_[tool: copy_starter_component]_

_[tool: read_file]_

Now let me build the OG image design canvas with 3 options.

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

Need to copy the CSS into this project instead of cross-project referencing.

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

OG 이미지 3가지 방향을 canvas에 올려뒀어요 (모두 실제 OG 사이즈 1200×630):

1. **Terminal Session** — 실제 쉘 세션처럼 연출. 창 크롬 + `$ cat README.md` + 거대한 wordmark + 상위 프로젝트 ASCII 리스트. 터미널 DNA에 가장 충실.
2. **Grid Peek** — 좌측에 wordmark와 태그라인, 우측에 실제 프로젝트 카드들이 기울어져 fade-out. "이 사이트가 뭔지" 보여주는 방향.
3. **Korean Statement** — "함께 배우는 / 사람들의 프로젝트_"를 96px 히어로 타이포로. wordmark는 코너로 후퇴, 하단에 프로젝트/코호트/투표 수 스탯. 한국어 우선 에디토리얼.

비교를 위해 **Current**도 맨 앞에 함께 뒀어요. 좋아하는 방향 알려주시면 다듬거나 섞어볼게요.

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

오버플로우를 잡았어요 — 세 옵션 모두 이제 정확히 1200×630에 맞게 들어갑니다. 선호하는 방향 알려주시면 세부를 다듬을게요.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

The verifier call itself failed with a 502 (infrastructure hiccup, unrelated to the design). The three options are already fixed and fit within 1200×630. Let me know which direction you'd like to refine.

## User

영어는 사용하지 말고 한글로 사용해줘
그리고 실제 웹페이지 스크린샷이 필요하면 직접가서 찍어. 스크린샷에 이미지가 없으니 어색해.
필요하다면 나에게 요청해도 돼.

## Assistant

_[tool: snip]_

알겠습니다. claude-hunt.com에 직접 가서 실제 프로젝트 스크린샷을 찍고, 모든 카피를 한글로 바꿀게요.

_[tool: web_fetch]_

## User

다한건가? 뭐해?

## Assistant

_[tool: snip]_

아직 작업 중이에요. 실제 프로젝트 스크린샷을 가져와서 카피도 한글로 고칠게요.

_[tool: run_script]_

_[tool: snip]_

Now let me rewrite the OG designs with real screenshots and all Korean copy.

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

업데이트 완료했어요:

- **실제 프로젝트 스크린샷 9개** 를 claude-hunt.com에서 직접 가져와 `screenshots/` 에 넣고 옵션 2·3에 사용
- **모든 카피 한글화** — "Discover what…" → "함께 배우는 사람들의 프로젝트", "projects/cohorts/votes" → "프로젝트/코호트/추천", 랭크 뱃지 표기도 "1위" 식으로
- 실제 1~3위 프로젝트(시장 리포트, 포켓몬 마스터 퀴즈, Vocabulary Builder)가 썸네일로 그대로 보이게 구성

어떤 방향이 가장 마음에 드시는지 알려주시면 디테일 다듬을게요.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

줄바꿈 이슈 모두 수정했어요. 세 옵션 모두 wordmark에 `nowrap`을 걸었고, 메타/푸터/스탯 영역도 깨지지 않게 조정했습니다. 어떤 방향이 좋으신지 알려주세요.

## User

옵션 2번이 좋은데, 여기서 프로젝트 숫자와 코호트 숫자는 삭제 해줘.
혹 다른 내용으로 채울만한게 있을까?

## Assistant

_[tool: snip]_

좋아요, 옵션 2에서 스탯을 빼고 대신 다른 요소를 채워볼게요. 몇 가지 아이디어:

**A. 터미널 프롬프트 CTA** — 메타 자리에 `$ 지금 프로젝트를 공유해 보세요 ▸` 같은 프롬프트 형태 한 줄. 터미널 DNA에 충실.

**B. 상위 3개 프로젝트 티저** — "지금 인기: 시장 리포트 · 포켓몬 퀴즈 · Vocabulary Builder" 처럼 실제 탑 3 이름을 텍스트로 노출. 콘텐츠가 살아있음을 암시.

**C. 최근 업데이트 타임스탬프** — `last updated · 방금 전` / `새 프로젝트 2개` 같은 "살아있는 사이트" 느낌.

**D. CTA 버튼 시각화** — 실제 사이트 "프로젝트 제출" CTA 스타일의 작은 버튼을 그대로 박기.

셋 다 보여드릴게요. 옵션 2를 3가지 변형으로 분기해서 canvas에 추가합니다.

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

옵션 2의 하단 숫자 스탯을 제거하고 그 자리에 3가지 변형을 만들었어요. 맨 위 섹션에서 바로 비교할 수 있습니다:

- **2A · 프롬프트 CTA** — `$ 프로젝트를 공유해 보세요_` 터미널 느낌. 사이트 DNA와 제일 일관됨.
- **2B · 인기 프로젝트 티저** — 실제 탑 3 이름(시장 리포트 · 포켓몬 마스터 퀴즈 · Vocabulary Builder)을 골드/실버/브론즈 점과 함께 텍스트로. 콘텐츠가 살아있다는 신호.
- **2C · 제출 버튼** — 사이트의 "프로젝트 제출" CTA를 그대로. 행동 유도가 가장 직접적.

셋 중 **2B(인기 프로젝트 티저)** 를 개인적으로 제일 추천해요 — OG는 링크 미리보기라 "뭘 할 수 있는가"보다 "뭐가 있는가"를 보여주는 게 클릭률에 유리하고, 실제 사이트가 살아있다는 사회적 증거 역할도 합니다.

어떤 방향이 마음에 드세요?

_[tool: snip]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

_[tool: snip]_

<response to user's last turn — they haven't sent a new message since the verifier was forked, so I'll just wait>

## User

2B로 확정하자.

## Assistant

_[tool: snip]_

<response to user — 2B 확정>

_[tool: snip]_

_[tool: read_file]_

<response to user — build final 2B-only file>

_[tool: snip]_

<response>

_[tool: copy_files]_

<response>

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: register_assets]_

<response>

_[tool: snip]_

_[tool: done]_

<response>

_[tool: snip]_

2B로 확정해서 `og-image-final.html` 로 내보냈어요. 실제 코드에 반영하실 때는 `app/opengraph-image.tsx` 의 텍스트/레이아웃을 이 디자인 기준으로 교체하시면 됩니다. 추가로 다듬을 부분 있으면 말씀해주세요.

