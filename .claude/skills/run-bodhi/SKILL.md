---
name: run-bodhi
description: Build, run, and drive the full bodhi stack (client web app, server API, Python agent). Use when asked to start bodhi, run the app end-to-end, take a screenshot of the client UI, hit the API, or exercise the braindump/agent pipeline.
---

Bodhi is a 3-service full-stack app: `client` (React/Vite, :5173) → `server`
(Express/MongoDB, :3000) → `agent` (Python FastAPI/Google ADK, :8001) →
Gemini. All paths below are relative to the repo root (`bodhi/`).

For agent/automated use: launch everything with
`.claude/skills/run-bodhi/stack.mjs`, drive the API with
`.claude/skills/run-bodhi/smoke.sh`, and drive the browser UI with
`.claude/skills/run-bodhi/ui-driver.mjs`.

## Prerequisites

Already-installed toolchain assumed: `pnpm`, `node`, `uv`, and `gcloud`
(for Application Default Credentials — `google.auth.default()` is called
at agent import time; run `gcloud auth application-default login` once if
`gcloud auth application-default print-access-token` fails).

No OS packages needed beyond that — this was run and verified on macOS,
no xvfb/headless-browser packages required (see UI driver notes below).

## Setup

```bash
pnpm install                 # installs shared + server + client workspaces
cd agent && uv sync && cd .. # installs the Python agent's venv
```

Real per-service secrets already live in `server/.env` (JWT secrets, a
**remote MongoDB Atlas URI**) and `agent/.env` (`GEMINI_API_KEY`,
`GOOGLE_CLOUD_PROJECT`). **`stack.mjs` deliberately does NOT use the Atlas
URI** — it overrides `MONGODB_URI` with a disposable local
`mongodb-memory-server` instance so agent runs never write to the shared/
real database. `agent/.env`'s `GEMINI_API_KEY` **is** used as-is (the
agent needs it to call the real Gemini model).

## Build

No separate build step needed to run in dev mode — `stack.mjs` runs each
service's own dev command (`ts-node-dev`, `uvicorn --reload`-less prod
mode, `vite`). Production builds (`pnpm run build` in `server`/`client`)
exist but aren't exercised by this skill.

## Run (agent path)

```bash
node .claude/skills/run-bodhi/stack.mjs up      # boots mongo, server, agent, client
node .claude/skills/run-bodhi/stack.mjs down    # stops everything, frees ports
```

`up` blocks until all four are confirmed listening (polls each port),
then returns to your shell — the four child processes keep running
detached. Logs land in `.claude/skills/run-bodhi/.run/{mongo,server,agent,client}.log`;
pids in `.claude/skills/run-bodhi/.run/pids.json`. Boot takes ~15-20s,
mostly the agent's ADK/OpenTelemetry init.

```
client:  http://localhost:5173
server:  http://localhost:3000  (proxied by client's /api)
agent:   http://localhost:8001/docs
```

### API smoke test (the real end-to-end proof)

```bash
bash .claude/skills/run-bodhi/smoke.sh
```

Registers a throwaway user, logs in, then POSTs one braindump entry.
This is the one request that actually exercises every hop: client's
`/api` proxy target → server auth (JWT) → server → agent `/process` →
Gemini → structured JSON → Mongo write. A successful run prints the
parsed `journal` object back.

### Browser UI (screenshot / drive the page)

