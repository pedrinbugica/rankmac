#!/bin/bash
# Envia comandos ao servidor de TESTE (porta RCON 25576)
cd "$(dirname "$0")/.."
./jdk/bin/java -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8 -cp tools/bin Rcon 127.0.0.1 25576 teste-local-rcon-9x7 "$@" 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
