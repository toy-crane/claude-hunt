# Plan — `/ship` skill replaces GitHub Actions

## 1. Goal

Replace remote GitHub Actions deploy pipeline with a local, synchronous `/ship` skill. A solo-developer flow optimized for immediate terminal feedback — no wait, no silent failures.

### Non-goals

- No change to `/merge` skill itself (it already handles PR → merge → cleanup correctly)
- No multi-env / staging pipeline
- No automated migration rollback — out of scope; relies on expand/contract migration discipline

---

## 2. Current state

### `.github/workflows/`

| File | Trigger | Purpose | Solo value |
|------|---------|---------|------------|
| `ci.yml` | PR open/sync | typecheck + unit test | Redundant with local `/merge` checks |
| `production.yml` | push to `main` | test → `supabase db push` → Vercel deploy hook | Gate works, but async + silent-failure |
| `claude-code-review.yml` | PR open/sync | Claude auto-review | Collaboration-only; solo = self-review |
| `claude.yml` | `@claude` mentions | Interactive Claude | Collaboration-only |

### Vercel integration

- Project linked locally (`.vercel/project.json` present — gitignored)
- Vercel CLI installed globally (`/opt/homebrew/bin/vercel` v41.7.4)
- Deploys triggered today via **`VERCEL_DEPLOY_HOOK`** curl from `production.yml`
- **Unknown**: whether Vercel's native git integration (auto-deploy on push to `main`) is ALSO enabled. Must verify in dashboard.

### Supabase

- Production linked via `supabase link` (needs `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` locally for `supabase db push`)

---

## 3. Target state

```
Feature branch:
  (edit code, commit)
     ↓
  /merge  → PR → merge to main → cleanup
     ↓
  (now on main, synced with remote)
     ↓
  /ship
     ├─ verify: branch == main, clean tree, local == remote
     ├─ bun run typecheck
     ├─ bun run test:unit
     ├─ supabase db push          (prod migration)
     └─ vercel --prod             (synchronous; streams logs)
```

All four GitHub workflow files deleted. No remote automation.

---

## 4. Implementation tasks

Tasks are sequential. Each task = one commit.

### Task 1 — Create `/ship` skill config

**File**: `.claude/skills/ship/config.json` (new, tracked)

Production target identifiers live in config, separate from skill logic. Keeps `SKILL.md` generic and "what is production?" visible in one place.

```json
{
  "production": {
    "vercel": { "projectId": "prj_TpUsNVy1tlcK1PuU1vwXXp0FAiPH" },
    "supabase": { "projectRef": "sphsvgudpwjwfurkulmr" }
  }
}
```

**Security note**: both IDs are safe to commit to this public repo.
- Supabase `projectRef` is already public via `NEXT_PUBLIC_SUPABASE_URL` in the client bundle, and already appears in `artifacts/fix-production-buckets/*.md`.
- Vercel `projectId` is not cryptographically sensitive — it's an identifier, not a credential. Deploys require `VERCEL_TOKEN` which is NOT in the repo. User has explicitly accepted the mild information-disclosure of committing the project ID in exchange for the simpler design.

**Commit message**: `feat(ship): add config with production target IDs`

---

### Task 2 — Create `/ship` skill skeleton

**File**: `.claude/skills/ship/SKILL.md` (new)

**Content requirements**:
- Frontmatter: `name: ship`, `description: ...`, `user-invocable: true`
- Trigger phrases: `ship`, `배포해`, `배포해줘`, `프로덕션 배포`, `deploy to production`, `ship to prod`
- Workflow steps as numbered sections

