export const META = {
  index: '19',
  title: '比利時',
  flag: '🇧🇪',
  place: 'SPA-FRANCORCHAMPS · BELGIUM',
  tagline: '全曆最長、起伏最大的一圈',
  facts: [
    { v: '7.004', k: '全長 KM' },
    { v: '103', k: '高低差 M' },
    { v: '19', k: '彎角數' },
  ],
  // OSM 的路段名稱對得上每一個彎，彎號依 oversteer48 的 19 彎編號排定
  names: {},
  tagTurns: true,
  turnNames: {
    1: 'La Source', 2: 'Eau Rouge', 3: 'Raidillon', 4: 'Raidillon', 5: 'Les Combes', 6: 'Les Combes',
    7: 'Malmedy', 8: 'Rivage', 9: 'Speaker\'s Corner', 10: 'Pouhon', 11: 'Pouhon',
    12: 'Fagnes', 13: 'Fagnes', 14: 'Stavelot', 15: 'Paul Frère', 16: 'Blanchimont', 17: 'Blanchimont',
    18: 'Bus Stop', 19: 'Bus Stop',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [1260, 2280, 'Kemmel 直線'], [6760, 250, '主直線'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap，全長 6,991 m（官方 7,004 m）；OSM 有標維修區，起跑線取它的中點推估。' +
        '彎號依 oversteer48 的 19 彎編號排定，OSM 的路段名稱（La Source、Eau Rouge、Raidillon…）對得上每一個彎，' +
        '19 彎逐一對過曲率的左右。Speaker\'s Corner 之後與 Paul Frère 之後有幾個弱右微彎，不編號。' +
        '速度為幾何推算的模型值。高程取自 open-meteo 全球 DEM（約 90 m 解析度），量到 103 m，公開資料 102.2 m，對得上；' +
        '不過 DEM 解析度低，Eau Rouge 的陡坡被抹平了，不要拿彎內的坡度數字當真。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't2',
    label: 'T2–T4',
    sub: 'Eau Rouge–Raidillon',
    from: 850, to: 1300,
    lead: '左右左的連續彎，爬上山坡',
    why: [
      'T2 Eau Rouge 是左彎、T3 是右彎、T4 又是左彎，模型算出三個彎心時速都在約 210 到 250 公里之間。',
      '賽道從這裡開始往山上爬，之後接上約 1,000 公尺的 Kemmel 直線。',
      '三個彎連續換向，走線一歪，Kemmel 直線上的速度就會差一大截。'
    ],
    view: 'Eau Rouge 外側看得到車子連續換向衝上山坡，Raidillon 頂端看得到出彎後接上直線。',
  },
  {
    id: 't5',
    label: 'T5–T7',
    sub: 'Les Combes to Malmedy',
    from: 2200, to: 2700,
    lead: '爬完長直線的高點，一個 chicane 和一個右彎',
    why: [
      'Kemmel 直線約 1,020 公尺，高程爬升約 63 公尺，到 T5 Les Combes 附近是全圈最高的一帶。',
      'T5、T6 是右左 chicane，模型時速約 131 與 135 公里；T7 Malmedy 是右彎，模型時速約 141 公里，高程約 103 公尺。',
      '過了 Malmedy 之後，賽道一路往下坡走。'
    ],
    view: 'Les Combes 外側看得到直線盡頭的煞車攻防，往下能看到整條 Kemmel 直線。',
  },
  {
    id: 't10',
    label: 'T10–T11',
    sub: 'Pouhon',
    from: 3600, to: 4150,
    lead: '下坡的雙左彎，走線一歪就是一整段',
    why: [
      'Pouhon 是連續兩個左彎（T10、T11），賽道在這裡一路下坡，高程降了約 11 公尺。',
      '模型算出 T10 彎心時速約 192 公里，T11 約 261 公里，兩個彎一個比一個快。',
      '第二個彎的出彎速度，決定接下來通往 Fagnes 的加速。'
    ],
    view: 'Pouhon 外側看得到下坡的雙左彎，車子是否貼緊內側一眼就知道。',
  },
];
