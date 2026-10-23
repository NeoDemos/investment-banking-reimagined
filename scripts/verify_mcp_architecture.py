#!/usr/bin/env python3
"""Verify the actual release binary, official SDK stdio and model-free local workflows.
No model/data credentials, external source calls or mocked model process are needed.
"""
import json,os,pathlib,select,socket,subprocess,tempfile,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
BIN=ROOT/'target/release/banking-studio'
def main():
 checks=[];measurements={}
 with tempfile.TemporaryDirectory(prefix='banking-mcp-') as tmp:
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  base=f'http://127.0.0.1:{port}';token='';env={**os.environ,'PORT':str(port),'BANKING_STUDIO_DATA_DIR':tmp,'OPENAI_API_KEY':'','ALPHA_VANTAGE_API_KEY':'','CLAUDE_BIN':'/nonexistent-model','BANKING_STUDIO_EXTERNAL_CONNECTIONS':'0','HTTPS_PROXY':'http://127.0.0.1:1','HTTP_PROXY':'http://127.0.0.1:1','NO_PROXY':'127.0.0.1,localhost'}
  def req(path,body=None,status=200):
   request=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'content-type':'application/json','x-demo-token':token})
   try:r=urllib.request.urlopen(request,timeout=20)
   except urllib.error.HTTPError as e:r=e
   raw=r.read();assert r.status==status,(path,r.status,raw.decode());return json.loads(raw) if status==200 else raw
  def boot():
   p=subprocess.Popen([str(BIN)],cwd=tmp,env=env,stdout=subprocess.DEVNULL)
   for _ in range(400):
    try:return p,req('/api/bootstrap')['token']
    except urllib.error.URLError:time.sleep(.01)
   raise AssertionError('Server did not start')
  proc,token=boot()
  try:
   a=req('/api/architecture');assert a['models']['state']=='deferred' and len(a['mcp']['tools'])==8;assert [p['state'] for p in a['providers']]==['ready','deferred','planned','planned','planned'];checks.append('Architecture is discovered from the real MCP server and planned providers are explicit')
   req('/api/agent/runs',{'roomId':None,'expectedRevision':None,'prompt':'prepare a draft','provider':'openai','allowCached':True},409);checks.append('Model invocation is deferred without requesting a key')
   b=req('/api/agent/briefs',{'roomId':None,'expectedRevision':None,'prompt':'Assess financing alternatives for the CFO'});assert b['draft'] is None and b['modelPort']['state']=='deferred';assert b['revision']==1;req('/api/agent/briefs',{'roomId':b['id'],'expectedRevision':0,'prompt':'stale'},409);checks.append('Free-form briefs persist honestly without fake generated materials; stale captures fail')
   rooms=[]
   for kind,issuer,target,count in [('bond','PEP',None,5),('buyback','GIS',None,4),('acquisition','PEP','CPB',7)]:
    start=time.perf_counter();r=req('/api/workflows/preview',{'kind':kind,'issuer':issuer,'target':target});measurements[kind+'Ms']=round((time.perf_counter()-start)*1000,2);rooms.append(r)
    assert r['executionMode']=='local_blueprint' and len(r['draft']['slides'])==count and len(r['scene']['pages'])==count
    assert r['analyses']['base_case']['model']['issuer']==issuer
    assert all(s['provenance']['mode']=='archive' for s in r['sources'].values())
    assert r['contextPacket']['limits']['maxChars']==24000 and len(json.dumps(r['contextPacket'],ensure_ascii=False,separators=(',',':')))<=24000
    for page in r['scene']['pages']:
     for f in page['frames']:
      assert all(c in r['scene']['citationIndex'] for c in f['citationIds'])
      assert f['bounds']['width']>0 and f['bounds']['height']>0
    events=req('/api/agent/runs/'+r['lastRunId']);assert events['status']=='completed';assert any(e['type']=='mcp_discovery' for e in events['events']);assert all(e['data']['protocol']=='MCP tools/call' for e in events['events'] if e['type']=='tool_call')
   summaries=req('/api/agent/rooms')['rooms'];assert all('sources' not in s and 'history' not in s and 'messages' not in s for s in summaries)
   checks.append('Lightweight room summaries do not download analytical/source/history payloads')
   checks.append('Three genuine local MCP workflows generate different page counts with canonical source/context/financial bindings')
   r=rooms[0];first=r['draft']['slides'][0]['id'];updated=req('/api/agent/rooms/'+r['id']+'/patch',{'expectedRevision':r['revision'],'operations':[{'op':'set_headline','pageId':first,'text':'Reframed client discussion'},{'op':'move_page','pageId':first,'to':2},{'op':'set_layout','pageId':first,'layout':'grid'}]});assert updated['draft']['slides'][2]['id']==first;assert updated['scene']['pages'][2]['id']==first;
   def diff(a,b,path=''):
    if isinstance(a,dict) and isinstance(b,dict):
     for k in a:
      if a[k]!=b.get(k):return diff(a[k],b.get(k),path+'/'+k)
    elif isinstance(a,list) and isinstance(b,list):
     for i,(x,y) in enumerate(zip(a,b)):
      if x!=y:return diff(x,y,path+'/'+str(i))
    return (path,a,b)
   assert updated['analyses']==r['analyses'],diff(r['analyses'],updated['analyses'])
   assert updated['sources']==r['sources'],diff(r['sources'],updated['sources']);checks.append('Scoped document edits/reordering recompile scenes without changing financial data')
   req('/api/agent/rooms/'+r['id']+'/patch',{'expectedRevision':r['revision'],'operations':[{'op':'set_headline','pageId':first,'text':'stale'}]},409)
   req('/api/agent/rooms/'+r['id']+'/patch',{'expectedRevision':updated['revision'],'operations':[{'op':'set_headline','pageId':first,'text':'must not commit'},{'op':'move_page','pageId':'unknown','to':0}]},400);assert req('/api/agent/rooms/'+r['id'])['revision']==updated['revision'];checks.append('Stale and partially invalid edit batches cannot overwrite a saved artifact')
   doc=json.loads(json.dumps(updated['draft']));doc['slides'][2]['blocks'][1]['analysisId']='fabricated';req('/api/agent/rooms/'+r['id']+'/draft',{'expectedRevision':updated['revision'],'draft':doc},400);checks.append('Invalid financial bindings are rejected at the document boundary')
   req('/api/workflows/preview',{'kind':'bond','issuer':'UNKNOWN','target':None},400);req('/api/workflows/preview',{'kind':'acquisition','issuer':'PEP','target':'PEP'},400);checks.append('Unsupported entities and invalid financial workflow scope fail explicitly')
   proc.terminate();proc.wait(timeout=5);proc,token=boot();restored=req('/api/agent/rooms/'+r['id']);assert restored['scene']==updated['scene'] and restored['contextPacket']==updated['contextPacket'];checks.append('Restart preserves exact document, scene and bounded context snapshots')
   artifact=os.environ.get('BANKING_STUDIO_TEST_ARTIFACT_DIR')
   if artifact:
    p=pathlib.Path(artifact);p.mkdir(parents=True,exist_ok=True);(p/'local-workflows.json').write_text(json.dumps(rooms,indent=2))
  finally:proc.terminate();proc.wait(timeout=5)
  stdio=subprocess.Popen([str(BIN),'--mcp'],cwd=tmp,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
  def send(v):stdio.stdin.write(json.dumps(v)+'\n');stdio.stdin.flush()
  def response():
   assert select.select([stdio.stdout],[],[],10)[0],'MCP stdio response timed out';line=stdio.stdout.readline();return json.loads(line)
  try:
   send({'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'banking-protocol-test','version':'1'}}});init=response();assert init['result']['protocolVersion']=='2025-11-25'
   send({'jsonrpc':'2.0','method':'notifications/initialized'});send({'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}});assert len(response()['result']['tools'])==8
   send({'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'fetch_company_facts','arguments':{'symbol':'PEP'}}});c=response()['result'];assert c['isError'] is False and c['structuredContent']['provenance']['mode']=='archive'
   eid=c['structuredContent']['facts']['revenue']['evidenceId'];send({'jsonrpc':'2.0','id':4,'method':'resources/read','params':{'uri':'banking://evidence/'+eid}});record=json.loads(response()['result']['contents'][0]['text']);assert record['id']==eid and record['normalized']['unit']=='USDm'
   send({'jsonrpc':'2.0','id':5,'method':'resources/read','params':{'uri':'file:///etc/passwd'}});assert 'error' in response()
   checks.append('Standalone SDK stdio supports legacy MCP initialization, tool discovery/call, structured observations and citation resource read; arbitrary files are rejected')
  finally:stdio.terminate();stdio.wait(timeout=5)
 print(json.dumps({'asOf':'2026-10-23','checksPassed':len(checks),'checks':checks,'localWorkflowLatencyMs':measurements,'externalConnections':'Deferred; proxy points to a closed port during tests','modelCalls':0,'blueprintPageCounts':{'bond':5,'buyback':4,'acquisition':7},'notClaimed':['Autonomous natural-language drafting','Live provider entitlements or model/API integration','Bank acceptance','General pixel-perfect typesetting']},indent=2))
if __name__=='__main__':main()
