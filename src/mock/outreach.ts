/** 廉政档案、廉洁教育与舆情虚构样例。干部姓名均为“某”化虚构，不对应任何真实人员。 */
export type RecordSource = '信访' | '谈话函询' | '巡察' | '处分' | '审计' | '个人事项'
export interface CadreRecord { source: RecordSource; date: string; title: string; result: string; open?: boolean }
export interface Cadre { id: string; name: string; title: string; unit: string; town: string; level: '村（社区）干部' | '乡科级' | '站所负责人'; since: string; records: CadreRecord[] }

export const cadres: Cadre[] = [
  { id: 'GB-001', name: '张某军', title: '村委会主任', unit: '乡镇G和盛村', town: 'qinghe', level: '村（社区）干部', since: '2021-01', records: [
    { source: '信访', date: '2026-10-12', title: '被反映违规出租集体场地', result: '已立案审查调查', open: true },
    { source: '信访', date: '2026-10-19', title: '网络举报同一事项', result: '与前件合并办理', open: true },
    { source: '巡察', date: '2026-10-28', title: '集体资产出租先签合同后补会议', result: '纳入整改问题清单', open: true },
    { source: '个人事项', date: '2026-03-01', title: '年度个人有关事项报告', result: '已报告，未见异常' },
  ] },
  { id: 'GB-002', name: '李某华', title: '村会计', unit: '乡镇K清源村', town: 'qingyuan', level: '村（社区）干部', since: '2019-06', records: [
    { source: '信访', date: '2026-10-08', title: '被反映虚报亲属补助', result: '已立案，移送审理', open: true },
    { source: '审计', date: '2025-12-10', title: '村级财务审计', result: '发现票据不规范 1 项，已整改' },
  ] },
  { id: 'GB-003', name: '王某民', title: '党支部书记', unit: '乡镇J新桥村', town: 'xinqiao', level: '村（社区）干部', since: '2018-03', records: [
    { source: '信访', date: '2026-10-15', title: '被反映收取工程回扣', result: '初步核实中', open: true },
    { source: '信访', date: '2026-10-30', title: '被反映帮助关联企业承揽工程', result: '初步核实中', open: true },
    { source: '谈话函询', date: '2025-08-20', title: '函询：村内工程项目管理', result: '已如实说明，予以了结' },
  ] },
  { id: 'GB-004', name: '赵某平', title: '农业综合服务站站长', unit: '乡镇I', town: 'baita', level: '站所负责人', since: '2020-09', records: [
    { source: '信访', date: '2026-10-10', title: '被反映办事吃拿卡要', result: '分办核实中', open: true },
    { source: '处分', date: '2023-05-12', title: '违反工作纪律', result: '诫勉谈话（组织处理），期满' },
  ] },
  { id: 'GB-005', name: '吴某', title: '党支部书记', unit: '乡镇G禾丰村', town: 'qinghe', level: '村（社区）干部', since: '2022-01', records: [
    { source: '信访', date: '2026-10-06', title: '被反映擅自出租闲置厂房', result: '已办结，责令重新履行程序' },
    { source: '巡察', date: '2026-10-28', title: '议事表决未过半数、先执行后补手续', result: '纳入整改问题清单', open: true },
  ] },
  { id: 'GB-006', name: '陈某明', title: '副镇长', unit: '乡镇D人民政府', town: 'xilin', level: '乡科级', since: '2023-04', records: [
    { source: '个人事项', date: '2026-02-20', title: '年度个人有关事项报告', result: '抽查核实一致' },
    { source: '审计', date: '2025-11-02', title: '经济责任审计', result: '未发现问题' },
  ] },
  { id: 'GB-007', name: '刘某刚', title: '村委会主任', unit: '乡镇F东河村', town: 'donghe', level: '村（社区）干部', since: '2021-01', records: [
    { source: '信访', date: '2026-10-21', title: '被反映公款吃喝', result: '分办核实中', open: true },
    { source: '个人事项', date: '2026-03-05', title: '年度个人有关事项报告', result: '漏报房产 1 处，已更正说明' },
  ] },
  { id: 'GB-008', name: '孙某', title: '村委会主任', unit: '乡镇M柳湾村', town: 'liuwan', level: '村（社区）干部', since: '2024-01', records: [
    { source: '信访', date: '2026-10-24', title: '被反映低保评定优亲厚友', result: '待分办', open: true },
  ] },
]

