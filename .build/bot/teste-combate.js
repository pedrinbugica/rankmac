// Teste da fase 6 do NpcVivos: máquina de estados, vida própria do NPC, mercenários, duelos e chefes.
// Usa uma cópia de TESTE e deixa o combate.yml dela previsível (tempos curtos, chances 100%).
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotLuta6';
const NOME2 = 'BotLuta6b';
const KAELA = 'duelista_kaela';
const DARGO = 'mercenario_dargo';
const CHEFE = 'chefe_teste';

function saldo(quem = NOME) {
  const m = L.rcon('balance ' + quem).match(/\$([\d.,]+)/);
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

// Lê o /npcv combate <id> (4 linhas) num objeto
function info(id) {
  const t = L.limpar(L.rcon('npcv combate ' + id));
  const vida = t.match(/Vida: ([\d.]+)\/([\d.]+)/);
  return {
    texto: t,
    existe: /Estado:/.test(t),
    estado: (t.match(/Estado: (.+)/) || [0, ''])[1].trim(),
    vida: vida ? Number(vida[1]) : NaN,
    vidaMaxima: vida ? Number(vida[2]) : NaN,
    dano: Number((t.match(/dano ([\d.]+)/) || [0, NaN])[1]),
    alvo: (t.match(/Alvo: (\S+)/) || [0, '-'])[1],
    dono: (t.match(/dono: (\S+)/) || [0, '-'])[1],
  };
}
// Espera uma condição no /npcv combate (o estado muda 1x por segundo)
async function esperarEstado(id, estados, ms = 8000) {
  const lista = [].concat(estados);
  const fim = Date.now() + ms;
  let ultimo = '';
  while (Date.now() < fim) {
    ultimo = info(id).estado;
    if (lista.includes(ultimo)) return ultimo;
    await L.espera(400);
  }
  return ultimo;
}

// Troca um valor do combate.yml pelo caminho (ex.: "duelos.tempo-maximo-segundos")
function definir(texto, caminho, valor) {
  const partes = caminho.split('.');
  const linhas = texto.split('\n');
  let nivel = 0;
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/^(\s*)([A-Za-z0-9_-]+):(.*)$/);
    if (!m || m[1].length !== nivel * 2 || m[2] !== partes[nivel]) continue;
    if (nivel === partes.length - 1) {
      linhas[i] = m[1] + m[2] + ': ' + valor;
      return linhas.join('\n');
    }
    nivel++;
  }
  throw new Error('caminho não encontrado no combate.yml: ' + caminho);
}

// Tempos curtos e chances certas, para o teste não durar 10 minutos
function configurarTeste() {
  const f = path.join(PASTA, 'combate.yml');
  let s = fs.readFileSync(f, 'utf8');
  const trocas = {
    'limite-de-recompensa-por-hora': 5,
    'atributos.duelista.respawn-segundos': 5,
    'atributos.mercenario.respawn-segundos': 5,
    'atributos.boss.respawn-segundos': 10,
    // Chefe bem devagar: dá tempo de medir as habilidades de longe antes de ele colar no jogador
    'atributos.boss.velocidade': 0.05,
    'duelos.tempo-maximo-segundos': 30,
    // Descanso longo o bastante para o teste conseguir ver a duelista recusando logo depois de um duelo
    'duelos.espera-entre-duelos-segundos': 20,
    'mercenarios.espera-para-recontratar-minutos': 1,
    'bosses.intervalo-habilidade-segundos': 1,
    'bosses.habilidades.investida.chance': 100,
    'bosses.habilidades.investida.espera-segundos': 3,
    'bosses.habilidades.puxar.chance': 100,
    'bosses.habilidades.puxar.espera-segundos': 3,
    'bosses.habilidades.area-de-fogo.chance': 100,
    'bosses.habilidades.area-de-fogo.espera-segundos': 3,
    // O chefe corre para cima do jogador: com raio 7 as três habilidades de longe valem
    // na mesma distância (investida > 4, puxar > 5, área de fogo <= raio + 3).
    'bosses.habilidades.area-de-fogo.raio': 7,
    'bosses.habilidades.invocar.chance': 100,
    'bosses.habilidades.invocar.espera-segundos': 3,
  };
  for (const [k, v] of Object.entries(trocas)) s = definir(s, k, v);
  fs.writeFileSync(f, s, 'utf8');
}

// Troca um único valor do combate.yml já no meio do teste (precisa de /npcv reload depois)
function ajustar(caminho, valor) {
  const f = path.join(PASTA, 'combate.yml');
  fs.writeFileSync(f, definir(fs.readFileSync(f, 'utf8'), caminho, valor), 'utf8');
}

