// Diagnóstico: qual tipo de clique chega no NPC?
const L = require('./lib');

(async () => {
  const bot = await L.criarBot('BotNpc');
  L.rcon('mv tp BotNpc world');
  await L.espera(2000);
  L.rcon('tp BotNpc 3.5 101 8.5');
  await L.espera(2500);
  const guia = bot.nearestEntity((e) => e.name === 'mannequin');
  console.log('guia', guia && guia.position, 'bot', bot.entity.position, 'dist', guia && guia.position.distanceTo(bot.entity.position).toFixed(2));
  await bot.lookAt(guia.position.offset(0, 1.6, 0), true);
  await L.espera(300);
  bot.activateEntity(guia);
  await L.espera(1500);
  console.log('depois do activateEntity: ' + bot.msgs.slice(-3).join(' | '));
  bot.activateEntityAt(guia, guia.position.offset(0, 1, 0));
  await L.espera(1500);
  console.log('depois do activateEntityAt: ' + bot.msgs.slice(-3).join(' | '));
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