No `chromium-cli` in this environment, so `.claude/skills/run-bodhi/ui-driver.mjs`
adapts the same nav → wait → act → screenshot loop directly on
`playwright-core`, pointed at the local Google Chrome install (no
separate browser download — `playwright-core` is installed via the
skill's own `package.json`; run `npm install` once inside
`.claude/skills/run-bodhi/` if `node_modules` isn't there).

```bash
node .claude/skills/run-bodhi/ui-driver.mjs <<'EOF'
nav http://localhost:5173
wait textarea
screenshot 01-landing
fill textarea Spent $10 on coffee
click button[aria-label=Submit]
eval new Promise(r => setTimeout(r, 1500))
console
screenshot 02-after-submit
quit
EOF
```

Screenshots land in `/tmp/bodhi-shots/` (override: `SCREENSHOT_DIR`).
Override the browser binary with `CHROME_PATH` if Chrome isn't at the
default macOS path.

| command | what it does |
|---|---|
| `launch` | start the browser (auto-called by `nav` if needed) |
| `nav <url>` | navigate |
| `wait <css-sel>` | wait up to 10s for a selector |
| `screenshot [name]` | → `SCREENSHOT_DIR/<name>.png` |
| `fill <css-sel> <text>` | set an input/textarea's value |
| `click <css-sel>` / `click-text <text>` | click |
| `type <text>` / `press <key>` | keyboard input |
| `eval <js>` | evaluate in page, print JSON (useful for `eval new Promise(r=>setTimeout(r,N))` as a settle-wait) |
| `text [css-sel]` | print innerText |
| `console` | print captured `console.error` messages |
| `quit` | close browser |

**Important:** commands are piped over stdin one per line and run
strictly in order (see Gotchas) — don't rely on interactive readline
behavior.

## Run (human path)

```bash
node .claude/skills/run-bodhi/stack.mjs up
open http://localhost:5173      # macOS; then Ctrl-C is not enough — run `stack.mjs down` to stop
```

## Test

```bash
pnpm --filter server test       # vitest, uses mongodb-memory-server internally
pnpm --filter client test       # vitest + testing-library
cd agent && uv run pytest tests/unit tests/integration
```

Not run to completion as part of building this skill (long-running);
sanity-checked that the commands exist and start correctly.

## Gotchas

- **The client UI does not actually work end-to-end yet.** `UniversalInput.tsx`
  (`client/src/components/UniversalInput.tsx:35`) posts to `/api/braindump`
  with no `Authorization` header, but the route requires a Bearer JWT
  (`server/src/routes/braindump.routes.ts:19`). Submitting from the
  browser silently 401s (verified via `ui-driver.mjs` — see
  `console --errors` output above). The real working flow today is via
  `smoke.sh` hitting the API directly. This is a genuine app gap, not a
  driver bug — don't "fix" it by adding auth to the driver; it needs a
  login flow in the client.
- **Vite's dev server here binds IPv6-only (`::1`), not `127.0.0.1`.**
  `curl http://127.0.0.1:5173` gets connection-refused while
  `http://localhost:5173` works. `stack.mjs`'s port-polling explicitly
  uses `localhost`, not a hardcoded `127.0.0.1` — don't "fix" that back,
  it was a real bug that caused false up-failures.
- **`ts-node-dev` forks a respawn child process.** Sending `SIGTERM` to
  just the `pnpm run dev` pid leaves an orphaned `ts-node-dev`/`server.ts`
  process holding port 3000. `stack.mjs` spawns server and client
  `detached: true` and kills the whole process group (`-pid`) on `down`
  for this reason.
- **Never use the real `MONGODB_URI` from `server/.env` for agent runs.**
  It points at a live Atlas cluster (`cluster0.7o7wm7p.mongodb.net`).
  `stack.mjs` always overrides it with a `mongodb-memory-server` instance.
- **Many braindump inputs 500 on save**, not because the pipeline is
  broken but because the agent's LLM output casing doesn't match the
  shared zod enums (e.g. it returns `"Food"` / `"Mindfulness"` where
  `@bodhi/shared`'s `Entry` schema expects lowercase `"food"` /
  `"deep-work"` etc. — see `shared/schemas/`). Journal-only inputs (no
  expense/time-log content) reliably succeed; that's what `smoke.sh` uses.
  This is a real bug worth fixing upstream (map/lowercase the LLM's enum
  output before validation), not something to route around indefinitely.
- **readline + piped stdin races async handlers.** The first version of
  `ui-driver.mjs` fired all piped commands nearly simultaneously because
  Node's `readline` doesn't wait for an async `'line'` handler to resolve
  before emitting the next line when stdin isn't a TTY. Fixed by chaining
  commands through a `Promise` queue — don't revert to a bare
  `async (line) => {...}` handler.
- `google.auth.default()` runs at agent import time (`agent/app/fast_api_app.py:34`)
  — the agent process will fail to even start if ADC isn't configured,
  independent of whether `GEMINI_API_KEY` is set.

## Troubleshooting

- **`stack.mjs up` hangs then throws `timeout waiting for :5173/`**: something
  else is holding port 5173, or Chrome/another process has stale
  connections. Run `lsof -i :5173` and kill stragglers; then `stack.mjs down`
  (safe even with no pidfile) before retrying `up`.
- **`EADDRINUSE` on retry**: a previous `up` crashed before writing
  `pids.json` (pids are written incrementally, but a hard kill of the
  orchestrator itself can still orphan children). `ps aux | grep -E
  "ts-node-dev|uvicorn|vite.js|mongod-arm64"` and `kill -9` stragglers by hand.
- **`agent` fails immediately with a `google.auth` error**: ADC isn't
  configured. Run `gcloud auth application-default login`.
- **`smoke.sh` 500s**: check `.claude/skills/run-bodhi/.run/agent.log` —
  most likely the zod-enum casing mismatch described in Gotchas. Use a
  journal-only phrasing to get a clean success while that's unfixed.
