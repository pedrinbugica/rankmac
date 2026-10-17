// Teste do SurvivalRPG no mundo real copiado: capital construída, NPCs vivos (andando/falando), classe, habilidades
// (F + 1/2/3), mobs com nível, XP, grupo, proteção da capital, masmorra completa (salas, portões, ondas, chefe,
// recompensa, volta), morte sem perder itens, lugares espalhados, /lugares e placeholders.
const L = require('./lib');
const { Vec3 } = require('vec3');

const B1 = 'BotRpg1';
const B2 = 'BotRpg2';
const CX = 16;
const CZ = 0;
const H = 87;
const sv = (cmd) => L.rcon('execute in minecraft:sobrevivencia run ' + cmd);
const tp = (nome, x, y, z) => sv(`minecraft:tp ${nome} ${x} ${y} ${z}`);
const papi = (nome, p) => L.limpar(L.rcon(`papi parse ${nome} %${p}%`)).replace(/^> .*\n/, '').trim();

function saldo(nome) {
  const m = L.rcon('balance ' + nome).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}

(async () => {
  // ---------------------------------------------------------------- CAPITAL
  let status = '';
  for (let i = 0; i < 60; i++) {
    status = L.limpar(L.rcon('rpgadmin status'));
    if (status.includes('Capital: pronta') && status.includes('6/6')) break;
    await L.espera(3000);
  }
  console.log(status);
  L.verificar(status.includes('Capital: pronta'), 'capital Vila Aurora construída sozinha');
  L.verificar(status.includes('6/6'), 'as 6 masmorras (3 x 2 instâncias) construídas');

  const bot = await L.criarBot(B1);
  const bot2 = await L.criarBot(B2);
  for (const b of [bot, bot2]) {
    b.barras = [];
    b.titulos = [];
    b.on('actionBar', (m) => b.barras.push(L.limpar(m.toString())));
    b._client.on('action_bar', (d) => { const t = L.limpar(JSON.stringify(d)); b.barras.push(t); if (b === bot && !t.includes('❤')) console.log('  [barra] ' + t.slice(0, 160)); });
    b.on('title', (t) => b.titulos.push(L.limpar(typeof t === 'string' ? t : JSON.stringify(t))));
  }
  const esperarBarra = async (b, trecho, ms = 6000) => {
    const ini = b.barras.length;
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      for (let i = ini; i < b.barras.length; i++) if (b.barras[i].includes(trecho)) return b.barras[i];
      await L.espera(100);
    }
    return null;
  };
  const esperarTitulo = async (b, trecho, ms = 8000, desde = b.titulos.length) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      for (let i = desde; i < b.titulos.length; i++) if (b.titulos[i].includes(trecho)) return b.titulos[i];
      await L.espera(100);
    }
    return null;
  };
  L.rcon(`gamemode survival ${B1}`, `gamemode survival ${B2}`);
  tp(B1, CX + 0.5, H + 1, CZ + 8.5);
  tp(B2, CX + 2.5, H + 1, CZ + 8.5);
  await L.espera(4000);
  for (const n of [B1, B2]) L.rcon('minecraft:effect give ' + n + ' minecraft:resistance 99999 4 true', 'minecraft:effect give ' + n + ' minecraft:saturation 99999 1 true');
  L.verificar(bot.game.dimension && bot.entity.position.distanceTo(new Vec3(CX + 0.5, H + 1, CZ + 8.5)) < 3, 'bot na praça da capital');
  const nome = (v) => (bot.blockAt(v) || { name: '?' }).name;
  L.verificar(nome(new Vec3(CX + 1, H, CZ)) === 'water', 'chafariz com água no centro da praça (' + nome(new Vec3(CX + 1, H, CZ)) + ')');
  L.verificar(nome(new Vec3(CX + 40, H + 3, CZ + 10)).includes('stone') || nome(new Vec3(CX + 40, H + 3, CZ + 10)).includes('andesite'),
    'muralha de pedra (' + nome(new Vec3(CX + 40, H + 3, CZ + 10)) + ')');
  L.verificar(nome(new Vec3(CX, H + 2, CZ + 40)) === 'air', 'portão sul aberto');
  L.verificar(nome(new Vec3(CX, H + 1, CZ - 30)) === 'red_carpet' || nome(new Vec3(CX, H + 1, CZ - 28)) === 'red_carpet', 'tapete vermelho no castelo');
  L.verificar(nome(new Vec3(CX - 23, H + 1, CZ + 22)) === 'lodestone', 'pedra-guia do Portão das Masmorras');

  // ---------------------------------------------------------------- NPCs
  const mannequins = () => Object.values(bot.entities).filter((e) => e.name === 'mannequin');
  const npcs = mannequins();
  L.verificar(npcs.length >= 6, `NPCs na capital (${npcs.length} manequins por perto)`);
  const posicoes = new Map(npcs.map((e) => [e.id, e.position.clone()]));
  const textosAntes = Object.values(bot.entities).filter((e) => e.name === 'text_display').length;
  L.verificar(textosAntes >= 3, `letreiros flutuantes (${textosAntes})`);
  let andaram = 0;
  let baloes = 0;
  for (let i = 0; i < 45; i++) {
    await L.espera(1000);
    const t = Object.values(bot.entities).filter((e) => e.name === 'text_display').length;
    if (t > textosAntes) baloes++;
  }
  for (const e of mannequins()) {
    const p0 = posicoes.get(e.id);
    if (p0 && e.position.distanceTo(p0) > 0.8) andaram++;
  }
  L.verificar(andaram >= 1, `NPCs andando sozinhos (${andaram} se mexeram em 25s)`);
  L.verificar(baloes >= 1, 'NPCs falando (balões de fala apareceram)');

  // ---------------------------------------------------------------- CLASSE E MENUS
  let w = await L.abrirMenu(bot, '/rpg');
  L.verificar(w && L.tituloJanela(w).includes('Seu personagem'), 'menu /rpg abre');
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
  w = await L.abrirMenu(bot, '/classe');
  L.verificar(w && L.tituloJanela(w).includes('classe'), 'menu /classe abre');
  const msgClasse = Promise.race([L.esperarMsg(bot, 'Você agora é', 6000), L.esperarMsg(bot, 'já é a sua classe', 6000)]);
  await bot.clickWindow(11, 0, 0).catch(() => {});
  L.verificar(await msgClasse, 'escolheu Guerreiro clicando no menu');
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
  L.verificar(papi(B1, 'rpg_classe') === 'Guerreiro', 'placeholder %rpg_classe% = Guerreiro (' + papi(B1, 'rpg_classe') + ')');
  L.rcon(`rpgadmin nivel ${B1} 20`, `rpgadmin nivel ${B2} 10`);
  await L.espera(500);
  L.verificar(papi(B1, 'rpg_nivel') === '20', 'admin colocou nível 20 (' + papi(B1, 'rpg_nivel') + ')');
  w = await L.abrirMenu(bot, '/atributos');
  L.verificar(w && L.tituloJanela(w).includes('Atributos'), 'menu /atributos abre');
  const antesPontos = Number(papi(B1, 'rpg_pontos'));
  await bot.clickWindow(10, 0, 0).catch(() => {});
  await L.espera(800);
  L.verificar(Number(papi(B1, 'rpg_pontos')) === antesPontos - 1, `gastou 1 ponto de atributo (${antesPontos} -> ${papi(B1, 'rpg_pontos')})`);
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);

  // ---------------------------------------------------------------- HABILIDADES
  L.rcon(`clear ${B1}`, `give ${B1} minecraft:netherite_sword`);
  await L.espera(800);
  bot.setQuickBarSlot(0);
  await L.espera(500);
  const trocarMao = () => bot._client.write('block_dig', { status: 6, location: { x: 0, y: 0, z: 0 }, face: 0, sequence: 0 });
  trocarMao();
  L.verificar(await esperarBarra(bot, 'Modo habilidade'), 'F com a espada liga o modo habilidade');
  await L.espera(600);
  L.verificar(bot.quickBarSlot === 8 && bot.heldItem && bot.heldItem.name === 'netherite_sword', `espada foi para o slot 9 (slot ${bot.quickBarSlot}, ${bot.heldItem && bot.heldItem.name})`);
  const manaAntes = Number(papi(B1, 'rpg_mana'));
  bot.setQuickBarSlot(0);
  await L.espera(1200);
  const manaDepois = Number(papi(B1, 'rpg_mana'));
  L.verificar(manaDepois < manaAntes, `Grito de Guerra gastou mana (${manaAntes} -> ${manaDepois})`);
  L.verificar(bot.quickBarSlot === 8, 'a tecla 1 não trocou o item da mão');
  const p0 = bot.entity.position.clone();
  console.log('  slot antes da investida: ' + bot.quickBarSlot + ' yaw ' + bot.entity.yaw);
  bot.setQuickBarSlot(1);
  await L.espera(1500);
  console.log('  depois: ' + bot.entity.position + ' vel ' + bot.entity.velocity);
  const manaInv = Number(papi(B1, 'rpg_mana'));
  L.verificar(manaInv <= manaDepois - 15, `Investida usada (mana ${manaDepois} -> ${manaInv}; o bot de teste não aplica o empurrão: ${bot.entity.position.distanceTo(p0).toFixed(1)} blocos)`);
  bot.setQuickBarSlot(0);
  L.verificar(await esperarBarra(bot, 'recarregando', 3000), 'habilidade em recarga avisa na barra');
  trocarMao();
  await L.espera(1000);
  L.verificar(bot.quickBarSlot === 0 && bot.inventory.slots[36] && bot.inventory.slots[36].name === 'netherite_sword',
    'F de novo desliga e a espada volta para o slot 1');

  // ---------------------------------------------------------------- MOB COM NÍVEL E XP
  tp(B1, CX + 0.5, H + 2, CZ + 52.5);
  await L.espera(2500);
  sv(`summon husk ${CX + 0.5} ${H + 6} ${CZ + 55.5}`);
  await L.espera(2500);
  const zumbi = Object.values(bot.entities).find((e) => e.name === 'husk' && e.position.distanceTo(bot.entity.position) < 12);
  const nomeZumbi = zumbi ? L.limpar(JSON.stringify(zumbi.metadata[2] || '')) : '';
  L.verificar(zumbi && nomeZumbi.includes('Nv'), 'zumbi fora da cidade nasce com nível: ' + nomeZumbi.slice(0, 80));
  if (zumbi) {
    const xpMsg = esperarBarra(bot, 'XP', 20000);
    for (let i = 0; i < 40 && bot.entities[zumbi.id]; i++) {
      await bot.lookAt(zumbi.position.offset(0, 1.4, 0));
      bot.attack(zumbi);
      await L.espera(650);
    }
    L.verificar(await xpMsg, 'matar o zumbi deu XP de RPG');
  }

  // ---------------------------------------------------------------- GRUPO
  tp(B1, CX - 20.5, H + 1, CZ + 18.5);
  tp(B2, CX - 22.5, H + 1, CZ + 18.5);
  await L.espera(2500);
  const convite = L.esperarMsg(bot2, 'te convidou', 6000);
  bot.chat('/grupo convidar ' + B2);
  L.verificar(await convite, 'convite de grupo chegou');
  L.verificar(await L.comandoEspera(bot2, '/grupo aceitar', 'entrou no grupo', 6000), 'entrou no grupo');

  // ---------------------------------------------------------------- PROTEÇÃO
  const alvo = bot2.blockAt(new Vec3(CX - 20, H, CZ + 16));
  const tipoAntes = alvo && alvo.name;
  if (alvo) {
    await bot2.lookAt(alvo.position.offset(0.5, 0.5, 0.5));
    try {
      await Promise.race([bot2.dig(alvo, true), L.espera(4000)]);
    } catch (e) { /* cancelado */ }
  }
  await L.espera(800);
  L.verificar(bot2.blockAt(new Vec3(CX - 20, H, CZ + 16)).name === tipoAntes, `não dá para quebrar blocos na capital (${tipoAntes})`);

  // ---------------------------------------------------------------- MASMORRA
  const dinheiroAntes = saldo(B1);
  const itensAntes = bot.inventory.items().length;
  w = await L.abrirMenu(bot, '/masmorra');
  L.verificar(w && L.tituloJanela(w).includes('Masmorras'), 'menu de masmorras abre no portão');
  const entrou = L.esperarMsg(bot, 'entraram em', 8000);
  await bot.clickWindow(11, 0, 0).catch(() => {});
  L.verificar(await entrou, 'entrou na Cripta dos Esquecidos com o grupo');
  await L.espera(3000);
  const ox = -9684;
  const oz = -9700;
  const oy = 271;
  L.verificar(Math.abs(bot.entity.position.y - oy) < 2 && bot.entity.position.x < -9000, `bot na entrada da masmorra (${bot.entity.position.toString()})`);
  L.verificar(bot2.entity.position.x < -9000, 'o outro membro do grupo veio junto');
  const salas = [ox + 26.5, ox + 51.5, ox + 76.5];
  const entradas = [ox + 18, ox + 42, ox + 68];
  const saidas = [ox + 34, ox + 60, ox + 84];
  const ondas = [1, 2, 2];
  const matar = () => L.rcon(`execute as ${B1} at @s run minecraft:kill @e[type=!player,type=!text_display,type=!item,distance=..25]`);
  for (let s = 0; s < salas.length; s++) {
    const desde = bot.titulos.length;
    tp(B1, salas[s], oy, oz + 0.5);
    tp(B2, salas[s] + 1, oy, oz + 2.5);
    L.verificar(await esperarTitulo(bot, 'Onda 1', 6000, desde), `sala ${s + 1}: onda 1 começou`);
    await L.espera(1200);
    const portaoAntes = new Vec3(entradas[s], oy + 1, oz);
    L.verificar(nome(portaoAntes) === 'iron_bars', `sala ${s + 1}: portão de entrada fechou (${nome(portaoAntes)})`);
    const mobs = Object.values(bot.entities).filter((e) => e.type === 'hostile' || ['zombie', 'skeleton', 'husk', 'stray'].includes(e.name));
    L.verificar(mobs.length >= 3, `sala ${s + 1}: monstros apareceram (${mobs.length})`);
    for (let o = 2; o <= ondas[s]; o++) {
      const d2 = bot.titulos.length;
      matar();
      L.verificar(await esperarTitulo(bot, 'Onda ' + o, 6000, d2), `sala ${s + 1}: onda ${o} veio depois`);
      await L.espera(1000);
    }
    const d3 = bot.titulos.length;
    matar();
    L.verificar(await esperarTitulo(bot, 'Sala limpa', 6000, d3), `sala ${s + 1}: sala limpa`);
    await L.espera(600);
    L.verificar(nome(new Vec3(saidas[s], oy + 1, oz)) === 'air', `sala ${s + 1}: portão de saída abriu`);
  }
  // Morte lá dentro: renasce na entrada sem perder nada
  L.rcon(`minecraft:clear ${B2}`);
  await L.espera(500);
  const itensB2 = bot2.inventory.items().length;
  L.rcon(`give ${B2} minecraft:diamond 3`);
  await L.espera(600);
  L.rcon(`minecraft:kill ${B2}`);
  await L.espera(4000);
  L.verificar(bot2.entity.position.x < ox + 12 && bot2.entity.position.x > ox, `morreu e renasceu na entrada da masmorra (${bot2.entity.position.x.toFixed(0)})`);
  L.verificar(bot2.inventory.items().length >= itensB2 + 1, 'não perdeu os itens ao morrer na masmorra');
  // Chefe
  L.rcon(`minecraft:clear ${B1}`);
  await L.espera(500);
  const itensAntesChefe = bot.inventory.items().length;
  let barraChefe = null;
  bot.once('bossBarCreated', (b) => { barraChefe = L.limpar(JSON.stringify(b.title)); });
  const d4 = bot.titulos.length;
  tp(B1, ox + 99.5, oy, oz + 6.5);
  L.verificar(await esperarTitulo(bot, 'Rei Esqueleto', 6000, d4), 'o chefe Ossian apareceu');
  await L.espera(1500);
  L.verificar(barraChefe && barraChefe.includes('Ossian'), 'barra de vida do chefe: ' + barraChefe);
  const chefe = Object.values(bot.entities).find((e) => e.name === 'skeleton' && L.limpar(JSON.stringify(e.metadata[2] || '')).includes('Ossian'));
  L.verificar(!!chefe, 'chefe com nome próprio');
  await L.espera(3000);
  const d5 = bot.titulos.length;
  L.rcon(`execute as ${B1} at @s run minecraft:kill @e[type=skeleton,distance=..30]`);
  L.verificar(await esperarTitulo(bot, 'VITÓRIA', 8000, d5), 'vitória ao derrotar o chefe');
  await L.espera(1500);
  L.verificar(saldo(B1) > dinheiroAntes, `ganhou dinheiro (${dinheiroAntes} -> ${saldo(B1)})`);
  const raros = bot.inventory.items().filter((i) => JSON.stringify(i.components || i.nbt || '').includes('Exige n')).length;
  L.verificar(raros >= 2, `ganhou 2 itens raros (${itensAntesChefe} -> ${bot.inventory.items().length} itens, ${raros} de RPG)`);
  for (let i = 0; i < 60 && bot.entity.position.x < -100; i++) await L.espera(1000);
  L.verificar(bot.entity.position.x > -100, `voltou para a capital depois da vitória (${bot.entity.position.toString()})`);
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);

  // ---------------------------------------------------------------- LUGARES
  let lugares = '';
  for (let i = 0; i < 60; i++) {
    lugares = L.limpar(L.rcon('rpgadmin lugar lista'));
    if ((lugares.match(/• /g) || []).length >= 8) break;
    await L.espera(5000);
  }
  const qtd = (lugares.match(/• /g) || []).length;
  console.log(lugares);
  L.verificar(qtd >= 8, `lugares espalhados pelo mapa (${qtd})`);
  L.verificar(/vila_\d/.test(lugares), 'pelo menos uma vila colocada');
  w = await L.abrirMenu(bot, '/lugares');
  L.verificar(w && L.tituloJanela(w).includes('Lugares'), 'menu /lugares abre');
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);

  const falhas = L.resumo();
  bot.quit();
  bot2.quit();
  await L.espera(1000);
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.log('ERRO NO TESTE: ' + (e && e.stack || e));
  process.exit(2);
});
