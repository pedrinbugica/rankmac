// Teste do NpcVivos (fases 1 e 2): fala com memória, guia com dicas, loja com estoque, venda com limite,
// conserto do ferreiro, NPC invulnerável, comandos /npcv e log de transações.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

function saldo(nome) {
  const m = L.rcon('balance ' + nome).match(/\$([\d.,]+)/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}
const npcPerto = (bot, nome) => bot.nearestEntity((e) => e.name === 'mannequin' && JSON.stringify(e.metadata || '').includes(nome));
const qualquerNpc = (bot) => bot.nearestEntity((e) => e.name === 'mannequin');
async function clicarNpc(bot, ent) {
  await bot.lookAt(ent.position.offset(0, 1.6, 0));
  await bot.activateEntityAt(ent, ent.position.offset(0, 1, 0));
}
const conta = (bot, nome) => bot.inventory.items().filter((i) => i.name === nome).reduce((s, i) => s + i.count, 0);

(async () => {
  const bot = await L.criarBot('BotFeira5');
  L.rcon('npcv mercado desligar'); // esta suíte confere preços exatos das fases 1-2 (sem o preço dinâmico da fase 7)
  L.rcon('lp user BotFeira5 parent set dono');
  await L.espera(1500);
  L.rcon('rankupadmin setrank BotFeira5 mendigo', 'mv tp BotFeira5 world');
  await L.espera(2000);
  L.rcon('tp BotFeira5 1.5 101 8.5');
  await L.espera(2500);

  // ---------- Guia no spawn do Rankup ----------
  const tipos = [...new Set(Object.values(bot.entities).map((e) => e.name))];
  console.log('  entidades vistas: ' + tipos.join(', '));
  let guia = qualquerNpc(bot);
  L.verificar(!!guia, 'o bot vê o NPC guia (manequim) no spawn');
  if (guia) {
    L.rcon('tp BotFeira5 7.5 101 9.5');
    await L.espera(1500);
    const yawA = qualquerNpc(bot).headYaw ?? qualquerNpc(bot).yaw;
    L.rcon('tp BotFeira5 0.5 101 10.5');
    await L.espera(1500);
    guia = qualquerNpc(bot);
    const yawB = guia.headYaw ?? guia.yaw;
    L.verificar(Math.abs(yawA - yawB) > 0.3, `o guia vira a cabeça para o jogador (${yawA.toFixed(2)} -> ${yawB.toFixed(2)} rad)`);
    let p = L.esperarMsg(bot, 'Eu sou o Lucas');
    await clicarNpc(bot, guia);
    L.verificar(await p, 'primeira conversa: o guia se apresenta');
    await L.espera(1000);
    p = L.esperarMsg(bot, '/minas');
    await clicarNpc(bot, guia);
    L.verificar(await p, 'segundo clique: primeira dica');
    await L.espera(1000);
    p = L.esperarMsg(bot, '/vender');
    await clicarNpc(bot, guia);
    L.verificar(await p, 'terceiro clique: próxima dica (memória da conversa)');
  }

  // ---------- Borin na Sobrevivência ----------
  L.rcon('mv tp BotFeira5 sobrevivencia');
  await L.espera(1500);
  const tb = fs.readFileSync(path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos', 'npcs', 'ferreiro_borin.yml'), 'utf8');
  const nb = (k) => Number((tb.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  L.rcon('tp BotFeira5 ' + (nb('x') - 1.5) + ' ' + nb('y') + ' ' + nb('z'), 'minecraft:effect give BotFeira5 minecraft:resistance 600 255 true');
  await L.espera(3000);
  L.rcon('eco set BotFeira5 1000', 'clear BotFeira5');
  await L.espera(800);
  let borin = qualquerNpc(bot);
  // pega o mais perto do Borin (x=20.5)
  borin = bot.nearestEntity((e) => e.name === 'mannequin');
  L.verificar(!!borin, 'o bot vê o Borin na praça da Sobrevivência');
  const saud = L.esperarMsg(bot, 'forja');
  const janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  await clicarNpc(bot, borin);
  L.verificar(await saud, 'Borin se apresenta');
  L.verificar(await L.clicarOpcao(bot, 'mercadorias'), 'opção "Quero ver suas mercadorias" na conversa');
  let w = await janela;
  L.verificar(w && L.tituloJanela(w).includes('Comprar'), 'clique abre a loja do Borin: ' + L.tituloJanela(w));

  // Comprar 1 espada
  let p = L.esperarMsg(bot, 'Você comprou');
  await bot.clickWindow(10, 0, 0);
  L.verificar(await p, 'comprar espada de ferro');
  await L.espera(800);
  L.verificar(conta(bot, 'iron_sword') === 1 && saldo('BotFeira5') === 930, 'espada no inventário e $70 descontados (' + saldo('BotFeira5') + ')');
  L.rcon('save-all');

  // Vender ferro (aba Vender)
  L.rcon('give BotFeira5 iron_ingot 32');
  await L.espera(800);
  w = await L.clicarEsperarJanela(bot, 46);
  L.verificar(w && L.tituloJanela(w).includes('Vender'), 'aba Vender abre');
  p = L.esperarMsg(bot, 'Você vendeu');
  await bot.clickWindow(10, 0, 0);
  L.verificar(await p, 'vender 16 barras de ferro');
  await L.espera(800);
  L.verificar(saldo('BotFeira5') === 978 && conta(bot, 'iron_ingot') === 16, 'recebeu $48 e ficou com 16 barras (' + saldo('BotFeira5') + ')');

  // Limite diário: diamante (16 por dia)
  L.rcon('give BotFeira5 diamond 20');
  await L.espera(800);
  if (!bot.currentWindow) { await clicarNpc(bot, borin); await L.clicarOpcao(bot, 'mercadorias'); await L.espera(1500); await L.clicarEsperarJanela(bot, 46); }
  p = L.esperarMsg(bot, 'Você vendeu');
  await bot.clickWindow(14, 0, 1); // shift: vender tudo
  const vendeu = await p;
  L.verificar(vendeu && vendeu.includes('16x'), 'shift vende só até o limite do dia (16 diamantes): ' + vendeu);
  await L.espera(800);
  p = L.esperarMsg(bot, 'Volte amanhã');
  await bot.clickWindow(14, 0, 0);
  L.verificar(await p, 'depois do limite, o Borin não compra mais hoje');
  await L.espera(500);

  // Conserto
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
  L.rcon('minecraft:give BotFeira5 minecraft:iron_pickaxe[minecraft:damage=100]');
  await L.espera(800);
  const pic = bot.inventory.items().find((i) => i.name === 'iron_pickaxe');
  await bot.equip(pic, 'hand');
  await L.espera(500);
  const j2 = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  await clicarNpc(bot, borin);
  await L.clicarOpcao(bot, 'mercadorias');
  await j2;
  const antes = saldo('BotFeira5');
  p = L.esperarMsg(bot, 'consertou');
  await bot.clickWindow(51, 0, 0);
  L.verificar(await p, 'Borin conserta a picareta');
  await L.espera(800);
  L.verificar(antes - saldo('BotFeira5') === 50, 'conserto custou $50 (100 de dano x 0,5)');
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);

  // NPC não leva dano
  bot.attack(borin);
  await L.espera(800);
  L.verificar(!!bot.entities[borin.id], 'bater no NPC não faz nada');

  // ---------- Comandos /npcv ----------
  L.rcon('give BotFeira5 cooked_beef 4');
  await L.espera(600);
  const carne = bot.inventory.items().find((i) => i.name === 'cooked_beef');
  await bot.equip(carne, 'hand');
  L.verificar(await L.comandoEspera(bot, '/npcv criar comerciante cozinheiro_teste <red>Chef Teste', 'criado'), '/npcv criar');
  L.verificar(await L.comandoEspera(bot, '/npcv loja cozinheiro_teste compra 10 5 2', 'agora vende'), '/npcv loja compra (item da mão)');
  L.verificar(await L.comandoEspera(bot, '/npcv skin cozinheiro_teste zuri', 'atualizado'), '/npcv skin');
  L.verificar(await L.comandoEspera(bot, '/npcv lista', 'cozinheiro_teste'), '/npcv lista mostra o NPC novo');
  L.verificar(await L.comandoEspera(bot, '/npcv reload', 'recarregado'), '/npcv reload');
  const mannequins = L.rcon('minecraft:execute if entity @e[type=minecraft:mannequin,name="Chef Teste"]');
  L.verificar(/passed|Count: 1|Test passed/i.test(mannequins), 'NPC novo aparece no mundo depois do reload: ' + mannequins.split('\n').slice(1).join(' ').trim());
  L.verificar(await L.comandoEspera(bot, '/npcv remover cozinheiro_teste', 'removido'), '/npcv remover');

  // Log
  await L.espera(1500);
  const pasta = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos', 'logs');
  const logs = fs.existsSync(pasta) ? fs.readdirSync(pasta) : [];
  const conteudo = logs.length ? fs.readFileSync(path.join(pasta, logs[0]), 'utf8') : '';
  console.log('  log:\n' + conteudo.trim().split('\n').map((l) => '    ' + l).join('\n'));
  L.verificar(/COMPRA/.test(conteudo) && /VENDA/.test(conteudo) && /CONSERTO/.test(conteudo), 'compras, vendas e conserto registrados no log');

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
