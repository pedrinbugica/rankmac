// Teste 1: /menuop do Dono, /loja + booster, /picareta com tokens, efeitos
const L = require('./lib');

(async () => {
  const bot = await L.criarBot('BotDono');
  L.rcon('lp user BotDono parent set dono', 'clear BotDono', 'effect clear BotDono', 'rankupadmin darpicareta BotDono', 'rankupadmin tokens BotDono definir 0');
  await L.espera(1500);

  let w = await L.abrirMenu(bot, '/menuop');
  L.verificar(w && L.tituloJanela(w).includes('MENU OP'), '/menuop abre para o Dono: ' + L.tituloJanela(w));
  if (w) {
    const reaberto = await L.clicarEsperarJanela(bot, 15, 0, 0);
    L.verificar(reaberto, 'botão de tokens do /menuop responde (menu reabriu)');
    await L.espera(500);
    bot.closeWindow(bot.currentWindow || reaberto);
  }
  await L.espera(500);
  let info = L.rcon('rankupadmin info BotDono');
  L.verificar(/Tokens: 1.000/.test(info), '/menuop deu +1.000 tokens');

  L.rcon('eco set BotDono 100000');
  await L.espera(500);
  w = await L.abrirMenu(bot, '/loja');
  L.verificar(w && L.tituloJanela(w).includes('Loja do Rankup'), '/loja abre a loja do Rankup (e não a ajuda do QuickShop): ' + L.tituloJanela(w));
  if (w) {
    const cat = await L.clicarEsperarJanela(bot, 11);
    L.verificar(cat && L.tituloJanela(cat).includes('Boosters de Venda'), 'categoria Boosters abre: ' + L.tituloJanela(cat));
    if (cat) {
      const p = L.esperarMsg(bot, 'Booster de venda');
      await bot.clickWindow(10, 0, 0);
      L.verificar(await p, 'comprar booster de venda +50%');
      await L.espera(800);
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    }
  }
  await L.espera(500);
  const bal = L.rcon('balance BotDono');
  L.verificar(/99[.,]700/.test(bal), 'booster custou o preço mínimo ($300): ' + bal.split('\n').slice(1).join(' ').trim());

  // Picareta: segura a picareta (dada ao entrar) e compra melhorias com tokens
  const idx = bot.inventory.items().findIndex((i) => i.name.endsWith('_pickaxe'));
  const pick = bot.inventory.items()[idx];
  L.verificar(pick, 'bot recebeu a picareta ao entrar');
  if (pick) {
    await bot.equip(pick, 'hand');
    await L.espera(300);
  }
  w = await L.abrirMenu(bot, '/picareta');
  L.verificar(w && L.tituloJanela(w).includes('Melhorar Picareta'), '/picareta abre');
  if (w) {
    const nomes = [29, 30, 31, 32, 33].map((s) => (w.slots[s] ? L.limpar(JSON.stringify(w.slots[s].customName || w.slots[s].name)) : '-'));
    console.log('  linha de tokens: ' + nomes.join(' | '));
    for (const [slot, nome] of [[29, 'Laser'], [32, 'Visão Noturna'], [33, 'Fundição'], [31, 'Velocidade']]) {
      const p = L.esperarMsg(bot, 'agora está no nível');
      const nova = L.clicarEsperarJanela(bot, slot);
      L.verificar(await p, `comprar ${nome} com tokens`);
      await nova;
      await L.espera(300);
    }
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
  }
  await L.espera(2500);
  const efeitos = Object.values(bot.entity.effects || {}).map((e) => bot.registry.effects[e.id]?.name);
  console.log('  efeitos: ' + efeitos.join(', '));
  L.verificar(efeitos.includes('night_vision') || efeitos.includes('NightVision'), 'Visão Noturna ativa segurando a picareta');
  L.verificar(efeitos.includes('speed') || efeitos.includes('Speed'), 'Velocidade ativa segurando a picareta');
  const m = await L.comandoEspera(bot, '/tokens', 'tokens');
  L.verificar(m && m.includes('290'), '/tokens mostra o saldo certo (1000-60-100-400-150=290): ' + m);

  // Troca para um slot vazio: os efeitos devem sumir
  bot.setQuickBarSlot(8);
  await L.espera(2500);
  const depois = Object.values(bot.entity.effects || {}).map((e) => bot.registry.effects[e.id]?.name);
  L.verificar(!depois.includes('night_vision') && !depois.includes('speed'), 'efeitos somem ao soltar a picareta: ' + depois.join(','));

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
