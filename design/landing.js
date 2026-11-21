"use strict";

function knotPoint(angle) {
  const radius = 1.7 + 0.55 * Math.cos(3 * angle);
  return [radius * Math.cos(2 * angle), radius * Math.sin(2 * angle), 0.85 * Math.sin(3 * angle)];
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function createPoints() {
  const noise = seed => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value) - 0.5;
  };
  return Array.from({ length: 7600 }, (_, index) => {
    const angle = Math.floor(index / 40) / 190 * Math.PI * 2;
    const around = index % 40 / 40 * Math.PI * 2;
    const center = knotPoint(angle);
    const next = knotPoint(angle + 0.001);
    const tangent = normalize(next.map((value, axis) => value - center[axis]));
    const normal = normalize(cross(tangent, [0, 0, 1]));
    const binormal = cross(tangent, normal);
    const spread = Math.max(0, Math.sin(angle - 0.4)) ** 18;
    const radius = 0.38 + 0.06 * Math.cos(angle * 3);
    const position = center.map((value, axis) => value
      + radius * (normal[axis] * Math.cos(around) + binormal[axis] * Math.sin(around))
      + noise(index * 3 + axis) * (0.025 + spread * 1.5));
    return { position, opacity: 1 - spread * 0.4 };
  });
}

function projectPoint(position, turn) {
  const [x, y, z] = position;
  const yaw = 0.55 + turn * 0.65;
  const pitch = 0.7;
  const roll = -0.48;
  const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
  const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
  const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
  return [rx * Math.cos(roll) - ry * Math.sin(roll), rx * Math.sin(roll) + ry * Math.cos(roll), depth];
}

function paintField(canvas, context, points, turn, color) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = color;
  const scale = Math.min(width * 0.175, height * 0.19);
  for (const point of points) {
    const [x, y, z] = projectPoint(point.position, turn);
    const perspective = 7 / (7 + z);
    const size = Math.max(0.75, width / 480) * perspective;
    context.globalAlpha = Math.min(1, (0.55 - z * 0.14) * point.opacity);
    context.fillRect(width / 2 + x * scale * perspective, height / 2 + y * scale * perspective, size, size);
  }
  context.globalAlpha = 1;
}

function initField() {
  const canvas = document.getElementById("frontier-field");
  const context = canvas.getContext("2d");
  if (!context) return;
  const hero = document.querySelector(".hero");
  const button = document.querySelector(".motion-toggle");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const color = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim();
  const points = createPoints();
  let state = { paused: false, visible: true, pending: false, turn: 0 };
  const schedule = () => {
    if (state.pending || !state.visible || document.hidden) return;
    state = { ...state, pending: true };
    requestAnimationFrame(() => {
      const turn = state.paused || preference.matches ? state.turn
        : Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / hero.offsetHeight));
      state = { ...state, pending: false, turn };
      paintField(canvas, context, points, turn, color);
    });
  };
  const updateMotion = () => {
    button.disabled = preference.matches;
    button.setAttribute("aria-pressed", String(state.paused || preference.matches));
    schedule();
  };
  button.addEventListener("click", () => {
    state = { ...state, paused: !state.paused };
    updateMotion();
  });
  preference.addEventListener("change", updateMotion);
  new ResizeObserver(schedule).observe(canvas);
  new IntersectionObserver(([entry]) => {
    state = { ...state, visible: entry.isIntersecting };
    schedule();
  }).observe(canvas);
  window.addEventListener("scroll", schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule);
  document.documentElement.classList.add("has-field");
  button.hidden = false;
  updateMotion();
}

function initMenu() {
  const menu = document.querySelector(".site-menu");
  const summary = menu.querySelector("summary");
  menu.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !menu.open) return;
    menu.open = false;
    summary.focus();
  });
  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menu.open = false;
      document.getElementById(link.hash.slice(1)).focus({ preventScroll: true });
    });
  });
  document.addEventListener("click", event => {
    if (!menu.contains(event.target)) menu.open = false;
  });
}

initMenu();
initField();
