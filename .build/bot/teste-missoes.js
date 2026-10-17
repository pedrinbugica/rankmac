// Teste da fase 3 do NpcVivos: conversa em árvore com opções clicáveis, missões COLETAR / ENTREGAR / MATAR,
// cadeia de missões, recompensas, /missoes e abandonar.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotMissao9';

function saldo() {
  const m = L.rcon('balance ' + NOME).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}
function localNpc(id) {
  const t = fs.readFileSync(path.join(PASTA, 'npcs', id + '.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  return { x: num('x'), y: num('y'), z: num('z') };
}

(async () => {
  // Espera o mundo Sobrevivência e os NPCs de exemplo existirem
  for (let i = 0; i < 60 && !fs.existsSync(path.join(PASTA, 'npcs', 'fazendeira_marta.yml')); i++) await L.espera(2000);
  L.verificar(fs.existsSync(path.join(PASTA, 'npcs', 'ferreiro_borin.yml')), 'servidor novo: Borin e Marta criados quando o mundo Sobrevivência apareceu');

  const bot = await L.criarBot(NOME);
  // Guarda as opções clicáveis que chegam no chat: texto -> comando do clique
  const opcoes = [];
  bot.on('message', (msg) => {
    const bruto = JSON.stringify(msg.json || msg);
    const m = bruto.match(/\/npcconversa [0-9a-f]+/);
    if (m) opcoes.push({ texto: L.limpar(msg.toString()), cmd: m[0] });
  });
  const opcao = async (trecho, ms = 5000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      for (let i = opcoes.length - 1; i >= 0; i--) if (opcoes[i].texto.includes(trecho)) return opcoes[i];
      await L.espera(100);
    }
    return null;
  };
  const clicar = async (trecho) => {
    const o = await opcao(trecho);
    if (!o) return false;
    opcoes.length = 0;
    bot.chat(o.cmd);
    await L.espera(900);
    return true;
  };
  const falarCom = async (id) => {
    const l = localNpc(id);
    L.rcon(`tp ${NOME} ${l.x - 1.5} ${l.y} ${l.z}`);
    await L.espera(1800);
    const npc = bot.nearestEntity((e) => e.name === 'mannequin');
    opcoes.length = 0;
    await bot.lookAt(npc.position.offset(0, 1.6, 0));
    await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
    await L.espera(1200);
  };

  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'eco set ' + NOME + ' 0', 'clear ' + NOME,
    'minecraft:execute in minecraft:sobrevivencia run time set day', 'minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true',
    'minecraft:execute in minecraft:sobrevivencia run kill @e[type=minecraft:zombie]');
  await L.espera(2500);

  // ---------- Borin: conversa + missão COLETAR ----------
  await falarCom('ferreiro_borin');
  L.verificar(await opcao('Missão: O minério perdido'), 'Borin oferece a missão "O minério perdido" no chat');
  L.verificar(await opcao('Quero ver suas mercadorias'), 'opções da árvore aparecem (mercadorias)');
  L.verificar(await clicar('Missão: O minério perdido'), 'clicar na missão');
  L.verificar(await opcao('Aceitar a missão'), 'mostra a missão com o botão Aceitar');
  let p = L.esperarMsg(bot, 'Missão aceita');
  await clicar('Aceitar a missão');
  L.verificar(await p, 'missão aceita');
  L.verificar(await L.comandoEspera(bot, '/missoes', '0/32'), '/missoes mostra o progresso 0/32');

  // Entregar
  L.rcon('give ' + NOME + ' iron_ingot 32');
  await L.espera(800);
  await falarCom('ferreiro_borin');
  L.verificar(await opcao('Entregar: O minério perdido'), 'com as 32 barras aparece "Entregar"');
  p = L.esperarMsg(bot, 'Missão concluída');
  await clicar('Entregar: O minério perdido');
  L.verificar(await p, 'missão concluída');
  await L.espera(800);
  const pic = bot.inventory.items().find((i) => i.name === 'iron_pickaxe');
  L.verificar(saldo() === 300 && pic && !bot.inventory.items().some((i) => i.name === 'iron_ingot'),
    'recompensa: $300 + Picareta do Borin, e as barras foram entregues (' + saldo() + ')');

  // Cadeia: a diária só aparece agora
  await falarCom('ferreiro_borin');
  L.verificar(await opcao('Missão: Encomenda de ferro'), 'cadeia: a missão diária "Encomenda de ferro" foi liberada');
  L.verificar(!(await opcao('Missão: O minério perdido', 1500)), 'a missão que não se repete não aparece de novo');

  // Árvore de diálogo com memória/condição
  L.verificar(await clicar('Conte um pouco sobre você'), 'navegar: "Conte um pouco sobre você"');
  L.verificar(await L.esperarMsg(bot, 'trinta anos', 3000) || bot.msgs.some((m) => m.includes('trinta anos')), 'Borin conta a história');
  L.verificar(await clicar('Por que você veio'), 'navegar: segundo nó');
  L.verificar(await opcao('Sua picareta ficou ótima'), 'opção com condição (missão concluída) aparece');
  p = L.esperarMsg(bot, 'Cuide bem dela');
  await clicar('Sua picareta ficou ótima');
  L.verificar(await p, 'resposta da opção com condição');

  // ---------- Marta: missão ENTREGAR (carta para o Borin) ----------
  await falarCom('fazendeira_marta');
  L.verificar(await opcao('Missão: Uma carta para o ferreiro'), 'Marta oferece a carta');
  L.verificar(await opcao('Missão: Praga de zumbis'), 'Marta oferece a praga de zumbis');
  await clicar('Missão: Uma carta para o ferreiro');
  p = L.esperarMsg(bot, 'Missão aceita');
  await clicar('Aceitar a missão');
  L.verificar(await p, 'carta aceita');
  await L.espera(600);
  L.verificar(bot.inventory.items().some((i) => i.name === 'paper'), 'recebeu a Carta da Marta');
  await falarCom('ferreiro_borin');
  p = L.esperarMsg(bot, 'Missão concluída');
  L.verificar(await clicar('Entregar: Uma carta para o ferreiro'), 'Borin aceita a carta');
  L.verificar(await p, 'entrega concluída no outro NPC');
  await L.espera(600);
  L.verificar(!bot.inventory.items().some((i) => i.name === 'paper') && bot.inventory.items().some((i) => i.name === 'golden_carrot'),
    'a carta sumiu e veio a recompensa (cenouras douradas)');

  // ---------- Abandonar ----------
  await falarCom('ferreiro_borin');
  await clicar('Missão: A resposta do ferreiro');
  p = L.esperarMsg(bot, 'Missão aceita');
  await clicar('Aceitar a missão');
  L.verificar(await p, 'cadeia: resposta do Borin aceita');
  L.verificar(await L.comandoEspera(bot, '/missoes abandonar 1', 'abandonou'), '/missoes abandonar');
  await L.espera(500);
  L.verificar(!bot.inventory.items().some((i) => i.name === 'paper'), 'abandonar tira o item da missão');

  // ---------- Marta: MATAR zumbis ----------
  await falarCom('fazendeira_marta');
  await clicar('Missão: Praga de zumbis');
  p = L.esperarMsg(bot, 'Missão aceita');
  await clicar('Aceitar a missão');
  L.verificar(await p, 'praga de zumbis aceita');
  const l = localNpc('fazendeira_marta');
  const zx = Math.round(l.x) + 40;
  const zz = Math.round(l.z);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run fill ${zx - 3} 199 ${zz - 3} ${zx + 3} 199 ${zz + 3} minecraft:stone`);
  await L.espera(500);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${zx} 200 ${zz}`,
    'minecraft:give ' + NOME + ' minecraft:netherite_sword[minecraft:enchantments={"minecraft:sharpness":50}]');
  await L.espera(1500);
  const espada = bot.inventory.items().find((i) => i.name === 'netherite_sword');
  if (espada) await bot.equip(espada, 'hand');
  L.rcon('minecraft:execute in minecraft:sobrevivencia run time set midnight');
  let mortos = 0;
  for (let i = 0; i < 10; i++) {
    L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:zombie ${zx + 1.5} 200 ${zz + 0.5} {NoAI:1b,Silent:1b,NoGravity:1b}`);
    await L.espera(700);
    const z = bot.nearestEntity((e) => e.name === 'zombie' && e.position.distanceTo(bot.entity.position) < 4);
    if (!z) { const zs = Object.values(bot.entities).filter((e) => e.name === 'zombie').map((e) => e.position.distanceTo(bot.entity.position).toFixed(1)); console.log('  sem zumbi perto; bot em ' + bot.entity.position + ' zumbis a ' + zs.join(',')); continue; }
    for (let k = 0; k < 4 && bot.entities[z.id]; k++) {
      await bot.lookAt(z.position.offset(0, 1, 0));
      bot.attack(z);
      await L.espera(650);
    }
    if (!bot.entities[z.id]) mortos++;
  }
  console.log('  zumbis mortos: ' + mortos);
  L.verificar(await L.comandoEspera(bot, '/missoes', 'pronta'), '/missoes: praga de zumbis pronta depois de 10 zumbis');
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run fill ${zx - 3} 199 ${zz - 3} ${zx + 3} 199 ${zz + 3} minecraft:air`);
  const antes = saldo();
  await falarCom('fazendeira_marta');
  p = L.esperarMsg(bot, 'Missão concluída');
  await clicar('Entregar: Praga de zumbis');
  L.verificar(await p, 'missão de matar entregue');
  await L.espera(600);
  L.verificar(saldo() === antes + 150, 'recompensa $150 (' + antes + ' -> ' + saldo() + ')');

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
