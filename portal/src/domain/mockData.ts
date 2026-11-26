import type {
  AuditEntry,
  Cadre,
  CaseFile,
  Channel,
  ClueRecord,
  FeedbackIssue,
  InspDoc,
  KbEntry,
  PublicOpinionPost,
  RoleDef,
  VerifyTask,
} from './types'

/** 汇报演示固定业务基准日 */
export const TODAY = '2026-11-07'

export const ROLES: RoleDef[] = [
  {
    key: 'leader',
    label: '委领导 / 统筹督办',
    dept: '县纪委监委机关',
    summary: '统筹全县 14 乡镇监督态势、重点超期盯办与跨库穿透研判',
    defaultPage: 'home',
  },
  {
    key: 'xinfang',
    label: '信访研判专员',
    dept: '信访室',
    summary: '多渠道信访来信解析、原文核对批注、重复多头比对与分办转核查',
    defaultPage: 'clues',
  },
  {
    key: 'jiandu',
    label: '监督检查专员',
    dept: '第一监督检查室',
    summary: '农村三资、惠民资金、招投标与公务支出跨库比对疑点核查',
    defaultPage: 'radar',
  },
  {
    key: 'xuncha',
    label: '巡察工作专员',
    dept: '县委第二巡察组',
    summary: '台账批量阅卷程序检出、整改方案防表态比对与复核销号',
    defaultPage: 'inspection',
  },
  {
    key: 'shenli',
    label: '案件审理专员',
    dept: '案件审理室',
    summary: '案卷跨材料印证、证据要件与程序节点校验、法规指引检索',
    defaultPage: 'inspection',
  },
]

export interface Town {
  id: string
  name: string
  villages: string[]
  gridCol: number
  gridRow: number
  zone: '城区街道' | '中部片区' | '北部片区' | '南部片区'
}

export const TOWNS: Town[] = [
  { id: 'chengxi', name: '乡镇A', villages: ['西关社区', '纺织社区'], gridCol: 2, gridRow: 2, zone: '城区街道' },
  { id: 'beichen', name: '乡镇B', villages: ['北辰社区', '花园社区'], gridCol: 3, gridRow: 1, zone: '城区街道' },
  { id: 'chengdong', name: '乡镇C', villages: ['东关社区', '运河社区'], gridCol: 4, gridRow: 2, zone: '城区街道' },
  { id: 'xilin', name: '乡镇D', villages: ['杏林村', '红杏村'], gridCol: 1, gridRow: 1, zone: '北部片区' },
  { id: 'sangyuan', name: '乡镇E', villages: ['桑园村', '椹果村'], gridCol: 2, gridRow: 1, zone: '北部片区' },
  { id: 'donghe', name: '乡镇F', villages: ['东河村', '河湾村'], gridCol: 5, gridRow: 2, zone: '中部片区' },
  { id: 'qinghe', name: '乡镇G', villages: ['和盛村', '禾丰村', '前屯村'], gridCol: 1, gridRow: 2, zone: '中部片区' },
  { id: 'maixiang', name: '乡镇H', villages: ['麦香村', '丰收村'], gridCol: 3, gridRow: 2, zone: '中部片区' },
  { id: 'baita', name: '乡镇I', villages: ['白塔村', '塔前村'], gridCol: 4, gridRow: 1, zone: '北部片区' },
  { id: 'xinqiao', name: '乡镇J', villages: ['新桥村', '石桥村'], gridCol: 5, gridRow: 1, zone: '北部片区' },
  { id: 'qingyuan', name: '乡镇K', villages: ['清源村', '水泉村'], gridCol: 1, gridRow: 3, zone: '南部片区' },
  { id: 'baimahu', name: '乡镇L', villages: ['湖滨村', '芦庄村'], gridCol: 2, gridRow: 3, zone: '南部片区' },
  { id: 'liuwan', name: '乡镇M', villages: ['柳湾村', '东柳村'], gridCol: 3, gridRow: 3, zone: '南部片区' },
  { id: 'tianzhuang', name: '乡镇N', villages: ['田东村', '槐树村'], gridCol: 4, gridRow: 3, zone: '南部片区' },
]

export const townName = (id?: string) => TOWNS.find(t => t.id === id)?.name || id || '县直部门'

