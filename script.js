const CONFIG = {
  width: 960,
  height: 620,
  duration: 60,
  designerRadius: 25,
  itemSize: 30,
  designerCruiseSpeed: 34,
  attractionRange: 260,
  startingItems: 22,
  maxItems: 100,
  cornerRadius: 55
};

const DESIGNERS = [
  { name: 'Rustic', short: 'RUS', color: 0x9a6338, css: '#9a6338', weights: { Wood: 15, Natural: 10, Handmade: 8, Warm: 7, Plastic: -10, Blue: 3, Decorative: 2 } },
  { name: 'Minimalist', short: 'MIN', color: 0xf2f2f2, css: '#f2f2f2', weights: { Simple: 15, Neutral: 12, Clean: 10, Wood: 3, Decorative: -4, Patterned: -3, Colorful: -4, Plastic: 2 } },
  { name: 'Maximalist', short: 'MAX', color: 0x9b55d6, css: '#9b55d6', weights: { Decorative: 15, Colorful: 12, Patterned: 11, Handmade: 5, Simple: 2, Neutral: -2, Clean: -1, Plastic: 4 } },
  { name: 'Coastal', short: 'COA', color: 0x43a9e8, css: '#43a9e8', weights: { Blue: 15, White: 10, Natural: 9, Light: 9, Clean: 3, Wood: 2, Dark: -8, Plastic: -3 } }
];

const ITEM_TYPES = [
  { abbr: 'CHR', name: 'Chair', category: 'Furniture', color: 0xb78655, tags: ['Wood', 'Warm', 'Handmade'], points: 12 },
  { abbr: 'LMP', name: 'Lamp', category: 'Lighting', color: 0xf0d56b, tags: ['Warm', 'Simple', 'Clean', 'Light'], points: 10 },
  { abbr: 'RUG', name: 'Rug', category: 'Textile', color: 0x9e6b8c, tags: ['Patterned', 'Colorful', 'Warm'], points: 14 },
  { abbr: 'VSE', name: 'Vase', category: 'Decor', color: 0x68a7a0, tags: ['Decorative', 'Natural', 'Clean'], points: 11 },
  { abbr: 'PLT', name: 'Plant', category: 'Natural', color: 0x5da35d, tags: ['Natural', 'Light', 'White'], points: 16 },
  { abbr: 'ART', name: 'Art', category: 'Decor', color: 0xe07b58, tags: ['Decorative', 'Colorful', 'Patterned'], points: 18 },
  { abbr: 'MIR', name: 'Mirror', category: 'Decor', color: 0xa9c6d9, tags: ['Clean', 'Simple', 'White'], points: 15 },
  { abbr: 'TBL', name: 'Table', category: 'Furniture', color: 0x9a6338, tags: ['Wood', 'Natural', 'Warm'], points: 17 },
  { abbr: 'BSK', name: 'Basket', category: 'Storage', color: 0xc89d61, tags: ['Natural', 'Handmade', 'Warm'], points: 13 },
  { abbr: 'DEC', name: 'Plastic Decor', category: 'Decor', color: 0x6fd0c9, tags: ['Plastic', 'Colorful', 'Simple'], points: 9 },
  { abbr: 'SEA', name: 'Sea Glass', category: 'Decor', color: 0x65bfe9, tags: ['Blue', 'White', 'Natural'], points: 14 }
];

let game = null;
let scene = null;
let designers = [];
let items = [];
let elapsed = 0;
let running = false;
let currentPhase = 0;
let itemId = 0;
let lastEventTime = 0;

const $ = id => document.getElementById(id);

$('startBtn').addEventListener('click', startSimulation);
$('resetBtn').addEventListener('click', resetSimulation);
$('againBtn').addEventListener('click', () => {
  $('resultOverlay').classList.add('hidden');
  startSimulation();
});

