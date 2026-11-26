import type { Component } from 'vue'
import { LayoutDashboard, FileSearch, Radar, ScanSearch, Scale, IdCard, Radio, Sparkles, ShieldCheck, BadgeCheck, BookOpenCheck, Bot, Building2, Cable, ClipboardCheck, Copy, FilePen, FilePlus2, FileText, Flag, FolderOpen, Gavel, GitCompare, HandCoins, Landmark, Layers, LayoutGrid, Link2, ListChecks, ListFilter, Map, MessageCircleQuestion, Monitor, Network, Newspaper, PenLine, Receipt, ScanLine, ScanText, ScrollText, Server, Siren, SlidersHorizontal, Tags, UserCog, ArrowLeftRight } from 'lucide-vue-next'
import type { ModuleKey } from '@/types'

/** flow：页头流程条，依次为「输入 → 智能处理 → 产出 → 人工把关」，让人一眼看懂这一页在做什么 */
export interface FeatureDef { key: string; icon: Component; title: string; desc: string; flow?: [string, string, string, string?]; load: () => Promise<{ default: Component }> }
export interface ModuleDef { key: ModuleKey; title: string; short: string; icon: Component; group: string; hideInTopbar?: boolean; features: FeatureDef[] }

const pages = import.meta.glob('../modules/**/*.vue')
const page = (path: string) => pages[`../modules/${path}.vue`] as () => Promise<{ default: Component }>

/** 左侧导航分组，按“发现问题 → 审查审理 → 日常监督 → 平台支撑”的业务链排列 */
export const groups = ['综合', '问题发现', '审查审理', '日常监督', '平台支撑'] as const

