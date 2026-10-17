// Diagnóstico do PvP: o bot A enxerga o B? O dano via /damage passa?
const L = require('./lib');

(async () => {
  const a = await L.criarBot('BotPvpA');
  const b = await L.criarBot('BotPvpB');
  await L.comandoEspera(a, '/minas mina_pvp', 'Bem-vindo');
  await L.espera(1500);
  await L.comandoEspera(b, '/minas mina_pvp', 'Bem-vindo');
  await L.espera(3000);
  console.log('A pos', a.entity.position, 'B pos', b.entity.position);
  const alvo = a.nearestEntity((e) => e.type === 'player' && e.username === 'BotPvpB');
  console.log('A vê B?', !!alvo, alvo && alvo.position, 'jogadores vistos por A:', Object.keys(a.players));
  console.log('vida B antes', b.health);
  console.log(L.rcon('damage BotPvpB 3 minecraft:player_attack by BotPvpA'));
  await L.espera(1000);
  console.log('vida B depois do /damage', b.health);
  if (alvo) {
    a.attack(alvo);
    await L.espera(1000);
    console.log('vida B depois do ataque do bot', b.health);
  }
  a.quit(); b.quit();
  await L.espera(1000);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
