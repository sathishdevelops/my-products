const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const namer = document.getElementById("namer");
const namerLabel = document.getElementById("namer-label");
const nameInput = document.getElementById("name-input");
const petMenu = document.getElementById("pet-menu");
const SCALE = 5;
const MAX_PETS = 6;
const STORAGE_KEY = "deskpet-roster";
const SETTINGS_KEY = "deskpet-settings";
const EDGES = ["floor", "ceiling", "left", "right"];

const pets = [];
const hearts = [];
let displays = [{ id: 0, x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }];
let paused = false;
let showNames = true;
let width = window.innerWidth;
let height = window.innerHeight;
let held = null;
let dragging = false;
let holdOffsetX = 0;
let holdOffsetY = 0;
let lastOverPet = false;
let naming = null;
let menuPetId = null;
let cursor = { x: 0, y: 0, stillSince: performance.now(), moving: false };

function speciesLabel(species) {
  return DESKPET_SPRITES[species]?.name || "Pet";
}

function petSize(species) {
  const spec = DESKPET_SPRITES[species];
  return { w: spec.w * SCALE, h: spec.h * SCALE };
}

function cleanName(raw, fallback) {
  const name = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  return name || fallback;
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (typeof s.showNames === "boolean") showNames = s.showNames;
  } catch {
    /* ignore */
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      pets.map((p) => ({
        species: p.species,
        name: p.name,
        x: p.x,
        y: p.y,
        edge: p.edge,
        displayId: p.displayId,
        paused: p.paused,
      })),
    ),
  );
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showNames }));
  window.deskpet?.syncPets(
    pets.map((p) => ({ id: p.id, name: p.name, species: p.species, paused: p.paused })),
  );
  window.deskpet?.syncShowNames(showNames);
}

