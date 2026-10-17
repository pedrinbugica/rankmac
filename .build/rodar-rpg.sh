#!/bin/bash
# Roda a suíte do RPG numa cópia NOVA do servidor com o mundo real (só com o servidor real DESLIGADO).
# Uso: bash .build/rodar-rpg.sh [suite]   (padrão: teste-rpg)
B="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$B/.." && pwd)"
S="${1:-teste-rpg}"
bash "$B/tools/rcon.sh" stop >/dev/null 2>&1 || true
for i in $(seq 1 40); do
  netstat -ano 2>/dev/null | grep -q ":25566 .*LISTEN" || break
  sleep 2
done
bash "$B/preparar-teste-real.sh" >/dev/null || exit 1
(cd "$RAIZ/.teste" && "$RAIZ/ServidorRankup/java/bin/java.exe" -Xms1G -Xmx3G -Dfile.encoding=UTF-8 \
  -jar paper.jar --nogui > "$B/saida-servidor-teste.txt" 2>&1 &)
for i in $(seq 1 120); do
  grep -q 'Done (' "$B/saida-servidor-teste.txt" 2>/dev/null && break
  sleep 3
done
sleep 20
node "$B/bot/$S.js" > "$B/saida-$S.txt" 2>&1
echo "$S => $(tail -1 "$B/saida-$S.txt")"