export const SEED_CLUES: ClueRecord[] = [
  {
    id: 'XF-2026-0102',
    channel: '来信',
    receivedAt: '2026-10-12',
    town: 'qinghe',
    village: '和盛村',
    reporter: '实名 · 群众甲',
    flowStage: '初步核实',
    content:
      '反映乡镇G和盛村村委会主任张某军，将村集体场地以明显低于周边市场价格的租金，租给其亲属开办的禾川农机服务社使用。租赁合同编号SZ-HT-2026-018，约定年租金36,000元，应于2026年6月30日前付清，但村务公开栏只见到账12,000元，余款去向不明。希望组织调查合同签订过程是否经过村民代表会议，并公开全部收款凭证。',
  },
  {
    id: 'XF-2026-0103',
    channel: '网络举报',
    receivedAt: '2026-10-19',
    town: 'qinghe',
    village: '和盛村',
    reporter: '匿名网友',
    flowStage: '登记受理',
    content:
      '和盛村的集体场地给了村主任张某军的亲戚，合同SZ-HT-2026-018一年租金才36,000元，周边同样的场地都要六万多。听说钱也没交齐，只交了12,000元。请上级纪委查一查，给村民一个说法。',
  },
  {
    id: 'XF-2026-0117',
    channel: '来信',
    receivedAt: '2026-10-29',
    town: 'donghe',
    village: '河湾村',
    reporter: '实名 · 知情人',
    flowStage: '登记受理',
    content:
      '乡镇F河湾村原村委会主任郑某，在镇纪委对其谈话了解期间，与会计串供，并让会计销毁部分2025年账目凭证，对抗组织审查。希望尽快固定证据。',
  },
  {
    id: 'XF-2026-0106',
    channel: '12345工单',
    receivedAt: '2026-10-15',
    town: 'xinqiao',
    village: '新桥村',
    reporter: '工单转办 · 12345-2610-0457',
    flowStage: '初步核实',
    content:
      '【12345工单转办】来电人反映乡镇J新桥村党支部书记王某民，在村内道路硬化工程（项目编号XQ-GC-2026-07）中指定由鑫路建设工程有限公司施工，并收取工程回扣约50,000元。工程于2026年8月完工，路面已出现开裂。来电人要求核实工程招标和验收情况。',
  },
  {
    id: 'XF-2026-0107',
    channel: '网络举报',
    receivedAt: '2026-10-28',
    town: 'xinqiao',
    village: '石桥村',
    reporter: '匿名网友',
    flowStage: '分办交办',
    content:
      '乡镇J近两年好几个村的工程都是鑫路建设工程有限公司中标，报价每次都和其他几家差不多，像是商量好的。石桥村排水沟工程XQ-GC-2026-11也是这家。怀疑有人打招呼、围标串标，请纪委关注。',
  },
  {
    id: 'XF-2026-0112',
    channel: '来信',
    receivedAt: '2026-10-30',
    town: 'maixiang',
    village: '麦香村',
    reporter: '实名 · 群众丙',
    flowStage: '初步核实',
    content:
      '反映新桥村党支部书记王某民利用其在镇里的关系，帮助鑫路建设工程有限公司承揽乡镇H麦香村文化广场工程MX-GC-2026-03，工程款120,000元。王某民的亲属在该公司任职。希望查清两者之间的利益关系。',
  },
  {
    id: 'XF-2026-0104',
    channel: '来访',
    receivedAt: '2026-10-08',
    town: 'qingyuan',
    village: '清源村',
    reporter: '实名 · 群众乙',
    flowStage: '处置办结',
    humanConfirmed: true,
    content:
      '乡镇K清源村会计李某华在2026年第三季度农业设施补助名单中，把其不符合条件的亲属李某芳列入申报，领取补助8,000元。全村补助总额48,000元，名单公示只贴了两天就撤下了。请求核查申报材料和验收记录，取消不符合条件人员的补助。',
  },
  {
    id: 'XF-2026-0105',
    channel: '来信',
    receivedAt: '2026-10-26',
    town: 'qingyuan',
    village: '清源村',
    reporter: '实名 · 群众乙',
    flowStage: '分办交办',
    content:
      '再次反映乡镇K清源村会计李某华在2026年第三季度农业设施补助名单中，把不符合条件的亲属李某芳列入申报，领取补助8,000元。名单公示只贴了两天就撤下了，至今没有答复。请求核查申报材料和验收记录。',
  },
  {
    id: 'XF-2026-0109',
    channel: '来信',
    receivedAt: '2026-10-10',
    town: 'baita',
    village: '白塔村',
    reporter: '实名 · 群众丁',
    flowStage: '分办交办',
    content:
      '乡镇I农业综合服务站站长赵某平，在为群众办理农机购置补贴审核时吃拿卡要，多次暗示办事群众请吃饭、送烟酒，不送就拖着不办。2026年9月以来至少有5户群众反映此事。要求严肃处理，改进办事作风。',
  },
  {
    id: 'XF-2026-0110',
    channel: '来访',
    receivedAt: '2026-10-21',
    town: 'donghe',
    village: '东河村',
    reporter: '实名 · 群众戊',
    flowStage: '分办交办',
    content:
      '乡镇F东河村村委会主任刘某刚，2026年以来多次用村集体资金在镇上饭店接待吃喝，报销单据写的是“工作餐”，合计约18,600元。村民对此意见很大，希望查看村集体支出明细，查清是否违规公款吃喝。',
  },
  {
    id: 'XF-2026-0111',
    channel: '网络举报',
    receivedAt: '2026-10-24',
    town: 'liuwan',
    village: '柳湾村',
    reporter: '匿名网友',
    flowStage: '登记受理',
    content:
      '乡镇M柳湾村今年低保评定，村主任孙某把自家亲戚和关系户评上了，真正困难的几户反而没评上。评议会没开，名单也没公示。希望上级来查一查，评定要公平公正。',
  },
  {
    id: 'XF-2026-0101',
    channel: '12345工单',
    receivedAt: '2026-11-04',
    town: 'chengdong',
    village: '东关社区',
    reporter: '工单转办 · 12345-2611-0101',
    flowStage: '登记受理',
    content:
      '【12345工单转办】来电人咨询东关社区路灯损坏后的报修渠道和维修时限，以及老旧小区改造政策何时实施。',
  },
]

export const INTAKE_SAMPLES: {
  key: string
  label: string
  channel: Channel
  note: string
  town: string
  village: string
  reporter: string
  text: string
}[] = [
  {
    key: 'scan',
    label: '手写信扫描件转写',
    channel: '来信',
    note: '模拟文字识别 · 桑园村危房补助',
    town: 'sangyuan',
    village: '桑园村',
    reporter: '实名 · 群众已',
    text: '乡镇E桑园村村委会委员陈某辉，2026年7月负责村里危房改造补助申报时，向申请户每户收取“跑腿费”500元，共收了6户，合计3,000元。不给钱的就不给报。希望纪委查处，退还群众的钱。',
  },
  {
    key: 'ticket',
    label: '12345 热线转办单',
    channel: '12345工单',
    note: '政务热线工单 · 花园社区绿化工程',
    town: 'beichen',
    village: '花园社区',
    reporter: '工单转办 · 12345-2611-0188',
    text: '【12345工单转办】来电人反映乡镇B花园社区党委书记冯某，在2026年老旧小区改造项目BC-GC-2026-05中，将绿化工程交给其妻弟开办的绿森园林公司，工程款86,000元，未见公开招标。来电人希望核实。',
  },
  {
    key: 'web',
    label: '网络实名举报长文本',
    channel: '网络举报',
    note: '网络举报导出 · 丰收村集体资金',
    town: 'maixiang',
    village: '丰收村',
    reporter: '实名 · 村民代表',
    text: '我是乡镇H丰收村的村民，这事憋了好久，实在看不下去才在网上反映。我们村会计黄某，管账好多年了。2026年3月村里收到土地流转费45,000元，他没交到村集体账户，转进了自己个人账户，一直到6月份才交回村账。村民问起来，他说是“代为保管”，怕放村账上被乱花。还有去年冬天村里打机井，报账23,600元，我们看到的就打了两眼井，懂行的人说也就12,000元左右。黄某的妻弟在镇上开五金店，村里买水管、水泵全在他店里拿货，价钱比外面贵不少。村务公开栏好几个月没换过，账从来不公开。请纪委来查一查，看他是不是挪用了集体资金，村里的钱到底去了哪里。',
  },
]

