## Overview
Strengthen the site-wide SEO metadata so that crawlers, social previews, and browsers resolve claude-hunt with absolute URLs, clear indexing rules, a canonical home, and relevant keywords. The visible product does not change; what changes is what search engines and link unfurlers see.

## Scope

### Included
- A site-wide absolute base URL so relative OG/Twitter image paths resolve to `https://www.claude-hunt.com/...` when fetched by third parties.
- A site-wide keywords list relevant to the showcase (e.g., Claude Code, cohort projects, AI coding showcase).
- Site-wide robots directives that explicitly allow indexing and following for the public site.
- A site-wide canonical URL pointing to the production home, so crawlers collapse query-string variants (e.g., `?cohort=...`) to a single canonical page.

### Excluded
- **Per-page title/description overrides** for `/login`, `/onboarding`, `/auth/auth-code-error`, and home — this spec is site-wide only; page-level fills can be a follow-up.
- **Dynamic metadata** for project detail pages — those routes do not exist yet.
- **sitemap.xml / robots.txt / JSON-LD structured data** — separate SEO workstreams.
- **Verification tags** (Google Search Console, Bing, etc.) — not in scope until the site is submitted for indexing.

## Scenarios

### 1. Social preview uses an absolute image URL
- **Given** — A link to `https://www.claude-hunt.com/` is pasted into a social platform (Slack, X, Discord) that fetches Open Graph tags
- **When** — The platform reads the HTML `<head>` of the home page
- **Then** — The `og:image` and `twitter:image` URLs in the response are absolute (start with `https://www.claude-hunt.com/`), not relative paths

Success Criteria:
- [ ] `GET https://www.claude-hunt.com/` HTML contains `<meta property="og:image" content="https://www.claude-hunt.com/...">` (absolute URL)
- [ ] `GET https://www.claude-hunt.com/` HTML contains `<meta name="twitter:image" content="https://www.claude-hunt.com/...">` (absolute URL)

### 2. Search engines are allowed to index the site
- **Given** — A crawler (Googlebot, Bingbot) visits any page on the site
- **When** — The crawler reads the `<head>` of the document
- **Then** — A `robots` meta tag is present that permits indexing and following links

Success Criteria:
- [ ] Home page HTML contains a `<meta name="robots">` tag whose content includes `index` and `follow` (no `noindex` or `nofollow`)
- [ ] The same directive appears on `/login`, `/onboarding`, and `/settings`

### 3. Duplicate-content variants collapse to a single canonical URL
- **Given** — A user (or crawler) visits `https://www.claude-hunt.com/?cohort=cohort-1`
- **When** — The browser/crawler reads the `<head>` of the page
- **Then** — A canonical link element points to the site's canonical home URL, not the query-string variant

Success Criteria:
- [ ] `GET https://www.claude-hunt.com/?cohort=cohort-1` HTML contains `<link rel="canonical" href="https://www.claude-hunt.com/">` (or the route's canonical without query params)
- [ ] `GET https://www.claude-hunt.com/` HTML contains `<link rel="canonical" href="https://www.claude-hunt.com/">`

### 4. Keywords appear in the site metadata
- **Given** — A crawler fetches any page on the site
- **When** — The crawler reads the `<head>` of the document
- **Then** — A `keywords` meta tag is present with a comma-separated list of site-relevant terms

Success Criteria:
- [ ] Home page HTML contains `<meta name="keywords" content="...">` whose content includes at minimum: `Claude Code`, `cohort projects`, `AI coding`, `showcase`
- [ ] The same keywords meta tag appears unchanged on `/login`, `/onboarding`, and `/settings`

### 5. Existing page-level title overrides keep working
- **Given** — A user visits `/settings`
- **When** — The browser renders the tab title
- **Then** — The tab reads `Settings · claude-hunt`, confirming the title template still composes with page-level overrides after the metadata changes

Success Criteria:
- [ ] `GET /settings` HTML `<title>` equals `Settings · claude-hunt`
- [ ] `GET /` HTML `<title>` equals `claude-hunt` (default from the title config)

## Invariants
- **Consistency**: The production base URL used in metadata is exactly `https://www.claude-hunt.com` (no trailing slash in the base, no http variant, no bare apex without `www`). This value is the single source of truth for any absolute URL in metadata output.
- **No regression**: After the change, every page that previously had a page-level title override (currently `/settings`) still renders that override; the existing `openGraph` and `twitter` blocks remain intact.

## Dependencies
- The production domain `https://www.claude-hunt.com` must be the agreed canonical host. (Confirmed by the user.)

## Undecided Items
- None.