function setShowNames(value) {
  showNames = value;
  persist();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

function areaById(id) {
  return displays.find((d) => d.id === id) || displays[0];
}

function areaAt(x, y) {
  return (
    displays.find((d) => x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) ||
    displays[0]
  );
}

function edgeGeom(pet) {
  const area = areaById(pet.displayId);
  const { w, h } = petSize(pet.species);
  const pad = 4;
  if (pet.edge === "ceiling") {
    return { axis: "x", y: area.y + pad, xMin: area.x + pad, xMax: area.x + area.w - w - pad };
  }
  if (pet.edge === "left") {
    return { axis: "y", x: area.x + pad, yMin: area.y + pad, yMax: area.y + area.h - h - pad };
  }
  if (pet.edge === "right") {
    return { axis: "y", x: area.x + area.w - w - pad, yMin: area.y + pad, yMax: area.y + area.h - h - pad };
  }
  return { axis: "x", y: area.y + area.h - h - pad, xMin: area.x + pad, xMax: area.x + area.w - w - pad };
}

function snapToEdge(pet) {
  const g = edgeGeom(pet);
  if (g.axis === "x") {
    pet.y = g.y;
    pet.x = Math.min(g.xMax, Math.max(g.xMin, pet.x));
  } else {
    pet.x = g.x;
    pet.y = Math.min(g.yMax, Math.max(g.yMin, pet.y));
  }
}

function nearestEdge(area, x, y, species) {
  const { w, h } = petSize(species);
  const scores = [
    { edge: "floor", d: Math.abs(y - (area.y + area.h - h / 2)) },
    { edge: "ceiling", d: Math.abs(y - (area.y + h / 2)) },
    { edge: "left", d: Math.abs(x - (area.x + w / 2)) },
    { edge: "right", d: Math.abs(x - (area.x + area.w - w / 2)) },
  ];
  scores.sort((a, b) => a.d - b.d);
  return scores[0].edge;
}

function petBox(pet) {
  const { w, h } = petSize(pet.species);
  return { x: pet.x, y: pet.y, w, h };
}

function hitTest(pet, mx, my) {
  const b = petBox(pet);
  const pad = 8;
  const topExtra = showNames ? 22 : 0;
  return mx >= b.x - pad && mx <= b.x + b.w + pad && my >= b.y - topExtra && my <= b.y + b.h + pad;
}

function petAt(mx, my) {
  for (let i = pets.length - 1; i >= 0; i--) {
    if (hitTest(pets[i], mx, my)) return pets[i];
  }
  return null;
}

function pickState() {
  const roll = Math.random();
  if (roll < 0.42) return "walk";
  if (roll < 0.58) return "chase";
  if (roll < 0.74) return "idle";
  if (roll < 0.88) return "sit";
  return "sleep";
}

function spawn(species, name, saved) {
  if (pets.length >= MAX_PETS) return;
  const area = saved?.displayId != null ? areaById(saved.displayId) : displays[0];
  const pet = {
    id: crypto.randomUUID(),
    species,
    name: cleanName(name, speciesLabel(species)),
    displayId: area?.id ?? displays[0].id,
    edge: EDGES.includes(saved?.edge) ? saved.edge : "floor",
    x: typeof saved?.x === "number" ? saved.x : area.x + 80 + Math.random() * Math.max(40, area.w - 200),
    y: typeof saved?.y === "number" ? saved.y : area.y + area.h - 80,
    vx: 0,
    vy: 0,
    dir: Math.random() < 0.5 ? -1 : 1,
    state: "walk",
    paused: Boolean(saved?.paused),
    stateUntil: performance.now() + 2000 + Math.random() * 4000,
    hopUntil: 0,
    speed: 34 + Math.random() * 22,
  };
  snapToEdge(pet);
  pets.push(pet);
  persist();
}

function setState(pet, state, now) {
  pet.state = state;
  pet.stateUntil = now + 1600 + Math.random() * 4500;
  if (state === "walk") pet.dir = Math.random() < 0.5 ? -1 : 1;
  if (state === "chase") pet.stateUntil = now + 2200 + Math.random() * 1800;
}

function addHeart(x, y) {
  hearts.push({
    x,
    y,
    life: 1,
    vx: (Math.random() - 0.5) * 30,
    vy: -40 - Math.random() * 30,
  });
}

function hop(pet, now) {
  pet.hopUntil = now + 420;
  pet.vy = 0;
  pet.vx = 0;
  if (pet.edge === "floor") pet.vy = -340;
  else if (pet.edge === "ceiling") pet.vy = 260;
  else if (pet.edge === "left") pet.vx = 240;
  else pet.vx = -240;
}

function frameName(pet, now) {
  if (pet.state === "sit") return "sit";
  if (pet.state === "sleep") return "sleep";
  if (pet.state === "walk" || pet.state === "chase") {
    return Math.floor(now / 160) % 2 === 0 ? "walk1" : "walk2";
  }
  return "idle";
}

function uiOpen() {
  return Boolean(naming || menuPetId);
}

function openNamer(session) {
  hidePetMenu();
  naming = session;
  namerLabel.textContent =
    session.mode === "add" ? `Name your ${speciesLabel(session.species)}` : "Rename this pet";
  nameInput.value = session.value;
  namer.classList.remove("hidden");
  window.deskpet?.setIgnoreMouse(false);
  lastOverPet = true;
  setTimeout(() => {
    nameInput.focus();
    nameInput.select();
  }, 30);
}

function closeNamer() {
  naming = null;
  namer.classList.add("hidden");
  nameInput.blur();
  lastOverPet = false;
  window.deskpet?.setIgnoreMouse(true);
}

function submitNamer() {
  if (!naming) return;
  const fallback =
    naming.mode === "add"
      ? speciesLabel(naming.species)
      : pets.find((p) => p.id === naming.id)?.name || "Pet";
  const name = cleanName(nameInput.value, fallback);
  if (naming.mode === "add") spawn(naming.species, name);
  else {
    const pet = pets.find((p) => p.id === naming.id);
    if (pet) {
      pet.name = name;
      persist();
    }
  }
  closeNamer();
}

function hidePetMenu() {
  menuPetId = null;
  petMenu.classList.add("hidden");
}

function showPetMenu(pet, x, y) {
  menuPetId = pet.id;
  const pauseBtn = petMenu.querySelector('[data-act="pause"]');
  pauseBtn.textContent = pet.paused ? "Resume" : "Pause";
  petMenu.classList.remove("hidden");
  const left = Math.min(width - 160, Math.max(8, x));
  const top = Math.min(height - 120, Math.max(8, y));
  petMenu.style.left = `${left}px`;
  petMenu.style.top = `${top}px`;
  window.deskpet?.setIgnoreMouse(false);
  lastOverPet = true;
}

function removePet(id) {
  const i = pets.findIndex((p) => p.id === id);
  if (i >= 0) pets.splice(i, 1);
  persist();
}

function maybeCornerClimb(pet) {
  const g = edgeGeom(pet);
  const area = areaById(pet.displayId);
  if (g.axis === "x") {
    if (pet.x <= g.xMin + 1) {
      pet.edge = "left";
      pet.dir = pet.edge === "floor" || pet.y > area.y + area.h / 2 ? -1 : 1;
      snapToEdge(pet);
    } else if (pet.x >= g.xMax - 1) {
      pet.edge = "right";
      pet.dir = pet.y > area.y + area.h / 2 ? -1 : 1;
      snapToEdge(pet);
    }
  } else if (pet.y <= g.yMin + 1) {
    pet.edge = "ceiling";
    pet.dir = pet.x < area.x + area.w / 2 ? 1 : -1;
    snapToEdge(pet);
  } else if (pet.y >= g.yMax - 1) {
    pet.edge = "floor";
    pet.dir = pet.x < area.x + area.w / 2 ? 1 : -1;
    snapToEdge(pet);
  }
}

function walkAlong(pet, dir, dt) {
  const g = edgeGeom(pet);
  const step = dir * pet.speed * dt;
  if (g.axis === "x") {
    pet.x += step;
    pet.dir = dir;
    pet.x = Math.min(g.xMax, Math.max(g.xMin, pet.x));
  } else {
    pet.y += step;
    pet.dir = pet.edge === "left" ? -1 : 1;
    pet.y = Math.min(g.yMax, Math.max(g.yMin, pet.y));
  }
  maybeCornerClimb(pet);
}

function chase(pet, dt, now) {
  const area = areaAt(cursor.x, cursor.y);
  if (area.id !== pet.displayId) {
    pet.state = "walk";
    return;
  }
  const want = nearestEdge(area, cursor.x, cursor.y, pet.species);
  if (want !== pet.edge && Math.random() < 0.04) {
    pet.edge = want;
    snapToEdge(pet);
  }
  const g = edgeGeom(pet);
  let target;
  let pos;
  if (g.axis === "x") {
    target = Math.min(g.xMax, Math.max(g.xMin, cursor.x - petSize(pet.species).w / 2));
    pos = pet.x;
  } else {
    target = Math.min(g.yMax, Math.max(g.yMin, cursor.y - petSize(pet.species).h / 2));
    pos = pet.y;
  }
  const delta = target - pos;
  if (Math.abs(delta) < 6) {
    if (now > pet.stateUntil) setState(pet, "idle", now);
    return;
  }
  walkAlong(pet, Math.sign(delta), dt);
}

function tickHop(pet, dt, now) {
  const g = edgeGeom(pet);
  if (g.axis === "x") {
    const grav = pet.edge === "floor" ? 980 : -980;
    pet.vy += grav * dt;
    pet.y += pet.vy * dt;
    const landed =
      pet.edge === "floor" ? pet.y >= g.y : pet.y <= g.y;
    if (landed || now > pet.hopUntil) {
      pet.y = g.y;
      pet.vy = 0;
      pet.hopUntil = 0;
    }
  } else {
    const grav = pet.edge === "left" ? -980 : 980;
    pet.vx += grav * dt;
    pet.x += pet.vx * dt;
    const landed =
      pet.edge === "left" ? pet.x <= g.x : pet.x >= g.x;
    if (landed || now > pet.hopUntil) {
      pet.x = g.x;
      pet.vx = 0;
      pet.hopUntil = 0;
    }
  }
}

function tick(dt, now) {
  const cursorDelta = Math.hypot(cursor.x - (cursor._px || 0), cursor.y - (cursor._py || 0));
  if (cursorDelta > 6) {
    cursor.stillSince = now;
    cursor.moving = true;
  } else if (now - cursor.stillSince > 450) {
    cursor.moving = false;
  }
  cursor._px = cursor.x;
  cursor._py = cursor.y;

  if (paused && !held) return;

  for (const pet of pets) {
    if (held && held.id === pet.id) continue;
    if (pet.paused) continue;

    if (pet.hopUntil > now) {
      tickHop(pet, dt, now);
      continue;
    }

    snapToEdge(pet);

    if (now > pet.stateUntil) setState(pet, pickState(), now);

    if (pet.state === "chase" && !cursor.moving) chase(pet, dt, now);
    else if (pet.state === "chase" && cursor.moving) setState(pet, "walk", now);
    else if (pet.state === "walk") walkAlong(pet, pet.dir, dt);
  }

  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.vy += 20 * dt;
    h.life -= dt * 0.9;
    if (h.life <= 0) hearts.splice(i, 1);
  }
}

