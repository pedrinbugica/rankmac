// Utilidades dos bots de teste (servidor de TESTE na porta 25566)
const mineflayer = require('mineflayer');
const { execFileSync } = require('child_process');
const path = require('path');

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function rcon(...cmds) {
  const out = execFileSync('bash', [path.join(__dirname, '..', 'tools', 'rcon.sh'), ...cmds], { encoding: 'utf8' });
  return out;
}

function limpar(s) {
  return String(s).replace(/§./g, '');
}

// Tenta de novo quando o servidor pede para esperar antes de reconectar
async function criarBot(nome, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      return await criarBotUmaVez(nome);
    } catch (e) {
      const m = /wait (\d+) seconds/.exec(e.message);
      if (!m || i >= tentativas) throw e;
      console.log(`  [${nome}] esperando ${m[1]}s para reconectar...`);
      await espera((Number(m[1]) + 2) * 1000);
    }
  }
}

async function criarBotUmaVez(nome) {
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: 25566, username: nome, version: '1.21.11', auth: 'offline' });
  bot.msgs = [];
  bot.on('physicsTick', () => {
    try { bot._client.write('tick_end', {}); } catch (e) { /* versão sem tick_end */ }
  });
  bot.opcoes = [];
  bot.on('message', (json) => {
    const op = JSON.stringify(json.json || json).match(/\/npcconversa [0-9a-f]+/);
    if (op) bot.opcoes.push({ texto: limpar(json.toString()), cmd: op[0] });
    const t = limpar(json.toString()).trim();
    if (t) { bot.msgs.push(t); console.log(`  [${nome}] ${t}`); }
  });
  bot.on('kicked', (r) => console.log(`  [${nome}] EXPULSO: ${limpar(JSON.stringify(r))}`));
  bot.on('error', (e) => console.log(`  [${nome}] ERRO: ${e.message}`));
  let motivo = '';
  bot.once('kicked', (r) => { motivo = limpar(JSON.stringify(r)); });
  await new Promise((res, rej) => {
    bot.once('spawn', res);
    bot.once('end', () => rej(new Error('desconectou antes do spawn ' + motivo)));
  });
  await espera(1500);
  bot.chat('/register teste123 teste123');
  await espera(1200);
  bot.chat('/login teste123');
  await espera(2500);
  return bot;
}

// Espera uma mensagem que contenha o texto (a partir de agora)
async function esperarMsg(bot, trecho, ms = 6000) {
  const inicio = bot.msgs.length;
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    for (let i = inicio; i < bot.msgs.length; i++) if (bot.msgs[i].includes(trecho)) return bot.msgs[i];
    await espera(100);
  }
  return null;
}

async function comandoEspera(bot, cmd, trecho, ms = 6000) {
  const inicio = bot.msgs.length;
  bot.chat(cmd);
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    for (let i = inicio; i < bot.msgs.length; i++) if (bot.msgs[i].includes(trecho)) return bot.msgs[i];
    await espera(100);
  }
  return null;
}

async function abrirMenu(bot, cmd, ms = 5000) {
  const p = new Promise((res) => {
    const t = setTimeout(() => res(null), ms);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  bot.chat(cmd);
  return p;
}

function tituloJanela(w) {
  if (!w) return null;
  let t = w.title;
  try { t = typeof t === 'string' ? t : JSON.stringify(t); } catch (e) { /* */ }
  return limpar(t);
}

// Clica num slot e espera a próxima janela abrir (ou null)
async function clicarEsperarJanela(bot, slot, botao = 0, modo = 0, ms = 4000) {
  const p = new Promise((res) => {
    const t = setTimeout(() => res(null), ms);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  await bot.clickWindow(slot, botao, modo).catch((e) => console.log('  clique falhou: ' + e.message));
  return p;
}

function nomeItem(item) {
  if (!item) return null;
  const custom = item.customName || (item.components && JSON.stringify(item.components.find?.((c) => c.type === 'custom_name')));
  return limpar(custom || item.name);
}

// Clica numa opção de conversa de NPC (linha do chat com /npcconversa)
async function clicarOpcao(bot, trecho, ms = 5000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    for (let i = bot.opcoes.length - 1; i >= 0; i--) {
      if (bot.opcoes[i].texto.includes(trecho)) {
        const cmd = bot.opcoes[i].cmd;
        bot.opcoes.length = 0;
        bot.chat(cmd);
        return true;
      }
    }
    await espera(100);
  }
  return false;
}

let falhas = 0;
function verificar(cond, desc) {
  console.log(`${cond ? 'OK  ' : 'FALHOU'} - ${desc}`);
  if (!cond) falhas++;
}
function resumo() {
  console.log(falhas === 0 ? '\n=== TODOS OS TESTES PASSARAM ===' : `\n=== ${falhas} TESTE(S) FALHARAM ===`);
  return falhas;
}

module.exports = { clicarOpcao, espera, rcon, criarBot, esperarMsg, comandoEspera, abrirMenu, tituloJanela, clicarEsperarJanela, nomeItem, verificar, resumo, limpar };
