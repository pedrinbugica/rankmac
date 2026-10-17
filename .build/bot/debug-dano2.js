// Diagnóstico 2: quais "/damage ... by <entidade>" o servidor aceita?
const L = require('./lib');
const NOME = 'BotDebug7';

(async () => {
  const bot = await L.criarBot(NOME);
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'gamemode survival ' + NOME, 'minecraft:effect clear ' + NOME);
  await L.espera(5000);
  const pos = bot.entity.position;
  L.rcon(`tp ${NOME} ${pos.x + 60} ${pos.y + 30} ${pos.z}`, 'minecraft:effect give ' + NOME + ' minecraft:slow_falling 60 1 true');
  await L.espera(2500);
  const p2 = bot.entity.position;
  const testar = (cmd) => { console.log(cmd.replace(NOME, 'BOT'), '=>', L.limpar(L.rcon(cmd)).split('\n').slice(1).join(' ').trim()); };
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:husk ${p2.x + 3} ${p2.y} ${p2.z} {NoAI:1b,Tags:["h1"]}`,
    `minecraft:execute in minecraft:sobrevivencia run summon minecraft:zombie ${p2.x - 3} ${p2.y} ${p2.z} {Tags:["z1"],NoGravity:1b}`,
    `minecraft:execute in minecraft:sobrevivencia run summon minecraft:pig ${p2.x} ${p2.y} ${p2.z + 3} {Tags:["p1"],NoAI:1b}`);
  await L.espera(1000);
  for (const [tipo, tag] of [['husk', 'h1'], ['zombie', 'z1'], ['pig', 'p1']]) {
    testar(`minecraft:damage ${NOME} 2 minecraft:mob_attack by @e[type=minecraft:${tipo},tag=${tag},limit=1]`);
    await L.espera(700);
    testar(`minecraft:damage ${NOME} 2 minecraft:generic by @e[type=minecraft:${tipo},tag=${tag},limit=1]`);
    await L.espera(700);
  }
  testar(`minecraft:difficulty`);
  testar(`minecraft:execute in minecraft:sobrevivencia run difficulty`);
  L.rcon('minecraft:kill @e[tag=h1]', 'minecraft:kill @e[tag=z1]', 'minecraft:kill @e[tag=p1]');
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
