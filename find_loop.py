"""在一堆 raceway 路段裡，找出長度最接近官方數字的那一圈。

多數賽道在 OSM 上有好幾種配置共用路段（GP、短版、機車版、維修區），
單純沿端點串接很容易走錯岔路。這裡把路段當成有向圖（依 oneway 方向），
列舉所有經過「起點路段」的封閉迴圈，挑長度最接近官方全長的那一個。

用法：python3 find_loop.py data/sepang_raw.json 5543 [起點 way id]
"""
import json, math, sys
from collections import defaultdict

# 只排除真正的維修區車道。不能只比對 'Pit'——銀石的 National Pit Straight 就是 GP 賽道的一部分
SKIP = ('Pit Lane', 'Pit lane', 'pit lane', 'Pitlane', 'pitlane', 'Pit Road',
        'Kart', 'kart', 'Drag', 'Motocross', 'Motorcross', 'Handling', 'Paddock')


def length_m(g):
    lat0 = sum(p['lat'] for p in g) / len(g)
    kx = math.cos(math.radians(lat0))
    return sum(math.hypot((b['lon'] - a['lon']) * 111320 * kx, (b['lat'] - a['lat']) * 110950)
               for a, b in zip(g, g[1:]))


def key(p):
    return (round(p['lat'], 7), round(p['lon'], 7))


def load(path, include_all=False):
    """include_all：街道賽的路段是一般道路（primary、secondary…），不只收 raceway。
    這時資料本身只含 raceway 與 circuit relation 的成員，所以全收也不會混進整個城市的路網。"""
    d = json.load(open(path))
    ways = {}
    for e in d['elements']:
        if e['type'] != 'way' or not e.get('geometry'):
            continue
        t = e.get('tags', {})
        name = t.get('name') or t.get('name:en') or ''
        if any(s in name for s in SKIP):
            continue
        # 街道賽有些路段平常是人行道或服務道路（新加坡的 Fullerton Road），比賽週才變成賽道，
        # 所以 include_all 模式不看道路等級，只要是 circuit relation 的成員就收
        if not include_all and t.get('highway') in ('service', 'footway', 'path'):
            continue
        if not include_all and (t.get('highway') != 'raceway' or t.get('tunnel') == 'yes'):
            continue
        ways[e['id']] = e
    return ways


def loops(ways, start, target, max_ways=60, budget=400_000):
    """從 start 路段出發，列舉回到起點的有向迴圈。budget 限制展開次數，避免路網太密時跑不完。"""
    out = defaultdict(list)
    for i, e in ways.items():
        g = e['geometry']
        out[key(g[0])].append((i, key(g[-1])))
        if e.get('tags', {}).get('oneway') not in ('yes', '1'):
            out[key(g[-1])].append((-i, key(g[0])))      # 負號＝反向走
    lens = {i: length_m(e['geometry']) for i, e in ways.items()}
    home = key(ways[start]['geometry'][0])
    found = []
    steps = [0]

    def dfs(node, path, total, used):
        steps[0] += 1
        if steps[0] > budget or len(path) > max_ways or total > target * 1.3:
            return
        for w, nxt in out[node]:
            if abs(w) in used:
                continue
            t = total + lens[abs(w)]
            if nxt == home:
                found.append((t, path + [w]))
            else:
                dfs(nxt, path + [w], t, used | {abs(w)})

    dfs(key(ways[start]['geometry'][-1]), [start], lens[start], {start})
    return sorted(found, key=lambda x: abs(x[0] - target))


def best_loop(path, target, start=None, include_all=False):
    ways = load(path, include_all)
    starts = [start] if start else sorted(ways, key=lambda i: -length_m(ways[i]['geometry']))[:6]
    best = []
    for s in starts:
        best += loops(ways, s, target)
    # 同一圈從不同起點出發會重複出現，用路段集合去重
    seen, uniq = set(), []
    for t, p in sorted(best, key=lambda x: abs(x[0] - target)):
        k = frozenset(abs(w) for w in p)
        if k not in seen:
            seen.add(k)
            uniq.append((t, p))
    return ways, uniq


if __name__ == '__main__':
    path, target = sys.argv[1], float(sys.argv[2])
    start = int(sys.argv[3]) if len(sys.argv) > 3 else None
    ways, res = best_loop(path, target, start)
    print(f'{len(res)} 個不同的迴圈，最接近官方 {target:.0f} m 的前 4 個：')
    for t, p in res[:4]:
        names = [ways[abs(w)].get('tags', {}).get('name') or '-' for w in p]
        print(f'  {t:7.1f} m  差 {100 * (t - target) / target:+.2f}%  {len(p)} 段')
        print('    ', ' → '.join(f'{abs(w)}{"(反)" if w < 0 else ""}:{n}' for w, n in zip(p, names)))


# ---------------------------------------------------------------------------
# 街道賽用：路口層級的圖
# 街道賽的 relation 會把雙向道路的兩條車道都收進來，路段也常在別條路中間接上（T 字路口），
# 而且市區單行道的方向不一定等於比賽方向。所以：
#   1. 用 node id 找出所有路口（被兩條以上路段共用、或是路段端點的 node）
#   2. 把每條路段在路口切開，得到「路口到路口」的邊
#   3. 忽略單行道，找不重複經過路口、長度最接近官方數字的簡單迴圈
# ---------------------------------------------------------------------------

def _seg_len(a, b):
    kx = math.cos(math.radians(a['lat']))
    return math.hypot((b['lon'] - a['lon']) * 111320 * kx, (b['lat'] - a['lat']) * 110950)


