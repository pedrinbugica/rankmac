#!/bin/bash
# Compila o SurvivalRPG. Uso: bash .build/build-rpg.sh  (precisa do .build/NpcVivos.jar compilado antes)
set -e
cd "$(dirname "$0")"
SRV=../ServidorRankup
CP="$(find $SRV/libraries -name '*.jar' | tr '\n' ';')$SRV/plugins/VaultUnlocked-2.20.3.jar;$SRV/plugins/PlaceholderAPI-2.12.3.jar;NpcVivos.jar"
rm -rf classes-rpg && mkdir -p classes-rpg
{ echo "-cp"; echo "\"$CP\""; find $SRV/codigo-rpg/src -name '*.java'; } > argumentos-rpg.txt
./jdk/bin/javac -encoding UTF-8 --release 21 -Xlint:all -Xlint:-path -Xlint:-processing -Xlint:-classfile -Xlint:-serial \
  -d classes-rpg @argumentos-rpg.txt
cp -r $SRV/codigo-rpg/recursos/* classes-rpg/
rm -f SurvivalRPG.jar
./jdk/bin/jar --create --file SurvivalRPG.jar -C classes-rpg .
echo "OK: .build/SurvivalRPG.jar"
