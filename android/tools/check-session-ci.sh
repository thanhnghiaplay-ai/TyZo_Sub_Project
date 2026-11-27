#!/usr/bin/env bash
# Pinned SDK-free JVM checks; no customer database, provider API, or signing key.
set -euo pipefail
scripts_root=$(cd "$(dirname "$0")" && pwd)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
cd "$scratch"
curl --fail --location --silent --show-error --max-time 180 -o kotlin.zip https://github.com/JetBrains/kotlin/releases/download/v2.0.21/kotlin-compiler-2.0.21.zip
curl --fail --location --silent --show-error --max-time 60 -o json-20240303.jar https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar
curl --fail --location --silent --show-error --max-time 60 -o okhttp-4.12.0.jar https://repo.maven.apache.org/maven2/com/squareup/okhttp3/okhttp/4.12.0/okhttp-4.12.0.jar
curl --fail --location --silent --show-error --max-time 60 -o okio-jvm-3.6.0.jar https://repo.maven.apache.org/maven2/com/squareup/okio/okio-jvm/3.6.0/okio-jvm-3.6.0.jar
sha256sum --check --status <<'HASHES'
0352c0a45bd22f80f6b26e485cd04da8047baa5de54865281fb9f89a4a7bcf2a  kotlin.zip
3cf6cd6892e32e2b4c1c39e0f52f5248a2f5b37646fdfbb79a66b46b618414ed  json-20240303.jar
b1050081b14bb7a3a7e55a4d3ef01b5dcfabc453b4573a4fc019767191d5f4e0  okhttp-4.12.0.jar
67543f0736fc422ae927ed0e504b98bc5e269fda0d3500579337cb713da28412  okio-jvm-3.6.0.jar
HASHES
unzip -q kotlin.zip
export PATH="$scratch/kotlinc/bin:$PATH"
export TYZO_ANDROID_TEST_LIBS="$scratch"
bash "$scripts_root/check-session.sh"
