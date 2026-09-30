export const META = {
  index: '22',
  title: '英國',
  flag: '🇬🇧',
  place: 'SILVERSTONE · UNITED KINGDOM',
  tagline: 'Maggotts–Becketts 的高速換向',
  facts: [
    { v: '5.891', k: '全長 KM' },
    { v: '18', k: '彎角數' },
    { v: '15', k: '時速 300 以上 %' },
  ],
  // OSM 的路段名稱對得上每一個彎；3D 標籤用彎號，彎名依 Wikipedia 補
  names: {},
  tagTurns: true,
  turnNames: {
    1: 'Abbey', 2: 'Farm', 3: 'Village', 4: 'The Loop', 5: 'Aintree', 6: 'Brooklands',
    7: 'Luffield', 8: 'Woodcote', 9: 'Copse', 10: 'Maggotts', 11: 'Maggotts', 12: 'Becketts',
    13: 'Becketts', 14: 'Chapel', 15: 'Stowe', 16: 'Vale', 17: 'Club', 18: 'Club',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [5750, 240, 'Hamilton Straight'], [1200, 1800, 'Wellington Straight'], [4200, 4860, 'Hangar Straight'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap 的「Silverstone Grand Prix」relation 成員順序（OSM 裡 GP、International、Stowe 三種配置疊在一起，' +
        'solve 模式找不到；relation 清單有重複項目，去重後照順序走一圈），全長 5,888 m（官方 5,891 m）。' +
        '彎號依 Wikipedia 的 18 彎編號排定：T1、T2、T3、T6、T7、T9、T10–T13、T15–T18 有明確方向；' +
        'T4、T5、T8、T14 的方向導覽沒寫，由「10 右 8 左」的總數與曲率決定。OSM 有標維修區，起跑線取 International pit lane 中點推估。' +
        '速度為幾何推算的模型值。DEM 只量到約 12 m 起伏，沒有可對照的公開數字，故畫成平面。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1–T4',
    sub: 'Abbey to The Loop',
    from: 200, to: 1200,
    lead: '一連串右、左、右、左，最後是全曆最慢的彎',
    why: [
      'T1 Abbey 是右彎、T2 Farm 是快速的左彎，模型算出 T2 的彎心時速約 252 公里；接著 T3 Village 右彎、T4 The Loop 左彎，模型時速降到約 94 與 86 公里。',
      'T4 The Loop 是這條賽道唯一用形狀命名的彎，公開資料說它是全賽道最慢的一個。',
      '起跑後一路是右左右左的換向，煞車與加速交替。'
    ],
    view: 'T3 外側看得到 Village 的煞車，The Loop 內側能看到出彎後接上下一條直線。',
  },
  {
    id: 't10',
    label: 'T10–T14',
    sub: 'Maggotts to Chapel',
    from: 3400, to: 4260,
    lead: '左右左右的高速換向，一個接一個',
    why: [
      'Maggotts、Becketts、Chapel 連成一段：Wikipedia 說 T10 到 T13 是左、右、左、右，接著 T14 Chapel 是出口。',
      '模型算出 T10 的彎心時速約 283 公里，之後 T11、T12、T13 在約 158 到 187 公里之間，都是高速的換向。',
      '每個彎的出口是下一個彎的入口，走線一歪，後面整串都會受影響，接著是約 660 公尺的 Hangar Straight。'
    ],
    view: 'Maggotts 到 Becketts 外側看得到連續的高速換向，車子被甩開與否很明顯。',
  },
  {
    id: 't15',
    label: 'T15–T18',
    sub: 'Stowe to Club',
    from: 4860, to: 5800,
    lead: '長直線盡頭的右彎，接著 Vale 慢左彎和 Club 的兩個右彎',
    why: [
      'T14 到 T15 之間約 660 公尺沒有明顯的彎，T15 Stowe 是右彎，模型時速約 179 公里；T16 Vale 是慢左彎，模型時速只剩約 86 公里。',
      'Club 是連續兩個右彎（T17、T18），模型時速約 105 與 126 公里，出彎直接接上 Hamilton Straight。',
      'Club 出彎之後，就是通往 T1 的 Hamilton Straight。'
    ],
    view: 'Vale 外側看得到慢彎的煞車，Club 出彎能看到誰先拉開。',
  },
];
