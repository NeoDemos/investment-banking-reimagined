#!/usr/bin/env python3
"""Integration tests with an explicitly mocked model process; not live-agent evidence.
Uses real connector calls for the public-data run (no model credentials). Sources may
fall back to the embedded dated cache. All state is isolated and deleted at exit.
"""
import json,os,pathlib,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
FIXTURE=r'''#!/usr/bin/env python3
import sys,json,time
if '--version' in sys.argv:print('TEST MODEL FIXTURE');sys.exit(0)
c=json.load(sys.stdin);p=c['currentInstruction'];r=c['workroom']
if p=='quota':print(json.dumps({'is_error':True,'api_error':'usage_limit_reached'}));sys.exit(1)
if p=='slow':time.sleep(20)
if p=='loop':tool,args='unknown_tool',{}
elif p=='question' or p=='slow':tool,args='ask_banker',{'question':'What issue size and tenor should this discussion illustrate?'}
elif 'sec:PEP' not in r['sources']:tool,args='fetch_company_facts',{'symbol':'PEP'}
elif 'treasury:USD' not in r['sources']:tool,args='fetch_treasury_curve',{}
elif 'debt' not in r['analyses']:tool,args='calculate_finance',{'analysisId':'debt','kind':'bond','issuer':'PEP','target':None,'params':{'amount':500,'tenor':5,'spread':125,'coupon':6.25,'fees':50},'rationale':'Explicit test fixture transaction assumptions. These are illustrative, not market quotes.'}
else:tool,args='compose_materials',{'title':'TEST FIXTURE — financing discussion','slides':[{'id':'intro','title':'An illustrative financing decision','layout':'split','blocks':[{'type':'text','text':'Evaluate funding flexibility using reported financial context.'},{'type':'metrics','analysisId':'debt'}]},{'id':'context','title':'Reported financial context','layout':'split','blocks':[{'type':'facts','symbol':'PEP'},{'type':'chart','analysisId':'debt'}]},{'id':'terms','title':'Illustrative terms and sensitivities','layout':'split','blocks':[{'type':'assumptions','analysisId':'debt'},{'type':'sensitivity','analysisId':'debt'}]},{'id':'evidence','title':'Sources and limitations','layout':'full','blocks':[{'type':'sources'}]}]}
print(json.dumps({'is_error':False,'structured_output':{'tool':tool,'arguments':json.dumps(args)},'usage':{'fixture':True}}))
'''
def main():
 if os.environ.get("BANKING_STUDIO_VERIFY_MODEL_PORT") != "1":
  raise SystemExit("Model-port rehearsal is deferred. Run scripts/verify_mcp_architecture.py for this phase; use BANKING_STUDIO_VERIFY_MODEL_PORT=1 only for an explicitly requested later mock-model-port test.")
 checks=[]
 with tempfile.TemporaryDirectory(prefix='banking-agent-test-') as tmp:
  tmp=pathlib.Path(tmp);mock=tmp/'mock-model';mock.write_text(FIXTURE);mock.chmod(0o755)
  with socket.socket() as x:x.bind(('127.0.0.1',0));port=x.getsockname()[1]
  base=f'http://127.0.0.1:{port}';token=''
  env={**os.environ,'PORT':str(port),'BANKING_STUDIO_DATA_DIR':str(tmp),'CLAUDE_BIN':str(mock),'OPENAI_API_KEY':'','ALPHA_VANTAGE_API_KEY':'','BANKING_STUDIO_EXTERNAL_CONNECTIONS':'1'}
  def req(path,body=None,status=200):
   q=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'content-type':'application/json','x-demo-token':token})
   try:r=urllib.request.urlopen(q,timeout=10)
   except urllib.error.HTTPError as e:r=e
   raw=r.read();assert r.status==status,(path,r.status,raw.decode());return json.loads(raw) if status==200 else raw
  def wait(run,limit=90):
   end=time.monotonic()+limit
   while time.monotonic()<end:
    v=req('/api/agent/runs/'+run)
    if v['status']!='running':return v
    time.sleep(.1)
   raise AssertionError('Run did not finish')
  def start(prompt,room=None,rev=None,cache=True):return req('/api/agent/runs',{'prompt':prompt,'provider':'claude','roomId':room,'expectedRevision':rev,'allowCached':cache})
  def boot():
   proc=subprocess.Popen([str(ROOT/'target/release/banking-studio')],cwd=tmp,env=env,stdout=subprocess.DEVNULL)
   for _ in range(300):
    try:return proc,req('/api/bootstrap')['token']
    except urllib.error.URLError:time.sleep(.01)
   raise AssertionError('No server')
  proc,token=boot()
  try:
   a=start('question');r=wait(a['runId']);assert r['status']=='needs_input';room=req('/api/agent/rooms/'+a['roomId']);assert room['revision']==1 and room['draft'] is None;checks.append('Clarification is durable and creates no invented draft')
   req('/api/agent/runs',{'prompt':'x','provider':'claude','roomId':a['roomId'],'expectedRevision':0,'allowCached':True},409);checks.append('Stale revision rejected before model execution')
   z=start('quota',a['roomId'],1);f=wait(z['runId']);assert f['status']=='failed' and 'weekly usage limit' in f['result']['error'];assert req('/api/agent/rooms/'+a['roomId'])['revision']==1;checks.append('Provider quota failure preserves saved revision and reports actual cause')
   z=start('loop',a['roomId'],1);f=wait(z['runId']);assert f['status']=='failed' and len([e for e in f['events'] if e['type']=='tool_error'])==14;checks.append('Unknown tools are rejected and the bounded loop terminates')
   z=start('slow',a['roomId'],1);time.sleep(.15);req('/api/agent/runs/'+z['runId']+'/cancel',{});assert wait(z['runId'])['status']=='cancelled';time.sleep(.3);z=start('question',a['roomId'],1);assert wait(z['runId'])['status']=='needs_input';checks.append('Cancellation stops active model work and frees the run slot')
   z=start('public data integration fixture');r=wait(z['runId']);assert r['status']=='completed',r
   room=req('/api/agent/rooms/'+z['roomId']);assert len(room['draft']['slides'])==4;assert len(room['analyses'])==1;assert all(s['provenance']['mode'] in ['retrieved','cached'] for s in room['sources'].values());assert all(len(s['provenance']['sha256'])==64 for s in room['sources'].values());assert room['analyses']['debt']['sourceSnapshot']['curve']['date'];checks.append('Real connectors, explicit cache provenance, Rust calculation and variable-page composition execute through the tool protocol')
   d=json.loads(json.dumps(room['draft']));d['slides'][0]['blocks'][1]['analysisId']='invented';req('/api/agent/rooms/'+room['id']+'/draft',{'expectedRevision':room['revision'],'draft':d},400);checks.append('Fabricated bindings cannot enter the saved draft')
   d=room['draft'];d['slides'][0]['title']='A banker-edited headline';saved=req('/api/agent/rooms/'+room['id']+'/draft',{'expectedRevision':room['revision'],'draft':d});assert saved['revision']==room['revision']+1;req('/api/agent/rooms/'+room['id']+'/draft',{'expectedRevision':room['revision'],'draft':d},409);checks.append('Banker edits are versioned and stale saves fail')
   z=start('slow',room['id'],saved['revision']);time.sleep(.2);d['slides'][0]['title']='Concurrent banker change';saved2=req('/api/agent/rooms/'+room['id']+'/draft',{'expectedRevision':saved['revision'],'draft':d});r=wait(z['runId'],25);assert r['status']=='failed' and 'changed during generation' in r['result']['error'];assert req('/api/agent/rooms/'+room['id'])['draft']['slides'][0]['title']=='Concurrent banker change';checks.append('A concurrent human edit prevents an agent result from overwriting it')
   z=start('slow');time.sleep(.2);proc.terminate();proc.wait(timeout=5);proc,token=boot();assert req('/api/agent/runs/'+z['runId'])['status']=='failed';restored=req('/api/agent/rooms/'+room['id']);assert restored['revision']==saved2['revision'];checks.append('Restart marks interrupted runs failed and preserves committed draft/source history')
   artifact=os.environ.get('BANKING_STUDIO_TEST_ARTIFACT_DIR')
   if artifact:
    folder=pathlib.Path(artifact);folder.mkdir(parents=True,exist_ok=True);room['testFixture']=True;room.pop('lastRunId',None);room['title']='TEST FIXTURE — public-data UI verification';room['messages'].append({'role':'agent','text':'TEST FIXTURE: the model in this run was mocked. These pages verify rendering and bindings, not live inference.','at':''});(folder/'workroom.json').write_text(json.dumps(room,indent=2))
   print(json.dumps({'model':'Explicit mock process; no live inference claimed','checks':checks,'connectorModes':{k:v['provenance']['mode'] for k,v in room['sources'].items()}},indent=2))
  finally:proc.terminate();proc.wait(timeout=5)
if __name__=='__main__':main()
