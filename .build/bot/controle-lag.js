// Controle: quebra blocos comuns com o modo construção (o plugin não interfere) para ver se os "puxões" são do bot.
const L = require('./lib');

(async () => {
  const a = await L.criarBot('BotDivina');
  L.rcon('lp user BotDivina parent set dono', 'clear BotDivina', 'rankupadmin darpicareta BotDivina');
  await L.espera(1500);
  const pick = a.inventory.items().find((i) => i.name === 'diamond_pickaxe');
  await a.equip(pick, 'hand');
  await L.comandoEspera(a, '/rankupadmin construir', 'ATIVADO');
  // Um bloco grande de pedra comum longe das minas
  L.rcon('fill 300 90 300 316 105 316 minecraft:stone', 'tp BotDivina 308 106 308');
  await L.espera(2500);
  let puxoes = 0;
  a.on('forcedMove', () => puxoes++);
  // tempo de quebra real
  let quebras = 0;
  const fim = Date.now() + 20000;
  while (Date.now() < fim) {
    const alvo = a.findBlock({ matching: (bl) => bl && bl.name === 'stone', maxDistance: 4,
      useExtraInfo: (bl) => bl.position.y <= a.entity.position.y });
    if (alvo) { await a.dig(alvo, true).catch(() => {}); quebras++; } else { await L.espera(200); }
  }
  console.log(`Controle (sem o plugin): ${quebras} quebras, ${puxoes} puxões`);
  a.quit();
  await L.espera(1000);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
