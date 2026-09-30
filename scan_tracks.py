"""體檢：還沒建的賽道，OSM 資料能不能直接用。

對每條賽道抓兩種資料：
  1. 周圍所有 highway=raceway 的路段（常設賽道）
  2. type=circuit 的 relation 與它的成員路段（街道賽的路段是一般道路，只能靠這個）
然後用 find_loop 找最接近官方全長的封閉迴圈，看差多少。

用法：python3 scan_tracks.py            （結果寫到 data/scan.json）
"""
import json, os, time, urllib.parse, urllib.request
from find_loop import best_loop

UA = 'circuit-anatomy/1.0 (personal hobby project)'
MIRRORS = ['https://overpass-api.de/api/interpreter',
           'https://overpass.private.coffee/api/interpreter']

# circuitId: (官方全長 m, 搜尋半徑 m, 街道賽？)
TRACKS = {
    'albert_park': (5278, 2500, True),  'shanghai': (5451, 2500, False),
    'miami': (5412, 2000, True),        'villeneuve': (4361, 2500, True),
    'monaco': (3337, 1500, True),       'catalunya': (4657, 2000, False),
    'red_bull_ring': (4318, 2000, False), 'silverstone': (5891, 2500, False),
    'spa': (7004, 3500, False),         'hungaroring': (4381, 2000, False),
    'zandvoort': (4259, 2000, False),   'madring': (5474, 3000, True),
    'baku': (6003, 3000, True),         'marina_bay': (4940, 2500, True),
    'americas': (5513, 2500, False),    'rodriguez': (4304, 2500, False),
    'interlagos': (4309, 2000, False),  'vegas': (6201, 3500, True),
    'losail': (5419, 2500, False),      'yas_marina': (5281, 2500, False),
}


def coords():
    races = json.load(open('data/season_races.json'))['MRData']['RaceTable']['Races']
    return {r['Circuit']['circuitId']: (float(r['Circuit']['Location']['lat']),
                                        float(r['Circuit']['Location']['long'])) for r in races}


def overpass(q):
    for attempt in range(6):
        for url in MIRRORS:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                             headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=150) as r:
                    body = r.read()
                if body[:1] == b'{':
                    return json.loads(body)
            except Exception:
                pass
            time.sleep(8)
        time.sleep(20)
    return None


def main():
    pos = coords()
    report = json.load(open('data/scan.json')) if os.path.exists('data/scan.json') else {}
    for cid, (official, radius, street) in TRACKS.items():
        if cid in report and report[cid].get('best_m'):
            continue                       # 已經掃過的跳過，可以中斷後續跑
        lat, lon = pos[cid]
        q = (f'[out:json][timeout:120];('
             f'way(around:{radius},{lat},{lon})["highway"="raceway"];'
             f'rel(around:{radius},{lat},{lon})["type"="circuit"];'
             f');out geom;'
             f'rel(around:{radius},{lat},{lon})["type"="circuit"];way(r);out geom;')
        d = overpass(q)
        if d is None:
            report[cid] = {'error': 'overpass 失敗'}
            print(cid, 'overpass 失敗', flush=True)
            continue
        path = f'data/{cid}_raw.json'
        json.dump(d, open(path, 'w'))
        rels = [e.get('tags', {}).get('name') for e in d['elements'] if e['type'] == 'relation']
        try:
            ways, loops = best_loop(path, official, include_all=True)
            best = loops[0][0] if loops else None
        except Exception as ex:
            ways, best = {}, None
            print(cid, '解迴圈失敗', ex, flush=True)
        diff = (best - official) / official * 100 if best else None
        report[cid] = {'official_m': official, 'best_m': round(best, 1) if best else None,
                       'diff_pct': round(diff, 2) if diff is not None else None,
                       'ways': len(ways), 'relations': rels, 'street': street}
        print(f"{cid:14s} ways={len(ways):3d}  best={best and round(best)} m  "
              f"diff={diff and round(diff, 2)}%  rel={rels}", flush=True)
        json.dump(report, open('data/scan.json', 'w'), ensure_ascii=False, indent=1)
        time.sleep(6)


if __name__ == '__main__':
    main()
