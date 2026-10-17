// Teste 3: dinheiro separado Rankup x Sobrevivência, /pay, loja da Sobrevivência, rankup só no Rankup,
// requisito de blocos e aviso de reset da mina
const L = require('./lib');

function saldo(nome) {
  const t = L.rcon('balance ' + nome);
  const m = t.match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}

async function irPara(bot, cmd, trecho) {
  const ok = await L.comandoEspera(bot, cmd, trecho, 8000);
  await L.espera(2500);
  return ok;
}

(async () => {
  const a = await L.criarBot('BotEcoA');
  const b = await L.criarBot('BotEcoB');
  await L.espera(1000);
  L.rcon('eco set BotEcoA 5000', 'eco set BotEcoB 1000');
  await L.espera(500);
  L.verificar(saldo('BotEcoA') === 5000, 'saldo no Rankup = $5.000');

  await irPara(a, '/sobrevivencia', 'SOBREVIV');
  const s1 = saldo('BotEcoA');
  L.verificar(s1 !== 5000, 'na Sobrevivência o dinheiro do Rankup não aparece (saldo $' + s1 + ')');
  L.rcon('eco set BotEcoA 777');
  await irPara(a, '/spawn', 'spawn');
  L.verificar(saldo('BotEcoA') === 5000, 'de volta ao Rankup: saldo $5.000 preservado (' + saldo('BotEcoA') + ')');
  await irPara(a, '/sobrevivencia', 'SOBREVIV');
  L.verificar(saldo('BotEcoA') === 777, 'de volta à Sobrevivência: saldo $777 preservado (' + saldo('BotEcoA') + ')');

  L.verificar(await L.comandoEspera(a, '/rankup', 'só funciona no mundo Rankup'), '/rankup bloqueado na Sobrevivência');

  // Loja da Sobrevivência
  let w = await L.abrirMenu(a, '/loja');
  L.verificar(w && L.tituloJanela(w).includes('Loja da Sobreviv'), '/loja abre a loja da Sobrevivência: ' + L.tituloJanela(w));
  if (w) {
    const cat = await L.clicarEsperarJanela(a, 12);
    L.verificar(cat && L.tituloJanela(cat).includes('Ferramentas'), 'categoria Ferramentas abre');
    if (cat) {
      const p = L.esperarMsg(a, 'Você comprou');
      await a.clickWindow(10, 0, 0);
      L.verificar(await p, 'comprar pá de ouro');
      await L.espera(800);
      if (a.currentWindow) a.closeWindow(a.currentWindow);
    }
  }
  await L.espera(500);
  L.verificar(a.inventory.items().some((i) => i.name === 'golden_shovel'), 'pá de ouro no inventário');
  L.verificar(saldo('BotEcoA') === 757, 'pagou $20 do dinheiro da Sobrevivência (' + saldo('BotEcoA') + ')');
  L.rcon('give BotEcoA wheat 64');
  await L.espera(500);
  w = await L.abrirMenu(a, '/loja');
  if (w) {
    const cat = await L.clicarEsperarJanela(a, 13);
    if (cat) {
      const p = L.esperarMsg(a, 'Você vendeu');
      await a.clickWindow(11, 1, 0); // direito = vender
      L.verificar(await p, 'vender 64 trigos na loja');
      await L.espera(800);
      if (a.currentWindow) a.closeWindow(a.currentWindow);
    }
  }
  await L.espera(500);
  L.verificar(saldo('BotEcoA') === 789, 'trigo vendido por $32 (' + saldo('BotEcoA') + ')');

  // /pay entre mundos e offline
  L.verificar(await L.comandoEspera(a, '/pay BotEcoB 10', 'dinheiro de cada mundo é separado'), '/pay bloqueado entre mundos diferentes');
  L.verificar(await L.comandoEspera(a, '/pagar BotEcoB 10', 'dinheiro de cada mundo é separado'), '/pagar (atalho) também bloqueado');
  L.verificar(await L.comandoEspera(a, '/pay NinguemOffline 10', 'online'), '/pay para offline bloqueado');
  await irPara(a, '/spawn', 'spawn');
  const antesB = saldo('BotEcoB');
  a.chat('/pay BotEcoB 10');
  await L.espera(1500);
  L.verificar(saldo('BotEcoB') === antesB + 10, '/pay funciona no mesmo mundo (' + antesB + ' -> ' + saldo('BotEcoB') + ')');

  // Requisito de blocos
  L.rcon('rankupadmin setrank BotEcoA rei', 'eco set BotEcoA 900000000');
  await L.espera(500);
  L.verificar(await L.comandoEspera(a, '/rankup', 'minerado'), '/rankup pede blocos minerados para Imperador');

  // Aviso de reset (mina com reset de 1 minuto)
  L.rcon('rankupadmin resetarmina mendigo');
  await irPara(b, '/minas mendigo', 'Bem-vindo');
  const aviso = await L.esperarMsg(b, 'vai resetar em', 70000);
  L.verificar(aviso, 'aviso no chat antes do reset: ' + aviso);
  const reset = await L.esperarMsg(b, 'foi resetada', 15000);
  L.verificar(reset, 'mina resetou depois do aviso');

  a.quit(); b.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
