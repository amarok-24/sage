// Drives the locally running Sage app (client :5173, server :3000, agent :8001)
// with Playwright to produce assets/v2's screenshots and a narrated demo video.
// Run `node scripts/capture-assets/narration.mjs` first so narration/durations.json
// exists — the recording is paced against those real clip lengths so each UI
// state stays on screen at least as long as its narration line takes to speak.
import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readServerConnectionInfo, getSafeUserLocalDayBounds, DEMO_EMAIL } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets/v2');
const NARRATION_DIR = path.join(__dirname, 'narration');
const VIDEO_DIR = path.join(__dirname, 'video-tmp');
const ADMIN_TOKEN = 'local-capture-admin-token'; // must match server/.env's ADMIN_API_TOKEN

mkdirSync(ASSETS_DIR, { recursive: true });
mkdirSync(VIDEO_DIR, { recursive: true });

const durations = JSON.parse(readFileSync(path.join(NARRATION_DIR, 'durations.json'), 'utf8'));
const holdMs = (i) => durations[i].ms + 500;

function screenshotPath(name) {
  return path.join(ASSETS_DIR, name);
}

async function clearTodaysEntries() {
  const { mongoUri } = readServerConnectionInfo();
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db('test');
  const user = await db.collection('users').findOne({ email: DEMO_EMAIL });
  if (!user) throw new Error(`Demo user ${DEMO_EMAIL} not found`);
  const timezone = user.preferences?.timezone || 'UTC';
  const { start, end } = getSafeUserLocalDayBounds(timezone);

  const entryResult = await db.collection('entries').deleteMany({ userId: user._id, date: { $gte: start, $lt: end } });
  const habitResult = await db.collection('habitlogs').deleteMany({ userId: user._id, date: { $gte: start, $lt: end } });
  // Weekly insight docs aren't bounded to "today" specifically — clear any for this user so
  // the insights panel screenshot reflects only what trigger-jobs.mjs produces in this run.
  const weeklyResult = await db.collection('entries').deleteMany({ userId: user._id, type: 'weekly_insight' });
  console.log(`[capture] cleared ${entryResult.deletedCount} entries, ${habitResult.deletedCount} habit logs, ${weeklyResult.deletedCount} weekly insights for today`);
  await mongo.close();
}

