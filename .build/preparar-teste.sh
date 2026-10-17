#!/bin/bash
# Cria uma cópia de TESTE do servidor em ../.teste com mundo NOVO (porta 25566, RCON 25576).
# Pode rodar com o servidor real ligado: o mundo, logs, docs e códigos NÃO são copiados,
# e os bancos que ficam travados com o servidor ligado são apagados da cópia.
# Uso: bash .build/preparar-teste.sh   (o servidor de teste precisa estar desligado)
set -e
B="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$B/.." && pwd)"
REAL="$RAIZ/ServidorRankup"
T="$RAIZ/.teste"

if netstat -ano 2>/dev/null | grep -q ":25566 .*LISTEN"; then
  echo "O servidor de teste ainda está ligado (porta 25566). Use: bash .build/tools/rcon.sh stop"
  exit 1
fi

rm -rf "$T"
mkdir "$T"
for i in "$REAL"/*; do
  n=$(basename "$i")
  case "$n" in java|docs|site|codigo-fonte|codigo-npcvivos|logs|world) continue;; esac
  cp -r "$i" "$T/" 2>/dev/null || true
done

cd "$T"
# Dados que só valem para o servidor real (ou que estavam travados)
rm -f plugins/LuckPerms/luckperms-h2-v2.mv.db plugins/QuickShop-Hikari/shops.mv.db \
  plugins/RankupSupremo/estado.yml plugins/RankupSupremo/jogadores.yml plugins/Multiverse-Core/worlds.yml
rm -rf plugins/Multiverse-Inventories/players plugins/Multiverse-Inventories/worlds plugins/Multiverse-Inventories/groups \
  plugins/NpcVivos plugins/update

# Versões novas dos plugins
cp "$B/NpcVivos.jar" plugins/NpcVivos.jar
cp "$B/RankupSupremo.jar" plugins/RankupSupremo-1.0.0.jar

# Porta e RCON só na cópia de teste
sed -i 's/^server-port=25565/server-port=25566/; s/^enable-rcon=false/enable-rcon=true/; s/^rcon.password=$/rcon.password=teste-local-rcon-9x7/; s/^rcon.port=25575/rcon.port=25576/' server.properties
# Vários bots no mesmo IP
sed -i 's/^        maxRegPerIp: [0-9]*/        maxRegPerIp: 50/' plugins/AuthMe/config.yml

grep -E "^(server-port|enable-rcon|rcon\.port)" server.properties
echo "Cópia de teste pronta em $T"
echo "Para ligar: cd $T && ../ServidorRankup/java/bin/java.exe -Xms1G -Xmx2G -Dfile.encoding=UTF-8 -jar paper.jar --nogui"
