export const META = {
  index: '09',
  title: '拉斯維加斯',
  flag: '🇺🇸',
  place: 'LAS VEGAS · USA',
  tagline: '夜裡的 Strip 長直線',
  facts: [
    { v: '6.201', k: '全長 KM' },
    { v: '1,790', k: 'Strip 直線 M' },
    { v: '17', k: '彎角數' },
  ],
  // 街道賽：OSM 的路段名稱只到街道層級，3D 標籤用彎號，彎的名稱人工補
  names: {},
  tagTurns: true,
  turnNames: {
    1: '第一彎・髮夾', 2: '小轉向', 3: '短彎', 4: '接上 Koval Lane',
    5: '90° 右彎', 6: '繞 Sphere', 7: '繞 Sphere', 8: '繞 Sphere', 9: '左彎接 Sands Avenue',
    10: 'Sands Avenue', 11: 'Sands Avenue', 12: '慢左彎', 13: 'Strip 高速微彎',
    14: 'Chicane', 15: 'Chicane', 16: 'Chicane', 17: '高速左彎',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [700, 1440, 'Koval Lane'], [3250, 5040, 'Strip 直線'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap，全長 6,207 m（官方 6,201 m）；路口圖求解，方向（逆時針）與路名順序對過公開資料。' +
        '彎號依賽道導覽（RaceFans、Wikipedia）排定。OSM 沒畫出 T15 的右彎，該彎的位置只是區間內的最大曲率點。' +
        '速度為幾何推算的模型值。四周是飯店與高樓，DEM 量到的是屋頂，賽道本身也幾乎是平的，故畫成平面。' +
        '起跑線以 OSM 的維修區中點推估。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1',
    sub: 'Turn 1',
    from: 0, to: 560,
    lead: '起跑格往前不到 200 公尺，就是第一個煞車區',
    why: [
      '公開資料說 T1 離起跑格大約 200 公尺，是一圈裡三個重煞車區的第一個。',
      '起跑的時候全場擠在這個髮夾，內外線都沒有多少空間。',
      '出彎之後接 T2 到 T4 的短彎，再進入 Koval Lane，前面被卡住就整段都被壓著。'
    ],
    view: 'T1 外側看得到起跑格前方的擠車，以及髮夾的入彎。',
  },
  {
    id: 't5',
    label: 'T5–T9',
    sub: 'Around the Sphere',
    from: 1400, to: 2360,
    lead: '長直線盡頭的慢彎，接著繞過 Sphere',
    why: [
      'Koval Lane 的直線約 740 公尺，盡頭是 T5 的 90 度右彎，模型算出彎心時速只剩約 72 公里。',
      '接下來的 T6 到 T8 繞著 Sphere 轉，先是左彎、再一個左彎接右彎的換向，T9 是模型另一個 72 公里的慢左彎，出彎接上 Sands Avenue。',
      'T5 是一個重煞車區；T6 到 T9 幾乎都是低速彎，出彎的牽引力決定接下來的直線速度。'
    ],
    view: 'T5 外側看得到直線盡頭的煞車，T7–T8 的換向最能看出誰的走線乾淨。',
  },
  {
    id: 't12',
    label: 'T12–T14',
    sub: 'The Strip',
    from: 3100, to: 5300,
    lead: '一條將近兩公里的全油門直線，盡頭是重煞車區',
    why: [
      'T12 是慢左彎，出彎後轉上 Las Vegas Boulevard，到 T14 之前約有 1,790 公尺沒有煞車。',
      '模型算出的極速 331 km/h 就出現在這一段，T13 只是直線上的一個微彎。',
      'T14 的彎心時速掉到約 108 公里，是一圈裡三個重煞車區的最後一個，直線上累積的速度差都在這裡結算。'
    ],
    view: 'T14 外側看得到直線盡頭的煞車攻防，以及接著左右換向的 chicane。',
  },
];
