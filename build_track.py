"""從 Overpass 原始資料組出賽道中心線，投影成公尺座標，輸出 data/<id>_track.json。

用法：python3 build_track.py <id>

三種串接方式，依設定擇一：
  solve  ：交給 find_loop.py，列舉所有封閉迴圈、挑最接近官方全長的（常設賽道）
  graph  ：路口層級的求解（街道賽：雙向車道、T 字路口、平常是人行道的路段）
  order  ：直接指定路段順序（巴林：照 OSM relation）
  chain  ：從 start_way 沿端點貪婪串接（鈴鹿、Monza 當初的做法）
start_pit：起跑線所在直線旁的 Pit Lane way id，取它的中點當起跑線；'auto' 則自動挑貼著賽道的那條
"""
import json, math, os, re, sys
from collections import defaultdict

TRACKS = {
    'suzuka': {
        'raw': 'data/suzuka_raw.json',
        'start_way': 183391665,                 # メインストレート
        'exclude_ids': {120917578, 153525062, 153525698, 411295350},
        'id_range': (175231434, 500000000),     # 排除園區遊樂設施的新 way
        'exclude_name': None,
        'official_m': 5807,
    },
    'monza': {
        'raw': 'data/monza_raw.json',
        'start_way': 19842206,                  # Rettifilo di partenza
        'exclude_ids': {38168747, 38168756},    # Pit Lane、機車用的減速彎變體
        'id_range': None,
        # 高速環道（已廢棄的傾斜賽道）、Junior 賽道、Pirelli 舊道都不是 GP 路線
        'exclude_name': re.compile(r'Sopraelevata|anello|Raccordo|Pirelli|Tondo|Rettilineo anello'),
        'official_m': 5793,
    },
    'bahrain': {
        'raw': 'data/bahrain_raw.json',
        # 這裡有六種配置疊在一起（GP、Inner、Outer、Endurance…），貪婪串接會走錯岔路。
        # 直接用 OSM 的「Bahrain Grand Prix Circuit」relation（284538）給的路段順序。
        'order': [4818385, 881756729, 881756728],
        'start_way': 4818385,
        'exclude_ids': set(),
        'id_range': None,
        'exclude_name': None,
        'official_m': 5412,
    },
    'sepang': {
        'raw': 'data/sepang_raw.json',
        'solve': True,
        'start_pit': 144359483,     # 在 Kuala Lumpur Straight（主直線）旁
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5543,
    },
    'americas': {
        'raw': 'data/americas_raw.json',
        'solve': True,
        'start_pit': 'auto',
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5513,
    },
    'rodriguez': {
        'raw': 'data/rodriguez_raw.json',
        'solve': True,
        'start_pit': 'auto',
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 4304,
    },
    'interlagos': {
        'raw': 'data/interlagos_raw.json',
        'solve': True,
        'start_pit': 'auto',
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 4309,
    },
    'vegas': {
        'raw': 'data/vegas_raw.json', 'graph': True, 'start_pit': 1223479152, 'official_m': 6201,
    },
    'losail': {
        'raw': 'data/losail_raw.json',
        'solve': True,
        'start_pit': 196193732,     # Pit Lane（主直線旁）
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5419,
    },
    'yas_marina': {
        'raw': 'data/yas_marina_raw.json',
        'solve': True,
        'start_pit': 'auto',
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5281,
    },
    'albert_park': {
        'raw': 'data/albert_park_raw.json', 'graph': True, 'official_m': 5278,
    },
    'shanghai': {
        'raw': 'data/shanghai_raw.json',
        # OSM 把整圈畫成一條首尾閉合的 way（156328670），其餘都是維修區與支線；直接指定
        'order': [156328670],
        'start_way': 156328670,
        'start_pit': 107371138,     # 主直線旁的維修區（沒有標籤，用位置判斷）
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5451,
    },
    'miami': {
        'raw': 'data/miami_raw.json',
        'solve': True,
        'start_pit': 1017340352,    # Pit Lane
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5412,
    },
    'villeneuve': {
        'raw': 'data/villeneuve_raw.json',
        # OSM 把整圈畫成一條首尾閉合、單行的 way（136717490）；另一條 413000959 是維修區
        'order': [136717490],
        'start_way': 136717490,
        'start_pit': 413000959,
        'exclude_ids': {413000959}, 'id_range': None, 'exclude_name': None,
        'official_m': 4361,
    },
    'monaco': {
        'raw': 'data/monaco_raw.json', 'graph': True, 'start_pit': 850261588, 'official_m': 3337,
    },
    'catalunya': {
        'raw': 'data/catalunya_raw.json',
        'solve': True,
        'start_pit': 178416729,     # Pit Lane
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 4657,
    },
    'red_bull_ring': {
        'raw': 'data/red_bull_ring_raw.json', 'solve': True, 'start_pit': 289111668,   # Boxenstraße
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None, 'official_m': 4318,
    },
    'spa': {
        'raw': 'data/spa_raw.json', 'solve': True, 'start_pit': 323851541,             # Pit Lane
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None, 'official_m': 7004,
    },
    'hungaroring': {
        'raw': 'data/hungaroring_raw.json', 'solve': True, 'start_pit': 231417580,     # Bokszutca（維修區）
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None, 'official_m': 4381,
    },
    'zandvoort': {
        'raw': 'data/zandvoort_raw.json', 'solve': True, 'start_pit': 38144527,        # Pitstraat
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None, 'official_m': 4259,
    },
    'silverstone': {
        'raw': 'data/silverstone_raw.json',
        # OSM 有 GP、International、Stowe 三種配置疊在一起，solve 找不到。直接用 relation「Silverstone Grand Prix」
        # 的成員順序（清單裡有重複項目，去重後從 Abbey 開始走一圈），全部是單行、依 way 的方向
        'order': [169854842, 169800226, 169800223, 169800225, 169848882, 169800224, 169800222, 169618242,
                  169618240, 169618241, 169618245, 169609611, 169730588, 3571477, 169730585, 169730587,
                  169733768, 169730586, 430075118, 169733766, 169733769, 169733770, 169848880, 169848884,
                  169848881, 55224168, 55224167],
        'start_way': 169854842,
        'start_pit': 227902927,     # International pit lane（Hamilton Straight 旁）
        'exclude_ids': set(), 'id_range': None, 'exclude_name': None,
        'official_m': 5891,
    },
    'baku': {
        'raw': 'data/baku_raw.json', 'graph': True, 'start_pit': 1513267145, 'official_m': 6003,
    },
    'marina_bay': {
        'raw': 'data/marina_bay_raw.json', 'graph': True, 'start_pit': 'auto', 'official_m': 4940,
    },
}


