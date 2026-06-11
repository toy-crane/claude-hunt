#!/usr/bin/env bash
#
# slack.sh — agent-loop 봇으로 Slack 에 게시·읽기·반응한다.
# 컨벤션·트리거·digest 포맷은 같은 디렉터리의 SKILL.md.
#
# 사용법:
#   slack.sh post    --channel <별칭|ID> --text <문구> [--as <이름>] [--icon <:emoji:>]
#   slack.sh reply   --channel <별칭|ID> --thread <ts> --text <문구> [--as ...] [--icon ...]
#   slack.sh react   --channel <별칭|ID> --ts <ts> --emoji <이름>
#   slack.sh replies --channel <별칭|ID> --thread <ts>
#   slack.sh history --channel <별칭|ID> [--limit <N>]
#
# post·reply 는 성공 시 메시지 ts 한 줄을 stdout 에 찍는다 (스레드 구성용).
# replies·history 는 메시지 배열 JSON 을 찍는다.
set -euo pipefail

die() { echo "slack.sh: $*" >&2; exit 1; }
command -v jq   >/dev/null || die "jq 가 필요합니다"
command -v curl >/dev/null || die "curl 이 필요합니다"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- 토큰: $SLACK_BOT_TOKEN → 상위 디렉터리의 .env.local ---
# 워크트리에도 .env.local 이 복사되지만 토큰은 없을 수 있다. 토큰이 든 파일을 만날 때까지 올라간다.
find_env() {
  local d="$1"
  while [ "$d" != "/" ]; do
    if [ -f "$d/.env.local" ] && grep -q '^SLACK_BOT_TOKEN=' "$d/.env.local"; then
      echo "$d/.env.local"; return 0
    fi
    d="$(dirname "$d")"
  done
  return 1
}
TOKEN="${SLACK_BOT_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  ENV_FILE="$(find_env "$SCRIPT_DIR" || true)"
  [ -n "$ENV_FILE" ] || die "토큰을 못 찾음: \$SLACK_BOT_TOKEN 없음, 상위 .env.local 어디에도 SLACK_BOT_TOKEN 없음"
  TOKEN="$(grep -E '^SLACK_BOT_TOKEN=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
fi
[ -n "$TOKEN" ] || die "SLACK_BOT_TOKEN 이 비어 있음"

# --- 채널 별칭 → ID ---
channel_id() {
  case "$1" in
    playbook) echo "C0BA08C0NPN" ;;
    hunt)     echo "C0B9WKMAL8J" ;;
    C*)       echo "$1" ;;
    *)        echo "" ;;
  esac
}
# 아이콘 기본값 없음: 앱 아바타(Display Information 의 App icon)가 보인다. --icon 으로만 덮어쓴다.
default_as() { case "$1" in hunt) echo "hunt loop" ;; *) echo "playbook loop" ;; esac; }

api_post() {
  # api_post <method> <json-payload>
  curl -sS -X POST "https://slack.com/api/$1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary "$2"
}
api_get() {
  # api_get <method> <urlencoded-field>...
  local method="$1"; shift
  curl -sS -G "https://slack.com/api/$method" \
    -H "Authorization: Bearer $TOKEN" "$@"
}

cmd="${1:-}"; shift || true

CHANNEL=""; TEXT=""; THREAD=""; TS=""; EMOJI=""; AS=""; ICON=""; LIMIT="30"
while [ $# -gt 0 ]; do
  case "$1" in
    --channel) CHANNEL="$2"; shift 2 ;;
    --text)    TEXT="$2";    shift 2 ;;
    --thread)  THREAD="$2";  shift 2 ;;
    --ts)      TS="$2";      shift 2 ;;
    --emoji)   EMOJI="$2";   shift 2 ;;
    --as)      AS="$2";      shift 2 ;;
    --icon)    ICON="$2";    shift 2 ;;
    --limit)   LIMIT="$2";   shift 2 ;;
    *) die "알 수 없는 플래그: $1" ;;
  esac
done

[ -n "$CHANNEL" ] || die "--channel 필요 (playbook|hunt|C... ID)"
CH="$(channel_id "$CHANNEL")"
[ -n "$CH" ] || die "알 수 없는 채널: $CHANNEL"
[ -n "$AS" ] || AS="$(default_as "$CHANNEL")"

require_ok() {
  # require_ok <응답json> <동작이름> [성공취급할에러]
  local resp="$1" what="$2" allow="${3:-}"
  local ok err
  ok="$(echo "$resp" | jq -r '.ok')"
  if [ "$ok" != "true" ]; then
    err="$(echo "$resp" | jq -r '.error // "unknown"')"
    [ -n "$allow" ] && [ "$err" = "$allow" ] && return 0
    die "$what 실패: $err"
  fi
}

case "$cmd" in
  post)
    [ -n "$TEXT" ] || die "--text 필요"
    payload="$(jq -n --arg ch "$CH" --arg t "$TEXT" --arg u "$AS" --arg i "$ICON" \
      '{channel:$ch, text:$t, username:$u} + (if $i != "" then {icon_emoji:$i} else {} end)')"
    resp="$(api_post chat.postMessage "$payload")"
    require_ok "$resp" post
    echo "$resp" | jq -r '.ts'
    ;;
  reply)
    [ -n "$TEXT" ]   || die "--text 필요"
    [ -n "$THREAD" ] || die "--thread 필요"
    payload="$(jq -n --arg ch "$CH" --arg t "$TEXT" --arg u "$AS" --arg i "$ICON" --arg tt "$THREAD" \
      '{channel:$ch, text:$t, username:$u, thread_ts:$tt} + (if $i != "" then {icon_emoji:$i} else {} end)')"
    resp="$(api_post chat.postMessage "$payload")"
    require_ok "$resp" reply
    echo "$resp" | jq -r '.ts'
    ;;
  react)
    [ -n "$TS" ]    || die "--ts 필요"
    [ -n "$EMOJI" ] || die "--emoji 필요"
    payload="$(jq -n --arg ch "$CH" --arg ts "$TS" --arg n "$EMOJI" \
      '{channel:$ch, timestamp:$ts, name:$n}')"
    resp="$(api_post reactions.add "$payload")"
    require_ok "$resp" react already_reacted
    echo "ok"
    ;;
  replies)
    [ -n "$THREAD" ] || die "--thread 필요"
    resp="$(api_get conversations.replies --data-urlencode "channel=$CH" --data-urlencode "ts=$THREAD")"
    require_ok "$resp" replies
    echo "$resp" | jq '[.messages[] | {ts, user: (.user // .bot_id), bot: (has("bot_id")), text, reactions: [((.reactions // [])[]) | {name, users}]}]'
    ;;
  history)
    resp="$(api_get conversations.history --data-urlencode "channel=$CH" --data-urlencode "limit=$LIMIT")"
    require_ok "$resp" history
    echo "$resp" | jq '[.messages[] | {ts, user: (.user // .bot_id), bot: (has("bot_id")), text, thread_ts, reply_count: (.reply_count // 0), reactions: [((.reactions // [])[]) | {name, users}]}]'
    ;;
  ""|-h|--help|help)
    sed -n '3,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    die "알 수 없는 명령: $cmd (post|reply|react|replies|history)"
    ;;
esac