export const materialTypes = ['警示教育通报', '廉政党课提纲', '案例剖析', '短视频脚本', '警示海报文案'] as const
export const educationCases = [
  { id: 'JY-01', title: '某村主任违规出租集体资产给亲属', lesson: '集体资产不是“自留地”，权力运行必须经过民主程序', fact: '某村主任未经村民代表会议，以明显低于市场价的租金将集体场地出租给亲属经营的企业，且租金长期未收齐。', result: '党内严重警告', area: '三资管理' },
  { id: 'JY-02', title: '某村会计虚报亲属补助资金', lesson: '惠民资金是群众的“救命钱”，伸手必被捉', fact: '某村会计将不符合条件的亲属列入补助名单，虚报冒领补助资金八千元，公示仅两天即撤下。', result: '党内严重警告，资金收缴', area: '惠民资金' },
  { id: 'JY-03', title: '某站所长办事吃拿卡要', lesson: '“微权力”也要关进制度笼子', fact: '某镇站所负责人在办理补贴审核时多次暗示群众宴请、送烟酒，不送就拖着不办。', result: '党内警告，调整岗位', area: '作风建设' },
  { id: 'JY-04', title: '某单位拆分发票报销餐费', lesson: '纠“四风”必须常抓不懈', fact: '某单位同日在同一酒楼开具三张略低于一千元的餐饮发票，规避审批报销。', result: '责令退赔，相关责任人诫勉', area: '八项规定' },
]

export interface Post { id: string; platform: '本地论坛' | '政务留言板' | '短视频评论' | '社区群（授权采集）'; time: string; town: string; text: string; heat: number }
export const posts: Post[] = [
  { id: 'P01', platform: '政务留言板', time: '2026-11-01 08:20', town: 'baita', text: '乡镇I农业服务站办个农机补贴要跑好几趟，工作人员态度很差，说话阴阳怪气。', heat: 86 },
  { id: 'P02', platform: '本地论坛', time: '2026-11-01 19:42', town: 'baita', text: '同问，乡镇I服务站办事慢，暗示要请吃饭，不然就说材料不全。', heat: 132 },
  { id: 'P03', platform: '短视频评论', time: '2026-11-02 12:05', town: 'baita', text: '服务站那个站长办事拖拉，群众怨气大，希望纪委管一管。', heat: 210 },
  { id: 'P04', platform: '政务留言板', time: '2026-11-03 09:16', town: 'baita', text: '乡镇I农机补贴审核拖了两个月还没批，到底卡在哪里？', heat: 64 },
  { id: 'P05', platform: '社区群（授权采集）', time: '2026-11-04 21:30', town: 'baita', text: '去服务站办事，工作人员上班时间玩手机，问啥都说不知道。', heat: 45 },
  { id: 'P06', platform: '本地论坛', time: '2026-10-29 10:11', town: 'qinghe', text: '和盛村那块集体场地租给谁了？一年才三万多，周边都六万，村里也不公开。', heat: 158 },
  { id: 'P07', platform: '政务留言板', time: '2026-10-30 16:48', town: 'qinghe', text: '建议乡镇G公开村集体资产出租合同，让村民知道钱去哪了。', heat: 77 },
  { id: 'P08', platform: '短视频评论', time: '2026-11-02 20:03', town: 'qinghe', text: '村里集体资产出租都是干部说了算，从来不开会。', heat: 96 },
  { id: 'P09', platform: '政务留言板', time: '2026-11-01 11:22', town: 'chengdong', text: '运河社区路灯坏了半个月没人修，晚上出门不安全。', heat: 58 },
  { id: 'P10', platform: '本地论坛', time: '2026-11-03 18:09', town: 'chengdong', text: '东关社区老旧小区改造说了两年了，什么时候开工？', heat: 71 },
  { id: 'P11', platform: '政务留言板', time: '2026-11-04 07:55', town: 'chengdong', text: '乡镇C垃圾清运不及时，小区门口堆了好几天。', heat: 43 },
  { id: 'P12', platform: '短视频评论', time: '2026-11-02 13:40', town: 'liuwan', text: '柳湾村低保名单没公示就定了，真正困难的没评上。', heat: 119 },
  { id: 'P13', platform: '本地论坛', time: '2026-11-03 22:14', town: 'liuwan', text: '低保评定应该公开透明，不能干部亲戚优先。', heat: 88 },
  { id: 'P14', platform: '社区群（授权采集）', time: '2026-11-04 09:02', town: 'liuwan', text: '柳湾村评低保都不开评议会，名单哪来的？', heat: 52 },
  { id: 'P15', platform: '政务留言板', time: '2026-10-28 15:30', town: 'donghe', text: '东河村干部经常在镇上饭店吃饭，花的是不是村里的钱？', heat: 101 },
  { id: 'P16', platform: '本地论坛', time: '2026-11-02 08:46', town: 'xilin', text: '乡镇D今年的桃子丰收了，欢迎大家来采摘。', heat: 35 },
  { id: 'P17', platform: '短视频评论', time: '2026-11-03 17:12', town: 'xinqiao', text: '新桥村去年修的路已经裂了，质量太差，谁验收的？', heat: 140 },
  { id: 'P18', platform: '政务留言板', time: '2026-11-04 14:27', town: 'xinqiao', text: '乡镇J几个村工程都是同一家公司做的，正常吗？', heat: 93 },
]
