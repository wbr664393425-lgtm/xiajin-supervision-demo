/** 大数据穿透监督虚构样例：三资、惠民资金、招投标、公务支出。全部为演示数据。 */

// ───────── 农村三资 ─────────
export interface Contract { id: string; town: string; village: string; asset: string; kind: '场地' | '厂房' | '耕地' | '鱼塘' | '门面'; tenant: string; start: string; end: string; annualRent: number; marketRent: number; dueDate: string; meeting: boolean; publicity: boolean; renewed?: boolean }
export interface Receipt { id: string; contractId: string; date: string; amount: number; method: '银行转账' | '现金' | '收据' }
export interface IdleAsset { id: string; town: string; village: string; name: string; idleSince: string; value: number }
export interface Voucher { id: string; town: string; village: string; date: string; item: string; amount: number; voucherNo: string; type: '发票' | '白条' | '收据'; approver: string }

export const contracts: Contract[] = [
  { id: 'SZ-HT-2026-018', town: 'qinghe', village: '和盛村', asset: '村北集体场地 12 亩', kind: '场地', tenant: '禾川农机服务社', start: '2026-01-01', end: '2026-12-31', annualRent: 36000, marketRent: 62000, dueDate: '2026-06-30', meeting: false, publicity: true },
  { id: 'SZ-HT-2026-021', town: 'qinghe', village: '禾丰村', asset: '村西闲置厂房 800㎡', kind: '厂房', tenant: '外地个体经营者', start: '2026-03-01', end: '2036-02-28', annualRent: 20000, marketRent: 38000, dueDate: '2026-03-31', meeting: false, publicity: false },
  { id: 'SZ-HT-2025-009', town: 'qingyuan', village: '清源村', asset: '集体鱼塘 30 亩', kind: '鱼塘', tenant: '清源水产合作社', start: '2025-01-01', end: '2027-12-31', annualRent: 45000, marketRent: 48000, dueDate: '2026-01-31', meeting: true, publicity: true },
  { id: 'SZ-HT-2023-004', town: 'xinqiao', village: '新桥村', asset: '临街门面 3 间', kind: '门面', tenant: '新桥超市', start: '2023-07-01', end: '2026-06-30', annualRent: 28000, marketRent: 30000, dueDate: '2025-07-31', meeting: true, publicity: true, renewed: false },
  { id: 'SZ-HT-2026-030', town: 'donghe', village: '东河村', asset: '集体耕地 200 亩', kind: '耕地', tenant: '东河种植大户', start: '2026-01-01', end: '2030-12-31', annualRent: 160000, marketRent: 170000, dueDate: '2026-03-31', meeting: true, publicity: true },
  { id: 'SZ-HT-2026-033', town: 'baita', village: '白塔村', asset: '村部旧址院落', kind: '场地', tenant: '白塔物流', start: '2026-02-01', end: '2029-01-31', annualRent: 15000, marketRent: 26000, dueDate: '2026-02-28', meeting: true, publicity: false },
  { id: 'SZ-HT-2026-040', town: 'maixiang', village: '丰收村', asset: '集体耕地 85 亩', kind: '耕地', tenant: '丰收家庭农场', start: '2026-01-01', end: '2028-12-31', annualRent: 68000, marketRent: 70000, dueDate: '2026-04-30', meeting: true, publicity: true },
  { id: 'SZ-HT-2026-044', town: 'liuwan', village: '东柳村', asset: '村东鱼塘 18 亩', kind: '鱼塘', tenant: '个体养殖户', start: '2026-01-01', end: '2026-12-31', annualRent: 21000, marketRent: 23000, dueDate: '2026-05-31', meeting: true, publicity: true },
]
export const receipts: Receipt[] = [
  { id: 'R-01', contractId: 'SZ-HT-2026-018', date: '2026-03-18', amount: 12000, method: '银行转账' },
  { id: 'R-02', contractId: 'SZ-HT-2026-021', date: '2026-04-20', amount: 20000, method: '现金' },
  { id: 'R-03', contractId: 'SZ-HT-2025-009', date: '2026-01-25', amount: 45000, method: '银行转账' },
  { id: 'R-04', contractId: 'SZ-HT-2023-004', date: '2025-07-28', amount: 28000, method: '银行转账' },
  { id: 'R-05', contractId: 'SZ-HT-2026-030', date: '2026-03-30', amount: 80000, method: '银行转账' },
  { id: 'R-06', contractId: 'SZ-HT-2026-033', date: '2026-02-26', amount: 15000, method: '收据' },
  { id: 'R-07', contractId: 'SZ-HT-2026-040', date: '2026-04-28', amount: 68000, method: '银行转账' },
  { id: 'R-08', contractId: 'SZ-HT-2026-044', date: '2026-06-20', amount: 21000, method: '银行转账' },
]
export const idleAssets: IdleAsset[] = [
  { id: 'ZC-QY-07', town: 'qingyuan', village: '水泉村', name: '原村小学校舍', idleSince: '2024-09-01', value: 420000 },
  { id: 'ZC-XL-03', town: 'xilin', village: '红杏村', name: '冷藏库（扶贫项目）', idleSince: '2025-03-01', value: 680000 },
  { id: 'ZC-SY-02', town: 'sangyuan', village: '椹果村', name: '农产品展销棚', idleSince: '2026-05-01', value: 150000 },
  { id: 'ZC-BT-05', town: 'baita', village: '塔前村', name: '光伏配套用房', idleSince: '2025-06-01', value: 230000 },
]
export const vouchers: Voucher[] = [
  { id: 'PZ-1001', town: 'qingyuan', village: '清源村', date: '2026-10-08', item: '办公用品', amount: 2380, voucherNo: 'FP-37010026', type: '发票', approver: '村会计' },
  { id: 'PZ-1002', town: 'qingyuan', village: '清源村', date: '2026-10-21', item: '办公用品', amount: 2380, voucherNo: 'FP-37010026', type: '发票', approver: '村会计' },
  { id: 'PZ-1003', town: 'donghe', village: '东河村', date: '2026-09-12', item: '工作餐', amount: 3600, voucherNo: '—', type: '白条', approver: '村主任' },
  { id: 'PZ-1004', town: 'donghe', village: '东河村', date: '2026-09-30', item: '工作餐', amount: 4200, voucherNo: '—', type: '白条', approver: '村主任' },
  { id: 'PZ-1005', town: 'xinqiao', village: '石桥村', date: '2026-08-15', item: '排水沟材料', amount: 18600, voucherNo: 'FP-37022811', type: '发票', approver: '村支书' },
  { id: 'PZ-1006', town: 'xinqiao', village: '石桥村', date: '2026-08-29', item: '排水沟材料', amount: 18600, voucherNo: 'FP-37022859', type: '发票', approver: '村支书' },
  { id: 'PZ-1007', town: 'liuwan', village: '柳湾村', date: '2026-07-03', item: '绿化苗木', amount: 9800, voucherNo: '—', type: '收据', approver: '村主任' },
  { id: 'PZ-1008', town: 'maixiang', village: '麦香村', date: '2026-10-11', item: '电费', amount: 1260, voucherNo: 'FP-37031120', type: '发票', approver: '村会计' },
]