**Preconditions (Step 1 — abort if any fail)**:
```bash
CONFIG=".claude/skills/ship/config.json"
EXPECTED_VERCEL=$(jq -r .production.vercel.projectId "$CONFIG")
EXPECTED_SUPABASE=$(jq -r .production.supabase.projectRef "$CONFIG")

# on main
[ "$(git branch --show-current)" = "main" ] || abort "not on main"

# clean tree
[ -z "$(git status --porcelain)" ] || abort "working tree is dirty"

# local == remote
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || abort "local main diverged from origin/main"

# Vercel link matches production target
[ -f .vercel/project.json ] || abort "Vercel not linked — run: vercel link"
ACTUAL_VERCEL=$(jq -r .projectId .vercel/project.json)
[ "$ACTUAL_VERCEL" = "$EXPECTED_VERCEL" ] || abort "Vercel linked to wrong project: $ACTUAL_VERCEL (expected $EXPECTED_VERCEL)"

# Supabase link matches production target
# supabase CLI stores linked project-ref under supabase/.temp/project-ref (gitignored)
ACTUAL_SUPABASE=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")
[ "$ACTUAL_SUPABASE" = "$EXPECTED_SUPABASE" ] || abort "Supabase linked to wrong project: '$ACTUAL_SUPABASE' (expected $EXPECTED_SUPABASE) — run: supabase link --project-ref $EXPECTED_SUPABASE"
```

**Why these checks**: `.vercel/project.json` is **gitignored** (confirmed — `.gitignore` contains `.vercel`), so both Vercel and Supabase link state must be re-established per clone/worktree. The config comparison catches "unlinked" and "linked to the wrong project" in the same check.

**Step 2 — safety net**:
- `bun run typecheck`
- `bun run test:unit`
- Fail fast: any non-zero exit → stop, surface output

**Step 3 — migrate production DB**:
- `supabase db push`
- Stop on failure

**Step 4 — deploy**:
- `vercel --prod`
- Stream output; capture final deploy URL

**Step 5 — report**:
- Print deployed URL
- Note: `https://www.claude-hunt.com` is the primary domain; `vercel --prod` gives the deployment URL

**Commit message**: `feat(ship): add /ship skill for local production deploy`

---

### Task 3 — Remove `production.yml`

**Why first among deletions**: this is the one that was actively doing work; removing it is the main substitution.

**Pre-delete check**: confirm the user has completed the Vercel dashboard step (see §5). Without that, deleting `production.yml` and leaving Vercel git integration on creates double-deploy OR un-migrated deploys.

**Commit message**: `chore(ci): remove production.yml — superseded by /ship skill`

---

### Task 4 — Remove `ci.yml`

The local `/ship` safety net (typecheck + test:unit) covers the same ground at ship time. Pre-merge, `/pr` (called by `/merge`) can optionally run the same checks locally — but that's a separate refinement.

**Risk to name**: PRs no longer get an independent CI signal. For solo work, acceptable; revisit if collaborators join.

**Commit message**: `chore(ci): remove ci.yml — redundant for solo workflow`

---

### Task 5 — Remove `claude-code-review.yml` and `claude.yml`

These are collaboration tools (auto-review of PRs, @-mention interactions). Solo, they have no value.

**Commit message**: `chore(ci): remove Claude GitHub Actions — no collaborators`

---

### Task 6 — Update `CLAUDE.md` (if relevant)

Check whether `CLAUDE.md` references any of the removed workflows or the old deploy flow. If yes, update the Development Workflow section to reference `/ship` instead.

**Commit message**: `docs: update deploy workflow reference to /ship`

---

## 5. External setup (user must do manually)

These cannot be automated from the repo.

### Vercel dashboard

1. Open `vercel.com → claude-hunt project → Settings → Git`
2. Either:
   - **Option A (recommended)**: disable "Production Branch" auto-deploy, keep Git connected so preview deploys for PRs still work (if desired)
   - **Option B (simplest)**: disconnect Git integration entirely — Vercel only deploys via `vercel --prod` from local
3. Verify: `VERCEL_DEPLOY_HOOK` secret in GitHub can be deleted (no longer referenced)

### GitHub secrets cleanup (optional but tidy)

