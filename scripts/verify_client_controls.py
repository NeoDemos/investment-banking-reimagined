#!/usr/bin/env python3
"""Reproduce banker-review failures against the actual local binary in an isolated DB.
Synthetic records test controls and pagination only, never banker productivity.
"""
import copy
import json
import os
import pathlib
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    checks = []
    with tempfile.TemporaryDirectory(prefix='client-controls-') as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        token = ''
        env = {**os.environ, 'PORT': str(port), 'BANKING_STUDIO_DATA_DIR': tmp,
               'BANKING_STUDIO_EXTERNAL_CONNECTIONS': '0', 'HTTPS_PROXY': 'http://127.0.0.1:1',
               'HTTP_PROXY': 'http://127.0.0.1:1', 'NO_PROXY': '127.0.0.1,localhost'}

        def req(path, body=None, status=200):
            request = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(),
                                            headers={'content-type': 'application/json', 'x-demo-token': token})
            try:
                response = urllib.request.urlopen(request, timeout=20)
            except urllib.error.HTTPError as error:
                response = error
            raw = response.read()
            assert response.status == status, (path, response.status, raw.decode())
            return json.loads(raw)

        proc = subprocess.Popen([str(ROOT / 'target/release/banking-studio')], cwd=tmp, env=env,
                                stdout=subprocess.DEVNULL)
        try:
            for _ in range(400):
                try:
                    token = req('/api/bootstrap')['token']
                    break
                except urllib.error.URLError:
                    time.sleep(.01)
            brief = dict(kind='bond', issuer='PEP', target=None,
                         question='Which structure can deliver the required USD500m of net funding?',
                         audience='CFO and treasury', meetingDate='2026-10-26',
                         criteria='Net funding sufficiency, debt-service cost and tenor flexibility.',
                         constraints='Illustrative terms only; current execution and commercial assessment are open.',
                         fundingNeed=500)
            room = req('/api/client-work', brief)
            path = '/api/client-work/' + room['id']
            room = req(path + '/prepare', dict(expectedRevision=room['revision'],
                        base=room['scenarioPlan']['base'], alternative=room['scenarioPlan']['alternative'],
                        rationale='Explicit synthetic public-data control rehearsal, not a banker or market observation.',
                        acknowledgeIllustrative=True))

            def decision():
                return req(path + '/decision', dict(expectedRevision=room['revision'], preferredOption='base',
                           recommendation='Conditionally prefer the primary structure subject to current execution review.',
                           reversalCondition='Reconsider if net funding or current market terms do not meet the client criteria.'))

            def freeze(status=200):
                return req(path + '/copies', dict(expectedRevision=room['revision'],
                           label='Synthetic controls fixture, no human acceptance',
                           reviewer='Automated isolated harness, not a banker', calculationsChecked=True,
                           sourcesAndDatesChecked=True, narrativeReviewed=True), status)

            def task(key, status):
                item = next(t for t in room['workItems'] if t['id'] == key)
                return req(path + '/task', dict(expectedRevision=room['revision'], taskId=key,
                           owner='Synthetic controls owner', acceptance=item['acceptance'], status=status,
                           note='Explicit automated blocker/clearance; no qualified banker verification.'))

            room = decision()
            room = freeze()
            copy_id = req(path + '/copies')['copies'][0]['id']
            original_copy = req(path + '/copies/' + copy_id)
            for key in ['materials', 'evidence', 'review']:
                room = task(key, 'blocked')
                assert next(t for t in room['workItems'] if t['id'] == key)['status'] == 'blocked'
                # A later banker-view commit must not silently clear a manually blocked review task.
                room = decision()
                assert next(t for t in room['workItems'] if t['id'] == key)['status'] == 'blocked'
                freeze(400)
                room = task(key, 'ready' if key == 'review' else 'complete')
            room = freeze()
            assert next(t for t in room['workItems'] if t['id'] == 'commercial')['status'] == 'blocked'
            checks.append('Blocked local material/evidence/review tasks prevent freezing across later commits; explicit clearance permits it while commercial gate stays blocked')

            issue_ids = []
            for page_id in ['decision-view', 'sources']:
                room = req(path + '/review', dict(expectedRevision=room['revision'], op='add', pageId=page_id,
                           body='Synthetic deferral must be rechecked only if this page changes.',
                           owner='Synthetic controls owner', category='story' if page_id != 'sources' else 'source'))
                issue_id = room['reviewIssues'][-1]['id']
                issue_ids.append(issue_id)
                room = req(path + '/review', dict(expectedRevision=room['revision'], op='defer', issueId=issue_id,
                           resolution='Explicit synthetic deferral for a limited discussion; no banker acceptance.'))
            room = decision()
            assert next(i for i in room['reviewIssues'] if i['id'] == issue_ids[0])['status'] == 'open'
            assert next(i for i in room['reviewIssues'] if i['id'] == issue_ids[1])['status'] == 'deferred'
            checks.append('Changed advice reopens a deferred story issue; an unchanged source deferral remains scoped and preserved')

            old = copy.deepcopy(room)
            amendment = dict(expectedRevision=room['revision'], question=brief['question'].replace('500', '600'),
                             audience=brief['audience'], meetingDate=brief['meetingDate'], criteria=brief['criteria'],
                             constraints=brief['constraints'], owner='Synthetic controls owner', fundingNeed=600,
                             fundingRequirementConfirmed=False)
            req(path + '/brief', amendment, 400)
            assert req('/api/agent/rooms/' + room['id']) == old
            amendment['fundingRequirementConfirmed'] = True
            room = req(path + '/brief', amendment)
            assert room['mandate']['fundingNeed'] == 600 and room['mandate']['preferredOption'] is None
            assert room['sources'] == old['sources']
            assert all(room['analyses'][k] == value for k, value in old['analyses'].items())
            for option in room['options']:
                a = room['analyses'][option['analysisId']]
                prior = old['analyses'][next(o['analysisId'] for o in old['options'] if o['id'] == option['id'])]
                assert a['params'] == prior['params'], (a['params'], prior['params'])
                assert a['sourceSnapshot']['companies'] == prior['sourceSnapshot']['companies']
                assert a['sourceSnapshot']['curve'] == prior['sourceSnapshot']['curve']
                assert abs(a['lineage']['fundingGap']['value'] - prior['lineage']['fundingGap']['value'] - 100) < 1e-9
            req(path + '/brief', amendment, 409)
            other = copy.deepcopy(room['analyses'][room['options'][1]['analysisId']])
            room = req(path + '/scenario', dict(expectedRevision=room['revision'], optionId='base',
                       params=room['analyses'][room['options'][0]['analysisId']]['params'], sizeToFunding=True,
                       rationale='Deliberately resize only the primary action to the amended net funding requirement.'))
            a = room['analyses'][room['options'][0]['analysisId']]
            assert abs(a['lineage']['netProceeds']['value'] - 600) < 1e-9
            assert a['lineage']['fundingGap']['value'] == 0
            assert room['analyses'][room['options'][1]['analysisId']] == other
            assert req(path + '/copies/' + copy_id) == original_copy
            checks.append('Confirmed USD500m→600m amendment creates new exact-gap lineages without resizing or changing archived models/sources/copies; deliberate sizing affects only one action')

            formula = a['lineage']['netProceeds']['formula']
            assert 'spread (bps)/100' in formula and 'Y/200' in formula and '10,000' in formula
            assert formula in json.dumps(a['model']['workings'], ensure_ascii=False)
            debt = next(i for i in a['lineage']['baseLeverage']['inputs'] if i['label'] == 'PEP debt')
            assert debt['tag'] == 'DebtCurrent + LongTermDebtNoncurrent' and debt['accession']
            assert debt['definition'] and debt['reportedValue'] == sum(x['value'] for x in debt['components'])
            assert {x['tag'] for x in debt['conceptLinks']} == {x['tag'] for x in debt['components']}
            assert all('/companyconcept/CIK0000077476/us-gaap/' in x['url'] for x in debt['conceptLinks'])
            assert debt['sourceDestination'] == 'filing directory'
            checks.append('Working-sheet and displayed net-proceeds formulas agree on all conversions; derived debt exposes exact tags, components, units, period and accession with honestly labelled source destinations')

            # Write explicit synthetic bulk fixtures directly to the isolated DB: this tests the
            # previously hidden >100 observations / >50 copies, not banking review quality.
            db = sqlite3.connect(pathlib.Path(tmp) / 'studio.sqlite')
            for n in range(51):
                fixture = copy.deepcopy(original_copy)
                fixture['reviewCopy']['label'] = f'Synthetic pagination fixture {n}'
                db.execute('INSERT INTO client_review_copies VALUES(?,?,?,?,?)',
                           (f'synthetic-copy-{n}', room['id'], original_copy['reviewCopy']['revision'],
                            json.dumps(fixture), '2026-10-23'))
            for n in range(101):
                entry = dict(id=f'synthetic-observation-{n}', roomId=room['id'],
                             provenance='Synthetic isolated pagination contract fixture; not a human observation',
                             baselineTotalStaffMinutes=60, assistedTotalStaffMinutes=6,
                             metrics=dict(qualityGatePassed=n != 0, enteredStaffTimeRatio=10 if n != 0 else None))
                db.execute('INSERT INTO client_evaluations VALUES(?,?,?,?)',
                           (entry['id'], room['id'], json.dumps(entry), '2026-10-23'))
            db.commit()

            def pages(key):
                suffix = '/evaluations' if key == 'observations' else '/copies'
                first = req(path + suffix + '?limit=25')
                result = list(first[key]); cursor = first['nextCursor']
                while cursor is not None:
                    page = req(path + suffix + f'?limit=25&maxId={first["maxId"]}&before={cursor}')
                    assert page['maxId'] == first['maxId']
                    result.extend(page[key]); cursor = page['nextCursor']
                assert len({r['id'] for r in result}) == len(result)
                return first, result

            first, observations = pages('observations')
            assert len(observations) == 101 and first['summary']['enteredPairs'] == 101
            assert first['summary']['qualityQualifiedPairs'] == 100
            assert first['summary']['aggregateEnteredStaffTimeRatio'] is None
            assert observations[-1]['metrics']['qualityGatePassed'] is False
            ceiling = first['maxId']
            entry['id'] = 'synthetic-concurrent-insert'
            db.execute('INSERT INTO client_evaluations VALUES(?,?,?,?)',
                       (entry['id'], room['id'], json.dumps(entry), '2026-10-23'))
            db.commit(); db.close()
            assert req(path + f'/evaluations?maxId={ceiling}')['summary']['enteredPairs'] == 101
            assert req(path + '/evaluations')['summary']['enteredPairs'] == 102
            first_copies, all_copies = pages('copies')
            assert len(all_copies) == first_copies['totalStored'] == 53
            assert copy_id in [c['id'] for c in all_copies]
            assert req(path + '/copies/' + copy_id) == original_copy
            req(path + '/evaluations?limit=101', status=400)
            req(path + '/copies?before=0', status=400)
            checks.append('Stable bounded pagination retrieves all 101 observations including the oldest quality failure and all 53 copies; concurrent inserts stay outside a fixed snapshot; invalid cursors rejected')
        finally:
            proc.terminate()
            proc.wait(timeout=5)
    print(json.dumps(dict(checksPassed=len(checks), checks=checks, externalCalls=0,
                         syntheticDataOnly=True, humanProductivityOrClientImpactEstablished=False), indent=2))


if __name__ == '__main__':
    main()
