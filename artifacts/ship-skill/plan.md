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

- Project linked (`.vercel/project.json` present)
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

### Task 1 — Create `/ship` skill skeleton

**File**: `.claude/skills/ship/SKILL.md` (new)

**Content requirements**:
- Frontmatter: `name: ship`, `description: ...`, `user-invocable: true`
- Trigger phrases: `ship`, `배포해`, `배포해줘`, `프로덕션 배포`, `deploy to production`, `ship to prod`
- Workflow steps as numbered sections

**Preconditions (Step 1 — abort if any fail)**:
```bash
# on main
[ "$(git branch --show-current)" = "main" ] || abort

# clean tree
[ -z "$(git status --porcelain)" ] || abort

# local == remote
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || abort
```

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

### Task 2 — Remove `production.yml`

**Why first among deletions**: this is the one that was actively doing work; removing it is the main substitution.

**Pre-delete check**: confirm the user has completed the Vercel dashboard step (see §5). Without that, deleting `production.yml` and leaving Vercel git integration on creates double-deploy OR un-migrated deploys.

**Commit message**: `chore(ci): remove production.yml — superseded by /ship skill`

---

### Task 3 — Remove `ci.yml`

The local `/ship` safety net (typecheck + test:unit) covers the same ground at ship time. Pre-merge, `/pr` (called by `/merge`) can optionally run the same checks locally — but that's a separate refinement.

**Risk to name**: PRs no longer get an independent CI signal. For solo work, acceptable; revisit if collaborators join.

**Commit message**: `chore(ci): remove ci.yml — redundant for solo workflow`

---

### Task 4 — Remove `claude-code-review.yml` and `claude.yml`

These are collaboration tools (auto-review of PRs, @-mention interactions). Solo, they have no value.

**Commit message**: `chore(ci): remove Claude GitHub Actions — no collaborators`

---

### Task 5 — Update `CLAUDE.md` (if relevant)

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
- `supabase link --project-ref <prod-ref>` done for this worktree (the `.claude/worktrees/feat/ship-skill/` directory may need its own link — `supabase link` state lives in `supabase/.temp/` which is gitignored)
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
| `/ship` runs from wrong `.vercel` project link | Med | `vercel --prod` reads `.vercel/project.json` — verify in preconditions |

---

## 9. Execution order summary

1. **User action first**: Vercel dashboard — disable auto-deploy from main (§5)
2. Task 1 — create `/ship` skill
3. Smoke test: run `/ship` on a trivial change end-to-end (validates S6, S7 before removing the old path)
4. Task 2 — remove `production.yml`
5. Task 3 — remove `ci.yml`
6. Task 4 — remove Claude workflows
7. Task 5 — docs update
8. Verify all S1–S8 success criteria
9. `/merge` this worktree back to main
