"""從 Jolpica F1 API 產生 calendar.js（賽程、正賽開始時間）。

賽程與名次用同一個來源，回合編號才不會對不上。
先前手抄官方賽程頁，漏掉了兩個改地點的站（R14 改馬德里、R16 巴林移師馬來西亞），
所以改成程式產生。賽季中有異動就重跑：python3 make_calendar.py
"""
import json, urllib.request
from datetime import datetime, timedelta, timezone

SEASON = 2026
API = f'https://api.jolpi.ca/ergast/f1/{SEASON}/races.json?limit=40'
TPE = timezone(timedelta(hours=8))   # 頁面上的日期一律用台灣時間

# circuitId → 顯示用資料：中文站名、國旗（比賽實際所在地）、英文站名、三碼、賽道名、城市
CIRCUITS = {
    'albert_park':   ('澳洲', '🇦🇺', 'AUSTRALIA', 'AUS', 'Albert Park', 'Melbourne'),
    'shanghai':      ('中國', '🇨🇳', 'CHINA', 'CHN', 'Shanghai', 'Shanghai'),
    'suzuka':        ('日本', '🇯🇵', 'JAPAN', 'JPN', 'Suzuka', '鈴鹿'),
    'miami':         ('邁阿密', '🇺🇸', 'MIAMI', 'MIA', 'Miami', 'Miami'),
    'villeneuve':    ('加拿大', '🇨🇦', 'CANADA', 'CAN', 'Gilles Villeneuve', 'Montréal'),
    'monaco':        ('摩納哥', '🇲🇨', 'MONACO', 'MON', 'Monaco', 'Monte Carlo'),
    'catalunya':     ('巴塞隆納', '🇪🇸', 'BARCELONA', 'BCN', 'Barcelona-Catalunya', 'Barcelona'),
    'red_bull_ring': ('奧地利', '🇦🇹', 'AUSTRIA', 'AUT', 'Red Bull Ring', 'Spielberg'),
    'silverstone':   ('英國', '🇬🇧', 'BRITAIN', 'GBR', 'Silverstone', 'Silverstone'),
    'spa':           ('比利時', '🇧🇪', 'BELGIUM', 'BEL', 'Spa-Francorchamps', 'Spa'),
    'hungaroring':   ('匈牙利', '🇭🇺', 'HUNGARY', 'HUN', 'Hungaroring', 'Budapest'),
    'zandvoort':     ('荷蘭', '🇳🇱', 'NETHERLANDS', 'NED', 'Zandvoort', 'Zandvoort'),
    'monza':         ('義大利', '🇮🇹', 'ITALY', 'ITA', 'Monza', 'Monza'),
    'madring':       ('西班牙', '🇪🇸', 'SPAIN', 'ESP', 'Madring', 'Madrid'),
    'baku':          ('亞塞拜然', '🇦🇿', 'AZERBAIJAN', 'AZE', 'Baku', 'Baku'),
    # 巴林大獎賽今年移師馬來西亞 Sepang；國旗標實際比賽地點
    'sepang':        ('巴林', '🇲🇾', 'BAHRAIN', 'BHR', 'Sepang（移師馬來西亞）', 'Sepang'),
    'marina_bay':    ('新加坡', '🇸🇬', 'SINGAPORE', 'SGP', 'Marina Bay', 'Singapore'),
    'americas':      ('美國', '🇺🇸', 'USA', 'USA', 'Circuit of the Americas', 'Austin'),
    'rodriguez':     ('墨西哥', '🇲🇽', 'MEXICO', 'MEX', 'Hermanos Rodríguez', 'México'),
    'interlagos':    ('巴西', '🇧🇷', 'BRAZIL', 'BRA', 'Interlagos', 'São Paulo'),
    'vegas':         ('拉斯維加斯', '🇺🇸', 'LAS VEGAS', 'LVG', 'Las Vegas', 'Las Vegas'),
    'losail':        ('卡達', '🇶🇦', 'QATAR', 'QAT', 'Losail', 'Lusail'),
    'yas_marina':    ('阿布達比', '🇦🇪', 'ABU DHABI', 'ABU', 'Yas Marina', 'Yas Island'),
}

# 已經建好的賽道：circuitId → 賽道頁 id
BUILT = {'suzuka': 'suzuka', 'monza': 'monza', 'sepang': 'sepang', 'marina_bay': 'marina_bay', 'americas': 'americas', 'rodriguez': 'rodriguez', 'interlagos': 'interlagos', 'vegas': 'vegas', 'losail': 'losail', 'yas_marina': 'yas_marina', 'albert_park': 'albert_park', 'shanghai': 'shanghai', 'miami': 'miami', 'villeneuve': 'villeneuve', 'monaco': 'monaco', 'catalunya': 'catalunya', 'red_bull_ring': 'red_bull_ring', 'spa': 'spa', 'hungaroring': 'hungaroring', 'zandvoort': 'zandvoort', 'silverstone': 'silverstone', 'baku': 'baku'}


def main():
    req = urllib.request.Request(API, headers={'User-Agent': 'circuit-anatomy/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        races = json.load(r)['MRData']['RaceTable']['Races']

    rows, missing = [], []
    for x in races:
        cid = x['Circuit']['circuitId']
        if cid not in CIRCUITS:
            missing.append(cid)
            continue
        gp, flag, en, code, circuit, city = CIRCUITS[cid]
        start = datetime.fromisoformat(f"{x['date']}T{x.get('time', '12:00:00Z').rstrip('Z')}+00:00")
        rows.append({
            'r': int(x['round']), 'cid': cid, 'gp': gp, 'flag': flag, 'en': en, 'code': code,
            'circuit': circuit, 'city': city,
            'date': start.astimezone(TPE).strftime('%m-%d'),     # 台灣日期，給畫面顯示
            'start': start.strftime('%Y-%m-%dT%H:%M:%SZ'),       # 正賽開始（UTC），給倒數用
            'race': x['raceName'],
            'track': BUILT.get(cid),
        })

    with open('calendar.js', 'w', encoding='utf-8') as f:
        f.write(f'/* {SEASON} 年賽程。由 make_calendar.py 從 Jolpica F1 API 產生，勿手改。\n')
        f.write('   date 是台灣時間的日期；start 是正賽開始時間（UTC）。\n')
        f.write('   track 有值代表那條賽道已經建好、可以點進去。 */\n')
        f.write(f'export const SEASON = {SEASON};\n\nexport const CALENDAR = [\n')
        for row in rows:
            f.write('  ' + json.dumps(row, ensure_ascii=False) + ',\n')
        f.write('];\n')

    print(f'{len(rows)} 站寫入 calendar.js')
    for row in rows:
        print(f"  R{row['r']:02d} {row['date']} {row['flag']} {row['gp']:<6} {row['circuit']:<24} "
              f"{'✔ ' + row['track'] if row['track'] else ''}")
    if missing:
        print('CIRCUITS 裡沒有的賽道（要補中文名）：', missing)


if __name__ == '__main__':
    main()