def key(p):
    return (round(p['lat'], 7), round(p['lon'], 7))


def load_ways(cfg):
    els = {e['id']: e for e in json.load(open(cfg['raw']))['elements'] if e.get('geometry')}
    out = {}
    for i, e in els.items():
        if i in cfg['exclude_ids']:
            continue
        if cfg['id_range'] and not (cfg['id_range'][0] <= i < cfg['id_range'][1]):
            continue
        if cfg['exclude_name'] and cfg['exclude_name'].search(e.get('tags', {}).get('name') or ''):
            continue
        out[i] = e
    return out


def chain(ways, start):
    """從起點沿著端點相接的 way 走一圈，走回原點為止。"""
    ends = defaultdict(list)
    for i, e in ways.items():
        g = e['geometry']
        ends[key(g[0])].append((i, 's'))
        ends[key(g[-1])].append((i, 'e'))
    order, used = [(start, 's')], {start}
    cur = key(ways[start]['geometry'][-1])
    home = key(ways[start]['geometry'][0])
    while True:
        nxt = [x for x in ends[cur] if x[0] not in used]
        if not nxt:
            break
        fwd = [x for x in nxt if x[1] == 's']      # 單行道優先順向接
        i, d = (fwd or nxt)[0]
        used.add(i)
        order.append((i, d))
        g = ways[i]['geometry']
        cur = key(g[-1]) if d == 's' else key(g[0])
        if cur == home:
            break
    return order


def points(ways, order):
    pts = []
    for i, d in order:
        g = ways[i]['geometry']
        if d == 'e':
            g = g[::-1]
        name = ways[i].get('tags', {}).get('name')
        for p in g:
            if pts and abs(p['lat'] - pts[-1][0]) < 1e-7 and abs(p['lon'] - pts[-1][1]) < 1e-7:
                continue
            pts.append((p['lat'], p['lon'], name))
    return pts


def project(pts):
    lat0 = sum(p[0] for p in pts) / len(pts)
    lon0 = sum(p[1] for p in pts) / len(pts)
    mlat = 111132.92 - 559.82 * math.cos(2 * math.radians(lat0))
    mlon = 111412.84 * math.cos(math.radians(lat0))
    return [((p[1] - lon0) * mlon, (p[0] - lat0) * mlat, p[2]) for p in pts], (lat0, lon0)


