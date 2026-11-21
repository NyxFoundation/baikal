import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const scriptUrl = new URL('../design/landing.js', import.meta.url);
const source = readFileSync(scriptUrl, 'utf8');
const target = properties => Object.assign(new EventTarget(), properties);

function createClock() {
  const callbacks = new Map();
  let nextId = 0;
  let now = 0;
  return {
    request(callback) { callbacks.set(++nextId, callback); return nextId; },
    cancel(id) { callbacks.delete(id); },
    get pending() { return callbacks.size; },
    step(elapsed = 16) {
      now += elapsed;
      const ready = [...callbacks.values()];
      callbacks.clear();
      ready.forEach(callback => callback(now));
    },
  };
}

function createCanvas() {
  let size = { width: 700, height: 650 };
  let pixels = [];
  let paints = 0;
  let clipped = false;
  const context = {
    setTransform() {},
    clearRect() { pixels = []; paints += 1; },
    fillRect(x, y, width, height) {
      if (pixels.length < 16) pixels.push([x, y, width, height]);
      if (x < 0 || y < 0 || x + width > size.width || y + height > size.height) clipped = true;
    },
  };
  return {
    element: { getContext: () => context, getBoundingClientRect: () => size },
    resize(width, height) { size = { width, height }; },
    get pixels() { return pixels; },
    get paints() { return paints; },
    get clipped() { return clipped; },
    snapshot: () => JSON.stringify(pixels),
  };
}

function createEnvironment({ reducedMotion = false, canvasAvailable = true } = {}) {
  const clock = createClock();
  const canvas = createCanvas();
  const attributes = new Map();
  const classes = new Set();
  const observers = {};
  const preference = target({ matches: reducedMotion });
  const button = target({ hidden: true, setAttribute: (name, value) => attributes.set(name, value) });
  const menu = target({ querySelector: () => ({ focus() {} }), querySelectorAll: () => [], contains: () => false });
  const document = target({
    hidden: false,
    documentElement: { classList: { add: name => classes.add(name) } },
    getElementById: () => canvas.element,
    querySelector: selector => ({ '.site-menu': menu, '.motion-toggle': button })[selector],
  });
  if (!canvasAvailable) canvas.element.getContext = () => null;
  runInNewContext(source, {
    document,
    window: target({ devicePixelRatio: 3, matchMedia: () => preference }),
    getComputedStyle: () => ({ getPropertyValue: () => '#1531f5' }),
    requestAnimationFrame: callback => clock.request(callback),
    cancelAnimationFrame: id => clock.cancel(id),
    ResizeObserver: class { constructor(callback) { observers.resize = callback; } observe() {} },
    IntersectionObserver: class { constructor(callback) { observers.intersection = callback; } observe() {} },
  }, { filename: scriptUrl.pathname });
  observers.intersection?.([{ isIntersecting: true }]);
  return {
    clock, canvas, button, attributes, classes,
    click() { button.dispatchEvent(new Event('click')); },
    reduce(matches) { preference.matches = matches; preference.dispatchEvent(new Event('change')); },
    intersect(isIntersecting) { observers.intersection([{ isIntersecting }]); },
    hide(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); },
    resize(width, height) { canvas.resize(width, height); observers.resize(); },
  };
}

function assertPixelsNear(actual, expected) {
  actual.forEach((pixel, i) => pixel.forEach((value, axis) => {
    assert.ok(Math.abs(value - expected[i][axis]) < 1e-8, `Pixel ${i}, axis ${axis} changed`);
  }));
}

test('should rotate without scrolling when the figure is visible', () => {
  const env = createEnvironment();
  env.clock.step();
  const initial = env.canvas.snapshot();
  env.clock.step();
  assert.notEqual(env.canvas.snapshot(), initial);
  assert.equal(env.clock.pending, 1);
});

test('should freeze and resume from the same angle when the user pauses motion', () => {
  const env = createEnvironment();
  env.clock.step();
  env.clock.step();
  env.click();
  env.clock.step();
  const paused = env.canvas.snapshot();
  assert.equal(env.attributes.get('aria-pressed'), 'true');
  assert.equal(env.clock.pending, 0);
  env.clock.step(60_000);
  assert.equal(env.canvas.snapshot(), paused);
  env.click();
  env.clock.step();
  assert.equal(env.canvas.snapshot(), paused);
  env.clock.step();
  assert.notEqual(env.canvas.snapshot(), paused);
  assert.equal(env.attributes.get('aria-pressed'), 'false');
});

