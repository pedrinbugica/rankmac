// Compara os "puxões" (correções de posição) em cenários diferentes para achar a causa do lag.
const L = require('./lib');

async function minerar(bot, cx, cz, meio, segundos) {
  let puxoes = 0;
  const ouvir = () => puxoes++;
  bot.on('forcedMove', ouvir);
  // tempo de quebra real (sem trapaça)
  let quebras = 0;
  const fim = Date.now() + segundos * 1000;
  while (Date.now() < fim) {
    const alvo = bot.findBlock({ matching: (bl) => bl && bl.name !== 'air', maxDistance: 4,
      useExtraInfo: (bl) => bl.position.y <= bot.entity.position.y && bl.position.y > 60
        && Math.abs(bl.position.x - cx) <= meio && Math.abs(bl.position.z - cz) <= meio });
    if (alvo) { await bot.dig(alvo, true).catch(() => {}); quebras++; } else { await L.espera(200); }
  }
  bot.removeListener('forcedMove', ouvir);
  return { puxoes, quebras };
}

(async () => {
  const a = await L.criarBot('BotDivina');
  L.rcon('lp user BotDivina parent set dono', 'clear BotDivina', 'effect clear BotDivina', 'rankupadmin darpicareta BotDivina', 'rankupadmin resetarmina todas');
  await L.espera(1500);
  const menu = await L.abrirMenu(a, '/menuop');
  if (menu) { await a.clickWindow(20, 0, 0); await L.espera(800); if (a.currentWindow) a.closeWindow(a.currentWindow); }
  await L.espera(500);
  const divina = a.inventory.items().find((i) => i.name === 'netherite_pickaxe');
  const comum = a.inventory.items().find((i) => i.name === 'diamond_pickaxe');
  console.log('picaretas: divina=' + !!divina + ' comum=' + !!comum);

  const cenarios = [
    ['Divina na mina PvP', divina, 4600, 0, 20],

    ['Comum na mina PvP', comum, 4600, 0, 20],
  ];
  for (const [nome, pick, cx, cz, meio] of cenarios) {
    L.rcon('rankupadmin resetarmina todas');
    await L.espera(2000);
    await a.equip(pick, 'hand');
    L.rcon(`tp BotDivina ${cx} 121 ${cz}`);
    await L.espera(2000);
    const r = await minerar(a, cx, cz, meio, 20);
    console.log(`${nome}: ${r.quebras} quebras, ${r.puxoes} puxões`);
  }
  a.quit();
  await L.espera(1000);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
