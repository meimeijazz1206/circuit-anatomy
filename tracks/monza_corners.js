export const META = {
  index: '02',
  title: 'Monza',
  flag: '🇮🇹',
  place: 'MONZA · ITALIA',
  tagline: '全年最快的一圈',
  facts: [
    { v: '5.789', k: '全長 KM' },
    { v: '34', k: '%　時速 300 以上' },
    { v: '11', k: '彎角數' },
  ],
  names: {
    'Rettifilo di partenza': '起跑直線',
    'Variante del Rettifilo': '第一減速彎',
    'Curva Biassono': 'Curva Grande',
    'Variante della Roggia': 'Roggia 減速彎',
    'Lesmo 1': 'Lesmo 1', 'Lesmo 2': 'Lesmo 2',
    'Curva del Serraglio': 'Serraglio 直線',
    'Curva Vialone': 'Vialone',
    'Variante Ascari': 'Ascari 連續彎',
    'Curva Alboreto': 'Parabolica',
  },
  crossover: null,
  // Monza 幾乎是平的，這裡刻意不畫高程，理由寫在 README
  hint: '中心線取自 OpenStreetMap。速度為幾何推算的模型值，不是實測遙測；' +
        'Monza 高低差僅約 10 m，全球 DEM 解析度不足以呈現，故畫成平面。',
  others: [{ href: 'index.html', label: '← 賽季' }, { href: 'suzuka.html', label: '鈴鹿 →' }],
};

export const CORNERS = [
  {
    id: 'rettifilo',
    label: '第一減速彎',
    sub: 'Variante del Rettifilo',
    from: 880, to: 1120,
    lead: '全場最慢的點，接在全場最快的地方後面',
    why: [
      '前面是一圈裡最長的全速區，車速逼近極速；然後要在幾百公尺內減到全場最慢——模型算出來的最低點就在這裡。',
      '直線上尾流會把車距拉近，所以進煞車區時常常是兩台並排；但煞車區只有一條線可以走，總得有人讓。',
      '左-右的組合彎，出彎緣石又高又硬，切太多會被彈起來，通常代表直接沖出去。'
    ],
    view: '主看台尾端到第一彎外側，看得到「並排進煞車區」這件事怎麼發生、怎麼收場。',
  },
  {
    id: 'ascari',
    label: 'Ascari 連續彎',
    sub: 'Variante Ascari',
    from: 3980, to: 4400,
    lead: '這裡不能超車，但它決定你等一下能不能超',
    why: [
      '左-右-左，是這條賽道上唯一需要連續換方向的地方，其他彎都是單一方向。',
      '出彎接著是通往最終彎前的長直線。出彎慢 5 km/h，到直線底就是慢一個車身。',
      '所以 Ascari 的價值不在自己，在於它把你放在什麼位置進入下一段。'
    ],
    view: 'Ascari 外側看台，是全場唯一能看到「連續換向」的地方。',
  },
  {
    id: 'parabolica',
    label: 'Parabolica',
    sub: 'Curva Alboreto',
    from: 5100, to: 5560,
    lead: '出彎速度會被主直線放大一整條',
    why: [
      '長而且越彎越緊的右彎，出彎直接接上起跑直線——這是一圈裡油門踩最久的一段的開頭。',
      '早一點開油門就會推頭，車頭往外滑出去踩到砂石區；但晚開油門的代價，會在一公里之後才付出來。',
      '這裡幾乎沒有人在此超車，卻是決定下一圈第一彎能不能發動攻擊的地方。'
    ],
    view: 'Parabolica 外側看台，看得到車尾滑動的角度——那是油門踩早了的證據。',
  },
];
