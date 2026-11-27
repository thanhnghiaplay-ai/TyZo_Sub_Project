/**
 * Giả lập Vercel cho RE5-004 / RE6-003: «npx vercel» giả (CLI) + máy chủ HTTP giả (REST API, tên miền production).
 * Chạy đúng chay_vercel_sh / buoc_vercel / id_vercel / ghi_chuyen / chuyen_dang_do trong deploy/vps/tyzo.sh.
 * Lỗi được chèn qua danh sách FAKE_FAULT. Không gọi Vercel thật, không dùng thông tin xác thực thật.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
export const text = readFileSync(join(root, "deploy/vps/tyzo.sh"), "utf8");
export const lib = text.slice(0, text.lastIndexOf('main "$@"; exit $?'));
export const cliVersion = /VERCEL_CLI_VERSION="([^"]+)"/.exec(text)[1];
export const SECRETS = ["postgres://neon/new", "new-secret", "tok-secret-123"];
export const SHA = "a".repeat(40);

const fakeNpx = `#!/usr/bin/env bash
F="$FAKE_DIR"; echo "$*" >> "$F/calls.log"
fault() { [[ ",\${FAKE_FAULT:-}," == *",$1,"* ]]; }
args=("$@"); i=0; while [[ "\${args[$i]}" != vercel@* ]]; do i=$((i+1)); done
[ "\${args[$i]}" = "vercel@$EXPECT_VERSION" ] || { echo "sai phiên bản \${args[$i]}" >&2; exit 9; }
rest=("\${args[@]:$((i+1))}")
sub=""; for a in "\${rest[@]}"; do case "$a" in link|env|deploy|inspect|domains) sub="$a"; break ;; esac; done
case "$sub" in
  link) fault link-noid || { mkdir -p .vercel; echo '{"projectId":"prj_1","orgId":"team_1"}' > .vercel/project.json; }; exit 0 ;;
  env)
    act=""; k=""; force=0; take=0
    for a in "\${rest[@]}"; do
      if [ "$take" = 1 ]; then k="$a"; take=0; continue; fi
      case "$a" in add|rm) act="$a"; take=1 ;; --force) force=1 ;; esac
    done
    if [ "$act" = rm ]; then rm -f "$F/env/$k"; exit 0; fi
    val="$(cat)"
    if fault "add-hang-$k"; then sleep 30; fi
    if fault "add-fail-$k"; then exit 1; fi
    if fault "env-drop-$k"; then exit 0; fi
    if [ -f "$F/env/$k" ] && [ "$force" != 1 ]; then echo "exists" >&2; exit 1; fi
    printf '%s' "$val" > "$F/env/$k"; exit 0 ;;
  deploy)
    run=""; sha=""; nx=0
    for a in "\${rest[@]}"; do
      if [ "$nx" = 1 ]; then case "$a" in tyzo_run=*) run="\${a#tyzo_run=}" ;; tyzo_sha=*) sha="\${a#tyzo_sha=}" ;; esac; nx=0; continue; fi
      [ "$a" = --meta ] && nx=1
    done
    cp -r "$F/env" "$F/deployed-env"
    printf '{"id":"dpl_1","url":"tyzo-abc.vercel.app","run":"%s","sha":"%s"}' "$run" "$sha" > "$F/deploy.json"
    if fault deploy-lost; then exit 1; fi
    if fault deploy-hang; then sleep 30; fi
    echo "Building..."; echo "https://tyzo-abc.vercel.app"; exit 0 ;;
  inspect) echo "status ● Not Ready"; exit 0 ;;
  domains) exit 0 ;;
esac
exit 2
`;

function startApi(work, faults) {
  const has = (f) => faults.includes(f);
  let polls = 0;
  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    const site = /^\/site\/([^/]+)\/$/.exec(u.pathname);
    if (site) { res.writeHead(has("site-down") ? 503 : 200); return res.end("ok"); }
    if (has("api-down") || (has("api-down-after-deploy") && existsSync(join(work, "deploy.json")))) return send(500, { error: "down" });
    if (req.headers.authorization !== "Bearer tok-secret-123" || u.searchParams.get("teamId") !== "team_1") return send(403, { error: "forbidden" });
    const dep = existsSync(join(work, "deploy.json")) ? JSON.parse(readFileSync(join(work, "deploy.json"), "utf8")) : null;
    const view = () => {
      polls++;
      const state = has("not-ready") ? "BUILDING" : has("error") ? "ERROR" : polls < 2 ? "BUILDING" : "READY";
      return {
        id: dep.id, url: has("wrong-url") ? "other.vercel.app" : dep.url,
        projectId: has("wrong-project") ? "prj_other" : "prj_1", target: has("wrong-target") ? null : "production",
        meta: { tyzo_run: dep.run, tyzo_sha: has("wrong-sha") ? "b".repeat(40) : dep.sha },
        readyState: state, aliasAssigned: state === "READY", alias: ["tyzo-sub.vercel.app"],
      };
    };
    let m;
    if ((m = /^\/v10\/projects\/prj_1\/env$/.exec(u.pathname))) {
      const envs = [];
      for (const k of readdirSync(join(work, "env"))) {
        const v = readFileSync(join(work, "env", k), "utf8");
        const sensitive = has(`sensitive-${k}`);
        envs.push({ id: `env_${k}`, key: k, target: ["production"], type: sensitive ? "sensitive" : "encrypted", ...(sensitive ? {} : { value: v, decrypted: true }) });
        if (has(`dup-${k}`)) envs.push({ id: `env_${k}_2`, key: k, target: ["production", "preview"], type: "encrypted", value: v, decrypted: true });
      }
      return send(200, { envs });
    }
    if ((m = /^\/v13\/deployments\/([^/]+)$/.exec(u.pathname))) return dep && decodeURIComponent(m[1]) === dep.url ? send(200, view()) : send(404, { error: "not_found" });
    if (u.pathname === "/v6/deployments") return send(200, { deployments: dep ? [{ uid: dep.id, url: dep.url, readyState: has("not-ready") ? "BUILDING" : "READY", meta: { tyzo_run: dep.run } }] : [] });
    if ((m = /^\/v4\/aliases\/([^/]+)$/.exec(u.pathname))) return send(200, { alias: m[1], deploymentId: has("alias-other") ? "dpl_old" : dep && dep.id });
    send(404, { error: "no route" });
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

export async function run(fault = "", { journal = "", env: extraEnv = {} } = {}) {
  const faults = fault.split(",").filter(Boolean);
  const work = mkdtempSync(join(tmpdir(), "re6-003-"));
  mkdirSync(join(work, "bin")); mkdirSync(join(work, "env"));
  writeFileSync(join(work, "bin", "npx"), fakeNpx); chmodSync(join(work, "bin", "npx"), 0o755);
  for (const k of ["DATABASE_URL", "BETTER_AUTH_SECRET", "LIVE_BRIDGE_URL"]) writeFileSync(join(work, "env", k), `old-${k}`);
  writeFileSync(join(work, "vars"), "DATABASE_URL=postgres://neon/new\nBETTER_AUTH_SECRET=new-secret\nLIVE_BRIDGE_URL=wss://x/live\n");
  if (journal) writeFileSync(join(work, "tyzo.conf.chuyen"), journal);
  writeFileSync(join(work, "lib.sh"), lib);
  const server = await startApi(work, faults);
  const port = server.address().port;
  const script = `source "${work}/lib.sh"
CONF="${work}/tyzo.conf"
chay_vercel_sh > "${work}/chay.sh"
ghi_chuyen vercel-bat-dau tyzo-sub
cd "${work}"
VERCEL_CLI_VERSION="$VERCEL_CLI_VERSION" ENVF="${work}/vars" TOK=tok-secret-123 PROJ=tyzo-sub SCOPE= DOM= SHA=${SHA} bash "${work}/chay.sh" > "${work}/ra.txt" 2>&1
kq=$?
b="$(buoc_vercel "${work}/ra.txt")"; dep="$(id_vercel "${work}/ra.txt")"
ghi_chuyen "$([ "$kq" = 0 ] && [ "$b" = xong ] && echo xong || echo "loi-$b")" "tyzo-sub $dep ${SHA}"
echo "kq=$kq buoc=$b dep=$dep"
if chuyen_dang_do; then echo dang-do; else echo da-ket-thuc; fi`;
  const t0 = Date.now();
  const r = await new Promise((resolve) => execFile("bash", ["-c", script], {
    encoding: "utf8", timeout: 60_000,
    env: {
      PATH: `${work}/bin:${process.env.PATH}`, HOME: work, TMPDIR: work, FAKE_DIR: work, FAKE_FAULT: fault, EXPECT_VERSION: cliVersion,
      VERCEL_CLI_VERSION: cliVersion, VERCEL_API: `http://127.0.0.1:${port}`, PROBE_BASE: `http://127.0.0.1:${port}/site/`,
      T_CLI: "2", T_DEPLOY: "2", T_READY: "2", T_POLL: "0.1", ...extraEnv,
    },
  }, (error, stdout, stderr) => resolve({ error, stdout, stderr })));
  server.close();
  const ms = Date.now() - t0;
  const read = (f) => (existsSync(join(work, f)) ? readFileSync(join(work, f), "utf8") : "");
  return { r, ms, work, out: read("ra.txt"), env: (k) => read(join("env", k)), calls: read("calls.log"), journal: read("tyzo.conf.chuyen") };
}
