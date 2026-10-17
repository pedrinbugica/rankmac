// Estresse da mina PvP: um bot com a Picareta Divina minerando sem parar + PvP com outro bot.
// Mede o MSPT do servidor e quantas vezes os bots são "puxados" (forcedMove = lag sentido pelo jogador).
const L = require('./lib');

function mspt() {
  const t = L.rcon('mspt');
  return t.split('\n').filter((l) => l.trim() && !l.startsWith('>')).join(' ').replace(/\s+/g, ' ').trim();
}

(async () => {
  const a = await L.criarBot('BotDivina');
  const b = await L.criarBot('BotAlvo');
  L.rcon('lp user BotDivina parent set dono', 'clear BotDivina');
  await L.espera(1500);

  // Picareta Divina pelo /menuop
  const menu = await L.abrirMenu(a, '/menuop');
  if (menu) {
    await a.clickWindow(20, 0, 0);
    await L.espera(800);
    if (a.currentWindow) a.closeWindow(a.currentWindow);
  }
  await L.espera(500);
  const divina = a.inventory.items().find((i) => i.name === 'netherite_pickaxe');
  console.log('Divina recebida: ' + !!divina);
  await a.equip(divina, 'hand');
  a.chat('/autovender');
  await L.espera(500);

  const puxoes = { a: 0, b: 0 };
  a.on('forcedMove', () => puxoes.a++);
  b.on('forcedMove', () => puxoes.b++);

  await L.comandoEspera(a, '/minas mina_pvp', 'Bem-vindo');
  await L.comandoEspera(b, '/minas mina_pvp', 'Bem-vindo');
  await L.espera(2000);
  puxoes.a = 0; puxoes.b = 0;
  console.log('MSPT antes: ' + mspt());

  // A entra no meio da mina e minera sem parar por 40 s
  L.rcon('tp BotDivina 4600 120 0');
  await L.espera(1500);
  a.digTime = () => 50;
  let quebras = 0;
  let resets = 0;
  a.on('message', (j) => { if (L.limpar(j.toString()).includes('vai resetar')) resets++; });
  const fim = Date.now() + 40000;
  let proximoAtaque = Date.now();
  let proximaMedida = Date.now() + 10000;
  while (Date.now() < fim) {
    const alvo = a.findBlock({ matching: (bl) => bl && bl.name !== 'air', maxDistance: 4,
      useExtraInfo: (bl) => bl.position.y <= a.entity.position.y && bl.position.y > 60
        && Math.abs(bl.position.x - 4600) <= 20 && Math.abs(bl.position.z) <= 20 });
    if (alvo) {
      const t0 = Date.now();
      await a.dig(alvo, true).catch(() => {});
      quebras++;
      if (Date.now() - t0 > 1500) console.log('  quebra lenta: ' + (Date.now() - t0) + ' ms');
    } else {
      await L.espera(200);
    }
    if (Date.now() > proximaMedida) {
      console.log('  MSPT durante: ' + mspt() + ' | quebras ' + quebras + ' | puxões A ' + puxoes.a + ' B ' + puxoes.b);
      proximaMedida = Date.now() + 10000;
    }
    if (Date.now() > proximoAtaque) {
      const e = a.nearestEntity((en) => en.type === 'player' && en.username === 'BotAlvo');
      if (e && e.position.distanceTo(a.entity.position) < 4) a.attack(e);
      proximoAtaque = Date.now() + 2000;
    }
  }
  console.log(`RESULTADO: ${quebras} quebras, ${resets} avisos de reset, puxões A=${puxoes.a} B=${puxoes.b}`);
  console.log('MSPT depois: ' + mspt());
  a.quit(); b.quit();
  await L.espera(1000);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
