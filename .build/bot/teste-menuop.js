// Teste do /menuop completo: categorias, ações em outro jogador, confirmação com Shift e perguntas no chat.
const L = require('./lib');

function info(nome) {
  return L.rcon('rankupadmin info ' + nome);
}
function saldo(nome) {
  const m = L.rcon('balance ' + nome).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}

(async () => {
  const dono = await L.criarBot('BotDono');
  const alvo = await L.criarBot('BotAlvo');
  L.rcon('lp user BotDono parent set dono', 'lp user BotAlvo parent set default', 'rankupadmin setrank BotAlvo mendigo',
    'rankupadmin tokens BotAlvo definir 0', 'eco set BotAlvo 0', 'clear BotAlvo', 'rankupadmin darpicareta BotAlvo');
  await L.espera(2000);

  const abrirHub = async () => {
    if (dono.currentWindow) dono.closeWindow(dono.currentWindow);
    await L.espera(300);
    return L.abrirMenu(dono, '/menuop BotAlvo');
  };
  let w = await abrirHub();
  L.verificar(w && L.tituloJanela(w).includes('MENU OP') && L.tituloJanela(w).includes('BotAlvo'), '/menuop BotAlvo abre o painel');

  // Todas as categorias abrem e o "Voltar" funciona
  const categorias = [[19, 'Jogador'], [20, 'Moderação'], [21, 'Cargos'], [22, 'Economia'], [23, 'Itens'], [24, 'Mundos e Minas'], [25, 'Servidor']];
  for (const [slot, nome] of categorias) {
    const pag = await L.clicarEsperarJanela(dono, slot);
    L.verificar(pag && L.tituloJanela(pag).includes(nome), `categoria ${nome} abre`);
    const volta = await L.clicarEsperarJanela(dono, 48);
    L.verificar(volta && L.tituloJanela(volta).includes('MENU OP'), `voltar de ${nome} para o painel`);
  }

  // Economia
  await L.clicarEsperarJanela(dono, 22);
  await L.clicarEsperarJanela(dono, 10);
  L.verificar(saldo('BotAlvo') === 1000, 'Economia: +$1K no BotAlvo (' + saldo('BotAlvo') + ')');
  await L.clicarEsperarJanela(dono, 16);
  L.verificar(/Tokens: 1\.000/.test(info('BotAlvo')), 'Economia: +1.000 tokens');
  await L.clicarEsperarJanela(dono, 19);
  L.verificar(/Rank: \[Plebeu\]/.test(info('BotAlvo')), 'Economia: rank +1 (Plebeu)');
  // Definir dinheiro pelo chat
  let p = L.esperarMsg(dono, 'Quanto dinheiro');
  await dono.clickWindow(15, 0, 0);
  L.verificar(await p, 'Economia: pergunta o valor no chat');
  const reabriu = new Promise((res) => { dono.once('windowOpen', res); setTimeout(res, 4000); });
  dono.chat('2,5k');
  await reabriu;
  await L.espera(500);
  L.verificar(saldo('BotAlvo') === 2500, 'Economia: definir dinheiro "2,5k" = $2.500 (' + saldo('BotAlvo') + ')');

  // Cargos: VIP
  w = await abrirHub();
  await L.clicarEsperarJanela(dono, 21);
  await L.clicarEsperarJanela(dono, 11);
  await L.espera(1500);
  L.verificar(await L.comandoEspera(alvo, '/minas mina_vip', 'Bem-vindo'), 'Cargos: BotAlvo virou VIP e entra na Mina VIP');

  // Moderação: congelar
  w = await abrirHub();
  await L.clicarEsperarJanela(dono, 20);
  await L.clicarEsperarJanela(dono, 15);
  L.verificar(await L.comandoEspera(alvo, '/spawn', 'congelado'), 'Moderação: congelado não usa comandos');
  await L.clicarEsperarJanela(dono, 15);
  L.verificar(await L.comandoEspera(alvo, '/spawn', 'Teleportado'), 'Moderação: descongelado volta a usar comandos');

  // Jogador: voar, matar com confirmação
  w = await abrirHub();
  await L.clicarEsperarJanela(dono, 19);
  await L.clicarEsperarJanela(dono, 12);
  const voa = L.rcon('data get entity BotAlvo abilities.mayfly');
  L.verificar(/1b|true/.test(voa), 'Jogador: voo ligado (' + voa.split('\n').slice(1).join(' ').trim() + ')');
  p = L.esperarMsg(dono, 'Segure Shift');
  await dono.clickWindow(25, 0, 0);
  L.verificar(await p, 'Jogador: "Matar" sem Shift só pede confirmação');
  const morreu = new Promise((res) => { alvo.once('death', () => res(true)); setTimeout(() => res(false), 4000); });
  await dono.clickWindow(25, 0, 1);
  L.verificar(await morreu, 'Jogador: "Matar" com Shift mata');
  await L.espera(1500);
  try { alvo.respawn(); } catch (e) { /* */ }
  await L.espera(1500);

  // Itens: picareta MAX e editor
  const antes = alvo.inventory.items().filter((i) => i.name.endsWith('_pickaxe')).length;
  w = await abrirHub();
  await L.clicarEsperarJanela(dono, 23);
  await L.clicarEsperarJanela(dono, 10);
  await L.espera(500);
  const depois = alvo.inventory.items().filter((i) => i.name.endsWith('_pickaxe')).length;
  L.verificar(depois === antes + 1, `Itens: Picareta MAX entregue (${antes} -> ${depois})`);
  const pick = alvo.inventory.items().find((i) => i.name === 'diamond_pickaxe');
  if (pick) await alvo.equip(pick, 'hand');
  await L.espera(500);
  const editor = await L.clicarEsperarJanela(dono, 14);
  L.verificar(editor && L.tituloJanela(editor).includes('Editor de picareta'), 'Itens: editor de picareta abre');
  const ed2 = await L.clicarEsperarJanela(dono, 19);
  L.verificar(!!ed2, 'Itens: editor muda o nível e reabre');

  // Mundos: lista de minas e horário
  w = await abrirHub();
  await L.clicarEsperarJanela(dono, 24);
  const minas = await L.clicarEsperarJanela(dono, 14);
  L.verificar(minas && L.tituloJanela(minas).includes('Todas as minas'), 'Mundos: lista de todas as minas abre');
  await L.clicarEsperarJanela(dono, 49);
  p = L.esperarMsg(dono, 'Horário alterado');
  await dono.clickWindow(21, 0, 0);
  L.verificar(await p, 'Mundos: noite');

  // Servidor: anúncio pelo chat, desempenho e PvP da Sobrevivência
  w = await abrirHub();
  await L.clicarEsperarJanela(dono, 25);
  p = L.esperarMsg(dono, 'Qual o anúncio');
  await dono.clickWindow(10, 0, 0);
  L.verificar(await p, 'Servidor: pergunta o anúncio');
  const anuncio = L.esperarMsg(alvo, 'ANÚNCIO');
  dono.chat('Evento hoje as 20h');
  const a = await anuncio;
  L.verificar(a && a.includes('Evento hoje'), 'Servidor: todos recebem o anúncio: ' + a);
  await L.espera(800);
  if (!dono.currentWindow) { w = await abrirHub(); await L.clicarEsperarJanela(dono, 25); }
  p = L.esperarMsg(dono, 'PvP alterado');
  await dono.clickWindow(19, 0, 0);
  L.verificar(await p, 'Servidor: PvP da Sobrevivência alterado');
  await L.espera(800);
  await dono.clickWindow(19, 0, 0); // volta como estava
  await L.espera(800);
  const desligar = L.esperarMsg(dono, 'Segure Shift');
  await dono.clickWindow(16, 0, 0);
  L.verificar(await desligar, 'Servidor: "Desligar" sem Shift só pede confirmação');

  dono.quit(); alvo.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
