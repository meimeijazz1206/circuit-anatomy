export const META = {
  index: '21',
  title: '荷蘭',
  flag: '🇳🇱',
  place: 'ZANDVOORT · NETHERLANDS',
  tagline: '沙丘旁的傾斜彎',
  facts: [
    { v: '4.259', k: '全長 KM' },
    { v: '14', k: '彎角數' },
    { v: '12', k: '時速 300 以上 %' },
  ],
  // OSM 的路段名稱對得上大部分的彎；3D 標籤用彎號，彎名依 OSM 與 oversteer48 補
  names: {},
  tagTurns: true,
  turnNames: {
    1: 'Tarzanbocht', 2: 'Gerlachbocht', 3: 'Hugenholtzbocht', 4: 'Hunserug', 5: 'Rob Slotemakerbocht',
    6: '右微彎', 7: 'Scheivlak', 8: 'Mastersbocht', 9: '右彎', 10: '左彎',
    11: 'Hans Ernst chicane', 12: 'Hans Ernst chicane', 13: '右彎', 14: 'Arie Luyendykbocht',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [3800, 200, '主直線'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap，全長 4,259 m（官方 4,259 m，誤差 0.00%）；OSM 有標維修區（Pitstraat），起跑線取它的中點推估。' +
        '彎號依 oversteer48 的 14 彎編號排定，OSM 的路段名稱對得上 T1–T5、T7–T8、T11–T12、T14；' +
        'T4–T6、T9–T10、T13 的左右方向只依曲率排定。幾個很弱的微彎不編號。速度為幾何推算的模型值。' +
        'DEM 只量到約 8 m 起伏，沒有可對照的公開數字，故畫成平面；' +
        '傾斜彎（T3、T14）的坡度在這個資料裡看不出來，畫面上是平的。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1–T3',
    sub: 'Tarzan to Hugenholtz',
    from: 100, to: 900,
    lead: '長右彎接右彎，再一個傾斜的左彎',
    why: [
      'T1 Tarzanbocht 是長長的右彎，模型算出彎心時速約 119 公里；T2 Gerlachbocht 接著是右彎，時速約 127 公里。',
      'T3 Hugenholtzbocht 是傾斜的左彎，公開資料說傾斜角約 18 度；模型時速約 109 公里。',
      '這是 F1 賽曆上少見的傾斜彎，傾斜的坡度在這份資料裡看不出來，畫面上是平的。'
    ],
    view: 'T3 外側看得到車子沿著傾斜面往上走，不同走線的差別很明顯。',
  },
  {
    id: 't11',
    label: 'T11–T12',
    sub: 'Hans Ernst chicane',
    from: 2900, to: 3200,
    lead: '出彎後短短一段直線，就是一個右左 chicane',
    why: [
      'T10 到 T11 之間約 450 公尺沒有明顯的彎，T11 是右彎，模型算出彎心時速約 80 公里，是全圈最慢的一點。',
      'T12 接著是左彎，模型時速約 109 公里；Hans Ernst chicane 在近年改版時被改成更有特色的樣子。',
      '直線盡頭的煞車點與 chicane 的走線，決定了接下來通往最終彎的速度。'
    ],
    view: 'chicane 外側看得到直線盡頭的煞車，路緣石是這裡的關鍵。',
  },
  {
    id: 't14',
    label: 'T14',
    sub: 'Arie Luyendykbocht',
    from: 3350, to: 4259,
    lead: '傾斜的最終彎，讓車子用更快的速度衝進主直線',
    why: [
      'T14 Arie Luyendykbocht 是傾斜的右彎，公開資料說傾斜角約 18 度，可以讓賽車更快進入起跑直線。',
      '模型算出這個彎的時速在 213 到 267 公里之間，是全圈最快的彎之一。',
      '出彎速度會一路帶進主直線。'
    ],
    view: 'T14 外側看得到車子沿著傾斜面出彎，接著衝上主直線。',
  },
];
