// Diagnóstico do /npcv editar: o que o bot enxerga na janela antes e depois de um clique
const L = require('./lib');
const NOME = 'BotEdDebug1';
const json = (it) => (it ? JSON.stringify(it.components || []) : '');

(async () => {
  const bot = await L.criarBot(NOME);
  for (const perm of ['editar', 'criar', 'remover', 'loja']) {
    L.rcon('lp user ' + NOME + ' permission set npcvivos.admin.' + perm + ' true');
  }
  L.rcon('mv tp ' + NOME + ' sobrevivencia');
  await L.espera(3000);
  const ver = (w, rotulo) => {
    console.log('--- ' + rotulo + ' janela id=' + (w && w.id) + ' atual=' + (bot.currentWindow && bot.currentWindow.id) + ' titulo=' + L.tituloJanela(w));
    if (!w) return;
    for (let i = 0; i < 54; i++) {
      const s = w.slots[i];
      if (s && s.name !== 'gray_stained_glass_pane') console.log('  ' + i + ' ' + s.name + ' ' + L.limpar(json(s)).replace(/[{}"\[\]]|type|value|compound|string|custom_name|text|color|italic|byte|list|extra|lore/g, '').slice(0, 70));
    }
  };
  const j = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  bot.chat('/npcv editar fazendeira_marta');
  let w = await j;
  ver(w, 'aberto');
  const slotGuia = w.slots.findIndex((s, i) => i < 54 && s && json(s).includes('Guia'));
  w = await L.clicarEsperarJanela(bot, slotGuia);
  await L.espera(400);
  ver(w, 'depois do clique (retorno)');
  ver(bot.currentWindow, 'depois do clique (currentWindow)');
  console.log('msgs: ' + bot.msgs.slice(-3).join(' | '));
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
