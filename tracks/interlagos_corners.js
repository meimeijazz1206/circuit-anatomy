export const META = {
  index: '08',
  title: 'Interlagos',
  flag: '🇧🇷',
  place: 'SÃO PAULO · BRAZIL',
  tagline: '逆時針、一圈高低差 47 公尺',
  facts: [
    { v: '4.309', k: '全長 KM' },
    { v: '47', k: '高低差 M' },
    { v: '15', k: '彎角數' },
  ],
  // OSM 有路段名稱，但邊界跟彎心有偏移，3D 標籤改用彎號，路段名稱人工補
  names: {},
  tagTurns: true,
  turnNames: {
    1: 'Senna S・左', 2: 'Senna S・右', 3: 'Curva do Sol', 4: 'Descida do Lago', 5: 'Descida do Lago',
    6: 'Ferradura', 7: 'Ferradura', 8: 'Laranjinha', 9: 'Pinheirinho', 10: 'Bico de Pato',
    11: 'Mergulho', 12: 'Junção', 13: 'Café', 14: 'Subida dos Boxes', 15: 'Arquibancadas',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [3830, 10, '主直線'], [495, 1090, 'Reta Oposta'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap，全長 4,292 m（官方 4,309 m）。彎號依 Wikipedia 的分組排定，' +
        '速度為幾何推算的模型值。高程取自 open-meteo 全球 DEM（約 90 m 解析度），量到 47 m，公開資料約 43 m；' +
        '最高點在終點線附近、最低點在 T5，兩者都對得上。OSM 沒標起跑線，以維修區中點推估。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1–T3',
    sub: 'Senna S',
    from: 0, to: 560,
    lead: '從全賽道最高點往下衝，一連串下坡彎',
    why: [
      '終點線一帶是整圈最高處，賽道一出主直線就往下坡：到 T3 為止，高程掉了將近 20 公尺。',
      'T1 是左彎、T2 換成右彎，模型算出兩個彎心時速都在約 100 公里，之後 T3 是一個更寬、更快的左彎。',
      '下坡讓煞車更難，第一圈的擠車與碰撞，多半發生在 T1 到 T2 的換邊。'
    ],
    view: 'T1 外側看得到下坡煞車與換邊，T3 出口能看到一路衝進對面直線。',
  },
  {
    id: 't4',
    label: 'T4–T5',
    sub: 'Descida do Lago',
    from: 1040, to: 1420,
    lead: '接近 600 公尺的直線盡頭，也是全圈最低點',
    why: [
      'T3 之後接一條約 600 公尺的 Reta Oposta，盡頭是兩個連續的左彎，T4 模型時速約 120 公里。',
      'T5 是全圈高程最低點（DEM 量到），比終點線低了將近 47 公尺——公開資料說最低點也在 T5。',
      '長直線盡頭加上下坡，是全圈最重要的超車點之一。'
    ],
    view: '直線盡頭的外側看得到煞車攻防，也能看到整個賽道往下沉的落差。',
  },
  {
    id: 't12',
    label: 'T12–T15',
    sub: 'Up to the pits',
    from: 2860, to: 3900,
    lead: '慢彎之後爬 30 多公尺回到主直線',
    why: [
      'T12（Junção）是模型算出的全圈第二慢彎，時速約 96 公里，出彎後開始一路往上爬。',
      '從 T12 到 T14，高程爬升約 32 公尺；T15 是平緩的長左彎，出彎後就是主直線。',
      '出 T12 的牽引力，決定了整段上坡加上主直線的速度，是慢彎裡最吃出彎的一個。'
    ],
    view: 'T12 外側看得到出彎加速，往後看整段上坡的斜度最明顯。',
  },
];
