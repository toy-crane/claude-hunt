# Button Loading State

## Contents

- Compose `Spinner` + `data-icon="inline-start"` + `disabled` — never modify `Button`
- Keep the label static — no "Submitting...", "Saving...", "저장 중..." swaps
- Skip the spinner for optimistic-UI buttons
- Layout shift is accepted; opt-in `min-w-*` per call site when needed
- Icon-only buttons need an `sr-only` label

---

## Compose `Spinner` + `data-icon="inline-start"` + `disabled`

`Button` has no `loading` / `isPending` prop. Compose at the call site.

```tsx
<Button disabled={isPending} type="submit">
  {isPending ? <Spinner data-icon="inline-start" /> : null}
  Save
</Button>
```

How the pieces interact:

- `data-icon="inline-start"` triggers `Button`'s cva selector
  `has-data-[icon=inline-start]:pl-*`, which trims left padding so the
  spinner sits in visual balance with the label.
- `Button`'s `[&_svg:not([class*='size-'])]:size-4` selector sizes the
  spinner automatically — do not pass a size class to `<Spinner>` inside
  a button.
- `disabled` blocks double-submit and applies
  `disabled:pointer-events-none disabled:opacity-50` from `Button`'s base.

Use the ternary form `isPending ? <Spinner /> : null` rather than
`isPending && <Spinner />` to avoid `false` leaking into the JSX tree.

---

## Keep the label static — no "-ing" / "-중" swaps

Never replace or extend the label with progress text. The spinner and
`disabled` state already communicate "in progress" — duplicating that in
the label causes layout shift, doubles translation keys, and breaks the
visual rhythm of the form.

**Incorrect:**

```tsx
<Button disabled={isPending} type="submit">
  {isPending ? <Spinner data-icon="inline-start" /> : null}
  {isPending ? "Saving..." : "Save"}
</Button>
```

**Correct:**

```tsx
<Button disabled={isPending} type="submit">
  {isPending ? <Spinner data-icon="inline-start" /> : null}
  Save
</Button>
```

Combine `disabled` with any business condition at the call site:

```tsx
<Button
  disabled={submitting || !value.trim() || overLimit}
  type="submit"
>
  {submitting ? <Spinner data-icon="inline-start" /> : null}
  Submit
</Button>
```

---

## Skip the spinner for optimistic-UI buttons

When the UI updates immediately on click — e.g. vote toggles, reaction
toggles — the optimistic update is itself the feedback. Do not add a
spinner. Set only `disabled={isPending}` to block double-clicks during
the underlying request.

```tsx
<button
  aria-pressed={optimisticVoted}
  disabled={isPending}
  onClick={handleClick}
>
  <UpIcon />
  <span>{optimisticCount}</span>
</button>
```

---

## Layout shift is accepted; opt-in per call site

Adding the spinner grows the button by roughly 22px (spinner width + gap).
This matches the default behavior of Linear, Stripe, Vercel, and shadcn's
own examples. Do not introduce absolute positioning, invisible
placeholders, or width-reservation markup as a global pattern.

If a specific button cannot tolerate the shift (tight toolbar slot,
fixed-width footer action), reserve width at that call site:

```tsx
<Button className="min-w-24" disabled={isPending} type="submit">
  {isPending ? <Spinner data-icon="inline-start" /> : null}
  Save
</Button>
```

---

## Icon-only buttons need an `sr-only` label

Buttons that show only an icon (`size="icon"`) have no visible text to
carry meaning during loading. Add an `sr-only` span so screen readers
announce the state.

```tsx
<Button size="icon" disabled={isPending}>
  {isPending ? (
    <>
      <Spinner data-icon="inline-start" />
      <span className="sr-only">Loading</span>
    </>
  ) : (
    <SaveIcon />
  )}
</Button>
```
