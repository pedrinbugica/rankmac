// Teste da fase 5 do NpcVivos: upgrade de itens no ferreiro (+1 a +10), pedras, pergaminho, raridade,
// bônus de dano/defesa, habilidade do +9, pedras que caem de monstros, receitas bloqueadas e loja.
// Usa uma cópia de TESTE e ajusta as chances do upgrades.yml dela para o resultado ser previsível.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotForja5';

function saldo() {
  const m = L.rcon('balance ' + NOME).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}
function localNpc(id) {
  const t = fs.readFileSync(path.join(PASTA, 'npcs', id + '.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  return { x: num('x'), y: num('y'), z: num('z') };
}
function vidaDe(tag) {
  const m = L.limpar(L.rcon(`data get entity @e[type=minecraft:husk,tag=${tag},limit=1] Health`)).match(/([\d.]+)f/);
  return m ? Number(m[1]) : NaN;
}
const json = (it) => (it ? JSON.stringify(it.components || []) + JSON.stringify(it.nbt || {}) : '');
const quase = (a, b, tol) => Math.abs(a - b) <= tol;

// Chances previsíveis: tudo 100% menos o +7 (0%, para testar falha e pergaminho); só pedra comum cai (100%)
function configurarTeste() {
  const f = path.join(PASTA, 'upgrades.yml');
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/^(  \d+: +\{chance: )\d+/gm, (m0, ini) => ini + '100');
  s = s.replace(/^(  7: +\{chance: )\d+/m, (m0, ini) => ini + '0');
  s = s.replace(/^    comum: [\d.]+$/m, '    comum: 100').replace(/^    rara: [\d.]+$/m, '    rara: 0')
    .replace(/^    epica: [\d.]+$/m, '    epica: 0').replace(/^    lendaria: [\d.]+$/m, '    lendaria: 0')
    .replace(/^  pergaminho-chance: [\d.]+$/m, '  pergaminho-chance: 0');
  fs.writeFileSync(f, s, 'utf8');
}

(async () => {
  for (let i = 0; i < 60 && !fs.existsSync(path.join(PASTA, 'upgrades.yml')); i++) await L.espera(2000);
  L.verificar(fs.existsSync(path.join(PASTA, 'upgrades.yml')), 'upgrades.yml criado');
  configurarTeste();
  L.rcon('npcv reload');
  const borinYml = fs.readFileSync(path.join(PASTA, 'npcs', 'ferreiro_borin.yml'), 'utf8');
  L.verificar(/item_completo/.test(borinYml), 'o Borin ganhou um item especial na loja (pedra comum)');

  const bot = await L.criarBot(NOME);
  const contaPedra = (nome) => bot.inventory.items().filter((i) => json(i).includes('Pedra de Aprimoramento') && json(i).includes(nome))
    .reduce((s, i) => s + i.count, 0);
  const contaPerg = () => bot.inventory.items().filter((i) => json(i).includes('Pergaminho de Prote')).reduce((s, i) => s + i.count, 0);
  const borin = localNpc('ferreiro_borin');
  const centro = { x: borin.x - 4, y: borin.y, z: borin.z };

  const fecharJanela = () => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); };
  const falarComBorin = async () => {
    fecharJanela();
    L.rcon(`tp ${NOME} ${borin.x - 1.5} ${borin.y} ${borin.z}`);
    await L.espera(1500);
    const npc = bot.nearestEntity((e) => e.name === 'mannequin');
    bot.opcoes.length = 0;
    await bot.lookAt(npc.position.offset(0, 1.6, 0));
    await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
    await L.espera(1200);
  };
  const abrirForja = async () => {
    await falarComBorin();
    const janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
    const ok = await L.clicarOpcao(bot, 'Aprimorar uma arma');
    return ok ? janela : null;
  };
  const aprimorar = async () => L.clicarEsperarJanela(bot, 22);
  const naMao = () => bot.inventory.slots[bot.inventory.hotbarStart + bot.quickBarSlot];

  L.rcon('lp user ' + NOME + ' permission set npcvivos.admin.upgrade true', 'lp user ' + NOME + ' permission set npcvivos.admin.editar true');
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'clear ' + NOME, 'eco set ' + NOME + ' 100000', 'gamemode survival ' + NOME,
    'minecraft:execute in minecraft:sobrevivencia run time set day', 'minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true',
    'npcv reputacao ' + NOME + ' vila_aurora 0', 'minecraft:give ' + NOME + ' minecraft:iron_sword');
  await L.espera(2500);
  bot.setQuickBarSlot(0);

  // ---------- A forja pela conversa ----------
  let w = await abrirForja();
  L.verificar(w && L.tituloJanela(w).includes('Forja'), 'opção "Aprimorar" na conversa abre a forja: ' + L.tituloJanela(w));
  L.verificar(w && json(w.slots[22]).includes('Aprimorar para +1'), 'botão "Aprimorar para +1"');
  L.verificar(w && json(w.slots[14]).includes('Pedra de Aprimoramento'), 'custo mostra a pedra necessária');
  let p = L.esperarMsg(bot, 'Você precisa de');
  await aprimorar();
  L.verificar(await p, 'sem pedras: avisa e não aprimora');

  // ---------- +1 a +6 ----------
  L.rcon('npcv dar ' + NOME + ' comum 10', 'npcv dar ' + NOME + ' rara 6');
  await L.espera(800);
  L.verificar(contaPedra('Comum') === 10 && contaPedra('Rara') === 6, '/npcv dar entrega as pedras (' + contaPedra('Comum') + ' comuns, ' + contaPedra('Rara') + ' raras)');
  const antes = saldo();
  w = await abrirForja();
  for (let n = 1; n <= 6; n++) {
    p = L.esperarMsg(bot, 'agora é');
    w = await aprimorar();
    const msg = await p;
    if (!msg || !msg.includes('+' + n)) {
      L.verificar(false, 'upgrade para +' + n + ': ' + msg);
      break;
    }
  }
  fecharJanela();
  await L.espera(500);
  const espada = naMao();
  L.verificar(espada && json(espada).includes(' +6'), 'a espada agora se chama "... +6"');
  L.verificar(json(espada).includes('+36%') && json(espada).includes('Dano'), 'lore mostra Dano +36% (5+5+5+7+7+7)');
  L.verificar(contaPedra('Comum') === 4 && contaPedra('Rara') === 0, 'pedras gastas: 1+2+3 comuns e 1+2+3 raras');
  L.verificar(quase(antes - saldo(), 1700, 0.01), 'dinheiro gasto: $1700 (' + (antes - saldo()) + ')');

  // ---------- Pergaminho e falha ----------
  L.rcon('npcv dar ' + NOME + ' epica 2', 'npcv dar ' + NOME + ' pergaminho 1');
  await L.espera(800);
  w = await abrirForja();
  L.verificar(w && json(w.slots[20]).includes('LIGADO'), 'pergaminho aparece ligado na forja (o +7 pode perder nível)');
  L.verificar(w && json(w.slots[16]).includes('volta 1'), 'chance mostra "o item volta 1 nível" se falhar');
  p = L.esperarMsg(bot, 'Pergaminho de Proteção se desfez');
  w = await aprimorar();
  L.verificar(await p, 'falhou (chance 0) e o pergaminho salvou o item');
  await L.espera(400);
  L.verificar(contaPerg() === 0 && contaPedra('pica') === 1, 'gastou o pergaminho e 1 pedra épica');
  p = L.esperarMsg(bot, 'voltou para');
  w = await aprimorar();
  const caiu = await p;
  L.verificar(caiu && caiu.includes('+5'), 'sem pergaminho: falhou e voltou para +5: ' + caiu);
  fecharJanela();
  await L.espera(500);
  L.verificar(json(naMao()).includes(' +5'), 'a espada agora é +5');

  // ---------- Dano: +5 = +29% ----------
  const z = centro.z - 5;
  const summon = (tag, dx, vida) => L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:husk ${centro.x + dx} ${centro.y} ${z} `
    + `{NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["${tag}"],Health:${vida}f,attributes:[{id:"minecraft:max_health",base:${vida}},{id:"minecraft:armor",base:0}]}`);
  // Bate no husk que está onde ele foi criado (dx a partir do centro), com a barra de ataque cheia
  const bater = async (tag, dx = 0) => {
    const onde = bot.entity.position.clone().set(centro.x + dx, centro.y, z);
    const alvo = Object.values(bot.entities).filter((e) => e.name === 'husk')
      .sort((a, b) => a.position.distanceTo(onde) - b.position.distanceTo(onde))[0];
    if (!alvo) return;
    await bot.lookAt(alvo.position.offset(0, 1, 0), true);
    await L.espera(1300); // golpe com a barra de ataque cheia
    bot.attack(alvo);
    await L.espera(600);
  };
  L.rcon(`tp ${NOME} ${centro.x} ${centro.y} ${z + 2}`, 'minecraft:kill @e[type=minecraft:husk]');
  await L.espera(1200);
  summon('alvoA', 0, 200);
  await L.espera(800);
  await bater('alvoA');
  const danoUp = 200 - vidaDe('alvoA');
  L.rcon('minecraft:kill @e[type=minecraft:husk,tag=alvoA]');
  await L.comandoEspera(bot, '/npcv aprimorar 0', 'definido para');
  summon('alvoB', 0, 200);
  await L.espera(800);
  await bater('alvoB');
  const danoBase = 200 - vidaDe('alvoB');
  L.rcon('minecraft:kill @e[type=minecraft:husk,tag=alvoB]');
  L.verificar(danoBase > 0 && quase(danoUp / danoBase, 1.29, 0.04), `espada +5 dá 29% mais dano (${danoUp.toFixed(2)} contra ${danoBase.toFixed(2)})`);

  // ---------- Raridade: espada de pedra (Comum) vai só até +5 ----------
  L.rcon('minecraft:clear ' + NOME + ' minecraft:iron_sword', 'minecraft:give ' + NOME + ' minecraft:stone_sword');
  await L.espera(800);
  L.verificar(await L.comandoEspera(bot, '/npcv aprimorar 5', 'definido para'), '/npcv aprimorar 5 na espada de pedra');
  w = await abrirForja();
  L.verificar(w && json(w.slots[13]).includes('Nível máximo'), 'espada de pedra +5: a forja mostra "Nível máximo" (Comum vai até +5)');
  fecharJanela();
  L.rcon('minecraft:clear ' + NOME + ' minecraft:stone_sword');

  // ---------- Defesa: 4 peças de ferro +5 ----------
  const pecas = [['iron_helmet', 'head'], ['iron_chestplate', 'torso'], ['iron_leggings', 'legs'], ['iron_boots', 'feet']];
  for (const [nomePeca, lugar] of pecas) {
    L.rcon('minecraft:give ' + NOME + ' minecraft:' + nomePeca);
    await L.espera(500);
    const it = bot.inventory.items().find((i) => i.name === nomePeca);
    await bot.equip(it, 'hand');
    await L.comandoEspera(bot, '/npcv aprimorar 5', 'definido para');
    await bot.equip(bot.inventory.items().find((i) => i.name === nomePeca) || naMao(), lugar);
    await L.espera(300);
  }
  // Fome forte por 2s: a comida cai abaixo de 18 e a vida para de regenerar sozinha durante a medida.
  // (O "/damage ... by <entidade>" é recusado pelo comando; sem atacante o mob_attack passa pela armadura.)
  L.rcon('minecraft:effect clear ' + NOME, 'heal ' + NOME, 'minecraft:effect give ' + NOME + ' minecraft:hunger 2 250 true');
  await L.espera(3000);
  const vidaAntes = bot.health;
  // pega a vida do primeiro aviso de dano (antes de qualquer regeneração)
  // Maior queda de vida de uma vez só (o golpe). Outras mudanças pequenas (o AuraSkills mexe na vida máxima
  // quando a habilidade Defesa sobe de nível, a regeneração devolve vida) não contam.
  const maiorQueda = new Promise((res) => {
    let anterior = vidaAntes;
    let maior = 0;
    const ouvir = () => {
      maior = Math.max(maior, anterior - bot.health);
      anterior = bot.health;
    };
    bot.on('health', ouvir);
    setTimeout(() => { bot.removeListener('health', ouvir); res(maior); }, 1500);
  });
  console.log('  ' + L.limpar(L.rcon(`minecraft:damage ${NOME} 10 minecraft:mob_attack`)).split('\n').slice(1).join(' ').trim());
  const danoRecebido = await maiorQueda;
  L.rcon('minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true', 'heal ' + NOME, 'feed ' + NOME);
  // sem upgrade: 10 x (1 - 10/25) = 6,0 | com +5 nas 4 peças: 10/1,29 = 7,75 -> 7,75 x (1 - 11,1/25) = 4,3
  L.verificar(quase(danoRecebido, 4.3, 0.35), `armadura +5 completa: recebeu ${danoRecebido.toFixed(2)} de 10 (sem upgrade seria 6,0)`);

  // ---------- Habilidade do +9 (espada de netherite = Lendária) ----------
  L.rcon('minecraft:give ' + NOME + ' minecraft:netherite_sword', 'npcv dar ' + NOME + ' lendaria 1');
  await L.espera(800);
  await bot.equip(bot.inventory.items().find((i) => i.name === 'netherite_sword'), 'hand');
  await L.comandoEspera(bot, '/npcv aprimorar 8', 'definido para');
  w = await abrirForja();
  p = L.esperarMsg(bot, 'despertou uma habilidade');
  w = await aprimorar();
  const hab = await p;
  L.verificar(hab, 'no +9 a arma desperta uma habilidade: ' + hab);
  fecharJanela();
  await L.espera(500);
  const lore9 = json(naMao());
  L.verificar(/Roubo de vida|Dano em área|Lentidão no alvo/.test(lore9), 'a habilidade aparece na lore');
  L.rcon(`tp ${NOME} ${centro.x} ${centro.y} ${z + 2}`);
  await L.espera(1000);
  summon('alvoC', 0, 300);
  summon('vizinho', 1.5, 300);
  await L.espera(800);
  if (/Roubo de vida/.test(lore9)) {
    L.rcon('minecraft:effect clear ' + NOME, 'minecraft:damage ' + NOME + ' 8 minecraft:generic');
    await L.espera(800);
    const h0 = bot.health;
    await bater('alvoC');
    L.verificar(bot.health > h0, `roubo de vida: a vida subiu ao bater (${h0.toFixed(1)} -> ${bot.health.toFixed(1)})`);
    L.rcon('minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true', 'heal ' + NOME);
  } else if (/Lentidão no alvo/.test(lore9)) {
    await bater('alvoC');
    const ef = L.limpar(L.rcon('data get entity @e[type=minecraft:husk,tag=alvoC,limit=1] active_effects'));
    L.verificar(/slowness/.test(ef), 'lentidão: o alvo ficou lento');
  } else {
    await bater('alvoC');
    const v = vidaDe('vizinho');
    L.verificar(v < 300, `dano em área: o monstro do lado também perdeu vida (300 -> ${v})`);
  }
  L.rcon('minecraft:kill @e[type=minecraft:husk,tag=alvoC]', 'minecraft:kill @e[type=minecraft:husk,tag=vizinho]');

  // ---------- Pedras caem dos monstros (chance de teste: 100%) ----------
  L.rcon('minecraft:kill @e[type=minecraft:item]'); // itens largados no chão por rodadas anteriores do teste
  await L.espera(500);
  const comunsAntes = contaPedra('Comum');
  summon('drop', 0, 1);
  await L.espera(800);
  await bater('drop');
  L.rcon(`tp ${NOME} ${centro.x} ${centro.y} ${z}`); // vai até onde a pedra caiu para pegar
  await L.espera(1500);
  L.verificar(contaPedra('Comum') === comunsAntes + 1, `matar um monstro deixa cair uma pedra comum (${comunsAntes} -> ${contaPedra('Comum')})`);

  // ---------- Pedras não viram receita ----------
  L.rcon('minecraft:give ' + NOME + ' minecraft:iron_ingot 1');
  await L.espera(600);
  const receita = bot.recipesFor(bot.registry.itemsByName.flint_and_steel.id, null, 1, null)[0];
  if (receita) {
    try { await bot.craft(receita, 1, null); } catch (e) { /* o servidor recusou */ }
  }
  await L.espera(800);
  // Conta todos os slots (a pedra pode ter ficado parada na grade de criação 2x2, sem resultado)
  const todos = bot.inventory.slots.filter((s) => s);
  const pedrasTodas = todos.filter((s) => json(s).includes('Pedra de Aprimoramento Comum')).reduce((s, i) => s + i.count, 0);
  L.verificar(!todos.some((s) => s.name === 'flint_and_steel') && pedrasTodas === comunsAntes + 1,
    `a pedra (sílex por baixo) não serve para fazer isqueiro (pedras: ${pedrasTodas})`);
  bot.closeWindow(bot.inventory); // devolve o que ficou na grade de criação

  // ---------- Loja do Borin vende a pedra comum ----------
  await falarComBorin();
  const janelaLoja = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  await L.clicarOpcao(bot, 'mercadorias');
  w = await janelaLoja;
  const slotPedra = w ? w.slots.findIndex((s, i) => i < 45 && s && json(s).includes('Pedra de Aprimoramento Comum')) : -1;
  L.verificar(slotPedra >= 0, 'a loja do Borin vende Pedra de Aprimoramento Comum');
  L.verificar(w && json(w.slots[52]).includes('Aprimorar'), 'a loja do ferreiro tem o botão da forja');
  if (slotPedra >= 0) {
    const s0 = saldo();
    const c0 = contaPedra('Comum');
    p = L.esperarMsg(bot, 'Você comprou');
    await bot.clickWindow(slotPedra, 0, 0);
    await p;
    await L.espera(700);
    fecharJanela();
    await L.espera(400);
    L.verificar(contaPedra('Comum') === c0 + 1 && quase(s0 - saldo(), 40, 0.01), `comprou 1 pedra por $40 (${c0} -> ${contaPedra('Comum')})`);
  }

  // ---------- Log ----------
  const logs = fs.readdirSync(path.join(PASTA, 'logs')).map((f) => fs.readFileSync(path.join(PASTA, 'logs', f), 'utf8')).join('\n');
  L.verificar(new RegExp('UPGRADE .*' + NOME).test(logs) && new RegExp('FALHOU .*' + NOME).test(logs), 'upgrades e falhas ficam no log de transações');

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
