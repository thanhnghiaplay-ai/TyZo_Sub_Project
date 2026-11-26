import os,pathlib,subprocess,tempfile,shutil,json
r=pathlib.Path('/workspace/TyZo-ccr-9f1afcc8-iv7067');out=pathlib.Path(__file__).parent
pg='/workspace/tyzo-pg-test/bin/';base='postgresql://tyzo_test@127.0.0.1:55439/tyzo_test?sslmode=disable'
env={'PATH':os.environ['PATH'],'HOME':'/workspace/tyzo-tooling-runtime/home','LANG':'C.UTF-8'}
results=[]
def sql(q):
 return subprocess.check_output([pg+'psql',base,'-XAt','-v','ON_ERROR_STOP=1','-c',q],env=env,text=True).strip()
def run(root,schema):
 u=base+'&options=-csearch_path%3D'+schema
 p=subprocess.run(['node',str(root/'scripts/migrate.mjs')],cwd=root,env={**env,'DATABASE_URL':u},capture_output=True,text=True)
 return p
with tempfile.TemporaryDirectory(prefix='tyzo-mig-',dir=out) as tmp:
 root=pathlib.Path(tmp);shutil.copytree(r/'scripts',root/'scripts');shutil.copytree(r/'migrations',root/'migrations');(root/'node_modules').symlink_to(r/'node_modules',target_is_directory=True)
 for schema,upgrade in [('drill_fresh_0046',False),('drill_upgrade_0046',True)]:
  sql('create schema '+schema)
  try:
   m=root/'migrations/0046_password_device_revoke.sql';content=m.read_text()
   if upgrade:m.unlink()
   p=run(root,schema);assert p.returncode==0,p.stderr
   if upgrade:
    sql(f'''insert into {schema}."user"(id,name,email,"emailVerified") values('kept','Fixture','kept@example.invalid',true)''')
    m.write_text(content);p=run(root,schema);assert p.returncode==0,p.stderr
    assert sql(f'select count(*) from {schema}."user" where id=\'kept\'')=='1'
   p=run(root,schema);assert p.returncode==0,p.stderr
   assert sql(f"select count(*) from {schema}._migrations where name='0046_password_device_revoke.sql'")=='1'
   results.append({'scenario':'upgrade with retained fixture' if upgrade else 'fresh','status':'PASS','idempotent':True})
   # Faulted migration must roll back DDL and not be recorded.
   bad=root/'migrations/9999_fixture_failure.sql';bad.write_text('create table fixture_rollback(id int); select 1/0;')
   p=run(root,schema);assert p.returncode!=0
   assert sql(f"select count(*) from {schema}._migrations where name='9999_fixture_failure.sql'")=='0'
   assert sql(f"select to_regclass('{schema}.fixture_rollback') is null")=='t'
   bad.unlink();results.append({'scenario':schema+' failed migration rollback','status':'PASS'})
  finally:sql('drop schema '+schema+' cascade')
(out/'migration-drill.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
