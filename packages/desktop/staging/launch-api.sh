#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="$DIR/node/node"
export MEMORY_STORE=1
export API_SERVER_PORT="${API_SERVER_PORT:-13004}"
export FRONTEND_PORT="${FRONTEND_PORT:-13003}"
export CAT_CAFE_DESKTOP=1
# Listen on both IPv4 and IPv6 (WebKit resolves localhost to ::1)
export API_SERVER_HOST="::"
# Make agent CLIs (claude, codex) findable
export PATH="$HOME/.cat-cafe/cli/bin:$DIR/node:$PATH"
# Native addons in api/node_modules/ — resolved naturally via cd
cd "$DIR/api"
exec "$NODE" "$DIR/api/index.mjs"
