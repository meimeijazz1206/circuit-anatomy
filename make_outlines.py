"""把已建好的賽道壓成一條小小的 SVG path，給首頁的縮圖用。

首頁不需要載入整份賽道資料（每條上百 KB），只需要輪廓。
用法：python3 make_outlines.py
"""
import glob, json, os

VIEW = 100      # viewBox 邊長
PAD = 8
KEEP = 4        # 每幾個取樣點取一個，縮圖不需要那麼細


def outline(path):
    t = json.load(open(path))
    xs = [p['x'] for p in t['points']]
    ys = [p['y'] for p in t['points']]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    k = (VIEW - PAD * 2) / max(x1 - x0, y1 - y0)
    ox = PAD + ((VIEW - PAD * 2) - (x1 - x0) * k) / 2
    oy = PAD + ((VIEW - PAD * 2) - (y1 - y0) * k) / 2
    pts = []
    for i in range(0, len(xs), KEEP):
        # 螢幕的 y 往下，緯度方向要翻過來
        pts.append(f'{ox + (xs[i] - x0) * k:.1f},{VIEW - (oy + (ys[i] - y0) * k):.1f}')
    return 'M' + 'L'.join(pts) + 'Z'


def main():
    out = {}
    for path in sorted(glob.glob('data/*_track.json')):
        tid = os.path.basename(path).replace('_track.json', '')
        out[tid] = outline(path)
        print(tid, len(out[tid]), 'chars')
    with open('tracks/outlines.js', 'w') as f:
        f.write('export const OUTLINES = ' + json.dumps(out) + ';\n')


if __name__ == '__main__':
    main()
