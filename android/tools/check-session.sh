#!/usr/bin/env bash
# SDK-free regression of actual Session.kt and Api.kt. No provider, customer DB or device credentials.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
libs=${TYZO_ANDROID_TEST_LIBS:?Set TYZO_ANDROID_TEST_LIBS to the test-only JSON/OkHttp/Okio jar directory}
for name in json-20240303.jar okhttp-4.12.0.jar okio-jvm-3.6.0.jar; do
  test -f "$libs/$name" || { echo "Missing test-only jar: $name" >&2; exit 2; }
done
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
classpath="$libs/json-20240303.jar:$libs/okhttp-4.12.0.jar:$libs/okio-jvm-3.6.0.jar"
kotlinc "$root/app/src/main/java/vn/tyzo/sub/Session.kt" "$root"/tools/session-check/*.kt -cp "$classpath" -include-runtime -d "$scratch/session.jar"
java -cp "$scratch/session.jar:$classpath" vn.tyzo.sub.SessionCheckKt
kotlinc "$root/app/src/main/java/vn/tyzo/sub/Api.kt" "$root"/tools/api-check/*.kt -cp "$classpath" -include-runtime -d "$scratch/api.jar"
java -cp "$scratch/api.jar:$classpath" vn.tyzo.sub.ApiCheckKt
