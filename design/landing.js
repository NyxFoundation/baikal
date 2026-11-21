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

function createProjection(angle) {
  const cosYaw = Math.cos(0.55 + angle);
  const sinYaw = Math.sin(0.55 + angle);
  const cosPitch = Math.cos(0.7);
  const sinPitch = Math.sin(0.7);
  const cosRoll = Math.cos(-0.48);
  const sinRoll = Math.sin(-0.48);
  return ([x, y, z]) => {
    const rx = x * cosYaw - z * sinYaw;
    const rz = x * sinYaw + z * cosYaw;
    const ry = y * cosPitch - rz * sinPitch;
    const depth = y * sinPitch + rz * cosPitch;
    return [rx * cosRoll - ry * sinRoll, rx * sinRoll + ry * cosRoll, depth];
  };
}

function paintField(canvas, context, points, angle, color) {
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
  const project = createProjection(angle);
  // Leave room for the dispersed points throughout a complete rotation.
  const scale = Math.min(width, height) * 0.12;
  for (const point of points) {
    const [x, y, z] = project(point.position);
    const perspective = 7 / (7 + z);
    const size = Math.max(0.75, width / 480) * perspective;
    context.globalAlpha = Math.min(1, (0.55 - z * 0.14) * point.opacity);
    context.fillRect(width / 2 + x * scale * perspective, height / 2 + y * scale * perspective, size, size);
  }
  context.globalAlpha = 1;
}

function createFieldAnimation(paint) {
  let state = { active: false, frame: null, time: null, angle: 0 };
  const draw = timestamp => {
    const elapsed = state.time === null ? 0 : timestamp - state.time;
    const angle = state.active
      ? (state.angle + elapsed * Math.PI * 2 / 90000) % (Math.PI * 2) : state.angle;
    state = { ...state, frame: null, time: state.active ? timestamp : null, angle };
    paint(angle);
    if (state.active) schedule();
  };
  const schedule = () => {
    if (state.frame !== null) return;
    state = { ...state, frame: requestAnimationFrame(draw) };
  };
  return {
    setActive(active) {
      if (!active && state.frame !== null) cancelAnimationFrame(state.frame);
      state = { ...state, active, frame: active ? state.frame : null,
        time: active && state.active ? state.time : null };
      if (active) schedule();
    },
    redraw: schedule,
  };
}

function initField() {
  const canvas = document.getElementById("frontier-field");
  const context = canvas.getContext("2d");
  if (!context) return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const color = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim();
  const points = createPoints();
  const animation = createFieldAnimation(angle => paintField(canvas, context, points, angle, color));
  let visible = false;
  const updateMotion = () => {
    const onScreen = visible && !document.hidden;
    animation.setActive(onScreen && !preference.matches);
    if (onScreen) animation.redraw();
  };
  preference.addEventListener("change", updateMotion);
  new ResizeObserver(updateMotion).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateMotion();
  }).observe(canvas);
  document.addEventListener("visibilitychange", updateMotion);
  document.documentElement.classList.add("has-field");
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