def auto_pit(raw, pts):
    """自動挑起跑線：在所有 Pit Lane 裡，找「整條都貼著賽道」的那一條，取它的中點。"""
    from find_loop import pit_lanes
    def d(a, b):
        return math.hypot((a[1] - b[1]) * 111320 * math.cos(math.radians(a[0])), (a[0] - b[0]) * 110950)
    best, score = None, 1e9
    for e in pit_lanes(raw):
        g = e['geometry']
        if len(g) < 2:
            continue
        avg = sum(min(d((p['lat'], p['lon']), q) for q in pts[::2]) for p in g) / len(g)
        if avg < score:
            best, score = e['id'], avg
    return pit_midpoint(raw, best) if best else None


def pit_midpoint(raw, way_id):
    """Pit Lane 的中點（依長度算，不是依節點數）。發車格在維修區旁，拿來近似起跑線。"""
    g = next(e for e in json.load(open(raw))['elements'] if e['id'] == way_id)['geometry']
    kx = math.cos(math.radians(g[0]['lat']))
    seg = [math.hypot((b['lon'] - a['lon']) * 111320 * kx, (b['lat'] - a['lat']) * 110950)
           for a, b in zip(g, g[1:])]
    half, acc = sum(seg) / 2, 0.0
    for (a, b), l in zip(zip(g, g[1:]), seg):
        if acc + l >= half:
            f = (half - acc) / (l or 1)
            return [a['lat'] + (b['lat'] - a['lat']) * f, a['lon'] + (b['lon'] - a['lon']) * f]
        acc += l
    return [g[-1]['lat'], g[-1]['lon']]


def main(tid):
    cfg = TRACKS[tid]
    if cfg.get('graph'):
        from find_loop import graph_loop_points, DIRECTION
        pts, info = graph_loop_points(cfg['raw'], cfg['official_m'], DIRECTION[tid])
        start_at = (auto_pit(cfg['raw'], pts) if cfg.get('start_pit') == 'auto'
                    else pit_midpoint(cfg['raw'], cfg['start_pit']) if cfg.get('start_pit') else None)
        return finish(tid, cfg, pts, start_at, [f"路口圖求解，{DIRECTION[tid]}"])
    if cfg.get('solve'):
        from find_loop import best_loop
        ways, res = best_loop(cfg['raw'], cfg['official_m'])
        order = [(abs(w), 's' if w > 0 else 'e') for w in res[0][1]]
    else:
        ways = load_ways(cfg)
        order = ([(w, 's') for w in cfg['order']] if cfg.get('order')
                 else chain(ways, cfg['start_way']))
    pts = points(ways, order)
    start_at = (auto_pit(cfg['raw'], pts) if cfg.get('start_pit') == 'auto'
                else pit_midpoint(cfg['raw'], cfg['start_pit']) if cfg.get('start_pit') else None)
    return finish(tid, cfg, pts, start_at,
                  [f"{i} {ways[i].get('tags', {}).get('name')}" for i, d in order])


def finish(tid, cfg, pts, start_at, notes):
    xy, origin = project(pts)

    dist = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(xy, xy[1:]))
    dist += math.hypot(xy[0][0] - xy[-1][0], xy[0][1] - xy[-1][1])
    off = (dist - cfg['official_m']) / cfg['official_m'] * 100
    print(f'{tid}: segments={len(notes)} points={len(xy)} '
          f'length={dist:.1f} m (官方 {cfg["official_m"]} m, 差 {off:+.2f}%)')
    for n in notes:
        print('   ', n)

    # 重跑時保留已經抓過的高程（同一個點就沿用），不然得重新打幾百次 DEM API
    out_path = f'data/{tid}_track.json'
    old_z = {}
    if os.path.exists(out_path):
        for p in json.load(open(out_path)).get('points', []):
            if p.get('z') is not None:
                old_z[(round(p['lat'], 7), round(p['lon'], 7))] = p['z']
    kept = sum(1 for p in pts if (round(p[0], 7), round(p[1], 7)) in old_z)
    if old_z:
        print(f'    沿用高程 {kept}/{len(pts)} 點')
    json.dump({
        'name': tid,
        'origin': {'lat': origin[0], 'lon': origin[1]},
        'start_at': start_at,
        'length_m': round(dist, 1),
        'points': [{'lat': p[0], 'lon': p[1], 'x': round(q[0], 2), 'y': round(q[1], 2), 'seg': p[2],
                    'z': old_z.get((round(p[0], 7), round(p[1], 7)))}
                   for p, q in zip(pts, xy)],
    }, open(f'data/{tid}_track.json', 'w'), ensure_ascii=False)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'suzuka')
