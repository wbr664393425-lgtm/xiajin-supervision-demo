/**
 * 夏津县纪检监察 · 涉纪舆情监测虚构演示样本与公开信源配置
 * 合规约束：
 * 1. 仅覆盖合法公开平台与政务问政渠道，严禁私域/社区群采集；
 * 2. 帖文正文采用自然群众口语，不生硬出现“乡镇X”，结构化属地严格对齐 geo.ts 的 town.id（界面展示为 乡镇A–乡镇N）；
 * 3. 人名、村居、单位、合同号全部为虚构演示数据，与主站既有线索/三资/招投标/巡察/廉政档案实体咬合。
 */
import liuyanLogo from '@/assets/media-logos/liuyan.png'
import peopleLogo from '@/assets/media-logos/people.png'
import xinhuanetLogo from '@/assets/media-logos/xinhuanet.png'
import cctvLogo from '@/assets/media-logos/cctv.png'
import dzwwwLogo from '@/assets/media-logos/dzwww.png'
import sdnewsLogo from '@/assets/media-logos/sdnews.png'
import ql1dLogo from '@/assets/media-logos/ql1d.png'
import sdchinaLogo from '@/assets/media-logos/sdchina.png'
import dezhoudailyLogo from '@/assets/media-logos/dezhoudaily.png'
import thepaperLogo from '@/assets/media-logos/thepaper.png'
import douyinLogo from '@/assets/media-logos/douyin.png'
import wechatLogo from '@/assets/media-logos/wechat.png'
import weiboLogo from '@/assets/media-logos/weibo.png'
import toutiaoLogo from '@/assets/media-logos/toutiao.png'
import type { RiskLevel } from '@/types'

export type MediaTier = '政务问政' | '央省主流媒体' | '属地资讯媒体' | '公开社交短视频'

export type MediaSourceId =
  | 'liuyan' | 'wenzheng_sd' | 'hotline_12345' | 'gov_board'
  | 'people' | 'xinhuanet' | 'cctv' | 'thepaper'
  | 'dzwww' | 'sdnews' | 'ql1d' | 'sdchina' | 'dezhoudaily'
  | 'douyin' | 'wechat' | 'weibo' | 'toutiao' | 'tieba'

export interface MediaSourceDef {
  id: MediaSourceId
  name: string
  short: string
  tier: MediaTier
  logo?: string
  badgeColor: string
  syncCycle: string
  scopeNote: string
  enabled: boolean
}

export const mediaSources: MediaSourceDef[] = [
  { id: 'liuyan', name: '人民网领导留言板', short: '领导留言板', tier: '政务问政', logo: liuyanLogo, badgeColor: '#B8322E', syncCycle: '每 30 分钟公开同步', scopeNote: '县域公开留言与官方回复件', enabled: true },
  { id: 'wenzheng_sd', name: '问政山东公开平台', short: '问政山东', tier: '政务问政', badgeColor: '#2E5B9A', syncCycle: '每 30 分钟公开同步', scopeNote: '省级问政栏目公开图文与回音壁', enabled: true },
  { id: 'hotline_12345', name: '12345 公开热点件', short: '12345公开件', tier: '政务问政', badgeColor: '#2B6E68', syncCycle: '每日政务共享汇聚', scopeNote: '脱敏汇总的高频民生与作风诉求摘要', enabled: true },
  { id: 'gov_board', name: '属地政务留言板', short: '政务留言板', tier: '政务问政', badgeColor: '#486085', syncCycle: '每小时公开同步', scopeNote: '政府门户公开政民互动栏目', enabled: true },
  { id: 'people', name: '人民网', short: '人民网', tier: '央省主流媒体', logo: peopleLogo, badgeColor: '#B8322E', syncCycle: '每小时公开检索', scopeNote: '公开涉县域基层治理与民生报道', enabled: true },
  { id: 'xinhuanet', name: '新华网', short: '新华网', tier: '央省主流媒体', logo: xinhuanetLogo, badgeColor: '#25589E', syncCycle: '每小时公开检索', scopeNote: '公开新闻报道与专题观察', enabled: true },
  { id: 'cctv', name: '央视网', short: '央视网', tier: '央省主流媒体', logo: cctvLogo, badgeColor: '#A93832', syncCycle: '每 2 小时公开检索', scopeNote: '央媒公开民生与法治关注', enabled: true },
  { id: 'thepaper', name: '澎湃新闻', short: '澎湃新闻', tier: '央省主流媒体', logo: thepaperLogo, badgeColor: '#3B4859', syncCycle: '每小时公开检索', scopeNote: '深度调查与基层治理公开报道', enabled: true },
  { id: 'dzwww', name: '大众网', short: '大众网', tier: '属地资讯媒体', logo: dzwwwLogo, badgeColor: '#B84534', syncCycle: '每 30 分钟公开同步', scopeNote: '省内综合新闻及地方频道公开内容', enabled: true },
  { id: 'sdnews', name: '齐鲁网 · 闪电新闻', short: '闪电新闻', tier: '属地资讯媒体', logo: sdnewsLogo, badgeColor: '#C2592B', syncCycle: '每 30 分钟公开同步', scopeNote: '省台融媒民生监督公开报道', enabled: true },
  { id: 'ql1d', name: '齐鲁晚报 · 齐鲁壹点', short: '齐鲁壹点', tier: '属地资讯媒体', logo: ql1dLogo, badgeColor: '#315C94', syncCycle: '每 30 分钟公开同步', scopeNote: '情报站公开爆料与属地民生稿件', enabled: true },
  { id: 'sdchina', name: '鲁网', short: '鲁网', tier: '属地资讯媒体', logo: sdchinaLogo, badgeColor: '#3D6A8A', syncCycle: '每小时公开同步', scopeNote: '地方财经与政务公开资讯', enabled: true },
  { id: 'dezhoudaily', name: '德州新闻网', short: '德州新闻网', tier: '属地资讯媒体', logo: dezhoudailyLogo, badgeColor: '#2E698C', syncCycle: '每 30 分钟公开同步', scopeNote: '市域县区频道公开新闻与民生栏目', enabled: true },
  { id: 'douyin', name: '抖音同城公开区', short: '抖音同城', tier: '公开社交短视频', logo: douyinLogo, badgeColor: '#333742', syncCycle: '每 15 分钟公开巡检', scopeNote: '公开同城短视频标题及高赞公开评论', enabled: true },
  { id: 'wechat', name: '微信公众号公开文章', short: '微信公众号', tier: '公开社交短视频', logo: wechatLogo, badgeColor: '#2E7D5A', syncCycle: '每小时公开检索', scopeNote: '已公开发布的属地自媒体与政务推文', enabled: true },
  { id: 'weibo', name: '微博同城话题', short: '微博同城', tier: '公开社交短视频', logo: weiboLogo, badgeColor: '#B85A2A', syncCycle: '每 30 分钟公开巡检', scopeNote: '公开属地广场帖文与民生话题讨论', enabled: true },
  { id: 'toutiao', name: '今日头条本地资讯', short: '今日头条', tier: '公开社交短视频', logo: toutiaoLogo, badgeColor: '#B53838', syncCycle: '每 30 分钟公开巡检', scopeNote: '本地微头条与公开资讯评论', enabled: true },
  { id: 'tieba', name: '县域本地贴吧', short: '本地贴吧', tier: '公开社交短视频', logo: undefined, badgeColor: '#3D63A8', syncCycle: '每小时公开巡检', scopeNote: '公开民生讨论帖（不采集私信与个人资料）', enabled: true },
]

export const sourceById = (id: MediaSourceId) => mediaSources.find(s => s.id === id) || mediaSources[0]!

export type OpinionCategory =
  | '农村三资'
  | '惠民补贴'
  | '作风效能'
  | '工程招投标'
  | '校园餐与民生'
  | '涉纪不实传言'
  | '非纪检民生'

export const opinionCategories: { key: OpinionCategory; label: string; color: string; moduleLink?: string; desc: string }[] = [
  { key: '农村三资', label: '农村集体三资', color: 'var(--chart-1)', moduleLink: '/supervision/assets', desc: '集体土地/场地/厂房发包、村务公开与收支透明' },
  { key: '作风效能', label: '窗口作风与效能', color: '#C8601A', moduleLink: '/clues/grading', desc: '基层站所推诿刁难、吃拿卡要与四风苗头' },
  { key: '工程招投标', label: '小微工程与采购', color: '#B4831D', moduleLink: '/supervision/procurement', desc: '农村道路/水利质量、施工方集中与验收程序' },
  { key: '校园餐与民生', label: '校园餐与基层民生', color: '#4C55A6', moduleLink: '/supervision/campaign', desc: '中小学配餐采购、低保救助与基层医疗透明' },
  { key: '惠民补贴', label: '惠民惠农资金', color: '#2F6E9E', moduleLink: '/supervision/subsidy', desc: '农业补贴、危房改造与资金公示发放进度' },
  { key: '涉纪不实传言', label: '疑似不实传言', color: '#2C7A57', moduleLink: '/archive/records', desc: '断章取义网帖与基层干部澄清正名核实' },
  { key: '非纪检民生', label: '非纪检一般民生', color: '#746B60', desc: '市政维修、政策咨询等常规民生诉求参考' },
]

export type AcceptanceTag =
  | '拟研判·涉纪苗头'
  | '拟督办·履职与作风'
  | '待核实·疑似不实传言'
  | '非纪检受理·民生咨询'

export type EvidenceStatus = '原帖在架' | '已删帖·保留快照' | '已改文·留痕对比'

export interface RepostItem {
  sourceId: MediaSourceId
  title: string
  time: string
  author: string
}

export interface OpinionComment {
  id: string
  author: string
  time: string
  text: string
  likes: number
  flagged?: boolean
}

export interface OpinionPost {
  id: string
  topicId: string
  title: string
  content: string
  originalContent?: string
  sourceId: MediaSourceId
  author: string
  publishedAt: string
  capturedAt: string
  town: string
  village?: string
  category: OpinionCategory
  acceptance: AcceptanceTag
  evidenceStatus: EvidenceStatus
  snapshotHash?: string
  deletedAt?: string
  editedAt?: string
  reposts: RepostItem[]
  comments: OpinionComment[]
  engagement: { reads: number; likes: number; comments: number; shares: number }
  entities: { people: string[]; villages: string[]; codes: string[]; companies: string[] }
  aiReason: string
  aiQuote: string
}

export interface OpinionTopicSeed {
  id: string
  title: string
  summary: string
  category: OpinionCategory
  acceptance: AcceptanceTag
  baseLevel: RiskLevel | 'info'
  town: string
  village?: string
  firstSeen: string
  lastSeen: string
  entities: { people: string[]; villages: string[]; codes: string[]; companies: string[] }
  /** 历史沉底或默认初始已处置说明 */
  seedDisposition?: {
    action: '转问题线索' | '交办核查督办' | '建议澄清正名' | '非涉纪归档' | '持续关注'
    time: string
    actor: string
    note: string
    archivedReasonType?: string
    clueId?: string
    taskId?: string
    clarifyId?: string
  }
}

