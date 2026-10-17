// Por que o mercenário não revida quando alguém bate no dono?
// Testa o /damage com e sem a resistência do dono.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PASTA = path.join(__dirname, '..', '..', '.teste', 'plugins', 'NpcVivos');
const A = 'BotDono';
const B = 'BotBriga';
const DARGO = 'mercenario_dargo';

function localNpc(id) {
  const t = fs.readFileSync(path.join(PASTA, 'npcs', id + '.yml'), 'utf8');
  const num = (k) => Number((t.match(new RegExp('\\n  ' + k + ': ([-\\d.]+)')) || [0, 0])[1]);
  return { x: num('x'), y: num('y'), z: num('z') };
}
const alvo = () => (L.limpar(L.rcon('npcv combate ' + DARGO)).match(/Alvo: (\S+)/) || [0, '?'])[1];
const dono = () => (L.limpar(L.rcon('npcv combate ' + DARGO)).match(/dono: (\S+)/) || [0, '?'])[1];

(async () => {
  const bot = await L.criarBot(A);
  const bot2 = await L.criarBot(B);
  L.rcon('npcv combate ' + DARGO + ' curar');
  L.rcon('mv tp ' + A + ' sobrevivencia', 'mv tp ' + B + ' sobrevivencia',
    'gamemode survival ' + A, 'gamemode survival ' + B, 'eco set ' + A + ' 200000',
    'minecraft:execute in minecraft:sobrevivencia run gamerule pvp true',
    'npcv reputacao ' + A + ' vila_aurora 0', 'npcv reputacao ' + B + ' vila_aurora 0');
  await L.espera(2500);

  const d = localNpc(DARGO);
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run tp ${A} ${d.x - 1.5} ${d.y} ${d.z}`);
  await L.espera(2000);
  const mq = bot.nearestEntity((e) => e.name === 'mannequin'
    && L.limpar(JSON.stringify(e.metadata[2] || '')).includes('Dargo'));
  if (!mq) { console.log('NAO ACHEI O DARGO'); process.exit(1); }
  await bot.lookAt(mq.position.offset(0, 1.6, 0));
  await bot.activateEntityAt(mq, mq.position.offset(0, 1, 0));
  await L.espera(1500);
  const o = bot.opcoes.find((x) => x.texto.includes('Contratar'));
  if (!o) { console.log('SEM OPCAO DE CONTRATAR: ' + JSON.stringify(bot.opcoes.map((x) => x.texto))); process.exit(1); }
  bot.chat(o.cmd);
  await L.espera(2000);
  console.log('dono do mercenario =', dono());

  // Leva os dois para longe da vila
  const x = Math.round(d.x) + 60;
  L.rcon(`minecraft:execute in minecraft:sobrevivencia run fill ${x - 4} 199 ${Math.round(d.z) - 4} ${x + 4} 199 ${Math.round(d.z) + 4} minecraft:stone`,
    `minecraft:execute in minecraft:sobrevivencia run tp ${A} ${x} 200 ${Math.round(d.z)}`,
    `minecraft:execute in minecraft:sobrevivencia run tp ${B} ${x + 1.5} 200 ${Math.round(d.z)}`);
  await L.espera(3000);

  const tentar = async (titulo) => {
    L.rcon('npcv combate ' + DARGO + ' curar');
    await L.espera(300);
    const saida = L.rcon(`minecraft:damage ${A} 1 minecraft:player_attack by ${B}`);
    await L.espera(1500);
    console.log(titulo, '| rcon:', L.limpar(saida).trim(), '| alvo:', alvo());
  };

  L.rcon(`minecraft:effect give ${A} minecraft:resistance 3600 255 true`);
  await L.espera(600);
  await tentar('COM resistencia 255 ');

  L.rcon(`minecraft:effect clear ${A} minecraft:resistance`);
  await L.espera(600);
  await tentar('SEM resistencia    ');

  // E com um golpe de verdade do bot2
  L.rcon('npcv combate ' + DARGO + ' curar');
  await L.espera(300);
  const eu = bot2.players[A] && bot2.players[A].entity;
  if (eu) {
    await bot2.lookAt(eu.position.offset(0, 1.5, 0), true);
    await L.espera(600);
    bot2.attack(eu);
  }
  await L.espera(1500);
  console.log('golpe de verdade do bot2 | achou o jogador:', !!eu, '| alvo:', alvo());

  bot.quit();
  bot2.quit();
  await L.espera(800);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
