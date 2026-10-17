// Teste da fase 4 do NpcVivos: facções, reputação (preços, missões, recusa), entrar/sair, guardas,
// anúncio de guerra, reputação por monstro, PlaceholderAPI e etiqueta no chat do RankupSupremo.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotFaccao1';

function saldo() {
  const m = L.rcon('balance ' + NOME).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}
function rep() {
  const m = L.limpar(L.rcon('npcv reputacao ' + NOME + ' vila_aurora')).match(/: (-?\d+) pontos/);
  return m ? Number(m[1]) : NaN;
}
function localNpc(id) {
  const t = fs.readFileSync(path.join(PASTA, 'npcs', id + '.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  return { x: num('x'), y: num('y'), z: num('z') };
}
const quase = (a, b) => Math.abs(a - b) < 0.011;

(async () => {
  for (let i = 0; i < 60 && !fs.existsSync(path.join(PASTA, 'npcs', 'guarda_tomas.yml')); i++) await L.espera(2000);
  L.verificar(fs.existsSync(path.join(PASTA, 'npcs', 'guarda_tomas.yml')), 'o guarda Tomás foi criado na Sobrevivência');
  L.verificar(fs.existsSync(path.join(PASTA, 'faccoes', 'vila_aurora.yml')) && fs.existsSync(path.join(PASTA, 'faccoes', 'irmandade_do_sul.yml')),
    'arquivos das facções copiados');
  L.verificar(/faccao: vila_aurora/.test(fs.readFileSync(path.join(PASTA, 'npcs', 'ferreiro_borin.yml'), 'utf8')), 'Borin pertence à Vila Aurora');

  const bot = await L.criarBot(NOME);
  L.rcon('npcv mercado desligar'); // preços exatos de reputação e desconto (sem o preço dinâmico da fase 7)
  const opcao = async (trecho, ms = 5000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      for (let i = bot.opcoes.length - 1; i >= 0; i--) if (bot.opcoes[i].texto.includes(trecho)) return bot.opcoes[i];
      await L.espera(100);
    }
    return null;
  };
  const clicar = async (trecho) => {
    const o = await opcao(trecho);
    if (!o) return false;
    bot.opcoes.length = 0;
    bot.chat(o.cmd);
    await L.espera(900);
    return true;
  };
  const npcPerto = () => bot.nearestEntity((e) => e.name === 'mannequin');
  const falarCom = async (id) => {
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    const l = localNpc(id);
    L.rcon(`tp ${NOME} ${l.x - 1.5} ${l.y} ${l.z}`);
    await L.espera(1800);
    const npc = npcPerto();
    bot.opcoes.length = 0;
    await bot.lookAt(npc.position.offset(0, 1.6, 0));
    await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
    await L.espera(1200);
  };
  const comprarEspada = async () => {
    await falarCom('ferreiro_borin');
    const janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
    await clicar('Quero ver suas mercadorias');
    const w = await janela;
    if (!w) return NaN;
    const antes = saldo();
    const p = L.esperarMsg(bot, 'Você comprou');
    await bot.clickWindow(10, 0, 0);
    await p;
    await L.espera(700);
    bot.closeWindow(w);
    return Math.round((antes - saldo()) * 100) / 100;
  };

  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'eco set ' + NOME + ' 1000', 'clear ' + NOME, 'gamemode survival ' + NOME,
    'minecraft:execute in minecraft:sobrevivencia run time set day', 'minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true',
    'npcv reputacao ' + NOME + ' vila_aurora 0', 'npcv membro ' + NOME + ' nenhuma', 'npcv relacao vila_aurora irmandade_do_sul rival');
  await L.espera(2500);

  // ---------- /faccao e /reputacao ----------
  L.verificar(await L.comandoEspera(bot, '/faccao', 'Irmandade do Sul'), '/faccao lista as facções');
  L.verificar(bot.msgs.some((m) => m.includes('Relações') && m.includes('Rival')), '/faccao mostra a relação Rival');
  L.verificar(await L.comandoEspera(bot, '/reputacao', 'Neutro'), '/reputacao mostra Neutro');

  // ---------- Neutro: preço normal, sem missão especial ----------
  await falarCom('ferreiro_borin');
  L.verificar(await opcao('O que é a Vila Aurora?'), 'Borin tem a opção "O que é a Vila Aurora?"');
  L.verificar(!(await opcao('Missão: Encomenda especial', 1500)), 'Neutro: a missão especial (reputação 101+) não aparece');
  let preco = await comprarEspada();
  L.verificar(preco === 70, 'Neutro: espada por $70 (' + preco + ')');

  // ---------- Amigo (150): desconto e missão especial ----------
  let p = L.esperarMsg(bot, 'agora é Amigo');
  const out = L.limpar(L.rcon('npcv reputacao ' + NOME + ' vila_aurora 150'));
  L.verificar(out.includes('150') && out.includes('Amigo'), 'admin: /npcv reputacao define 150 (Amigo): ' + out.trim());
  L.verificar(await p, 'jogador avisado da mudança de nível');
  await falarCom('ferreiro_borin');
  L.verificar(await opcao('Missão: Encomenda especial'), 'Amigo: a missão especial aparece');
  preco = await comprarEspada();
  L.verificar(preco === 63, 'Amigo: espada com 10% de desconto, $63 (' + preco + ')');

  // ---------- Jurar lealdade pela conversa ----------
  await falarCom('ferreiro_borin');
  L.verificar(await clicar('O que é a Vila Aurora?'), 'abrir o tópico da vila');
  p = L.esperarMsg(bot, 'Você jurou lealdade');
  L.verificar(await clicar('Quero jurar lealdade'), 'opção "Quero jurar lealdade" (só para quem não é membro)');
  L.verificar(await p, 'entrou na Vila Aurora pela conversa');
  L.verificar(await L.comandoEspera(bot, '/faccao', 'você: Vila Aurora'), '/faccao mostra a facção do jogador');
  const tag = L.limpar(L.rcon('papi parse ' + NOME + ' %npcvivos_tag%|%npcvivos_nivel_vila_aurora%|%npcvivos_reputacao_vila_aurora%'));
  L.verificar(tag.includes('[Aurora]') && tag.includes('Amigo') && tag.includes('150'), 'PlaceholderAPI: ' + tag.trim());
  p = L.esperarMsg(bot, 'ola da vila');
  bot.chat('ola da vila');
  const linha = await p;
  // o mineflayer só entrega o texto assinado da mensagem; a linha formatada aparece no console do servidor
  await L.espera(500);
  const console_ = fs.readFileSync(path.join(__dirname, '..', 'teste-console.log'), 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
  L.verificar(linha && console_.split('\n').some((l) => l.includes('[Aurora]') && l.includes(NOME) && l.includes('ola da vila')),
    'chat do RankupSupremo mostra a etiqueta [Aurora]');
  preco = await comprarEspada();
  L.verificar(quase(preco, 56.7), 'Amigo + membro: $56,70 (10% + 10%) (' + preco + ')');

  // Vender ferro: +5% e +1 de reputação
  L.rcon('give ' + NOME + ' iron_ingot 16');
  await L.espera(600);
  await falarCom('ferreiro_borin');
  let janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  await clicar('Quero ver suas mercadorias');
  let w = await janela;
  w = w ? await L.clicarEsperarJanela(bot, 46) : null;
  const antesVenda = saldo();
  p = L.esperarMsg(bot, 'Você vendeu');
  if (w) await bot.clickWindow(10, 0, 0);
  L.verificar(await p, 'vendeu 16 barras de ferro');
  await L.espera(700);
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
  L.verificar(quase(saldo() - antesVenda, 50.4), 'Amigo: venda paga 5% a mais, $50,40 (' + (saldo() - antesVenda).toFixed(2) + ')');
  L.verificar(rep() === 151, 'vender para a facção dá +1 de reputação (' + rep() + ')');

  // ---------- Sair / trocar ----------
  L.verificar(await L.comandoEspera(bot, '/faccao entrar irmandade_do_sul', 'faccao sair'), 'não entra em outra sem sair antes');
  p = L.esperarMsg(bot, 'agora é Neutro');
  L.verificar(await L.comandoEspera(bot, '/faccao sair', 'Você deixou'), '/faccao sair');
  L.verificar(await p, 'sair custa 100 de reputação (Amigo -> Neutro)');
  L.verificar(rep() === 51, 'reputação 151 - 100 = 51 (' + rep() + ')');
  L.verificar(await L.comandoEspera(bot, '/faccao entrar vila_aurora', 'Espere mais'), 'espera de 24h para entrar de novo');

  // ---------- Bater no Borin: reputação e guarda ----------
  await falarCom('ferreiro_borin');
  const borin = npcPerto();
  await bot.lookAt(borin.position.offset(0, 1.5, 0));
  bot.attack(borin);
  await L.espera(1500);
  L.verificar(bot.msgs.slice(-8).some((m) => /Socorro|pagar por isso|Por que fez isso/.test(m)), 'Borin reage ao ataque');
  L.verificar(rep() === 36, 'bater num NPC tira 15 de reputação (' + rep() + ')');
  const tomas = localNpc('guarda_tomas');
  // longe do guarda, sem resistência e com vida cheia; depois chega perto (o empurrão do golpe afasta, então volta)
  L.rcon(`tp ${NOME} ${tomas.x + 20} ${tomas.y + 30} ${tomas.z}`, 'minecraft:effect clear ' + NOME,
    'minecraft:effect give ' + NOME + ' minecraft:slow_falling 10 1 true', 'heal ' + NOME);
  await L.espera(1200);
  const vida = bot.health;
  const avisou = L.esperarMsg(bot, 'Tomás', 6000);
  let vidaDepois = vida;
  for (let i = 0; i < 4; i++) {
    L.rcon(`tp ${NOME} ${tomas.x + 1.2} ${tomas.y} ${tomas.z}`);
    await L.espera(1300);
    vidaDepois = Math.min(vidaDepois, bot.health);
  }
  L.rcon('minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true', 'heal ' + NOME);
  L.verificar(await avisou || bot.msgs.some((m) => /Pare aí|Peguem|Mais um passo|Eu avisei/.test(m)), 'o guarda Tomás avisa o procurado');
  L.verificar(vidaDepois < vida, `o guarda ataca quem bateu no NPC (vida ${vida} -> ${vidaDepois})`);

  // ---------- Inimigo: NPC se recusa ----------
  L.rcon('npcv reputacao ' + NOME + ' vila_aurora -600');
  await L.espera(500);
  await falarCom('ferreiro_borin');
  L.verificar(bot.msgs.slice(-6).some((m) => /Não falo com gente|Saia daqui|Depois de tudo/.test(m)), 'Inimigo: o Borin se recusa a conversar');
  L.verificar(!(await opcao('mercadorias', 1200)), 'Inimigo: sem opções de loja');

  // ---------- Guerra (anúncio para todos) ----------
  p = L.esperarMsg(bot, 'GUERRA');
  const outRel = L.limpar(L.rcon('npcv relacao vila_aurora irmandade_do_sul guerra'));
  L.verificar(await p, 'anúncio de guerra chega aos jogadores');
  L.verificar(outRel.includes('Em guerra'), 'admin recebe a confirmação: ' + outRel.trim());
  p = L.esperarMsg(bot, 'rivais');
  L.rcon('npcv relacao vila_aurora irmandade_do_sul rival');
  L.verificar(await p, 'voltar para rivais também é anunciado');

  // ---------- Monstros perto da vila dão reputação ----------
  L.rcon('npcv reputacao ' + NOME + ' vila_aurora 0',
    'minecraft:give ' + NOME + ' minecraft:netherite_sword[minecraft:enchantments={"minecraft:sharpness":50}]');
  const lb = localNpc('fazendeira_marta');
  L.rcon(`tp ${NOME} ${lb.x - 6} ${lb.y} ${lb.z}`);
  await L.espera(1500);
  const espada = bot.inventory.items().find((i) => i.name === 'netherite_sword');
  if (espada) await bot.equip(espada, 'hand');
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:zombie ${lb.x - 7.5} ${lb.y} ${lb.z} {NoAI:1b,Silent:1b}`);
  await L.espera(900);
  const z = bot.nearestEntity((e) => e.name === 'zombie');
  for (let k = 0; z && k < 4 && bot.entities[z.id]; k++) {
    await bot.lookAt(z.position.offset(0, 1, 0));
    bot.attack(z);
    await L.espera(600);
  }
  await L.espera(500);
  L.verificar(rep() === 1, 'matar um zumbi perto da vila dá +1 de reputação (' + rep() + ')');

  // ---------- /npcv info ----------
  const info = L.limpar(L.rcon('npcv info ferreiro_borin'));
  L.verificar(info.includes('Facção: Vila Aurora') && info.includes('Conversa: borin'), '/npcv info mostra facção e conversa');

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