function drawHeart(x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = "#ef5d7a";
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.bezierCurveTo(x, y, x - 10, y, x - 10, y + 8);
  ctx.bezierCurveTo(x - 10, y + 16, x, y + 20, x, y + 24);
  ctx.bezierCurveTo(x, y + 20, x + 10, y + 16, x + 10, y + 8);
  ctx.bezierCurveTo(x + 10, y, x, y, x, y + 6);
  ctx.fill();
  ctx.restore();
}

function drawName(pet) {
  if (!showNames) return;
  const b = petBox(pet);
  ctx.font = "650 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const x = b.x + b.w / 2;
  const y = b.y - 6;
  const w = ctx.measureText(pet.name).width;
  ctx.fillStyle = "rgba(255, 253, 248, 0.92)";
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 6, y - 14, w + 12, 18, 8);
  ctx.fill();
  ctx.fillStyle = "#1c1917";
  ctx.fillText(pet.name, x, y);
}

function draw(now) {
  ctx.clearRect(0, 0, width, height);
  for (const pet of pets) {
    const flip = pet.dir > 0;
    deskpetDrawSprite(ctx, pet.species, frameName(pet, now), pet.x, pet.y, SCALE, flip);
    drawName(pet);
  }
  for (const h of hearts) drawHeart(h.x, h.y, h.life);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt, now);
  draw(now);
  requestAnimationFrame(loop);
}