export const topicSeeds: OpinionTopicSeed[] = [
  {
    id: 'TP-01',
    title: '村集体场地低价长租及租金入账不全质疑',
    summary: '多平台群众反映村北 12 亩集体场地年租金明显低于周边行情且未见完整收款凭证，首发高热帖文在发布 6 小时后被删除，系统已留存原始抓取快照；自动碰撞命中在库信访线索与农村三资合同差额疑点。',
    category: '农村三资',
    acceptance: '拟研判·涉纪苗头',
    baseLevel: 'high',
    town: 'qinghe',
    village: '和盛村',
    firstSeen: '2026-10-26',
    lastSeen: '2026-11-07',
    entities: { people: ['张某军'], villages: ['和盛村'], codes: ['SZ-HT-2026-018'], companies: ['禾川农机服务社'] },
  },
  {
    id: 'TP-02',
    title: '基层农业服务站农机补贴办理推诿刁难反映',
    summary: '近 10 日内政务留言板、问政栏目及同城短视频陆续出现多起反映，指向某镇农业服务站办理农机补贴审核拖延、反复补材料及暗示吃请；碰撞命中信访举报与干部廉政档案既有履历记录。',
    category: '作风效能',
    acceptance: '拟督办·履职与作风',
    baseLevel: 'high',
    town: 'baita',
    village: '白塔村',
    firstSeen: '2026-10-28',
    lastSeen: '2026-11-07',
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
  },
  {
    id: 'TP-03',
    title: '村内硬化道路完工不久开裂及施工方集中质疑',
    summary: '同城图文与本地资讯评论质疑多条村级硬化路与排水沟均由同一施工企业承建，新修路面短期即出现裂缝；核心帖文曾修改正文删去施工方名称，系统保留了改文前后完整差异对比，并命中招投标围串标疑点。',
    category: '工程招投标',
    acceptance: '拟研判·涉纪苗头',
    baseLevel: 'mid',
    town: 'xinqiao',
    village: '新桥村',
    firstSeen: '2026-10-27',
    lastSeen: '2026-11-06',
    entities: { people: ['王某民'], villages: ['新桥村', '石桥村'], codes: ['XQ-GC-2026-07', 'XQ-GC-2026-11'], companies: ['鑫路建设工程有限公司'] },
  },
  {
    id: 'TP-04',
    title: '镇区中小学食堂配餐质量与食材采购公开度质疑',
    summary: '家长在同城短视频与省媒情报站集中讨论镇区两所学校食堂配餐菜品分量、配送单价及公示滞后问题，同时夹带对村级困难救助名单公示时长不足的追问，属群众身边不正之风重点关注领域。',
    category: '校园餐与民生',
    acceptance: '拟督办·履职与作风',
    baseLevel: 'mid',
    town: 'liuwan',
    village: '柳湾村',
    firstSeen: '2026-10-29',
    lastSeen: '2026-11-07',
    entities: { people: ['孙某'], villages: ['柳湾村'], codes: [], companies: [] },
  },
  {
    id: 'TP-05',
    title: '合规腾退违建遭断章取义剪辑传言（疑似不实）',
    summary: '局部同城号流传 18 秒剪辑视频，影射基层带队干部在项目占地清理中“强拆偏袒”；经核对全流程执法公开通报及廉政档案、经济责任审计记录均无异常，未发现违纪关联线索，建议核实后启动澄清正名。',
    category: '涉纪不实传言',
    acceptance: '待核实·疑似不实传言',
    baseLevel: 'low',
    town: 'xilin',
    village: '杏林村',
    firstSeen: '2026-11-01',
    lastSeen: '2026-11-06',
    entities: { people: ['陈某明'], villages: ['杏林村'], codes: [], companies: [] },
  },
  {
    id: 'TP-06',
    title: '集体闲置厂房十年期租赁未经表决质疑（历史已办结）',
    summary: '9 月下旬起陆续有村民留言反映村西闲置厂房低价长租十年且未召开村民代表会；经核查已于 10 月上旬办结并责令重新履行民主程序，近 30 日无新增异常传播，自动沉底归入历史事件。',
    category: '惠民补贴',
    acceptance: '拟研判·涉纪苗头',
    baseLevel: 'low',
    town: 'qinghe',
    village: '禾丰村',
    firstSeen: '2026-09-24',
    lastSeen: '2026-10-05',
    entities: { people: ['吴某'], villages: ['禾丰村'], codes: ['SZ-HT-2026-021'], companies: [] },
    seedDisposition: {
      action: '交办核查督办',
      time: '2026-10-02 15:20',
      actor: '监督专员',
      note: '已协同属地纪委核实并责令重新召开村民代表会履行出租程序，相关整改情况已公开，事件平息转入历史归档。',
    },
  },
  {
    id: 'TP-07',
    title: '社区夜间路灯报修、垃圾清运与改造进度咨询',
    summary: '居民集中咨询老旧小区改造排期、路段路灯检修与垃圾清运频次，内容属常规市政与公共服务诉求，未涉及公职人员违纪违法或吃拿卡要反映，建议按非纪检受理范围归档并转民生部门参考。',
    category: '非纪检民生',
    acceptance: '非纪检受理·民生咨询',
    baseLevel: 'info',
    town: 'chengdong',
    village: '东关社区',
    firstSeen: '2026-10-28',
    lastSeen: '2026-11-07',
    entities: { people: [], villages: ['东关社区', '运河社区'], codes: [], companies: [] },
  },
]

