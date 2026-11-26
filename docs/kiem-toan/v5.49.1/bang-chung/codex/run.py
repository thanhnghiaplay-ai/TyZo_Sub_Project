import argparse,os,subprocess,json,time,signal,pathlib
p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('command',nargs=argparse.REMAINDER);a=p.parse_args()
root=pathlib.Path('/workspace/TyZo-ccr-9f1afcc8-iv7067');out=pathlib.Path(__file__).parent
env={k:os.environ[k] for k in ['PATH','LANG','TMPDIR'] if k in os.environ};env.update(HOME='/workspace/tyzo-tooling-runtime/home',CI='1')
if os.environ.get('TYZO_LOCAL_PG_TEST')=='1':env['TYZO_TEST_PG_URL']='postgresql://tyzo_test@127.0.0.1:55439/tyzo_test'
start=time.monotonic()
with (out/(a.name+'.log')).open('w') as f:
 proc=subprocess.Popen(a.command,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
 try:code=proc.wait(timeout=600)
 except subprocess.TimeoutExpired:
  os.killpg(proc.pid,signal.SIGTERM);code=124
(out/(a.name+'.json')).write_text(json.dumps({'command':a.command,'exit_code':code,'elapsed_seconds':round(time.monotonic()-start,2),'credentials_filtered':True,'uses_local_pg_fixture':env.get('TYZO_TEST_PG_URL') is not None},indent=2))
print(a.name,code)
raise SystemExit(code)