// ── 农村三资 ──
export interface Contract {
  id: string
  town: string
  village: string
  asset: string
  kind: '场地' | '厂房' | '耕地' | '鱼塘' | '门面'
  tenant: string
  start: string
  end: string
  annualRent: number
  marketRent: number
  dueDate: string
  meeting: boolean
  publicity: boolean
  renewed?: boolean
}
export interface Receipt {
  id: string
  contractId: string
  date: string
  amount: number
  method: '银行转账' | '现金' | '收据'
}
export interface IdleAsset {
  id: string
  town: string
  village: string
  name: string
  idleSince: string
  value: number
}
export interface Voucher {
  id: string
  town: string
  village: string
  date: string
  item: string
  amount: number
  voucherNo: string
  type: '发票' | '白条' | '收据'
  approver: string
}

export const CONTRACTS: Contract[] = [
  { id: 'SZ-HT-2026-018', town: 'qinghe', village: '和盛村', asset: '村北集体场地 12 亩', kind: '场地', tenant: '禾川农机服务社', start: '2026-01-01', end: '2026-12-31', annualRent: 36000, marketRent: 62000, dueDate: '2026-06-30', meeting: false, publicity: true },
  { id: 'SZ-HT-2026-021', town: 'qinghe', village: '禾丰村', asset: '村西闲置厂房 800㎡', kind: '厂房', tenant: '外地个体经营者', start: '2026-03-01', end: '2036-02-28', annualRent: 20000, marketRent: 38000, dueDate: '2026-03-31', meeting: false, publicity: false },
  { id: 'SZ-HT-2023-004', town: 'xinqiao', village: '新桥村', asset: '临街门面 3 间', kind: '门面', tenant: '新桥超市', start: '2023-07-01', end: '2026-06-30', annualRent: 28000, marketRent: 30000, dueDate: '2025-07-31', meeting: true, publicity: true, renewed: false },
  { id: 'SZ-HT-2026-030', town: 'donghe', village: '东河村', asset: '集体耕地 200 亩', kind: '耕地', tenant: '东河种植大户', start: '2026-01-01', end: '2030-12-31', annualRent: 160000, marketRent: 170000, dueDate: '2026-03-31', meeting: true, publicity: true },
  { id: 'SZ-HT-2026-033', town: 'baita', village: '白塔村', asset: '村部旧址院落', kind: '场地', tenant: '白塔物流', start: '2026-02-01', end: '2029-01-31', annualRent: 15000, marketRent: 26000, dueDate: '2026-02-28', meeting: true, publicity: false },
  { id: 'SZ-HT-2026-040', town: 'maixiang', village: '丰收村', asset: '集体耕地 85 亩', kind: '耕地', tenant: '丰收家庭农场', start: '2026-01-01', end: '2028-12-31', annualRent: 68000, marketRent: 70000, dueDate: '2026-04-30', meeting: true, publicity: true },
]

export const RECEIPTS: Receipt[] = [
  { id: 'R-01', contractId: 'SZ-HT-2026-018', date: '2026-03-18', amount: 12000, method: '银行转账' },
  { id: 'R-02', contractId: 'SZ-HT-2026-021', date: '2026-04-20', amount: 20000, method: '现金' },
  { id: 'R-04', contractId: 'SZ-HT-2023-004', date: '2025-07-28', amount: 28000, method: '银行转账' },
  { id: 'R-05', contractId: 'SZ-HT-2026-030', date: '2026-03-30', amount: 80000, method: '银行转账' },
  { id: 'R-06', contractId: 'SZ-HT-2026-033', date: '2026-02-26', amount: 15000, method: '收据' },
  { id: 'R-07', contractId: 'SZ-HT-2026-040', date: '2026-04-28', amount: 68000, method: '银行转账' },
]

export const IDLE_ASSETS: IdleAsset[] = [
  { id: 'ZC-QY-07', town: 'qingyuan', village: '水泉村', name: '原村小学校舍', idleSince: '2024-09-01', value: 420000 },
  { id: 'ZC-XL-03', town: 'xilin', village: '红杏村', name: '冷藏库（扶贫项目）', idleSince: '2025-03-01', value: 680000 },
  { id: 'ZC-BT-05', town: 'baita', village: '塔前村', name: '光伏配套用房', idleSince: '2025-06-01', value: 230000 },
]

export const VOUCHERS: Voucher[] = [
  { id: 'PZ-1001', town: 'qingyuan', village: '清源村', date: '2026-10-08', item: '办公用品', amount: 2380, voucherNo: 'FP-37010026', type: '发票', approver: '村会计' },
  { id: 'PZ-1002', town: 'qingyuan', village: '清源村', date: '2026-10-21', item: '办公用品', amount: 2380, voucherNo: 'FP-37010026', type: '发票', approver: '村会计' },
  { id: 'PZ-1003', town: 'donghe', village: '东河村', date: '2026-09-12', item: '工作餐', amount: 3600, voucherNo: '—', type: '白条', approver: '村主任' },
  { id: 'PZ-1004', town: 'donghe', village: '东河村', date: '2026-09-30', item: '工作餐', amount: 4200, voucherNo: '—', type: '白条', approver: '村主任' },
  { id: 'PZ-1007', town: 'liuwan', village: '柳湾村', date: '2026-07-03', item: '绿化苗木', amount: 9800, voucherNo: '—', type: '收据', approver: '村主任' },
]

// ── 惠民资金 ──
export interface Grant {
  id: string
  name: string
  idNo: string
  town: string
  village: string
  item: '耕地地力补贴' | '高龄津贴' | '困难群众救助' | '农机购置补贴'
  amount: number
  period: string
  parcel?: string
}
export interface Resident { idNo: string; name: string; age: number; status: '正常' | '死亡' | '迁出'; date?: string }
export interface Land { parcel: string; owner: string; area: number }
export interface Insurance { idNo: string; medical: '城乡居民医保' | '职工医保'; pension: '城乡居民养老' | '机关事业养老' | '企业职工养老' }