/** 精选 56 条高仿真口语化公开帖文（正文全自然口语，严禁出现“乡镇X”或私域群） */
export const opinionPostsSeed: OpinionPost[] = [
  // ── TP-01：农村三资 · 村集体场地低价出租（10条） ──
  {
    id: 'OP-0101', topicId: 'TP-01',
    title: '村北那块 12 亩集体场地一年才租三万六，周边同地段都六万多了，账目能不能公开？',
    content: '俺们村北头靠大路那块十二亩集体场地，今年年初租给了一家农机服务社，听说合同签的是一年三万六，可旁边紧挨着同样大的场院一年都租到六万多。更让人纳闷的是，村务公开栏前阵子只贴出来收了一万二，剩下那两万四到底交没交、啥时候开过村民代表会定的价，大伙儿一问三不知。',
    sourceId: 'douyin', author: '同城农户发声', publishedAt: '2026-11-04 09:18', capturedAt: '2026-11-04 09:32',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '已删帖·保留快照', snapshotHash: 'SHA-8F4A2C91', deletedAt: '2026-11-04 15:24',
    reposts: [
      { sourceId: 'toutiao', title: '村民追问：12 亩集体场地年租 3.6 万却只见到账 1.2 万？', time: '2026-11-04 11:05', author: '鲁北生活观察' },
      { sourceId: 'weibo', title: '#基层村务公开# 集体场地低价出租引发村民追问', time: '2026-11-04 13:40', author: '同城微话题' },
    ],
    comments: [
      { id: 'CM-0101-1', author: '热心村民甲', time: '2026-11-04 10:02', text: '那块地紧挨着国道边，去年有人出五万八想租做库房都没租着，今年咋三万六就签出去了？', likes: 47, flagged: true },
      { id: 'CM-0101-2', author: '邻村老周', time: '2026-11-04 11:19', text: '听说租场地的那家禾川农机服务社跟村里主要干部沾亲带故，真假不清楚，最好把合同和收据贴出来看看。', likes: 39, flagged: true },
      { id: 'CM-0101-3', author: '路过网友', time: '2026-11-04 12:45', text: '现在三资管理都有阳光平台，查一下入账明细就清楚了。', likes: 16 },
    ],
    engagement: { reads: 4820, likes: 168, comments: 42, shares: 31 },
    entities: { people: ['张某军'], villages: ['和盛村'], codes: ['SZ-HT-2026-018'], companies: ['禾川农机服务社'] },
    aiReason: '网帖具象反映集体场地租金显著低于周边市价、合同约定金额与村务公开实收存在差额且程序存疑；该帖在发布 6 小时后被删除，评论区提及关联企业，且与在库信访及三资合同疑点高度吻合，建议优先研判（事实待核实）。',
    aiQuote: '合同签的是一年三万六，可旁边紧挨着同样大的场院一年都租到六万多。更让人纳闷的是，村务公开栏前阵子只贴出来收了一万二',
  },
  {
    id: 'OP-0102', topicId: 'TP-01',
    title: '请求督促公开村集体场地租赁合同及 2026 年度租金收款凭证',
    content: '作为本村村民，我们多次向村里询问村北集体场地的出租情况，合同号好像是 SZ-HT-2026-018。约定六月底前付清全年租金，现在都十一月了，村账公开表上还是只见一万二千元，也没见过村民代表签字记录，恳请上级部门帮忙查一查钱去哪儿了。',
    sourceId: 'liuyan', author: '实名留言群众（已脱敏）', publishedAt: '2026-11-05 14:10', capturedAt: '2026-11-05 14:25',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架',
    reposts: [{ sourceId: 'gov_board', title: '关于要求公开村北集体场地租金入账情况的留言', time: '2026-11-05 16:08', author: '群众留言件' }],
    comments: [
      { id: 'CM-0102-1', author: '同村关注者', time: '2026-11-05 17:30', text: '支持公开，账目清楚了大伙儿心里才踏实。', likes: 19 },
    ],
    engagement: { reads: 1360, likes: 54, comments: 11, shares: 8 },
    entities: { people: ['张某军'], villages: ['和盛村'], codes: ['SZ-HT-2026-018'], companies: ['禾川农机服务社'] },
    aiReason: '政务留言板公开件明确提及合同编号 SZ-HT-2026-018 及逾期未见全额入账情况，与系统农村三资预警合同号完全一致，具备高核查价值。',
    aiQuote: '合同号好像是 SZ-HT-2026-018。约定六月底前付清全年租金，现在都十一月了，村账公开表上还是只见一万二千元',
  },
  {
    id: 'OP-0103', topicId: 'TP-01',
    title: '问政反映：村集体资产发包不开村民代表会，事后补签字算合规吗？',
    content: '村里一块好位置场地年初就让人进场放农机具了，当时压根没通知开村民代表大会。前阵子听说上面要来巡察检查，才急急忙忙找几个关系好的代表补签会议记录。集体资产出租到底有没有硬规矩？',
    sourceId: 'wenzheng_sd', author: '基层村民反映', publishedAt: '2026-11-06 10:22', capturedAt: '2026-11-06 10:40',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架',
    reposts: [],
    comments: [
      { id: 'CM-0103-1', author: '关注乡村治理', time: '2026-11-06 12:15', text: '先签合同后补会议记录，这在巡察里是最典型的程序违规。', likes: 28, flagged: true },
    ],
    engagement: { reads: 2140, likes: 83, comments: 19, shares: 14 },
    entities: { people: ['张某军'], villages: ['和盛村'], codes: ['SZ-HT-2026-018'], companies: [] },
    aiReason: '反映村级重大资产出租存在“先签合同后补会议记录”程序疑点，与本平台巡察阅卷检出的程序疑点形成双向印证。',
    aiQuote: '当时压根没通知开村民代表大会。前阵子听说上面要来巡察检查，才急急忙忙找几个关系好的代表补签会议记录',
  },
  {
    id: 'OP-0104', topicId: 'TP-01',
    title: '刚发的说村集体场地租金的视频咋没了？',
    content: '昨天上午刷到一个说村北集体场地租给亲戚农机社、一年少收两三万的视频，评论区几十号本村人在附和，结果下午再去翻就显示作者已删除。大家都是关心集体钱袋子，越藏着掖着议论越多。',
    sourceId: 'tieba', author: '本地吧友', publishedAt: '2026-11-05 08:45', capturedAt: '2026-11-05 09:05',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [],
    comments: [{ id: 'CM-0104-1', author: '实在人老李', time: '2026-11-05 09:50', text: '早就该把合同贴村口大喇叭广播广播，没毛病怕啥让人说。', likes: 22 }],
    engagement: { reads: 980, likes: 36, comments: 14, shares: 6 },
    entities: { people: [], villages: ['和盛村'], codes: [], companies: ['禾川农机服务社'] },
    aiReason: '贴吧跟帖印证前序高热视频被删除后引发二次猜测，提示需及时依托证据快照核查实情，防范次生舆论发酵。',
    aiQuote: '昨天上午刷到一个说村北集体场地租给亲戚农机社、一年少收两三万的视频……结果下午再去翻就显示作者已删除',
  },
  {
    id: 'OP-0105', topicId: 'TP-01',
    title: '农村集体“三资”管理如何让老百姓看得明白？',
    content: '最近周边村里都在议论集体场地、鱼塘发包价格不透明的问题，有的合同签好几年却看不到租金按时入账，村务公开栏一贴就是旧表格，群众盼着能像查水电费一样在手机上查到村集体合同明细。',
    sourceId: 'ql1d', author: '情报站网友', publishedAt: '2026-11-06 16:30', capturedAt: '2026-11-06 16:50',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [{ sourceId: 'dzwww', title: '基层声音：盼村集体资产出租账目常态公开', time: '2026-11-06 18:10', author: '民生观察员' }],
    comments: [], engagement: { reads: 1650, likes: 62, comments: 9, shares: 11 },
    entities: { people: [], villages: ['和盛村'], codes: [], companies: [] },
    aiReason: '省媒客户端情报站延伸讨论，聚焦农村集体资产租赁定价与村务公开滞后问题。',
    aiQuote: '有的合同签好几年却看不到租金按时入账，村务公开栏一贴就是旧表格',
  },
  {
    id: 'OP-0106', topicId: 'TP-01',
    title: '问一句，村里集体的地租出去钱没收齐，谁来催？',
    content: '合同写着年中交清租金，眼看快入冬了账上还差一大半，如果是外人租的早就停水断电催账了，因为租户是村干部亲戚就一直拖着没人管？',
    sourceId: 'toutiao', author: '乡间杂谈', publishedAt: '2026-11-02 19:40', capturedAt: '2026-11-02 20:00',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 870, likes: 31, comments: 7, shares: 4 },
    entities: { people: ['张某军'], villages: ['和盛村'], codes: [], companies: ['禾川农机服务社'] },
    aiReason: '质疑集体租金逾期未催缴与承租方亲属关系存在关联，属农村三资风险苗头。',
    aiQuote: '合同写着年中交清租金，眼看快入冬了账上还差一大半……因为租户是村干部亲戚就一直拖着没人管',
  },
  {
    id: 'OP-0107', topicId: 'TP-01',
    title: '希望镇里三资监管中心把各村今年新签合同核一遍',
    content: '不只是单个村，听说还有村里把闲置大场地低价包出去一签好几年。建议上级把今年新签的集体资产租赁合同拉个清单公示一下，有差价的趁早纠正。',
    sourceId: 'gov_board', author: '热心群众', publishedAt: '2026-10-30 15:12', capturedAt: '2026-10-30 15:40',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 620, likes: 24, comments: 5, shares: 2 },
    entities: { people: [], villages: ['和盛村'], codes: [], companies: [] },
    aiReason: '政务留言板公开建言，呼吁全面复核低价长租集体资产合同，与集中整治专题方向一致。',
    aiQuote: '建议上级把今年新签的集体资产租赁合同拉个清单公示一下，有差价的趁早纠正',
  },
  {
    id: 'OP-0108', topicId: 'TP-01',
    title: '村里大场院成了私人农机停放场，租金到底进没进公账？',
    content: '每天看着大型收割机进进出出，场院用得挺红火，可问村会计收了多少钱，会计含糊其辞说归村主任管。这钱到底进村集体账户没有？',
    sourceId: 'douyin', author: '村头随手拍', publishedAt: '2026-10-29 11:05', capturedAt: '2026-10-29 11:25',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1920, likes: 74, comments: 18, shares: 9 },
    entities: { people: ['张某军'], villages: ['和盛村'], codes: [], companies: ['禾川农机服务社'] },
    aiReason: '反映村集体场地实际运营活跃但收支去向不明，指向租金入账核查点。',
    aiQuote: '问村会计收了多少钱，会计含糊其辞说归村主任管。这钱到底进村集体账户没有',
  },
  {
    id: 'OP-0109', topicId: 'TP-01',
    title: '关于农村集体资产交易必须进平台公开竞价的政策咨询',
    content: '想了解一下，村集体场地年租金超过三万的是不是必须进镇里的农村产权交易平台公开挂牌？私下签协议算不算违规？',
    sourceId: 'hotline_12345', author: '12345 公开件摘要', publishedAt: '2026-10-27 16:40', capturedAt: '2026-10-27 17:00',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 410, likes: 15, comments: 3, shares: 1 },
    entities: { people: [], villages: ['和盛村'], codes: [], companies: [] },
    aiReason: '12345 公开热点咨询，侧面向产权交易挂牌程序发问，可作为该专题背景佐证。',
    aiQuote: '村集体场地年租金超过三万的是不是必须进镇里的农村产权交易平台公开挂牌',
  },
  {
    id: 'OP-0110', topicId: 'TP-01',
    title: '今天路过村委公开栏，第三季度财务表还是空白',
    content: '快十一月中旬了，村务公开栏玻璃罩里还贴着上半年的收支简表，大伙儿最关心的场地租金和集体支出一直没更新，盼着有关部门督促一下。',
    sourceId: 'weibo', author: '乡土观察者', publishedAt: '2026-11-07 08:30', capturedAt: '2026-11-07 08:45',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 740, likes: 29, comments: 8, shares: 5 },
    entities: { people: [], villages: ['和盛村'], codes: [], companies: [] },
    aiReason: '今日最新公开动态显示村务公开栏仍未更新，话题热度保持延续。',
    aiQuote: '村务公开栏玻璃罩里还贴着上半年的收支简表，大伙儿最关心的场地租金和集体支出一直没更新',
  },

  // ── TP-02：作风效能 · 农机补贴办理推诿刁难（10条） ──
  {
    id: 'OP-0201', topicId: 'TP-02',
    title: '办个农机购置补贴跑了四趟窗口，每次都说少张纸，说话还阴阳怪气',
    content: '秋收前新买了台玉米收获机，按政策去镇农业综合服务站申请农机购置补贴。头一趟说复印件不清楚，第二趟说签字日期格式不对，第三趟干脆说负责审核的站长开会去了。同村有人悄悄提醒我，说得“懂点事、请吃顿饭送两条烟”才能顺顺当当过审。国家的惠农补贴怎么到基层窗口就这么难办？',
    sourceId: 'douyin', author: '种粮大户老陈', publishedAt: '2026-11-05 11:24', capturedAt: '2026-11-05 11:38',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架',
    reposts: [
      { sourceId: 'sdnews', title: '群众反映基层农机补贴审核屡跑空、窗口态度冷硬', time: '2026-11-05 16:40', author: '闪电民生线索' },
      { sourceId: 'toutiao', title: '买农机领补贴为啥跑四趟？农户吐槽基层站所推诿', time: '2026-11-05 18:15', author: '齐鲁三农微讯' },
    ],
    comments: [
      { id: 'CM-0201-1', author: '农机手小马', time: '2026-11-05 12:10', text: '我九月份去办也是这样！排半天队窗口里还在低头刷手机，问进度就不耐烦。', likes: 63, flagged: true },
      { id: 'CM-0201-2', author: '白塔附近农户', time: '2026-11-05 13:28', text: '那个站长好几年都这派头，不熟的就挑毛病拖着，熟人当天就给盖章。', likes: 51, flagged: true },
      { id: 'CM-0201-3', author: '三农法律普及', time: '2026-11-05 14:40', text: '农机购置补贴有明确一次性告知清单和办理时限，建议保留材料清单向纪检部门反映。', likes: 27 },
    ],
    engagement: { reads: 6150, likes: 245, comments: 64, shares: 48 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '短视频高互动反映基层站所办理惠农补贴存在反复退件、态度冷硬及网传暗示吃请现象，评论区多名农户共鸣印证；碰撞命中在库实名信访 XF-2026-0109（涉及赵某平）及既往诫勉记录，建议优先研判。',
    aiQuote: '去镇农业综合服务站申请农机购置补贴。头一趟说复印件不清楚……同村有人悄悄提醒我，说得“懂点事、请吃顿饭送两条烟”才能顺顺当当过审',
  },
  {
    id: 'OP-0202', topicId: 'TP-02',
    title: '反映基层农业服务站农机补贴审核超期两个月无进展',
    content: '本人九月初提交了农机购置补贴全套材料，窗口收件后既不给回执也不告知审核进度，电话打过去总是推说系统升级或领导不在。隔壁镇同期提交的农户十月中旬就公示完毕了，为什么我们这边一直卡着不动？',
    sourceId: 'liuyan', author: '实名留言农户（已脱敏）', publishedAt: '2026-11-04 09:50', capturedAt: '2026-11-04 10:12',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架',
    reposts: [{ sourceId: 'wenzheng_sd', title: '农机购置补贴提交两月无回音，盼公布审核进度', time: '2026-11-04 14:30', author: '问政民声' }],
    comments: [{ id: 'CM-0202-1', author: '同行农户', time: '2026-11-04 16:05', text: '一样的情况，收了材料连个受理凭证都不开。', likes: 18, flagged: true }],
    engagement: { reads: 1890, likes: 71, comments: 16, shares: 11 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '领导留言板公开反映基层服务站超期压件、不给受理回执，与同期短视频反映形成跨平台呼应。',
    aiQuote: '九月初提交了农机购置补贴全套材料，窗口收件后既不给回执也不告知审核进度',
  },
  {
    id: 'OP-0203', topicId: 'TP-02',
    title: '窗口上班时间刷视频，群众排着队干等十几分钟',
    content: '今天上午十点去镇服务大厅农口窗口咨询补贴公示名单，里面两位工作人员戴着耳机看手机，叫了两声才抬头，挥挥手让先去走廊等着。基层窗口代表政府形象，这种工作纪律实在让人寒心。',
    sourceId: 'wenzheng_sd', author: '办事群众', publishedAt: '2026-11-06 11:05', capturedAt: '2026-11-06 11:20',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [],
    comments: [{ id: 'CM-0203-1', author: '网友A', time: '2026-11-06 13:10', text: '大厅里都有监控，倒查一下十点钟的画面一清二楚。', likes: 31 }],
    engagement: { reads: 2630, likes: 109, comments: 23, shares: 15 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '直指窗口工作纪律涣散、服务态度生硬，具备具体时间与场所核查线索，可与农机补贴办理推诿一并督办。',
    aiQuote: '上午十点去镇服务大厅农口窗口咨询补贴公示名单，里面两位工作人员戴着耳机看手机',
  },
  {
    id: 'OP-0204', topicId: 'TP-02',
    title: '同一批买的旋耕机，为啥熟人三天就公示、普通农户等俩月？',
    content: '我和邻村老张同一天在县城农机市场提的同款旋耕机，发票手续一模一样。老张跟服务站负责人吃过两回饭，三天就走完验机公示；我按规矩交材料，俩月了还在“复核中”。',
    sourceId: 'tieba', author: '农机合作社社员', publishedAt: '2026-11-03 20:15', capturedAt: '2026-11-03 20:45',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1420, likes: 58, comments: 19, shares: 8 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '帖文以同日购机审核时长悬殊为例，反映服务站负责人存在选择性审批及违规吃请疑点（待核实）。',
    aiQuote: '老张跟服务站负责人吃过两回饭，三天就走完验机公示；我按规矩交材料，俩月了还在“复核中”',
  },
  {
    id: 'OP-0205', topicId: 'TP-02',
    title: '12345 热点汇总：近一周 5 起群众来电反映农机补贴验机预约难',
    content: '公开热线摘要显示，近七日连续接到多户种粮农户反映农业综合服务站验机预约电话长期无人接听、现场办理未落实一次性告知，建议加强基层窗口效能督查。',
    sourceId: 'hotline_12345', author: '12345 公开件摘要', publishedAt: '2026-11-06 09:00', capturedAt: '2026-11-06 09:15',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 530, likes: 21, comments: 4, shares: 3 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '政务热线公开统计证实同类投诉呈集中多发趋势，非孤立偶发事件。',
    aiQuote: '近七日连续接到多户种粮农户反映农业综合服务站验机预约电话长期无人接听、现场办理未落实一次性告知',
  },
  {
    id: 'OP-0206', topicId: 'TP-02',
    title: '基层窗口“微腐败”最伤农心，农机补贴办理流程亟待晒在阳光下',
    content: '有读者向栏目反映，部分基层农业服务站办理惠农补贴仍存在“冷硬横推”现象。业内人士建议全面推行办理进度线上可查、超期自动亮灯，杜绝人为设卡。',
    sourceId: 'dezhoudaily', author: '民生评论员', publishedAt: '2026-11-07 09:12', capturedAt: '2026-11-07 09:28',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [{ sourceId: 'sdchina', title: '关注：让农机购置补贴审核流程全程透明', time: '2026-11-07 10:05', author: '地方民生网' }],
    comments: [], engagement: { reads: 2980, likes: 96, comments: 17, shares: 22 },
    entities: { people: [], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '今日市级媒体已跟进评论基层农机补贴窗口作风问题，话题出现向属地媒体升级扩散趋势。',
    aiQuote: '部分基层农业服务站办理惠农补贴仍存在“冷硬横推”现象。建议全面推行办理进度线上可查',
  },
  {
    id: 'OP-0207', topicId: 'TP-02',
    title: '去服务站盖个章，跑两回都没见到负责人',
    content: '工作日周三下午两点半去办补贴签字，门虚掩着人不在，去向牌也没翻。问隔壁屋说下村检查去了，打电话也没人接，庄稼人请一天工专门跑镇上不容易。',
    sourceId: 'gov_board', author: '普通农户', publishedAt: '2026-10-31 17:20', capturedAt: '2026-10-31 17:45',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 510, likes: 19, comments: 5, shares: 2 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '反映基层站所脱岗缺位、去向牌未落实等作风瑕疵。',
    aiQuote: '工作日周三下午两点半去办补贴签字，门虚掩着人不在，去向牌也没翻',
  },
  {
    id: 'OP-0208', topicId: 'TP-02',
    title: '农机补贴能不能搞个明确清单贴墙上？别每次挤牙膏一样让补材料',
    content: '头回让带身份证和购机发票，第二回又说缺农机铭牌合影，第三回又让村委开证明，一次性说清楚能省老百姓多少油钱和时间？',
    sourceId: 'weibo', author: '鲁西种田人', publishedAt: '2026-11-01 13:15', capturedAt: '2026-11-01 13:35',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1180, likes: 44, comments: 12, shares: 7 },
    entities: { people: [], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '集中吐槽未落实一次性告知，属典型慢作为与推诿作风表现。',
    aiQuote: '头回让带身份证和购机发票，第二回又说缺农机铭牌合影，第三回又让村委开证明',
  },
  {
    id: 'OP-0209', topicId: 'TP-02',
    title: '听说有农户给服务站送过土特产才给加急验机，希望查查',
    content: '俺不是瞎说，秋忙那几天验机排队排得老长，有的大户拉了两箱好酒去站里一趟，当天下午就来地头拍照验机了。咱普通小户干等了一个多月。',
    sourceId: 'douyin', author: '同城农友', publishedAt: '2026-11-02 21:08', capturedAt: '2026-11-02 21:25',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 3240, likes: 132, comments: 29, shares: 18 },
    entities: { people: ['赵某平'], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '网帖反映存在收受礼品后加急验机之嫌（未核实），与实名信访反映的吃拿卡要线索高度同源。',
    aiQuote: '有的大户拉了两箱好酒去站里一趟，当天下午就来地头拍照验机了。咱普通小户干等了一个多月',
  },
  {
    id: 'OP-0210', topicId: 'TP-02',
    title: '盼着“码上监督”二维码贴到镇农业服务站窗口上',
    content: '县政务大厅都有扫二维码直通监督评价，建议乡镇农业服务站也贴上，谁推诿刁难扫码就能反映，效率肯定立马提上来。',
    sourceId: 'wechat', author: '基层民生微言', publishedAt: '2026-10-28 19:00', capturedAt: '2026-10-28 19:20',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 890, likes: 38, comments: 9, shares: 6 },
    entities: { people: [], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '群众建言强化基层站所窗口监督机制，可纳入作风督办参考。',
    aiQuote: '建议乡镇农业服务站也贴上监督评价二维码，谁推诿刁难扫码就能反映',
  },

  // ── TP-03：工程招投标 · 村道开裂与施工方集中（9条） ──
  {
    id: 'OP-0301', topicId: 'TP-03',
    title: '刚修好不到三个月的村里硬化路就裂口子，工程验收怎么通过的？',
    content: '今年八月才完工通车的村里主干硬化路，才跑了没几趟三轮车，路口和排水沟边上就裂开一道道大缝，路边混凝土用手都能抠下渣子来。大伙儿都纳闷，这工程当初是怎么验收合格的？希望能把施工标准和验收签字公示一下。',
    originalContent: '今年八月才完工通车的村里主干硬化路（项目牌子上写着 XQ-GC-2026-07），施工方还是那家鑫路建设工程有限公司。才跑了没几趟三轮车，路口和排水沟边上就裂开一道道大缝，路边混凝土用手都能抠下渣子来。近两年好几个村的修路、排水沟全都是这家公司中标，听说跟村支书王某民关系铁得很，工程验收到底怎么通过的？',
    sourceId: 'douyin', author: '乡村实拍记录', publishedAt: '2026-11-03 16:42', capturedAt: '2026-11-03 16:55',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '已改文·留痕对比', snapshotHash: 'SHA-5D9C1E04', editedAt: '2026-11-04 08:15',
    reposts: [{ sourceId: 'toutiao', title: '新修村道不到三月出现多处裂缝，村民盼复核工程质量', time: '2026-11-03 19:20', author: '县域民生眼' }],
    comments: [
      { id: 'CM-0301-1', author: '懂点施工的老赵', time: '2026-11-03 17:30', text: '看这断面厚度怕是连十五公分都不到，石子松散得很，明显偷工减料。', likes: 44, flagged: true },
      { id: 'CM-0301-2', author: '隔壁石桥村的', time: '2026-11-03 18:12', text: '我们村七月份修的排水沟也是这家公司干的，下两场大雨沟壁就塌了一小块。', likes: 35, flagged: true },
    ],
    engagement: { reads: 3940, likes: 152, comments: 37, shares: 24 },
    entities: { people: ['王某民'], villages: ['新桥村', '石桥村'], codes: ['XQ-GC-2026-07', 'XQ-GC-2026-11'], companies: ['鑫路建设工程有限公司'] },
    aiReason: '原帖发布次日被修改，删去了项目编号 XQ-GC-2026-07、施工企业“鑫路建设”及村干部姓名，系统已固定改文前后差异快照；碰撞命中招投标围串标疑点及 3 条在库信访线索。',
    aiQuote: '施工方还是那家鑫路建设工程有限公司……近两年好几个村的修路、排水沟全都是这家公司中标',
  },
  {
    id: 'OP-0302', topicId: 'TP-03',
    title: '为何片区几个村的小微工程次次都是同一家建筑公司中标？',
    content: '查了公开中标公告，从五月份的村道硬化到七月份的石桥排水沟，几家陪跑公司的报价每次都只差两三千块，最后中标的还是鑫路建设。这招标过程有没有围标串标的情况？请求监督部门核查。',
    sourceId: 'liuyan', author: '工程行业关注者', publishedAt: '2026-11-04 15:18', capturedAt: '2026-11-04 15:35',
    town: 'xinqiao', village: '石桥村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [],
    comments: [{ id: 'CM-0302-1', author: '匿名网友', time: '2026-11-04 18:00', text: '几家投标单位查查联系电话和注册地址，说不定都是一伙的。', likes: 26, flagged: true }],
    engagement: { reads: 1620, likes: 68, comments: 15, shares: 9 },
    entities: { people: [], villages: ['石桥村', '新桥村'], codes: ['XQ-GC-2026-07', 'XQ-GC-2026-11'], companies: ['鑫路建设工程有限公司'] },
    aiReason: '公开留言直指多项目报价趋同与同一施工方连续中标，与穿透监督招投标筛查出的“法定代表人及电话一致”疑点高度印证。',
    aiQuote: '几家陪跑公司的报价每次都只差两三千块，最后中标的还是鑫路建设。这招标过程有没有围标串标的情况',
  },
  {
    id: 'OP-0303', topicId: 'TP-03',
    title: '新修排水沟雨季护坡脱皮，施工质量谁来兜底？',
    content: '夏天刚砌好的排水沟，没经住几场秋雨，水泥抹面一块块往下掉。工程质保金是不是该先扣着，让施工队返工修好再结账？',
    sourceId: 'wenzheng_sd', author: '村居居民', publishedAt: '2026-11-02 10:30', capturedAt: '2026-11-02 10:50',
    town: 'xinqiao', village: '石桥村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1280, likes: 49, comments: 11, shares: 6 },
    entities: { people: [], villages: ['石桥村'], codes: ['XQ-GC-2026-11'], companies: ['鑫路建设工程有限公司'] },
    aiReason: '反映排水沟工程短期质量缺陷，呼应同施工方道路质量质疑。',
    aiQuote: '夏天刚砌好的排水沟，没经住几场秋雨，水泥抹面一块块往下掉',
  },
  {
    id: 'OP-0304', topicId: 'TP-03',
    title: '村级道路建设公示牌字迹模糊，造价和监理单位看不到',
    content: '按规定农村公路建设都要立明白牌，写清投资额、施工单位、监理电话。咱村口那块牌子刚完工没几天就被搬走了，群众想反映质量问题都找不到监理电话。',
    sourceId: 'ql1d', author: '壹粉报料', publishedAt: '2026-11-05 13:50', capturedAt: '2026-11-05 14:15',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [{ sourceId: 'dzwww', title: '村民呼吁农村小微工程保留施工公示牌接受监督', time: '2026-11-05 17:10', author: '民生频道' }],
    comments: [], engagement: { reads: 1760, likes: 61, comments: 10, shares: 9 },
    entities: { people: [], villages: ['新桥村'], codes: ['XQ-GC-2026-07'], companies: [] },
    aiReason: '反映小微工程施工信息公示缺位，妨碍群众质量监督。',
    aiQuote: '村口那块牌子刚完工没几天就被搬走了，群众想反映质量问题都找不到监理电话',
  },
  {
    id: 'OP-0305', topicId: 'TP-03',
    title: '小微工程把关不能只看纸面验收表，得上钻芯检测',
    content: '老百姓肉眼都能看出新修路面厚度不均、开裂严重，单凭几张竣工签字表就拨付五十万工程款太草率了，建议第三方抽检混凝土标号和厚度。',
    sourceId: 'wechat', author: '基建观察手记', publishedAt: '2026-11-06 14:20', capturedAt: '2026-11-06 14:40',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1120, likes: 47, comments: 8, shares: 12 },
    entities: { people: [], villages: ['新桥村'], codes: ['XQ-GC-2026-07'], companies: [] },
    aiReason: '提出针对性质量核查建议，反映公众对工程验收流于形式的担忧。',
    aiQuote: '单凭几张竣工签字表就拨付五十万工程款太草率了，建议第三方抽检混凝土标号和厚度',
  },
  {
    id: 'OP-0306', topicId: 'TP-03',
    title: '听说之前发村道开裂视频的博主悄悄把施工单位名字删了',
    content: '前两天看原视频文字里明明白白写着施工方名字，今天刷到发现文案改得客气多了，也不知道是不是有人找去打招呼了。',
    sourceId: 'tieba', author: '本地老网友', publishedAt: '2026-11-04 19:22', capturedAt: '2026-11-04 19:45',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 830, likes: 33, comments: 11, shares: 4 },
    entities: { people: [], villages: ['新桥村'], codes: [], companies: ['鑫路建设工程有限公司'] },
    aiReason: '外部跟帖注意到原帖删改关键涉事主体名称，凸显系统改文留痕快照的取证价值。',
    aiQuote: '前两天看原视频文字里明明白白写着施工方名字，今天刷到发现文案改得客气多了',
  },
  {
    id: 'OP-0307', topicId: 'TP-03',
    title: '12345 公开件：反映村道硬化路面开裂要求施工方保修',
    content: '来电人反映本村今年八月完工的主路多处纵裂，联系村委称会通知施工队修补，但等了半个多月仍无动静，请求督促落实工程质保责任。',
    sourceId: 'hotline_12345', author: '12345 公开件摘要', publishedAt: '2026-10-30 10:05', capturedAt: '2026-10-30 10:30',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 390, likes: 12, comments: 2, shares: 1 },
    entities: { people: [], villages: ['新桥村'], codes: ['XQ-GC-2026-07'], companies: [] },
    aiReason: '12345 公开件与在库工单线索时间线相互衔接。',
    aiQuote: '本村今年八月完工的主路多处纵裂，联系村委称会通知施工队修补，但等了半个多月仍无动静',
  },
  {
    id: 'OP-0308', topicId: 'TP-03',
    title: '高标准农田机井配套管网咋也出现漏水？',
    content: '秋灌刚用上新修的田间管网，接头处就咕嘟咕嘟往外冒水，问施工队说质保期外不管，可这工程去年年底才刚验收完。',
    sourceId: 'weibo', author: '田间随手记', publishedAt: '2026-10-28 16:10', capturedAt: '2026-10-28 16:35',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 760, likes: 28, comments: 6, shares: 4 },
    entities: { people: [], villages: ['新桥村'], codes: [], companies: [] },
    aiReason: '延伸反映农田水利工程质保推诿问题，归入片区小微工程专题持续跟踪。',
    aiQuote: '秋灌刚用上新修的田间管网，接头处就咕嘟咕嘟往外冒水，问施工队说质保期外不管',
  },
  {
    id: 'OP-0309', topicId: 'TP-03',
    title: '希望农村基建项目把招投标评标打分明细也晒一晒',
    content: '现在公告只写谁中标、多少钱，至于另外几家为啥落选、报价差在哪儿、施工队资质咋样，老百姓一概看不到，透明了自然没人瞎猜。',
    sourceId: 'gov_board', author: '乡村建设建言', publishedAt: '2026-10-27 09:40', capturedAt: '2026-10-27 10:00',
    town: 'xinqiao', village: '石桥村', category: '工程招投标', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 480, likes: 19, comments: 4, shares: 2 },
    entities: { people: [], villages: ['石桥村'], codes: [], companies: [] },
    aiReason: '公众建议提升小微工程评标透明度，可作长效机制参考。',
    aiQuote: '现在公告只写谁中标、多少钱，至于另外几家为啥落选、报价差在哪儿，老百姓一概看不到',
  },

  // ── TP-04：校园餐与基层民生（9条） ──
  {
    id: 'OP-0401', topicId: 'TP-04',
    title: '孩子说学校食堂午饭肉菜越来越少，家长能不能查一下食材采购明细？',
    content: '这学期交的午餐费没降，可孩子回家总说中午菜里几乎见不到几片肉，土豆白菜顿顿吃。问家委会说食材都是统一配送的，价格和供应商名单一直没发到家长群公示。校园餐是家长最操心的事，盼着把每日菜单、采购单价和陪餐记录晒出来。',
    sourceId: 'douyin', author: '小学生家长', publishedAt: '2026-11-05 19:35', capturedAt: '2026-11-05 19:50',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架',
    reposts: [{ sourceId: 'ql1d', title: '家长呼吁晒出中小学食堂采购单价与陪餐台账', time: '2026-11-06 08:40', author: '校园民生关注' }],
    comments: [
      { id: 'CM-0401-1', author: '同校三年级妈妈', time: '2026-11-05 20:10', text: '我家孩子也是，放学回来饿得直翻冰箱，希望开放家长代表不打招呼随机陪餐！', likes: 56, flagged: true },
      { id: 'CM-0401-2', author: '热心家长', time: '2026-11-05 21:02', text: '学校食堂大宗食材招投标和进货台账本来就该定期公示。', likes: 38, flagged: true },
    ],
    engagement: { reads: 4320, likes: 184, comments: 53, shares: 34 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '高互动民生话题直指校园餐菜品质量、餐费去向及供应商公示透明度，属群众身边不正之风和腐败问题集中整治头号重点领域，建议督办核实。',
    aiQuote: '价格和供应商名单一直没发到家长群公示。盼着把每日菜单、采购单价和陪餐记录晒出来',
  },
  {
    id: 'OP-0402', topicId: 'TP-04',
    title: '关于村里困难群众低保评定未开评议会、名单未公示的反映',
    content: '今年低保年度复核，村里压根没召集村民代表开评议会，公布栏也没贴出初审名单，结果听说好几家条件不错的亲戚关系户继续领着，两户真有重病老人的反而落选了。希望查查评定程序是否公平公正。',
    sourceId: 'liuyan', author: '村民反映', publishedAt: '2026-11-03 13:20', capturedAt: '2026-11-03 13:40',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [],
    comments: [{ id: 'CM-0402-1', author: '邻里公道话', time: '2026-11-03 15:40', text: '低保不公示就容易藏猫腻，查查名册里有没有早就去世或者有稳定退休金的。', likes: 29, flagged: true }],
    engagement: { reads: 1840, likes: 77, comments: 18, shares: 12 },
    entities: { people: ['孙某'], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '反映村级低保评定跳过评议会与公示程序、疑似优亲厚友，碰撞命中在库信访 XF-2026-0111（涉孙某）及惠民资金“死亡继续领取”疑点。',
    aiQuote: '压根没召集村民代表开评议会，公布栏也没贴出初审名单，结果听说好几家条件不错的亲戚关系户继续领着',
  },
  {
    id: 'OP-0403', topicId: 'TP-04',
    title: '建议中小学食堂推行“明厨亮灶”手机端实时查看',
    content: '不少地方已经开放家长在午饭时段看后厨实时画面、看每周带量食谱和进货票据，建议咱镇区中小学也抓紧推开，让家长放心。',
    sourceId: 'wenzheng_sd', author: '学生家长代表', publishedAt: '2026-11-06 11:45', capturedAt: '2026-11-06 12:05',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1520, likes: 64, comments: 13, shares: 8 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '聚焦校园餐阳光监管机制建设，可纳入教体派驻监督参考。',
    aiQuote: '建议咱镇区中小学也抓紧推开后厨实时画面与进货票据公开，让家长放心',
  },
  {
    id: 'OP-0404', topicId: 'TP-04',
    title: '校园配送食材单价比菜市场零售价还高出一截，合理吗？',
    content: '前几天偶然看到食堂门口卸货单，一斤普通大白菜配送价标得比镇上早市零售价还贵三成，大批量集采不该更便宜吗？希望教体和市场监管部门联合查查配送合同。',
    sourceId: 'toutiao', author: '关心教育的家长', publishedAt: '2026-11-07 07:50', capturedAt: '2026-11-07 08:10',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 2740, likes: 115, comments: 31, shares: 19 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '今日新增高关注帖文直指校园食材配送单价异常偏高，存在潜在利益输送风险（待核实），建议优先列入校园餐专项监督检查。',
    aiQuote: '一斤普通大白菜配送价标得比镇上早市零售价还贵三成，大批量集采不该更便宜吗',
  },
  {
    id: 'OP-0405', topicId: 'TP-04',
    title: '镇卫生院门诊收费单据太笼统，一项“综合耗材”收了一百多',
    content: '带老人去镇卫生院看感冒拿药，结账单上只印了个“综合医用耗材 126 元”，让窗口打明细清单说系统打不出来。医疗收费应该清清楚楚，别让老百姓花糊涂钱。',
    sourceId: 'gov_board', author: '患者家属', publishedAt: '2026-11-02 15:10', capturedAt: '2026-11-02 15:30',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 940, likes: 41, comments: 9, shares: 5 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '反映基层医疗收费明细不透明，归入民生领域集中整治关注清单。',
    aiQuote: '结账单上只印了个“综合医用耗材 126 元”，让窗口打明细清单说系统打不出来',
  },
  {
    id: 'OP-0406', topicId: 'TP-04',
    title: '评低保不能谁嗓门大、谁跟村干部熟就给谁',
    content: '盼着民政和纪委联合抽查一下低保户和特困户档案，家里开着小轿车还吃低保的趁早清退，把名额留给真正困难的家庭。',
    sourceId: 'tieba', author: '村里明白人', publishedAt: '2026-11-04 21:30', capturedAt: '2026-11-04 21:55',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1090, likes: 48, comments: 14, shares: 6 },
    entities: { people: ['孙某'], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '呼应低保评定公平性质疑，可与惠民资金五源比对模块联动核查。',
    aiQuote: '盼着民政和纪委联合抽查一下低保户和特困户档案，把名额留给真正困难的家庭',
  },
  {
    id: 'OP-0407', topicId: 'TP-04',
    title: '山东多地开展校园餐专项整治，守护学生“舌尖上的安全”',
    content: '报道梳理了近期省内多地纪委监委联合教育、市场监管部门严查校园配餐虚报冒领、违规转包等问题的典型做法，引发本地家长热议转发。',
    sourceId: 'dzwww', author: '大众网民生频道', publishedAt: '2026-11-01 09:30', capturedAt: '2026-11-01 10:00',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架',
    reposts: [{ sourceId: 'people', title: '严守校园食品安全底线，压实陪餐与采购公开责任', time: '2026-11-01 14:00', author: '人民网民生' }],
    comments: [], engagement: { reads: 3120, likes: 112, comments: 19, shares: 27 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '央省主流媒体正向监督背景稿件，为本地开展校园餐排查提供政策舆情参照。',
    aiQuote: '严查校园配餐虚报冒领、违规转包等问题的典型做法，引发本地家长热议转发',
  },
  {
    id: 'OP-0408', topicId: 'TP-04',
    title: '学校陪餐制度不能只在检查那天拍两张照片',
    content: '家长们希望校长和老师每天真跟学生吃一样的饭菜，每周随机请两位家长进食堂尝一尝、看一看后厨卫生和冷库食材日期。',
    sourceId: 'weibo', author: '家长心声', publishedAt: '2026-10-30 20:15', capturedAt: '2026-10-30 20:35',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1210, likes: 55, comments: 11, shares: 9 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '反映家长对陪餐制度流于形式的担忧，指向作风务实度督查。',
    aiQuote: '希望校长和老师每天真跟学生吃一样的饭菜，每周随机请两位家长进食堂尝一尝',
  },
  {
    id: 'OP-0409', topicId: 'TP-04',
    title: '12345 公开件：询问本年度困难群众救助复核名单公示途径',
    content: '群众来电询问今年下半年困难群众救助复核名单在哪儿可以查到，称在村务公开栏未看到完整名单，建议在镇政府网站同步公开脱敏简表。',
    sourceId: 'hotline_12345', author: '12345 公开件摘要', publishedAt: '2026-10-29 14:25', capturedAt: '2026-10-29 14:45',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 430, likes: 16, comments: 3, shares: 2 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '公开热线件反映困难救助公示渠道不畅，辅助印证低保公示不足问题。',
    aiQuote: '称在村务公开栏未看到完整名单，建议在镇政府网站同步公开脱敏简表',
  },

  // ── TP-05：涉纪不实传言 · 澄清正名样本（6条） ──
  {
    id: 'OP-0501', topicId: 'TP-05',
    title: '网传 18 秒剪辑视频称基层项目清理“偏袒熟人、强推合规棚舍”',
    content: '网上流传一段只有 18 秒的无头无尾视频，画面里带队协调的副镇长声音急了点，配文影射“拆违看人下菜碟、自己熟人的大棚留着不拆”。可评论区不少现场目击村民留言说，那座被清的棚子占了消防通道且提前发过三次书面通知，旁边留着的是有合法审批手续的农业合作社设施，视频把前半段讲政策的过程全剪掉了。',
    sourceId: 'douyin', author: '同城热点搬运', publishedAt: '2026-11-04 18:10', capturedAt: '2026-11-04 18:25',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架',
    reposts: [{ sourceId: 'weibo', title: '18 秒视频引发争议，现场村民呼吁看完整执法记录', time: '2026-11-04 20:45', author: '同城观察' }],
    comments: [
      { id: 'CM-0501-1', author: '杏林村目击村民', time: '2026-11-04 19:02', text: '我在现场从头看到尾！人家提前贴了三次公告，还帮着找人搬空物资，旁边那个棚子本来就不在违建红线内，发视频的故意掐头去尾！', likes: 89, flagged: true },
      { id: 'CM-0501-2', author: '本地老陈', time: '2026-11-04 19:40', text: '陈副镇长平时干活挺踏实，不能让断章取义的视频寒了干事干部的心，盼着官方出个说明。', likes: 67, flagged: true },
    ],
    engagement: { reads: 3560, likes: 118, comments: 46, shares: 21 },
    entities: { people: ['陈某明'], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '视频仅截取 18 秒情绪片段，与现场目击者留言及既往公开规划红线明显冲突；跨库检索陈某明廉政档案（GB-006），个人事项抽查一致且经济责任审计无问题、无任何信访或监督疑点，具备启动核实与澄清正名条件。',
    aiQuote: '视频把前半段讲政策的过程全剪掉了……旁边留着的是有合法审批手续的农业合作社设施',
  },
  {
    id: 'OP-0502', topicId: 'TP-05',
    title: '还原现场：那处清理的是占用公共通道的临时违建，并非网传“针对某户”',
    content: '前两天刷到那个十几秒的短视频觉得不对劲，特意问了亲戚才知道，清理的是占着村口主排水沟搭的彩钢瓦违建，镇里前后沟通了一个多月并帮着联系了周转场地。网上光靠十几秒剪辑就给基层干部扣帽子太不公平。',
    sourceId: 'toutiao', author: '公道自在人心', publishedAt: '2026-11-05 10:15', capturedAt: '2026-11-05 10:35',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1840, likes: 92, comments: 17, shares: 11 },
    entities: { people: ['陈某明'], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '多名本地网民自发还原现场完整过程，佐证前序视频存在断章取义失实特征。',
    aiQuote: '清理的是占着村口主排水沟搭的彩钢瓦违建，镇里前后沟通了一个多月并帮着联系了周转场地',
  },
  {
    id: 'OP-0503', topicId: 'TP-05',
    title: '希望纪检部门核实清楚，真违规严查、被冤枉的也要及时澄清',
    content: '看了网上传的拆违片段，有人说干部偏袒，也有现场村民说完全依法依规。建议县里核查一下执法记录仪全过程，如果干部确实合规履职，应当公开予以澄清正名，保护基层干事积极性。',
    sourceId: 'liuyan', author: '关注基层治理群众', publishedAt: '2026-11-05 15:40', capturedAt: '2026-11-05 16:00',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 960, likes: 54, comments: 8, shares: 5 },
    entities: { people: ['陈某明'], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '群众理性建言通过调阅执法记录仪查明实情，支持依规开展澄清正名。',
    aiQuote: '如果干部确实合规履职，应当公开予以澄清正名，保护基层干事积极性',
  },
  {
    id: 'OP-0504', topicId: 'TP-05',
    title: '基层拆违执法全流程记录公开，透明是最好的辟谣',
    content: '碰到断章取义的短视频，最好的办法就是按程序核实并公布执法全过程和审批红线图，让围观群众一眼看清是非曲直。',
    sourceId: 'dezhoudaily', author: '评论专栏', publishedAt: '2026-11-06 09:40', capturedAt: '2026-11-06 10:05',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架', reposts: [{ sourceId: 'thepaper', title: '为实干者撑腰：多地建立涉基层不实网传快速核实澄清机制', time: '2026-11-06 14:00', author: '澎湃政务观察' }],
    comments: [], engagement: { reads: 2210, likes: 88, comments: 14, shares: 16 },
    entities: { people: [], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '属地与全国主流媒体共同倡导快速核实与澄清正名，舆论环境利于规范澄清发布。',
    aiQuote: '按程序核实并公布执法全过程和审批红线图，让围观群众一眼看清是非曲直',
  },
  {
    id: 'OP-0505', topicId: 'TP-05',
    title: '问一句，网上传的那个违建清理到底合不合规？',
    content: '刷到两个说法完全相反的视频，吃瓜群众看晕了，等一个权威核实通报，不信谣也不传谣。',
    sourceId: 'tieba', author: '理性吃瓜群众', publishedAt: '2026-11-05 12:20', capturedAt: '2026-11-05 12:40',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 640, likes: 25, comments: 9, shares: 2 },
    entities: { people: [], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '反映公众等待权威核实口径，及时澄清可有效阻断不实传言二次扩散。',
    aiQuote: '刷到两个说法完全相反的视频……等一个权威核实通报，不信谣也不传谣',
  },
  {
    id: 'OP-0506', topicId: 'TP-05',
    title: '严查诬告陷害、及时澄清正名，护航基层担当作为',
    content: '地方纪检监察机关持续健全澄清正名机制，既严肃查处违纪违法问题，也坚决向不实举报和恶意剪辑说不，为一线实干干部吃下定心丸。',
    sourceId: 'xinhuanet', author: '新华网地方政务', publishedAt: '2026-11-01 11:00', capturedAt: '2026-11-01 11:30',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架', reposts: [{ sourceId: 'cctv', title: '严管厚爱结合，精准规范开展澄清正名工作', time: '2026-11-02 09:00', author: '央视网时政' }],
    comments: [], engagement: { reads: 2680, likes: 103, comments: 11, shares: 24 },
    entities: { people: [], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '央媒政策背景报道，可为撰写《不实传言核查与澄清建议》提供政策指引参考。',
    aiQuote: '既严肃查处违纪违法问题，也坚决向不实举报和恶意剪辑说不',
  },

  // ── TP-06：历史沉底样本 · 30天前已核实办结（6条，2026-09-24 ~ 2026-10-05） ──
  {
    id: 'OP-0601', topicId: 'TP-06',
    title: '村西闲置厂房一签十年每年两万块，村民事前完全不知情',
    content: '村西头那座八百平米的闲置厂房，听说已经签给外地老板用十年，一年才两万块。这么长的租期，村两委和村民代表大会都没见开，合同条款也不公示，希望上级核实程序。',
    sourceId: 'liuyan', author: '村民留言', publishedAt: '2026-09-24 10:15', capturedAt: '2026-09-24 10:35',
    town: 'qinghe', village: '禾丰村', category: '惠民补贴', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [{ id: 'CM-0601-1', author: '同村居民', time: '2026-09-25 08:40', text: '支持按民主程序重新研究定价。', likes: 21 }],
    engagement: { reads: 1450, likes: 52, comments: 13, shares: 7 },
    entities: { people: ['吴某'], villages: ['禾丰村'], codes: ['SZ-HT-2026-021'], companies: [] },
    aiReason: '历史预警事件（已办结沉底）：反映村集体闲置厂房未经民主表决签订十年低价合同，核查后已责令重新履行程序。',
    aiQuote: '八百平米的闲置厂房，听说已经签给外地老板用十年，一年才两万块……村民代表大会都没见开',
  },
  {
    id: 'OP-0602', topicId: 'TP-06',
    title: '闲置厂房对外出租应该公开挂牌竞价',
    content: '八百平米的厂房位置不错，公开竞价起码能租三万多一年，直接私下定两万还签十年太吃亏了。',
    sourceId: 'tieba', author: '乡村热心人', publishedAt: '2026-09-26 19:20', capturedAt: '2026-09-26 19:45',
    town: 'qinghe', village: '禾丰村', category: '惠民补贴', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 820, likes: 31, comments: 8, shares: 3 },
    entities: { people: ['吴某'], villages: ['禾丰村'], codes: ['SZ-HT-2026-021'], companies: [] },
    aiReason: '历史事件伴生讨论，已随主事件一并核实整改完毕。',
    aiQuote: '八百平米的厂房公开竞价起码能租三万多一年，直接私下定两万还签十年太吃亏',
  },
  {
    id: 'OP-0603', topicId: 'TP-06',
    title: '村里昨天贴公告了，说闲置厂房租赁要重新召开村民代表会表决',
    content: '看来反映管用了！村里已经张贴公告暂停原协议，下周公开召开村民代表会重新评估厂房租金，大伙儿都挺满意。',
    sourceId: 'douyin', author: '本地生活号', publishedAt: '2026-10-03 14:10', capturedAt: '2026-10-03 14:30',
    town: 'qinghe', village: '禾丰村', category: '惠民补贴', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1620, likes: 79, comments: 16, shares: 11 },
    entities: { people: ['吴某'], villages: ['禾丰村'], codes: ['SZ-HT-2026-021'], companies: [] },
    aiReason: '整改后群众正向反馈，标志该起舆情风险已有效化解。',
    aiQuote: '村里已经张贴公告暂停原协议，下周公开召开村民代表会重新评估厂房租金，大伙儿都挺满意',
  },
  {
    id: 'OP-0604', topicId: 'TP-06',
    title: '给迅速纠偏点赞：集体厂房已纳入产权平台重新竞价',
    content: '镇里介入督促很快，原十年合同已规范修订并重新走完表决与公示，集体一年能多增收一万多块钱。',
    sourceId: 'gov_board', author: '实名反馈群众', publishedAt: '2026-10-05 11:00', capturedAt: '2026-10-05 11:20',
    town: 'qinghe', village: '禾丰村', category: '惠民补贴', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 740, likes: 43, comments: 6, shares: 4 },
    entities: { people: [], villages: ['禾丰村'], codes: ['SZ-HT-2026-021'], companies: [] },
    aiReason: '闭环回访反馈良好，事件已超 30 日无新增异常，归入历史沉底档案。',
    aiQuote: '原十年合同已规范修订并重新走完表决与公示，集体一年能多增收一万多块钱',
  },
  {
    id: 'OP-0605', topicId: 'TP-06',
    title: '农村集体厂房租赁程序规范化典型做法获村民认可',
    content: '针对群众反映的基层资产长租不透明问题，当地纪检监察机关及时督促重新履行民主表决并公开挂牌，实现“事心双解”。',
    sourceId: 'sdnews', author: '闪电新闻县区频道', publishedAt: '2026-10-05 16:30', capturedAt: '2026-10-05 16:50',
    town: 'qinghe', village: '禾丰村', category: '惠民补贴', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1930, likes: 85, comments: 9, shares: 13 },
    entities: { people: [], villages: ['禾丰村'], codes: ['SZ-HT-2026-021'], companies: [] },
    aiReason: '省媒正向收尾报道，完整记录“监测发现→督办整改→公开回音”全过程。',
    aiQuote: '及时督促重新履行民主表决并公开挂牌，实现“事心双解”',
  },
  {
    id: 'OP-0606', topicId: 'TP-06',
    title: '公开透明之后，村里人对集体账目放心多了',
    content: '其实老百姓要求不高，就是集体资产怎么租、租多少、钱放哪儿，明明白白贴在墙上，心里就亮堂。',
    sourceId: 'wechat', author: '乡情日记', publishedAt: '2026-10-04 20:15', capturedAt: '2026-10-04 20:35',
    town: 'qinghe', village: '禾丰村', category: '惠民补贴', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 610, likes: 29, comments: 5, shares: 3 },
    entities: { people: [], villages: ['禾丰村'], codes: [], companies: [] },
    aiReason: '整改回访后群众舆论恢复平稳。',
    aiQuote: '集体资产怎么租、租多少、钱放哪儿，明明白白贴在墙上，心里就亮堂',
  },

  // ── TP-07：非纪检一般民生诉求（6条） ──
  {
    id: 'OP-0701', topicId: 'TP-07',
    title: '社区南门一段路灯坏了十来天，晚上接孩子放学挺黑的',
    content: '小区南门往西二百米这五六盏路灯天黑不亮快十天了，老人晚上散步、家长接晚自习孩子都不太安全，请问打哪个报修电话能尽快来检修一下？',
    sourceId: 'gov_board', author: '社区居民', publishedAt: '2026-11-01 11:22', capturedAt: '2026-11-01 11:40',
    town: 'chengdong', village: '运河社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [{ id: 'CM-0701-1', author: '同小区邻居', time: '2026-11-01 14:15', text: '同盼尽快修好，冬天黑得越来越早了。', likes: 12 }],
    engagement: { reads: 580, likes: 23, comments: 6, shares: 2 },
    entities: { people: [], villages: ['运河社区'], codes: [], companies: [] },
    aiReason: '市政照明报修求助，未涉及公职人员违纪违法或失职渎职反映，不属于纪检监察业务受理范围，建议归档并转常规民生渠道参考。',
    aiQuote: '小区南门往西二百米这五六盏路灯天黑不亮快十天了，请问打哪个报修电话能尽快来检修',
  },
  {
    id: 'OP-0702', topicId: 'TP-07',
    title: '咨询老旧小区外墙保温和暖气管网改造明年什么时候动工？',
    content: '之前社区摸底登记过老旧小区改造意愿，大伙儿都签字同意了，想打听一下具体排在明年哪一批、需不需要居民个人分摊费用？',
    sourceId: 'hotline_12345', author: '12345 公开件摘要', publishedAt: '2026-11-03 16:08', capturedAt: '2026-11-03 16:30',
    town: 'chengdong', village: '东关社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 490, likes: 17, comments: 4, shares: 1 },
    entities: { people: [], villages: ['东关社区'], codes: [], companies: [] },
    aiReason: '常规政策进度咨询，无涉纪要素，建议按非纪检受理范围填理由归档。',
    aiQuote: '想打听一下具体排在明年哪一批、需不需要居民个人分摊费用',
  },
  {
    id: 'OP-0703', topicId: 'TP-07',
    title: '早高峰小学门口接送车略堵，建议增划临时即停即走区',
    content: '每天早上七点半到八点学校门口有点拥堵，建议交警和城管联动划出一段即停即走通道，方便家长安全送娃。',
    sourceId: 'weibo', author: '城东宝妈', publishedAt: '2026-11-04 08:15', capturedAt: '2026-11-04 08:35',
    town: 'chengdong', village: '东关社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 710, likes: 29, comments: 7, shares: 3 },
    entities: { people: [], villages: ['东关社区'], codes: [], companies: [] },
    aiReason: '交通微循环优化建议，非涉纪问题。',
    aiQuote: '建议交警和城管联动划出一段即停即走通道，方便家长安全送娃',
  },
  {
    id: 'OP-0704', topicId: 'TP-07',
    title: '小区东侧垃圾桶满了清运稍慢，希望能早晚各清一次',
    content: '入秋落叶多加上生活垃圾，下午垃圾箱就溢出来了，希望环卫公司增加一趟下午清运频次，保持小区门口整洁。',
    sourceId: 'gov_board', author: '热心居民', publishedAt: '2026-11-05 07:55', capturedAt: '2026-11-05 08:15',
    town: 'chengdong', village: '东关社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 430, likes: 15, comments: 3, shares: 1 },
    entities: { people: [], villages: ['东关社区'], codes: [], companies: [] },
    aiReason: '环卫清运频次建议，属一般公共服务范畴。',
    aiQuote: '希望环卫公司增加一趟下午清运频次，保持小区门口整洁',
  },
  {
    id: 'OP-0705', topicId: 'TP-07',
    title: '今冬供暖试压通知贴出来了，大家记得家里留人看暖气片',
    content: '物业和供热公司今天在单元门贴了试水打压通知，提醒邻居们这周末家里留人检查阀门接口，有问题及时打供热维修热线。',
    sourceId: 'wechat', author: '邻里生活服务', publishedAt: '2026-11-06 17:30', capturedAt: '2026-11-06 17:50',
    town: 'chengdong', village: '运河社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 920, likes: 34, comments: 5, shares: 11 },
    entities: { people: [], villages: ['运河社区'], codes: [], companies: [] },
    aiReason: '便民生活提醒信息，无任何涉纪风险。',
    aiQuote: '贴了试水打压通知，提醒邻居们这周末家里留人检查阀门接口',
  },
  {
    id: 'OP-0706', topicId: 'TP-07',
    title: '公园晚间健身步道刚修补平整，散步体验好了不少',
    content: '前阵子反映过的步道砖块松动已经修好了，晚饭后带家人去溜达顺畅多了，给市政养护点个赞。',
    sourceId: 'toutiao', author: '晨练大爷', publishedAt: '2026-11-07 07:10', capturedAt: '2026-11-07 07:25',
    town: 'chengdong', village: '运河社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 540, likes: 38, comments: 4, shares: 2 },
    entities: { people: [], villages: ['运河社区'], codes: [], companies: [] },
    aiReason: '正向民生反馈，纳入日常民情参考。',
    aiQuote: '步道砖块松动已经修好了，晚饭后带家人去溜达顺畅多了',
  },

  // ── 补充 10 条 14 日跨话题生态帖文，使总样本恰好为 56 条，覆盖全 14 日曲线与多源交叉 ──
  {
    id: 'OP-0111', topicId: 'TP-01',
    title: '三资合同台账若能扫码验真，村里矛盾能少一半',
    content: '听说邻县试点给每份村集体出租合同印二维码，贴在公开栏上村民一扫就能看租期、价格和到账记录，真心盼着咱这边也能推广。',
    sourceId: 'wechat', author: '乡村振兴观察', publishedAt: '2026-10-26 14:20', capturedAt: '2026-10-26 14:40',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 890, likes: 37, comments: 6, shares: 8 },
    entities: { people: [], villages: ['和盛村'], codes: [], companies: [] },
    aiReason: '三资公开透明度建设建言，反映群众对合同与租金明细公开的持续期待。',
    aiQuote: '贴在公开栏上村民一扫就能看租期、价格和到账记录',
  },
  {
    id: 'OP-0112', topicId: 'TP-01',
    title: '同样是村集体耕地和场地，隔壁村租金按时入账还发分红',
    content: '一对比差距就出来了，人家隔壁村公开挂牌竞价，场地租了六万多全部进村公账；咱村这么大块场院一年三万多还没收齐，难怪大伙儿有意见。',
    sourceId: 'tieba', author: '村西老周', publishedAt: '2026-11-01 20:40', capturedAt: '2026-11-01 21:00',
    town: 'qinghe', village: '和盛村', category: '农村三资', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1030, likes: 46, comments: 12, shares: 5 },
    entities: { people: ['张某军'], villages: ['和盛村'], codes: [], companies: [] },
    aiReason: '通过邻村同类型资产租金横向对比，进一步印证低价出租与催收不力争议。',
    aiQuote: '隔壁村公开挂牌竞价，场地租了六万多全部进村公账；咱村这么大块场院一年三万多还没收齐',
  },
  {
    id: 'OP-0211', topicId: 'TP-02',
    title: '农忙季节盼着农业服务站能开通周末预约验机',
    content: '秋收抢农时耽误不起，要是工作日排队排不上、周末又关门，新农机停在院里干着急，盼着服务窗口能多替农民着想。',
    sourceId: 'gov_board', author: '农机大户', publishedAt: '2026-10-29 18:10', capturedAt: '2026-10-29 18:35',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 610, likes: 25, comments: 4, shares: 2 },
    entities: { people: [], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '反映基层农口服务时间与农忙需求脱节，属服务效能优化点。',
    aiQuote: '工作日排队排不上、周末又关门，新农机停在院里干着急',
  },
  {
    id: 'OP-0212', topicId: 'TP-02',
    title: '给窗口服务提个醒：态度好一句，群众少跑十里路',
    content: '其实大家去办补贴也不是无理取闹，只要工作人员把缺啥材料、怎么补填耐心讲清楚，别拉着脸甩冷话，谁也不会往网上发牢骚。',
    sourceId: 'ql1d', author: '市民评议', publishedAt: '2026-11-04 16:40', capturedAt: '2026-11-04 17:00',
    town: 'baita', village: '白塔村', category: '作风效能', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1340, likes: 59, comments: 10, shares: 6 },
    entities: { people: [], villages: ['白塔村'], codes: [], companies: [] },
    aiReason: '理性评论基层窗口服务态度与沟通作风问题。',
    aiQuote: '把缺啥材料、怎么补填耐心讲清楚，别拉着脸甩冷话，谁也不会往网上发牢骚',
  },
  {
    id: 'OP-0310', topicId: 'TP-03',
    title: '村道修路用料看着像拌合不均，养护几天就放行通车了',
    content: '按常理水泥路浇筑完至少要覆膜洒水养护七天，这条路才晾了两天半就撤了路障让拉砖车轧，难怪没过俩月就裂纹。',
    sourceId: 'douyin', author: '工程老把式', publishedAt: '2026-10-31 14:55', capturedAt: '2026-10-31 15:15',
    town: 'xinqiao', village: '新桥村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1850, likes: 72, comments: 16, shares: 8 },
    entities: { people: [], villages: ['新桥村'], codes: ['XQ-GC-2026-07'], companies: ['鑫路建设工程有限公司'] },
    aiReason: '指出施工养护未达标书承诺的“养护期不少于七天”，可直接与在库投标文件核对。',
    aiQuote: '按常理水泥路浇筑完至少要覆膜洒水养护七天，这条路才晾了两天半就撤了路障',
  },
  {
    id: 'OP-0311', topicId: 'TP-03',
    title: '听说隔壁乡文化广场工程也是同家建筑公司中标',
    content: '前几天去邻乡赶集看他们新建文化广场，围挡上印的还是那家鑫路建设，真是哪儿的农村小微工程都能看见他们。',
    sourceId: 'tieba', author: '路过随手记', publishedAt: '2026-11-01 11:30', capturedAt: '2026-11-01 11:50',
    town: 'maixiang', village: '麦香村', category: '工程招投标', acceptance: '拟研判·涉纪苗头',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 910, likes: 34, comments: 9, shares: 4 },
    entities: { people: ['王某民'], villages: ['麦香村'], codes: ['MX-GC-2026-03'], companies: ['鑫路建设工程有限公司'] },
    aiReason: '反映同一企业跨乡镇承揽多个村级项目，碰撞命中在库线索 XF-2026-0112（麦香村文化广场工程）。',
    aiQuote: '新建文化广场，围挡上印的还是那家鑫路建设，哪儿的农村小微工程都能看见他们',
  },
  {
    id: 'OP-0410', topicId: 'TP-04',
    title: '孩子吃得放心，家长才能安心打工挣钱',
    content: '农村寄宿和午托孩子多，一顿热乎干净、分量实在的午饭比啥都强，真心希望把食堂每一分餐费都花在孩子嘴里。',
    sourceId: 'wechat', author: '家长随笔', publishedAt: '2026-11-03 21:05', capturedAt: '2026-11-03 21:25',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1470, likes: 81, comments: 15, shares: 13 },
    entities: { people: [], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '集中反映农村家长对校园餐资金规范使用的朴素期盼。',
    aiQuote: '真心希望把食堂每一分餐费都花在孩子嘴里',
  },
  {
    id: 'OP-0411', topicId: 'TP-04',
    title: '村里低保评定如果能公开每户打分表，谁也没话说',
    content: '就怕暗箱操作，其实把家庭人口、收入、大病医疗支出等评估条件公开张榜一周，合不合条件全村人都门儿清。',
    sourceId: 'gov_board', author: '群众建言', publishedAt: '2026-11-05 10:05', capturedAt: '2026-11-05 10:25',
    town: 'liuwan', village: '柳湾村', category: '校园餐与民生', acceptance: '拟督办·履职与作风',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 670, likes: 28, comments: 5, shares: 3 },
    entities: { people: ['孙某'], villages: ['柳湾村'], codes: [], companies: [] },
    aiReason: '对困难救助评定公开程序提出建设性意见。',
    aiQuote: '把家庭人口、收入、大病医疗支出等评估条件公开张榜一周，合不合条件全村人都门儿清',
  },
  {
    id: 'OP-0507', topicId: 'TP-05',
    title: '别被剪辑视频带节奏，镇里现场公告贴了整整半个月',
    content: '路过村口天天都能看见那张限期拆除公告，白纸黑字写明占压排水主渠，给足了自行拆除时间，网上断章取义说强拆真不地道。',
    sourceId: 'toutiao', author: '杏林附近居民', publishedAt: '2026-11-06 13:10', capturedAt: '2026-11-06 13:30',
    town: 'xilin', village: '杏林村', category: '涉纪不实传言', acceptance: '待核实·疑似不实传言',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 1290, likes: 66, comments: 12, shares: 7 },
    entities: { people: ['陈某明'], villages: ['杏林村'], codes: [], companies: [] },
    aiReason: '又一现场目击佐证公告期合规，进一步增强启动澄清正名依据。',
    aiQuote: '限期拆除公告贴了整整半个月，白纸黑字写明占压排水主渠，给足了自行拆除时间',
  },
  {
    id: 'OP-0707', topicId: 'TP-07',
    title: '冬季农贸市场早市摊位划分清晰了不少，买菜方便',
    content: '这周早市重新划了白线，蔬菜区和鲜肉区分开了，三轮车也不乱堵路口了，值得肯定。',
    sourceId: 'douyin', author: '城东日常', publishedAt: '2026-10-28 09:20', capturedAt: '2026-10-28 09:40',
    town: 'chengdong', village: '东关社区', category: '非纪检民生', acceptance: '非纪检受理·民生咨询',
    evidenceStatus: '原帖在架', reposts: [], comments: [], engagement: { reads: 780, likes: 45, comments: 6, shares: 3 },
    entities: { people: [], villages: ['东关社区'], codes: [], companies: [] },
    aiReason: '正向市政市容反馈，作为日常民情对照样本。',
    aiQuote: '早市重新划了白线，蔬菜区和鲜肉区分开了，三轮车也不乱堵路口了',
  },
]

