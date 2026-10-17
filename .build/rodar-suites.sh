#!/bin/bash
# Roda as suítes de bot pedidas, cada uma numa cópia de TESTE nova (o servidor real segue ligado).
# Uso: bash .build/rodar-suites.sh teste-npcs teste-faccoes ...
B="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$B/.." && pwd)"

for s in "$@"; do
  echo "=============== $s"
  bash "$B/tools/rcon.sh" stop >/dev/null 2>&1 || true
  for i in $(seq 1 40); do
    netstat -ano 2>/dev/null | grep -q ":25566 .*LISTEN" || break
    sleep 2
  done
  bash "$B/preparar-teste.sh" >/dev/null
  (cd "$RAIZ/.teste" && "$RAIZ/ServidorRankup/java/bin/java.exe" -Xms1G -Xmx2G -Dfile.encoding=UTF-8 \
    -jar paper.jar --nogui > "$B/saida-servidor-teste.txt" 2>&1 &)
  for i in $(seq 1 120); do
    grep -q 'Done (' "$B/saida-servidor-teste.txt" 2>/dev/null && break
    sleep 3
  done
  # O RankupSupremo só cria os grupos do LuckPerms DEPOIS do "Done (" (comandos agendados).
  # Rodar o bot antes disso faz o "lp user ... parent set dono" não dar permissão nenhuma,
  # e todo /npcv volta como "Unknown or incomplete command". Espera o log parar de crescer.
  parado=0
  antes=0
  for i in $(seq 1 90); do
    agora=$(wc -c < "$B/saida-servidor-teste.txt")
    if [ "$agora" = "$antes" ]; then
      parado=$((parado + 1))
      [ "$parado" -ge 4 ] && break
    else
      parado=0
    fi
    antes=$agora
    sleep 2
  done
  node "$B/bot/$s.js" > "$B/saida-$s.txt" 2>&1
  echo "$s => saida: $(tail -1 "$B/saida-$s.txt")"
done
