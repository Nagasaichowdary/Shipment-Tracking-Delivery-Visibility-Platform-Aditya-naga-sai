#!/usr/bin/env sh
MVN_CMD="mvn"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$MVN_CMD" -f "$SCRIPT_DIR/pom.xml" "$@"
