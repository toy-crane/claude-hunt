#!/bin/bash
# agent-skills session start hook
# Injects the using-agent-skills meta-skill into every new session

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
META_SKILL="$PROJECT_ROOT/.claude/skills/using-agent-skills/SKILL.md"

if [ -f "$META_SKILL" ]; then
  CONTENT=$(cat "$META_SKILL")
  # Output as JSON for Claude Code hook consumption
  cat <<EOF
{
  "priority": "IMPORTANT",
  "message": "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.\n\n$CONTENT"
}
EOF
else
  echo '{"priority": "INFO", "message": "agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually."}'
fi
