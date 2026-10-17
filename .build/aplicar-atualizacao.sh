#!/bin/bash
# Aplica a v1.2.0 do RankupSupremo num servidor PARADO. Uso: bash .build/aplicar-atualizacao.sh <pasta-do-servidor>
set -e
B="$(cd "$(dirname "$0")" && pwd)"
S="$1"
REC="$B/../ServidorRankup/codigo-fonte/recursos"
[ -f "$S/server.properties" ] || { echo "Pasta inválida: $S"; exit 1; }

# 1) Plugin novo (o nome do arquivo antigo é mantido para não ficar duplicado)
cp "$B/RankupSupremo.jar" "$S/plugins/RankupSupremo-1.0.0.jar"

# 2) Configurações do plugin (as atuais eram iguais às padrão, sem edições do dono)
for f in config mensagens minas ranks vendas loja; do
  cp "$REC/$f.yml" "$S/plugins/RankupSupremo/$f.yml"
done

# 3) /loja agora é a loja do servidor: tira o atalho antigo que abria a ajuda do QuickShop
sed -i '/^  loja:$/{N;/\n  - qs \$1-$/d}' "$S/commands.yml"
sed -i 's/^  # Habilidades (AuraSkills), lojas (QuickShop) e sentar\/deitar (GSit)$/  # Habilidades (AuraSkills) e sentar\/deitar (GSit). Lojas de jogadores: \/qs/' "$S/commands.yml"

# 4) Dinheiro separado entre Rankup e Sobrevivência (Multiverse-Inventories troca o saldo ao mudar de mundo)
sed -i 's/^  active-optional-shares: \[\]$/  active-optional-shares:\n  - economy/' "$S/plugins/Multiverse-Inventories/config.yml"

# 5) Casas do VIP+ (Essentials)
grep -q '^  vipplus:' "$S/plugins/Essentials/config.yml" || sed -i 's/^  vip: 5$/  vip: 5\n  vipplus: 7/' "$S/plugins/Essentials/config.yml"

echo "Atualização aplicada em $S"
