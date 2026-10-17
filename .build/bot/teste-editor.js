// Teste da fase 8 do NpcVivos: /npcv editar (menu de edição da staff). Usa um NPC criado só para o teste.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotEditor1';
const ID = 'teste_editor';
const arquivo = () => path.join(PASTA, 'npcs', ID + '.yml');
const yml = () => (fs.existsSync(arquivo()) ? fs.readFileSync(arquivo(), 'utf8') : '');
const json = (it) => (it ? JSON.stringify(it.components || []) : '');

(async () => {
  for (let i = 0; i < 60 && !fs.existsSync(path.join(PASTA, 'npcs', 'ferreiro_borin.yml')); i++) await L.espera(2000);
  const bot = await L.criarBot(NOME);
  for (const perm of ['editar', 'criar', 'remover', 'loja']) {
    L.rcon('lp user ' + NOME + ' permission set npcvivos.admin.' + perm + ' true');
  }
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'clear ' + NOME, 'gamemode survival ' + NOME,
    'minecraft:effect give ' + NOME + ' minecraft:resistance 3600 255 true');
  await L.espera(2500);
  // um lugar afastado da praça, para o NPC de teste não se misturar com os outros
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${NOME} ~30 ~ ~30`);
  await L.espera(1500);
  L.rcon('minecraft:give ' + NOME + ' minecraft:iron_ingot 16');
  await L.espera(600);

  let p = L.esperarMsg(bot, 'criado');
  bot.chat('/npcv criar comerciante ' + ID + ' <yellow>Teste do Editor');
  L.verificar(await p, '/npcv criar cria o NPC de teste');
  await L.espera(800);

  const abrirEditor = async (cmd) => {
    const j = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
    bot.chat(cmd);
    return j;
  };
  let w = await abrirEditor('/npcv editar');
  L.verificar(w && L.tituloJanela(w).includes('Editar') && L.tituloJanela(w).includes('Teste do Editor'),
    '/npcv editar sem id abre o NPC mais perto: ' + L.tituloJanela(w));
  // procura pelo NOME do botão (a descrição da etiqueta do topo também fala em facção, skin...)
  const nomeDe = (it) => JSON.stringify(((it && it.components) || []).find((c) => c.type === 'custom_name') || '');
  const achar = (janela, trecho) => (janela ? janela.slots.findIndex((s, i) => i < 54 && s && nomeDe(s).includes(trecho)) : -1);

  // Liga o papel Guia
  let slot = achar(w, 'Guia');
  w = slot >= 0 ? await L.clicarEsperarJanela(bot, slot) : null;
  await L.espera(400);
  L.verificar(/- GUIA/.test(yml()), 'clicar em "Guia" dá o papel (salvo no arquivo)');
  // Facção: próxima
  slot = achar(w, 'Facção');
  w = slot >= 0 ? await L.clicarEsperarJanela(bot, slot) : null;
  await L.espera(400);
  const faccao = (yml().match(/^faccao: (\S+)/m) || [])[1];
  L.verificar(!!faccao, 'clicar em "Facção" escolhe uma facção: ' + faccao);
  // Skin: próxima
  const skinAntes = (yml().match(/^skin: (\S+)/m) || [])[1];
  slot = achar(w, 'Skin');
  w = slot >= 0 ? await L.clicarEsperarJanela(bot, slot) : null;
  await L.espera(400);
  const skinDepois = (yml().match(/^skin: (\S+)/m) || [])[1];
  L.verificar(skinDepois && skinDepois !== skinAntes, `clicar em "Skin" troca a skin (${skinAntes} -> ${skinDepois})`);
  // Item na mão: o do jogador (barras de ferro)
  slot = achar(w, 'Item na mão');
  w = slot >= 0 ? await L.clicarEsperarJanela(bot, slot) : null;
  await L.espera(400);
  L.verificar(/mao: IRON_INGOT/.test(yml()), 'clicar em "Item na mão" faz o NPC segurar o item do jogador');

  // Loja: adicionar o item da mão, subir o preço, cortar e retirar
  slot = achar(w, 'o que ele VENDE');
  w = slot >= 0 ? await L.clicarEsperarJanela(bot, slot) : null;
  L.verificar(w && L.tituloJanela(w).includes('vende'), 'submenu da loja (o que ele vende) abre');
  const itensLoja = () => (yml().match(/^  compra:\n([\s\S]*?)^  venda:/m) || [, ''])[1];
  const nItens = () => (itensLoja().match(/^  - item:/gm) || []).length;
  const antes = nItens();
  w = await L.clicarEsperarJanela(bot, 49);
  await L.espera(400);
  L.verificar(nItens() === antes + 1 && /item: IRON_INGOT/.test(itensLoja()), 'adiciona as 16 barras da mão como item da loja');
  const precoDo = (i) => Number((itensLoja().split(/^  - item:/m)[i + 1] || '').match(/preco_base: ([\d.]+)/)?.[1]);
  const ultimo = nItens() - 1;
  L.verificar(precoDo(ultimo) === 160, 'começa com $10 por unidade: $160 (' + precoDo(ultimo) + ')');
  w = await L.clicarEsperarJanela(bot, ultimo, 0, 0);
  await L.espera(400);
  L.verificar(precoDo(ultimo) === 176, 'clique esquerdo: +10% ($176) (' + precoDo(ultimo) + ')');
  w = await L.clicarEsperarJanela(bot, ultimo, 1, 0);
  await L.espera(400);
  L.verificar(precoDo(ultimo) === 160, 'clique direito: -10% (volta a $160) (' + precoDo(ultimo) + ')');
  w = await L.clicarEsperarJanela(bot, ultimo, 0, 4); // Q (soltar) = dobrar
  await L.espera(400);
  L.verificar(precoDo(ultimo) === 320, 'Q: dobra o preço ($320) (' + precoDo(ultimo) + ')');
  w = await L.clicarEsperarJanela(bot, ultimo, 1, 1); // shift + direito = retirar
  await L.espera(400);
  L.verificar(nItens() === antes, 'shift + direito retira o item da loja');
  w = await L.clicarEsperarJanela(bot, 45); // voltar
  L.verificar(w && L.tituloJanela(w).includes('Editar'), '"Voltar" volta para o menu principal');

  // Remover com confirmação
  slot = achar(w, 'Remover NPC');
  w = slot >= 0 ? await L.clicarEsperarJanela(bot, slot) : null;
  L.verificar(w && L.tituloJanela(w).includes('Remover'), 'remover pede confirmação');
  w = await L.clicarEsperarJanela(bot, 11); // não
  L.verificar(w && L.tituloJanela(w).includes('Editar') && fs.existsSync(arquivo()), '"Não" volta sem apagar');
  slot = achar(w, 'Remover NPC');
  await L.clicarEsperarJanela(bot, slot);
  p = L.esperarMsg(bot, 'removido');
  await bot.clickWindow(15, 0, 0);
  L.verificar(await p, '"Sim" remove o NPC');
  await L.espera(600);
  L.verificar(!fs.existsSync(arquivo()), 'o arquivo do NPC foi apagado');

  // Sem permissão de editar: o comando não abre
  L.rcon('lp user ' + NOME + ' permission unset npcvivos.admin.editar');
  await L.espera(1500);
  w = await abrirEditor('/npcv editar ferreiro_borin');
  L.verificar(!w, 'sem npcvivos.admin.editar o menu não abre');

  bot.quit();
  await L.espera(1000);
  process.exit(L.resumo());
})().catch((e) => { console.error(e); process.exit(2); });