export interface KeywordGroup {
  id: string
  name: string
  category: OpinionCategory
  enabled: boolean
  moduleLink?: string
  words: string[]
  excludes: string[]
  desc: string
}

export const keywordGroupsSeed: KeywordGroup[] = [
  {
    id: 'KW-01', name: '农村集体“三资”监管词包', category: '农村三资', enabled: true, moduleLink: '/supervision/assets',
    words: ['集体场地', '集体资产', '低价出租', '村务公开', '村民代表会', '租金', '闲置厂房', '未公示', '发包'],
    excludes: ['房屋中介', '个人出租'],
    desc: '聚焦集体资产违规发包、低价长租、租金未入账及村务公开缺失苗头。',
  },
  {
    id: 'KW-02', name: '窗口作风与“四风”苗头词包', category: '作风效能', enabled: true, moduleLink: '/clues/grading',
    words: ['农机补贴', '服务站', '吃拿卡要', '请吃饭', '送烟', '推诿', '玩手机', '刷手机', '拖着不办', '阴阳怪气', '脱岗', '公款吃喝'],
    excludes: ['手机测评', '美食探店'],
    desc: '识别基层站所窗口冷硬横推、暗示吃请、工作纪律涣散及慢作为反映。',
  },
  {
    id: 'KW-03', name: '小微工程与招投标词包', category: '工程招投标', enabled: true, moduleLink: '/supervision/procurement',
    words: ['硬化路', '开裂', '裂缝', '排水沟', '围标', '串标', '同一家', '验收', '偷工减料', '鑫路建设', '施工方', '质保金'],
    excludes: ['家装瓷砖', '商品房评测'],
    desc: '监测村道、排水沟、高标准农田等工程质量质疑及围串标异常集中线索。',
  },
  {
    id: 'KW-04', name: '校园餐与民生救助词包', category: '校园餐与民生', enabled: true, moduleLink: '/supervision/campaign',
    words: ['校园餐', '学校食堂', '食材采购', '配送价', '陪餐', '低保', '评议会', '优亲厚友', '综合耗材', '医疗收费'],
    excludes: ['网红餐厅', '家常菜谱'],
    desc: '对接群众身边不正之风和腐败问题集中整治重点：校园餐、困难救助与基层医疗。',
  },
  {
    id: 'KW-05', name: '惠民惠农资金词包', category: '惠民补贴', enabled: true, moduleLink: '/supervision/subsidy',
    words: ['农业设施补助', '危房改造', '跑腿费', '虚报', '冒领', '补贴名单', '土地流转费'],
    excludes: ['商业促销补贴'],
    desc: '聚焦各类涉农惠民补贴申报、公示时长不足及优亲厚友疑点。',
  },
  {
    id: 'KW-06', name: '涉纪不实传言与澄清监测词包', category: '涉纪不实传言', enabled: true, moduleLink: '/archive/records',
    words: ['断章取义', '掐头去尾', '剪辑视频', '澄清正名', '依法依规', '扣帽子', '不实举报'],
    excludes: ['影视剪辑教程'],
    desc: '识别针对实干干部的片面网传与不实网暴苗头，服务核实澄清与护航担当作为。',
  },
]

