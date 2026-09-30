"""重取樣＋平滑中心線與高程，算里程／曲率／速度模型，輸出 tracks/<id>.js。

用法：python3 prepare_web.py suzuka|monza
"""
import json, math, sys

STEP = 4.0          # 重取樣間距（公尺）
ELEV_SMOOTH = 9     # 高程平滑視窗（點數）

# 官方彎號。自動偵測抓不出複合彎裡的每個彎心（鈴鹿最多只認得 16 個、Monza 7 個），
# 所以彎號的分組是人工指定的，程式只負責在區間裡找彎心把它們切開。
TURN_GROUPS = {
    'suzuka': [
        ([1, 2], 790, 1104), ([3, 4, 5, 6], 1200, 1642), ([7], 1642, 1810),
        ([8], 1830, 2260), ([9], 2440, 2596), ([10], 2596, 2900),
        ([11], 3040, 3180), ([12], 3180, 3600), ([13, 14], 3900, 4230),
        ([15], 5090, 5390), ([16, 17], 5530, 5660), ([18], 5660, 5770),
    ],
    'monza': [
        ([1, 2], 925, 1015), ([3], 1290, 1930), ([4, 5], 2140, 2265),
        ([6], 2495, 2755), ([7], 2860, 2965), ([8, 9, 10], 3995, 4385),
        ([11], 5115, 5565),
    ],
    # 巴林順時針。區間依曲率彎心對照官方賽道圖定出（起點＝起跑線）
    'bahrain': [
        ([1], 250, 350), ([2], 350, 455), ([3], 455, 600),
        ([4], 1040, 1250), ([5], 1300, 1410), ([6], 1410, 1530), ([7], 1530, 1680),
        ([8], 1780, 1900), ([9], 2160, 2260), ([10], 2260, 2360),
        ([11], 2980, 3260), ([12], 3280, 3540), ([13], 3600, 3800),
        ([14], 4440, 4545), ([15], 4545, 4680),
    ],
    # 新加坡（2023 年起的 19 彎配置）逆時針。錨點：T7＝Raffles Boulevard 直線盡頭的左彎、
    # T13＝過 Anderson Bridge 後的髮夾、T14＝跟 T8 同一個路口右轉上 Raffles Avenue、
    # T18–T19＝摩天輪旁全油門的兩個彎（Wikipedia）
    'marina_bay': [
        ([1], 300, 365), ([2], 365, 455), ([3], 455, 560), ([4], 580, 660), ([5], 840, 970),
        ([6], 1300, 1380), ([7], 1680, 1760), ([8], 1900, 1970), ([9], 2050, 2200),
        ([10], 2540, 2620), ([11], 2690, 2722), ([12], 2738, 2920), ([13], 2940, 3010),
        ([14], 3480, 3560), ([15], 3720, 3810), ([16], 4250, 4305), ([17], 4305, 4380),
        ([18], 4600, 4670), ([19], 4690, 4770),
    ],
    # Sepang 順時針；OSM 的路段名稱（Pangkor Laut、Langkawi、Genting、KLIA…）與彎心一一對得上
    'sepang': [
        ([1], 470, 610), ([2], 610, 700), ([3], 740, 1100), ([4], 1400, 1520),
        ([5], 1680, 1975), ([6], 1975, 2160), ([7], 2400, 2500), ([8], 2500, 2620),
        ([9], 2990, 3100), ([10], 3120, 3360), ([11], 3360, 3440), ([12], 3680, 3800),
        ([13], 3820, 4055), ([14], 4080, 4160), ([15], 4980, 5090),
    ],
    # COTA 逆時針。區間取 OSM 各「Turn N」路段的範圍
    'americas': [
        ([1], 408, 659), ([2], 659, 963), ([3], 963, 1071), ([4], 1071, 1159), ([5], 1159, 1267),
        ([6], 1267, 1543), ([7], 1543, 1663), ([8], 1663, 1803), ([9], 1803, 1995), ([10], 1995, 2100),
        ([11], 2319, 2554), ([12], 3526, 3686), ([13], 3810, 3913), ([14], 3913, 3985), ([15], 3985, 4113),
        ([16], 4113, 4296), ([17], 4296, 4516), ([18], 4516, 4844), ([19], 4844, 5144), ([20], 5144, 5339),
    ],
    # 墨西哥城順時針。OSM 沒有彎名；錨點（Sky Sports、McLaren 等賽道導覽）：T1 在約 1.2 km 主直線盡頭、
    # T2–T3 左右換向、T4–T5 chicane、T7–T11 五個連續 S 彎、T12 在進 Foro Sol 之前、T17 是最終的 Peraltada
    'rodriguez': [
        ([1], 1090, 1200), ([2], 1200, 1265), ([3], 1265, 1340),
        ([4], 1940, 2030), ([5], 2030, 2130), ([6], 2130, 2300),
        ([7], 2480, 2600), ([8], 2600, 2700), ([9], 2700, 2850), ([10], 2850, 2980), ([11], 2980, 3100),
        ([12], 3540, 3660), ([13], 3720, 3805), ([14], 3805, 3860), ([15], 3860, 3920), ([16], 3920, 4010),
        ([17], 4030, 4200),
    ],
    # Interlagos 逆時針，15 彎。彎號與名稱依 Wikipedia 的分組（S do Senna T1–2、Curva do Sol T3、
    # Descida do Lago T4–5、Ferradura T6–7、Laranjinha T8、Pinheirinho T9、Bico de Pato T10、Mergulho T11、
    # Junção T12、Café T13、Subida dos Boxes T14、Arquibancadas T15）。OSM 路段邊界跟彎心有偏移，以彎心為準
    'interlagos': [
        ([1], 10, 120), ([2], 120, 200), ([3], 300, 495),
        ([4], 1090, 1200), ([5], 1200, 1330), ([6], 1690, 1790), ([7], 1790, 1940),
        ([8], 1990, 2100), ([9], 2150, 2280), ([10], 2300, 2560), ([11], 2590, 2780),
        ([12], 2900, 3030), ([13], 3060, 3160), ([14], 3290, 3460), ([15], 3640, 3830),
    ],
    # Las Vegas 逆時針，17 彎。編號依 RaceFans／Wikipedia 的 turn-by-turn：T1 髮夾（離起跑格約 200 m）、
    # T5 是 Koval Lane 盡頭的 90° 右彎、T6–T8 繞 Sphere、T9 左彎接 Sands Avenue、T12 是 Sands 接 Las Vegas
    # Blvd 的慢左彎、T13 是 Strip 上的高速微彎、T14–T16 左右左 chicane、T17 是進維修區的高速左彎。
    # OSM 沒畫出 T15 的右彎（曲率幾乎為零），T15 的彎心只是區間內的最大曲率點
    'vegas': [
        ([1], 100, 290), ([2], 290, 380), ([3], 380, 520), ([4], 520, 700),
        ([5], 1440, 1600), ([6], 1700, 1900), ([7], 1900, 2000), ([8], 2000, 2100), ([9], 2100, 2330),
        ([10], 2420, 2600), ([11], 2860, 3060), ([12], 3100, 3250), ([13], 3880, 4250),
        ([14], 5040, 5100), ([15], 5100, 5160), ([16], 5160, 5290), ([17], 5880, 6120),
    ],
    # Lusail 順時針，16 彎（6 左 10 右）。方向序列依 RaceControl 的 turn-by-turn：T1 右、T2 左（長 U 形，
    # 曲率有兩個峰）、T3 右、T4–T5 右右、T6 左髮夾、T7–T10 右左右左、T11 左、T12–T14 右右右、T15 左、T16 右
    'losail': [
        ([1], 560, 760), ([2], 800, 1040), ([3], 1080, 1250), ([4], 1440, 1650), ([5], 1660, 1790),
        ([6], 1900, 2100), ([7], 2400, 2540), ([8], 2540, 2720), ([9], 2720, 2850), ([10], 2900, 3060),
        ([11], 3060, 3350), ([12], 3540, 3700), ([13], 3740, 3900), ([14], 3940, 4100),
        ([15], 4250, 4450), ([16], 4650, 4870),
    ],
    # Yas Marina（2021 年後的 16 彎）逆時針。錨點（Wikipedia／賽道導覽）：T1 中速左彎、T5 是接上最長直線的
    # 左髮夾、T6–T7 左右 chicane、T9 是 180° 傾斜左彎、T10–T11 兩個快速右彎、T12 低速 90° 右彎、
    # T14 在 Yas 飯店下方的左彎、T16 最終右彎。起跑線後 T1 在前，T4 到 T5 之間 732–808 m 有個很弱的
    # 左微彎（曲率 0.003），不編號
    'yas_marina': [
        ([1], 10, 200), ([2], 250, 420), ([3], 420, 520), ([4], 520, 660),
        ([5], 1080, 1250), ([6], 2300, 2390), ([7], 2390, 2500), ([8], 2530, 2720), ([9], 3300, 3680),
        ([10], 3720, 3870), ([11], 3870, 4020), ([12], 4020, 4140), ([13], 4140, 4250), ([14], 4250, 4400),
        ([15], 4500, 4700), ([16], 4720, 4950),
    ],
    # Albert Park（2022 年後的 14 彎）順時針。編號依 SI 的 14 彎導覽：T1 右＋T2 快速左、T3 緊右髮夾、
    # T4 90° 左、T5 快右、T6/T7 右左 chicane、T8 全油門的右微彎、T9/T10 高速 chicane（左右）、
    # T11 90° 右、T12 較開闊右彎、T13 慢緊左彎、T14 最終右彎。T8 之後 2,830–3,150 m 還有幾個全油門的左微彎，
    # 曲率只有 0.004，不編號
    'albert_park': [
        ([1], 300, 470), ([2], 470, 700), ([3], 1050, 1200), ([4], 1200, 1400), ([5], 1400, 1600),
        ([6], 1850, 1960), ([7], 1960, 2100), ([8], 2100, 2400), ([9], 3300, 3420), ([10], 3420, 3600),
        ([11], 4100, 4300), ([12], 4350, 4550), ([13], 4620, 4780), ([14], 4780, 4950),
    ],
    # 上海順時針，16 彎。編號依 SI 與 Total Motorsport 的導覽：T1–T2 長而收緊的雙右彎（蝸牛，曲率有平台＋尖峰）、
    # T3–T4 雙左、T5 右微彎、T6 緊右彎、T7 左＋T8 右、T9–T10 雙左、T11–T12 左右 chicane、T13 長右彎、
    # 後直線約 1.2 km、T14 髮夾、T15 是髮夾出口上的微彎、T16 左彎。T6 與 T7 之間 1,610 m 有個弱的右微彎，不編號
    'shanghai': [
        ([1], 300, 560), ([2], 560, 760), ([3], 760, 860), ([4], 860, 1000), ([5], 1150, 1320),
        ([6], 1400, 1550), ([7], 1750, 2050), ([8], 2100, 2400), ([9], 2400, 2490), ([10], 2490, 2620),
        ([11], 2950, 3060), ([12], 3060, 3160), ([13], 3180, 3500), ([14], 4620, 4720),
        ([15], 4720, 4900), ([16], 5000, 5150),
    ],
    # 邁阿密逆時針，19 彎。編號依 SI 的導覽：T1 右 90°、T2 左、T3 長右彎、T4 左＋T5 右微彎、T6–T8 三段收緊的左彎、
    # T9–T10 右左微彎、T11 90° 左（最重煞車）、T12 長右彎、T13 中速左、T14–T16 左右左 chicane、
    # T17 左髮夾（後直線盡頭）、T18–T19 兩個彎。T10 到 T11 之間 2,115 m 與 2,355–2,523 m 是全油門的微彎，不編號
    'miami': [
        ([1], 250, 400), ([2], 400, 460), ([3], 460, 900), ([4], 1000, 1180), ([5], 1180, 1290),
        ([6], 1290, 1400), ([7], 1400, 1550), ([8], 1550, 1650), ([9], 1650, 1760), ([10], 1760, 1900),
        ([11], 3000, 3120), ([12], 3120, 3260), ([13], 3260, 3350), ([14], 3350, 3405), ([15], 3405, 3460),
        ([16], 3480, 3560), ([17], 4780, 4900), ([18], 4930, 5080), ([19], 5100, 5350),
    ],
    # 加拿大順時針，14 彎。編號依 SI 的導覽：T1 緊左（前面有個右微彎）、T2 右髮夾、T3–T4 右左 chicane、
    # T5 全油門右彎（前面有個左微彎）、T6–T7 左右、T8–T9 右左 chicane、T10 髮夾（右）、T11 左微彎、
    # T12 右微彎、T13–T14 右左的最終 chicane（冠軍之牆）。T1、T3、T5 前的微彎與 2,554 m 的右微彎，導覽只叫 kink，不編號
    'villeneuve': [
        ([1], 250, 335), ([2], 335, 450), ([3], 700, 800), ([4], 800, 900), ([5], 1000, 1180),
        ([6], 1250, 1330), ([7], 1330, 1450), ([8], 2020, 2075), ([9], 2075, 2180), ([10], 2650, 2800),
        ([11], 2800, 3000), ([12], 3150, 3350), ([13], 3900, 3960), ([14], 3960, 4060),
    ],
    # 摩納哥順時針，19 彎。編號與名稱依 oversteer48 與 SI：T1 Sainte Dévote、T2 Beau Rivage（上坡的 slalom，
    # 一個編號、曲率有好幾個弱峰）、T3 Massenet、T4 Casino、T5 Mirabeau Haute、T6 Grand Hotel 髮夾、
    # T7 Mirabeau Bas、T8 Portier、T9 隧道、T10–T11 Nouvelle Chicane、T12 Tabac、T13–T14 Louis Chiron、
    # T15–T16 Piscine、T17（無名）、T18 Rascasse、T19 Antony Noghes。Nouvelle Chicane 之後 2,309 m 還有個左彎峰、
    # 起跑直線上 3,270、296、336 m 有幾個弱微彎，都不編號
    'monaco': [
        ([1], 330, 450), ([2], 560, 820), ([3], 820, 1020), ([4], 1020, 1150), ([5], 1250, 1340),
        ([6], 1340, 1470), ([7], 1470, 1550), ([8], 1550, 1700), ([9], 2000, 2200), ([10], 2200, 2260),
        ([11], 2260, 2290), ([12], 2450, 2660), ([13], 2660, 2705), ([14], 2705, 2760), ([15], 2800, 2865),
        ([16], 2865, 2930), ([17], 2960, 3040), ([18], 3040, 3110), ([19], 3110, 3230),
    ],
    # 巴塞隆納順時針，2023 年後的 14 彎（拿掉最終 chicane）。編號依 Wikipedia：T1 Elf 右、T2 左（中速 chicane 的一半）、
    # T3 Renault 長右彎、T4 Repsol 右彎、T5 Seat 慢左彎、T6 左微彎、T7–T8 上坡的左右 chicane、
    # T9 Campsa 快速右彎、T10 La Caixa 左髮夾、T11 左微彎、T12 慢右彎、T13–T14 全油門雙右彎。
    # T3 與 T4 之間 1,316 m 有個很弱的右微彎，不編號
    'catalunya': [
        ([1], 680, 800), ([2], 800, 940), ([3], 960, 1250), ([4], 1500, 1900), ([5], 1950, 2130),
        ([6], 2180, 2380), ([7], 2400, 2500), ([8], 2500, 2650), ([9], 2700, 2950), ([10], 3300, 3460),
        ([11], 3460, 3600), ([12], 3600, 3850), ([13], 3900, 4100), ([14], 4150, 4400),
    ],
    # 紅牛環順時針，10 彎（7 右 3 左）。編號依 Yahoo Sports／Red Bull 的導覽：T1 Niki Lauda 右 90°、T2 快速左、
    # T3 上坡重煞車髮夾、T4 右、T5 弱右、T6–T7 雙左、T8 弱右（190→260 km/h）、T9 Jochen Rindt 右、T10 右。
    # 導覽與 OSM 對 Remus／Schlossgold／Rauch 的位置說法不一致，這裡只用彎號與方向。
    # 起跑直線上的 676 m 弱右微彎、984 與 1,068 m 的全油門左微彎，不編號
    'red_bull_ring': [
        ([1], 300, 410), ([2], 410, 520), ([3], 1200, 1400), ([4], 2050, 2200), ([5], 2200, 2450),
        ([6], 2500, 2750), ([7], 2850, 3050), ([8], 3050, 3300), ([9], 3600, 3800), ([10], 3840, 4060),
    ],
    # Spa 順時針，19 彎。編號依 oversteer48（T2 Eau Rouge 左、T3–T4 Raidillon 右左、T5–T6 Les Combes 右左、
    # T10–T11 Pouhon 雙左、T12–T13 Fagnes 右左、T17 Blanchimont 左、T18–T19 chicane 右左）；OSM 路段名稱
    # 對得上每一個彎。Speaker's Corner 之後 3,426 m 與 Paul Frère 之後 5,237–5,477 m 的弱右微彎，不編號
    'spa': [
        ([1], 250, 380), ([2], 900, 1010), ([3], 1010, 1160), ([4], 1160, 1260),
        ([5], 2280, 2380), ([6], 2380, 2480), ([7], 2500, 2650), ([8], 2850, 3100), ([9], 3150, 3300),
        ([10], 3650, 3850), ([11], 3850, 4100), ([12], 4350, 4480), ([13], 4480, 4700),
        ([14], 4800, 4950), ([15], 4990, 5150), ([16], 5700, 5950), ([17], 6000, 6250),
        ([18], 6600, 6685), ([19], 6685, 6760),
    ],
    # 匈牙利順時針，14 彎。導覽（Yahoo Sports 等）明確給的：T1 右、T2 長下坡左、T2–T5 左右左右、T5 右、
    # T8 左＋T9 右的 chicane、T11 右、T12–T14 右左右。其餘依曲率峰值的順序排（12 個強峰＋2,855 m 的弱左彎），
    # 與導覽有出入的地方：T7（曲率是右，導覽說 T6–T7 是右接左）與 T10（曲率是左，導覽說右）。
    # 起跑直線後 700 m、1,664 m、3,594 m 有幾個很弱的微彎，不編號
    'hungaroring': [
        ([1], 520, 640), ([2], 980, 1140), ([3], 1200, 1340), ([4], 1700, 1800), ([5], 1900, 2060),
        ([6], 2070, 2160), ([7], 2250, 2400), ([8], 2480, 2600), ([9], 2600, 2760), ([10], 2800, 2930),
        ([11], 2960, 3100), ([12], 3400, 3520), ([13], 3650, 3850), ([14], 3900, 4150),
    ],
    # 荷蘭順時針，14 彎。編號依 oversteer48：T1 Tarzanbocht、T2 Gerlachbocht、T3 Hugenholtzbocht（傾斜左彎）、
    # T4 Hunserug、T5 Rob Slotemakerbocht、T6、T7 Scheivlak、T8 Mastersbocht、T9、T10、T11–T12 Hans Ernst chicane、
    # T13、T14 Arie Luyendykbocht（傾斜右彎）。OSM 的路段名稱對得上 T1–T5、T7–T8、T11–T12、T14；
    # T4–T6、T9–T10、T13 的左右只依曲率排定。起跑直線後 456 m、T7 之後 1,780 m、T8 之後 1,968–2,020 與 2,191 m
    # 的弱微彎，不編號。傾斜（T3、T14）在 DEM 看不出來
    'zandvoort': [
        ([1], 200, 340), ([2], 500, 620), ([3], 650, 800), ([4], 860, 1030), ([5], 1060, 1230),
        ([6], 1240, 1350), ([7], 1450, 1700), ([8], 1850, 1930), ([9], 2090, 2160), ([10], 2240, 2480),
        ([11], 2930, 2995), ([12], 2995, 3110), ([13], 3350, 3450), ([14], 3500, 3800),
    ],
    # 銀石順時針，18 彎（10 右 8 左）。編號依 Wikipedia：T1 Abbey 右、T2 Farm 左、T3 Village 右、T4 The Loop 左、
    # T5 Aintree、T6 Brooklands 左、T7 Luffield 右、T8 Woodcote、T9 Copse 右、T10–T13 Maggotts／Becketts 左右左右、
    # T14 Chapel、T15 Stowe 右、T16 Vale 左、T17–T18 Club 右右。T5、T8、T14 的方向導覽沒寫，
    # 由「10 右 8 左」的總數決定（T5 左、T8 右、T14 左），也跟曲率一致
    'silverstone': [
        ([1], 240, 400), ([2], 440, 700), ([3], 740, 860), ([4], 900, 980), ([5], 1100, 1200),
        ([6], 1800, 1990), ([7], 2000, 2260), ([8], 2300, 2600), ([9], 2900, 3100), ([10], 3450, 3550),
        ([11], 3550, 3700), ([12], 3700, 3850), ([13], 3850, 4020), ([14], 4040, 4200), ([15], 4860, 5060),
        ([16], 5300, 5450), ([17], 5450, 5620), ([18], 5620, 5750),
    ],
    # 巴庫逆時針，20 彎。編號依導覽（RaceFans、Red Bull、Wikipedia）：T1–T3 三個 90° 左彎、T4 右 90°、
    # T5–T6 左右 chicane、T7 右、T8 老城堡最窄處（7.6 m）、T13 下坡的高速彎、T14–T16 最難的一段（T15 最難）、
    # T18 在 Maiden Tower 附近；T16 之後沿 Neftçilər 大道有幾個全油門的微彎（T17–T20）。
    # 有導覽明確描述的：T1–T7、T13、T14–T16 的位置；T9–T12（老城堡內）與 T17–T20 只依曲率峰值的順序與數量排定。
    # T4 到 T5 之間 1,862 m、T12 前 2,941 與 3,105 m、T13 之後 3,633 m 有幾個很弱的微彎，不編號
    'baku': [
        ([1], 220, 330), ([2], 560, 680), ([3], 1420, 1540), ([4], 1650, 1760), ([5], 1990, 2055),
        ([6], 2055, 2120), ([7], 2440, 2520), ([8], 2640, 2715), ([9], 2715, 2760), ([10], 2760, 2815),
        ([11], 2815, 2900), ([12], 3200, 3300), ([13], 3400, 3520), ([14], 3650, 3730), ([15], 4000, 4100),
        ([16], 4200, 4300), ([17], 4380, 4440), ([18], 4440, 4520), ([19], 4600, 4700), ([20], 4940, 5060),
    ],
}

