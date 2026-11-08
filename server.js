const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3000);
const root = __dirname;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const file = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = path.resolve(root, file);
  if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) {
    res.writeHead(403).end('Forbidden'); return;
  }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    const ext = path.extname(target);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
const wss = new WebSocketServer({ noServer: true });
const players = new Map();
const world = { bossHp: 100, phase: 1, respawning: false };
const catalog = {
  'field-rifle': { name: 'Field Rifle', price: 0, tier: 1, type: 'military', damage: 28 },
  'storm-smg': { name: 'Storm SMG', price: 80, tier: 2, type: 'military', damage: 19 },
  'titan-shotgun': { name: 'Titan Shotgun', price: 180, tier: 3, type: 'military', damage: 62 },
  'ember-staff': { name: 'Ember Staff', price: 110, tier: 2, type: 'mystic', damage: 38 },
  'rift-blade': { name: 'Rift Blade', price: 240, tier: 3, type: 'mystic', damage: 54 },
  'nova-caster': { name: 'Nova Caster', price: 420, tier: 4, type: 'mystic', damage: 78 }
};
function publicPlayer(p) {
  return { id: p.id, name: p.name, x: p.x, z: p.z, hp: p.hp, lives: p.lives, coins: p.coins, state: p.state, inventory: p.inventory, weapon: p.weapon, revive: p.revive ? { by: p.revive.by, target: p.id, slaps: p.revive.slaps } : null };
}
function broadcast() {
  const snapshot = JSON.stringify({ type: 'snapshot', players: [...players.values()].map(publicPlayer), world });
  for (const p of players.values()) if (p.ws.readyState === 1) p.ws.send(snapshot);
}
function send(ws, type, data = {}) { if (ws.readyState === 1) ws.send(JSON.stringify({ type, ...data })); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function damageBoss(player, damage) {
  if (world.respawning || world.bossHp <= 0 || player.state !== 'alive') return;
  world.bossHp = Math.max(0, world.bossHp - damage);
  if (world.bossHp === 0) {
    world.phase++;
    world.respawning = true;
    for (const teammate of players.values()) if (teammate.state === 'alive') teammate.coins += 30;
    setTimeout(() => { world.bossHp = 100; world.respawning = false; broadcast(); }, 4500);
  }
  broadcast();
}
server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url, `http://${req.headers.host}`).pathname !== '/ws') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
wss.on('connection', ws => {
  const id = Math.random().toString(36).slice(2, 9);
  const player = { id, name: `Ranger-${id.slice(0, 3)}`, x: (Math.random() - .5) * 7, z: (Math.random() - .5) * 7, hp: 100, lives: 3, coins: 120, state: 'alive', inventory: ['field-rifle'], weapon: 'field-rifle', revive: null, ws };
  players.set(id, player);
  send(ws, 'welcome', { id, player: publicPlayer(player), catalog, world }); broadcast();
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'move' && player.state === 'alive') {
      const x = Number(msg.x), z = Number(msg.z), now = Date.now();
      const elapsed = Math.min(500, now - (player.lastMove || now));
      const maxStep = Math.max(.8, elapsed * .012 + .45);
      if (Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 18 && Math.abs(z) <= 18 && Math.hypot(x - player.x, z - player.z) <= maxStep) { player.x = x; player.z = z; player.lastMove = now; }
    }
    if (msg.type === 'dash' && player.state === 'alive') {
      const x = Number(msg.x), z = Number(msg.z);
      if (Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 18 && Math.abs(z) <= 18 && distance(player, { x, z }) <= 4) { player.x = x; player.z = z; player.lastMove = Date.now(); }
    }
    if (msg.type === 'damage' && player.state === 'alive') {
      const amount = Math.max(0, Math.min(60, Number(msg.amount) || 0));
      player.hp = Math.max(0, player.hp - amount);
      if (player.hp === 0) { player.lives = Math.max(0, player.lives - 1); player.state = player.lives > 0 ? 'alive' : 'down'; player.hp = player.lives > 0 ? 100 : 0; player.revive = null; }
      broadcast();
    }
    if (msg.type === 'boss-hit' && player.state === 'alive') {
      const weapon = catalog[player.weapon];
      const now = Date.now();
      const cooldown = player.weapon === 'storm-smg' ? 120 : 210;
      if (weapon && player.inventory.includes(player.weapon) && now - (player.lastBossHit || 0) >= cooldown) {
        player.lastBossHit = now;
        damageBoss(player, weapon.damage);
      }
    }
    if (msg.type === 'boss-skill' && player.state === 'alive') {
      const now = Date.now();
      if (now - (player.lastBossSkill || 0) >= 4500) { player.lastBossSkill = now; damageBoss(player, 70); }
    }
    if (msg.type === 'revive-start') {
      const target = players.get(String(msg.target));
      if (target && target.state === 'down' && distance(player, target) < 3.2 && player.state === 'alive' && (!target.revive || target.revive.by === player.id || Date.now() - target.revive.lastAt > 8000)) {
        target.revive = { by: player.id, slaps: 0, lastAt: Date.now() }; send(ws, 'action', { action: 'grabbed', target: target.id }); broadcast();
      }
    }
    if (msg.type === 'revive-slap') {
      const target = players.get(String(msg.target));
      const now = Date.now();
      if (target && target.state === 'down' && target.revive?.by === player.id && player.state === 'alive' && distance(player, target) < 3.2 && now - target.revive.lastAt >= 350 && now - target.revive.lastAt <= 8000) {
        target.revive.slaps++;
        target.revive.lastAt = now;
        const count = target.revive.slaps;
        if (count >= 3) { target.state = 'alive'; target.lives = 1; target.hp = 60; target.revive = null; }
        send(ws, 'action', { action: 'slap', target: target.id, count }); broadcast();
      }
    }
    if (msg.type === 'buy') {
      const item = catalog[String(msg.item)];
      if (!item || player.state !== 'alive') return;
      if (player.inventory.includes(msg.item)) { send(ws, 'error', { message: 'Você já possui este equipamento.' }); return; }
      if (player.coins < item.price) { send(ws, 'error', { message: 'Moedas azuis insuficientes.' }); return; }
      player.coins -= item.price; player.inventory.push(msg.item); player.weapon = msg.item; send(ws, 'purchased', { item: msg.item, coins: player.coins }); broadcast();
    }
    if (msg.type === 'reward') {
      const now = Date.now();
      const amount = Number(msg.amount);
      if (![8, 10, 30].includes(amount) || now - (player.lastReward || 0) < 900) return;
      player.lastReward = now;
      player.rewardWindow ||= { started: now, total: 0 };
      if (now - player.rewardWindow.started > 60000) player.rewardWindow = { started: now, total: 0 };
      if (player.rewardWindow.total + amount > 120) return;
      player.rewardWindow.total += amount; player.coins += amount; broadcast();
    }
    if (msg.type === 'heartbeat') send(ws, 'pong');
  });
  ws.on('close', () => { players.delete(id); broadcast(); });
});
setInterval(broadcast, 100);
server.listen(PORT, '0.0.0.0', () => console.log(`Bluefront Echoes running at http://localhost:${PORT}`));
