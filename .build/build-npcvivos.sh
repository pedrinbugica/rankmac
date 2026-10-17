#!/bin/bash
# Compila o NpcVivos. Uso: bash .build/build-npcvivos.sh
set -e
cd "$(dirname "$0")"
SRV=../ServidorRankup
CP="$(find $SRV/libraries -name '*.jar' | tr '\n' ';')$SRV/plugins/VaultUnlocked-2.20.3.jar;$SRV/plugins/PlaceholderAPI-2.12.3.jar"
rm -rf classes-npc && mkdir -p classes-npc
{ echo "-cp"; echo "\"$CP\""; find $SRV/codigo-npcvivos/src -name '*.java'; } > argumentos-npc.txt
./jdk/bin/javac -encoding UTF-8 --release 21 -Xlint:all -Xlint:-path -Xlint:-processing -Xlint:-classfile \
  -d classes-npc @argumentos-npc.txt
cp -r $SRV/codigo-npcvivos/recursos/* classes-npc/
rm -f NpcVivos.jar
./jdk/bin/jar --create --file NpcVivos.jar -C classes-npc .
echo "OK: .build/NpcVivos.jar"