function startSimulation() {
  if (game) game.destroy(true);

  designers = [];
  items = [];
  elapsed = 0;
  currentPhase = 0;
  itemId = 0;
  lastEventTime = 0;
  running = true;

  $('resultOverlay').classList.add('hidden');
  $('timer').textContent = CONFIG.duration.toFixed(1);
  $('phase').textContent = 'OPENING';
  $('leader').textContent = '—';
  $('chaos').textContent = '0%';
  $('leaderboard').innerHTML = '';
  $('eventFeed').innerHTML = '<div class="feed-empty">Waiting for bad decisions...</div>';

  try {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      width: CONFIG.width,
      height: CONFIG.height,
      parent: 'game-container',
      backgroundColor: '#151515',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0 },
          enableSleeping: false
        }
      },
      scene: { preload, create, update }
    });
  } catch (error) {
    running = false;
    showEngineError(error);
  }
}

function showEngineError(error) {
  const box = document.createElement('div');
  box.style.cssText = 'padding:24px;color:#fff;background:#220f0f;border:2px solid #b44;border-radius:8px;font-family:monospace;white-space:pre-wrap';
  box.textContent = `SIMULATION ERROR\n\n${error && error.message ? error.message : error}`;
  $('game-container').appendChild(box);
}

function resetSimulation() {
  running = false;
  if (game) {
    game.destroy(true);
    game = null;
  }
  designers = [];
  items = [];
  elapsed = 0;
  currentPhase = 0;
  $('timer').textContent = CONFIG.duration.toFixed(1);
  $('phase').textContent = 'READY';
  $('leader').textContent = '—';
  $('chaos').textContent = '0%';
  $('leaderboard').innerHTML = '';
  $('eventFeed').innerHTML = '<div class="feed-empty">Waiting for bad decisions...</div>';
  $('resultOverlay').classList.add('hidden');
}

function preload() {}

function create() {
  scene = this;

  createArenaWalls(this);
  drawArena(this);
  createDesigners(this);

  for (let i = 0; i < CONFIG.startingItems; i++) spawnItem(this);

  this.matter.world.on('collisionstart', handleCollisions);
  updateLeaderboard();
  addEvent('The room is open. The bad decisions begin.');

  // Matter has now finished registering every body. Start the designers
  // on the first physics tick rather than during body construction.
  this.time.delayedCall(50, launchDesigners);
}

function launchDesigners() {
  designers.forEach((designer, index) => {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    setConstantSpeed(designer, angle);
    wakeDesigner(designer);
  });
}

function wakeDesigner(designer) {
  const body = designer.gameObject.body;
  if (!body) return;
  body.isSleeping = false;
  if (body.velocity) {
    body.velocity.x = body.velocity.x || CONFIG.designerCruiseSpeed;
    body.velocity.y = body.velocity.y || 0;
  }
}

function createArenaWalls(s) {
  const thickness = 24;
  const r = CONFIG.cornerRadius;
  const w = CONFIG.width;
  const h = CONFIG.height;
  const points = [
    { x: r, y: 0 }, { x: w - r, y: 0 },
    { x: w, y: r }, { x: w, y: h - r },
    { x: w - r, y: h }, { x: r, y: h },
    { x: 0, y: h - r }, { x: 0, y: r }
  ];

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    const wall = s.add.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, length, thickness, 0x666666, 1);
    wall.setVisible(false);
    s.matter.add.gameObject(wall, { isStatic: true, restitution: 1, friction: 0 });
    wall.rotation = Math.atan2(dy, dx);
    wall.isArenaWall = true;
  }

  for (const point of points) {
    const corner = s.add.circle(point.x, point.y, thickness / 2, 0x666666, 1);
    corner.setVisible(false);
    s.matter.add.gameObject(corner, { isStatic: true, restitution: 1, friction: 0 });
    corner.isArenaWall = true;
  }
}

function drawArena(s) {
  const g = s.add.graphics().setDepth(0);
  const r = CONFIG.cornerRadius;
  const w = CONFIG.width;
  const h = CONFIG.height;

  g.fillStyle(0x171717, 1);
  g.fillRoundedRect(4, 4, w - 8, h - 8, r);
  g.lineStyle(7, 0x666666, 1);
  g.strokeRoundedRect(4, 4, w - 8, h - 8, r);
  g.lineStyle(1, 0x252525, 1);

  for (let x = 80; x < w; x += 80) g.lineBetween(x, 8, x, h - 8);
  for (let y = 80; y < h; y += 80) g.lineBetween(8, y, w - 8, y);

  s.add.text(18, 15, 'DESIGN ARENA', {
    fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold', color: '#888', letterSpacing: 2
  }).setDepth(20);
}