// ───────── 惠民惠农资金 ─────────
export type GrantItem = '耕地地力补贴' | '高龄津贴' | '困难群众救助' | '农机购置补贴'
export interface Grant { id: string; name: string; idNo: string; town: string; village: string; item: GrantItem; amount: number; period: string; parcel?: string }
export interface Resident { idNo: string; name: string; age: number; status: '正常' | '死亡' | '迁出'; date?: string }
export interface Land { parcel: string; owner: string; area: number }
export interface Insurance { idNo: string; medical: '城乡居民医保' | '职工医保'; pension: '城乡居民养老' | '机关事业养老' | '企业职工养老' }

export const grants: Grant[] = [
  { id: 'BT-001', name: '李某芳', idNo: '3714**********2361', town: 'qingyuan', village: '清源村', item: '耕地地力补贴', amount: 1260, period: '2026', parcel: 'QY-0218' },
  { id: 'BT-002', name: '李某芳', idNo: '3714**********2361', town: 'qingyuan', village: '水泉村', item: '耕地地力补贴', amount: 980, period: '2026', parcel: 'SQ-0431' },
  { id: 'BT-003', name: '赵某兰', idNo: '3714**********0825', town: 'liuwan', village: '柳湾村', item: '高龄津贴', amount: 1200, period: '2026', },
  { id: 'BT-004', name: '孙某梅', idNo: '3714**********4410', town: 'liuwan', village: '柳湾村', item: '困难群众救助', amount: 3600, period: '2026' },
  { id: 'BT-005', name: '钱某华', idNo: '3714**********7703', town: 'baita', village: '塔前村', item: '困难群众救助', amount: 3600, period: '2026' },
  { id: 'BT-006', name: '周某德', idNo: '3714**********1169', town: 'xinqiao', village: '新桥村', item: '耕地地力补贴', amount: 1540, period: '2026', parcel: 'XQ-0107' },
  { id: 'BT-007', name: '周某强', idNo: '3714**********5521', town: 'xinqiao', village: '新桥村', item: '耕地地力补贴', amount: 1540, period: '2026', parcel: 'XQ-0107' },
  { id: 'BT-008', name: '吴某山', idNo: '3714**********3392', town: 'donghe', village: '河湾村', item: '高龄津贴', amount: 1200, period: '2026' },
  { id: 'BT-009', name: '郑某玲', idNo: '3714**********6614', town: 'maixiang', village: '丰收村', item: '耕地地力补贴', amount: 860, period: '2026', parcel: 'FS-0322' },
  { id: 'BT-010', name: '冯某生', idNo: '3714**********2208', town: 'sangyuan', village: '桑园村', item: '农机购置补贴', amount: 12000, period: '2026' },
  { id: 'BT-011', name: '冯某生', idNo: '3714**********2208', town: 'sangyuan', village: '桑园村', item: '农机购置补贴', amount: 12000, period: '2026' },
  { id: 'BT-012', name: '王某秀', idNo: '3714**********9031', town: 'chengdong', village: '运河社区', item: '高龄津贴', amount: 1200, period: '2026' },
  { id: 'BT-013', name: '褚某平', idNo: '3714**********8847', town: 'xilin', village: '杏林村', item: '困难群众救助', amount: 3600, period: '2026' },
  { id: 'BT-014', name: '陈某英', idNo: '3714**********1576', town: 'qinghe', village: '禾丰村', item: '耕地地力补贴', amount: 1120, period: '2026', parcel: 'HF-0209' },
]
export const residents: Resident[] = [
  { idNo: '3714**********2361', name: '李某芳', age: 46, status: '正常' },
  { idNo: '3714**********0825', name: '赵某兰', age: 86, status: '死亡', date: '2025-11-20' },
  { idNo: '3714**********4410', name: '孙某梅', age: 52, status: '正常' },
  { idNo: '3714**********7703', name: '钱某华', age: 58, status: '正常' },
  { idNo: '3714**********1169', name: '周某德', age: 63, status: '正常' },
  { idNo: '3714**********5521', name: '周某强', age: 38, status: '正常' },
  { idNo: '3714**********3392', name: '吴某山', age: 77, status: '正常' },
  { idNo: '3714**********6614', name: '郑某玲', age: 55, status: '迁出', date: '2024-06-01' },
  { idNo: '3714**********2208', name: '冯某生', age: 49, status: '正常' },
  { idNo: '3714**********9031', name: '王某秀', age: 91, status: '死亡', date: '2026-02-14' },
  { idNo: '3714**********8847', name: '褚某平', age: 61, status: '正常' },
  { idNo: '3714**********1576', name: '陈某英', age: 59, status: '正常' },
]
export const lands: Land[] = [
  { parcel: 'QY-0218', owner: '3714**********2361', area: 3.2 },
  { parcel: 'SQ-0431', owner: '3714**********0000', area: 2.5 },
  { parcel: 'XQ-0107', owner: '3714**********1169', area: 4.1 },
  { parcel: 'FS-0322', owner: '3714**********6614', area: 2.3 },
  { parcel: 'HF-0209', owner: '3714**********1576', area: 2.9 },
]
export const insurance: Insurance[] = [
  { idNo: '3714**********4410', medical: '城乡居民医保', pension: '城乡居民养老' },
  { idNo: '3714**********7703', medical: '职工医保', pension: '机关事业养老' },
  { idNo: '3714**********8847', medical: '城乡居民医保', pension: '城乡居民养老' },
]

