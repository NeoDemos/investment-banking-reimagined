#!/usr/bin/env python3
"""Isolated real-server guided briefing/context contracts. Quote/history fixtures
are explicitly synthetic; no inference, provider access or banker value is claimed.
"""
import copy,datetime,json,os,pathlib,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]

def main():
 checks=[]
 with tempfile.TemporaryDirectory(prefix='contextual-workflow-') as tmp:
  cli=pathlib.Path(tmp)/'fake-codex'
  cli.write_text('''#!/usr/bin/env python3
import json,sys
if sys.argv[1:]==['login','status']:print('synthetic signed-in fixture');sys.exit()
s=sys.stdin.read();d=json.loads(s.split('\\n\\n',1)[1])
if d['stage']=='plan':
 k='acquisition' if 'M&A' in d['instruction'] else 'buyback' if 'buyback' in d['instruction'] else 'bond'
 i='PEP' if k=='acquisition' else 'GIS' if k=='buyback' else 'AAPL'
 print(json.dumps(dict(supported=True,message='Prepare an illustrative discussion.',kind=k,issuer=i,target='CPB' if k=='acquisition' else None,question='Which financing or capital structure best meets the stated client objective?',audience='CFO and treasury',meetingDate='2026-10-26',criteria='Funding certainty, economic resilience and clear client trade-offs.',constraints='Illustrative public-data scenario; execution and current issuer spread evidence remain open.',fundingNeed=500 if k=='bond' else None,storyline=[dict(title='Client decision',purpose='Frame the objective and evidence needed.')],coaching=['Use sourced observations and distinguish missing execution evidence.'],scenarioChanges=([dict(optionId='base',paramsJson=json.dumps(dict(amount=500,sharePrice=90,tax=25)),rationale='Explicit synthetic banker price assumption; preserve it despite a market quote.')] if 'EXPLICIT' in d['instruction'] else []),useMarketPrices='EXPLICIT' not in d['instruction'],dataNeeds=[],peerSymbols=['GIS'] if k=='acquisition' else [],questions=[dict(id='objective',question='What should the client meeting achieve?',options=['Assess financing alternatives','Prepare a transaction']),dict(id='positioning',question='How should the bank position the story?',options=['Balanced advice','Structuring and distribution'])])))
else:
 doc=d['existingDocument'];research=d.get('research')
 if research:
  blocks=['research_summary']
  if research['kind']=='bond':
   blocks+=['credit_context']
   if 'rates:USD:history' in research['sources']:blocks+=['rate_history']
  if any(k.startswith('equity:') for k in research['sources']):blocks+=['equity_context']
  for kind in blocks:doc['slides'].insert(-1,dict(id='context-'+kind,title='Evidence and qualifications',layout='full',blocks=[dict(type=kind,text=None,analysisId=None,symbol=None)]))
 print(json.dumps(doc))
''');cli.chmod(0o700)
  with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
  base=f'http://127.0.0.1:{port}';token=''
  env={**os.environ,'PORT':str(port),'BANKING_STUDIO_DATA_DIR':tmp,'BANKING_STUDIO_EXTERNAL_CONNECTIONS':'0','BANKING_STUDIO_LOCAL_AGENT':'1','CODEX_BIN':str(cli),'HTTPS_PROXY':'http://127.0.0.1:1','HTTP_PROXY':'http://127.0.0.1:1','NO_PROXY':'127.0.0.1,localhost'}
  def req(path,body=None,status=200):
   r=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'content-type':'application/json','x-demo-token':token})
   try:x=urllib.request.urlopen(r,timeout=20)
   except urllib.error.HTTPError as e:x=e
   raw=x.read();assert x.status==status,(path,x.status,raw.decode());return json.loads(raw)
  children=[]
  def boot():
   p=subprocess.Popen([str(ROOT/'target/release/banking-studio')],cwd=tmp,env=env,stdout=subprocess.DEVNULL)
   children.append(p)
   for _ in range(500):
    try:return p,req('/api/bootstrap')['token']
    except urllib.error.URLError:time.sleep(.01)
   raise AssertionError('Server startup failed')
  def wait(run):
   for _ in range(600):
    x=req('/api/agent/runs/'+run)
    if x['status']!='running':return x
    time.sleep(.01)
   raise AssertionError('Synthetic orchestration timed out')
  proc,token=boot()
  try:
   # Private temporary fixtures, never a claim of real Cboe observations.
   db=sqlite3.connect(pathlib.Path(tmp)/'studio.sqlite')
   history={'date':'2026-10-22','sourceUrl':'https://example.invalid/synthetic-history','points':[{'date':'2026-07-23','y3':4.,'y5':4.1,'y10':4.2},{'date':'2026-10-22','y3':4.5,'y5':4.6,'y10':4.7}], 'classification':'Synthetic test fixture'}
   fixtures={'rates:USD:history':history}
   for symbol,price in [('AAPL',100.0),('GIS',42.35),('CPB',40.05),('PEP',150.0)]:fixtures['equity:'+symbol]={'symbol':symbol,'price':price,'currency':'USD','date':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'tradeTimestamp':'2026-10-22T15:59:59','providerTimestamp':'2026-10-22 16:15:00','sourceUrl':'https://example.invalid/synthetic-quote','classification':'Synthetic quote fixture; not market evidence'}
   for i,(key,payload) in enumerate(fixtures.items()):db.execute('INSERT INTO public_pool VALUES(?,?,?,?,?,?,?)',(f'synthetic-{i}',key,'synthetic_fixture',json.dumps(payload),f'synthetic-{i}','2026-10-23T00:00:00Z','synthetic_test'))
   db.commit();db.close()
   settings={'modelProfile':'codex_high','sourceIds':['sec','issuer_reports','treasury','credit','equity','sector','bank','bund']};req('/api/director/settings',settings)
   before=req('/api/agent/rooms')['rooms']
   run=req('/api/director/assignments',{'prompt':'Prepare an Apple bond client story with timing and credit evidence.','discoverOnly':True,'useRecommendedSources':True,'refreshPublic':False})['runId'];intake=wait(run)
   assert intake['status']=='completed' and intake['result']['state']=='awaiting_direction'
   assert req('/api/agent/rooms')['rooms']==before and not any(e['type']=='client_materials_generated' for e in intake['events'])
   assert len(intake['result']['questions'])==2 and {'ratings','issuer_spreads','rate_history'}<=set(intake['result']['evidenceNeeds'])
   assert req('/api/director/jobs')['jobs'][0]['result']['state']=='awaiting_direction'
   req('/api/director/assignments',{'prompt':'Continue the pending client briefing.','intakeId':run,'directionAnswers':{'objective':'Assess financing'}},400)
   checks.append('Discovery persists tailored narrative questions and mandatory bond evidence needs without creating a workroom or claiming materials; missing direction is rejected')
   result=wait(req('/api/director/assignments',{'prompt':'Continue this client story after my answers.','intakeId':run,'directionAnswers':{'objective':'Assess financing alternatives','positioning':'Balanced advice and distribution'},'refreshPublic':False})['runId'])
   assert result['status']=='completed',result
   room=req('/api/agent/rooms/'+result['result']['roomId']);research=room['research'];rows={x['id']:x for x in research['requirements']}
   assert room['clientDirection']['positioning']=='Balanced advice and distribution'
   assert 'credit' in room['selectedSourceIds'] and not {'equity','sector','bund'}&set(room['selectedSourceIds'])
   assert rows['issuer_spreads']['status']=='missing' and rows['ratings']['status']=='dated'
   assert len(research['timing'])==3 and abs(research['timing'][0]['changeBps']-50)<1e-9
   assert room['analyses']['base_case']['params']['spread']!=30
   assert any(e['type']=='tool_call' and e['data'].get('tool')=='fetch_market_context' for e in req('/api/agent/runs/'+room['lastRunId'])['events'])
   assert len(json.dumps(room['contextPacket'],separators=(',',':'),ensure_ascii=False))<=24000
   checks.append('Bond context uses actual MCP retrieval, pins dated issue/rating references and benchmark history, computes the timing delta, and never substitutes historical issuance spreads for current spreads')
   frames=[f for p in room['scene']['pages'] for f in p['frames'] if f['kind'] in ['research_summary','credit_context','rate_history']]
   assert len(frames)==3 and all(f['bindings'] and f['citationIds'] for f in frames)
   checks.append('Contextual client frames retain source bindings/citations and explicit current-market gaps')
   saved=[room]
   for text,kind,pricekey,symbol,price in [('Prepare a buyback client presentation for General Mills.','buyback','sharePrice','GIS',42.35),('Prepare an M&A pitch for PepsiCo buying Campbell with valuation drivers.','acquisition','targetPrice','CPB',40.05)]:
    result=wait(req('/api/director/assignments',{'prompt':text,'useRecommendedSources':True,'refreshPublic':False})['runId']);assert result['status']=='completed',result
    room=req('/api/agent/rooms/'+result['result']['roomId']);a=room['analyses']['base_case']
    assert room['mandate']['kind']==kind and 'equity' in room['selectedSourceIds'] and 'credit' not in room['selectedSourceIds']
    assert a['params'][pricekey]==price and a['sourceSnapshot']['marketInputs'][pricekey]['value']==price
    assert any(v['sourceUrl']=='https://example.invalid/synthetic-quote' for v in a['lineage']['eps']['inputs'] if v['label']==pricekey)
    assert any(b['type']=='equity_context' for p in room['draft']['slides'] for b in p['blocks'])
    saved.append(room)
    checks.append(kind+': relevant equity/peer/sector evidence feeds the price-dependent Rust model with observation provenance; issuer-credit sources stay excluded')
   result=wait(req('/api/director/assignments',{'prompt':'EXPLICIT: Prepare a buyback with the explicit existing scenario price retained.','useRecommendedSources':True,'refreshPublic':False})['runId']);assert result['status']=='completed',result
   explicit=req('/api/agent/rooms/'+result['result']['roomId']);explicit_case=explicit['analyses']['base_case'];assert explicit_case['params']['sharePrice']==90 and not explicit_case['sourceSnapshot'].get('marketInputs')
   saved.append(explicit)
   checks.append('An explicit scenario price is preserved despite an available quote; observed market values do not silently replace banker instructions')
   req('/api/director/settings',{'modelProfile':'codex_high','sourceIds':['issuer_reports','equity','treasury']})
   denied=wait(req('/api/director/assignments',{'prompt':'Prepare a buyback for the mapped General Mills client.','useRecommendedSources':True,'refreshPublic':False})['runId'])
   assert denied['result']['state']=='needs_clarification' and not denied['result'].get('roomId')
   req('/api/director/settings',settings)
   checks.append('An issuer-only selection cannot silently substitute deselected SEC financials for an unsupported issuer-report mapping')
   proc.terminate();proc.wait(timeout=5);proc,token=boot()
   assert all(req('/api/agent/rooms/'+r['id'])==r for r in saved)
   checks.append('Guided direction, request-specific context, market-based model inputs and rendered frames survive process restart')
  finally:
   for child in children:
    if child.poll() is None:child.terminate();child.wait(timeout=5)
 print(json.dumps({'checksPassed':len(checks),'checks':checks,'externalCalls':0,'model':'Explicit fake CLI; market data fixtures are synthetic','realInferenceOrBankerValueEstablished':False},indent=2))
if __name__=='__main__':main()