function createDesigners(s) {
  DESIGNERS.forEach((def, i) => {
    const x = 150 + i * 210;
    const y = 130 + (i % 2) * 300;
    const circle = s.add.circle(x, y, CONFIG.designerRadius, def.color, 1).setDepth(10);
    circle.setStrokeStyle(3, 0xffffff, 0.9);

    s.matter.add.gameObject(circle, {
      shape: { type: 'circle', radius: CONFIG.designerRadius },
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      density: 0.003,
      slop: 0
    });

    const label = s.add.text(x, y, def.short, {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: def.name === 'Minimalist' ? '#111' : '#fff'
    }).setOrigin(0.5).setDepth(15);

    const designer = {
      ...def,
      gameObject: circle,
      label,
      score: 0,
      inventory: [],
      target: null,
      steeringStrength: 0.08
    };

    circle.designer = designer;
    designers.push(designer);
  });
}

function setConstantSpeed(designer, angle) {
  const body = designer.gameObject.body;
  if (!body) return;

  const vx = Math.cos(angle) * CONFIG.designerCruiseSpeed;
  const vy = Math.sin(angle) * CONFIG.designerCruiseSpeed;

  body.isSleeping = false;
  body.velocity.x = vx;
  body.velocity.y = vy;
  body.speed = CONFIG.designerCruiseSpeed;
}

function maintainSpeed(designer) {
  const body = designer.gameObject.body;
  if (!body) return;

  body.isSleeping = false;

  const speed = Math.hypot(body.velocity.x, body.velocity.y);
  if (speed < 0.001) {
    // A stopped designer only happens during an unusual physics edge case.
    // Give it one new random direction, then return to normal constant-speed travel.
    setConstantSpeed(designer, Phaser.Math.FloatBetween(0, Math.PI * 2));
    return;
  }

  const scale = CONFIG.designerCruiseSpeed / speed;
  body.velocity.x *= scale;
  body.velocity.y *= scale;
  body.speed = CONFIG.designerCruiseSpeed;
}

function spawnItem(s, rare = false) {
  if (items.length >= CONFIG.maxItems) return;

  const base = Phaser.Utils.Array.GetRandom(ITEM_TYPES);
  const type = { ...base, tags: [...base.tags], rare };

  if (rare) {
    type.points += Phaser.Math.Between(8, 18);
    type.tags.push(Phaser.Utils.Array.GetRandom(['Decorative', 'Colorful', 'Natural', 'Blue', 'White', 'Patterned']));
  }

  const x = Phaser.Math.Between(55, CONFIG.width - 55);
  const y = Phaser.Math.Between(55, CONFIG.height - 55);
  const rect = s.add.rectangle(x, y, CONFIG.itemSize, CONFIG.itemSize, type.color, 1).setDepth(8);
  rect.setStrokeStyle(2, rare ? 0xffd54a : 0x111111, 1);
  s.matter.add.gameObject(rect, {
    shape: { type: 'rectangle', width: CONFIG.itemSize, height: CONFIG.itemSize },
    isStatic: true
  });

  const label = s.add.text(x, y, type.abbr, {
    fontFamily: 'Arial', fontSize: '8px', fontStyle: 'bold', color: '#111', stroke: '#fff', strokeThickness: 1
  }).setOrigin(0.5).setDepth(12);

  const item = { ...type, id: ++itemId, gameObject: rect, label, collected: false };
  rect.item = item;
  items.push(item);
}

function scoreItem(designer, item) {
  let score = item.points;
  for (const tag of item.tags) score += designer.weights[tag] || 0;
  if (currentPhase >= 4 && item.tags.includes('Blue')) score *= 2;
  if (currentPhase >= 4 && item.abbr === 'PLT') score *= 3;
  if (currentPhase >= 4 && item.category === 'Furniture') score *= 0.5;
  return Math.round(score);
}

