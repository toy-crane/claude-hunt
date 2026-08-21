# Production Delivery

## Decisions

- A push to `main` is the default production path. GitHub Actions runs typecheck and unit tests, applies Supabase migrations, and only then triggers the Vercel deployment hook.
- Production jobs run in order and a failed test or migration prevents deployment. An in-progress production migration is never cancelled by a newer push.
- Vercel's direct Git deployment for `main` stays disabled; the gated deploy hook owns automatic production deployment.
- The local `/ship` skill is an explicit emergency override, not the normal post-merge step. It verifies the exact main revision and project links, then runs the same safety checks, migration, and deployment synchronously.

## Boundaries

- Preview deployments may continue through Vercel's pull-request integration.
- Neither path automatically rolls back an already-applied migration.

## Why

The default workflow ensures every merged code change reaches production only after its schema and checks succeed, without relying on a person to remember a second command. Disabling direct Vercel deployment prevents code from racing ahead of the database. The local path remains useful when the hosted workflow is unavailable or terminal-visible recovery is required.

## Reconsider when

- The repository introduces staging or another production target.
- GitHub Actions can no longer provide reliable migration ordering or deployment visibility.
- Deployment no longer depends on a separately managed database schema.
