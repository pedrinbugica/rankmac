// Diagnóstico: por que o /damage diz "invulnerável" no bot?
const L = require('./lib');
const NOME = 'BotDebug6';

(async () => {
  const bot = await L.criarBot(NOME);
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'gamemode survival ' + NOME, 'minecraft:effect clear ' + NOME);
  await L.espera(5000);
  const pos = bot.entity.position;
  console.log('pos', pos.toString(), 'modo', bot.game.gameMode, 'vida', bot.health);
  const testar = (cmd) => { console.log(cmd, '=>', L.limpar(L.rcon(cmd)).replace(/\n/g, ' ').trim()); };
  testar(`minecraft:damage ${NOME} 3 minecraft:generic`);
  await L.espera(1000);
  console.log('vida', bot.health);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:husk ${pos.x + 3} ${pos.y} ${pos.z} {NoAI:1b,Tags:["atk2"]}`);
  await L.espera(1000);
  testar(`minecraft:damage ${NOME} 3 minecraft:mob_attack by @e[type=minecraft:husk,tag=atk2,limit=1]`);
  await L.espera(1000);
  console.log('vida', bot.health);
  testar(`minecraft:damage ${NOME} 3 minecraft:mob_attack`);
  await L.espera(1000);
  console.log('vida', bot.health);
  L.rcon(`tp ${NOME} ${pos.x + 60} ${pos.y + 40} ${pos.z}`, 'minecraft:effect give ' + NOME + ' minecraft:slow_falling 30 1 true');
  await L.espera(2000);
  testar(`minecraft:damage ${NOME} 3 minecraft:mob_attack by @e[type=minecraft:husk,tag=atk2,limit=1]`);
  await L.espera(1000);
  console.log('longe do spawn: vida', bot.health);
  L.rcon('minecraft:kill @e[tag=atk2]');
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