async function main() {
  console.log('[capture] resetting today\'s data for a clean run...');
  await clearTodaysEntries();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 800 } },
  });
  await context.addInitScript(() => {
    try { localStorage.setItem('sage:v2-theme-mode', 'light'); } catch {}
  });

  const page = await context.newPage();
  console.log('[capture] navigating to the app...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.locator('textarea').waitFor({ state: 'visible', timeout: 20000 });

  console.log('[capture] capturing empty dashboard...');
  await page.getByText('Welcome to Sage').waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: screenshotPath('screenshot-dashboard-empty.png'), fullPage: true });
  await page.waitForTimeout(holdMs(0));

  const textarea = page.locator('textarea');
  const submitButton = page.getByRole('button', { name: 'Submit' });

  // Entry 1: multi-pillar (sleep, expense, time, journal) — this is the one we
  // screenshot mid-flight for the "processing" state.
  const entry1 = "Slept 7 hours last night and felt refreshed. Spent $45 on groceries at Trader Joe's. Went for a 30 minute run this morning. Journaled about feeling optimistic about my new project, mood 8 out of 10.";
  await textarea.fill(entry1);
  await page.waitForTimeout(holdMs(1));

  console.log('[capture] submitting entry 1, capturing processing state...');
  const entry1Response = page.waitForResponse((r) => r.url().includes('/api/braindump') && r.request().method() === 'POST');
  await submitButton.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: screenshotPath('screenshot-input-processing.png') });
  await page.waitForTimeout(holdMs(2));
  await entry1Response;
  await page.waitForTimeout(500);

  // Entry 2: nutrition + somatic, to round out the domain coverage.
  const entry2 = 'Had 2 rotis with dal makhani and a bowl of curd for lunch. Also had a mild headache in the afternoon, took a paracetamol, and felt better after an hour.';
  await textarea.fill(entry2);
  const entry2Response = page.waitForResponse((r) => r.url().includes('/api/braindump') && r.request().method() === 'POST');
  await submitButton.click();
  await entry2Response;
  await page.waitForTimeout(500);

  console.log('[capture] capturing populated dashboard...');
  await page.screenshot({ path: screenshotPath('screenshot-dashboard-populated.png'), fullPage: true });
  await page.waitForTimeout(holdMs(3));

  // Entry 3: habit-focused — forced to fail once to demonstrate the retry flow,
  // then allowed through for real so the feed/video end in a consistent state.
  const entry3 = 'Meditated for 10 minutes and read 20 pages of my book today.';
  await textarea.fill(entry3);
  await page.route('**/api/braindump', (route) => route.abort());
  await submitButton.click();
  console.log('[capture] capturing forced error + retry state...');
  await page.getByRole('button', { name: /retry/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: screenshotPath('screenshot-error-retry.png') });
  await page.waitForTimeout(holdMs(4));
  await page.unroute('**/api/braindump');
  const retryResponse = page.waitForResponse((r) => r.url().includes('/api/braindump') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /retry/i }).click();
  await retryResponse;
  await page.waitForTimeout(500);

  console.log('[capture] reloading to demonstrate the persisted feed...');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.getByText("Trader Joe's", { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(holdMs(5));

  console.log('[capture] triggering sweep-gated specialist jobs...');
  execFileSync('node', [path.join(__dirname, 'trigger-jobs.mjs')], { stdio: 'inherit' });
  await page.waitForTimeout(8000);

  console.log('[capture] reloading for insights panel...');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2000);

  console.log('[capture] narrating weekly synthesis card...');
  const weeklyCard = page.getByText("This Week's Insight", { exact: false }).first();
  await weeklyCard.waitFor({ state: 'visible', timeout: 15000 });
  await weeklyCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(holdMs(6));

  console.log('[capture] narrating enrichment cards...');
  const enrichmentCard = page.getByText('Sleep Pattern', { exact: false }).first();
  await enrichmentCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(holdMs(7));

  await page.screenshot({ path: screenshotPath('screenshot-insights-panel.png'), fullPage: true });
  await page.waitForTimeout(holdMs(8));

  // Best-effort voice dictation still — Chromium exposes webkitSpeechRecognition
  // even headless, so the button renders and isListening flips true on click
  // before any permission/network error resolves it back a moment later.
  try {
    const micButton = page.getByRole('button', { name: /voice input/i });
    if (await micButton.count() > 0) {
      await micButton.first().click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: screenshotPath('screenshot-voice-dictation.png') });
      console.log('[capture] captured voice dictation still');
    } else {
      console.log('[capture] mic button not present in this environment, skipping voice still');
    }
  } catch (err) {
    console.log('[capture] voice dictation still skipped (best-effort):', err.message);
  }

  console.log('[capture] closing recording context...');
  const videoHandle = page.video();
  await context.close();
  const rawVideoPath = await videoHandle.path();

  // Async pipeline still: separate, unrecorded context with HTTP Basic Auth
  // against Bull Board, admin-only view of the real BullMQ queues.
  try {
    const adminContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      httpCredentials: { username: 'admin', password: ADMIN_TOKEN },
    });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('http://localhost:3000/admin/queues', { waitUntil: 'networkidle', timeout: 15000 });
    await adminPage.waitForTimeout(1000);
    await adminPage.screenshot({ path: screenshotPath('screenshot-async-pipeline.png'), fullPage: true });
    console.log('[capture] captured async pipeline (Bull Board) still');
    await adminContext.close();
  } catch (err) {
    console.log('[capture] Bull Board still skipped (best-effort):', err.message);
  }

  await browser.close();

  console.log('[capture] converting recorded webm to mp4...');
  const noAudioMp4 = path.join(VIDEO_DIR, 'video-noaudio.mp4');
  execSync(`ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${noAudioMp4}"`, { stdio: 'inherit' });

  console.log('[capture] concatenating narration segments...');
  const listFile = path.join(NARRATION_DIR, 'concat-list.txt');
  const listContent = durations.map((d) => `file '${d.file}'`).join('\n');
  writeFileSync(listFile, listContent);
  const fullNarration = path.join(NARRATION_DIR, 'full.mp3');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${fullNarration}"`, { stdio: 'inherit' });

  console.log('[capture] muxing narration onto video...');
  const finalVideo = screenshotPath('demo-video.mp4');
  execSync(
    `ffmpeg -y -i "${noAudioMp4}" -i "${fullNarration}" -c:v copy -c:a aac -b:a 160k -map 0:v:0 -map 1:a:0 -shortest "${finalVideo}"`,
    { stdio: 'inherit' }
  );

  console.log('[capture] rendering thumbnail...');
  const thumbBrowser = await chromium.launch({ headless: true });
  const thumbPage = await thumbBrowser.newPage({ viewport: { width: 1120, height: 560 } });
  await thumbPage.goto(`file://${path.join(__dirname, 'thumbnail.html')}`);
  await thumbPage.waitForTimeout(500);
  await thumbPage.screenshot({ path: screenshotPath('thumbnail.png') });
  await thumbBrowser.close();

  console.log('[capture] done. Assets written to', ASSETS_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
