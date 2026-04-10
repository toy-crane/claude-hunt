# <Feature> Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|

## Data Model

### EntityName
- field (required)
- field → RelatedEntity[]

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|

Change Type: New | Modify | Delete

## Tasks

### Task 1: (Title — one vertical slice, no "and")

- **Scenarios**: FEATURE-XXX, FEATURE-YYY
- **Size**: S (1-2 files) | M (3-5 files)
- **Dependencies**: None | Task N (reason), Task M (reason)
- **References**:
  - (skill name — keywords)
  - (external document URL)
  - (project file path)
- **Implementation targets**:
  - `file/path.tsx`
  - `tests/path/test.tsx`
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] FEATURE-XXX: `{ input }` → `{ expect }`
  - [ ] FEATURE-YYY: `{ input }` → `{ expect }`
- **Verification**:
  - `bun run test -- --grep "feature"`
  - `bun run build`

---

### Checkpoint: After Tasks 1-N
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] (vertical slice description) works end-to-end

---

## Undecided Items
