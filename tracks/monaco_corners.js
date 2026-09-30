export const META = {
  index: '16',
  title: '摩納哥',
  flag: '🇲🇨',
  place: 'MONTE CARLO · MONACO',
  tagline: '濱海街道賽，19 個彎',
  facts: [
    { v: '3.337', k: '全長 KM' },
    { v: '19', k: '彎角數' },
    { v: '59', k: '最慢彎心 KM/H' },
  ],
  // OSM 只有街道名稱，彎名依賽道導覽補；3D 標籤用彎號
  names: {},
  tagTurns: true,
  turnNames: {
    1: 'Sainte Dévote', 2: 'Beau Rivage', 3: 'Massenet', 4: 'Casino', 5: 'Mirabeau Haute',
    6: 'Grand Hotel 髮夾', 7: 'Mirabeau Bas', 8: 'Portier', 9: '隧道',
    10: 'Nouvelle Chicane', 11: 'Nouvelle Chicane', 12: 'Tabac', 13: 'Louis Chiron', 14: 'Louis Chiron',
    15: 'Piscine', 16: 'Piscine', 17: '左微彎', 18: 'La Rascasse', 19: 'Antony Noghes',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [3230, 330, '起跑直線'], [1700, 2200, '隧道'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap，路口圖求解，全長 3,326 m（官方 3,337 m）；方向與路名順序對過公開資料。' +
        '彎號與彎名依賽道導覽（oversteer48、SI）的 19 彎排定；T1、T3–T12、T18–T19 的左右方向都對過導覽，' +
        'T2 與 T13–T17 只依曲率排定。Nouvelle Chicane 之後有個左彎峰（2,309 m）、起跑直線上有幾個弱微彎，不編號。' +
        '速度為幾何推算的模型值。DEM 量到 59 m 起伏，公開資料約 42 m，高了四成（山坡上的建築把地面墊高），故畫成平面。' +
        '起跑線取維修區兩端沿賽道的中點推估。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1–T3',
    sub: 'Sainte Dévote to Massenet',
    from: 300, to: 1040,
    lead: '起跑後不到 400 公尺，就是一個緊右彎，然後一路上坡',
    why: [
      'T1 Sainte Dévote 是緊右彎，模型算出彎心時速約 88 公里，起跑時全場從起跑直線一起衝進來。',
      '出彎後是導覽說的上坡 slalom（Beau Rivage），接著 T3 Massenet 是中速的左彎，模型時速約 124 公里。',
      'T1 出彎後緊接著是上坡，起跑時的位置，會一路帶到 T3。'
    ],
    view: 'T1 外側看得到起跑時的擠車，往後能看到整段上坡。',
  },
  {
    id: 't5',
    label: 'T5–T8',
    sub: 'Mirabeau to Portier',
    from: 1250, to: 1700,
    lead: '全圈最慢的髮夾，前後夾著三個慢右彎',
    why: [
      'T5 Mirabeau Haute 是右彎，接著 T6 是著名的 Grand Hotel 髮夾（左），模型算出彎心時速只有約 59 公里，是全圈最慢的一點。',
      'T7 Mirabeau Bas 與 T8 Portier 都是右彎，模型時速約 77 與 75 公里，連續的慢彎。',
      '導覽說 Portier 是可以超車的地方，出彎之後就是隧道。'
    ],
    view: 'T6 髮夾外側看得到整個慢彎的走線，Portier 外側看得到煞車攻防。',
  },
  {
    id: 't9',
    label: 'T9–T11',
    sub: 'Tunnel and chicane',
    from: 2000, to: 2350,
    lead: '穿過隧道後，接一個緊的 chicane',
    why: [
      'T8 到 T10 之間約 500 公尺，中間穿過隧道；導覽說隧道裡全油門，向右微彎。',
      '出隧道就是 Nouvelle Chicane（T10、T11），導覽形容它「窄而繁瑣」，模型算出兩個彎心時速約 81 與 74 公里。',
      '模型算出隧道裡時速約 306 公里，到 chicane 只剩 74 到 81 公里，中間只有煞車。'
    ],
    view: 'chicane 外側看得到隧道出口的高速與煞車，路緣石是這裡的關鍵。',
  },
];