def build_graph(ways):
    use = defaultdict(int)
    for e in ways.values():
        ids = e['nodes']
        for n in ids:
            use[n] += 1
        use[ids[0]] += 1          # 端點一定算路口
        use[ids[-1]] += 1
    junction = {n for n, c in use.items() if c >= 2}
    edges = []                    # (u, v, length, way_id, geometry)
    for wid, e in ways.items():
        ids, g = e['nodes'], e['geometry']
        start, acc = 0, 0.0
        for k in range(1, len(ids)):
            acc += _seg_len(g[k - 1], g[k])
            if ids[k] in junction:
                edges.append((ids[start], ids[k], acc, wid, g[start:k + 1]))
                start, acc = k, 0.0
    adj = defaultdict(list)
    for idx, (u, v, l, wid, g) in enumerate(edges):
        if u == v:
            continue
        adj[u].append((v, idx))
        adj[v].append((u, idx))

    # 補縫：OSM 常有兩段路差幾公尺沒接上（摩納哥、銀石都有）。
    # 斷頭的路口，接到 SNAP 公尺內最近的另一個路口。
    SNAP = 25
    pos = {}
    for e in ways.values():
        for n, p in zip(e['nodes'], e['geometry']):
            pos[n] = p
    dead = [n for n, v in adj.items() if len(v) == 1]
    for n in dead:
        best = min((m for m in adj if m != n and m != adj[n][0][0]),
                   key=lambda m: _seg_len(pos[n], pos[m]), default=None)
        if best is not None and _seg_len(pos[n], pos[best]) <= SNAP:
            l = _seg_len(pos[n], pos[best])
            edges.append((n, best, l, 0, [pos[n], pos[best]]))
            adj[n].append((best, len(edges) - 1))
            adj[best].append((n, len(edges) - 1))
    return edges, adj


def best_loop_graph(path, target, tol=0.12, budget=3_000_000):
    ways = {i: e for i, e in load(path, include_all=True).items() if e.get('nodes')}
    edges, adj = build_graph(ways)
    found = []
    steps = [0]
    # 從最長的幾條邊出發（主直線通常在裡面）
    seeds = sorted(range(len(edges)), key=lambda i: -edges[i][2])[:8]
    for s in seeds:
        u0, v0, l0 = edges[s][0], edges[s][1], edges[s][2]

        def dfs(node, total, path_e, seen):
            steps[0] += 1
            if steps[0] > budget or total > target * (1 + tol):
                return
            for nxt, ei in adj[node]:
                if ei in path_e:
                    continue
                t = total + edges[ei][2]
                if nxt == u0 and len(path_e) > 2:
                    if abs(t - target) <= target * tol:
                        found.append((t, path_e + [ei]))
                    continue
                if nxt in seen:
                    continue
                dfs(nxt, t, path_e + [ei], seen | {nxt})

        dfs(v0, l0, [s], {u0, v0})
    uniq, keys = [], set()
    for t, p in sorted(found, key=lambda x: abs(x[0] - target)):
        k = frozenset(p)
        if k not in keys:
            keys.add(k)
            uniq.append((t, p))
    return edges, uniq, steps[0]


# 比賽方向。不能靠單行道標籤判斷：街道賽的 oneway 是平日交通方向，
# 新加坡就剛好跟比賽方向相反。cw＝順時針、ccw＝逆時針
DIRECTION = {
    'albert_park': 'cw', 'shanghai': 'cw', 'suzuka': 'cw', 'miami': 'ccw', 'villeneuve': 'cw',
    'monaco': 'cw', 'catalunya': 'cw', 'red_bull_ring': 'cw', 'silverstone': 'cw', 'spa': 'cw',
    'hungaroring': 'cw', 'zandvoort': 'cw', 'monza': 'cw', 'baku': 'ccw', 'sepang': 'cw',
    'bahrain': 'cw', 'marina_bay': 'ccw', 'americas': 'ccw', 'rodriguez': 'cw',
    'interlagos': 'ccw', 'vegas': 'ccw', 'losail': 'cw', 'yas_marina': 'ccw',
}


def signed_area(pts):
    """經緯度多邊形的有號面積（>0 逆時針、<0 順時針）。"""
    kx = math.cos(math.radians(pts[0][0]))
    return sum((a[1] * kx) * b[0] - (b[1] * kx) * a[0] for a, b in zip(pts, pts[1:] + pts[:1])) / 2


def graph_loop_points(path, target, direction):
    """把路口圖解出來的迴圈，還原成依行駛順序排列的點 [(lat, lon, 路段名稱)]，並轉成指定方向。"""
    ways = {i: e for i, e in load(path, include_all=True).items() if e.get('nodes')}
    edges, loops, _ = best_loop_graph(path, target)
    if not loops:
        return None, None
    total, loop = loops[0]
    u0, v0 = edges[loop[0]][0], edges[loop[0]][1]
    pts, node, votes = [], u0, 0
    for ei in loop:
        u, v, l, wid, g = edges[ei]
        fwd = (u == node)
        seq = g if fwd else g[::-1]
        node = v if fwd else u
        if wid and ways.get(wid, {}).get('tags', {}).get('oneway') in ('yes', '1'):
            votes += 1 if fwd else -1
        name = ways.get(wid, {}).get('tags', {}).get('name') if wid else None
        for p in (seq if not pts else seq[1:]):
            pts.append((p['lat'], p['lon'], name))
    if (signed_area(pts) > 0) != (direction == 'ccw'):
        pts.reverse()
    return pts, {'length': total, 'oneway_votes': votes}


def pit_lanes(path):
    d = json.load(open(path))
    return [e for e in d['elements'] if e['type'] == 'way' and e.get('geometry') and
            any(k in (e.get('tags', {}).get('name') or '') for k in ('Pit Lane', 'Pit lane', 'pit lane', 'Pitlane'))
            or (e['type'] == 'way' and e.get('tags', {}).get('service') == 'pit_lane')]