After workflows are removed, these secrets are orphaned:
- `SUPABASE_ACCESS_TOKEN`
- `PRODUCTION_PROJECT_ID`
- `PRODUCTION_DB_PASSWORD`
- `VERCEL_DEPLOY_HOOK`
- `CLAUDE_CODE_OAUTH_TOKEN`

Delete or keep — no functional impact either way.

### Local env (verify before first `/ship` run)

- `supabase projects list` returns projects (CLI authenticated)
- `supabase link --project-ref sphsvgudpwjwfurkulmr` done **in the working directory where `/ship` will run** — `supabase link` state lives in `supabase/.temp/` which is gitignored, so each clone/worktree needs its own `supabase link`. The `/ship` precondition will abort with an explicit re-link command if missing.
- `vercel link` done similarly (though `.vercel/` is also gitignored — if absent, precondition will instruct to run `vercel link`)
- `vercel whoami` returns your account
- `vercel --prod` from the main repo directory deploys successfully as a one-off test

---

## 6. Testing strategy

**Principle**: Define success criteria. Loop until verified.

### Success criteria

| # | Criterion | How to prove |
|---|-----------|--------------|
| S1 | `/ship` aborts when not on `main` | Run on worktree branch → expect abort |
| S2 | `/ship` aborts with dirty tree | `touch x` → run → expect abort |
| S3 | `/ship` aborts when local diverges from remote | Make a local commit not pushed → run → expect abort |
| S4 | `/ship` aborts if `typecheck` fails | Introduce type error on main (in a throwaway branch merged to main) → run → expect abort before migration |
| S5 | `/ship` aborts if a test fails | Same pattern with a failing unit test |
| S6 | `/ship` applies pending migration and reports success | With a real (harmless) migration pending → run → verify schema change on prod |
| S7 | `/ship` produces a Vercel deploy URL | Run on a trivial content change → verify URL loads updated content |
| S8 | Removing workflows does not break Vercel | After §5 dashboard step + workflow removal, push an unrelated commit to main → verify **nothing** auto-deploys |

### Not tested (accepted risk)

- Rollback of a failed migration (out of scope)
- Concurrent `/ship` invocations (solo dev — won't happen)

---

## 7. Rollback

If `/ship` proves unreliable and we need to revert:

1. `git revert` the deletion commits for `production.yml` and `ci.yml` (Tasks 2-3)
2. Re-enable Vercel git integration in dashboard
3. Re-add deleted GitHub secrets if removed
4. `/ship` skill file can stay — it's additive and idempotent

The Claude workflows (Task 4) don't need restoration; they weren't earning their keep.

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vercel git integration left on → double-deploy | High | §5 dashboard step is **required before** deleting `production.yml` |
| `supabase db push` fails mid-migration → main has un-migrated schema | Med | Expand/contract discipline; user sees failure in terminal immediately |
| Local Vercel token expires → `/ship` fails at deploy step | Low | Re-auth with `vercel login`; fast feedback |
| Solo assumption breaks (collaborator joins) | Low | Re-introduce `ci.yml` + `claude-code-review.yml`; `/ship` remains as personal deploy command |
| `/ship` runs from wrong `.vercel` project link | Med | Precondition asserts `.vercel/project.json` → `projectId` matches expected production ID |
| `/ship` runs from wrong `supabase` project link (non-prod, unlinked) | **High** | Precondition asserts `supabase/.temp/project-ref` matches expected production ref. **`supabase/.temp/` is gitignored** — must be verified per clone/worktree |

---

## 9. Execution order summary

1. **User action first**: Vercel dashboard — disable auto-deploy from main (§5)
2. Task 1 — create `config.json` with production target IDs
3. Task 2 — create `/ship` skill SKILL.md
4. Smoke test: run `/ship` on a trivial change end-to-end (validates S6, S7 before removing the old path)
5. Task 3 — remove `production.yml`
6. Task 4 — remove `ci.yml`
7. Task 5 — remove Claude workflows
8. Task 6 — docs update
9. Verify all S1–S8 success criteria
10. `/merge` this worktree back to main
