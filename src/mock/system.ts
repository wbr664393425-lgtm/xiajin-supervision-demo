import type { AuditEntry, VerifyTask } from '@/types'

export function seedTasks(): VerifyTask[] {
  return [
    { id: 'HC-2026-098', title: '核对和盛村场地租赁差额 24,000 元', module: 'supervision', feature: 'assets', sourceId: 'AS-SZ-HT-2026-018-unpaid', sourceLabel: '三资疑点 · 到期未收', level: 'high', assignee: '监督专员', deadline: '2026-11-03', status: '处理中', createdAt: '2026-10-27 09:20' },
    { id: 'HC-2026-099', title: '复核清源村补贴名单重复申领', module: 'supervision', feature: 'subsidy', sourceId: 'SB-multi-BT-001', sourceLabel: '惠民资金疑点', level: 'mid', assignee: '监督专员', deadline: '2026-11-12', status: '处理中', createdAt: '2026-10-30 15:02' },
    { id: 'HC-2026-100', title: '和盛村议事记录程序要素补查', module: 'inspection', feature: 'reading', sourceId: 'XC-legacy-01', sourceLabel: '巡察阅卷疑点', level: 'low', assignee: '巡察专员', deadline: '2026-10-31', status: '已完成', createdAt: '2026-10-20 10:00', completedAt: '2026-10-30 16:40', result: '已调阅原始签到表，补充记录完整。' },
    // 近两个月已办结的历史核查任务
    { id: 'HC-2026-097', title: '乡镇L湖滨村养老补贴重复领取复核', module: 'supervision', feature: 'subsidy', sourceId: 'HIS-097', sourceLabel: '惠民资金疑点 · 一人多领', level: 'mid', assignee: '乡镇L纪委', deadline: '2026-11-18', status: '已完成', createdAt: '2026-11-03 09:41', completedAt: '2026-11-06 16:10', result: '确认重复领取 1,200 元，已全额追回。' },
    { id: 'HC-2026-096', title: '乡镇N槐树村土地流转费收支核对', module: 'supervision', feature: 'assets', sourceId: 'HIS-096', sourceLabel: '三资疑点 · 非对公收款', level: 'mid', assignee: '乡镇N纪委', deadline: '2026-11-12', status: '已完成', createdAt: '2026-10-28 11:08', completedAt: '2026-11-05 10:26', result: '流转费已转入村集体账户，收支已公示。' },
    { id: 'HC-2026-095', title: '信访线索初步核实：乡镇N槐树村土地流转', module: 'clues', feature: 'ledger', sourceId: 'HIS-095', sourceLabel: '信访线索', level: 'mid', assignee: '监督检查室', deadline: '2026-11-07', status: '已完成', createdAt: '2026-10-23 16:30', completedAt: '2026-11-04 15:42', result: '部分属实，已移交属地纪委依规处理。' },
    { id: 'HC-2026-094', title: '乡镇M柳湾村车辆使用情况核实', module: 'supervision', feature: 'expense', sourceId: 'HIS-094', sourceLabel: '公务支出疑点 · 公车使用', level: 'low', assignee: '监督检查室', deadline: '2026-11-05', status: '已完成', createdAt: '2026-10-21 10:52', completedAt: '2026-10-30 09:15', result: '车辆为村集体自有车辆，用途已补登记。' },
    { id: 'HC-2026-093', title: '乡镇H麦香村文化广场工程款支付核查', module: 'supervision', feature: 'procurement', sourceId: 'HIS-093', sourceLabel: '招投标疑点 · 评分异常', level: 'mid', assignee: '乡镇H纪委', deadline: '2026-10-31', status: '已完成', createdAt: '2026-10-16 14:37', completedAt: '2026-10-28 11:30', result: '工程款按进度支付，评分记录已调阅，未见异常。' },
    { id: 'HC-2026-092', title: '乡镇F河湾村议事会议记录补查', module: 'inspection', feature: 'reading', sourceId: 'HIS-092', sourceLabel: '巡察阅卷疑点', level: 'low', assignee: '县委第二巡察组', deadline: '2026-10-28', status: '已完成', createdAt: '2026-10-13 09:20', completedAt: '2026-10-22 16:05', result: '已补充会议签到表，记录完整。' },
    { id: 'HC-2026-091', title: '乡镇E桑园村危房改造补助申报复核', module: 'supervision', feature: 'subsidy', sourceId: 'HIS-091', sourceLabel: '惠民资金疑点 · 重复申领', level: 'mid', assignee: '乡镇E纪委', deadline: '2026-10-25', status: '已完成', createdAt: '2026-10-10 15:16', completedAt: '2026-10-20 10:40', result: '申报材料完整，资格符合，排除疑点。' },
    { id: 'HC-2026-090', title: '乡镇D红杏村白条入账核查', module: 'supervision', feature: 'assets', sourceId: 'HIS-090', sourceLabel: '三资疑点 · 白条入账', level: 'high', assignee: '乡镇D纪委', deadline: '2026-10-23', status: '已完成', createdAt: '2026-10-08 10:03', completedAt: '2026-10-17 17:20', result: '3 张白条已补正规票据，对经办人员批评教育。' },
    { id: 'HC-2026-089', title: '乡镇C运河社区集体房屋租金收缴核对', module: 'supervision', feature: 'assets', sourceId: 'HIS-089', sourceLabel: '三资疑点 · 到期未收', level: 'mid', assignee: '乡镇C纪委', deadline: '2026-10-14', status: '已完成', createdAt: '2026-09-29 16:48', completedAt: '2026-10-12 14:12', result: '租金已足额收缴，补齐收款凭证。' },
    { id: 'HC-2026-088', title: '信访线索初步核实：乡镇C运河社区物业费收支', module: 'clues', feature: 'ledger', sourceId: 'HIS-088', sourceLabel: '信访线索', level: 'low', assignee: '信访室', deadline: '2026-10-10', status: '已完成', createdAt: '2026-09-25 11:22', completedAt: '2026-10-08 09:46', result: '反映问题经核实不属实，已向反映人反馈。' },
    { id: 'HC-2026-087', title: '县农业农村局下乡补助发放核查', module: 'supervision', feature: 'expense', sourceId: 'HIS-087', sourceLabel: '公务支出疑点 · 津补贴', level: 'mid', assignee: '监督检查室', deadline: '2026-10-08', status: '已完成', createdAt: '2026-09-23 14:05', completedAt: '2026-10-05 15:30', result: '补助发放有文件依据，台账已补正。' },
    { id: 'HC-2026-086', title: '乡镇I塔前村低保名单复核', module: 'supervision', feature: 'subsidy', sourceId: 'HIS-086', sourceLabel: '惠民资金疑点 · 资格不符', level: 'mid', assignee: '乡镇I纪委', deadline: '2026-10-06', status: '已完成', createdAt: '2026-09-21 09:30', completedAt: '2026-10-02 10:18', result: '1 户家庭情况变化未及时退出，已督促主管部门整改。' },
    { id: 'HC-2026-085', title: '乡镇J石桥村排水沟工程验收资料核查', module: 'supervision', feature: 'procurement', sourceId: 'HIS-085', sourceLabel: '招投标疑点 · 工期异常', level: 'mid', assignee: '乡镇J纪委', deadline: '2026-10-03', status: '已完成', createdAt: '2026-09-18 15:40', completedAt: '2026-09-29 11:05', result: '验收资料齐全，工期延误原因已书面说明。' },
    { id: 'HC-2026-084', title: '乡镇K水泉村小学校舍闲置情况核实', module: 'supervision', feature: 'assets', sourceId: 'HIS-084', sourceLabel: '三资疑点 · 长期闲置', level: 'low', assignee: '乡镇K纪委', deadline: '2026-09-30', status: '已完成', createdAt: '2026-09-15 10:12', completedAt: '2026-09-24 16:20', result: '已核实，校舍已纳入村集体资产台账并启动公开招租。' },
  ]
}
export function seedAudit(): AuditEntry[] {
  return [
    { id: 'AU-SEED-24', time: '2026-11-06 17:35', role: 'jiandu', user: '监督专员', action: '导出', target: '三资疑点清单', detail: '导出本周三资疑点表格', module: 'supervision' },
    { id: 'AU-SEED-23', time: '2026-11-06 16:10', role: 'jiandu', user: '监督专员', action: '确认', target: 'HC-2026-097', detail: '记录核查结果并办结', module: 'supervision' },
    { id: 'AU-SEED-22', time: '2026-11-06 15:22', role: 'leader', user: '管理员', action: '查看', target: '风险一张图', detail: '查看乡镇G风险详情', module: 'supervision' },
    { id: 'AU-SEED-21', time: '2026-11-06 11:48', role: 'xinfang', user: '信访专员', action: '生成', target: 'XF-2026-0101', detail: '12345 工单解析入库，1 项要素经人工修正', module: 'clues' },
    { id: 'AU-SEED-20', time: '2026-11-06 10:05', role: 'shenli', user: '审理专员', action: '生成', target: 'AJ-2026-009 审理报告', detail: '文书智能校核，发现 2 处问题', module: 'cases' },
    { id: 'AU-SEED-19', time: '2026-11-06 09:12', role: 'xuncha', user: '巡察专员', action: '生成', target: '4 份台账', detail: '批量智能阅卷，检出 5 处纸面疑点', module: 'inspection' },
    { id: 'AU-SEED-18', time: '2026-11-05 17:42', role: 'jiandu', user: '监督专员', action: '导出', target: '10月监督分析月报', detail: '按领域导出 网页版月报', module: 'supervision' },
    { id: 'AU-SEED-17', time: '2026-11-05 16:10', role: 'xinfang', user: '信访专员', action: '查看', target: 'XF-2026-0108', detail: '查看线索原文与解析结果', module: 'clues' },
    { id: 'AU-SEED-16', time: '2026-11-05 15:02', role: 'leader', user: '管理员', action: '生成', target: '纪检助手 · 法规查询', detail: '纪检大模型生成', module: 'assistant' },
    { id: 'AU-SEED-15', time: '2026-11-05 14:20', role: 'xinfang', user: '信访专员', action: '确认', target: 'XF-2026-0104 / XF-2026-0105', detail: '人工判定：关联（同一反映人）', module: 'clues' },
    { id: 'AU-SEED-14', time: '2026-11-05 11:36', role: 'shenli', user: '审理专员', action: '查询', target: '处分决定书制作要点', detail: '法规知识库检索问答', module: 'cases' },
    { id: 'AU-SEED-13', time: '2026-11-05 10:08', role: 'jiandu', user: '监督专员', action: '确认', target: 'HC-2026-096', detail: '记录核查结果并办结', module: 'supervision' },
    { id: 'AU-SEED-12', time: '2026-11-05 09:01', role: 'leader', user: '管理员', action: '登录', target: '委领导 / 管理员', detail: '进入系统', module: 'system' },
    { id: 'AU-SEED-11', time: '2026-11-04 16:55', role: 'xuncha', user: '巡察专员', action: '生成', target: '巡察报告初稿', detail: '问题归类提炼生成报告初稿', module: 'inspection' },
    { id: 'AU-SEED-10', time: '2026-11-04 15:42', role: 'jiandu', user: '监督专员', action: '确认', target: 'HC-2026-095', detail: '记录核查结果并办结', module: 'clues' },
    { id: 'AU-SEED-9', time: '2026-11-04 11:20', role: 'xinfang', user: '信访专员', action: '流转', target: 'XF-2026-0110', detail: '推进至「分办交办」', module: 'clues' },
    { id: 'AU-SEED-8', time: '2026-11-04 09:33', role: 'jiandu', user: '监督专员', action: '查看', target: '鑫路建设', detail: '在关联图谱中查看节点关系', module: 'clues' },
    { id: 'AU-SEED-7', time: '2026-11-03 17:08', role: 'leader', user: '管理员', action: '导出', target: '审计日志', detail: '导出 10 月审计日志表格', module: 'system' },
    { id: 'AU-SEED-6', time: '2026-11-03 15:26', role: 'shenli', user: '审理专员', action: '生成', target: 'AJ-2026-012 证据链', detail: '证据链校验，提示 4 项缺失', module: 'cases' },
    { id: 'AU-SEED-5', time: '2026-11-03 09:41', role: 'jiandu', user: '监督专员', action: '流转', target: 'HC-2026-097', detail: '人工确认疑点并生成核查任务', module: 'supervision' },
    { id: 'AU-SEED-4', time: '2026-11-02 10:15', role: 'xuncha', user: '巡察专员', action: '确认', target: 'ZG-03', detail: '整改材料人工复核', module: 'inspection' },
    { id: 'AU-SEED-3', time: '2026-10-31 16:40', role: 'leader', user: '管理员', action: '生成', target: '警示教育通报', detail: '结合 2 个本地案例生成廉政素材初稿', module: 'archive' },
    { id: 'AU-SEED-2', time: '2026-10-30 14:12', role: 'jiandu', user: '监督专员', action: '生成', target: '票据合同识别', detail: '票据/合同 文字识别并与台账比对', module: 'supervision' },
    { id: 'AU-SEED-1', time: '2026-10-29 10:26', role: 'xinfang', user: '信访专员', action: '查询', target: '乡镇L', detail: '全局检索', module: 'clues' },
  ]
}

