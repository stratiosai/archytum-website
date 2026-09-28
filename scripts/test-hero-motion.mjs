import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const code = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function setup({ reduced = false, saveData = false, rejectPlay = false, webm = true } = {}) {
  const events = () => ({
    listeners: {},
    addEventListener(name, fn) { (this.listeners[name] ??= []).push(fn); },
    fire(name) { for (const fn of this.listeners[name] ?? []) fn(); },
  });
  const video = {
    ...events(), src: '', paused: true, hidden: false, muted: true,
    dataset: { src: '/media/video.mp4', webm: '/media/video.webm' },
    canPlayType: () => webm ? 'probably' : '',
    async play() { if (rejectPlay) throw new Error('autoplay blocked'); this.paused = false; this.fire('play'); },
    pause() { this.paused = true; this.fire('pause'); },
  };
  const button = { ...events(), hidden: true, textContent: 'Play background video' };
  const motion = { ...events(), matches: reduced };
  const document = { ...events(), hidden: false, querySelector: (s) => s === '#hero-video' ? video : button };
  runInNewContext(code, { document, window: { matchMedia: () => motion }, navigator: { connection: { saveData } } });
  return { video, button, motion, document };
}

test('default playback is muted, uses WebM, and supports pause/resume', () => {
  const { video, button } = setup();
  assert.equal(video.src, '/media/video.webm');
  assert.equal(video.muted, true);
  assert.equal(video.paused, false);
  button.fire('click');
  assert.equal(video.paused, true);
  assert.equal(button.textContent, 'Play background video');
  button.fire('click');
  assert.equal(video.paused, false);
});

test('MP4 fallback is selected when WebM is unsupported', () => {
  assert.equal(setup({ webm: false }).video.src, '/media/video.mp4');
});

for (const mode of ['reduced', 'saveData']) {
  test(`${mode} does not load video until explicitly requested`, () => {
    const { video, button } = setup({ [mode]: true });
    assert.equal(video.src, '');
    assert.equal(video.paused, true);
    button.fire('click');
    assert.equal(video.paused, false);
  });
}

test('live reduced-motion change stops video and reveals still fallback', () => {
  const { video, motion } = setup();
  motion.matches = true;
  motion.fire('change');
  assert.equal(video.paused, true);
  assert.equal(video.hidden, true);
});

test('background tab pauses and a manual pause survives tab return', () => {
  const { video, button, document } = setup();
  document.hidden = true; document.fire('visibilitychange');
  assert.equal(video.paused, true);
  document.hidden = false; document.fire('visibilitychange');
  assert.equal(video.paused, false);
  button.fire('click');
  document.hidden = true; document.fire('visibilitychange');
  document.hidden = false; document.fire('visibilitychange');
  assert.equal(video.paused, true);
});

test('autoplay rejection leaves manual playback available', async () => {
  const { video, button } = setup({ rejectPlay: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(video.paused, true);
  assert.equal(button.hidden, false);
  assert.equal(button.textContent, 'Play background video');
});

test('media failure retains the still image and hides the unusable control', () => {
  const { video, button } = setup();
  video.fire('error');
  assert.equal(video.hidden, true);
  assert.equal(button.hidden, true);
});
