# Participation and Identity

## Decisions

- Anyone may browse projects, recommendation counts, comments, and reactions without signing in.
- Writing requires authentication. A user may change or delete only their own profile, projects, comments, reactions, and recommendations.
- A newly signed-in user must deliberately choose a display name and selectable class before entering authenticated product surfaces. There is no skip path.
- Display names are unique after trimming and case-folding, while the original casing is preserved for display. OAuth full name remains separate from the chosen display name.
- Withdrawing an account deletes the user's account-owned projects and participation through cascades instead of anonymizing them.

## Boundaries

- Project owners do not gain moderation rights over comments written by other users on their projects.
- The operator-only class remains visible as project context but cannot be newly selected during onboarding or settings.

## Why

Public reading keeps discovery friction low, while authenticated, owner-scoped writes keep attribution and destructive actions trustworthy. Deliberate onboarding produces the two pieces of identity the board needs—an unambiguous display name and class—without exposing OAuth identity as the public name.

## Reconsider when

- Anonymous participation becomes necessary.
- Account deletion must preserve public contributions for legal or community-continuity reasons.
- The service needs instructor or moderator roles with authority over other users' content.