// ───────── 政府采购 / 工程招投标 ─────────
export interface Company { name: string; legalRep: string; phone: string; address: string }
export interface Bid { company: string; price: number; score: number; days: number; doc: string }
export interface Project { id: string; name: string; town: string; owner: string; budget: number; date: string; winner: string; bids: Bid[] }
export const companies: Company[] = [
  { name: '鑫路建设工程有限公司', legalRep: '秦某', phone: '138****6621', address: '乡镇C运河路 18 号' },
  { name: '通达路桥有限公司', legalRep: '尤某', phone: '139****0457', address: '乡镇A纺织路 66 号' },
  { name: '恒基市政工程有限公司', legalRep: '秦某', phone: '138****6621', address: '乡镇C运河路 18 号 2 楼' },
  { name: '远航建筑有限公司', legalRep: '许某', phone: '137****8812', address: '乡镇B花园路 9 号' },
  { name: '绿森园林公司', legalRep: '冯某勇', phone: '136****2203', address: '乡镇B建设路 3 号' },
  { name: '佳景园林工程有限公司', legalRep: '何某', phone: '135****7750', address: '乡镇C新华路 21 号' },
  { name: '明德建设有限公司', legalRep: '吕某', phone: '133****1196', address: '乡镇I工业园 5 号' },
]
const docA = '本项目施工组织设计遵循安全第一、质量为本的原则，路基采用分层压实工艺，每层厚度不超过三十厘米，压实度不低于百分之九十六。混凝土面层采用商品混凝土，养护期不少于七天。'
export const projects: Project[] = [
  { id: 'XQ-GC-2026-07', name: '新桥村道路硬化工程', town: 'xinqiao', owner: '乡镇J新桥村', budget: 520000, date: '2026-05-10', winner: '鑫路建设工程有限公司', bids: [
    { company: '鑫路建设工程有限公司', price: 498600, score: 92.5, days: 60, doc: docA },
    { company: '恒基市政工程有限公司', price: 501200, score: 84.0, days: 60, doc: docA.replace('三十厘米', '30厘米') },
    { company: '通达路桥有限公司', price: 503500, score: 81.5, days: 60, doc: docA.replace('商品混凝土', '自拌混凝土') },
  ] },
  { id: 'XQ-GC-2026-11', name: '石桥村排水沟工程', town: 'xinqiao', owner: '乡镇J石桥村', budget: 310000, date: '2026-07-22', winner: '鑫路建设工程有限公司', bids: [
    { company: '鑫路建设工程有限公司', price: 296800, score: 90.0, days: 45, doc: '排水沟采用 C25 混凝土现浇，沟底纵坡不小于千分之三，伸缩缝间距十米，施工期间设置临时导流。' },
    { company: '恒基市政工程有限公司', price: 298900, score: 83.0, days: 45, doc: '排水沟采用 C25 混凝土现浇，沟底纵坡不小于千分之三，伸缩缝间距十米，施工期间设置临时导流措施。' },
    { company: '远航建筑有限公司', price: 299500, score: 80.5, days: 45, doc: '沟体为现浇混凝土结构，按设计坡度施工，并做好雨季施工准备与围挡。' },
  ] },
  { id: 'MX-GC-2026-03', name: '麦香村文化广场工程', town: 'maixiang', owner: '乡镇H麦香村', budget: 135000, date: '2026-06-18', winner: '鑫路建设工程有限公司', bids: [
    { company: '鑫路建设工程有限公司', price: 120000, score: 95.0, days: 20, doc: '广场铺装采用透水砖，设置健身器材区与宣传栏。' },
    { company: '明德建设有限公司', price: 131000, score: 71.0, days: 50, doc: '广场整体采用花岗岩铺装，设置休闲座椅与绿化带。' },
    { company: '远航建筑有限公司', price: 128500, score: 74.0, days: 48, doc: '广场铺装以混凝土彩砖为主，配套照明与排水。' },
  ] },
  { id: 'BC-GC-2026-05', name: '花园社区老旧小区绿化工程', town: 'beichen', owner: '乡镇B花园社区', budget: 90000, date: '2026-04-02', winner: '绿森园林公司', bids: [
    { company: '绿森园林公司', price: 86000, score: 88.0, days: 30, doc: '选用乡土树种，乔灌草结合，种植后养护一年。' },
    { company: '佳景园林工程有限公司', price: 72000, score: 79.0, days: 32, doc: '采用乔木与地被组合，配套滴灌设施，养护期一年。' },
  ] },
  { id: 'BT-CG-2026-02', name: '乡镇I便民服务中心设备采购', town: 'baita', owner: '乡镇I人民政府', budget: 260000, date: '2026-03-15', winner: '明德建设有限公司', bids: [
    { company: '明德建设有限公司', price: 238000, score: 86.0, days: 30, doc: '提供叫号系统、自助终端与办公桌椅，含三年质保。' },
    { company: '远航建筑有限公司', price: 251000, score: 82.0, days: 35, doc: '供货含排队叫号设备、自助查询机，质保两年。' },
    { company: '通达路桥有限公司', price: 245000, score: 80.0, days: 40, doc: '设备清单：自助终端两台、叫号系统一套、桌椅若干。' },
  ] },
]

