// Mostra o que o bot vê do manequim: dá para achar o NPC pelo nome em vez do "mais perto"?
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');

function localNpc(id) {
  const t = fs.readFileSync(path.join(PASTA, 'npcs', id + '.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  return { x: num('x'), y: num('y'), z: num('z') };
}

(async () => {
  const bot = await L.criarBot('BotNome');
  L.rcon('mv tp BotNome sobrevivencia', 'gamemode spectator BotNome');
  await L.espera(2500);
  const k = localNpc('duelista_kaela');
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp BotNome ${k.x - 2} ${k.y} ${k.z}`);
  await L.espera(3000);
  for (const e of Object.values(bot.entities)) {
    if (e.name !== 'mannequin') continue;
    console.log('---', e.id, e.position.toString());
    console.log('   displayName:', JSON.stringify(e.displayName));
    console.log('   metadata:', L.limpar(JSON.stringify(e.metadata)).slice(0, 600));
  }
  bot.quit();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
