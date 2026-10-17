// Diagnóstico: clique no Borin num mundo Sobrevivência novo
const L = require('./lib');

(async () => {
  const bot = await L.criarBot('BotDebug2');
  L.rcon('mv tp BotDebug2 sobrevivencia', 'minecraft:effect give BotDebug2 minecraft:resistance 600 255 true');
  await L.espera(2000);
  L.rcon('tp BotDebug2 419 87 416.5');
  await L.espera(2500);
  const ms = Object.values(bot.entities).filter((e) => e.name === 'mannequin');
  console.log('bot em', bot.entity.position, 'manequins:', ms.map((e) => e.id + '@' + e.position + ' d=' + e.position.distanceTo(bot.entity.position).toFixed(2)).join(' ; '));
  const npc = bot.nearestEntity((e) => e.name === 'mannequin');
  await bot.lookAt(npc.position.offset(0, 1.6, 0), true);
  await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
  await L.espera(1500);
  console.log('mensagens: ' + bot.msgs.slice(-4).join(' | '));
  bot.attack(npc);
  await L.espera(1500);
  console.log('depois do ataque: ' + bot.msgs.slice(-3).join(' | '));
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
