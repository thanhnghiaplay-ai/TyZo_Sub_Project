import subprocess,os,pathlib,json
out=pathlib.Path(__file__).parent;r=pathlib.Path('/workspace/TyZo-ccr-9f1afcc8-iv7067');pg='/workspace/tyzo-pg-test/bin/'
env={'PATH':pg+':'+os.environ['PATH'],'PGHOST':'127.0.0.1','PGPORT':'55439','PGUSER':'agent','HOME':'/workspace/tyzo-tooling-runtime/home'}
def q(db,sql):return subprocess.check_output([pg+'psql','-d',db,'-XAt','-v','ON_ERROR_STOP=1','-c',sql],env=env,text=True,stderr=subprocess.DEVNULL).strip()

for db in q('postgres',"select datname from pg_database where datname in ('tyzo','tyzo_moi','restore_source_fixture','restore_bad_fixture') or datname like 'tyzo_cu_%'").splitlines():
 if db:q('postgres','drop database \"'+db+'\"')
if not q('postgres',"select 1 from pg_roles where rolname='tyzo'"):q('postgres',"create role tyzo login createdb nosuperuser nocreaterole")
for db in ['restore_source_fixture','restore_bad_fixture']:
 q('postgres','create database '+db+' owner tyzo')
q('restore_source_fixture','create table t1(id int primary key); create table con(id int references t1(id)); insert into t1 values(1),(2),(3);insert into con values(1)')
q('restore_bad_fixture','create table t1(id int primary key); create table con(id int references t1(id)); set session_replication_role=replica; insert into con values(99); set session_replication_role=origin')
for db in ['restore_source_fixture','restore_bad_fixture']:
 for i in range(5):q(db,'create table extra_fixture_'+str(i)+'(id int)')
for db,name in [('restore_source_fixture','good'),('restore_bad_fixture','fk')]:
 with (out/(name+'.dump')).open('wb') as f:subprocess.run([pg+'pg_dump','-Fc','-d',db],env=env,stdout=f,check=True)
(out/'cut.dump').write_bytes((out/'good.dump').read_bytes()[:700])
h=(r/'docs/kiem-toan/v5.49.1/bang-chung/re003-harness.sh').read_text();h=h.replace('export PGHOST=127.0.0.1 PGPASSWORD=thu','export PGHOST=127.0.0.1 PGPORT=55439 PGUSER=tyzo');(out/'restore-harness.sh').write_text(h)
results=[]
for name in ['fk','cut','good']:
 q('postgres','create database tyzo owner tyzo');q('tyzo','create table t1(id int);insert into t1 select generate_series(1,7)')
 p=subprocess.run(['bash',str(out/'restore-harness.sh'),str(r/'deploy/vps/tyzo.sh'),'nap_dump',str(out/(name+'.dump'))],env=env,text=True,capture_output=True)
 (out/('restore-'+name+'.log')).write_text(p.stdout+p.stderr)
 count=int(q('tyzo','select count(*) from t1'));assert count==(3 if name=='good' else 7),(name,p.returncode,count,p.stdout)
 assert (p.returncode==0)==(name=='good');results.append({'case':name,'exit_code':p.returncode,'retained_rows':count,'status':'PASS'})
 # Only disposable databases in this standalone local cluster, never tyzo_test.
 dbs=q('postgres',"select datname from pg_database where datname='tyzo' or datname='tyzo_moi' or datname like 'tyzo_cu_%' or datname like 'tyzo_hong_%'")
 for db in dbs.splitlines():q('postgres','drop database "'+db+'"')
for db in ['restore_source_fixture','restore_bad_fixture']:q('postgres','drop database '+db)
q('postgres','drop role tyzo');(out/'restore-drill.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