function updateMouseIgnore(mx, my) {
  if (uiOpen() || held) {
    window.deskpet?.setIgnoreMouse(false);
    lastOverPet = true;
    return;
  }
  const over = Boolean(petAt(mx, my));
  if (over !== lastOverPet) {
    lastOverPet = over;
    window.deskpet?.setIgnoreMouse(!over);
  }
}

window.addEventListener("resize", resize);

canvas.addEventListener("mousemove", (e) => {
  if (held) {
    dragging = dragging || Math.hypot(e.clientX - held.x - holdOffsetX, e.clientY - held.y - holdOffsetY) > 4;
    held.x = e.clientX - holdOffsetX;
    held.y = e.clientY - holdOffsetY;
    held.hopUntil = 0;
  }
  updateMouseIgnore(e.clientX, e.clientY);
});

canvas.addEventListener("mouseleave", () => {
  if (!held && !uiOpen()) {
    lastOverPet = false;
    window.deskpet?.setIgnoreMouse(true);
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (uiOpen()) return;
  if (e.button === 2) return;
  const pet = petAt(e.clientX, e.clientY);
  if (!pet) return;
  held = pet;
  dragging = false;
  pet.state = "idle";
  holdOffsetX = e.clientX - pet.x;
  holdOffsetY = e.clientY - pet.y;
  const b = petBox(pet);
  addHeart(b.x + b.w / 2, b.y);
  hop(pet, performance.now());
  window.deskpet?.setIgnoreMouse(false);
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const pet = petAt(e.clientX, e.clientY);
  if (!pet) {
    hidePetMenu();
    return;
  }
  held = null;
  showPetMenu(pet, e.clientX, e.clientY);
});

window.addEventListener("mouseup", () => {
  if (held) {
    if (dragging) {
      const area = areaAt(held.x + petSize(held.species).w / 2, held.y + petSize(held.species).h / 2);
      held.displayId = area.id;
      held.edge = nearestEdge(area, held.x, held.y, held.species);
      held.hopUntil = 0;
      snapToEdge(held);
      persist();
    }
    held.stateUntil = performance.now() + 900;
    held = null;
    dragging = false;
  }
});

canvas.addEventListener("dblclick", (e) => {
  const pet = petAt(e.clientX, e.clientY);
  if (!pet) return;
  held = null;
  openNamer({ mode: "rename", id: pet.id, value: pet.name });
});

namer.addEventListener("submit", (e) => {
  e.preventDefault();
  submitNamer();
});

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closeNamer();
  }
});

