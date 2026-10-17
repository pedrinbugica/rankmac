#!/bin/bash
# Testa a atualização do NpcVivos sobre uma CÓPIA dos dados reais (o servidor real segue ligado e intocado).
# 1) cópia de teste nova + dados reais do NpcVivos  2) liga e confere o log  3) guerra + invasão + MSPT
# 4) reinicia e confere se a guerra continua.  Uso: bash .build/testar-atualizacao.sh
B="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$B/.." && pwd)"
T="$RAIZ/.teste"
LOG="$B/saida-servidor-teste.txt"
R() { bash "$B/tools/rcon.sh" "$@" | sed 's/\x1b\[[0-9;]*m//g'; }

ligar() {
  (cd "$T" && "$RAIZ/ServidorRankup/java/bin/java.exe" -Xms1G -Xmx2G -Dfile.encoding=UTF-8 -jar paper.jar --nogui > "$LOG" 2>&1 &)
  for i in $(seq 1 120); do grep -q 'Done (' "$LOG" 2>/dev/null && break; sleep 3; done
  # espera o log parar de crescer (configurações agendadas do RankupSupremo)
  antes=0; parado=0
  for i in $(seq 1 60); do
    agora=$(wc -c < "$LOG"); if [ "$agora" = "$antes" ]; then parado=$((parado+1)); [ "$parado" -ge 4 ] && break; else parado=0; fi
    antes=$agora; sleep 2
  done
}
desligar() {
  R stop > /dev/null 2>&1
  for i in $(seq 1 60); do netstat -ano 2>/dev/null | grep -q ":25566 .*LISTEN" || break; sleep 2; done
  sleep 3
}

desligar
bash "$B/preparar-teste.sh" > /dev/null
rm -rf "$T/plugins/NpcVivos"
cp -r "$RAIZ/ServidorRankup/plugins/NpcVivos" "$T/plugins/NpcVivos"
echo "== dados reais copiados: $(ls "$T/plugins/NpcVivos/npcs" | tr '\n' ' ')"
ligar
echo "== log do NpcVivos"
sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -aE "\[NpcVivos\]|NpcVivos.*(WARN|ERROR)|Exception" | grep -v "oshi\|Win32" | head -30
echo "== npcs: $(ls "$T/plugins/NpcVivos/npcs" | tr '\n' ' ')"
echo "== guerra + invasão"
R "npcv guerra iniciar vila_aurora irmandade_do_sul 2" > /dev/null
R "npcv invasao irmandade_do_sul vila_aurora" | tail -1
sleep 20
echo "MSPT durante a invasão:"; R mspt | tail -4
R "npcv invasao" | tail -2
sleep 40
R "npcv guerra lista" | tail -3
echo "== reinício (a guerra precisa continuar)"
desligar
ligar
R "npcv guerra lista" | tail -3
sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -aE "NpcVivos.*(WARN|ERROR)|Exception" | grep -v "oshi\|Win32" | head -10
echo "MSPT parado:"; R mspt | tail -4
desligar
echo "== fim"
