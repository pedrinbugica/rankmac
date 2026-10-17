// Teste 2: acesso às minas especiais, drops por rank, Laser + Fundição + tokens, mina PvP e combate
const L = require('./lib');

async function cavarPerto(bot, nomes) {
  bot.digTime = () => 150;
  const alvo = bot.findBlock({ matching: (b) => b && nomes.includes(b.name), maxDistance: 6 });
  if (!alvo) return null;
  await bot.dig(alvo, true).catch((e) => console.log('  dig: ' + e.message));
  await L.espera(800);
  return { alvo: alvo.name };
}

function numero(texto, rotulo) {
  const m = texto.match(new RegExp(rotulo + ': ([\\d.]+)'));
  return m ? Number(m[1].replace(/\./g, '')) : 0;
}

(async () => {
  // ---------- Acesso ----------
  L.rcon('lp user BotComum parent remove vip', 'effect clear BotPvpA', 'effect clear BotPvpB');
  const comum = await L.criarBot('BotComum');
  L.verificar(await L.comandoEspera(comum, '/minas mina_vip', 'exclusiva para VIP'), 'Mina VIP bloqueada para quem não é VIP');
  L.verificar(await L.comandoEspera(comum, '/minas mina_mvp', 'exclusiva para MVP'), 'Mina MVP bloqueada para quem não é MVP');
  L.verificar(await L.comandoEspera(comum, '/minas mina_prestigio', 'prestígio 1'), 'Mina do Prestígio bloqueada sem prestígio');
  L.rcon('lp user BotComum parent add vip');
  await L.espera(1200);
  L.verificar(await L.comandoEspera(comum, '/minas mina_vip', 'Bem-vindo'), 'VIP entra na Mina VIP');
  L.verificar(await L.comandoEspera(comum, '/minas mina_vipplus', 'exclusiva para VIP+'), 'VIP não entra na Mina VIP+');
  await L.espera(1500);
  const r = await cavarPerto(comum, ['smooth_basalt']);
  await L.espera(500);
  const itens = comum.inventory.items().map((i) => i.name);
  console.log('  minerou ' + (r && r.alvo) + ' -> inventário: ' + itens.join(', '));
  const plebeu = ['stone', 'coal_ore', 'copper_ore', 'andesite'];
  L.verificar(r && itens.some((n) => plebeu.includes(n)) && !itens.some((n) => ['amethyst_block', 'calcite', 'smooth_basalt'].includes(n)),
    'Mina VIP dá os minérios do rank seguinte (Plebeu), não os blocos decorativos');

  // Menu /minas: minas normais nas linhas 1-3 e especiais na linha 4
  const menu = await L.abrirMenu(comum, '/minas');
  const linha4 = [38, 39, 40, 41, 42].map((s) => (menu && menu.slots[s] ? menu.slots[s].name : '-'));
  console.log('  /minas linha 4: ' + linha4.join(', ') + ' | slot 31: ' + (menu && menu.slots[31] && menu.slots[31].name));
  L.verificar(linha4.join() === 'amethyst_block,barrier,barrier,netherite_sword,barrier', 'menu /minas mostra as especiais (VIP liberada, VIP+/MVP/Prestígio trancadas, PvP liberada)');
  if (comum.currentWindow) comum.closeWindow(comum.currentWindow);
  await L.espera(500);

  // ---------- Laser + Fundição + tokens ----------
  const dono = await L.criarBot('BotDono');
  const pick = dono.inventory.items().find((i) => i.name.endsWith('_pickaxe'));
  await dono.equip(pick, 'hand');
  await L.espera(300);
  await L.comandoEspera(dono, '/rankupadmin setpicareta laser 1000', 'definida');
  await L.comandoEspera(dono, '/rankupadmin setpicareta fundicao 1', 'definida');
  const antesInfo = L.rcon('rankupadmin info BotDono');
  await L.comandoEspera(dono, '/minas mendigo', 'Bem-vindo');
  await L.espera(2000);
  const r2 = await cavarPerto(dono, ['stone', 'cobblestone', 'coal_ore']);
  await L.espera(1000);
  const depoisInfo = L.rcon('rankupadmin info BotDono');
  const db = numero(depoisInfo, 'Blocos quebrados') - numero(antesInfo, 'Blocos quebrados');
  const dt = numero(depoisInfo, 'Tokens') - numero(antesInfo, 'Tokens');
  console.log(`  +${db} blocos, +${dt} tokens`);
  L.verificar(r2 && db >= 400, 'Laser quebrou a camada inteira (' + db + ' blocos)');
  L.verificar(dt > 0, 'tokens caíram minerando (+' + dt + ')');
  const inv = [...new Set(dono.inventory.items().map((i) => i.name))];
  L.verificar(inv.includes('coal') && !inv.includes('coal_ore') && !inv.includes('cobblestone'), 'Fundição: carvão sai pronto e pedregulho vira pedra: ' + inv.join(','));
  const v = await L.comandoEspera(dono, '/vender', 'Você vendeu');
  L.verificar(v && v.includes('x2'), '/vender: MVP +50% + booster +50% = x2: ' + v);

  comum.quit(); dono.quit();
  await L.espera(1000);
  // ---------- Mina PvP ----------
  const a = await L.criarBot('BotPvpA');
  const b = await L.criarBot('BotPvpB');
  L.rcon('give BotPvpB dirt 10', 'give BotPvpA dirt 5');
  await L.espera(1000);
  let alvoB = a.nearestEntity((e) => e.type === 'player' && e.username === 'BotPvpB');
  const vidaSpawn = b.health;
  if (alvoB) { a.attack(alvoB); await L.espera(800); }
  L.verificar(b.health === vidaSpawn, 'no spawn não existe PvP (vida ' + b.health + ')');

  await L.comandoEspera(a, '/minas mina_pvp', 'Bem-vindo');
  await L.espera(1500);
  await L.comandoEspera(b, '/minas mina_pvp', 'Bem-vindo');
  await L.espera(3000);
  const vidaAntes = b.health;
  const tag = L.esperarMsg(b, 'entrou em combate', 8000);
  for (let i = 0; i < 4 && b.health >= vidaAntes; i++) {
    alvoB = a.nearestEntity((e) => e.type === 'player' && e.username === 'BotPvpB');
    if (alvoB) { await a.lookAt(alvoB.position.offset(0, 1.6, 0)); a.attack(alvoB); }
    await L.espera(900);
  }
  L.verificar(b.health < vidaAntes, `na mina PvP o dano passa (vida ${vidaAntes} -> ${b.health})`);
  L.verificar(await tag, 'quem apanha entra em combate');
  L.verificar(await L.comandoEspera(b, '/spawn', 'não pode usar este comando em combate'), '/spawn bloqueado em combate');

  L.rcon('effect give BotPvpA minecraft:strength 60 100');
  await L.espera(700);
  const morreu = new Promise((res) => { b.once('death', () => res(true)); setTimeout(() => res(false), 8000); });
  for (let i = 0; i < 6; i++) {
    alvoB = a.nearestEntity((e) => e.type === 'player' && e.username === 'BotPvpB');
    if (!alvoB) break;
    await a.lookAt(alvoB.position.offset(0, 1.6, 0));
    a.attack(alvoB);
    await L.espera(700);
  }
  L.verificar(await morreu, 'B morreu na mina PvP');
  await L.espera(1500);
  const chao = Object.values(a.entities).filter((e) => e.name === 'item');
  console.log('  itens no chão perto de A: ' + chao.length);
  L.verificar(chao.length > 0, 'itens do B caíram no chão');
  try { b.respawn(); } catch (e) { /* */ }
  await L.espera(2500);
  const invB = b.inventory.items().map((i) => i.name);
  console.log('  inventário de B depois de renascer: ' + invB.join(', '));
  L.verificar(invB.some((n) => n.endsWith('_pickaxe')) && !invB.includes('dirt'), 'B ficou só com a picareta do servidor');

  const aviso = L.esperarMsg(b, 'deslogou em combate', 6000);
  a.quit();
  L.verificar(await aviso, 'quem desloga em combate morre (aviso no chat)');

  b.quit();
  await L.espera(1500);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
