#!/usr/bin/env bash
# End-to-end proof the stack is wired correctly: register -> login -> braindump.
# The braindump call is the one request that actually exercises client-proxy's
# target, server's auth+Mongo, and server -> agent -> Gemini -> structured JSON.
#
# Requires: stack.mjs up already run (server on :3000).
set -euo pipefail

EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="Passw0rd!123"

echo "== register ($EMAIL) =="
REG=$(curl -sf -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}")
echo "$REG"

TOKEN=$(echo "$REG" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).accessToken))")

echo
echo "== braindump (server -> agent -> Gemini -> Mongo) =="
# Use a journal-only phrase: expense/time-log extraction currently fails zod
# validation because the agent's LLM output casing doesn't match the shared
# enums (see SKILL.md Gotchas) — this is a real app bug, not a driver issue.
curl -sf -X POST http://localhost:3000/api/braindump \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"text":"Feeling grateful and calm today, had a quiet reflective afternoon."}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
