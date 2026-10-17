// Diagnóstico: como a lore de um item da loja chega no bot (para ler "Estoque: N")
const L = require('./lib');
const NOME = 'BotLore1';

(async () => {
  const bot = await L.criarBot(NOME);
  L.rcon('mv tp ' + NOME + ' sobrevivencia');
  await L.espera(2000);
  const borin = Object.values(bot.entities).find((e) => e.name === 'mannequin' && L.limpar(JSON.stringify(e.metadata && e.metadata[2] || '')).includes('Borin'));
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${borin.position.x - 1.5} ${borin.position.y} ${borin.position.z}`);
  await L.espera(1200);
  await bot.lookAt(borin.position.offset(0, 1.6, 0));
  await bot.activateEntityAt(borin, borin.position.offset(0, 1, 0));
  await L.espera(1200);
  const janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  await L.clicarOpcao(bot, 'mercadorias', 2000);
  const w = await janela;
  const it = w && w.slots[14];
  console.log('ITEM', it && it.name);
  const lore = it && (it.components || []).find((c) => c.type === 'lore');
  console.log(JSON.stringify(lore).slice(0, 1500));
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
