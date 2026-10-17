// Diagnóstico 3: um zumbi de verdade machuca o jogador na Sobrevivência? E o guarda (dano via plugin)?
const L = require('./lib');
const NOME = 'BotDebug8';

(async () => {
  const bot = await L.criarBot(NOME);
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'gamemode survival ' + NOME, 'minecraft:effect clear ' + NOME);
  await L.espera(5000);
  const pos = bot.entity.position;
  const x = Math.floor(pos.x) + 80;
  const z = Math.floor(pos.z);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run fill ${x - 3} 199 ${z - 3} ${x + 3} 199 ${z + 3} minecraft:stone`,
    'minecraft:execute in minecraft:sobrevivencia run time set midnight');
  await L.espera(500);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${x + 0.5} 200 ${z + 0.5}`);
  await L.espera(2000);
  const v0 = bot.health;
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:zombie ${x + 2.5} 200 ${z + 0.5} {Tags:["zd"]}`);
  await L.espera(6000);
  console.log('zumbi com IA: vida', v0, '->', bot.health);
  L.rcon('minecraft:kill @e[tag=zd]', 'minecraft:execute in minecraft:sobrevivencia run time set day',
    `minecraft:execute in minecraft:sobrevivencia run fill ${x - 3} 199 ${z - 3} ${x + 3} 199 ${z + 3} minecraft:air`);
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