/** 数据对接清单：名称、对接状态、用途。安全与管控 › 数据对接、能力全景共用 */
export const integrationGroups: { title: string; items: [string, string, string][] }[] = [
  { title: '纪检业务系统', items: [['纪检监察业务系统（线索、案件）', '预留接口', '线索登记、案件卷宗双向同步'], ['巡察工作平台', '预留接口', '巡察台账、反馈问题、整改台账'], ['信访业务系统', '样例数据', '来信、来访登记'], ['12345 政务服务热线', '样例数据', '工单转办']] },
  { title: '政务共享数据平台', items: [['人口户籍（死亡、迁出）', '样例数据', '惠民资金比对'], ['社保与医保参保', '样例数据', '资格比对'], ['耕地确权与流转', '样例数据', '耕地补贴比对'], ['农村三资监管平台', '样例数据', '合同、流水、资产台账'], ['公共资源交易平台', '样例数据', '招投标与企业登记'], ['财政一体化 / 电子发票', '样例数据', '报销与发票校验'], ['公车管理平台', '样例数据', '定位轨迹与派车单']] },
  { title: '智能能力（私有化）', items: [['大模型服务', '已联调', '问答、摘要、文书生成；正式部署切换为内网私有化模型'], ['文字识别 / 多模态识别', '待部署', '扫描件、票据、合同照片；当前使用样例材料'], ['语音转写', '待部署', '谈话录音；当前使用样例材料'], ['向量知识库', '待部署', '党纪条规、案例；当前为本地知识条目检索']] },
]
