"""替中心線每個點取海拔，寫回 data/<id>_track.json。

用法：python3 fetch_elev.py suzuka|monza

日本境內用國土地理院 DEM（5 m 級，逐點查詢）；
其他地區用 open-meteo 的全球 elevation API（約 90 m 級，可批次）。
解析度差很多，粗的那種只適合高低差夠大的賽道，見 README。
"""
import json, sys, time, urllib.parse, urllib.request

GSI = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon={lon}&lat={lat}&outtype=JSON'
OPEN_METEO = 'https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}'

SOURCE = {'suzuka': 'gsi', 'monza': 'open-meteo', 'bahrain': 'open-meteo'}
SOURCE_DEFAULT = 'open-meteo'   # 日本以外的新賽道都用全球 DEM


def fetch_gsi(points):
    for n, p in enumerate(points):
        for attempt in range(3):
            try:
                with urllib.request.urlopen(GSI.format(lon=p['lon'], lat=p['lat']), timeout=15) as r:
                    e = json.load(r)['elevation']
                p['z'] = float(e) if e not in ('-----', None) else None
                break
            except Exception as ex:
                if attempt == 2:
                    print('fail', n, ex)
                    p['z'] = None
                time.sleep(1)
        time.sleep(0.05)
        if n % 50 == 0:
            print(n, p['z'], flush=True)


def fetch_open_meteo(points, batch=100):
    for s in range(0, len(points), batch):
        chunk = points[s:s + batch]
        url = OPEN_METEO.format(
            lat=','.join(f'{p["lat"]:.6f}' for p in chunk),
            lon=','.join(f'{p["lon"]:.6f}' for p in chunk))
        with urllib.request.urlopen(url, timeout=30) as r:
            elev = json.load(r)['elevation']
        for p, e in zip(chunk, elev):
            p['z'] = float(e)
        print(s, elev[0], flush=True)
        time.sleep(0.5)


def main(tid):
    path = f'data/{tid}_track.json'
    t = json.load(open(path))
    src = SOURCE.get(tid, SOURCE_DEFAULT)
    (fetch_gsi if src == 'gsi' else fetch_open_meteo)(t['points'])
    t['elev_source'] = src
    json.dump(t, open(path, 'w'), ensure_ascii=False)
    zs = [p['z'] for p in t['points'] if p.get('z') is not None]
    print(f'{tid} [{src}] ok={len(zs)}/{len(t["points"])} '
          f'min={min(zs):.1f} max={max(zs):.1f} range={max(zs) - min(zs):.1f} m')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'suzuka')
