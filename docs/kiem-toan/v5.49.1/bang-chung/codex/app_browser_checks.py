from playwright.sync_api import sync_playwright
import pathlib,json,subprocess,time,hashlib,hmac,secrets
out=pathlib.Path(__file__).parent;base='http://127.0.0.1:8081';reports={};screens=pathlib.Path('/workspace/screenshots');screens.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,chromium_sandbox=True)
 c=b.new_context(service_workers='block');errors=[];blocked=[]
 def route(r):
  if r.request.url.startswith(base) or r.request.url.startswith('data:'):r.continue_()
  else:blocked.append(r.request.url.split('?')[0]);r.abort()
 c.route('**/*',route);p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');assert len(p.locator('body').inner_text())>50
 p.screenshot(path=str(screens/'tyzo-5492-desktop.png'),full_page=True);reports['desktop_render']='PASS'
 c2=b.new_context(viewport={'width':390,'height':844},service_workers='block');c2.route('**/*',route);m=c2.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(base,wait_until='networkidle');m.screenshot(path=str(screens/'tyzo-5492-mobile.png'),full_page=True)
 reports['mobile_overflow_px']=m.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)');assert reports['mobile_overflow_px']==0
 # Synthetic test identity only, local database only. Do not record auth responses/cookies.
 res=c.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'name':'Audit Fixture','email':'audit-fixture@example.invalid','password':'Synthetic-local-password-5492!'})
 assert res.status==200, 'fixture signup status '+str(res.status)
 subprocess.run(['/workspace/tyzo-pg-test/bin/psql','postgresql://tyzo_test@127.0.0.1:55439/tyzo_test?sslmode=disable','-XAt','-v','ON_ERROR_STOP=1','-c', '''insert into app_browser_5492.room_staff(user_id,role) select id,'chu' from app_browser_5492."user" where email='audit-fixture@example.invalid' on conflict(user_id) do update set role='chu' ''' ],check=True,stdout=subprocess.DEVNULL)
 p.goto(base+'/admin',wait_until='networkidle');p.wait_for_timeout(1000)
 (out/'admin-initial.txt').write_text(p.locator('body').inner_text())
 p.get_by_role('button',name='Tiền',exact=True).click();p.get_by_role('button',name='Doanh thu',exact=True).click();p.wait_for_timeout(800)
 p.get_by_text('Đang khóa: Reset số liệu thử chỉ bật trên máy chủ thử (TYZO_TEST_RESET=1).',exact=True).wait_for();reset=p.get_by_role('button',name='Reset về sạch',exact=True);assert reset.is_disabled();reset.scroll_into_view_if_needed();reports['admin_reset_disabled']='PASS';reports['built_version']=p.get_by_role('button',name='v5.49.2',exact=True).inner_text()
 p.screenshot(path=str(screens/'tyzo-5492-admin-reset.png'),full_page=True)
 # Deliberately inconsistent, synthetic payout in isolated local schema only.
 subprocess.run(['/workspace/tyzo-pg-test/bin/psql','postgresql://tyzo_test@127.0.0.1:55439/tyzo_test?sslmode=disable','-XAt','-v','ON_ERROR_STOP=1','-c', "insert into app_browser_5492.affiliate_payouts(affiliate_id,amount) select 'fixture-orphan',50000 where not exists(select 1 from app_browser_5492.affiliate_payouts where affiliate_id='fixture-orphan')"],check=True,stdout=subprocess.DEVNULL)
 p.get_by_role('button',name='Cộng tác',exact=True).click();p.get_by_text('Đối soát lệnh rút (cần Admin xem)',exact=True).wait_for();reports['affiliate_reconciliation_warning']='PASS'
 p.screenshot(path=str(screens/'tyzo-5492-affiliate-recon.png'),full_page=True)
 # Actual signed HTTP endpoint, same nonce twice.
 body='{}';sec=str(int(time.time()));nonce=secrets.token_hex(16);key=(out/'local-sweep-fixture.key').read_text()
 message=f'risk-sweep:v2:{sec}:{nonce}:POST:/api/risk-sweep:{hashlib.sha256(body.encode()).hexdigest()}'
 headers={'x-tyzo-time':sec,'x-tyzo-nonce':nonce,'x-tyzo-sign':hmac.new(key.encode(),message.encode(),hashlib.sha256).hexdigest(),'content-type':'application/json'}
 statuses=[c.request.post(base+'/api/risk-sweep',headers=headers,data=body).status for _ in range(2)];reports['risk_sweep_statuses']=statuses;assert statuses==[200,401],statuses
 reports['page_errors']=errors;reports['external_requests_blocked']=sorted(set(blocked));assert not errors
 (out/'app-browser-checks.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False));b.close()
