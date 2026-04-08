## Overview
Spec for the existing features of Claude Hunt: login page, home page auth status, theme toggle, auth error page, and profile auto-creation with RLS.

## Scenarios

### 1. Email magic link — OTP sent confirmation
[Context] User is on the login page with the email form visible
[Action] Enters an email and clicks "Continue"; after success, a confirmation message appears

Success Criteria:
- [ ] Enter "test@example.com" and submit -> "We sent a magic link to test@example.com. Check your email to sign in." text is displayed
- [ ] Submit button text changes to "Sending..." while in progress

### 2. Email magic link — try another email
[Context] OTP sent confirmation is displayed
[Action] User clicks "Try another email" and the email form reappears

Success Criteria:
- [ ] Click "Try another email" -> email input field reappears with empty value
- [ ] OTP sent message disappears

### 3. Login buttons disabled during loading
[Context] User is on the login page
[Action] Any login action is in progress

Success Criteria:
- [ ] While loading, GitHub button is disabled
- [ ] While loading, Google button is disabled
- [ ] While loading, email input is disabled
- [ ] While loading, Continue button is disabled

### 4. Home page — unauthenticated state
[Context] User visits the home page without being logged in
[Action] Page displays a sign-in prompt

Success Criteria:
- [ ] "Sign in" button is visible
- [ ] "Sign in" button links to /login

### 5. Home page — authenticated state
[Context] User visits the home page while logged in
[Action] Page displays user information

Success Criteria:
- [ ] "Signed in as" label is visible
- [ ] User email is displayed
- [ ] Provider name is displayed (e.g., "via github")
- [ ] "Sign out" button is visible

### 6. Theme toggle — press 'd'
[Context] User is on any page, not focused on an input field
[Action] Presses the 'd' key

Success Criteria:
- [ ] Theme switches from light to dark (or dark to light)
- [ ] HTML element class reflects the new theme

### 7. Theme toggle — ignored in input fields
[Context] User is typing in an input field
[Action] Presses the 'd' key

Success Criteria:
- [ ] Theme does not change
- [ ] The 'd' character is typed into the input

### 8. Auth error page
[Context] Auth callback fails and user is redirected to /auth/auth-code-error
[Action] Error page is displayed

Success Criteria:
- [ ] "Authentication Error" heading is visible
- [ ] "Something went wrong during sign-in. Please try again." message is visible
- [ ] "Back to login" button links to /login

### 9. Profile auto-creation on signup
[Context] A new user signs up via any auth provider
[Action] A profile row is automatically created

Success Criteria:
- [ ] Profile row exists with matching user id and email
- [ ] full_name is populated from OAuth metadata (full_name, name, or user_name)
- [ ] display_name matches full_name

### 10. Profile RLS — users can only view own profile
[Context] An authenticated user queries the profiles table
[Action] Only their own profile is returned

Success Criteria:
- [ ] Query returns exactly 1 row (own profile)
- [ ] Query for another user's profile returns 0 rows

### 11. Profile RLS — users can only update own profile
[Context] An authenticated user attempts to update a profile
[Action] Only their own profile can be updated

Success Criteria:
- [ ] Update own profile succeeds
- [ ] Update another user's profile affects 0 rows

## Scope

### Included
- Login form UI states (email magic link, loading states)
- Home page auth status display
- Theme hotkey toggle
- Auth error page
- Profile auto-creation trigger
- Profile RLS policies

### Excluded
- OAuth redirect flow (external system boundary — cannot be tested without Supabase OAuth providers)
- Auth callback code exchange (requires real auth code from Supabase)
- Sign out server action (server action with redirect — integration test concern)
- Email delivery (external service)

## Prerequisites
- Supabase local instance running with auth and profiles table
- Next.js dev server running

## Undecided Items
- None
