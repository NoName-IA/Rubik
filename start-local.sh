#!/usr/bin/env bash
# Arranca la app móvil (Expo): instala lo que falte y muestra un código QR para abrirla en el
# celular con Expo Go. Ctrl+C la detiene.
#
# Uso:
#   ./start-local.sh            # QR para Expo Go (celular en la misma red Wi-Fi)
#   ./start-local.sh --tunnel   # por túnel, si la Wi-Fi no deja conectar
#   APP_PORT=8082 ./start-local.sh
#
# Funciona en Git Bash (Windows), Linux y macOS. En Windows también se puede abrir con
# doble clic en start-local.cmd.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PORT="${APP_PORT:-8081}"
TUNEL=0

for arg in "$@"; do
  case "$arg" in
    --tunnel) TUNEL=1 ;;
    -h | --help)
      sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg (usa --help)" >&2
      exit 1
      ;;
  esac
done

verde=$'\033[32m'; azul=$'\033[34m'; rojo=$'\033[31m'; gris=$'\033[90m'; fin=$'\033[0m'
paso() { echo "${azul}▶${fin} $*"; }
ok() { echo "${verde}✔${fin} $*"; }
falla() { echo "${rojo}✖ $*${fin}" >&2; exit 1; }

puerto_ocupado() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

command -v node >/dev/null 2>&1 || falla "Se necesita Node.js 22.12 o superior."
node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22||(a===22&&b>=12)?0:1)" ||
  falla "Node.js $(node -v) es muy antiguo; se necesita 22.12 o superior."
puerto_ocupado "$APP_PORT" &&
  falla "El puerto $APP_PORT ya está en uso: probablemente hay otro servidor de Expo abierto en otra ventana. Ciérralo (Ctrl+C) y vuelve a intentar, o define APP_PORT=otro."

cd "$RAIZ/movil"
LIMPIAR=0
if [[ ! -d node_modules || package-lock.json -nt node_modules ]]; then
  paso "Instalando dependencias de la app (solo la primera vez, ~1 minuto)"
  npm ci --no-fund --no-audit --loglevel=error
  touch node_modules
  # Con dependencias nuevas, la caché de Metro puede apuntar a archivos que ya no existen.
  LIMPIAR=1
fi
ok "App lista"

echo
echo "   1. Instala ${verde}Expo Go${fin} en tu Android (Play Store)."
echo "   2. Escanea con Expo Go el código QR que aparece abajo."
echo "      ${gris}El celular y el computador deben estar en la misma red Wi-Fi."
echo "      Si no conecta, cierra con Ctrl+C y usa --tunnel.${fin}"
echo "   ${gris}Ctrl+C para detener${fin}"
echo

args=(--port "$APP_PORT")
[[ $TUNEL -eq 1 ]] && args+=(--tunnel)
[[ $LIMPIAR -eq 1 ]] && args+=(--clear)
exec npx expo start "${args[@]}"
