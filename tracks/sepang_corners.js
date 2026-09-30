export const META = {
  index: '04',
  title: 'Sepang',
  flag: '🇲🇾',
  place: 'SEPANG · MALAYSIA',
  tagline: '移師馬來西亞的巴林站',
  facts: [
    { v: '5.543', k: '全長 KM' },
    { v: '914', k: '主直線 M' },
    { v: '15', k: '彎角數' },
  ],
  names: {
    'Kuala Lumpur Straight': '主直線', 'Penang Straight': '後直線',
    'Pangkor Laut Chicane': 'T1–T2 髮夾', 'Langkawi Curve': 'Langkawi 彎',
    'Genting Curve': 'Genting 彎', 'KLIA Curve': 'KLIA 彎',
    'Berjaya Tioman Corner': 'Berjaya Tioman 髮夾', 'Kenyir Lake Corner': 'Kenyir Lake 彎',
    'Sunway Lagoon Corner': 'Sunway Lagoon 髮夾',
  },
  // OSM 有幾段只標了彎號（3、10、12、13、15），補上中文
  turnNames: { 3: '長右彎', 10: '右彎', 12: '左彎', 13: '高速右彎', 15: '最終髮夾' },
  crossover: null,
  hint: '2026 年的巴林大獎賽移師這裡舉行。中心線取自 OpenStreetMap，全長 5,545 m（官方 5,543 m）。' +
        '速度為幾何推算的模型值。全球 DEM 在這裡量到的高程對不上公開資料（賽道被油棕園包圍），故畫成平面。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1–T2',
    sub: 'Turns 1–2',
    from: 380, to: 720,
    lead: '右髮夾接左髮夾，第一次超車就在這裡',
    why: [
      '主直線將近 900 公尺，盡頭先是一個右髮夾、緊接著一個左髮夾，方向完全相反。',
      '入彎很寬，可以走不同的路線：在 T1 被從內側超過的人，常常在 T2 換邊切回來——這裡的超車是「一次動作、兩個彎」。',
      '第一圈的時候，全場的車都擠在這兩個髮夾裡，最容易發生碰撞。'
    ],
    view: 'T1 外側看得到整段煞車區，以及兩個髮夾之間的換邊。',
  },
  {
    id: 't5',
    label: 'T5–T6',
    sub: 'Genting Curve',
    from: 1650, to: 2180,
    lead: '全場最快的彎，考的是車子本身',
    why: [
      '左彎接右彎的高速組合，模型算出兩個彎都在時速 200 公里左右通過。',
      '這種速度下，能不能過得快幾乎只看車身下壓力——駕駛能做的，是在方向換邊時不讓車子失去平衡。',
      '這一段拉開的差距不靠超車，而是一圈一圈慢慢累積的秒數。'
    ],
    view: 'T5–T6 外側看得到車子在高速換向時車身的晃動，哪台車穩一眼就知道。',
  },
  {
    id: 't15',
    label: 'T14–T15',
    sub: 'Turns 14–15',
    from: 4060, to: 5120,
    lead: '兩條長直線，中間只隔一個髮夾',
    why: [
      'T14 右髮夾出彎，接 820 公尺的後直線，盡頭是 T15 左髮夾，出彎又接 900 公尺的主直線。',
      'T15 是一圈裡最後的煞車區，也是最好的超車點之一；在這裡沒超成，主直線還能再試一次。',
      '反過來說，T14 出彎慢了，整整兩條直線都會被追著打。'
    ],
    view: 'T15 外側看得到最後一個煞車區裡的攻防，以及出彎後誰先踩油門。',
  },
];
