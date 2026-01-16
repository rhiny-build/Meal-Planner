# Command Cheatsheet

## Prisma Commands

| Command | What it does | When to use |
|---------|--------------|-------------|
| `npx prisma db push` | Syncs database to match schema | After changing schema in dev (quick, no migration file) |
| `npx prisma migrate dev --name <name>` | Creates migration + applies it | After changing schema (creates history, good for teams) |
| `npx prisma migrate reset` | Drops DB, recreates, runs all migrations | When you want a fresh start (deletes all data!) |
| `npx prisma generate` | Regenerates Prisma client types | After schema changes (usually auto-runs with migrate) |
| `npx prisma studio` | Opens visual database editor | When you want to view/edit data in browser |

## NPM/NPX Commands

| Command | What it does | When to use |
|---------|--------------|-------------|
| `npm run dev` | Starts dev server with hot-reload | During development |
| `npm run build` | Creates production build | Before deploying |
| `npm run lint` | Checks code for issues | Before committing |
| `npm test` | Runs test suite | After making changes |
| `npx tsc --noEmit` | Type-checks without building | To find TypeScript errors |

## db push vs migrate dev

- **db push**: Fast, no migration file, can lose data. Use for prototyping.
- **migrate dev**: Creates SQL migration file, safer, tracks history. Use for real changes.

## VS Code Shortcuts

### General

| Shortcut | What it does |
|----------|--------------|
| `Cmd + Shift + P` | Command Palette (access all commands) |
| `Cmd + P` | Quick Open (find files by name) |
| `Cmd + ,` | Open Settings |
| `Cmd + B` | Toggle sidebar |
| `Cmd + J` | Toggle terminal panel |
| `Cmd + \` | Split editor |

### Editing

| Shortcut | What it does |
|----------|--------------|
| `Cmd + D` | Select next occurrence of word |
| `Cmd + Shift + L` | Select all occurrences of word |
| `Option + Up/Down` | Move line up/down |
| `Option + Shift + Up/Down` | Copy line up/down |
| `Cmd + Shift + K` | Delete entire line |
| `Cmd + /` | Toggle line comment |
| `Cmd + Shift + /` | Toggle block comment |
| `Cmd + ]` / `Cmd + [` | Indent/outdent line |

### Navigation

| Shortcut | What it does |
|----------|--------------|
| `Cmd + G` | Go to line number |
| `Cmd + Shift + O` | Go to symbol in file |
| `Cmd + T` | Go to symbol in workspace |
| `F12` | Go to definition |
| `Cmd + Click` | Go to definition (mouse) |
| `Option + F12` | Peek definition (inline) |
| `Shift + F12` | Find all references |
| `Cmd + Shift + F` | Search across all files |

### Multi-cursor

| Shortcut | What it does |
|----------|--------------|
| `Option + Click` | Add cursor at click position |
| `Cmd + Option + Up/Down` | Add cursor above/below |
| `Cmd + Shift + L` | Add cursor to all occurrences |

### Terminal

| Shortcut | What it does |
|----------|--------------|
| `Ctrl + ~` | Toggle terminal |
| `Cmd + Shift + [` / `]` | Switch terminal tabs |
| `Cmd + \` (in terminal) | Split terminal |

### Useful Commands (via Cmd + Shift + P)

| Command | What it does |
|---------|--------------|
| `Format Document` | Auto-format current file |
| `Rename Symbol` | Rename variable/function everywhere |
| `Organize Imports` | Sort and remove unused imports |
| `Toggle Word Wrap` | Wrap long lines |
| `Reload Window` | Restart VS Code window |