function chooseTarget(designer) {
  let best = null;
  let bestValue = -Infinity;

  for (const item of items) {
    if (item.collected || !item.gameObject.active) continue;
    const dx = item.gameObject.x - designer.gameObject.x;
    const dy = item.gameObject.y - designer.gameObject.y;
    const distance = Math.hypot(dx, dy);
    if (distance > CONFIG.attractionRange) continue;

    const preference = scoreItem(designer, item);
    const value = preference - distance * 0.03 + Math.random() * 6;
    if (value > bestValue) {
      bestValue = value;
      best = item;
    }
  }

  if (!best) {
    const available = items.filter(i => !i.collected && i.gameObject.active);
    if (available.length) best = Phaser.Utils.Array.GetRandom(available);
  }

  designer.target = best;
}

function steerOnImpact(designer) {
  if (!designer) return;
  if (!designer.target || designer.target.collected || !designer.target.gameObject.active) chooseTarget(designer);
  if (!designer.target) return;

  const body = designer.gameObject.body;
  const dx = designer.target.gameObject.x - designer.gameObject.x;
  const dy = designer.target.gameObject.y - designer.gameObject.y;
  const distance = Math.hypot(dx, dy) || 1;
  const current = Math.atan2(body.velocity.y, body.velocity.x);
  const desired = Math.atan2(dy, dx);
  let difference = Phaser.Math.Angle.Wrap(desired - current);

  // Tiny steering impulse only. The bounce remains overwhelmingly dominant.
  difference = Phaser.Math.Clamp(difference, -0.14, 0.14);
  setConstantSpeed(designer, current + difference * designer.steeringStrength);
}

function handleCollisions(event) {
  if (!running) return;

  for (const pair of event.pairs) {
    const a = pair.bodyA.gameObject;
    const b = pair.bodyB.gameObject;
    if (!a || !b) continue;

    let designer = null;
    let item = null;

    if (a.designer && b.item) {
      designer = a.designer;
      item = b.item;
    } else if (b.designer && a.item) {
      designer = b.designer;
      item = a.item;
    }

    if (designer && item && !item.collected) collectItem(designer, item);

    if (a.designer && b.designer) {
      steerOnImpact(a.designer);
      steerOnImpact(b.designer);
    } else if (a.designer && b.isArenaWall) {
      steerOnImpact(a.designer);
    } else if (b.designer && a.isArenaWall) {
      steerOnImpact(b.designer);
    }
  }
}

function separateDesigners() {
  for (let i = 0; i < designers.length; i++) {
    for (let j = i + 1; j < designers.length; j++) {
      const a = designers[i];
      const b = designers[j];
      const dx = b.gameObject.x - a.gameObject.x;
      const dy = b.gameObject.y - a.gameObject.y;
      const distance = Math.hypot(dx, dy);
      const minimum = CONFIG.designerRadius * 2;

      if (distance > 0 && distance < minimum) {
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minimum - distance + 0.2;

        a.gameObject.x -= nx * overlap * 0.5;
        a.gameObject.y -= ny * overlap * 0.5;
        b.gameObject.x += nx * overlap * 0.5;
        b.gameObject.y += ny * overlap * 0.5;
      }

      maintainSpeed(a);
      maintainSpeed(b);
    }
  }
}

function keepInside(designer) {
  const object = designer.gameObject;
  const r = CONFIG.designerRadius;
  const pad = 8;
  const minX = r + pad;
  const maxX = CONFIG.width - r - pad;
  const minY = r + pad;
  const maxY = CONFIG.height - r - pad;

  if (object.x < minX) object.x = minX;
  if (object.x > maxX) object.x = maxX;
  if (object.y < minY) object.y = minY;
  if (object.y > maxY) object.y = maxY;
}

function collectItem(designer, item) {
  item.collected = true;
  const points = scoreItem(designer, item);
  designer.score += points;
  designer.inventory.push({ abbr: item.abbr, name: item.name, points });
  designer.target = null;
  item.gameObject.setVisible(false);
  item.label.setVisible(false);
  showPopup(item.gameObject.x, item.gameObject.y, points);
  addEvent(`${designer.short} grabbed ${item.abbr}`, points);
  updateLeaderboard();
}

function showPopup(x, y, points) {
  const text = scene.add.text(x, y, `${points >= 0 ? '+' : ''}${points}`, {
    fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold',
    color: points >= 0 ? '#fff' : '#ff7777', stroke: '#111', strokeThickness: 4
  }).setOrigin(0.5).setDepth(50);

  scene.tweens.add({
    targets: text,
    y: y - 38,
    alpha: 0,
    duration: 650,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy()
  });
}

