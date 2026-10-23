#!/usr/bin/env python3
"""Real-binary IPO/LBO integration, independent arithmetic and persistence checks.
Uses the seeded public archive, no external network or model calls.
"""
import copy
import json
import math
import os
import pathlib
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    checks = []
    with tempfile.TemporaryDirectory(prefix='capital-models-') as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        token = ''
        env = {**os.environ, 'PORT': str(port), 'BANKING_STUDIO_DATA_DIR': tmp,
               'BANKING_STUDIO_EXTERNAL_CONNECTIONS': '0', 'BANKING_STUDIO_LOCAL_AGENT': '0',
               'HTTPS_PROXY': 'http://127.0.0.1:1', 'HTTP_PROXY': 'http://127.0.0.1:1',
               'NO_PROXY': '127.0.0.1,localhost'}

        def req(path, body=None, status=200):
            request = urllib.request.Request(base + path,
                data=None if body is None else json.dumps(body).encode(),
                headers={'content-type': 'application/json', 'x-demo-token': token})
            try:
                response = urllib.request.urlopen(request, timeout=20)
            except urllib.error.HTTPError as error:
                response = error
            raw = response.read()
            assert response.status == status, (path, response.status, raw.decode())
            return json.loads(raw)

        def boot():
            proc = subprocess.Popen([str(ROOT / 'target/release/banking-studio')], cwd=tmp,
                                    env=env, stdout=subprocess.DEVNULL)
            for _ in range(400):
                try:
                    return proc, req('/api/bootstrap')['token']
                except urllib.error.URLError:
                    time.sleep(.01)
            raise AssertionError('Application did not start')

        def metrics(a):
            return {m['key']: m['value'] for m in a['model']['metrics']}

        def near(a, b):
            assert math.isclose(a, b, rel_tol=1e-10, abs_tol=1e-8), (a, b)

        proc, token = boot()
        try:
            rooms = []
            for kind in ['ipo', 'lbo']:
                r = req('/api/client-work', dict(kind=kind, issuer='GIS', target=None,
                    question='Which illustrative capital structure best fits this client?',
                    audience='CFO and investment committee', meetingDate='2026-10-26',
                    criteria='Economics, dilution or sponsor returns and downside resilience.',
                    constraints='Public listed-company proxy; all transaction inputs are hypothetical.',
                    fundingNeed=None))
                path = '/api/client-work/' + r['id']
                r = req(path + '/prepare', dict(expectedRevision=r['revision'],
                    base=r['scenarioPlan']['base'], alternative=r['scenarioPlan']['alternative'],
                    acknowledgeIllustrative=True, rationale='Explicit hypothetical model integration check.'))
                a = r['analyses']['base_case']; p = a['params']; m = metrics(a)
                facts = r['sources']['sec:GIS']['facts']
                f = lambda k: facts[k]['value'] / 1e6
                ebitda = f('operatingIncome') + f('da')
                if kind == 'ipo':
                    offer_equity = (ebitda * p['evMultiple'] - f('debt') + f('cash')) * (1-p['offerDiscount']/100)
                    price = offer_equity/f('shares'); new_shares = p['primaryRaise']/price
                    near(m['offerPrice'], price)
                    near(m['newShares'], new_shares)
                    near(m['dilution'], 100*new_shares/(f('shares')+new_shares))
                    near(m['netProceeds'], p['primaryRaise']*(1-p['fees']/100))
                    checks.append('IPO: independent offer-equity/share-price, new-share ownership and fee/net-proceeds bridge')
                else:
                    # Closed-form constant-growth cash sweep (default path does not pay debt off early).
                    n = int(p['years']); debt0 = ebitda*p['leverage']; rate = p['interestRate']/100
                    debt = debt0*(1+rate)**n - sum(ebitda*(1+p['growth']/100)**t*p['cashConversion']/100*(1+rate)**(n-t) for t in range(1,n+1))
                    assert debt > 0
                    near(m['exitDebt'], debt)
                    equity = ebitda*(1+p['growth']/100)**n*p['exitMultiple']-debt
                    sponsor = ebitda*p['entryMultiple']*(1+p['fees']/100)-debt0
                    near(m['sponsorEquity'], sponsor)
                    near(m['exitEquity'], equity)
                    near(m['irr'], 100*((equity/sponsor)**(1/n)-1))
                    near(-sponsor+equity/(1+m['irr']/100)**n, 0)
                    assert len(a['model']['schedule']) == n
                    checks.append('LBO: closed-form debt amortization and independently discounted sponsor cash flows reconcile to the annual schedule')
                assert all(a['lineage'][k]['value'] == v for k,v in m.items())
                checks.append(kind + ': every headline metric resolves to inspectable financial lineage')
                old = copy.deepcopy(r)
                params = copy.deepcopy(p)
                if kind == 'ipo': params['offerDiscount'] += 5
                else: params.update(cashConversion=0, interestRate=30)
                r = req(path+'/scenario', dict(expectedRevision=r['revision'], optionId='base',
                    params=params, rationale='Scope a single assumption change and preserve prior model versions.'))
                assert r['sources'] == old['sources']
                assert all(r['analyses'][k] == v for k,v in old['analyses'].items())
                assert r['options'][1] == old['options'][1]
                changed = r['analyses'][r['options'][0]['analysisId']]
                if kind == 'lbo':
                    mm = metrics(changed)
                    assert mm['cashShortfall'] > 0 and mm['irr'] is None and mm['moic'] is None
                    assert changed['lineage']['irr']['value'] is None
                    checks.append('LBO: unfunded operating gaps suppress IRR/MOIC instead of assuming an unrequested financing cure')
                else: assert metrics(changed)['offerPrice'] < m['offerPrice']
                req(path+'/scenario', dict(expectedRevision=old['revision'], optionId='base',
                    params=params, rationale='Stale model change must fail.'), 409)
                invalid = {**params, 'years': 2.5} if kind == 'lbo' else {**params, 'offerDiscount': 99}
                req(path+'/scenario', dict(expectedRevision=r['revision'], optionId='base',
                    params=invalid, rationale='Out-of-domain financial assumption must fail.'), 400)
                assert req('/api/agent/rooms/'+r['id']) == r
                checks.append(kind + ': scoped recalculation preserves source/prior/other-action snapshots and rejects stale or invalid edits')
                rooms.append(r)
            proc.terminate(); proc.wait(timeout=5)
            proc, token = boot()
            assert all(req('/api/agent/rooms/'+r['id']) == r for r in rooms)
            checks.append('IPO and LBO models, schedules, lineage, amendments and materials survive process restart unchanged')
        finally:
            proc.terminate(); proc.wait(timeout=5)
    print(json.dumps({'checksPassed': len(checks), 'checks': checks, 'externalCalls': 0,
        'scope': 'Hypothetical deterministic models; no underwriting, human acceptance or productivity claim'}, indent=2))


if __name__ == '__main__':
    main()