petMenu.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || !menuPetId) return;
  const pet = pets.find((p) => p.id === menuPetId);
  const act = btn.getAttribute("data-act");
  hidePetMenu();
  if (!pet) return;
  if (act === "rename") openNamer({ mode: "rename", id: pet.id, value: pet.name });
  if (act === "pause") {
    pet.paused = !pet.paused;
    persist();
  }
  if (act === "remove") removePet(pet.id);
  window.deskpet?.setIgnoreMouse(true);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hidePetMenu();
    if (naming) closeNamer();
  }
});

loadSettings();
resize();

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (Array.isArray(saved) && saved.length) {
    for (const row of saved.slice(0, MAX_PETS)) {
      if (DESKPET_SPRITES[row.species]) spawn(row.species, row.name, row);
    }
  }
} catch {
  /* ignore */
}
if (pets.length === 0) spawn("mochi", "Mochi");
persist();

if (window.deskpet) {
  window.deskpet.onAddPet((species) => {
    openNamer({ mode: "add", species, value: speciesLabel(species) });
  });
  window.deskpet.onRenamePet((id) => {
    const pet = pets.find((p) => p.id === id);
    if (pet) openNamer({ mode: "rename", id: pet.id, value: pet.name });
  });
  window.deskpet.onRemovePet((id) => removePet(id));
  window.deskpet.onTogglePetPause((id) => {
    const pet = pets.find((p) => p.id === id);
    if (pet) {
      pet.paused = !pet.paused;
      persist();
    }
  });
  window.deskpet.onClearPets(() => {
    pets.splice(0, pets.length);
    hearts.splice(0, hearts.length);
    persist();
  });
  window.deskpet.onPaused((value) => {
    paused = value;
  });
  window.deskpet.onShowNames((value) => setShowNames(Boolean(value)));
  window.deskpet.onDisplay((info) => {
    if (info?.displays?.length) displays = info.displays;
    resize();
    for (const pet of pets) snapToEdge(pet);
  });
  window.deskpet.onCursor((point) => {
    if (point && Number.isFinite(point.x)) {
      cursor.x = point.x;
      cursor.y = point.y;
    }
  });
}

requestAnimationFrame(loop);