test('should render a still figure when reduced motion is enabled on load', () => {
  const env = createEnvironment({ reducedMotion: true });
  env.clock.step();
  const initial = env.canvas.snapshot();
  assert.ok(env.canvas.paints > 0);
  assert.equal(env.button.disabled, true);
  assert.equal(env.attributes.get('aria-pressed'), 'true');
  env.clock.step(1000);
  assert.equal(env.canvas.snapshot(), initial);
  assert.equal(env.clock.pending, 0);
  env.reduce(false);
  env.clock.step();
  env.clock.step();
  assert.notEqual(env.canvas.snapshot(), initial);
  assert.equal(env.button.disabled, false);
});

test('should stop immediately when reduced motion changes during playback', () => {
  const env = createEnvironment();
  env.clock.step();
  env.clock.step();
  const moving = env.canvas.snapshot();
  env.reduce(true);
  env.clock.step(1000);
  assert.equal(env.canvas.snapshot(), moving);
  assert.equal(env.clock.pending, 0);
  assert.equal(env.button.disabled, true);
});

test('should preserve a manual pause when the system motion preference changes', () => {
  const env = createEnvironment();
  env.clock.step();
  env.click();
  env.clock.step();
  const paused = env.canvas.snapshot();
  env.reduce(true);
  env.reduce(false);
  env.clock.step();
  env.clock.step(1000);
  assert.equal(env.canvas.snapshot(), paused);
  assert.equal(env.attributes.get('aria-pressed'), 'true');
  assert.equal(env.button.disabled, false);
  assert.equal(env.clock.pending, 0);
});

for (const reason of ['offscreen', 'hidden tab']) {
  test(`should stop drawing and resume without a jump when returning from ${reason}`, () => {
    const env = createEnvironment();
    const suspend = active => reason === 'offscreen' ? env.intersect(!active) : env.hide(active);
    env.clock.step();
    env.clock.step();
    const initial = env.canvas.snapshot();
    const paints = env.canvas.paints;
    suspend(true);
    assert.equal(env.clock.pending, 0);
    env.resize(700, 650);
    env.clock.step(60_000);
    assert.equal(env.canvas.paints, paints);
    suspend(false);
    env.clock.step();
    assert.equal(env.canvas.snapshot(), initial);
    env.clock.step();
    assert.notEqual(env.canvas.snapshot(), initial);
  });
}

test('should cancel a pending still repaint when a paused figure leaves the viewport', () => {
  const env = createEnvironment({ reducedMotion: true });
  env.intersect(false);
  env.clock.step();
  assert.equal(env.canvas.paints, 0);
  assert.equal(env.clock.pending, 0);
});

test('should redraw once without restarting motion when a paused canvas resizes', () => {
  const env = createEnvironment();
  env.clock.step();
  env.click();
  env.clock.step();
  const paints = env.canvas.paints;
  env.resize(320, 300);
  env.clock.step();
  assert.equal(env.canvas.paints, paints + 1);
  assert.equal(env.canvas.element.width, 640);
  assert.equal(env.canvas.element.height, 600);
  env.clock.step();
  assert.equal(env.canvas.paints, paints + 1);
  assert.equal(env.clock.pending, 0);
});

test('should keep a single animation loop when resize and visibility events repeat', () => {
  const env = createEnvironment();
  env.clock.step();
  for (let i = 0; i < 5; i++) {
    env.resize(700, 650);
    env.intersect(true);
    env.hide(false);
    env.reduce(false);
  }
  assert.equal(env.clock.pending, 1);
  const paints = env.canvas.paints;
  env.clock.step();
  assert.equal(env.canvas.paints, paints + 1);
  assert.equal(env.clock.pending, 1);
});

test('should rotate at the same speed when frame intervals differ', () => {
  const fast = createEnvironment();
  const slow = createEnvironment();
  fast.clock.step(0);
  slow.clock.step(0);
  for (let i = 0; i < 100; i++) fast.clock.step(10);
  for (let i = 0; i < 50; i++) slow.clock.step(20);
  assertPixelsNear(fast.canvas.pixels, slow.canvas.pixels);
});

test('should complete a full turn without clipping when motion runs for ninety seconds', () => {
  const env = createEnvironment();
  env.clock.step(0);
  const initial = env.canvas.pixels;
  for (let i = 0; i < 45; i++) env.clock.step(1000);
  assert.notEqual(env.canvas.snapshot(), JSON.stringify(initial));
  for (let i = 0; i < 45; i++) env.clock.step(1000);
  assertPixelsNear(env.canvas.pixels, initial);
  assert.equal(env.canvas.clipped, false);
});

test('should retain the static illustration when a Canvas context is unavailable', () => {
  const env = createEnvironment({ canvasAvailable: false });
  assert.equal(env.button.hidden, true);
  assert.equal(env.classes.has('has-field'), false);
  assert.equal(env.clock.pending, 0);
});
