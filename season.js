/* 首頁用的賽季資料：賽程進度、下一站、已建賽道的輪廓與數字。 */
import { CALENDAR, SEASON } from './calendar.js';
import { OUTLINES } from './tracks/outlines.js';
import { META as SUZUKA } from './tracks/suzuka_corners.js';
import { META as MONZA } from './tracks/monza_corners.js';
import { META as BAHRAIN } from './tracks/bahrain_corners.js';
import { META as SEPANG } from './tracks/sepang_corners.js';
import { META as AMERICAS } from './tracks/americas_corners.js';
import { META as RODRIGUEZ } from './tracks/rodriguez_corners.js';
import { META as INTERLAGOS } from './tracks/interlagos_corners.js';
import { META as VEGAS } from './tracks/vegas_corners.js';
import { META as LOSAIL } from './tracks/losail_corners.js';
import { META as YAS_MARINA } from './tracks/yas_marina_corners.js';
import { META as ALBERT_PARK } from './tracks/albert_park_corners.js';
import { META as SHANGHAI } from './tracks/shanghai_corners.js';
import { META as MIAMI } from './tracks/miami_corners.js';
import { META as VILLENEUVE } from './tracks/villeneuve_corners.js';
import { META as MONACO } from './tracks/monaco_corners.js';
import { META as CATALUNYA } from './tracks/catalunya_corners.js';
import { META as RED_BULL_RING } from './tracks/red_bull_ring_corners.js';
import { META as SPA } from './tracks/spa_corners.js';
import { META as HUNGARORING } from './tracks/hungaroring_corners.js';
import { META as ZANDVOORT } from './tracks/zandvoort_corners.js';
import { META as SILVERSTONE } from './tracks/silverstone_corners.js';
import { META as BAKU } from './tracks/baku_corners.js';
import { META as MARINA_BAY } from './tracks/marina_bay_corners.js';

export { CALENDAR, SEASON, OUTLINES };
export const METAS = { suzuka: SUZUKA, monza: MONZA, bahrain: BAHRAIN, sepang: SEPANG, marina_bay: MARINA_BAY, americas: AMERICAS, rodriguez: RODRIGUEZ, interlagos: INTERLAGOS, vegas: VEGAS, losail: LOSAIL, yas_marina: YAS_MARINA, albert_park: ALBERT_PARK, shanghai: SHANGHAI, miami: MIAMI, villeneuve: VILLENEUVE, monaco: MONACO, catalunya: CATALUNYA, red_bull_ring: RED_BULL_RING, spa: SPA, hungaroring: HUNGARORING, zandvoort: ZANDVOORT, silverstone: SILVERSTONE, baku: BAKU };

// 已建賽道的一句話導言（內容取自各賽道頁已驗證的數字）
export const LEDE = {
  suzuka: 'F1 賽曆上唯一的 8 字賽道。第一彎是全場最低點，接著 S 字一路往上爬 20 公尺。',
  monza: '一圈裡有三分之一的時間，時速在 300 以上——然後在第一減速彎，從全場最快直接踩到全場最慢。',
  marina_bay: '城市裡的夜賽，19 個彎、四周都是牆。一圈只有 7% 的時間跑到時速 300 以上——全年最慢、也最不能犯錯的一圈之一。',
  sepang: '2026 年的巴林站，搬到這裡跑。兩條將近 900 公尺的長直線，盡頭都是髮夾——超車就發生在這兩個煞車區。',
  americas: '兩個左髮夾之間隔著一條將近一公里的直線，前面還有四個連續換向的 S 彎——超車與節奏，這一圈兩樣都要。',
  rodriguez: '一條將近 1.2 公里的主直線，盡頭是一圈最重的煞車；再穿過體育場，出彎的牽引力決定下一條直線的速度。',
  interlagos: '逆時針的老牌賽道，一圈高低差將近 47 公尺：從終點線一路下坡到 T5，再從 T12 爬回來。',
  vegas: '夜裡的街道賽，一條將近兩公里的全油門直線，盡頭是一圈裡的第三個重煞車區。',
  losail: '沙漠裡的夜賽，16 個彎裡有 10 個右彎；一圈只有 11% 的時間跑到時速 300 以上，靠的是連續的中高速彎。',
  yas_marina: '賽季最後一站。一條約 1 公里的長直線，前面接一個髮夾、後面接一個慢彎——全圈最慢的一點，就在直線盡頭。',
  albert_park: '湖邊公園裡的臨時賽道，一圈 14 個彎。最後一段是 T11 的直角右彎、T13 的慢左彎，再一路出彎衝上主直線。',
  shanghai: '以蝸牛彎開場的賽道，尾端是約 1.1 公里的後直線，盡頭的髮夾是全圈最慢、也最重的煞車。',
  miami: '兩條各超過一公里的直線，盡頭各有一個重煞車區；中間夾著一段彎接彎的技術中段。',
  villeneuve: '14 個彎裡有一半以上是 chicane，最後一個的出彎外側就是冠軍之牆；全圈最慢的一點是 T10 髮夾。',
  monaco: '19 個彎，模型算出一圈只有 2% 的時間跑到時速 300 以上；最慢的一點是 Grand Hotel 髮夾，只有約 59 公里。',
  catalunya: '2023 年拿掉最後的 chicane 之後，T13、T14 連成一個極快的雙右彎；全圈最慢的一點是 T10 的左髮夾，只有約 103 公里。',
  red_bull_ring: '一圈只有 10 個彎，卻有 68 公尺的高低差：往山上爬到 T3 的髮夾，再一路下坡到最後一彎。',
  spa: '全曆最長的一圈，高低差 103 公尺：從 Eau Rouge 一路爬到 Malmedy，再從 Pouhon 一路往下。',
  hungaroring: '一圈只有 6% 的時間跑到時速 300 以上；T1 是導覽說全圈最重的煞車，之後是連續換向的下坡彎。',
  zandvoort: '沙丘旁的老賽道，有兩個傾斜的彎：T3 的 Hugenholtzbocht 與最後的 Arie Luyendykbocht。',
  silverstone: '18 個彎，其中 Maggotts 到 Becketts 是連續的左右左右高速換向；最慢的兩個彎是 The Loop 和 Vale，都只有約 86 公里。',
  baku: '老城堡的窄道只有 7.6 公尺，另一頭是約 2 公里的長直線：兩個都是賽曆之最。',
  bahrain: '沙漠裡的夜賽。主直線盡頭的第一彎是最主要的超車點；後段從 T11 一路爬坡，爬上比第一彎高 18 公尺的最高點。',
};