export const modules: ModuleDef[] = [
  { key: 'home', title: '工作台', short: '工作台', icon: LayoutDashboard, group: '综合', features: [
    { key: 'dashboard', icon: Monitor, title: '监督工作台', desc: '待办、预警、线索全流程与县域风险一张图', load: page('home/Dashboard') },
    { key: 'overview', icon: LayoutGrid, title: '能力全景', desc: '平台全部业务模块与智能能力一览', load: page('home/Overview') },
    { key: 'tasks', icon: ClipboardCheck, title: '核查任务', desc: '人工确认后形成的核查任务与办理结果', flow: ['各模块确认的疑点与线索', '汇总时限与承办部门', '核查任务清单', '记录核查结果后办结'], load: page('home/Tasks') },
  ] },
  { key: 'clues', title: '信访举报与线索研判', short: '信访研判', icon: FileSearch, group: '问题发现', features: [
    { key: 'intake', icon: FilePlus2, title: '线索登记解析', desc: '多渠道材料解析，提取要素并结构化入库', flow: ['来信、12345 工单、网络举报、扫描件', '抽取被反映人、问题、时间、金额、诉求', '结构化线索与风险初筛', '核对要素后入库'], load: page('clues/Intake') },
    { key: 'dedupe', icon: Copy, title: '重复与多头识别', desc: '识别重复举报、多头举报与无效诉求，人工决定合并', flow: ['在库全部线索', '文本相似度 + 人员、合同、企业重合比对', '重复组、多头组、无效诉求', '决定合并、关联或不相关'], load: page('clues/Dedupe') },
    { key: 'grading', icon: Siren, title: '风险分级预警', desc: '六大纪律标签与高频风险词，批量初筛高价值线索', flow: ['在库全部线索', '六大纪律标签与高频风险词识别', '红橙黄分级清单', '批量标记高价值线索'], load: page('clues/Grading') },
    { key: 'graph', icon: Network, title: '线索关联图谱', desc: '人员、村社、项目、企业、资金关系初绘', flow: ['线索、合同、项目、企业', '实体抽取与共现关联', '关系图谱与多次被举报对象', '交给智能体全景研判'], load: page('clues/Graph') },
    { key: 'ledger', icon: ListChecks, title: '线索督办台账', desc: '到期预警、超期提醒、流转留痕与台账初稿', flow: ['全部线索与流转记录', '按受理时限计算到期与超期', '督办台账与台账初稿', '逐节点推进并留痕'], load: page('clues/Ledger') },
    { key: 'linkage', icon: Building2, title: '县乡联动督办', desc: '县纪委交办、乡镇纪委核查、按时反馈的上下联动', flow: ['14 个乡镇街道的线索与交办件', '按乡镇汇总办理进度与时限', '联动排名与督办清单', '县纪委发出督办提醒'], load: page('clues/Linkage') },
  ] },
  { key: 'supervision', title: '大数据穿透监督', short: '穿透监督', icon: Radar, group: '问题发现', features: [
    { key: 'campaign', icon: Flag, title: '集中整治专题', desc: '群众身边不正之风和腐败问题集中整治，一屏看进度', flow: ['三资、惠民资金、群众信访疑点', '按整治领域归集、分级', '专题问题清单与进度', '逐条确认转核查'], load: page('supervision/Campaign') },
    { key: 'assets', icon: Landmark, title: '农村三资监督', desc: '合同、票据、流水比对，预警小微腐败风险', flow: ['租赁合同、收款流水、记账凭证、资产台账', '八类风险规则比对', '三资风险疑点', '确认转核查或填写理由排除'], load: page('supervision/Assets') },
    { key: 'subsidy', icon: HandCoins, title: '惠民资金比对', desc: '补贴与户籍、耕地、医保、养老多表比对', flow: ['补贴发放名册', '与户籍、耕地、医保、养老数据交叉比对', '一人多领、死亡继续领取、重复申领、资格不符疑点', '确认转核查或排除'], load: page('supervision/Subsidy') },
    { key: 'procurement', icon: Gavel, title: '招投标筛查', desc: '报价趋同、供应商关联、标书雷同等围串标疑点', flow: ['招标项目、投标报价、企业登记信息', '报价、股东、联系方式、标书比对', '围标串标疑点', '确认转核查或排除'], load: page('supervision/Procurement') },
    { key: 'expense', icon: Receipt, title: '公务支出识别', desc: '津补贴、公车、接待与餐饮票据异常', flow: ['津补贴、接待、餐饮票据、公车轨迹', '标准核对与时间地点比对', '公务支出异常疑点', '确认转核查或排除'], load: page('supervision/Expense') },
    { key: 'riskmap', icon: Map, title: '风险一张图', desc: '县域风险热力、分级预警与监督月报', flow: ['全部疑点与线索', '按乡镇、领域、部门汇总分级', '风险热力图与监督月报', '导出月报报送'], load: page('supervision/RiskMap') },
  ] },
  { key: 'inspection', title: '智能巡察辅助', short: '智能巡察', icon: ScanSearch, group: '问题发现', features: [
    { key: 'reading', icon: BookOpenCheck, title: '台账批量阅卷', desc: '批量检查会议记录、三重一大与财务凭证的程序疑点', flow: ['会议记录、三重一大、财务凭证', '逐份阅卷，定位程序疑点原文', '阅卷疑点清单', '确认或排除每处疑点'], load: page('inspection/Reading') },
    { key: 'issues', icon: Layers, title: '问题归类提炼', desc: '疑点归类、去重并生成巡察报告初稿', flow: ['阅卷确认的疑点', '按问题大类归类、同类去重', '问题清单与巡察报告初稿', '编辑定稿后导出'], load: page('inspection/Issues') },
    { key: 'rectify', icon: BadgeCheck, title: '整改闭环跟踪', desc: '整改材料比对问题清单，跟踪逾期与销号', flow: ['问题清单与整改材料', '逐条比对回应、佐证与时限', '避重就轻、佐证缺失、逾期提示', '复核通过后销号'], load: page('inspection/Rectify') },
  ] },
  { key: 'bankflow', title: '资金流水分析', short: '流水分析', icon: ArrowLeftRight, group: '审查审理', features: [
    { key: 'batches', icon: FolderOpen, title: '核查批次与导入', desc: '多银行对账单自动清洗、去重归并、模型阈值设置与批次管理', flow: ['多银行账单文件', '字段标准化清洗与去重入库', '结构化核查批次与概览', '选定案件进入查账分析'], load: page('bankflow/Batches') },
    { key: 'graph', icon: Network, title: '资金穿透图谱', desc: '围绕被核查对象绘制上下游资金链路、重点对手方排行与资金汇总', load: page('bankflow/Graph') },
    { key: 'ledger', icon: ListFilter, title: '预警筛查与台账', desc: '五大纪检异常模型实时筛查、多维流水检索、人工标注与三表底稿导出', load: page('bankflow/Ledger') },
    { key: 'agent', icon: Sparkles, title: '智能体资金研判', desc: '资金链全景剖析、初核谈话提纲、隐蔽摘要手法识别与原流水 [n] 回链', load: page('bankflow/Agent') },
  ] },
  { key: 'cases', title: '案件审理与案卷', short: '审理案卷', icon: Scale, group: '审查审理', features: [
    { key: 'qa', icon: MessageCircleQuestion, title: '法规智能问答', desc: '先检索本地知识库再作答，逐条标注引用来源', flow: ['自然语言问题', '检索本地纪检知识库后作答', '附引用来源的回答', '审理人员自行判断适用'], load: page('cases/Qa') },
    { key: 'extract', icon: ScanText, title: '案卷要素抽取', desc: '笔录、书证、录音转写结构化，检索历史案卷', flow: ['笔录、书证、录音转写、扫描件', '抽取时间、金额、人员、事由并跨材料印证', '要素表与印证结果', '审理人员核对'], load: page('cases/Extract') },
    { key: 'draft', icon: FilePen, title: '文书起草校核', desc: '五类文书模板生成初稿并校核', flow: ['案卷要素与文书模板', '生成初稿，校核引用、时限、表述', '文书初稿与校核意见', '逐条修正后定稿'], load: page('cases/Draft') },
    { key: 'evidence', icon: Link2, title: '证据链校验', desc: '对照要件清单提示缺失证据与程序节点', flow: ['在卷证据与程序记录', '按违纪类型对照要件清单', '缺失证据与程序风险', '补充后标记完成'], load: page('cases/Evidence') },
    { key: 'similar', icon: GitCompare, title: '类案推送', desc: '按案件要素推送同类已办结案例', flow: ['当前案件要素', '与已办结案例比对相似度', '同类案例与处理结果分布', '仅供把握尺度参考'], load: page('cases/Similar') },
  ] },
  { key: 'archive', title: '廉政档案与教育', short: '档案教育', icon: IdCard, group: '日常监督', features: [
    { key: 'records', icon: FolderOpen, title: '廉政档案归集', desc: '汇聚多源记录，生成廉政情况摘要', flow: ['信访、函询、巡察、处分、审计、个人事项', '按干部归集、按时间排序', '廉政档案与情况摘要初稿', '审核后出具'], load: page('archive/Records') },
    { key: 'tags', icon: Tags, title: '客观动态标签', desc: '客观数据标签，辅助任前廉政审核', flow: ['多源客观记录', '生成可追溯的客观标签', '干部标签清单', '任前意见由人研判出具'], load: page('archive/Tags') },
    { key: 'materials', icon: PenLine, title: '廉政素材生成', desc: '警示通报、党课提纲、案例剖析等素材初稿', flow: ['已办结典型案例', '按体裁逐段撰写', '通报、党课提纲、剖析、脚本初稿', '审核后印发'], load: page('outreach/Materials') },
  ] },
  { key: 'opinion', title: '涉纪舆情监测', short: '舆情监测', icon: Radio, group: '日常监督', features: [
    { key: 'overview', icon: Monitor, title: '舆情态势总览', desc: '一句话态势结论、14日趋势、监督领域分布与跨库印证摘要', load: page('opinion/Overview') },
    { key: 'alerts', icon: Siren, title: '苗头预警研判', desc: '领域导航、同事件合并、证据保全快照、话题纠偏与四分流闭环', flow: ['公开渠道聚类话题', '受理边界初筛与跨库碰撞', '红橙黄预警与证据快照', '转线索、核查、澄清或填理由归档'], load: page('opinion/Alerts') },
    { key: 'feed', icon: Newspaper, title: '涉纪信息检索', desc: '全量公开原声检索、关键词高亮、多站转载折叠与现场模拟研判', flow: ['属地合法公开平台与问政件', '词包命中高亮与转载折叠', '可追溯原声流与跨库徽标', '人工纠偏标签与核查取证'], load: page('opinion/Feed') },
    { key: 'reports', icon: FileText, title: '舆情专报中心', desc: '周报、专项快报与澄清建议，结论前置图表化、站内回链与专版打印', flow: ['周期监测与处置台账', '结论前置汇总与图表转换', '可溯源舆情专报与润色初稿', '审核定稿后打印或导出'], load: page('opinion/Reports') },
    { key: 'topics', icon: SlidersHorizontal, title: '专题词库与信源', desc: '六大纪检词包实时调优、噪词过滤审计与合规公开信源目录', flow: ['集中整治重点与纪律清单', '词包增删改实时重算命中', '专题词库策略与信源目录', '变更全程写入审计日志'], load: page('opinion/Topics') },
  ] },
  { key: 'assistant', title: '纪检智能体', short: '智能助手', icon: Sparkles, group: '平台支撑', hideInTopbar: true, features: [
    { key: 'chat', icon: Bot, title: '纪检助手', desc: '问答、法规、润色、摘要、转写、纪要', flow: ['问题或材料', '纪检大模型分步处理，可追问', '回答、润色稿、摘要、纪要', '使用前人工核对'], load: page('assistant/Chat') },
    { key: 'multimodal', icon: ScanLine, title: '多模态识别', desc: '票据、合同、收据照片与谈话音频识别，并与台账比对', flow: ['票据、合同、收据照片与谈话音频', '版面识别、字段抽取、语音转写', '结构化字段与台账比对结果', '低置信度字段人工复核'], load: page('assistant/Multimodal') },
  ] },
  { key: 'system', title: '安全与管控', short: '安全管控', icon: ShieldCheck, group: '平台支撑', features: [
    { key: 'roles', icon: UserCog, title: '权限角色', desc: '角色与模块、操作权限矩阵', load: page('system/Roles') },
    { key: 'audit', icon: ScrollText, title: '审计日志', desc: '谁查了什么、生成了什么，全程可追溯', load: page('system/Audit') },
    { key: 'integration', icon: Cable, title: '数据对接', desc: '业务系统与政务共享数据对接状态', load: page('system/Integration') },
    { key: 'deploy', icon: Server, title: '部署与分期', desc: '私有化部署与分步建设路线', load: page('system/Deploy') },
  ] },
]
export const moduleOf = (key: string) => modules.find(m => m.key === key)
export const featureOf = (module: string, feature: string) => moduleOf(module)?.features.find(f => f.key === feature)
export const featureCount = modules.reduce((s, m) => s + m.features.length, 0)
