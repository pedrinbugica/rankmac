const fs = require('fs');
const path = require('path');
const L = require('./lib');
(async () => {
  const bot = await L.criarBot('BotDebug');
  let mostrado = false;
  bot._client.on('packet', (pkt, meta) => {
    if (meta.name !== 'system_chat') return;
    const s = JSON.stringify(pkt);
    if (!mostrado && s.includes('mercadorias')) { mostrado = true; console.log('PACOTE: ' + s.slice(0, 2500)); }
  });
  L.rcon('mv tp BotDebug sobrevivencia');
  await L.espera(2500);
  const t = fs.readFileSync(path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos', 'npcs', 'ferreiro_borin.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\n  ' + k + ': ([-\d.]+)')) || [0, 0])[1]);
  L.rcon(`tp BotDebug ${num('x') - 1.5} ${num('y')} ${num('z')}`);
  await L.espera(2000);
  let npc = null;
  for (let i = 0; i < 20 && !npc; i++) { npc = bot.nearestEntity((e) => e.name === 'mannequin'); await L.espera(300); }
  console.log('npc', npc && npc.position, 'bot', bot.entity.position);
  await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
  await L.espera(2000);
  bot.quit();
  await L.espera(500);
  process.exit(0);
})();
