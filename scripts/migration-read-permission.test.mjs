import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync,mkdirSync,copyFileSync,symlinkSync,chmodSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("R8-002: unreadable migrations directory fails before any database connection",()=>{
  const root=mkdtempSync(join(tmpdir(),'tyzo-migration-permission-'));
  const repo=fileURLToPath(new URL('..',import.meta.url));
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'migrations'));
  for(const file of ['migrate.mjs','migration-plan.mjs','migration-gate.mjs'])copyFileSync(join(repo,'scripts',file),join(root,'scripts',file));
  symlinkSync(join(repo,'node_modules'),join(root,'node_modules'),'dir');
  try{
    chmodSync(join(root,'migrations'),0);
    const p=spawnSync(process.execPath,[join(root,'scripts/migrate.mjs')],{encoding:'utf8',timeout:3000,
      env:{PATH:process.env.PATH,DATABASE_URL:'postgresql://fixture.invalid/unused',VERCEL_ENV:'development'}});
    assert.notEqual(p.status,0);assert.match(p.stderr,/EACCES|permission denied/i);
    assert.doesNotMatch(p.stdout,/nothing to do|skipping/);
  }finally{chmodSync(join(root,'migrations'),0o700);rmSync(root,{recursive:true,force:true});}
});