export interface SimulationSample {
  id: string
  label: string
  hint: string
  sourceId: MediaSourceId
  town: string
  village: string
  title: string
  content: string
}

export const simulationSamples: SimulationSample[] = [
  {
    id: 'SIM-01',
    label: '样帖一：命中在库线索与惠民疑点',
    hint: '模拟群众反映农业设施补助公示仅两天即撤下，将自动碰撞清源村线索与惠民比对疑点',
    sourceId: 'wenzheng_sd',
    town: 'qingyuan',
    village: '清源村',
    title: '村里第三季度农业设施补助名单只贴了两天就撕了，会计亲戚咋也在里头？',
    content: '前阵子清源村申报农业设施补助，总共四万八千块钱，村会计李某华把自家不符合条件的亲戚李某芳也报上去了，领了八千块。公示栏就贴了两天大家还没看全就撤下来了，希望纪委查查申报和验收材料。',
  },
  {
    id: 'SIM-02',
    label: '样帖二：非纪检受理常规民生咨询',
    hint: '模拟一般公共服务咨询，演示引擎自动识别受理边界并建议转民生渠道',
    sourceId: 'gov_board',
    town: 'chengxi',
    village: '西关社区',
    title: '建议西关社区北口增设一处电动自行车集中充电棚',
    content: '西关社区北口几栋居民楼晚上停放电动自行车比较多，现有充电桩不够用，希望能结合社区微更新增设一处带雨棚的集中充电区，消除飞线充电隐患。',
  },
]
