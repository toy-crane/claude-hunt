# Type-Safe Supabase Client

Guide for generating TypeScript types from the database and using them in Supabase clients.

## How It Works

The Supabase CLI introspects the local database and generates a `Database` type that describes all tables, columns, and relationships. Passing this type to the Supabase client constructors gives you autocomplete for table names, column names, and query results.

## Generating Types

```bash
bun run gen:types
```

This runs `supabase gen types typescript --local > types/database.types.ts`.

## When to Regenerate

Run `bun run gen:types` after any schema change:
- Creating a new table
- Adding, removing, or renaming columns
- Changing column types or constraints

If you forget, `bun run typecheck` will catch type mismatches.

## Using the Database Type

All Supabase client constructors accept a `Database` generic parameter:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(url, key);
}
```

The same pattern applies to `createServerClient` in `server.ts` and `proxy.ts`.

## Helper Types

The generated file exports helper types for convenience:

```ts
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

// Row type (what you get from .select())
type Profile = Tables<"profiles">;

// Insert type (what you pass to .insert())
type NewProfile = TablesInsert<"profiles">;

// Update type (what you pass to .update())
type ProfileUpdate = TablesUpdate<"profiles">;
```

## File Location

- Generated types: `types/database.types.ts`
- This file is auto-generated — do not edit manually
