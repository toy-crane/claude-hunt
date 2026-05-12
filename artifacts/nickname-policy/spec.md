## Overview
Tighten the nickname rules from "1–50 characters, any character" to a stricter policy (2–12 characters, Korean / English / digits / underscore only) so nicknames stay short, readable, and free of confusing edge cases such as standalone jamo, whitespace, or special characters.

## Scope

### Included
- New policy applies to both the onboarding form (first-time set) and the settings form (later update)
- Validation runs in the form (immediate feedback) and on the server (defense in depth)
- A single unified error message is shown for any policy violation
- Existing case-insensitive, trim-aware uniqueness check is preserved
- Existing "empty input" message ("닉네임을 입력해 주세요.") and duplicate message ("이미 사용 중인 닉네임이에요.") are preserved unchanged

### Excluded
- Migration of legacy nicknames that don't satisfy the new policy — handled out-of-band by the maintainer. Production data was audited and currently contains 0 violations under the new policy
- Read paths (project cards, profile views, OG images, etc.) — they continue to display whatever is already stored, without re-validating
- Adding a separate username field — the single `display_name` field is kept

## Scenarios

### 1. Set a valid nickname
**Given** the onboarding form or the settings form is open
**When** the user enters a value that satisfies the policy and submits
**Then** the value is accepted and persisted

Success Criteria:
- [ ] "Alice_99" → form submits, the value is persisted and shown on subsequent loads
- [ ] "토이크레인" → form submits successfully
- [ ] "Hi" (2 characters, minimum length) → form submits successfully
- [ ] "abcdefghijkl" (12 characters, maximum length) → form submits successfully
- [ ] "Car_crash" (mixed case + underscore + digits-free) → form submits successfully
- [ ] "  Alice  " (leading / trailing whitespace) → trimmed to "Alice" and accepted; the stored value contains no surrounding whitespace

### 2. Reject a nickname that violates the policy
**Given** the onboarding form or the settings form is open
**When** the user enters a value that breaks the length or character rules and submits
**Then** the form does not submit, the value is not persisted, and a single unified policy message is shown under the field

Success Criteria:
- [ ] "a" (1 character, below minimum) → unified policy message appears under the field
- [ ] "abcdefghijklm" (13 characters, above maximum) → unified policy message
- [ ] "Alice!" (special character) → unified policy message
- [ ] "Alice K" (inner whitespace) → unified policy message
- [ ] "ㄱㄴ" (standalone jamo, not within 가-힣) → unified policy message
- [ ] "Alice@example" (special character) → unified policy message
- [ ] "" or "   " (empty or whitespace-only) → "닉네임을 입력해 주세요." (existing empty message, not the new unified policy message)
- [ ] On error, the previously entered value remains in the input field

### 3. Reject a duplicate nickname (case-insensitive, trim-aware)
**Given** another user already has the nickname "Alice"
**When** a user submits "alice", "ALICE", or "  Alice  " as their own nickname
**Then** the form does not submit and the existing duplicate message is shown

Success Criteria:
- [ ] "alice" while "Alice" is taken → "이미 사용 중인 닉네임이에요."
- [ ] "ALICE" while "Alice" is taken → same duplicate message
- [ ] "  Alice  " while "Alice" is taken → same duplicate message
- [ ] A user re-saving their own current nickname (any case variation) → save does not show the duplicate error

### 4. Existing non-compliant nicknames remain readable
**Given** the database contains a hypothetical nickname that does not satisfy the new policy (e.g., legacy entry "x", or a name with a special character)
**When** any page that displays nicknames renders (project board, project detail, OG image, settings page initial load)
**Then** the legacy value is displayed as stored, without rejection or rewriting

Success Criteria:
- [ ] Project cards continue to render the author nickname exactly as stored
- [ ] Settings page initial value reflects the stored nickname as-is, even if it would fail the new policy
- [ ] The user is not auto-redirected or blocked from any page just because their stored nickname is non-compliant

## Invariants
- **Server-side enforcement**: Server-side actions reject any non-compliant value, regardless of whether the client validated first. Skipping the form cannot bypass the policy.
- **Write-only enforcement**: The policy gates writes (insert / update of `display_name`) only. Reads never re-validate or transform existing values.
- **Uniqueness comparison**: Two nicknames that differ only by letter case or surrounding whitespace are treated as identical for the duplicate check.
- **Single unified violation message**: All non-empty policy failures — length, allowed characters, jamo, whitespace, special characters — surface the same message that names the rule.

## Dependencies
- Existing `display_name` field on the user profile and its case-insensitive, trim-aware uniqueness index (already in place)

## Undecided Items
- None
