#!/bin/bash
# Compila o RankupSupremo. Uso: bash .build/build.sh
# (caminhos relativos e arquivo de argumentos: o Windows limita o tamanho da linha de comando)
set -e
cd "$(dirname "$0")"
SRV=../ServidorRankup
CP="$(find $SRV/libraries -name '*.jar' | tr '\n' ';')$SRV/plugins/VaultUnlocked-2.20.3.jar;$SRV/plugins/PlaceholderAPI-2.12.3.jar"
rm -rf classes && mkdir -p classes
{ echo "-cp"; echo "\"$CP\""; find $SRV/codigo-fonte/src -name '*.java'; } > argumentos.txt
./jdk/bin/javac -encoding UTF-8 --release 21 -Xlint:all -Xlint:-path -Xlint:-processing -Xlint:-classfile \
  -d classes @argumentos.txt
cp $SRV/codigo-fonte/recursos/*.yml classes/
rm -f RankupSupremo.jar
./jdk/bin/jar --create --file RankupSupremo.jar -C classes .
echo "OK: .build/RankupSupremo.jar"