export const GRANTS: Grant[] = [
  { id: 'BT-001', name: '李某芳', idNo: '3714**********2361', town: 'qingyuan', village: '清源村', item: '耕地地力补贴', amount: 1260, period: '2026', parcel: 'QY-0218' },
  { id: 'BT-002', name: '李某芳', idNo: '3714**********2361', town: 'qingyuan', village: '水泉村', item: '耕地地力补贴', amount: 980, period: '2026', parcel: 'SQ-0431' },
  { id: 'BT-003', name: '赵某兰', idNo: '3714**********0825', town: 'liuwan', village: '柳湾村', item: '高龄津贴', amount: 1200, period: '2026' },
  { id: 'BT-005', name: '钱某华', idNo: '3714**********7703', town: 'baita', village: '塔前村', item: '困难群众救助', amount: 3600, period: '2026' },
  { id: 'BT-009', name: '郑某玲', idNo: '3714**********6614', town: 'maixiang', village: '丰收村', item: '耕地地力补贴', amount: 860, period: '2026', parcel: 'FS-0322' },
  { id: 'BT-010', name: '冯某生', idNo: '3714**********2208', town: 'sangyuan', village: '桑园村', item: '农机购置补贴', amount: 12000, period: '2026' },
  { id: 'BT-011', name: '冯某生', idNo: '3714**********2208', town: 'sangyuan', village: '桑园村', item: '农机购置补贴', amount: 12000, period: '2026' },
  { id: 'BT-012', name: '王某秀', idNo: '3714**********9031', town: 'chengdong', village: '运河社区', item: '高龄津贴', amount: 1200, period: '2026' },
]

export const RESIDENTS: Resident[] = [
  { idNo: '3714**********2361', name: '李某芳', age: 46, status: '正常' },
  { idNo: '3714**********0825', name: '赵某兰', age: 86, status: '死亡', date: '2025-11-20' },
  { idNo: '3714**********7703', name: '钱某华', age: 58, status: '正常' },
  { idNo: '3714**********6614', name: '郑某玲', age: 55, status: '迁出', date: '2024-06-01' },
  { idNo: '3714**********2208', name: '冯某生', age: 49, status: '正常' },
  { idNo: '3714**********9031', name: '王某秀', age: 91, status: '死亡', date: '2026-02-14' },
]

export const LANDS: Land[] = [
  { parcel: 'QY-0218', owner: '3714**********2361', area: 3.2 },
  { parcel: 'SQ-0431', owner: '3714**********0000', area: 2.5 },
  { parcel: 'FS-0322', owner: '3714**********6614', area: 2.3 },
]

export const INSURANCES: Insurance[] = [
  { idNo: '3714**********7703', medical: '职工医保', pension: '机关事业养老' },
]

// ── 招投标 ──
export interface Company { name: string; legalRep: string; phone: string; address: string }
export interface Project {
  id: string
  name: string
  town: string
  owner: string
  budget: number
  date: string
  winner: string
  bids: { company: string; price: number; score: number; days: number; doc: string }[]
}

export const COMPANIES: Company[] = [
  { name: '鑫路建设工程有限公司', legalRep: '秦某', phone: '138****6621', address: '乡镇C运河路 18 号' },
  { name: '通达路桥有限公司', legalRep: '尤某', phone: '139****0457', address: '乡镇A纺织路 66 号' },
  { name: '恒基市政工程有限公司', legalRep: '秦某', phone: '138****6621', address: '乡镇C运河路 18 号 2 楼' },
  { name: '远航建筑有限公司', legalRep: '许某', phone: '137****8812', address: '乡镇B花园路 9 号' },
  { name: '绿森园林公司', legalRep: '冯某勇', phone: '136****2203', address: '乡镇B建设路 3 号' },
  { name: '佳景园林工程有限公司', legalRep: '何某', phone: '135****7750', address: '乡镇C新华路 21 号' },
  { name: '明德建设有限公司', legalRep: '吕某', phone: '133****1196', address: '乡镇I工业园 5 号' },
]

const DOC_A =
  '本项目施工组织设计遵循安全第一、质量为本的原则，路基采用分层压实工艺，每层厚度不超过三十厘米，压实度不低于百分之九十六。混凝土面层采用商品混凝土，养护期不少于七天。'

export const PROJECTS: Project[] = [
  {
    id: 'XQ-GC-2026-07',
    name: '新桥村道路硬化工程',
    town: 'xinqiao',
    owner: '乡镇J新桥村',
    budget: 520000,
    date: '2026-05-10',
    winner: '鑫路建设工程有限公司',
    bids: [
      { company: '鑫路建设工程有限公司', price: 498600, score: 92.5, days: 60, doc: DOC_A },
      { company: '恒基市政工程有限公司', price: 501200, score: 84.0, days: 60, doc: DOC_A.replace('三十厘米', '30厘米') },
      { company: '通达路桥有限公司', price: 503500, score: 81.5, days: 60, doc: DOC_A.replace('商品混凝土', '自拌混凝土') },
    ],
  },
  {
    id: 'XQ-GC-2026-11',
    name: '石桥村排水沟工程',
    town: 'xinqiao',
    owner: '乡镇J石桥村',
    budget: 310000,
    date: '2026-07-22',
    winner: '鑫路建设工程有限公司',
    bids: [
      { company: '鑫路建设工程有限公司', price: 296800, score: 90.0, days: 45, doc: '排水沟采用 C25 混凝土现浇，沟底纵坡不小于千分之三，伸缩缝间距十米，施工期间设置临时导流。' },
      { company: '恒基市政工程有限公司', price: 298900, score: 83.0, days: 45, doc: '排水沟采用 C25 混凝土现浇，沟底纵坡不小于千分之三，伸缩缝间距十米，施工期间设置临时导流措施。' },
      { company: '远航建筑有限公司', price: 299500, score: 80.5, days: 45, doc: '沟体为现浇混凝土结构，按设计坡度施工，并做好雨季施工准备与围挡。' },
    ],
  },
  {
    id: 'MX-GC-2026-03',
    name: '麦香村文化广场工程',
    town: 'maixiang',
    owner: '乡镇H麦香村',
    budget: 135000,
    date: '2026-06-18',
    winner: '鑫路建设工程有限公司',
    bids: [
      { company: '鑫路建设工程有限公司', price: 120000, score: 95.0, days: 20, doc: '广场铺装采用透水砖，设置健身器材区与宣传栏。' },
      { company: '明德建设有限公司', price: 131000, score: 71.0, days: 50, doc: '广场整体采用花岗岩铺装，设置休闲座椅与绿化带。' },
      { company: '远航建筑有限公司', price: 128500, score: 74.0, days: 48, doc: '广场铺装以混凝土彩砖为主，配套照明与排水。' },
    ],
  },
]

