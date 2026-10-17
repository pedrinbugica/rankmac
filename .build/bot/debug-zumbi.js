const L = require('./lib');
(async () => {
  const bot = await L.criarBot('BotZumbi');
  L.rcon('mv tp BotZumbi sobrevivencia');
  await L.espera(2500);
  L.rcon('minecraft:execute in minecraft:sobrevivencia run tp BotZumbi 279 200 432',
    'minecraft:give BotZumbi minecraft:netherite_sword[minecraft:enchantments={"minecraft:sharpness":50}]');
  await L.espera(2500);
  const espada = bot.inventory.items().find((i) => i.name === 'netherite_sword');
  console.log('espada', !!espada, 'pos', bot.entity.position);
  if (espada) await bot.equip(espada, 'hand');
  const z = bot.nearestEntity((e) => e.name === 'zombie');
  console.log('zumbi', z && z.position, 'dist', z && z.position.distanceTo(bot.entity.position).toFixed(2));
  if (z) {
    await bot.lookAt(z.position.offset(0, 1, 0));
    bot.attack(z);
    await L.espera(1000);
    console.log('zumbi ainda existe?', !!bot.entities[z.id]);
  }
  console.log(L.rcon('minecraft:execute in minecraft:sobrevivencia if entity @e[type=minecraft:zombie]').split('\n')[1]);
  bot.quit();
  await L.espera(500);
  process.exit(0);
})();