function addEvent(message, points = 0) {
  if (!running) return;
  const now = elapsed;
  if (now - lastEventTime < 0.15 && Math.random() < 0.65) return;
  lastEventTime = now;

  const feed = $('eventFeed');
  const empty = feed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const row = document.createElement('div');
  row.className = 'feed-event';
  row.innerHTML = `<strong>${message}</strong>${points ? ` <span class="points">${points >= 0 ? '+' : ''}${points}</span>` : ''}`;
  feed.prepend(row);
  while (feed.children.length > 7) feed.removeChild(feed.lastElementChild);
}

function phaseName() {
  return ['OPENING', 'GATHERING', 'ACCELERATION', 'RARE ITEMS', 'RULE CHAOS', 'ITEM FLOOD'][currentPhase] || 'FINAL';
}

function advancePhase(phase) {
  currentPhase = phase;
  $('phase').textContent = phaseName();

  if (phase === 1) { for (let i = 0; i < 10; i++) spawnItem(scene); addEvent('More furniture enters the room.'); }
  if (phase === 2) { for (let i = 0; i < 12; i++) spawnItem(scene); addEvent('Everyone has become unreasonable.'); }
  if (phase === 3) { for (let i = 0; i < 8; i++) spawnItem(scene, true); addEvent('RARE ITEMS ENTER THE ARENA.'); }
  if (phase === 4) { for (let i = 0; i < 14; i++) spawnItem(scene, true); addEvent('RULE CHAOS: Blue x2 • Plants x3 • Furniture x0.5'); }
  if (phase === 5) { for (let i = 0; i < 45; i++) spawnItem(scene, Math.random() < 0.3); addEvent('ITEM FLOOD. GOOD LUCK.'); }
}

function update(time, delta) {
  if (!running) return;

  elapsed += delta / 1000;
  $('timer').textContent = Math.max(0, CONFIG.duration - elapsed).toFixed(1);

  const phase = Math.min(5, Math.floor(elapsed / 10));
  if (phase !== currentPhase) advancePhase(phase);

  separateDesigners();

  designers.forEach(designer => {
    keepInside(designer);
    maintainSpeed(designer);
    designer.label.setPosition(designer.gameObject.x, designer.gameObject.y);
  });

  items.forEach(item => {
    if (!item.collected) item.label.setPosition(item.gameObject.x, item.gameObject.y);
  });

  $('chaos').textContent = `${Math.min(100, Math.round(elapsed / CONFIG.duration * 100))}%`;
  if (Math.random() < 0.02) updateLeaderboard();
  if (elapsed >= CONFIG.duration) finishSimulation();
}

function updateLeaderboard() {
  const sorted = [...designers].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  $('leader').textContent = leader ? leader.name : '—';
  $('leaderboard').innerHTML = sorted.map((d, i) => `
    <div class="standing ${i === 0 ? 'leader' : ''}">
      <span class="rank">#${i + 1}</span>
      <span class="designer-cell"><span class="dot" style="background:${d.css}"></span>${d.name}</span>
      <span class="item-count">${d.inventory.length} items</span>
      <strong class="standing-score">${d.score}</strong>
    </div>`).join('');
}

function finishSimulation() {
  if (!running) return;
  running = false;

  designers.forEach(d => {
    const body = d.gameObject.body;
    body.velocity.x = 0;
    body.velocity.y = 0;
  });

  updateLeaderboard();
  const winner = [...designers].sort((a, b) => b.score - a.score)[0];
  if (!winner) return;

  $('winnerName').textContent = winner.name;
  $('winnerScore').textContent = winner.score;
  $('winnerSummary').textContent = `${winner.inventory.length} item${winner.inventory.length === 1 ? '' : 's'} collected`;

  const top = [...winner.inventory].sort((a, b) => b.points - a.points).slice(0, 5);
  $('topItems').innerHTML = top.length
    ? top.map(x => `<li><strong>${x.abbr}</strong> ${x.name} — ${x.points > 0 ? '+' : ''}${x.points}</li>`).join('')
    : '<li>No furniture survived the encounter.</li>';

  $('resultOverlay').classList.remove('hidden');
}
