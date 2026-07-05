#!/usr/bin/env node
// Orchestrates the full bodhi stack for local/agent driving:
//   local ephemeral MongoDB (mongodb-memory-server) -> server (Express, :3000)
//   -> agent (FastAPI/ADK, :8001) -> client (Vite, :5173)
//
// Does NOT touch the real MONGODB_URI in server/.env (a remote Atlas
// cluster) — this spins up a disposable local Mongo instead so runs
// here never write to shared/production data.
//
// Usage:
//   node .claude/skills/run-bodhi/stack.mjs up      # start everything, print URLs, stay alive
//   node .claude/skills/run-bodhi/stack.mjs down     # stop everything (reads pidfile)
//
// State (pids, logs) lives in .claude/skills/run-bodhi/.run/

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const RUN_DIR = path.join(import.meta.dirname, '.run');
fs.mkdirSync(RUN_DIR, { recursive: true });
const PID_FILE = path.join(RUN_DIR, 'pids.json');

function logStream(name) {
  return fs.openSync(path.join(RUN_DIR, `${name}.log`), 'a');
}

function waitForPort(port, path_ = '/', timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      // 'localhost' (not a hardcoded 127.0.0.1) — Vite's dev server here binds
      // IPv6-only (::1); forcing IPv4 makes this poll ECONNREFUSED forever.
      const req = http.get({ host: 'localhost', port, path: path_, timeout: 2000 }, res => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error(`timeout waiting for :${port}${path_}`));
        else setTimeout(tryOnce, 500);
      });
      req.on('timeout', () => { req.destroy(); if (Date.now() > deadline) reject(new Error(`timeout waiting for :${port}`)); else setTimeout(tryOnce, 500); });
    };
    tryOnce();
  });
}

async function up() {
  const pids = {};

  // 1. Local ephemeral MongoDB
  const mongoScript = `
    const { MongoMemoryServer } = require('mongodb-memory-server');
    (async () => {
      const mongod = await MongoMemoryServer.create({ instance: { port: 51117 } });
      console.log('MONGO_URI=' + mongod.getUri());
      process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
      setInterval(() => {}, 1 << 30); // keep alive
    })().catch(e => { console.error(e); process.exit(1); });
  `;
  const mongoProc = spawn(process.execPath, ['-e', mongoScript], {
    cwd: path.join(ROOT, 'server'),
    stdio: ['ignore', 'pipe', logStream('mongo')],
  });
  pids.mongo = mongoProc.pid;
  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
  const mongoUri = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('mongod did not print a URI in 30s')), 30_000);
    mongoProc.stdout.on('data', d => {
      buf += d.toString();
      const m = buf.match(/MONGO_URI=(\S+)/);
      if (m) { clearTimeout(t); resolve(m[1]); }
    });
  });
  fs.writeFileSync(path.join(RUN_DIR, 'mongo.log'), `MONGO_URI=${mongoUri}\n`);
  console.log('[mongo] up:', mongoUri);

  // 2. Server (Express) — override MONGODB_URI to the local ephemeral instance
  const serverEnv = {
    ...process.env,
    MONGODB_URI: mongoUri,
    PORT: '3000',
    ADK_AGENT_URL: 'http://localhost:8001',
    CORS_ORIGIN: 'http://localhost:5173',
  };
  const serverProc = spawn('pnpm', ['run', 'dev'], {
    cwd: path.join(ROOT, 'server'),
    env: serverEnv,
    stdio: ['ignore', logStream('server'), logStream('server')],
    detached: true, // ts-node-dev forks a respawn child; kill the whole group on `down`
  });
  pids.server = serverProc.pid;
  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
  await waitForPort(3000, '/api/auth/login', 60_000).catch(() => {}); // any response (even 4xx) means it's up
  console.log('[server] up on :3000 (pid', serverProc.pid, ')');

  // 3. Agent (FastAPI/ADK) on :8001
  const agentProc = spawn('uv', ['run', 'uvicorn', 'app.fast_api_app:app', '--host', '0.0.0.0', '--port', '8001'], {
    cwd: path.join(ROOT, 'agent'),
    env: process.env,
    stdio: ['ignore', logStream('agent'), logStream('agent')],
  });
  pids.agent = agentProc.pid;
  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
  await waitForPort(8001, '/docs', 60_000);
  console.log('[agent] up on :8001 (pid', agentProc.pid, ')');

  // 4. Client (Vite dev server) on :5173
  const clientProc = spawn('pnpm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], {
    cwd: path.join(ROOT, 'client'),
    env: process.env,
    stdio: ['ignore', logStream('client'), logStream('client')],
    detached: true,
  });
  pids.client = clientProc.pid;
  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
  await waitForPort(5173, '/', 30_000);
  console.log('[client] up on :5173 (pid', clientProc.pid, ')');

  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
  console.log('\nAll services up. Logs in', RUN_DIR);
  console.log('  client:  http://localhost:5173');
  console.log('  server:  http://localhost:3000');
  console.log('  agent:   http://localhost:8001/docs');
  console.log('\nStop with: node .claude/skills/run-bodhi/stack.mjs down');
}

function down() {
  if (!fs.existsSync(PID_FILE)) { console.log('no pidfile, nothing to stop'); return; }
  const pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  for (const [name, pid] of Object.entries(pids)) {
    // server/client were spawned detached (their own process group) so that
    // ts-node-dev's respawn child and vite's child both die with the group;
    // negative pid = signal the whole group instead of just the leader.
    const target = (name === 'server' || name === 'client') ? -pid : pid;
    try { process.kill(target, 'SIGTERM'); console.log('stopped', name, pid); }
    catch (e) { console.log(name, pid, 'already dead'); }
  }
  fs.unlinkSync(PID_FILE);
}

const cmd = process.argv[2];
if (cmd === 'up') up().catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'down') down();
else { console.log('usage: stack.mjs up|down'); process.exit(1); }
