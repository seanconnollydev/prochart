## Package management (npm only)

Use **npm** for this repository: `npm install` for dependencies, and **npx** to run one-off CLIs (e.g. `npx shadcn@latest add <component>`). Do **not** use pnpm, yarn, or bun for installs or shadcn unless the user explicitly says otherwise.

## Interactive cursor

Interactive controls must show `cursor: pointer`. This is enforced globally in `app/globals.css` for buttons, links, tabs, checkboxes, radios, selects, and related ARIA roles.

- Do **not** override with `cursor-default` on clickable controls.
- Custom clickable non-semantic elements (e.g. `div`/`span` with `onClick`) must use a real control (`button`/`Link`) or add `cursor-pointer`.
- Disabled controls may use `cursor-not-allowed` or `pointer-events-none`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
