#!/usr/bin/env python3
"""Real-binary client decision/recalculation checks. No model or source network calls."""
import copy,json,os,pathlib,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
 checks=[]
 with tempfile.TemporaryDirectory(prefix='client-workflow-') as tmp:
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  base=f'http://127.0.0.1:{port}';token=''
  env={**os.environ,'PORT':str(port),'BANKING_STUDIO_DATA_DIR':tmp,'BANKING_STUDIO_EXTERNAL_CONNECTIONS':'0','HTTPS_PROXY':'http://127.0.0.1:1','HTTP_PROXY':'http://127.0.0.1:1','NO_PROXY':'127.0.0.1,localhost'}
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
  proc,token=boot()
  try:
   for kind in ['bond','buyback','acquisition']:
    brief={'kind':kind,'issuer':'PEP','target':'CPB' if kind=='acquisition' else None,'question':'Which structure best serves this illustrative client decision?','audience':'CFO and treasury','meetingDate':'2026-10-26','criteria':'Cash economics, downside resilience and retained flexibility.','constraints':'Current market terms and commercial feasibility need banker confirmation.','fundingNeed':500 if kind=='bond' else None}
    r=req('/api/client-work',brief);path='/api/client-work/'+r['id'];assert r['draft'] is None and r['mandate']['question']==brief['question'] and len(r['workItems'])==6
    prepare={'expectedRevision':r['revision'],'base':r['scenarioPlan']['base'],'alternative':r['scenarioPlan']['alternative'],'rationale':'Explicit illustrative inputs for a client decision rehearsal; not current market data.','acknowledgeIllustrative':False}
    req(path+'/prepare',prepare,400);assert req('/api/agent/rooms/'+r['id'])['revision']==r['revision']
    prepare['acknowledgeIllustrative']=True;r=req(path+'/prepare',prepare);assert len(r['options'])==2 and all(o['analysisId'] in r['analyses'] for o in r['options']);assert next(x for x in r['workItems'] if x['id']=='commercial')['status']=='blocked'
    assert len(r['draft']['slides'])=={'bond':9,'buyback':8,'acquisition':12}[kind]
    assert r['draft']['slides'][0]['blocks']==[{'type':'client_decision','text':None,'analysisId':None,'symbol':None}]
    assert all(r['analyses'][o['analysisId']]['lineage'] for o in r['options'])
    if kind=='acquisition':
     assert r['options'][1]['role']=='action' and r['analyses']['alternative_case']['params']['debtPercent']!=r['analyses']['base_case']['params']['debtPercent']
     assert r['stresses'][0]['role']=='stress' and r['analyses']['downside_case']['params']['synergies']==0
     assert len(r['stresses'])==2 and r['stresses'][1]['actionId']=='alternative'
     a=r['analyses']['alternative_case'];v={i['label']:i['value'] for i in a['lineage']['eps']['inputs']};e=v['targetShares']*v['targetPrice']*(1+v['premium']/100);d=e*v['debtPercent']/100;c=e-d;i=d*(v['5-year Treasury par reference']+v['spread']/100)/100;lost=c*v['1-year Treasury par reference']/100;eps=(v['PEP netIncome']+v['CPB netIncome']+(v['synergies']-i-lost)*(1-v['tax']/100))/v['PEP shares'];assert abs(eps-a['lineage']['eps']['value'])<1e-12
     req(path+'/decision',{'expectedRevision':r['revision'],'preferredOption':'downside','recommendation':'A downside state is not a separate management action.','reversalCondition':'The endpoint must reject this invalid action identity.'},400)
    if kind=='bond':
     a=r['analyses']['base_case'];p=a['params'];y=a['model']['metrics'][0]['value'];n=int(p['tenor']*2);price=sum((p['coupon']/2+(100 if t==n else 0))/(1+y/200)**t for t in range(1,n+1));expected=p['amount']*price/100-p['amount']*p['fees']/10000
     actual=next(m['value'] for m in a['model']['metrics'] if m['key']=='netProceeds');assert abs(actual-expected)<1e-9
     assert a['lineage']['fundingGap']['value']>1
     inputs=a['lineage']['postUseLeverage']['inputs'];v={i['label']:i['value'] for i in inputs};lev=(v['PEP debt']-v['PEP cash']+v['amount'])/(v['PEP operatingIncome']+v['PEP da']);assert abs(lev-a['lineage']['postUseLeverage']['value'])<1e-12
     assert all(i['id'] for i in inputs)
    decision={'expectedRevision':r['revision'],'preferredOption':'base','recommendation':'Conditionally prefer this structure against the recorded client criteria.','reversalCondition':'Reconsider if current market execution terms or the funding need differ.'}
    r=req(path+'/decision',decision);assert r['mandate']['decisionState']=='conditional_view'
    r=req(path+'/review',{'expectedRevision':r['revision'],'op':'add','pageId':'alternatives','body':'Challenge this alternative with an adverse execution assumption.','owner':'Automated test fixture; not banker evidence','category':'financial'});issue=r['reviewIssues'][-1];assert req('/api/agent/rooms/'+r['id'])['reviewIssues']==r['reviewIssues']
    old=copy.deepcopy(r);p=copy.deepcopy(r['analyses']['alternative_case']['params']);p['spread' if 'spread' in p else 'sharePrice']+=25
    change={'expectedRevision':r['revision'],'optionId':'alternative','params':p,'rationale':'Challenge one structure for a more adverse client execution scenario.'}
    r=req(path+'/scenario',change);assert r['sources']==old['sources'];assert all(r['analyses'][k]==v for k,v in old['analyses'].items());assert r['options'][0]==old['options'][0];assert r['mandate']['preferredOption'] is None and r['mandate']['decisionState']=='review_required'
    assert r['changeLog'][-1]['narrativeReviewRequired'] and r['changeLog'][-1]['affectedPages']
    affected=r['changeLog'][-1]['affectedPages'];assert all(p==q for p,q in zip(old['draft']['slides'],r['draft']['slides']) if p['id'] not in affected)
    req(path+'/scenario',change,409);bad=copy.deepcopy(change);bad['expectedRevision']=r['revision'];bad['params']['unexpected']=1;req(path+'/scenario',bad,400);assert req('/api/agent/rooms/'+r['id'])==r
    if kind=='bond':
     sized={'expectedRevision':r['revision'],'optionId':'alternative','params':r['analyses'][r['options'][1]['analysisId']]['params'],'rationale':'Size the alternative to the explicit required net cash while retaining all other terms.','sizeToFunding':True};r=req(path+'/scenario',sized);a=r['analyses'][r['options'][1]['analysisId']];assert abs(a['lineage']['netProceeds']['value']-500)<1e-9 and a['lineage']['fundingGap']['value']==0
     p=a['params'];y=a['lineage']['yield']['value'];n=int(p['tenor']*2);px=sum((p['coupon']/2+(100 if t==n else 0))/(1+y/200)**t for t in range(1,n+1));assert abs(p['amount']*(px/100-p['fees']/10000)-500)<1e-9
    if kind=='acquisition':
     oldstress=copy.deepcopy(r['analyses'][r['stresses'][0]['analysisId']]);p=copy.deepcopy(r['analyses'][r['options'][0]['analysisId']]['params']);p['premium']+=5;r=req(path+'/scenario',{'expectedRevision':r['revision'],'optionId':'base','params':p,'rationale':'Test an increased consideration with the same primary-action stress convention.'});stress=r['analyses'][r['stresses'][0]['analysisId']];assert stress!=oldstress and stress['params']['premium']==p['premium'] and stress['params']['synergies']==0
    changed=r['changeLog'][-1]['revision'];r=req(path+'/review',{'expectedRevision':r['revision'],'op':'link_change','issueId':issue['id'],'changeRevision':changed,'resolution':'Linked to the actual recalculated alternative; this is automated test evidence only.'});assert r['reviewIssues'][-1]['status']=='applied'
    decision['expectedRevision']=r['revision'];r=req(path+'/decision',decision)
    freeze={'expectedRevision':r['revision'],'label':'Automated boundary test copy','reviewer':'Automated test harness; no human acceptance','calculationsChecked':True,'sourcesAndDatesChecked':True,'narrativeReviewed':True};req(path+'/copies',freeze,400)
    r=req(path+'/review',{'expectedRevision':r['revision'],'op':'verify','issueId':issue['id'],'owner':'Automated test harness; no human acceptance','resolution':'Independently recomputed numerical boundaries in an automated test, not a qualified banker review.'});assert r['reviewIssues'][-1]['status']=='verified'
    freeze['expectedRevision']=r['revision'];r=req(path+'/copies',freeze);copies=req(path+'/copies')['copies'];frozen=req(path+'/copies/'+copies[0]['id']);assert frozen['workroom']==r and frozen['workroom']['mandate']['recommendation']==decision['recommendation'];assert next(t for t in r['workItems'] if t['id']=='commercial')['status']=='blocked'
    assert req(path+'/evaluations')['observations']==[]
    observation={'copyId':copies[0]['id'],'taskLabel':'Synthetic isolated contract-test pair; no banker result','reviewer':'Automated fixture; not human evidence','baselineMethod':'Synthetic values to test API gating in a temporary database, not recorded banker effort.','order':'matched_cases','baselineMinutes':dict(setup=1,research=2,calculation=3,materials=4,qualityReview=5,rework=6),'assistedMinutes':dict(setup=1,research=1,calculation=1,materials=1,qualityReview=1,rework=1),'baselineElapsedMinutes':10,'assistedElapsedMinutes':5,'baselineAccepted':True,'assistedAccepted':False,'baselineCriticalErrors':0,'assistedCriticalErrors':1,'sameScopeConfirmed':True,'allStaffAndSetupIncluded':True,'questions':['Does the proposed structure fund the net requirement?','Is the downside and its conditional response correctly explained?'],'questionsPredefined':True,'baselineResolved':0,'assistedResolved':2,'evidenceNotes':'Entirely synthetic isolated API boundary fixture. It is not an observation of banker time, independent acceptance or client utility.'}
    entered=req(path+'/evaluations',observation);assert entered['metrics']['enteredStaffTimeRatio'] is None and entered['metrics']['enteredQuestionCoverageRatio'] is None
    qualified=copy.deepcopy(observation);qualified.update(assistedAccepted=True,assistedCriticalErrors=0);entered=req(path+'/evaluations',qualified);assert entered['metrics']['enteredStaffTimeRatio']==3.5 and entered['metrics']['enteredQuestionCoverageRatio'] is None and 'Unproven' in entered['metrics']['clientImpactClaim']
    qualified['baselineResolved']=1;entered=req(path+'/evaluations',qualified);assert entered['metrics']['enteredQuestionCoverageRatio']==2 and entered['copyRevision']==frozen['reviewCopy']['revision']
    invalid=copy.deepcopy(qualified);invalid['questions']=[invalid['questions'][0],invalid['questions'][0].upper()];req(path+'/evaluations',invalid,400)
    invalid=copy.deepcopy(qualified);invalid['baselineMinutes'].pop('rework');req(path+'/evaluations',invalid,400)
    invalid=copy.deepcopy(qualified);invalid['baselineMinutes']={k:0 for k in invalid['baselineMinutes']};req(path+'/evaluations',invalid,400)
    recorded=req(path+'/evaluations');assert recorded['summary']['enteredPairs']==3 and recorded['summary']['qualityQualifiedPairs']==2;assert all('not independently verified' in o['provenance'] for o in recorded['observations'])
    checks.append(kind+': isolated synthetic observation contract tests suppress failed-quality/zero-baseline ratios and pin the exact copy; no human result inferred')
    decision.update(expectedRevision=r['revision'],preferredOption='insufficient');r=req(path+'/decision',decision);assert r['reviewCopyOutOfDate'];assert req(path+'/copies/'+copies[0]['id'])==frozen
    task=next(t for t in r['workItems'] if t['id']=='commercial');req(path+'/task',{'expectedRevision':r['revision'],'taskId':'commercial','owner':'Test role','acceptance':task['acceptance'],'status':'complete','note':'Cannot falsely complete a current-market execution gate.'},400)
    task=next(t for t in r['workItems'] if t['id']=='review');r=req(path+'/task',{'expectedRevision':r['revision'],'taskId':'review','owner':'Named reviewer test fixture','acceptance':task['acceptance'],'status':'ready','note':'Assign a concrete reviewer in this automated contract test.'});assert next(t for t in r['workItems'] if t['id']=='review')['owner']=='Named reviewer test fixture'
    brief_edit={'expectedRevision':r['revision'],'question':brief['question'],'audience':brief['audience'],'meetingDate':brief['meetingDate'],'criteria':'Revised client criteria require greater downside resilience.','constraints':brief['constraints'],'owner':'Coverage owner test fixture'};r=req(path+'/brief',brief_edit);assert r['mandate']['criteria']==brief_edit['criteria'] and r['mandate']['decisionState']=='review_required';assert req(path+'/history/'+str(r['revision']))['mandate']==r['mandate'];assert all('draft' not in h for h in r['history'])
    r=req(path+'/review',{'expectedRevision':r['revision'],'op':'add','pageId':'decision-view','body':'Verify that the conditional advisory rationale remains current.','owner':'Automated fixture; not a banker','category':'story'});story=r['reviewIssues'][-1]['id']
    r=req(path+'/review',{'expectedRevision':r['revision'],'op':'add','pageId':'sources','body':'Check the unchanged source identities in this isolated test.','owner':'Automated fixture; not a banker','category':'source'});source=r['reviewIssues'][-1]['id']
    def verify_issue(r,issue):return req(path+'/review',{'expectedRevision':r['revision'],'op':'verify','issueId':issue,'owner':'Automated fixture; not human acceptance','resolution':'Explicit automated state-transition assertion; no qualified human banker or client review is claimed.'})
    r=verify_issue(verify_issue(r,story),source)
    decision.update(expectedRevision=r['revision'],preferredOption='alternative',reversalCondition='A'*225+' MATERIAL CONDITION MUST REMAIN VISIBLE IN FULL.');r=req(path+'/decision',decision);assert r['mandate']['preferredOption']=='alternative' and 'MATERIAL CONDITION' in r['mandate']['reversalCondition'];assert next(i for i in r['reviewIssues'] if i['id']==story)['status']=='open';assert next(i for i in r['reviewIssues'] if i['id']==source)['status']=='verified'
    freeze['expectedRevision']=r['revision'];req(path+'/copies',freeze,400)
    r=verify_issue(r,story);r=req('/api/agent/rooms/'+r['id']+'/patch',{'expectedRevision':r['revision'],'operations':[{'op':'set_headline','pageId':'decision-view','text':'A revised advisory headline'}]});assert next(i for i in r['reviewIssues'] if i['id']==story)['status']=='open'
    r=verify_issue(r,story);doc=copy.deepcopy(r['draft']);next(p for p in doc['slides'] if p['id']=='decision-view')['title']='Another authored advisory headline';r=req('/api/agent/rooms/'+r['id']+'/draft',{'expectedRevision':r['revision'],'draft':doc});assert next(i for i in r['reviewIssues'] if i['id']==story)['status']=='open'
    r=verify_issue(r,story);brief_edit['expectedRevision']=r['revision'];r=req(path+'/brief',brief_edit);assert next(i for i in r['reviewIssues'] if i['id']==story)['status']=='open'
    r=verify_issue(r,story);active=r['analyses'][r['options'][1]['analysisId']];p=copy.deepcopy(active['params']);p['spread' if 'spread' in p else 'sharePrice']+=1;r=req(path+'/scenario',{'expectedRevision':r['revision'],'optionId':'alternative','params':p,'rationale':'A later economic change must invalidate the prior advisory and financial issue checks.'});assert next(i for i in r['reviewIssues'] if i['id']==story)['status']=='open';assert next(i for i in r['reviewIssues'] if i['id']==source)['status']=='verified';assert next(i for i in r['reviewIssues'] if i['id']==issue['id'])['status']=='open'
    req(path+'/review',{'expectedRevision':r['revision'],'op':'link_change','issueId':issue['id'],'changeRevision':changed,'resolution':'This old revision must be rejected after the issue was reopened.'},400)
    if kind=='acquisition':
     stress=next(s for s in r['stresses'] if s['actionId']=='alternative');a=r['analyses'][r['options'][1]['analysisId']];stress=r['analyses'][stress['analysisId']];assert stress['params']=={**a['params'],'synergies':0}
    checks.append(kind+': advice/document/brief/economic edits reopen relevant checks; stale correction links rejected; unrelated verification preserved')
    checks.append(kind+': key-number lineage, review issue/correction/verification, immutable complete copy, accountable task and amended brief')
    checks.append(kind+': client brief, confirmed plan, two alternatives, immutable scoped recalculation, invalid/stale protection')
   assert all('draft' not in h and 'analyses' not in h for h in r['history']);assert req(path+'/history/1')['draft'] is None
   saved=r;proc.terminate();proc.wait(timeout=5)
   db=sqlite3.connect(pathlib.Path(tmp)/'studio.sqlite');snapshots=[json.loads(x[0]) for x in db.execute('SELECT payload FROM client_revisions WHERE room_id=? ORDER BY revision',(saved['id'],))];legacy=copy.deepcopy(saved);legacy['history']=snapshots;db.execute('UPDATE agent_rooms SET payload=? WHERE id=?',(json.dumps(legacy),saved['id']));db.execute('DELETE FROM client_revisions WHERE room_id=?',(saved['id'],));db.commit();db.close()
   proc,token=boot();assert req('/api/agent/rooms/'+saved['id'])==saved;assert req(path+'/history/'+str(saved['revision']))['mandate']==saved['mandate'];assert req(path+'/evaluations')==recorded
   checks.append('Exact client state and observations survive restart; legacy full histories migrate transactionally to immutable on-demand revisions')
  finally:proc.terminate();proc.wait(timeout=5)
 print(json.dumps({'checksPassed':len(checks),'checks':checks,'externalCalls':0,'notEstablished':['10x productivity','5x client impact','Autonomous model drafting','Bank acceptance']},indent=2))
if __name__=='__main__':main()
