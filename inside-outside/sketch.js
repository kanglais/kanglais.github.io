// ─── Constants ───────────────────────────────────────────────────────────────
const CELL_SIZE = 20;
const channel = new BroadcastChannel('inside-outside');

// ─── Global state ────────────────────────────────────────────────────────────
let glucoseRaw, glucoseData;
let audio;
let particles = [];
let flowField = [];
let cols, rows;
let noiseZ = 0;
let currentParams, targetParams;

// ─── Glucose → visual parameter mapping ──────────────────────────────────────
// stress: 1.0 = extreme low (35 mg/dL, panic), 0.0 = extreme high (425 mg/dL, haze)
function glucoseToParams(glucose) {
  const stress = map(glucose, 425, 35, 0, 1, true);
  return {
    particleCount: floor(map(stress, 0, 1, 50, 500)),
    speedMult:     map(stress, 0, 1, 0.15, 4.0),
    trailLength:   floor(map(stress, 0, 1, 10, 60)),
    trailOpacity:  map(stress, 0, 1, 40, 255),
    noiseZRate:    map(stress, 0, 1, 0.00005, 0.005),
    trailR:        map(stress, 0, 1, 58, 255),
    trailG:        map(stress, 0, 1, 40, 250),
    trailB:        map(stress, 0, 1, 0, 204),
    bgR:           4,
    bgG:           4,
    bgB:           map(stress, 0, 1, 4, 14),
  };
}

// Smoothly interpolate currentParams toward targetParams each frame
function lerpParams() {
  const t = 0.4;
  for (const key of Object.keys(currentParams)) {
    currentParams[key] = lerp(currentParams[key], targetParams[key], t);
  }
}

// Update flow field grid with 3D Perlin noise angles; advance z by glucose-driven rate
function updateFlowField() {
  noiseZ += currentParams.noiseZRate;
  const noiseScale = 0.004;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const angle = noise(x * noiseScale, y * noiseScale, noiseZ) * TWO_PI * 2;
      flowField[y * cols + x] = p5.Vector.fromAngle(angle);
    }
  }
}

// ─── Particle class ──────────────────────────────────────────────────────────
class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(0.5);
    this.history = [];
  }

  update() {
    const col = constrain(floor(this.pos.x / CELL_SIZE), 0, cols - 1);
    const row = constrain(floor(this.pos.y / CELL_SIZE), 0, rows - 1);
    const force = flowField[row * cols + col].copy();

    this.vel.add(force.mult(0.5));
    this.vel.limit(currentParams.speedMult * 3);
    this.pos.add(this.vel);

    this.history.push(this.pos.copy());
    if (this.history.length > currentParams.trailLength) {
      this.history.shift();
    }

    // Wrap edges
    if (this.pos.x < 0)      this.pos.x = width;
    if (this.pos.x > width)  this.pos.x = 0;
    if (this.pos.y < 0)      this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  draw() {
    if (this.history.length < 1) return;
    noStroke();
    // slow particles = large blobs, fast particles = small blobs
    const maxR = map(currentParams.speedMult, 0.15, 4.0, 10, 2);
    for (let i = 0; i < this.history.length; i++) {
      const t = i / (this.history.length - 1 || 1); // 0 = tail, 1 = head
      const alpha = map(t, 0, 1, 0, currentParams.trailOpacity);
      const r = map(t, 0, 1, 0.5, maxR);
      fill(currentParams.trailR, currentParams.trailG, currentParams.trailB, alpha);
      circle(this.history[i].x, this.history[i].y, r * 2);
    }
  }
}

// Add or remove particles to match floor(currentParams.particleCount)
function adjustParticles() {
  const target = floor(currentParams.particleCount);
  while (particles.length < target) particles.push(new Particle());
  while (particles.length > target) particles.pop();
}

// ─── Lifecycle functions ─────────────────────────────────────────────────────
function preload() {
  glucoseRaw = loadJSON('glucose.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  strokeCap(ROUND);

  glucoseData = glucoseRaw.readings;
  audio = document.getElementById('soundscape');

  cols = ceil(width / CELL_SIZE);
  rows = ceil(height / CELL_SIZE);
  flowField = new Array(cols * rows);

  currentParams = glucoseToParams(160);
  targetParams = { ...currentParams };

  for (let i = 0; i < currentParams.particleCount; i++) {
    particles.push(new Particle());
  }

  background(currentParams.bgR, currentParams.bgG, currentParams.bgB);
  noLoop();
}

function draw() {
  const pos = audio.currentTime;
  const dur = audio.duration;
  if (!dur || isNaN(dur)) return;
  const idx = constrain(floor(pos / dur * glucoseData.length), 0, glucoseData.length - 1);
  const glucose = glucoseData[idx];

  targetParams = glucoseToParams(glucose);
  if (frameCount % 6 === 0) {
    channel.postMessage({ currentTime: pos, duration: dur, glucose });
  }
  lerpParams();
  updateFlowField();
  adjustParticles();

  // Semi-transparent rect creates trail fade effect
  noStroke();
  fill(currentParams.bgR, currentParams.bgG, currentParams.bgB, 25);
  rect(0, 0, width, height);

  for (const p of particles) {
    p.update();
    p.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = ceil(width / CELL_SIZE);
  rows = ceil(height / CELL_SIZE);
  flowField = new Array(cols * rows);
  updateFlowField();
}

function togglePlay() {
  if (!audio.paused) {
    audio.pause();
    noLoop();
    document.getElementById('play-btn').textContent = '▶';
  } else {
    audio.play();
    loop();
    document.getElementById('play-btn').textContent = '⏸';
  }
}

function keyPressed() {
  if (key === ' ') {
    togglePlay();
    return false; // prevent page scroll
  }
  if (key === 'f' || key === 'F') {
    fullscreen(!fullscreen());
  }
  if (key === 'r' || key === 'R') {
    audio.pause();
    audio.currentTime = 0;
    noLoop();
    particles = [];
    noiseZ = 0;
    currentParams = glucoseToParams(160);
    targetParams = { ...currentParams };
    background(currentParams.bgR, currentParams.bgG, currentParams.bgB);
    document.getElementById('play-btn').textContent = '▶';
  }
}
