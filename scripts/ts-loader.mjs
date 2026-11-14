// Bộ nạp cho Node thuần: hiểu `@/...` và import không ghi đuôi .ts, để cầu nối dùng lại đúng code của máy chủ chính.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../src/", import.meta.url);

function asFile(url) {
  for (const suffix of ["", ".ts", ".tsx", "/index.ts"]) {
    const candidate = new URL(url.href + suffix);
    const path = fileURLToPath(candidate);
    if (existsSync(path) && statSync(path).isFile()) return candidate.href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const hit = asFile(new URL(specifier.slice(2), SRC));
    if (hit) return next(hit, context);
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:") && !/\.[a-z]+$/i.test(specifier)) {
    const hit = asFile(new URL(specifier, context.parentURL));
    if (hit) return next(hit, context);
  }
  return next(specifier, context);
}