(async () => {
  for (let i = 0; i < 90 && !fs.existsSync(path.join(PASTA, 'npcs', KAELA + '.yml')); i++) await L.espera(2000);
  L.verificar(fs.existsSync(path.join(PASTA, 'combate.yml')), 'combate.yml criado');
  L.verificar(fs.existsSync(path.join(PASTA, 'npcs', KAELA + '.yml')), 'a duelista Kaela foi criada na Sobrevivência');
  L.verificar(fs.existsSync(path.join(PASTA, 'npcs', DARGO + '.yml')), 'o mercenário Dargo foi criado na Sobrevivência');
  L.verificar(/- DUELISTA/.test(fs.readFileSync(path.join(PASTA, 'npcs', KAELA + '.yml'), 'utf8')), 'Kaela tem o papel DUELISTA');
  L.verificar(/- MERCENARIO/.test(fs.readFileSync(path.join(PASTA, 'npcs', DARGO + '.yml'), 'utf8')), 'Dargo tem o papel MERCENARIO');

  // Os NPCs de luta ganham cérebro sozinhos, sem precisar de /npcv reload
  const antesDoReload = L.limpar(L.rcon('npcv combate'));
  L.verificar(/cérebro de combate: 2/.test(antesDoReload) && /sistema ligado: sim/.test(antesDoReload),
    'ao ligar o servidor os 2 NPCs de luta já têm cérebro: ' + antesDoReload.split('\n').pop().trim());

  configurarTeste();
  L.rcon('npcv reload');
  await L.espera(1200);
  L.verificar(info(KAELA).vidaMaxima === 100 && info(DARGO).vidaMaxima === 120,
    'atributos do combate.yml por papel: duelista 100 de vida, mercenário 120');
  L.verificar(info(KAELA).estado === 'Ocioso', 'NPC parado no posto fica Ocioso');

  const bot = await L.criarBot(NOME);
  // O npcs/<id>.yml guarda o lugar de quando o NPC foi criado (y 130), mas o corpo vivo está no chão
  // (y ~75): o x/z serve para chegar perto, e aí o y é corrigido pela posição do manequim de verdade.
  let kaela = localNpc(KAELA);
  let dargo = localNpc(DARGO);
  // Os NPCs da vila ficam a 5 blocos um do outro: achar "o manequim mais perto" pega a pessoa errada.
  // O nome que aparece em cima do NPC vem no metadata[2], então procuramos por ele.
  const NOMES = { [KAELA]: 'Kaela', [DARGO]: 'Dargo', [CHEFE]: 'Chefe de Teste' };
  const npcPorNomeDe = (b, trecho) => {
    let melhor = null;
    for (const e of Object.values(b.entities)) {
      if (e.name !== 'mannequin' || !e.metadata) continue;
      if (!L.limpar(JSON.stringify(e.metadata[2] || '')).includes(trecho)) continue;
      const d = (x) => x.position.distanceTo(b.entity.position);
      if (!melhor || d(e) < d(melhor)) melhor = e;
    }
    return melhor;
  };
  const npcPorNome = (trecho) => npcPorNomeDe(bot, trecho);
  const acharNpc = async (id, ms = 6000) => {
    const fim = Date.now() + ms;
    for (;;) {
      const e = npcPorNome(NOMES[id] || id);
      if (e || Date.now() > fim) return e;
      await L.espera(400);
    }
  };
  const fecharJanela = () => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); };
  const irAte = async (l, dx = -1.5, dz = 0, ms = 1800) => {
    L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${l.x + dx} ${l.y} ${l.z + dz}`);
    await L.espera(ms);
  };
  // Onde o corpo do NPC está de verdade agora (null se ele caiu e ainda não voltou)
  const localViva = async (id, ms = 6000) => {
    const e = await acharNpc(id, ms);
    return e ? { x: e.position.x, y: e.position.y, z: e.position.z } : null;
  };
  const falarCom = async (id, l) => {
    fecharJanela();
    bot.opcoes.length = 0;
    await irAte(l);
    const npc = await acharNpc(id);
    if (!npc) return false;
    await bot.lookAt(npc.position.offset(0, 1.6, 0));
    await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
    await L.espera(1200);
    return true;
  };
  const bater = async (id, vezes = 1) => {
    for (let i = 0; i < vezes; i++) {
      const npc = await acharNpc(id, 3000);
      if (!npc) return false;
      await bot.lookAt(npc.position.offset(0, 1.4, 0), true);
      await L.espera(700);
      bot.attack(npc);
      await L.espera(500);
    }
    return true;
  };

  // O /npcv inteiro pede npcvivos.admin.editar (é a permissão do comando no plugin.yml)
  L.rcon('lp user ' + NOME + ' permission set npcvivos.admin.editar true',
    'lp user ' + NOME + ' permission set npcvivos.admin.criar true',
    'lp user ' + NOME + ' permission set npcvivos.admin.remover true',
    'lp user ' + NOME + ' permission set npcvivos.admin.combate true');
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'clear ' + NOME, 'eco set ' + NOME + ' 200000',
    'gamemode survival ' + NOME, 'minecraft:execute in minecraft:sobrevivencia run time set day',
    'minecraft:execute in minecraft:sobrevivencia run gamerule pvp true',
    'minecraft:effect give ' + NOME + ' minecraft:resistance 3600 255 true',
    'npcv reputacao ' + NOME + ' vila_aurora 0', 'minecraft:give ' + NOME + ' minecraft:iron_sword');
  await L.espera(2500);
  bot.setQuickBarSlot(0);

  // ================================================================ VIDA PRÓPRIA DO NPC
  console.log('\n--- vida própria do NPC ---');
  await irAte(kaela);
  kaela = (await localViva(KAELA, 8000)) || kaela;
  const v0 = info(KAELA).vida;
  L.verificar(await bater(KAELA, 1), 'o bot acha a duelista pelo nome e bate nela');
  await L.espera(400);
  const v1 = info(KAELA).vida;
  L.verificar(v1 < v0, `golpe do jogador tira vida do NPC pelo plugin (${v0} -> ${v1})`);
  const corpoVivo = L.limpar(L.rcon('minecraft:execute in minecraft:sobrevivencia positioned '
    + `${kaela.x} ${kaela.y} ${kaela.z} run data get entity @e[type=minecraft:mannequin,limit=1,sort=nearest] Health`));
  L.verificar(/20(\.0)?f/.test(corpoVivo), 'o manequim não perde vida de verdade (Health segue 20): ' + corpoVivo.split('\n').pop().trim());
  L.verificar(await esperarEstado(KAELA, 'Combate') === 'Combate', 'levar golpe joga o NPC no estado Combate');

  // Fogo, queda e dano de comando não machucam o NPC de combate
  const v2 = info(KAELA).vida;
  L.rcon('minecraft:execute in minecraft:sobrevivencia positioned '
    + `${kaela.x} ${kaela.y} ${kaela.z} run damage @e[type=minecraft:mannequin,limit=1,sort=nearest] 500 minecraft:on_fire`);
  await L.espera(1000);
  const dep = info(KAELA);
  L.verificar(dep.existe && Math.abs(dep.vida - v2) < 0.01, `fogo/queda não machuca o NPC (vida ${v2} -> ${dep.vida})`);

  // Longe do jogador ele volta ao posto e enche a vida
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${kaela.x + 40} ${kaela.y + 10} ${kaela.z}`);
  const voltou = await esperarEstado(KAELA, ['Ocioso', 'Voltando ao posto'], 10000);
  L.verificar(voltou === 'Ocioso' || voltou === 'Voltando ao posto', 'sem alvo por perto o NPC volta ao posto: ' + voltou);
  await esperarEstado(KAELA, 'Ocioso', 12000);
  L.verificar(info(KAELA).vida === 100, 'de volta ao posto a vida enche sozinha (100/100)');

  // ================================================================ MERCENÁRIO
  console.log('\n--- mercenário ---');
  const opcaoContratar = async () => {
    await falarCom(DARGO, dargo);
    for (const o of bot.opcoes) if (o.texto.includes('Contratar como mercen')) return o;
    return null;
  };
  let o = await opcaoContratar();
  dargo = (await localViva(DARGO, 8000)) || dargo;
  L.verificar(o, 'a conversa do mercenário tem a opção "Contratar como mercenário": ' + (o ? o.texto.trim() : '(nenhuma)'));
  const precoAnunciado = o ? Number((o.texto.match(/\$([\d.,]+)/) || [0, '0'])[1].replace(/\./g, '').replace(',', '.')) : NaN;

  // Sem dinheiro ele recusa
  L.rcon('eco set ' + NOME + ' 10');
  await L.espera(600);
  let p = L.esperarMsg(bot, 'dinheiro');
  bot.chat(o.cmd);
  L.verificar(await p, 'sem dinheiro o mercenário recusa o contrato');
  L.verificar(info(DARGO).dono === '-', 'e ninguém fica como dono do mercenário');

  L.rcon('eco set ' + NOME + ' 200000');
  await L.espera(600);
  const antesContrato = saldo();
  o = await opcaoContratar();
  p = L.esperarMsg(bot, 'vai lutar com você');
  bot.chat(o.cmd);
  const msgContrato = await p;
  L.verificar(msgContrato, 'contratou o mercenário: ' + msgContrato);
  await L.espera(800);
  L.verificar(Math.abs((antesContrato - saldo()) - precoAnunciado) < 0.02,
    `cobrou o preço anunciado de $${precoAnunciado} (${(antesContrato - saldo()).toFixed(2)})`);
  L.verificar(info(DARGO).dono === NOME, 'o mercenário agora tem dono');
  L.verificar(await esperarEstado(DARGO, 'Seguindo o dono') === 'Seguindo o dono', 'o mercenário entra no estado "Seguindo o dono"');

  const status = L.limpar(await L.comandoEspera(bot, '/mercenario', 'Mercen') || '');
  L.verificar(/Dargo/.test(status) && /\d+ minuto/.test(status), '/mercenario mostra o contrato: ' + status);
  o = await opcaoContratar();
  L.verificar(!o, 'com um mercenário contratado a opção de contratar sai da conversa');
  p = L.esperarMsg(bot, 'já tem');
  bot.chat('/npcv combate ' + DARGO); // só para não deixar a conversa pendurada
  await L.espera(300);

  // Segue de longe: o dono anda 18 blocos e o mercenário chega perto
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${dargo.x + 18} ${dargo.y} ${dargo.z}`);
  let chegou = false;
  for (let i = 0; i < 24 && !chegou; i++) {
    await L.espera(500);
    const m = npcPorNome('Dargo');
    chegou = !!m && m.position.distanceTo(bot.entity.position) < 7;
  }
  L.verificar(chegou, 'o mercenário anda sozinho até o dono (18 blocos)');

  // Longe demais: ele teleporta
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${dargo.x + 70} ${dargo.y + 5} ${dargo.z + 30}`);
  let teleportou = false;
  for (let i = 0; i < 20 && !teleportou; i++) {
    await L.espera(500);
    const m = npcPorNome('Dargo');
    teleportou = !!m && m.position.distanceTo(bot.entity.position) < 12;
  }
  L.verificar(teleportou, 'se o dono some de vista o mercenário teleporta para ele');

  // Briga: quem bate no dono vira alvo do mercenário.
  // O golpe vai pelo /damage ... by <jogador> (o mesmo evento de um ataque de verdade, só sem depender
  // da mira do bot) e o bot fica com resistência para a briga não matar ninguém.
  const bot2 = await L.criarBot(NOME2);
  const guardarBot2 = () => L.rcon('mv tp ' + NOME2 + ' sobrevivencia',
    `minecraft:execute in minecraft:sobrevivencia run tp ${NOME2} ${Math.round(kaela.x) + 220} 200 ${Math.round(kaela.z)}`);
  L.rcon('mv tp ' + NOME2 + ' sobrevivencia', 'gamemode survival ' + NOME2, 'eco set ' + NOME2 + ' 50000',
    'minecraft:effect give ' + NOME2 + ' minecraft:resistance 3600 255 true');
  await L.espera(2500);
  // Chão firme longe da vila: os dois bots e o mercenário juntos, sem guarda nenhum no meio
  const px = Math.round(dargo.x) + 40;
  const pz = Math.round(dargo.z);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run fill ${px - 5} 199 ${pz - 5} ${px + 5} 199 ${pz + 5} minecraft:stone`,
    `minecraft:execute in minecraft:sobrevivencia run fill ${px - 5} 200 ${pz - 5} ${px + 5} 202 ${pz + 5} minecraft:air`,
    `minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${px + 0.5} 200 ${pz + 0.5}`,
    `minecraft:execute in minecraft:sobrevivencia run tp ${NOME2} ${px + 2} 200 ${pz + 0.5}`);
  await L.espera(3000);
  let alvoMerc = '-';
  for (let i = 0; i < 12 && alvoMerc !== NOME2; i++) {
    L.rcon(`minecraft:damage ${NOME} 1 minecraft:player_attack by ${NOME2}`);
    await L.espera(400);
    alvoMerc = info(DARGO).alvo;
  }
  L.verificar(alvoMerc === NOME2, 'quem bate no dono vira alvo do mercenário: alvo=' + alvoMerc);
  L.verificar(await esperarEstado(DARGO, 'Combate') === 'Combate', 'e o mercenário entra em Combate');
  guardarBot2();
  await L.espera(1000);

  // Dispensar
  p = L.esperarMsg(bot, 'dispensou');
  bot.chat('/mercenario dispensar');
  L.verificar(await p, '/mercenario dispensar encerra o contrato');
  await L.espera(1200);
  L.verificar(info(DARGO).dono === '-', 'o mercenário fica sem dono depois de dispensado');

  // Mundo com PvP desligado não contrata
  L.rcon('minecraft:execute in minecraft:sobrevivencia run gamerule pvp false');
  await L.espera(600);
  o = await opcaoContratar();
  p = L.esperarMsg(bot, 'PvP');
  if (o) bot.chat(o.cmd);
  L.verificar(await p, 'com o PvP do mundo desligado o mercenário recusa');
  L.rcon('minecraft:execute in minecraft:sobrevivencia run gamerule pvp true');

  // Morreu em combate: avisa o dono e fica de molho (espera-para-recontratar-minutos: 1 no teste)
  o = await opcaoContratar();
  p = L.esperarMsg(bot, 'vai lutar com você');
  if (o) bot.chat(o.cmd);
  await p;
  await L.espera(800);
  p = L.esperarMsg(bot, 'caiu em combate');
  L.rcon('npcv combate ' + DARGO + ' matar');
  L.verificar(await p, 'se o mercenário cai, o dono é avisado');
  L.verificar(info(DARGO).dono === '-', 'o mercenário morto solta o contrato do dono');
  // O corpo some quando ele cai; o teste espera o respawn (5s) para poder falar com ele de novo
  await esperarEstado(DARGO, 'Ocioso', 15000);
  o = await opcaoContratar();
  p = L.esperarMsg(bot, 'volta a aceitar contrato');
  if (o) bot.chat(o.cmd);
  const esperando = await p;
  L.verificar(esperando, 'depois de cair ele fica um tempo sem aceitar contrato: ' + esperando);
  L.rcon('npcv combate ' + DARGO + ' curar');

  // ================================================================ DUELO
  console.log('\n--- duelo ---');
  L.rcon('eco set ' + NOME + ' 200000', 'heal ' + NOME);
  await L.espera(600);
  const abrirDuelos = async () => {
    await falarCom(KAELA, kaela);
    const ok = await L.clicarOpcao(bot, 'Me desafie para um duelo');
    await L.espera(1200);
    return ok;
  };
  L.verificar(await abrirDuelos(), 'a conversa da duelista tem a opção de duelo');
  const dificuldades = bot.opcoes.filter((x) => /aposta/.test(x.texto));
  L.verificar(dificuldades.length === 4, `o menu mostra as 4 dificuldades do combate.yml (${dificuldades.length})`);
  L.verificar(dificuldades.some((x) => /Fácil/.test(x.texto) && /200/.test(x.texto)), 'a dificuldade Fácil custa $200 de aposta');

  const tentarDuelo = async (nome, trecho = 'DUELO!', ms = 6000) => {
    if (!(await abrirDuelos())) return null;
    const esc = bot.opcoes.find((x) => x.texto.includes(nome));
    if (!esc) return null;
    const pr = L.esperarMsg(bot, trecho, ms);
    bot.opcoes.length = 0;
    bot.chat(esc.cmd);
    const m = await pr;
    await L.espera(600);
    return m;
  };
  // Entre dois duelos a duelista descansa (e depois de cair ela ainda precisa reaparecer):
  // o teste retenta até ela aceitar em vez de falhar por causa do relógio.
  const comecarDuelo = async (nome, ms = 60000) => {
    const fim = Date.now() + ms;
    for (;;) {
      const m = await tentarDuelo(nome);
      if (m || Date.now() > fim) return m;
      await L.espera(2000);
    }
  };
  let antes = saldo();
  let m = await comecarDuelo('Fácil');
  L.verificar(m, 'duelo Fácil começou: ' + m);
  L.verificar(Math.abs((antes - saldo()) - 200) < 0.02, `a aposta de $200 foi cobrada (${(antes - saldo()).toFixed(2)})`);
  const emDuelo = info(KAELA);
  L.verificar(emDuelo.vidaMaxima === 60 && emDuelo.dano === 4, `no duelo Fácil a Kaela fica com 60 de vida e 4 de dano (${emDuelo.vidaMaxima}/${emDuelo.dano})`);
  L.verificar(emDuelo.estado === 'Combate' && emDuelo.alvo === NOME, 'a duelista entra em Combate contra o desafiante');

  // Terceiro não entra no duelo de outro (o bot2 já está logado, só vem de perto)
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME2} ${kaela.x + 1.5} ${kaela.y} ${kaela.z}`);
  await L.espera(2000);
  const vAntes = info(KAELA).vida;
  const alheio = L.esperarMsg(bot2, 'duelo é de outro');
  const mq = npcPorNomeDe(bot2, 'Kaela');
  if (mq) {
    await bot2.lookAt(mq.position.offset(0, 1.4, 0), true);
    await L.espera(700);
    bot2.attack(mq);
  }
  await L.espera(1200);
  L.verificar(await alheio, 'quem não é o desafiante é avisado que o duelo é de outro');
  L.verificar(Math.abs(info(KAELA).vida - vAntes) < 0.01, 'e o golpe dele não tira vida da duelista');
  guardarBot2();
  await L.espera(1000);

  // Ganhar o duelo
  antes = saldo();
  let repAntes = rep();
  L.rcon('npcv combate ' + KAELA + ' vida 1');
  await irAte(kaela, -1.2);
  p = L.esperarMsg(bot, 'VITÓRIA!');
  const recompensa = L.esperarMsg(bot, 'ganhou');
  await bater(KAELA, 3);
  const venceu = await p;
  L.verificar(venceu, 'derrubar a duelista ganha o duelo: ' + venceu);
  await L.espera(1200);
  L.verificar(saldo() - antes >= 500, `o prêmio de $500 do Fácil foi pago (+${(saldo() - antes).toFixed(2)})`);
  L.verificar(rep() > repAntes, `ganhar o duelo dá reputação na facção da NPC (${repAntes} -> ${rep()})`);
  await recompensa;
  // Regressão: o fim do duelo devolvia os atributos (e a vida cheia) da duelista caída, e aí
  // ninguém mais a fazia reaparecer - ela ficava invisível para sempre
  L.verificar(!!(await acharNpc(KAELA, 15000)), 'a duelista derrubada no duelo reaparece no posto');

  // Descanso entre duelos (espera-entre-duelos-segundos: 20 no teste)
  const descansando = await tentarDuelo('Fácil', 'ocupado');
  L.verificar(descansando, 'logo depois de um duelo a duelista está descansando: ' + descansando);
  await esperarEstado(KAELA, 'Ocioso', 15000);

  // Título na dificuldade Média
  antes = saldo();
  m = await comecarDuelo('Média');
  L.verificar(m, 'duelo Média começou: ' + m);
  L.rcon('npcv combate ' + KAELA + ' vida 1');
  await irAte(kaela, -1.2);
  p = L.esperarMsg(bot, 'título');
  await bater(KAELA, 3);
  const titulo = await p;
  L.verificar(titulo && /Bronze/.test(titulo), 'ganhar na Média dá o título "Duelista de Bronze": ' + titulo);
  await L.espera(3500);
  const banco = fs.existsSync(path.join(PASTA, 'dados.db'))
    ? fs.readFileSync(path.join(PASTA, 'dados.db')) : Buffer.from('');
  L.verificar(banco.includes('Duelista de Bronze'), 'o título ficou guardado no dados.db');
  await esperarEstado(KAELA, 'Ocioso', 20000);

  // Sair da arena perde
  m = await comecarDuelo('Fácil');
  L.verificar(m, 'duelo Fácil de novo para testar a fuga: ' + m);
  p = L.esperarMsg(bot, 'saiu da arena');
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${kaela.x + 50} ${kaela.y + 10} ${kaela.z}`);
  const fugiu = await p;
  L.verificar(fugiu, 'sair da arena perde o duelo: ' + fugiu);
  await esperarEstado(KAELA, 'Ocioso', 20000);

  // Estourar o tempo perde (tempo-maximo-segundos: 30 no teste)
  m = await comecarDuelo('Fácil');
  L.verificar(m, 'duelo Fácil de novo para testar o tempo: ' + m);
  p = L.esperarMsg(bot, 'O tempo do duelo', 40000);
  const estourou = await p;
  L.verificar(estourou, 'estourar o tempo máximo perde o duelo: ' + estourou);
  await esperarEstado(KAELA, 'Ocioso', 20000);

  // Desistir pela conversa
  m = await comecarDuelo('Fácil');
  L.verificar(m, 'duelo Fácil de novo para testar a desistência: ' + m);
  await falarCom(KAELA, kaela);
  p = L.esperarMsg(bot, 'desistiu do duelo');
  const desistiu = await L.clicarOpcao(bot, 'Desistir do duelo') ? await p : null;
  L.verificar(desistiu, 'a conversa tem a opção de desistir do duelo: ' + desistiu);
  await esperarEstado(KAELA, 'Ocioso', 20000);

  // ================================================================ DROPS E LIMITE POR HORA
  console.log('\n--- recompensa e limite por hora ---');
  L.rcon('minecraft:kill @e[type=minecraft:item]');
  await L.espera(500);
  await irAte(kaela, -1.2);
  L.rcon('npcv combate ' + KAELA + ' vida 1');
  p = L.esperarMsg(bot, 'e ganhou');
  await bater(KAELA, 3);
  const premio = await p;
  L.verificar(premio && /400/.test(premio), 'matar a duelista fora do duelo paga a recompensa de $400: ' + premio);
  await L.espera(1200);
  // A pedra COMUM é um FLINT com nome próprio. Ela cai no chão, mas o bot está em sobrevivência
  // em cima do corpo e pega na hora: as duas pontas valem como "caiu".
  const noChao = L.limpar(L.rcon(`minecraft:execute as ${NOME} at @s `
    + 'run execute if entity @e[type=minecraft:item,nbt={Item:{id:"minecraft:flint"}},distance=..8]'));
  const naMochila = bot.inventory.items().filter((x) => x.name === 'flint').length;
  L.verificar(/passed|Count: [1-9]/i.test(noChao) || naMochila > 0,
    `e deixa cair a pedra de aprimoramento (chão: ${/passed/i.test(noChao)}, mochila: ${naMochila})`);

  // O limite de recompensa por hora do teste é 5 (duelos vencidos também contam)
  let avisou = null;
  for (let i = 0; i < 5 && !avisou; i++) {
    await esperarEstado(KAELA, 'Ocioso', 12000);
    await irAte(kaela, -1.2);
    L.rcon('npcv combate ' + KAELA + ' vida 1');
    const aviso = L.esperarMsg(bot, 'muitas recompensas', 4000);
    await bater(KAELA, 3);
    avisou = await aviso;
  }
  L.verificar(avisou, 'passando do limite por hora o jogador é avisado e não ganha mais: ' + avisou);
  // O limite já foi provado: solta de novo, senão o chefe não pagaria nem deixaria cair nada
  ajustar('limite-de-recompensa-por-hora', 999);
  L.rcon('npcv reload');
  await L.espera(1500);

  // ================================================================ CHEFE
  console.log('\n--- chefe ---');
  const bx = Math.round(kaela.x) + 70;
  const bz = Math.round(kaela.z);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run fill ${bx - 12} 199 ${bz - 12} ${bx + 12} 199 ${bz + 12} minecraft:stone`,
    `minecraft:execute in minecraft:sobrevivencia run fill ${bx - 12} 200 ${bz - 12} ${bx + 12} 204 ${bz + 12} minecraft:air`);
  await L.espera(800);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${bx + 0.5} 200 ${bz + 0.5}`);
  await L.espera(2000);
  // O chefe já ataca enquanto o teste confere a barra de vida: a escuta das habilidades
  // começa antes de ele nascer para nenhuma investida passar batida.
  const vistas = new Set();
  const ouvir = (msg) => {
    const t = L.limpar(msg.toString());
    for (const [chave, trecho] of [['investida', 'parte para cima'], ['puxar', 'te puxa para perto'],
      ['area-de-fogo', 'acendeu o ch'], ['invocar', 'chamou ajudantes']]) {
      if (t.includes(trecho)) vistas.add(chave);
    }
  };
  bot.on('message', ouvir);
  const barraCriada = new Promise((res) => { bot.once('bossBarCreated', res); setTimeout(() => res(null), 12000); });
  L.verificar(await L.comandoEspera(bot, `/npcv criar boss ${CHEFE} <dark_red><bold>Chefe de Teste`, 'criado'),
    '/npcv criar boss cria um chefe onde a staff está');
  L.rcon('npcv reload');
  await L.espera(1500);
  const chefe = info(CHEFE);
  L.verificar(chefe.existe && chefe.vidaMaxima === 400, `o chefe nasce com 400 de vida (${chefe.vidaMaxima})`);

  // Barra de vida no topo da tela
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${bx + 7.5} 200 ${bz + 0.5}`);
  const barra = await barraCriada;
  L.verificar(barra || Object.keys(bot.bossBars || {}).length > 0, 'quem está perto vê a barra de vida do chefe');
  const tituloBarra = barra ? L.limpar(JSON.stringify(barra.title)) : '';
  L.verificar(/Chefe de Teste/.test(tituloBarra), 'a barra mostra o nome do chefe: ' + tituloBarra);

  // O chefe caça sozinho, sem precisar levar golpe
  L.verificar(await esperarEstado(CHEFE, 'Combate', 10000) === 'Combate', 'o chefe persegue o jogador mais perto por conta própria');

  // Habilidades: o bot fica a ~9 blocos e o chefe é jogado de volta para o meio da plataforma a cada
  // 150 ms - senão ele chega perto e as habilidades de longe não valem mais
  const manterDistancia = async (segundos) => {
    const fim = Date.now() + segundos * 1000;
    while (Date.now() < fim) {
      L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${bx + 9.5} 200 ${bz + 0.5}`,
        `minecraft:execute in minecraft:sobrevivencia positioned ${bx} 200 ${bz} run tp `
        + `@e[type=minecraft:mannequin,limit=1,sort=nearest] ${bx + 0.5} 200 ${bz + 0.5}`);
      await L.espera(150);
    }
  };
  // Uma habilidade de cada vez: com as quatro em 100% elas disputam o mesmo segundo, e quem ganha
  // muda a distância e barra as outras. O teste liga uma e zera as demais.
  const HABS = ['investida', 'puxar', 'area-de-fogo', 'invocar'];
  const soA = async (qual) => {
    for (const h of HABS) ajustar(`bosses.habilidades.${h}.chance`, h === qual ? 100 : 0);
    L.rcon('npcv reload');
    await L.espera(1500);
    await esperarEstado(CHEFE, 'Combate', 8000);
  };
  const esperarHabilidade = async (qual, segundos = 18) => {
    vistas.delete(qual);
    await soA(qual);
    const fim = Date.now() + segundos * 1000;
    while (Date.now() < fim && !vistas.has(qual)) await manterDistancia(1);
    return vistas.has(qual);
  };
  L.verificar(await esperarHabilidade('investida'), 'habilidade investida saiu');
  L.verificar(await esperarHabilidade('puxar'), 'habilidade puxar saiu');
  L.verificar(await esperarHabilidade('area-de-fogo'), 'habilidade área de fogo saiu');

  // Invocar só vale com o chefe abaixo de 70% da vida
  vistas.delete('invocar');
  await soA('invocar');
  await manterDistancia(8);
  L.verificar(!vistas.has('invocar'), 'com a vida cheia o chefe ainda não chama ajudantes');
  L.rcon('npcv combate ' + CHEFE + ' vida 200');
  await manterDistancia(12);
  L.verificar(vistas.has('invocar'), 'com o chefe machucado a habilidade invocar sai');
  const ajudantes = L.limpar(L.rcon(`minecraft:execute in minecraft:sobrevivencia positioned ${bx} 200 ${bz} `
    + 'run execute if entity @e[type=minecraft:zombie,distance=..20]'));
  L.verificar(/passed|Count: [1-9]/i.test(ajudantes), 'os ajudantes invocados aparecem em volta do chefe');
  bot.removeListener('message', ouvir);

  // O chefe nunca foge
  L.rcon('npcv combate ' + CHEFE + ' vida 10');
  await L.espera(2500);
  L.verificar(info(CHEFE).estado === 'Combate', 'com pouca vida o chefe não foge (estado ' + info(CHEFE).estado + ')');

  // Morte: anúncio no chat, dinheiro e itens.
  // O chão pegando fogo da habilidade de área queima os drops, então ela é desligada antes
  // da última pancada e o fogo que já estava aceso é apagado.
  ajustar('bosses.habilidades.area-de-fogo.chance', 0);
  L.rcon('npcv reload');
  await L.espera(1500);
  const apagarFogo = () => L.rcon('minecraft:execute in minecraft:sobrevivencia run fill '
    + `${bx - 12} 200 ${bz - 12} ${bx + 12} 203 ${bz + 12} minecraft:air replace minecraft:fire`);
  apagarFogo();
  L.rcon('minecraft:kill @e[type=minecraft:item]');
  antes = saldo();
  p = L.esperarMsg(bot, 'CHEFE DERROTADO');
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ${bx + 2.5} 200 ${bz + 0.5}`);
  await L.espera(1200);
  L.rcon('npcv combate ' + CHEFE + ' vida 1');
  await bater(CHEFE, 3);
  const morreu = await p;
  apagarFogo();
  L.verificar(morreu, 'o chefe morto é anunciado para o servidor: ' + morreu);
  await L.espera(1500);
  const semAjudantes = L.limpar(L.rcon(`minecraft:execute in minecraft:sobrevivencia positioned ${bx} 200 ${bz} `
    + 'run execute if entity @e[type=minecraft:zombie,distance=..20]'));
  L.verificar(!/passed|Count: [1-9]/i.test(semAjudantes), 'os ajudantes somem quando o chefe cai');
  const caiu = L.limpar(L.rcon(`minecraft:execute in minecraft:sobrevivencia positioned ${bx} 200 ${bz} `
    + 'run execute if entity @e[type=minecraft:item,nbt={Item:{id:"minecraft:diamond"}},distance=..10]'));
  L.verificar(/passed|Count: [1-9]/i.test(caiu), 'o chefe deixa cair os diamantes da tabela de drops');

  // Volta depois do tempo de respawn (10s no teste)
  p = L.esperarMsg(bot, 'apareceu em', 25000);
  const voltouChefe = await p;
  L.verificar(voltouChefe, 'o chefe volta sozinho depois do respawn e é anunciado: ' + voltouChefe);
  await L.espera(1000);
  L.verificar(info(CHEFE).vida === 400 && info(CHEFE).estado !== 'Combate' || info(CHEFE).vida === 400,
    'e volta com a vida cheia');

  // ================================================================ FIM
  console.log('\n--- limpeza e log ---');
  const logs = fs.readdirSync(path.join(PASTA, 'logs')).map((f) => fs.readFileSync(path.join(PASTA, 'logs', f), 'utf8')).join('\n');
  L.verificar(new RegExp('MERCEN .*' + NOME).test(logs), 'contratos de mercenário ficam no log de transações');
  L.verificar(new RegExp('DUELO .*' + NOME).test(logs), 'duelos ficam no log de transações');
  L.verificar(new RegExp('MORTE .*' + NOME).test(logs), 'mortes de NPC ficam no log de transações');

  await L.comandoEspera(bot, '/npcv remover ' + CHEFE, 'removido');
  await L.espera(800);
  L.verificar(!info(CHEFE).existe, 'remover o chefe também apaga o cérebro dele');
  const fim = L.limpar(L.rcon('npcv combate'));
  L.verificar(/cérebro de combate: 2/.test(fim), 'sobram os 2 NPCs de luta de exemplo: ' + fim.split('\n').pop().trim());

  bot.quit();
  bot2.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