CFG = {
    'suzuka': {
        'v_top': 88,        # 直線極速上限（m/s）≈ 317 km/h
        'flatten': False,
        'profile': 'elev',  # 下方剖面圖顯示高程
    },
    'monza': {
        'v_top': 96,        # ≈ 346 km/h
        # 全球 DEM 在 Monza 量到 26 m 起伏，實際只有約 10 m，差額是公園的樹冠與建物。
        # 與其畫假的起伏，不如攤平，改用速度／煞車當視覺語言。
        'flatten': True,
        'profile': 'speed',
    },
    'bahrain': {
        'v_top': 91,        # ≈ 328 km/h
        # 沙漠裡沒有樹冠干擾，全球 DEM 量到 19 m，實際約 17 m——可信，所以畫高程
        'flatten': False,
        'profile': 'elev',
        # OSM 沒標起跑線，取 Pit Lane 中點（發車格在維修區旁）投影到主直線上
        'start_at': (26.0342029, 50.5107138),
    },
    'marina_bay': {
        'v_top': 86,        # ≈ 310 km/h
        # 市區街道賽，四周是大樓，DEM 量到的是屋頂；賽道本身也幾乎是平的
        'flatten': True,
        'profile': 'speed',
    },
    'sepang': {
        'v_top': 90,        # ≈ 324 km/h
        # DEM 量到 29 m，但最高點落在 Genting Curve（T5–T6）；公開資料說高處在 T9–T11 一帶。
        # 對不上，而且賽道被油棕園包圍——跟 Monza 的樹冠問題同一類，所以攤平
        'flatten': True,
        'profile': 'speed',
    },
    'americas': {
        'v_top': 90,        # ≈ 324 km/h
        # DEM 只量到約 21 m 起伏；公開資料說 T1 上坡就有約 41 m，差了一半（解析度抹平了陡坡），
        # 對不上，所以攤平
        'flatten': True,
        'profile': 'speed',
    },
    'rodriguez': {
        'v_top': 92,        # ≈ 331 km/h（海拔 2,240 m，空氣稀薄，下壓力小但直線很快）
        # DEM 只量到 8 m 起伏、賽道本身也幾乎是平的，沒有可以對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
    },
    'interlagos': {
        'v_top': 88,        # ≈ 317 km/h
        # DEM 量到 47 m 起伏，公開資料約 43 m；最高點都在終點線附近，差 9% 在誤差內。
        # 沒有大片樹冠或高樓擋住，所以畫高程
        'flatten': False,
        'profile': 'elev',
    },
    'vegas': {
        'v_top': 92,        # ≈ 331 km/h
        # 市區街道賽，四周是飯店與高樓，DEM 量到的是屋頂，賽道本身幾乎是平的
        'flatten': True,
        'profile': 'speed',
    },
    'losail': {
        'v_top': 90,        # ≈ 324 km/h
        # 沙漠平地，DEM 只量到 6 m 起伏，沒有可以對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
    },
    'yas_marina': {
        'v_top': 90,        # ≈ 324 km/h
        # 填海造陸的平地，DEM 只量到 13 m 起伏，沒有可對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
        # build_track 的 auto 選到 73 m 的維修區連接線，中點剛好落在 T1 頂點；
        # 這裡改用整條維修區（進站口到出站口，約 1.1 km）的中點
        'start_at': (24.4701829, 54.6071093),
    },
    'albert_park': {
        'v_top': 90,        # ≈ 324 km/h
        # 公園裡的臨時賽道，賽道旁有湖與樹，DEM 量到的是樹冠與地形，沒有可對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
        # OSM 沒標起跑線、也沒有維修區；只知道 T14 到 T1 之間約 860 m 的直線，起跑線取 T1 前約 400 m 推估
        'start_at': (-37.8500874, 144.9692549),
    },
    'shanghai': {
        'v_top': 92,        # ≈ 331 km/h
        # 上海平原，DEM 只量到幾公尺起伏，沒有可對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
    },
    'miami': {
        'v_top': 92,        # ≈ 331 km/h
        # 邁阿密平地，DEM 只量到幾公尺起伏，賽道旁是體育場與建物，沒有可對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
    },
    'villeneuve': {
        'v_top': 92,        # ≈ 331 km/h
        # 聖母島是填出來的人工島，DEM 只量到幾公尺起伏，沒有可對照的參考資料，攤平
        'flatten': True,
        'profile': 'speed',
    },
    'monaco': {
        'v_top': 85,        # ≈ 306 km/h
        # 高程 DEM 量到 59 m，公開資料的高低差約 42 m，高了四成——山坡上的建築把地面墊高了（跟新加坡同一類），
        # 對不上，所以攤平
        'flatten': True,
        'profile': 'speed',
        # build_track 的維修區中點（直線距離）被投影到 Rascasse 出口一帶；改用維修區兩端沿賽道的中點
        # （維修區沿賽道從 Antony Noghes 出口到起跑直線約 380 m，中點在起跑直線上）
        'start_at': (43.7335925, 7.4216962),
    },
    'catalunya': {
        'v_top': 88,        # ≈ 317 km/h
        # DEM 量到 38 m 起伏，公開資料約 30 m（+27%）；Mei 決定以立體呈現為準，改畫高程
        'flatten': False,
        'profile': 'elev',
    },
    'red_bull_ring': {
        'v_top': 90,        # ≈ 324 km/h
        # 山坡上的開闊賽道，DEM 量到 68 m 起伏，公開資料 63.5 m（+7%），對得上，畫高程
        'flatten': False,
        'profile': 'elev',
    },
    'spa': {
        'v_top': 92,        # ≈ 331 km/h
        # DEM 量到 103 m 起伏，公開資料 102.2 m（全曆最大），對得上，畫高程
        'flatten': False,
        'profile': 'elev',
    },
    'hungaroring': {
        'v_top': 88,        # ≈ 317 km/h
        # DEM 量到 30 m，公開資料「從維修區山脊往下約 36 m」，差 17%，最低點位置也對不上（DEM 落在 T3–T5，
        # 導覽說在 T6 一帶）——對不上，所以攤平
        'flatten': True,
        'profile': 'speed',
    },
    'zandvoort': {
        'v_top': 88,        # ≈ 317 km/h
        # 沙丘旁的海岸賽道；DEM 高程待確認（公開資料沒有給高低差），先攤平
        'flatten': True,
        'profile': 'speed',
    },
    'silverstone': {
        'v_top': 92,        # ≈ 331 km/h
        # 高程待確認，先攤平
        'flatten': True,
        'profile': 'speed',
    },
    'baku': {
        'v_top': 92,        # ≈ 331 km/h
        # 市區街道賽，四周是大樓與老城牆，DEM 量到的是屋頂；高程待確認，先攤平
        'flatten': True,
        'profile': 'speed',
    },
}

