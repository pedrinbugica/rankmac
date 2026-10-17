// Teste do lobby (RankupSupremo 1.3.0): todo mundo chega na ilha do lobby, bússola abre o menu de mundos,
// portal verde leva ao SMP RPG (capital) e o dourado ao Rankup, /lobby volta, inventário do lobby é separado
// (MV-Inventories), proteção e volta para onde parou no survival.
const L = require('./lib');
const { Vec3 } = require('vec3');

const NOME = 'BotLobby1';
const dimensao = () => {
  const m = L.limpar(L.rcon(`data get entity ${NOME} Dimension`)).match(/"([a-z_:]+)"/);
  return m ? m[1] : '?';
};

(async () => {
  for (let i = 0; i < 40 && !L.limpar(L.rcon('rankupadmin')).length; i++) await L.espera(2000);
  const bot = await L.criarBot(NOME);
  await L.espera(3000);
  L.verificar(dimensao() === 'minecraft:lobby', 'entrou no servidor e apareceu no lobby (' + dimensao() + ')');
  L.verificar(bot.entity.position.distanceTo(new Vec3(0.5, 101, 10.5)) < 3, 'no ponto de chegada da ilha (' + bot.entity.position + ')');
  const nome = (x, y, z) => (bot.blockAt(new Vec3(x, y, z)) || { name: '?' }).name;
  L.verificar(nome(0, 99, 0) === 'beacon' && nome(0, 100, 0) === 'yellow_stained_glass', 'farol no centro da praça');
  L.verificar(nome(-17, 101, 2) === 'gold_block' && nome(17, 101, 2) === 'mossy_stone_bricks', 'portal dourado (Rankup) e portal verde (SMP)');
  L.verificar(nome(-17, 102, 0) === 'air' && nome(17, 102, 0) === 'air', 'dá para atravessar os portais');
  await L.espera(1500);
  const bussola = bot.inventory.slots[40];
  L.verificar(bussola && bussola.name === 'compass', 'bússola no meio da barra (' + (bussola && bussola.name) + ')');
  const textos = Object.values(bot.entities).filter((e) => e.name === 'text_display').length;
  L.verificar(textos >= 4, `letreiros do lobby (${textos})`);

  // Bússola abre o menu de mundos
  bot.setQuickBarSlot(4);
  await L.espera(400);
  const janela = new Promise((res) => {
    const t = setTimeout(() => res(null), 4000);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  bot.activateItem();
  const w = await janela;
  L.verificar(w && L.tituloJanela(w).includes('mundo'), 'bússola abre o menu de mundos');
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);

  // Proteção: não quebra nada (modo aventura) e não perde vida
  L.verificar(bot.game.gameMode === 'adventure', 'modo aventura no lobby (' + bot.game.gameMode + ')');

  // Portal verde -> SMP RPG
  const andarAte = async (x) => {
    await bot.lookAt(new Vec3(x, 101.6, 0.5));
    bot.setControlState('forward', true);
    for (let i = 0; i < 40 && dimensao() === 'minecraft:lobby'; i++) await L.espera(250);
    bot.setControlState('forward', false);
    await L.espera(2500);
  };
  L.rcon(`execute in minecraft:lobby run minecraft:tp ${NOME} 13.5 101 0.5`);
  await L.espera(1500);
  await andarAte(30);
  L.verificar(dimensao() === 'minecraft:sobrevivencia', 'portal verde levou ao SMP RPG (' + dimensao() + ')');
  const pos = bot.entity.position;
  L.verificar(Math.abs(pos.x - 16.5) < 8 && Math.abs(pos.z - 6.5) < 8, 'chegou na praça da capital (' + pos + ')');
  L.verificar(bot.game.gameMode === 'survival', 'voltou ao modo sobrevivência (' + bot.game.gameMode + ')');

  // Inventário separado
  L.rcon(`give ${NOME} minecraft:diamond 7`);
  await L.espera(800);
  L.verificar(bot.inventory.items().some((i) => i.name === 'diamond'), 'ganhou diamantes no survival');
  L.rcon(`execute in minecraft:sobrevivencia run minecraft:tp ${NOME} 20.5 88 10.5`);
  await L.espera(1500);
  bot.chat('/lobby');
  await L.espera(3000);
  L.verificar(dimensao() === 'minecraft:lobby', '/lobby voltou para a ilha (' + dimensao() + ')');
  L.verificar(!bot.inventory.items().some((i) => i.name === 'diamond'), 'no lobby o inventário é outro (sem os diamantes)');
  // De volta ao SMP: volta para onde parou, com os diamantes
  L.rcon(`execute in minecraft:lobby run minecraft:tp ${NOME} 13.5 101 0.5`);
  await L.espera(1500);
  await andarAte(30);
  L.verificar(dimensao() === 'minecraft:sobrevivencia', 'voltou ao SMP pelo portal');
  L.verificar(bot.entity.position.distanceTo(new Vec3(20.5, 88, 10.5)) < 3, 'voltou exatamente onde parou (' + bot.entity.position + ')');
  L.verificar(bot.inventory.items().some((i) => i.name === 'diamond'), 'os diamantes continuam no survival');

  // Portal dourado -> Rankup
  bot.chat('/lobby');
  await L.espera(3000);
  L.rcon(`execute in minecraft:lobby run minecraft:tp ${NOME} -13.5 101 0.5`);
  await L.espera(1500);
  await andarAte(-30);
  L.verificar(dimensao() === 'minecraft:overworld', 'portal dourado levou ao Rankup (' + dimensao() + ')');
  await L.espera(1500);
  L.verificar(bot.inventory.items().some((i) => i.name.includes('pickaxe')), 'ganhou a picareta do Rankup ao chegar lá');

  // Sai e entra: volta ao lobby
  bot.quit();
  await L.espera(4000);
  const bot2 = await L.criarBot(NOME);
  await L.espera(3000);
  L.verificar(dimensao() === 'minecraft:lobby', 'ao entrar de novo aparece no lobby');
  bot2.quit();
  const falhas = L.resumo();
  await L.espera(1000);
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.log('ERRO NO TESTE: ' + (e && e.stack || e));
  process.exit(2);
});
