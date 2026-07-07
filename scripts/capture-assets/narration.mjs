// Generates the voiceover for demo-video.mp4 with edge-tts (free, no API key,
// run ephemerally via `uvx` so no Python dependency is added anywhere), then
// probes each clip's real duration with ffmpeg so capture.mjs can pace the
// Playwright recording to match the narration instead of guessing timings.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NARRATION_DIR = path.join(__dirname, 'narration');
const VOICE = 'en-US-AriaNeural';

mkdirSync(NARRATION_DIR, { recursive: true });

const lines = JSON.parse(readFileSync(path.join(__dirname, 'narration-script.json'), 'utf8'));

function getDurationMs(file) {
  const output = execFileSync('sh', ['-c', `ffmpeg -i "${file}" -f null - 2>&1`], { encoding: 'utf8' });
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!match) throw new Error(`Could not parse duration for ${file}:\n${output}`);
  const [, hh, mm, ss] = match;
  return (Number(hh) * 3600 + Number(mm) * 60 + Number(ss)) * 1000;
}

const durations = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const outFile = path.join(NARRATION_DIR, `segment-${i}.mp3`);
  console.log(`[narration] synthesizing segment ${i}: "${line.slice(0, 60)}..."`);
  execFileSync('uvx', ['edge-tts', '--text', line, '--voice', VOICE, '--write-media', outFile], { stdio: 'inherit' });
  const ms = getDurationMs(outFile);
  console.log(`[narration] segment ${i} duration: ${Math.round(ms)}ms`);
  durations.push({ segment: i, file: outFile, ms });
}

writeFileSync(path.join(NARRATION_DIR, 'durations.json'), JSON.stringify(durations, null, 2));
console.log(`[narration] wrote ${durations.length} segments + durations.json`);
