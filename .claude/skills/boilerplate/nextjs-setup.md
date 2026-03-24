# Step 2: Create Next.js Project + shadcn/ui

## 2a. Create Next.js Project

```bash
bunx create-next-app@latest <project-name> \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --use-bun \
  --turbopack
```

After creation, all subsequent commands run inside the new project directory.

## 2b. Set up shadcn/ui

Run shadcn init with the user's preset choice:

**With preset:**
```bash
bunx shadcn@latest init -d -p <preset>
```

**Without preset (defaults):**
```bash
bunx shadcn@latest init -d
```

The `-d` flag uses default configuration to avoid interactive prompts.

Verify that `components.json` was created after this step.
