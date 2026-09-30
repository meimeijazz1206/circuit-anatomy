export const META = {
  index: '05',
  title: '新加坡',
  flag: '🇸🇬',
  place: 'MARINA BAY · SINGAPORE',
  tagline: '城市裡的夜賽',
  facts: [
    { v: '4.940', k: '全長 KM' },
    { v: '19', k: '彎角數' },
    { v: '7', k: '%　時速 300 以上' },
  ],
  // OSM 路段名稱就是真實路名，保留英文（在地人看得懂，也對得上轉播）
  names: {
    'Marina Bay Street Circuit': '濱海灣', 'Republic Boulevard': 'Republic Blvd',
    'Raffles Boulevard': 'Raffles Blvd 直線', 'Bras Basah Road': 'Bras Basah Rd',
    'Nicoll Highway': 'Nicoll Hwy', 'Stamford Road': 'Stamford Rd',
    "Saint Andrew's Road": "St Andrew's Rd", 'Connaught Drive': 'Connaught Dr',
    'Fullerton Road': 'Anderson Bridge', 'Esplanade Drive': 'Esplanade Dr',
    'Raffles Avenue': 'Raffles Ave 直線',
  },
  tagTurns: true,
  turnNames: {
    7: '重煞左彎', 8: '最慢的彎之一', 13: '橋後髮夾', 14: '與 T8 同一路口',
    18: '摩天輪旁', 19: '摩天輪旁',
  },
  crossover: null,
  hint: '中心線取自 OpenStreetMap 的街道賽 relation，全長 4,957 m（官方 4,940 m）；' +
        '平日的單行道方向與比賽方向相反，比賽方向依實際賽道設定。速度為模型推算。' +
        '市區大樓會干擾 DEM，賽道本身也近乎平坦，故畫成平面。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't7',
    label: 'T7',
    sub: 'Raffles Boulevard',
    from: 1250, to: 1790,
    lead: '全場最快的地方，接全場最重的煞車',
    why: [
      'Raffles Boulevard 是一段約 700 公尺的直線，模型算出這裡是一圈的極速點，大約時速 310 公里。',
      '盡頭是一個急左彎，要煞到時速 70 多公里——這是新加坡最主要的超車點。',
      '兩側都是牆，煞車晚一點就沒有緩衝區可以救，直接撞上去。'
    ],
    view: 'T7 外側看得到整段直線的尾端，誰敢晚煞、誰鎖死輪胎，都在眼前。',
  },
  {
    id: 't8',
    label: 'T8 / T14',
    sub: '同一個路口',
    from: 1880, to: 1990,
    lead: '一圈經過同一個路口兩次',
    why: [
      'T8 是從 Nicoll Highway 右轉進 Stamford Road。模型算出全場最慢的三個彎是 T8、T13、T14，都只有時速 60 多公里。',
      '繞過市政廳、過 Anderson Bridge 之後，T14 又回到幾乎同一個路口，這次右轉上 Raffles Avenue。',
      '街道賽的限制在這裡最明顯：路是現成的，賽道只能照著城市原本的路口走。'
    ],
    view: '這個路口附近看得到兩個方向的車流，一圈裡會看到同一台車經過兩次。',
  },
  {
    id: 't13',
    label: 'T13–T19',
    sub: 'Anderson Bridge → Singapore Flyer',
    from: 2940, to: 4800,
    lead: '2023 年改過的最後一段，比以前快',
    why: [
      'T13 是過 Anderson Bridge 之後的髮夾，從這裡開始是一圈的最後一段。',
      '2023 年拆掉了原本穿過看台底下的那一小段，改成 Raffles Avenue 上的一條長直線，最後一段因此變快。',
      '最後的 T18、T19 在摩天輪旁，實際上幾乎是全油門通過，接著就是起跑直線。'
    ],
    view: '摩天輪附近的看台，看得到車子全油門掃過最後兩個彎、衝向終點線。',
  },
];
