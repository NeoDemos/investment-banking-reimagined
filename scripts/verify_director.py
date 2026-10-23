#!/usr/bin/env python3
"""Isolated orchestration failure/validation tests using an explicit fake CLI.
These are contract tests, NOT proof of actual inference or human productivity.
"""
import copy,json,os,pathlib,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
 checks=[]
 with tempfile.TemporaryDirectory(prefix='director-contract-') as tmp:
  fixture=pathlib.Path(tmp)/'fake-codex';fixture.write_text('''#!/usr/bin/env python3
import json,sys
if '--version' in sys.argv: print('explicit-fake-cli');sys.exit()
s=sys.stdin.read();d=json.loads(s.split('\\n\\n',1)[1])
if d['stage']=='plan':
 p={'supported':'UNSUPPORTED' not in d['instruction'],'message':'Unsupported method requires clarification.','kind':'bond','issuer':'PEP','target':None,'question':'How should PepsiCo raise the required net funding for this public demonstration?','audience':'CFO and treasury','meetingDate':'2026-10-26','criteria':'Net cash sufficiency, maturity fit and downside resilience.','constraints':'Illustrative terms only; current execution remains unconfirmed.','fundingNeed':500,'storyline':[{'title':'Client funding question','purpose':'Compare the choices with public evidence.'}],'scenarioChanges':[]}
 if d.get('current',{}).get('brief'):
  current=d['current']['brief']
  for k in ['kind','issuer','target','question','audience','meetingDate','criteria','constraints','fundingNeed']:p[k]=current.get(k)
 if 'CRITERIA' in d['instruction']:p['criteria']='Prioritize a short refinancing horizon and preserve cash flexibility.'
 if 'TARGET' in d['instruction']:p['target']='GIS'
 print(json.dumps(p))
else:
 dct=d['existingDocument'];dct['slides'][0]['title']='Agent-proposed client funding discussion'
 text='123 fabricated numeric claim' if 'INVALID' in d['instruction'] else 'Proposed synthesis: prioritize funding certainty if the funding need is firm; revisit tenor if flexibility and refinancing capacity outweigh that certainty.'
 dct['slides']=[p for p in dct['slides'] if p['id']!='agent-synthesis']
 dct['slides'].insert(1,{'id':'agent-synthesis','title':'Proposed synthesis for banker challenge','layout':'full','blocks':[{'type':'text','text':text,'analysisId':None,'symbol':None}]})
 print(json.dumps(dct))
''');fixture.chmod(0o700)
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  base=f'http://127.0.0.1:{port}';token=''
  env={**os.environ,'PORT':str(port),'BANKING_STUDIO_DATA_DIR':tmp,'BANKING_STUDIO_EXTERNAL_CONNECTIONS':'0','BANKING_STUDIO_LOCAL_AGENT':'1','CODEX_BIN':str(fixture),'HTTPS_PROXY':'http://127.0.0.1:1','HTTP_PROXY':'http://127.0.0.1:1','NO_PROXY':'127.0.0.1,localhost'}
  def req(path,body=None,status=200):
   r=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'content-type':'application/json','x-demo-token':token})
   try:s=urllib.request.urlopen(r,timeout=20)
   except urllib.error.HTTPError as e:s=e
   raw=s.read();assert s.status==status,(path,s.status,raw.decode());return json.loads(raw)
  def boot():
   p=subprocess.Popen([str(ROOT/'target/release/banking-studio')],cwd=tmp,env=env,stdout=subprocess.DEVNULL)
   for _ in range(400):
    try:return p,req('/api/bootstrap')['token']
    except urllib.error.URLError:time.sleep(.01)
   raise AssertionError('App did not start')
  def assignment(text,**kwargs):
   run=req('/api/director/assignments',dict(prompt=text,refreshPublic=False,**kwargs))['runId']
   for _ in range(300):
    result=req('/api/agent/runs/'+run)
    if result['status']!='running':return result
    time.sleep(.01)
   raise AssertionError('Fake model orchestration did not complete')
  proc,token=boot()
  try:
   pool=req('/api/data-pool');assert len(pool['receipts'])>=6
   req('/api/data-pool/refresh',{'source':'https://example.com/private'},400)
   req('/api/data-pool/reports',{'url':'https://localhost/private.pdf','label':'Unsupported host document'},400)
   job=req('/api/data-pool/reports',{'url':'https://www.rabobank.com/public-annual-report.pdf','label':'Explicit synthetic public document intake fixture'});assert job['state']=='registered_for_extraction';assert req('/api/data-pool')['receipts']==pool['receipts']
   checks.append('Only fixed public connectors can fetch; report registration is explicit pending extraction and cannot silently promote source facts')
   result=assignment('UNSUPPORTED: make a fully underwritten public-company LBO for this test')
   assert result['status']=='completed' and result['result']['state']=='needs_clarification' and not result['result'].get('roomId')
   checks.append('Unsupported model plan asks for clarification without claiming a model or materials')
   result=assignment('Prepare an illustrative PepsiCo USD500m net bond client story with peers and the Rabobank proposition.')
   assert result['status']=='completed',result
   rid=result['result']['roomId'];r=req('/api/agent/rooms/'+rid);path='/api/client-work/'+rid
   assert r['modelPort']['state']=='executed' and r['modelPort']['provider']=='codex_local'
   assert len(r['peerPosition'])==3 and r['sources']['bank:rabobank']['claims'] and r['sources']['sector:US']['rows']
   assert all(c['poolReceiptId'] for k,c in r['sources'].items() if k.startswith('sec:'))
   assert all(abs(r['analyses'][o['analysisId']]['lineage']['netProceeds']['value']-500)<1e-9 for o in r['options'])
   assert any(p['id']=='agent-synthesis' for p in r['draft']['slides']) and r['mandate']['decisionState']=='unrecorded'
   assert req(path+'/copies')['copies']==[] and req(path+'/evaluations')['observations']==[]
   checks.append('Explicit fake CLI exercises plan→MCP pool retrieval→deterministic same-net funding→typed source-bound story; no banker acceptance inferred')
   result=assignment('CRITERIA: change the client priorities explicitly and update the story.',roomId=rid,expectedRevision=r['revision'])
   assert result['status']=='completed',result
   r=req('/api/agent/rooms/'+rid)
   assert r['mandate']['criteria']=='Prioritize a short refinancing horizon and preserve cash flexibility.'
   assert r['contextPacket']['decisionBrief']['criteria']==r['mandate']['criteria']
   assert any(m['role']=='banker' and m['text'].startswith('CRITERIA:') for m in r['messages'])
   old=copy.deepcopy(r);result=assignment('TARGET: this request deliberately changes the target and must be rejected.',roomId=rid,expectedRevision=r['revision'])
   assert result['status']=='failed' and req('/api/agent/rooms/'+rid)==old
   checks.append('An existing-turn client-priority change persists into brief/context/conversation; target substitution is rejected without modifying the room')
   old=copy.deepcopy(r);result=assignment('INVALID: rewrite this client narrative with a deliberately invalid numeric prose claim.',roomId=rid,expectedRevision=r['revision'])
   assert result['status']=='failed' and result['result']['savedWorkPreserved'];assert req('/api/agent/rooms/'+rid)==old
   req('/api/director/assignments',{'prompt':'Try a stale instruction against an existing client workroom.','roomId':rid,'expectedRevision':0},409)
   checks.append('Invalid generated financial prose cannot overwrite current work; stale agent turns reject before execution')
   # Simulate a genuinely older current document and its archived current revision.
   legacy=copy.deepcopy(r);legacy['mandate'].pop('documentContract');legacy['mandate']['preferredOption']='base';legacy['mandate']['decisionState']='conditional_view';legacy['mandate']['recommendation']='A complete prior conditional rationale must remain visible after upgrade.';legacy['mandate']['reversalCondition']='A complete prior reversal condition must remain visible after upgrade.'
   legacy['draft']['slides']=[p for p in legacy['draft']['slides'] if p['id'] not in ['decision-view','decision-conditions']]
   next(p for p in legacy['draft']['slides'] if p['id']=='alternatives')['blocks']=[{'type':'metrics','analysisId':'base_case','text':None,'symbol':None},{'type':'metrics','analysisId':'alternative_case','text':None,'symbol':None}]
   snapshot=copy.deepcopy(legacy);snapshot.pop('history')
   proc.terminate();proc.wait(timeout=5)
   db=sqlite3.connect(pathlib.Path(tmp)/'studio.sqlite');db.execute('UPDATE agent_rooms SET payload=? WHERE id=?',(json.dumps(legacy),rid));db.execute('UPDATE client_revisions SET payload=? WHERE room_id=? AND revision=?',(json.dumps(snapshot),rid,r['revision']));db.commit();db.close()
   proc,token=boot();up=req('/api/agent/rooms/'+rid)
   assert up['revision']==r['revision']+1 and up['mandate']['documentContract']=='client-decision/2'
   assert up['mandate']['decisionState']=='review_required' and up['mandate']['preferredOption'] is None
   assert up['mandate']['recommendation']==legacy['mandate']['recommendation'] and up['mandate']['reversalCondition']==legacy['mandate']['reversalCondition']
   kinds={b['type'] for p in up['draft']['slides'] for b in p['blocks']};assert {'client_view','client_conditions','decision_comparison'}<=kinds
   assert req(path+'/history/'+str(r['revision']))['draft']==legacy['draft']
   assert up['analyses']==r['analyses'] and up['sources']==r['sources']
   proc.terminate();proc.wait(timeout=5);proc,token=boot();assert req('/api/agent/rooms/'+rid)==up
   checks.append('Older document contract migrates once as a new review-required revision; complete advice retained, old document/source/model snapshots preserved and restart is idempotent')
  finally:proc.terminate();proc.wait(timeout=5)
 print(json.dumps({'checksPassed':len(checks),'checks':checks,'externalCalls':0,'model':'explicit fake CLI for contract failures only','realInferenceOrHumanValueEstablished':False},indent=2))
if __name__=='__main__':main()