// ───────── 津补贴、公车、公务支出 ─────────
export interface Allowance { id: string; dept: string; town?: string; person: string; item: string; amount: number; month: string; basis: string }
export interface Reception { id: string; dept: string; town?: string; date: string; guest: string; local: boolean; people: number; amount: number; letter: boolean }
export interface MealInvoice { id: string; dept: string; town?: string; date: string; time: string; vendor: string; amount: number; weekend: boolean }
export interface CarTrip { id: string; dept: string; town?: string; plate: string; date: string; weekend: boolean; route: string; km: number; purpose: string }
export const approvedAllowances = ['乡镇工作补贴', '交通补贴', '通讯补贴', '取暖补贴']
export const allowances: Allowance[] = [
  { id: 'JB-01', dept: '乡镇G人民政府', town: 'qinghe', person: '全体干部（38人）', item: '节日慰问金', amount: 30400, month: '2026-09', basis: '镇党委会议纪要' },
  { id: 'JB-02', dept: '乡镇G人民政府', town: 'qinghe', person: '全体干部（38人）', item: '乡镇工作补贴', amount: 19000, month: '2026-09', basis: '县统一标准' },
  { id: 'JB-03', dept: '县农业农村局', person: '项目组（12人）', item: '加班补助', amount: 14400, month: '2026-08', basis: '无' },
  { id: 'JB-04', dept: '乡镇I人民政府', town: 'baita', person: '全体干部（41人）', item: '交通补贴', amount: 12300, month: '2026-09', basis: '县统一标准' },
  { id: 'JB-05', dept: '乡镇F人民政府', town: 'donghe', person: '班子成员（7人）', item: '考核奖励', amount: 21000, month: '2026-07', basis: '镇自定' },
  { id: 'JB-06', dept: '县住建局', person: '全体干部（26人）', item: '通讯补贴', amount: 5200, month: '2026-09', basis: '县统一标准' },
]
export const receptions: Reception[] = [
  { id: 'JD-01', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-03', guest: '县直部门调研', local: true, people: 8, amount: 1960, letter: false },
  { id: 'JD-02', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-11', guest: '县直部门检查', local: true, people: 10, amount: 2480, letter: false },
  { id: 'JD-03', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-19', guest: '县直部门座谈', local: true, people: 9, amount: 2310, letter: true },
  { id: 'JD-04', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-26', guest: '县直部门督导', local: true, people: 11, amount: 2860, letter: false },
  { id: 'JD-05', dept: '县农业农村局', date: '2026-10-15', guest: '市局检查组', local: false, people: 6, amount: 780, letter: true },
  { id: 'JD-06', dept: '乡镇D人民政府', town: 'xilin', date: '2026-10-09', guest: '外县考察团', local: false, people: 15, amount: 3900, letter: true },
]
export const meals: MealInvoice[] = [
  { id: 'CY-01', dept: '县住建局', date: '2026-10-03', time: '20:40', vendor: '运河人家酒楼', amount: 3280, weekend: true },
  { id: 'CY-02', dept: '县住建局', date: '2026-10-17', time: '22:30', vendor: '运河人家酒楼', amount: 980, weekend: false },
  { id: 'CY-03', dept: '县住建局', date: '2026-10-17', time: '22:35', vendor: '运河人家酒楼', amount: 990, weekend: false },
  { id: 'CY-04', dept: '县住建局', date: '2026-10-17', time: '22:41', vendor: '运河人家酒楼', amount: 960, weekend: false },
  { id: 'CY-05', dept: '乡镇I人民政府', town: 'baita', date: '2026-09-22', time: '12:10', vendor: '镇机关食堂', amount: 420, weekend: false },
  { id: 'CY-06', dept: '乡镇J人民政府', town: 'xinqiao', date: '2026-09-28', time: '19:50', vendor: '桥头农家院', amount: 2600, weekend: true },
]
export const carTrips: CarTrip[] = [
  { id: 'GC-01', dept: '县农业农村局', plate: '鲁N·G0215', date: '2026-10-04', weekend: true, route: '县城—外省景区', km: 486, purpose: '未登记' },
  { id: 'GC-02', dept: '乡镇J人民政府', town: 'xinqiao', plate: '鲁N·G1306', date: '2026-10-12', weekend: false, route: '镇政府—各村', km: 62, purpose: '巡查秸秆禁烧' },
  { id: 'GC-03', dept: '乡镇J人民政府', town: 'xinqiao', plate: '鲁N·G1306', date: '2026-10-18', weekend: true, route: '镇政府—市区商场', km: 138, purpose: '办事' },
  { id: 'GC-04', dept: '乡镇F人民政府', town: 'donghe', plate: '鲁N·G2287', date: '2026-10-21', weekend: false, route: '镇政府—县城', km: 54, purpose: '送报材料' },
]
