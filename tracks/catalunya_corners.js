export const META = {
  index: '17',
  title: '巴塞隆納',
  flag: '🇪🇸',
  place: 'MONTMELÓ · SPAIN',
  tagline: '拿掉最終 chicane 的高速版',
  facts: [
    { v: '4.657', k: '全長 KM' },
    { v: '14', k: '彎角數' },
    { v: '16', k: '時速 300 以上 %' },
  ],
  // OSM 沒有彎名（幾乎都是沒名字的 way），3D 標籤用彎號，彎名依 Wikipedia 補
  names: {},
  tagTurns: true,
  turnNames: {
    1: 'Elf・右彎', 2: '左彎', 3: 'Renault・長右彎', 4: 'Repsol・右彎', 5: 'Seat・慢左彎',
    6: '左微彎', 7: '上坡 chicane', 8: '上坡 chicane', 9: 'Campsa・快速右彎',
    10: 'La Caixa・左髮夾', 11: '左微彎', 12: '慢右彎', 13: '雙右彎', 14: '雙右彎',
  },
  // [起, 迄, 名稱]（公尺）；起 > 迄 代表跨過起跑線
  straights: [
    [4400, 680, '主直線'], [2950, 3300, '後直線'],
  ],
  crossover: null,
  hint: '中心線取自 OpenStreetMap，全長 4,663 m（官方 4,657 m）；OSM 裡 GP、MotoGP 與其他配置疊在一起，' +
        '求解選到的是 2023 年後拿掉最終 chicane 的 14 彎版（曲率末段是快速右彎，沒有 chicane 的形狀）。' +
        '彎號、彎名與左右方向依 Wikipedia 的 14 彎列表，14 彎逐一對過曲率。T3 與 T4 之間有個很弱的右微彎，不編號。' +
        '速度為幾何推算的模型值。DEM 量到 38 m 起伏，公開資料約 30 m，高了 27%（僅一個來源可對照），仍依需求畫成立體，起伏數字請當參考。' +
        '起跑線以維修區（Pit Lane）的中點推估。',
  others: [{ href: 'index.html', label: '← 賽季' }],
};

export const CORNERS = [
  {
    id: 't1',
    label: 'T1–T3',
    sub: 'Elf to Renault',
    from: 600, to: 1300,
    lead: '主直線盡頭的右彎，接著左彎、再一個長右彎',
    why: [
      'T1 是主直線盡頭的右彎，Wikipedia 說它是這條賽道的主要超車點；模型算出彎心時速約 116 公里。',
      'T2 是短促的左彎，模型時速約 147 公里，T3 是長長的右彎，導覽說可以全油門通過，模型時速約 202 公里。',
      '右、左、右連成一組，T1 的走線會直接決定 T3 的速度。'
    ],
    view: 'T1 外側看得到直線盡頭的煞車攻防，T3 的長彎能看到誰的速度帶得多。',
  },
  {
    id: 't5',
    label: 'T5–T8',
    sub: 'Seat to the chicane',
    from: 1950, to: 2700,
    lead: '慢左彎之後，一段上坡的左右 chicane',
    why: [
      'T5 是慢左彎，模型算出彎心時速約 110 公里；接著 T6 是左微彎，F1 賽車幾乎不用減速。',
      'T7 與 T8 是中速的上坡左右 chicane，模型時速約 119 與 172 公里。',
      '出 chicane 之後就是通往 T9 的加速，慢彎的出彎牽引力會一路帶進去。'
    ],
    view: 'T5 外側看得到慢彎入彎，chicane 那邊能看到車子換向的動作。',
  },
  {
    id: 't10',
    label: 'T10–T14',
    sub: 'La Caixa to the finish',
    from: 3300, to: 4400,
    lead: '一個左髮夾，和最後兩個極快的右彎',
    why: [
      'T10 La Caixa 是左髮夾，也是模型算出全圈最慢的一點，時速約 103 公里。',
      '之後 T11 是左微彎、T12 是慢右彎，模型時速約 182 與 144 公里，接著是 T13、T14 兩個右彎，Wikipedia 形容是六檔的極快雙右彎。',
      '2023 年拿掉了這一段原本的 chicane，讓 T13、T14 連成一個高速的雙右彎，出彎後直接衝上主直線。'
    ],
    view: 'T10 內側看得到髮夾的出彎，T14 出彎外側能看到高速彎的速度。',
  },
];
