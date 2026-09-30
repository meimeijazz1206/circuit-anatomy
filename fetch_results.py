"""抓 2026 年每站正賽名次，輸出 tracks/results.js 給首頁用。

每跑完一站重跑一次就會更新：python3 fetch_results.py
資料來源：Jolpica F1 API（Ergast 的後繼者，公開免費）。
"""
import json, time, urllib.request

SEASON = 2026
API = 'https://api.jolpi.ca/ergast/f1/{season}/results.json?limit=100&offset={offset}'
TOP = 10        # 每站留前 10 名（有積分的名次）


def fetch_all():
    races, offset = {}, 0
    while True:
        with urllib.request.urlopen(API.format(season=SEASON, offset=offset), timeout=30) as r:
            m = json.load(r)['MRData']
        for race in m['RaceTable']['Races']:
            # 分頁會把同一站切成兩半，要用 round 合併
            races.setdefault(race['round'], {**race, 'Results': []})['Results'] += race['Results']
        offset += int(m['limit'])
        if offset >= int(m['total']):
            break
        time.sleep(0.4)          # 對公開 API 客氣一點
    return races


STAND = 'https://api.jolpi.ca/ergast/f1/{season}/{kind}.json?limit=100'


def fetch_standings():
    """車手／車隊積分榜（跑完幾站就是幾站後的累計）。"""
    out = {}
    for kind, key in (('driverstandings', 'DriverStandings'), ('constructorstandings', 'ConstructorStandings')):
        with urllib.request.urlopen(STAND.format(season=SEASON, kind=kind), timeout=30) as r:
            lst = json.load(r)['MRData']['StandingsTable']['StandingsLists'][-1]
        out['round'] = int(lst['round'])
        rows = []
        for x in lst[key]:
            row = {'p': int(x['position']), 'pts': float(x['points']), 'wins': int(x['wins'])}
            if key == 'DriverStandings':
                d = x['Driver']
                row.update(no=d.get('permanentNumber', ''), code=d.get('code') or d['familyName'][:3].upper(),
                           name=f"{d['givenName']} {d['familyName']}", team=x['Constructors'][-1]['name'])
            else:
                row['team'] = x['Constructor']['name']
            rows.append(row)
        out['drivers' if key == 'DriverStandings' else 'teams'] = rows
        time.sleep(0.4)
    return out


def main():
    # calendar.js 也是從同一個 API 產生的，回合編號一致，直接用 round 對應
    out, unmatched = {}, []
    for race in fetch_all().values():
        r = int(race['round'])
        rows = sorted(race['Results'], key=lambda x: int(x['position']))[:TOP]
        out[r] = [{
            'p': int(x['position']),
            'no': x['Driver'].get('permanentNumber') or x.get('number', ''),
            'code': x['Driver'].get('code') or x['Driver']['familyName'][:3].upper(),
            'name': f"{x['Driver']['givenName']} {x['Driver']['familyName']}",
            'team': x['Constructor']['name'],
            'time': (x.get('Time') or {}).get('time') or x['status'],
            'pts': float(x['points']),
        } for x in rows]

    with open('tracks/results.js', 'w', encoding='utf-8') as f:
        f.write(f'// 由 fetch_results.py 產生，{time.strftime("%Y-%m-%d %H:%M")} 更新\n')
        f.write(f'export const UPDATED = {json.dumps(time.strftime("%Y-%m-%d"))};\n')
        f.write('export const RESULTS = ' + json.dumps(out, ensure_ascii=False) + ';\n')

    st = fetch_standings()
    with open('tracks/standings.js', 'w', encoding='utf-8') as f:
        f.write(f'// 由 fetch_results.py 產生，{time.strftime("%Y-%m-%d %H:%M")} 更新\n')
        f.write('export const STANDINGS = ' + json.dumps(st, ensure_ascii=False) + ';\n')
    print(f"積分榜：第 {st['round']} 站後，車手 {len(st['drivers'])} 位、車隊 {len(st['teams'])} 隊")

    print(f'{len(out)} 站有名次：' + ' '.join(f'R{r}' for r in sorted(out)))
    for r in sorted(out):
        print(f'  R{r:02d}  ' + '  '.join(f"P{x['p']} {x['code']}" for x in out[r][:3]))
    if unmatched:
        print('對不上賽程的：', unmatched)


if __name__ == '__main__':
    main()