# F1 車輛的粗略上限，用來把幾何換算成速度。
# 橫向抓地力隨速度上升（下壓力正比於 v²），所以高速彎才可能全油門通過。
A_LAT0 = 25.0       # 機械抓地力 m/s²（約 2.5 g）
A_LAT_V = 0.0032    # 下壓力係數，a_lat = A_LAT0 + A_LAT_V * v²
A_ACC = 7.0         # 出彎加速 m/s²
A_BRK = 45.0        # 煞車 m/s²（約 4.6 g）


def smooth(vals, w):
    """環狀移動平均。"""
    m, h = len(vals), w // 2
    return [sum(vals[(i + k) % m] for k in range(-h, h + 1)) / w for i in range(m)]


def resample(raw):
    cum = [0.0]
    for a, b in zip(raw, raw[1:]):
        cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = cum[-1]

    def at(s):
        lo, hi = 0, len(cum) - 1
        while lo + 1 < hi:
            mid = (lo + hi) // 2
            if cum[mid] <= s:
                lo = mid
            else:
                hi = mid
        span = (cum[lo + 1] - cum[lo]) or 1e-9
        f = (s - cum[lo]) / span
        a, b = raw[lo], raw[lo + 1]
        return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f,
                a[2] + (b[2] - a[2]) * f, a[3] or b[3])

    n = int(total // STEP)
    return [at(i * total / n) for i in range(n)]


def rotate_to(S, latlon, origin):
    """把一圈的起點轉到離指定經緯度最近的取樣點（投影方式與 build_track.py 相同）。"""
    lat0, lon0 = origin['lat'], origin['lon']
    mlat = 111132.92 - 559.82 * math.cos(2 * math.radians(lat0))
    mlon = 111412.84 * math.cos(math.radians(lat0))
    x, y = (latlon[1] - lon0) * mlon, (latlon[0] - lat0) * mlat
    k = min(range(len(S)), key=lambda i: math.hypot(S[i][0] - x, S[i][1] - y))
    return S[k:] + S[:k]


def curvature(xs, ys):
    n, out = len(xs), []
    for i in range(n):
        a, b, c = (i - 2) % n, i, (i + 2) % n
        v1 = (xs[b] - xs[a], ys[b] - ys[a])
        v2 = (xs[c] - xs[b], ys[c] - ys[b])
        l1 = math.hypot(*v1) or 1e-9
        l2 = math.hypot(*v2) or 1e-9
        cross = (v1[0] * v2[1] - v1[1] * v2[0]) / (l1 * l2)
        out.append(math.asin(max(-1, min(1, cross))) / ((l1 + l2) / 2))
    return out


def speed_model(curv, ds, v_top):
    """由曲率推一圈的速度：先取過彎上限，再前後掃描套用加速與煞車極限。"""
    n = len(curv)
    # v² k = A_LAT0 + A_LAT_V v²  →  v = sqrt(A_LAT0 / (k - A_LAT_V))
    lim = [min(v_top, math.sqrt(A_LAT0 / (abs(k) - A_LAT_V))) if abs(k) > A_LAT_V + 1e-4 else v_top
           for k in curv]
    v = lim[:]
    for _ in range(3):                       # 環狀，多掃幾次才收斂
        for i in range(n):                   # 出彎加速
            j = (i + 1) % n
            v[j] = min(v[j], math.sqrt(v[i] ** 2 + 2 * A_ACC * ds))
        for i in range(n - 1, -1, -1):       # 入彎煞車
            j = (i - 1) % n
            v[j] = min(v[j], math.sqrt(v[i] ** 2 + 2 * A_BRK * ds))
    return v, lim


def states(v, lim):
    """每個點的狀態：0 = 全油門, 1 = 彎中維持（抓地力受限）, 2 = 煞車。

    判準是「誰在限制車速」：還在減速就是煞車；速度離抓地力上限還有餘裕，
    代表限制它的是引擎不是輪胎，也就是全油門；貼著上限跑就是彎中維持。
    """
    n, out = len(v), []
    for i in range(n):
        if v[(i + 1) % n] < v[i] - 0.05:
            out.append(2)
        elif v[i] < lim[i] * 0.97:
            out.append(0)
        else:
            out.append(1)
    return out


def find_turns(tid, dist, curv, segs):
    """把人工指定的彎號分組，依區間內的曲率彎心切成一個個彎。"""
    turns = []
    for nums, a, b in TURN_GROUPS.get(tid, []):
        idx = [i for i, d in enumerate(dist) if a <= d <= b]
        if not idx:
            continue
        # 先把區間平均切成 n 段，每段各取曲率最大的點當彎心。
        # 這樣彎心一定照順序、也不會擠在一起（單純挑最彎的 n 個點會出這個問題）。
        picked = []
        for m in range(len(nums)):
            a2 = idx[len(idx) * m // len(nums)]
            b2 = idx[min(len(idx) * (m + 1) // len(nums), len(idx) - 1)]
            sub = list(range(a2, max(a2 + 1, b2)))
            picked.append(max(sub, key=lambda i: abs(curv[i])))

        # 彎與彎的界線取彎心之間的中點
        bounds = [idx[0]] + [(picked[m] + picked[m + 1]) // 2
                             for m in range(len(picked) - 1)] + [idx[-1]]
        for m, n in enumerate(nums):
            turns.append({
                'n': n,
                'from': round(dist[bounds[m]], 1),
                'to': round(dist[bounds[m + 1]], 1),
                'apex': round(dist[picked[m]], 1),
                'seg': segs[picked[m]],
            })
    return turns


def main(tid):
    cfg = CFG[tid]
    t = json.load(open(f'data/{tid}_track.json'))
    raw = [(p['x'], p['y'], p.get('z') or 0.0, p['seg']) for p in t['points']]   # 攤平的賽道不需要高程
    raw.append(raw[0])

    S = resample(raw)
    start_at = cfg.get('start_at') or t.get('start_at')    # 設定優先，否則用 build_track 算出的
    if start_at:
        S = rotate_to(S, start_at, t['origin'])
    xs = smooth([p[0] for p in S], 3)
    ys = smooth([p[1] for p in S], 3)
    zs = smooth([p[2] for p in S], ELEV_SMOOTH)
    segs = [p[3] for p in S]
    if cfg['flatten']:
        zs = [0.0] * len(zs)

    dist = [0.0]
    for i in range(1, len(xs)):
        dist.append(dist[-1] + math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]))
    # OSM 折線在彎頂會有尖角，直接算曲率會出現假的急彎，先平滑掉
    curv = smooth(curvature(xs, ys), 7)
    v, lim = speed_model(curv, STEP, cfg['v_top'])
    st = states(v, lim)
    turns = find_turns(tid, dist, curv, segs)
    # 每個取樣點屬於第幾號彎，不在彎裡就是 0（直線）
    tn = [0] * len(xs)
    for t_ in turns:
        for i, d in enumerate(dist):
            if t_['from'] <= d <= t_['to']:
                tn[i] = t_['n']

    dt = [STEP / max(x, 1) for x in v]
    lap = sum(dt)
    # 以時間計的佔比。這裡不宣稱「全油門」（模型分不出油門踏板開度），
    # 只講模型真的算得出來的事：花多少時間在加速、在煞車、在高速。
    accel = sum(t_ for t_, s in zip(dt, st) if s == 0) / lap * 100
    brake = sum(t_ for t_, s in zip(dt, st) if s == 2) / lap * 100
    fast = sum(t_ for t_, x in zip(dt, v) if x * 3.6 > 300) / lap * 100
    zmin = min(zs)

    print(f'{tid}: {dist[-1]:.0f} m / {len(xs)} 取樣點  高程 {zmin:.1f}~{max(zs):.1f} '
          f'({"攤平" if cfg["flatten"] else t.get("elev_source")})')
    print(f'  模型單圈 {lap:.1f} s，極速 {max(v) * 3.6:.0f} km/h，最慢 {min(v) * 3.6:.0f} km/h')
    print(f'  彎角 {len(turns)} 個：' + ' '.join(f"T{t_['n']}@{t_['apex']:.0f}" for t_ in turns))
    print(f'  加速區 {accel:.0f}%，煞車區 {brake:.0f}%，時速 300 以上 {fast:.0f}%')

    out = {
        'id': tid,
        'length_m': round(dist[-1], 1),
        'step': STEP,
        'elev_min': round(zmin, 1),
        'elev_max': round(max(zs), 1),
        'flat': cfg['flatten'],
        'profile': cfg['profile'],
        'accel_pct': round(accel),
        'brake_pct': round(brake),
        'over300_pct': round(fast),
        'v_max_kmh': round(max(v) * 3.6),
        'v_min_kmh': round(min(v) * 3.6),
        'x': [round(a, 2) for a in xs],
        'y': [round(a, 2) for a in ys],
        'z': [round(a - zmin, 2) for a in zs],
        'd': [round(a, 1) for a in dist],
        'k': [round(a, 5) for a in curv],
        'v': [round(a * 3.6) for a in v],     # km/h
        'st': st,
        'turns': turns,
        'tn': tn,
        'seg': segs,
    }
    with open(f'tracks/{tid}.js', 'w') as f:
        f.write('export const TRACK = ' + json.dumps(out, ensure_ascii=False) + ';\n')

    cur, start = segs[0], 0
    for i in range(1, len(segs) + 1):
        if i == len(segs) or segs[i] != cur:
            if cur:
                print(f'  {dist[start]:6.0f}–{dist[i - 1]:6.0f} m  {cur}')
            if i < len(segs):
                cur, start = segs[i], i


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'suzuka')
