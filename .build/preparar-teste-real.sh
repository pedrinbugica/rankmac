#!/bin/bash
# Cria uma cópia de TESTE do servidor em ../.teste COM o mundo de verdade (porta 25566, RCON 25576).
# SÓ use com o servidor real DESLIGADO (o mundo é copiado). Os dados dos plugins também vêm junto.
# Uso: bash .build/preparar-teste-real.sh
set -e
B="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$B/.." && pwd)"
REAL="$RAIZ/ServidorRankup"
T="$RAIZ/.teste"

if netstat -ano 2>/dev/null | grep -q ":25565 .*LISTEN"; then
  echo "O servidor REAL está ligado (porta 25565): não copio o mundo com ele ligado."
  exit 1
fi
if netstat -ano 2>/dev/null | grep -q ":25566 .*LISTEN"; then
  echo "O servidor de teste ainda está ligado (porta 25566). Use: bash .build/tools/rcon.sh stop"
  exit 1
fi

rm -rf "$T"
mkdir "$T"
for i in "$REAL"/*; do
  n=$(basename "$i")
  case "$n" in java|docs|site|codigo-fonte|codigo-npcvivos|codigo-rpg|logs) continue;; esac
  cp -r "$i" "$T/" 2>/dev/null || true
done
rm -f "$T/world/session.lock"

cd "$T"
rm -rf plugins/update
# Versões novas dos plugins
cp "$B/NpcVivos.jar" plugins/NpcVivos.jar
cp "$B/RankupSupremo.jar" plugins/RankupSupremo-1.0.0.jar
cp "$B/SurvivalRPG.jar" plugins/SurvivalRPG.jar

sed -i 's/^server-port=25565/server-port=25566/; s/^enable-rcon=false/enable-rcon=true/; s/^rcon.password=$/rcon.password=teste-local-rcon-9x7/; s/^rcon.port=25575/rcon.port=25576/' server.properties
sed -i 's/^        maxRegPerIp: [0-9]*/        maxRegPerIp: 50/' plugins/AuthMe/config.yml

grep -E "^(server-port|enable-rcon|rcon\.port)" server.properties
echo "Cópia de teste (mundo real) pronta em $T"
