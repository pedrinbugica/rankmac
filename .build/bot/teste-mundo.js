// Teste da fase 7 do NpcVivos (mundo vivo): preço dinâmico, comércio entre NPCs, diplomacia que declara guerra
// sozinha, guerra com placar e barra, preços de guerra, invasões (defendida e saqueada), rota cortada, fim da guerra
// com recompensa e bônus de vitória, promoção e placeholder.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotMundo1';

function saldo() {
  const m = L.rcon('balance ' + NOME).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}
const quase = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;
const json = (it) => (it ? JSON.stringify(it.components || []) : '');

// Teste previsível: sem invasões sozinhas, ondas menores, saque só bem no centro
function configurarTeste() {
  const f = path.join(PASTA, 'mundo.yml');
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/^  automaticas: true$/m, (m0, off) => (s.slice(0, off).includes('invasoes:') ? '  automaticas: false' : m0));
  s = s.replace(/^  ondas: \d+$/m, '  ondas: 2').replace(/^  soldados-por-onda: \d+$/m, '  soldados-por-onda: 2')
    .replace(/^  raio-do-saque: [\d.]+$/m, '  raio-do-saque: 1.0');
  fs.writeFileSync(f, s, 'utf8');
}

(async () => {
  for (let i = 0; i < 60 && !fs.existsSync(path.join(PASTA, 'npcs', 'mercadora_iara.yml')); i++) await L.espera(2000);
  L.verificar(fs.existsSync(path.join(PASTA, 'npcs', 'mercadora_iara.yml')), 'a Iara (Mercadores Livres) chegou na praça');
  L.verificar(fs.existsSync(path.join(PASTA, 'mundo.yml')) && fs.existsSync(path.join(PASTA, 'faccoes', 'mercadores_livres.yml')),
    'mundo.yml e faccoes/mercadores_livres.yml criados');
  configurarTeste();
  L.rcon('npcv reload');

  const bot = await L.criarBot(NOME);
  const npcPorNome = (trecho) => {
    let melhor = null;
    for (const e of Object.values(bot.entities)) {
      if (e.name !== 'mannequin' || !e.metadata) continue;
      if (!L.limpar(JSON.stringify(e.metadata[2] || '')).includes(trecho)) continue;
      if (!melhor || e.position.distanceTo(bot.entity.position) < melhor.position.distanceTo(bot.entity.position)) melhor = e;
    }
    return melhor;
  };
  const acharNpc = async (trecho, ms = 6000) => {
    const fim = Date.now() + ms;
    for (;;) {
      const e = npcPorNome(trecho);
      if (e || Date.now() > fim) return e;
      await L.espera(300);
    }
  };
  const fecharJanela = () => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); };
  const praca = async () => {
    fecharJanela();
    L.rcon('mv tp ' + NOME + ' sobrevivencia');
    await L.espera(1500);
  };
  const falarCom = async (trecho) => {
    await praca();
    const npc = await acharNpc(trecho);
    if (!npc) return false;
    L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${npc.position.x - 1.5} ${npc.position.y} ${npc.position.z}`);
    await L.espera(1200);
    const n2 = await acharNpc(trecho);
    bot.opcoes.length = 0;
    await bot.lookAt(n2.position.offset(0, 1.6, 0));
    await bot.activateEntityAt(n2, n2.position.offset(0, 1, 0));
    await L.espera(1200);
    return true;
  };
  // Abre a loja do NPC (pela conversa ou direto, se ele não tiver conversa)
  const abrirLoja = async (trecho) => {
    // NPC sem conversa em árvore (a Iara) já abre a loja no clique
    let janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 7000); });
    await falarCom(trecho);
    if (bot.currentWindow) return bot.currentWindow;
    janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
    // cada conversa chama a loja de um jeito: "Quero ver suas mercadorias", "Quero comprar ou vender"...
    const opcao = bot.opcoes.slice().reverse().find((o) => /mercadorias|comprar ou vender|Comprar e vender/i.test(o.texto));
    if (opcao) {
      bot.opcoes.length = 0;
      bot.chat(opcao.cmd);
    }
    return janela;
  };
  const comprar = async (slot, shift = false) => {
    const antes = saldo();
    const p = L.esperarMsg(bot, 'Você comprou');
    await bot.clickWindow(slot, 0, shift ? 1 : 0);
    const msg = await p;
    await L.espera(600);
    return { msg, gasto: Math.round((antes - saldo()) * 100) / 100 };
  };

  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'clear ' + NOME, 'eco set ' + NOME + ' 100000', 'gamemode survival ' + NOME,
    'minecraft:execute in minecraft:sobrevivencia run time set day', 'minecraft:effect give ' + NOME + ' minecraft:resistance 3600 255 true',
    'npcv reputacao ' + NOME + ' vila_aurora 0');
  await L.espera(2500);

  // ---------- Facção nova ----------
  L.verificar(await L.comandoEspera(bot, '/faccao', 'Mercadores Livres'), '/faccao mostra os Mercadores Livres');
  L.verificar(bot.msgs.some((m) => m.includes('Vila Aurora: Aliada')), 'Mercadores Livres e Vila Aurora são aliadas');

  // ---------- Preço dinâmico: comprar muito sobe o preço ----------
  let w = await abrirLoja('Borin');
  L.verificar(w && L.tituloJanela(w).includes('Comprar'), 'loja do Borin aberta');
  let r = await comprar(10);
  L.verificar(r.gasto === 70, 'primeira espada: $70 (' + r.gasto + ')');
  r = await comprar(10, true);
  L.verificar(r.msg && r.msg.includes('8x'), 'shift compra 8 espadas: ' + r.msg);
  w = bot.currentWindow;
  L.verificar(w && json(w.slots[10]).includes('Muita procura'), 'a lore avisa "Muita procura" na espada');
  r = await comprar(10);
  L.verificar(r.gasto === 87.5, 'depois de 9 compras a espada sobe 25%: $87,50 (' + r.gasto + ')');
  fecharJanela();

  // ---------- Vender muito derruba o preço (trigo da Marta) ----------
  L.rcon('minecraft:give ' + NOME + ' minecraft:wheat 320');
  await L.espera(800);
  w = await abrirLoja('Marta');
  w = w ? await L.clicarEsperarJanela(bot, 46) : null;
  const pagos = [];
  for (let i = 0; i < 5 && w; i++) {
    const antes = saldo();
    const p = L.esperarMsg(bot, 'Você vendeu');
    await bot.clickWindow(10, 0, 0);
    await p;
    await L.espera(500);
    pagos.push(Math.round((saldo() - antes) * 100) / 100);
  }
  L.verificar(pagos.join(',') === '40,38,36,36,34', 'cada venda de trigo paga menos: ' + pagos.join(', ') + ' (esperado 40, 38, 36, 36, 34)');
  fecharJanela();
  const resumo = L.limpar(L.rcon('npcv mercado ver fazendeira_marta'));
  L.verificar(/wheat .*oferta 5/.test(resumo), '/npcv mercado ver mostra a oferta de trigo: ' + (resumo.split('\n').find((l) => l.includes('wheat')) || '').trim());

  // ---------- Desligar o mercado volta ao preço base ----------
  L.verificar(/desligado/.test(L.limpar(L.rcon('npcv mercado desligar'))), '/npcv mercado desligar');
  w = await abrirLoja('Borin');
  // as espadas esgotaram com as compras; o preço mostrado na lore volta ao base
  const loreEspada = L.limpar(json(w && w.slots[10]));
  L.verificar(loreEspada.includes('$70') && !loreEspada.includes('Muita procura'), 'mercado desligado: a espada volta a mostrar $70');
  fecharJanela();

  // ---------- Comércio entre NPCs: a Iara manda pão para a Marta ----------
  w = await abrirLoja('Marta');
  const slotPao = w ? w.slots.findIndex((s, i) => i < 45 && s && s.name === 'bread') : -1;
  if (slotPao >= 0) {
    await comprar(slotPao, true);
    await comprar(slotPao, true);
  }
  fecharJanela();
  const trocas = L.limpar(L.rcon('npcv mercado trocar'));
  L.verificar(/[1-9]\d* troca/.test(trocas), 'comércio entre NPCs: ' + trocas.split('\n').slice(1).join(' ').trim());
  const log = fs.readFileSync(path.join(__dirname, '..', 'saida-servidor-teste.txt'), 'utf8');
  L.verificar(/mercadora_iara mandou \d+ lote\(s\) de BREAD para fazendeira_marta/.test(log), 'a Iara mandou pão para a Marta (log do servidor)');
  const pont = L.limpar(L.rcon('npcv pontuacao vila_aurora mercadores_livres'));
  L.verificar(/: 75 /.test(pont), 'a troca aproximou as facções (+5: 70 -> 75): ' + pont.split('\n').slice(1).join(' ').trim());

  // ---------- Diplomacia: pontuação baixa declara guerra sozinha ----------
  L.rcon('npcv membro ' + NOME + ' vila_aurora');
  await L.espera(500);
  const barras = [];
  bot.on('bossBarCreated', (b) => barras.push(L.limpar(JSON.stringify(b.title))));
  let p = L.esperarMsg(bot, 'GUERRA DECLARADA', 6000);
  L.rcon('npcv pontuacao vila_aurora irmandade_do_sul -70');
  L.verificar(await p, 'pontuação -70 (abaixo de -60): a Vila declara guerra à Irmandade sozinha');
  L.verificar(bot.msgs.some((m) => m.includes('reuniu o conselho')), 'o líder anuncia a decisão');
  await L.espera(1500);
  L.verificar(barras.some((t) => t.includes('Vila Aurora') && t.includes('x')), 'membro vê o placar da guerra no topo da tela: ' + barras[0]);
  L.verificar(await L.comandoEspera(bot, '/faccao guerras', 'Irmandade do Sul'), '/faccao guerras lista a guerra');
  const papi = L.limpar(L.rcon('papi parse ' + NOME + ' %npcvivos_guerra%'));
  L.verificar(/Vila Aurora 0 x 0 Irmandade do Sul/.test(papi), 'placeholder %npcvivos_guerra%: ' + papi.split('\n').slice(1).join(' ').trim());

  // Em guerra: itens de combate +25% (machado = arma). Membro tem 10% de desconto: 80 x 1,25 x 0,9 = 90
  w = await abrirLoja('Borin');
  L.verificar(w && json(w.slots[12]).includes('Guerra'), 'a lore do machado avisa o aumento da guerra');
  r = await comprar(12);
  L.verificar(r.gasto === 90, 'em guerra o machado custa $90 (80 + 25% - 10% de membro) (' + r.gasto + ')');
  fecharJanela();

  // ---------- Invasão defendida ----------
  L.rcon('minecraft:give ' + NOME + ' minecraft:netherite_sword[minecraft:enchantments={"minecraft:sharpness":50}]');
  await praca();
  const espada = bot.inventory.items().find((i) => i.name === 'netherite_sword');
  if (espada) await bot.equip(espada, 'hand');
  p = L.esperarMsg(bot, 'INVASÃO', 6000);
  L.rcon('npcv invasao irmandade_do_sul vila_aurora');
  L.verificar(await p, 'a invasão começa com anúncio');
  const fimInvasao = Date.now() + 120000;
  let mortos = 0;
  while (Date.now() < fimInvasao && !bot.msgs.some((m) => /VILA DEFENDIDA|SAQUEADA/.test(m))) {
    const s = npcPorNome('Soldado');
    if (!s) {
      await L.espera(500);
      continue;
    }
    L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${s.position.x + 1.2} ${s.position.y} ${s.position.z}`);
    await L.espera(450);
    const alvo = npcPorNome('Soldado');
    if (!alvo) continue;
    await bot.lookAt(alvo.position.offset(0, 1.4, 0), true);
    await L.espera(250);
    bot.attack(alvo);
    await L.espera(500);
    if (!bot.entities[alvo.id]) mortos++;
  }
  console.log('  soldados derrubados: ' + mortos);
  L.verificar(bot.msgs.some((m) => m.includes('VILA DEFENDIDA')), 'a vila foi defendida (todas as ondas derrubadas)');
  await L.espera(1000);
  let lista = L.limpar(L.rcon('npcv guerra lista'));
  const placar1 = (lista.match(/Vila Aurora (\d+) x (\d+) Irmandade/) || []).slice(1).map(Number);
  L.verificar(placar1[0] >= 50 + 5 * 6, 'defender a invasão deu pontos de guerra à Vila: ' + placar1.join(' x '));

  // ---------- Invasão saqueada (ninguém defendeu) ----------
  w = await abrirLoja('Borin');
  // Texto puro da lore (as partes coloridas vêm separadas no JSON do item)
  const textoPlano = (it) => (json(it).match(/"text":{"type":"string","value":"[^"]*"/g) || []).map((v) => v.replace(/^.*"value":"/, '').slice(0, -1)).join('');
  const estoqueEscudo = (janela) => {
    const m = textoPlano(janela && janela.slots[14]).match(/Estoque: ?(\d+)/);
    return m ? Number(m[1]) : NaN;
  };
  const escudoAntes = estoqueEscudo(w);
  fecharJanela();
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ~200 ~30 ~`, 'minecraft:effect give ' + NOME + ' minecraft:slow_falling 60 1 true');
  await L.espera(1500);
  p = L.esperarMsg(bot, 'SAQUEADA', 90000);
  L.rcon('npcv invasao irmandade_do_sul vila_aurora');
  L.verificar(await p, 'sem defensores, os soldados chegam no centro e a vila é saqueada');
  w = await abrirLoja('Borin');
  const escudoDepois = estoqueEscudo(w);
  fecharJanela();
  L.verificar(escudoAntes > 0 && escudoDepois === Math.floor(escudoAntes * 0.7), `o saque levou 30% do estoque do Borin (escudos ${escudoAntes} -> ${escudoDepois})`);
  lista = L.limpar(L.rcon('npcv guerra lista'));
  const placar2 = (lista.match(/Vila Aurora (\d+) x (\d+) Irmandade/) || []).slice(1).map(Number);
  L.verificar(placar2[1] >= 60, 'a invasão vitoriosa deu pontos à Irmandade: ' + placar2.join(' x '));

  // ---------- Rota cortada: Mercadores Livres em guerra com a Irmandade ----------
  L.rcon('npcv guerra iniciar mercadores_livres irmandade_do_sul 1');
  await L.espera(800);
  w = await abrirLoja('Iara');
  const slotPerola = w ? w.slots.findIndex((s, i) => i < 45 && s && s.name === 'ender_pearl') : -1;
  L.verificar(slotPerola >= 0 && json(w.slots[slotPerola]).includes('cortada'), 'pérola da Iara (importada do Sul): "rota cortada pela guerra"');
  fecharJanela();
  L.rcon('npcv guerra parar mercadores_livres irmandade_do_sul');
  await L.espera(800);

  // ---------- Fim da guerra: a Vila vence ----------
  p = L.esperarMsg(bot, 'FIM DA GUERRA', 6000);
  const antesFim = saldo();
  L.rcon('npcv guerra parar vila_aurora irmandade_do_sul');
  const fim = await p;
  L.verificar(fim && fim.includes('Vila Aurora venceu'), 'a guerra acaba e a Vila vence pelos pontos: ' + fim);
  await L.espera(800);
  L.verificar(bot.msgs.some((m) => m.includes('Você ajudou')) && quase(saldo() - antesFim, 300, 0.01), 'quem ajudou ganha $300 de recompensa (' + (saldo() - antesFim) + ')');
  L.verificar(bot.msgs.some((m) => m.includes('agora são rivais')), 'depois da guerra as facções voltam a ser rivais');
  // Bônus de vitória: 80 x 0,9 (vitória) x 0,9 (membro) = 64,80
  w = await abrirLoja('Borin');
  L.verificar(w && json(w.slots[12]).includes('venceu a última guerra'), 'a lore mostra o bônus da vitória');
  r = await comprar(12);
  L.verificar(r.gasto === 64.8, 'loja da vencedora fica 10% mais barata: machado $64,80 (' + r.gasto + ')');
  fecharJanela();

  // ---------- Promoção ----------
  p = L.esperarMsg(bot, 'PROMOÇÃO');
  L.rcon('npcv promocao todas 20 5');
  L.verificar(await p, 'a promoção é anunciada para todos');
  w = await abrirLoja('Borin');
  r = await comprar(12);
  L.verificar(r.gasto === 51.84, 'promoção de 20% em cima do resto: machado $51,84 (' + r.gasto + ')');
  fecharJanela();

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
