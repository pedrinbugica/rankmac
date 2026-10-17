// Diagnóstico da fase 5: forja com item no nível máximo, dano recebido com armadura e receita com pedra
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const NOME = 'BotDebug5';
const json = (it) => (it ? JSON.stringify(it.components || []) : '');

(async () => {
  const t = fs.readFileSync(path.join(PASTA, 'npcs', 'ferreiro_borin.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  const borin = { x: num('x'), y: num('y'), z: num('z') };
  const bot = await L.criarBot(NOME);
  L.rcon('lp user ' + NOME + ' permission set npcvivos.admin.upgrade true', 'lp user ' + NOME + ' permission set npcvivos.admin.editar true');
  L.rcon('mv tp ' + NOME + ' sobrevivencia', 'clear ' + NOME, 'eco set ' + NOME + ' 1000', 'minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true');
  await L.espera(2000);
  L.rcon('minecraft:give ' + NOME + ' minecraft:stone_sword');
  await L.espera(800);
  console.log('slot da mão:', bot.quickBarSlot, 'item:', bot.heldItem && bot.heldItem.name);
  console.log(await L.comandoEspera(bot, '/npcv aprimorar 5', 'definido'));
  L.rcon(`tp ${NOME} ${borin.x - 1.5} ${borin.y} ${borin.z}`);
  await L.espera(1500);
  const npc = bot.nearestEntity((e) => e.name === 'mannequin');
  await bot.lookAt(npc.position.offset(0, 1.6, 0));
  await bot.activateEntityAt(npc, npc.position.offset(0, 1, 0));
  await L.espera(1200);
  const janela = new Promise((res) => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000); });
  console.log('clicou:', await L.clicarOpcao(bot, 'Aprimorar uma arma'));
  const w = await janela;
  console.log('janela:', w && L.tituloJanela(w));
  if (w) for (const i of [10, 13, 22]) console.log('slot', i, w.slots[i] && w.slots[i].name, json(w.slots[i]).slice(0, 300));
  console.log('msgs:', bot.msgs.slice(-4).join(' | '));
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);

  // dano com armadura
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run summon minecraft:husk ${borin.x - 4} ${borin.y} ${borin.z - 5} {NoAI:1b,Tags:["atk"],PersistenceRequired:1b}`);
  L.rcon('minecraft:effect clear ' + NOME, 'heal ' + NOME);
  await L.espera(1200);
  console.log('vida antes', bot.health);
  console.log(L.limpar(L.rcon(`minecraft:damage ${NOME} 10 minecraft:mob_attack by @e[type=minecraft:husk,tag=atk,limit=1]`)));
  await L.espera(800);
  console.log('vida depois', bot.health);
  L.rcon('minecraft:effect give ' + NOME + ' minecraft:resistance 900 255 true', 'heal ' + NOME, 'minecraft:kill @e[tag=atk]');

  // receita
  L.rcon('npcv dar ' + NOME + ' comum 1', 'minecraft:give ' + NOME + ' minecraft:iron_ingot 1');
  await L.espera(800);
  const receitas = bot.recipesFor(bot.registry.itemsByName.flint_and_steel.id, null, 1, null);
  console.log('receitas encontradas:', receitas.length);
  if (receitas[0]) {
    try { await bot.craft(receitas[0], 1, null); console.log('craft terminou'); } catch (e) { console.log('craft erro:', e.message); }
  }
  await L.espera(800);
  console.log('inventário:', bot.inventory.items().map((i) => i.name + 'x' + i.count).join(', '));
  bot.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