// 已建賽道的關鍵數字（跟賽道頁一致）
export const STATS = {
  suzuka: [['5.798', 'KM', '全長'], ['40.5', 'M', '高低差'], ['18', '', '彎角']],
  monza: [['5.789', 'KM', '全長'], ['34', '%', '時速 300 以上'], ['11', '', '彎角']],
  marina_bay: [['4.940', 'KM', '全長'], ['19', '', '彎角'], ['7', '%', '時速 300 以上']],
  sepang: [['5.543', 'KM', '全長'], ['914', 'M', '主直線'], ['15', '', '彎角']],
  americas: [['5.513', 'KM', '全長'], ['970', 'M', '後直線'], ['20', '', '彎角']],
  rodriguez: [['4.304', 'KM', '全長'], ['17', '', '彎角'], ['17', '%', '時速 300 以上']],
  interlagos: [['4.309', 'KM', '全長'], ['47', 'M', '高低差'], ['15', '', '彎角']],
  vegas: [['6.201', 'KM', '全長'], ['17', '', '彎角'], ['23', '%', '時速 300 以上']],
  losail: [['5.419', 'KM', '全長'], ['16', '', '彎角'], ['11', '%', '時速 300 以上']],
  yas_marina: [['5.281', 'KM', '全長'], ['16', '', '彎角'], ['15', '%', '時速 300 以上']],
  albert_park: [['5.278', 'KM', '全長'], ['14', '', '彎角'], ['20', '%', '時速 300 以上']],
  shanghai: [['5.451', 'KM', '全長'], ['1,120', 'M', '後直線'], ['16', '', '彎角']],
  miami: [['5.412', 'KM', '全長'], ['19', '', '彎角'], ['24', '%', '時速 300 以上']],
  villeneuve: [['4.361', 'KM', '全長'], ['14', '', '彎角'], ['17', '%', '時速 300 以上']],
  monaco: [['3.337', 'KM', '全長'], ['19', '', '彎角'], ['59', 'KM/H', '最慢彎心']],
  catalunya: [['4.657', 'KM', '全長'], ['14', '', '彎角'], ['16', '%', '時速 300 以上']],
  red_bull_ring: [['4.318', 'KM', '全長'], ['68', 'M', '高低差'], ['10', '', '彎角']],
  spa: [['7.004', 'KM', '全長'], ['103', 'M', '高低差'], ['19', '', '彎角']],
  hungaroring: [['4.381', 'KM', '全長'], ['14', '', '彎角'], ['6', '%', '時速 300 以上']],
  zandvoort: [['4.259', 'KM', '全長'], ['14', '', '彎角'], ['12', '%', '時速 300 以上']],
  silverstone: [['5.891', 'KM', '全長'], ['18', '', '彎角'], ['15', '%', '時速 300 以上']],
  baku: [['6.003', 'KM', '全長'], ['20', '', '彎角'], ['7.6', 'M', '最窄處']],
  bahrain: [['5.412', 'KM', '全長'], ['19', 'M', '高低差'], ['15', '', '彎角']],
};

// 正賽開始兩小時後算跑完（一場正賽大約 1.5–2 小時）
const RACE_LEN = 2 * 3600 * 1000;
const now = Date.now();
export const raceDay = r => new Date(r.start);
const finished = r => raceDay(r).getTime() + RACE_LEN < now;

const nextRaw = CALENDAR.find(r => !finished(r)) || CALENDAR[CALENDAR.length - 1];
export const doneCount = CALENDAR.filter(finished).length;

export const rounds = CALENDAR.map(r => ({
  ...r,
  no: String(r.r).padStart(2, '0'),
  dot: r.date.replace('-', '.'),
  live: !!r.track && !!OUTLINES[r.track],
  done: finished(r),
  isNext: r === nextRaw,
}));

export const built = rounds.filter(r => r.live);
// 下一站要用補齊過日期格式的那一份
export const next = rounds.find(r => r.isNext);

/** 輪廓 path 的第一個點就是起跑線位置。 */
export function startPoint(path) {
  const m = path.match(/^M([\d.]+),([\d.]+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [50, 50];
}

/** 離下一站正賽開始還有多久（用 API 給的正式開賽時間）。 */
export function countdown() {
  const t = raceDay(next) - new Date();
  const s = Math.max(0, Math.floor(t / 1000));
  return {
    d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24,
    m: Math.floor(s / 60) % 60, s: s % 60,
  };
}