// ── 公务支出 ──
export const ALLOWANCES = [
  { id: 'JB-01', dept: '乡镇G人民政府', town: 'qinghe', person: '全体干部（38人）', item: '节日慰问金', amount: 30400, month: '2026-09', basis: '镇党委会议纪要' },
  { id: 'JB-03', dept: '县农业农村局', person: '项目组（12人）', item: '加班补助', amount: 14400, month: '2026-08', basis: '无' },
  { id: 'JB-05', dept: '乡镇F人民政府', town: 'donghe', person: '班子成员（7人）', item: '考核奖励', amount: 21000, month: '2026-07', basis: '镇自定' },
]

export const RECEPTIONS = [
  { id: 'JD-01', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-03', guest: '县直部门调研', local: true, people: 8, amount: 1960, letter: false },
  { id: 'JD-02', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-11', guest: '县直部门检查', local: true, people: 10, amount: 2480, letter: false },
  { id: 'JD-04', dept: '乡镇F人民政府', town: 'donghe', date: '2026-09-26', guest: '县直部门督导', local: true, people: 11, amount: 2860, letter: false },
]

export const MEAL_INVOICES = [
  { id: 'CY-01', dept: '县住建局', date: '2026-10-03', time: '20:40', vendor: '运河人家酒楼', amount: 3280, weekend: true },
  { id: 'CY-02', dept: '县住建局', date: '2026-10-17', time: '22:30', vendor: '运河人家酒楼', amount: 980, weekend: false },
  { id: 'CY-03', dept: '县住建局', date: '2026-10-17', time: '22:35', vendor: '运河人家酒楼', amount: 990, weekend: false },
  { id: 'CY-04', dept: '县住建局', date: '2026-10-17', time: '22:41', vendor: '运河人家酒楼', amount: 960, weekend: false },
]

export const CAR_TRIPS = [
  { id: 'GC-01', dept: '县农业农村局', plate: '鲁N·G0215', date: '2026-10-04', weekend: true, route: '县城—外省景区', km: 486, purpose: '未登记' },
  { id: 'GC-03', dept: '乡镇J人民政府', town: 'xinqiao', plate: '鲁N·G1306', date: '2026-10-18', weekend: true, route: '镇政府—市区商场', km: 138, purpose: '办事' },
]

// ── 巡察台账与整改 ──
export const INSP_DOCS: InspDoc[] = [
  {
    id: 'XC-D01',
    target: '和盛村',
    town: 'qinghe',
    kind: '三重一大',
    title: '和盛村集体场地出租决策记录',
    date: '2026-01-05',
    text: '会议时间：2026年1月5日\n会议地点：村委会议室\n主持人：张某军\n参会人员：张某军、刘某、陈某（应到7人，实到3人）\n记录人：\n议题：村北集体场地出租事宜\n会议内容：主持人介绍，禾川农机服务社拟租用村北集体场地12亩，年租金36,000元。经研究，同意出租。\n表决情况：一致同意。\n备注：合同已于2025年12月28日签订。',
  },
  {
    id: 'XC-D02',
    target: '禾丰村',
    town: 'qinghe',
    kind: '三重一大',
    title: '禾丰村闲置厂房出租议事记录',
    date: '2026-03-10',
    text: '会议时间：2026年3月10日\n会议地点：禾丰村党群服务中心\n主持人：吴某\n参会人员：吴某、郭某、林某、何某、罗某（应到7人，实到5人）\n记录人：郭某\n议题：村西闲置厂房出租\n会议内容：会前已就出租方案征求村民代表意见。厂房拟出租给外地个体经营者，年租金20,000元，租期十年。\n表决情况：同意3票，不同意2票。\n决定：通过。\n备注：合同自2026年3月1日起执行，现补办议事手续。',
  },
  {
    id: 'XC-D03',
    target: '乡镇G党委',
    town: 'qinghe',
    kind: '会议记录',
    title: '镇党委会议记录（第18次）',
    date: '2026-06-12',
    text: '会议时间：2026年6月12日\n主持人：镇党委书记\n参会人员：党委委员9人，实到8人\n记录人：党政办\n议题一：研究镇区道路提升工程，预算480,000元，由城建办负责实施。\n讨论情况：（空）\n表决情况：一致同意。\n议题二：研究2026年度干部考核奖励发放方案。\n讨论情况：会前已酝酿，委员分别发表意见。\n表决情况：同意8票。',
  },
  {
    id: 'XC-D04',
    target: '和盛村',
    town: 'qinghe',
    kind: '党建材料',
    title: '和盛村党支部“三会一课”记录',
    date: '2026-09-20',
    text: '2026年7月党员大会：学习上级文件精神，会议记录与2026年6月记录内容完全相同。\n2026年8月支委会：参会人员签到为同一笔迹代签。\n2026年9月党课：授课人张某军，授课内容未记录，仅有标题“加强党性修养”。',
  },
  {
    id: 'XC-D05',
    target: '前屯村',
    town: 'qinghe',
    kind: '财务凭证',
    title: '前屯村2026年第三季度财务凭证摘要',
    date: '2026-09-30',
    text: '凭证17：支付修路款86,000元，附件：收据一张，无合同、无验收单。\n凭证21：慰问支出5,600元，附件：白条，经手人签字。\n凭证26：购置办公电脑12,800元，附件：发票、村务会议记录（会议日期晚于付款日期）。',
  },
  {
    id: 'XC-D06',
    target: '禾丰村',
    town: 'qinghe',
    kind: '公示记录',
    title: '禾丰村2026年惠农补助名单公示',
    date: '2026-08-15',
    text: '公示内容：2026年农业设施补助名单，共14户，补助总额48,000元。\n公示时间：2026年8月15日至8月17日。\n公示地点：村委会院内公示栏。\n监督电话：未注明。',
  },
]

export const FEEDBACK_ISSUES: FeedbackIssue[] = [
  { id: 'ZG-01', category: '三资管理', title: '集体资产出租程序不规范', detail: '和盛村、禾丰村集体资产出租存在先签合同后补会议、未经村民代表会议决策、租金明显偏低等问题。', owner: '乡镇G党委', town: 'qinghe', deadline: '2026-12-20', keywords: ['合同', '会议', '租金', '民主决策', '和盛村', '禾丰村'] },
  { id: 'ZG-02', category: '主体责任落实', title: '“三重一大”决策程序执行不到位', detail: '镇党委会议研究重大工程事项未记录讨论情况，部分村议事记录缺少记录人、到会人数不足。', owner: '乡镇G党委', town: 'qinghe', deadline: '2026-12-20', keywords: ['三重一大', '讨论', '记录', '到会', '议事规则'] },
  { id: 'ZG-03', category: '形式主义', title: '基层组织生活流于形式', detail: '和盛村党支部会议记录前后雷同、代签到、党课内容空泛。', owner: '和盛村党支部', town: 'qinghe', deadline: '2026-11-30', keywords: ['三会一课', '记录', '签到', '党课'] },
  { id: 'ZG-04', category: '三资管理', title: '财务票据管理不规范', detail: '前屯村存在白条入账、大额支出无合同和验收单、先付款后决策等问题。', owner: '前屯村', town: 'qinghe', deadline: '2026-11-15', keywords: ['白条', '合同', '验收', '票据', '前屯村'] },
  { id: 'ZG-05', category: '惠民政策', title: '惠农补助公示不到位', detail: '禾丰村补助名单公示时间不足、未公布监督电话。', owner: '禾丰村', town: 'qinghe', deadline: '2026-11-05', keywords: ['公示', '补助', '监督电话', '禾丰村'] },
]

export const RECTIFY_SAMPLES: Record<string, { text: string; attachments: string[] }> = {
  'ZG-01': {
    text: '针对集体资产出租程序问题，镇党委于2026年11月2日召开专题会议。一是对和盛村村北场地租赁合同SZ-HT-2026-018重新提交村民代表会议审议，已委托第三方开展租金评估，评估价58,000元/年，正与承租方协商补签协议；二是禾丰村厂房合同已暂停执行，重新履行民主决策程序；三是制定《村级集体资产出租管理办法》，明确公开竞价要求。',
    attachments: ['村民代表会议记录（2026-11-02）', '租金评估报告', '集体资产出租管理办法'],
  },
  'ZG-02': {
    text: '镇党委高度重视，进一步加强“三重一大”决策制度学习，今后将严格按照要求执行，切实提高认识。',
    attachments: [],
  },
  'ZG-03': {
    text: '和盛村党支部已对2026年7月至9月组织生活进行补课，重新召开党员大会和支委会，由党员本人签到；9月党课已补充授课提纲。',
    attachments: ['补课会议记录', '签到表扫描件'],
  },
  'ZG-04': {
    text: '前屯村已对相关凭证进行了整理。',
    attachments: ['整理后凭证清单'],
  },
  'ZG-05': {
    text: '禾丰村已将2026年第三季度农业设施补助名单重新在村务公开栏及微信公开群同步公示满7个工作日，并标明镇纪委及县农业农村局监督举报电话。',
    attachments: ['重新公示现场照片', '监督电话牌照片'],
  },
}

// ── 案卷审理与知识库 ──
export const CASE_FILES: CaseFile[] = [
  {
    id: 'AJ-2026-012',
    title: '张某军涉嫌违规出租集体资产案',
    accused: '张某军',
    role: '村委会主任',
    violation: '违反廉洁纪律-为亲属谋利',
    stage: '审查调查',
    filedAt: '2026-10-20',
    evidence: ['租赁合同', '银行流水', '村民代表会议记录', '证人证言', '被审查人陈述'],
    procedures: { 立案审批: '2026-10-20', 谈话审批: '2026-10-22', 谈话笔录签字: '2026-10-23', 违纪事实告知: null, 陈述申辩记录: null },
    materials: [
      { id: 'M1', type: '谈话笔录', title: '张某军谈话笔录（第一次）', text: '时间：2026年10月23日上午9时至11时。地点：镇纪委谈话室。问：禾川农机服务社与你是什么关系？答：负责人是我的妻弟。问：场地租金怎么定的？答：参照往年定的，一年36,000元，没有开会研究，后来补了个记录。问：租金收了多少？答：收了12,000元，剩下的他说年底给。' },
      { id: 'M2', type: '书证', title: '集体场地租赁合同', text: '合同编号SZ-HT-2026-018。出租方：和盛村村民委员会。承租方：禾川农机服务社。租赁期限2026年1月1日至2026年12月31日，年租金36,000元，于2026年6月30日前付清。签订日期：2025年12月28日。' },
      { id: 'M3', type: '录音转写', title: '证人刘某谈话录音转写', text: '（录音转写）刘某：那天开会就我们三个人，张主任说场地租给他妻弟，一年三万六，让我们签个字。我记得是1月5号，合同其实之前就签了。周边那样的场地一年都要六万左右。' },
      { id: 'M4', type: '扫描件', title: '和盛村银行流水（扫描件）', text: '（扫描件转写）2026年3月18日 收入 12,000.00元 摘要：场地租金 对方户名：禾川农机服务社。2026年1月1日至2026年10月31日期间无其他场地租金收入。' },
    ],
  },
  {
    id: 'AJ-2026-009',
    title: '李某华涉嫌虚报冒领补助资金案',
    accused: '李某华',
    role: '村会计',
    violation: '违反群众纪律-优亲厚友',
    stage: '审理',
    filedAt: '2026-09-15',
    evidence: ['补助申报表', '公示照片', '资金发放记录', '亲属关系证明', '被审查人陈述', '证人证言'],
    procedures: { 立案审批: '2026-09-15', 谈话审批: '2026-09-18', 谈话笔录签字: '2026-09-19', 违纪事实告知: '2026-10-20', 陈述申辩记录: '2026-10-21' },
    materials: [
      { id: 'M1', type: '谈话笔录', title: '李某华谈话笔录', text: '时间：2026年9月19日。问：李某芳是否符合补助条件？答：她是我妹妹，家里没有农业设施，不符合条件，是我把她报上去的。问：领了多少钱？答：8,000元，钱在她卡上。' },
      { id: 'M2', type: '书证', title: '补助资金发放记录', text: '2026年第三季度农业设施补助：李某芳，补助金额8,000元，发放日期2026年8月28日。全村补助总额48,000元。' },
    ],
  },
]

export const EVIDENCE_REQUIREMENTS: Record<string, string[]> = {
  '违反廉洁纪律-为亲属谋利': ['租赁合同', '银行流水', '村民代表会议记录', '亲属关系证明', '市场价格评估', '证人证言', '被审查人陈述'],
  '违反群众纪律-优亲厚友': ['补助申报表', '公示照片', '资金发放记录', '亲属关系证明', '资格审核材料', '被审查人陈述', '证人证言'],
}

export const KB_ENTRIES: KbEntry[] = [
  { id: 'KB-01', type: '条款要点', title: '违反廉洁纪律：利用职权为亲属经营活动谋取利益', source: '党纪处分相关规定要点', content: '党员领导干部利用职权或者职务上的影响，为配偶、子女及其他特定关系人经营活动谋取利益的，属于违反廉洁纪律。重点核查关联企业股权、亲属任职、合同定价及民主决策程序。', tags: ['廉洁纪律', '亲属', '低价出租', '工程'] },
  { id: 'KB-02', type: '条款要点', title: '违反群众纪律：在惠民资金管理中优亲厚友', source: '党纪处分相关规定要点', content: '在惠民资金和物资分配中优亲厚友、明显有失公平的，属于违反群众纪律。核查要点包括申报条件、评议公示程序、亲属关系证明、资金实际流向。', tags: ['群众纪律', '优亲厚友', '惠民资金', '补贴'] },
  { id: 'KB-04', type: '条款要点', title: '对抗组织审查行为的认定', source: '党纪处分相关规定要点', content: '串供、伪造销毁转移隐匿证据、阻止他人揭发检举等，属于对抗组织审查，是违反政治纪律的行为。应注意及时固定通话记录、证人证言及账目凭证原件。', tags: ['政治纪律', '对抗组织审查', '串供', '销毁证据'] },
  { id: 'KB-07', type: '工作指引', title: '初步核实工作要点', source: '执纪工作指引', content: '初步核实应当制定方案，明确核实对象、内容、方法与时限。核实中注意调取原始书证，不得在初核阶段作出违纪定性。', tags: ['初核', '程序', '时限'] },
  { id: 'KB-10', type: '本地规范', title: '村级集体资产资源发包管理（地方规范要点）', source: '地方规范性文件要点', content: '村集体资产资源发包、出租应经村民代表会议决定，原则上公开竞价，合同期限一般不超过五年，租金收入应通过对公账户结算并按季度公开。', tags: ['三资', '集体资产', '租金', '民主决策'] },
]

// ── 廉政档案与舆情 ──
export const CADRES: Cadre[] = [
  {
    id: 'GB-001',
    name: '张某军',
    title: '村委会主任',
    unit: '乡镇G和盛村',
    town: 'qinghe',
    level: '村（社区）干部',
    since: '2021-01',
    records: [
      { source: '信访', date: '2026-10-12', title: '被反映违规出租集体场地', result: '已立案审查调查', open: true },
      { source: '信访', date: '2026-10-19', title: '网络举报同一事项', result: '与前件合并办理', open: true },
      { source: '巡察', date: '2026-10-28', title: '集体资产出租先签合同后补会议', result: '纳入整改问题清单', open: true },
      { source: '个人事项', date: '2026-03-01', title: '年度个人有关事项报告', result: '已报告，未见异常' },
    ],
  },
  {
    id: 'GB-003',
    name: '王某民',
    title: '党支部书记',
    unit: '乡镇J新桥村',
    town: 'xinqiao',
    level: '村（社区）干部',
    since: '2018-03',
    records: [
      { source: '信访', date: '2026-10-15', title: '被反映收取工程回扣', result: '初步核实中', open: true },
      { source: '信访', date: '2026-10-30', title: '被反映帮助关联企业承揽工程', result: '初步核实中', open: true },
      { source: '谈话函询', date: '2025-08-20', title: '函询：村内工程项目管理', result: '已如实说明，予以了结' },
    ],
  },
  {
    id: 'GB-002',
    name: '李某华',
    title: '村会计',
    unit: '乡镇K清源村',
    town: 'qingyuan',
    level: '村（社区）干部',
    since: '2019-06',
    records: [
      { source: '信访', date: '2026-10-08', title: '被反映虚报亲属补助', result: '已立案，移送审理', open: true },
      { source: '审计', date: '2025-12-10', title: '村级财务审计', result: '发现票据不规范 1 项，已整改' },
    ],
  },
  {
    id: 'GB-004',
    name: '赵某平',
    title: '农业综合服务站站长',
    unit: '乡镇I',
    town: 'baita',
    level: '站所负责人',
    since: '2020-09',
    records: [
      { source: '信访', date: '2026-10-10', title: '被反映办事吃拿卡要', result: '分办核实中', open: true },
      { source: '处分', date: '2023-05-12', title: '违反工作纪律', result: '诫勉谈话（组织处理），期满' },
    ],
  },
]

export const PUBLIC_OPINIONS: PublicOpinionPost[] = [
  { id: 'P02', platform: '本地论坛', time: '2026-11-01 19:42', town: 'baita', text: '乡镇I农业服务站办事慢，暗示要请吃饭，不然就说材料不全。', heat: 132 },
  { id: 'P06', platform: '本地论坛', time: '2026-10-29 10:11', town: 'qinghe', text: '和盛村那块集体场地租给谁了？一年才三万多，周边都六万，村里也不公开。', heat: 158 },
  { id: 'P17', platform: '短视频评论', time: '2026-11-03 17:12', town: 'xinqiao', text: '新桥村去年修的路已经裂了，质量太差，谁验收的？', heat: 140 },
  { id: 'P12', platform: '短视频评论', time: '2026-11-02 13:40', town: 'liuwan', text: '柳湾村低保名单没公示就定了，真正困难的没评上。', heat: 119 },
]

export const SEED_TASKS: VerifyTask[] = [
  {
    id: 'HC-2026-098',
    title: '核对和盛村场地租赁差额 24,000 元及民主决策程序',
    domain: '农村三资',
    sourcePage: 'radar',
    sourceId: 'AS-SZ-HT-2026-018-unpaid',
    town: 'qinghe',
    level: 'high',
    assignee: '第一监督检查室',
    deadline: '2026-11-03',
    status: '处理中',
    createdAt: '2026-10-27 09:20',
  },
  {
    id: 'HC-2026-099',
    title: '复核清源村、水泉村耕地补贴同一人跨村领取疑点',
    domain: '惠民资金',
    sourcePage: 'radar',
    sourceId: 'SB-multi-BT-001',
    town: 'qingyuan',
    level: 'mid',
    assignee: '第一监督检查室',
    deadline: '2026-11-12',
    status: '处理中',
    createdAt: '2026-10-30 15:02',
  },
  {
    id: 'HC-2026-097',
    title: '乡镇L湖滨村养老补贴重复领取复核',
    domain: '惠民资金',
    sourcePage: 'radar',
    sourceId: 'HIS-097',
    town: 'baimahu',
    level: 'mid',
    assignee: '乡镇L纪委',
    deadline: '2026-11-18',
    status: '已完成',
    createdAt: '2026-11-03 09:41',
    completedAt: '2026-11-06 16:10',
    result: '确认重复领取 1,200 元，已全额追回并退缴财政。',
  },
  {
    id: 'HC-2026-096',
    title: '乡镇N槐树村土地流转费收支核对',
    domain: '农村三资',
    sourcePage: 'radar',
    sourceId: 'HIS-096',
    town: 'tianzhuang',
    level: 'mid',
    assignee: '乡镇N纪委',
    deadline: '2026-11-12',
    status: '已完成',
    createdAt: '2026-10-28 11:08',
    completedAt: '2026-11-05 10:26',
    result: '流转费已转入村集体账户，收支凭证已在村务公开栏公示。',
  },
]

export const SEED_AUDIT: AuditEntry[] = [
  { id: 'AU-24', time: '2026-11-06 17:35', role: 'jiandu', user: '监督检查专员', action: '解析', target: '三资穿透规则扫描', detail: '完成 6 份重点租赁合同与流水比对，发现 8 处待核疑点', },
  { id: 'AU-23', time: '2026-11-06 16:10', role: 'jiandu', user: '监督检查专员', action: '办结', target: 'HC-2026-097', detail: '记录核查结果并办结（追回 1,200 元）', },
  { id: 'AU-21', time: '2026-11-06 11:48', role: 'xinfang', user: '信访研判专员', action: '确认', target: 'XF-2026-0104', detail: '核对 6 项线索要素并标记为已核实入库', },
  { id: 'AU-19', time: '2026-11-06 09:12', role: 'xuncha', user: '巡察工作专员', action: '解析', target: '乡镇G 6 份台账', detail: '批量阅卷检出决策倒置、未记录讨论等纸面疑点', },
]

export const INTEGRATION_LIST = [
  { group: '纪检业务内网系统', name: '纪检监察业务系统（线索 / 案件）', status: '预留接口', desc: '线索登记、案件卷宗双向同步' },
  { group: '纪检业务内网系统', name: '巡察工作平台 / 12345 热线转办', status: '样例数据', desc: '巡察台账、反馈问题与工单接入' },
  { group: '政务共享数据碰撞源', name: '公安户籍 / 社保医保 / 耕地确权', status: '样例数据', desc: '支撑惠民资金死亡续领、资格不符等碰撞比对' },
  { group: '政务共享数据碰撞源', name: '农村三资监管 / 公共资源交易 / 财政票据', status: '样例数据', desc: '支撑合同流水核对、围串标与公务支出筛查' },
  { group: '内网私有化智能基座', name: '本地化大模型 / OCR 文字识别 / 语音转写', status: '模拟规则引擎', desc: '本演示门户采用确定性规则引擎模拟解析与引用溯源，正式部署全部运行于政务内网' },
]

export const PLATFORM_CAPABILITIES = [
  {
    key: 'clues',
    title: '信访举报与线索智能研判',
    phase: '本期已实现',
    targetPage: 'clues' as const,
    summary: '来信/12345/扫描件原文批注抽取、重复多头原文对比、六大纪律参考标签、人工核定转核查。',
    input: '来信原文、12345工单、扫描件转写文本',
    output: '6要素结构化台账（含原文锚点）、相似线索对照表、初核任务',
  },
  {
    key: 'supervision',
    title: '大数据穿透监督（三资 / 惠民 / 招投标 / 公务）',
    phase: '本期已实现',
    targetPage: 'radar' as const,
    summary: '跨库规则碰撞出疑点、不作黑盒打分、逐条附数据源对照与人工排除/转核查闭环。',
    input: '三资合同流水、补贴与户籍耕地社保、招投标标书、餐饮公车凭证',
    output: '分领域待核疑点清单、证据链双栏对照抽屉',
  },
  {
    key: 'inspection',
    title: '智能巡察阅卷与整改销号',
    phase: '本期已实现',
    targetPage: 'inspection' as const,
    summary: '批量阅卷定位“先签合同后补会”等程序问题，整改材料防表态比对与人工复核销号。',
    input: '三重一大纪要、三会一课记录、财务凭证、整改报告及附件',
    output: '原文标红定位疑点、整改四维度核查卡',
  },
  {
    key: 'cases',
    title: '案件审理与法规知识辅助',
    phase: '本期已实现',
    targetPage: 'inspection' as const,
    summary: '跨材料笔录与书证印证、要件证据与程序节点缺项检查、本地知识库要点引用。',
    input: '谈话笔录、银行流水、合同扫描件、审理程序节点',
    output: '跨材料印证对照、缺失证据提醒、引用条款摘要',
  },
  {
    key: 'panorama',
    title: '全域实体关联图谱与全景研判',
    phase: '本期已实现',
    targetPage: 'panorama' as const,
    summary: '围绕“人、村、合同、项目、企业”一键跨库串联，起草可追溯出处的初核方案初稿。',
    input: '人员或企业名称（如张某军、王某民、鑫路建设）',
    output: '实体关联网络图谱 + 跨库足迹汇总 + 初核方案初稿',
  },
  {
    key: 'archive',
    title: '干部廉政档案与任前客观标签',
    phase: '样例展示（二期深接）',
    targetPage: 'panorama' as const,
    summary: '汇聚信访、谈话函询、巡察、审计、个人事项六类数据；红线：只出客观事实标签，不作风险定性。',
    input: '信访台账、函询记录、经济责任审计、个人事项报告',
    output: '一人一档时间轴与客观事实标签摘要',
  },
  {
    key: 'outreach',
    title: '廉洁教育素材与属地舆情监测',
    phase: '样例展示（二期深接）',
    targetPage: 'panorama' as const,
    summary: '结合本县办结典型案例辅助起草警示通报；聚拢政务留言板/论坛涉作风苗头预警转线索。',
    input: '已办结典型案例、属地公开留言与平台评论',
    output: '警示教育初稿、属地高热舆情苗头清单',
  },
  {
    key: 'security',
    title: '安全管控、分室权限与全程留痕',
    phase: '内网基座规范',
    targetPage: 'panorama' as const,
    summary: '按岗位控制可见视图与处置权限，所有 AI 解析、人工修正、确认、排除动作均不可篡改留痕。',
    input: '用户角色权限、操作审计事件流',
    output: '全链路操作审计日志、数据对接状态看板',
  },
]
