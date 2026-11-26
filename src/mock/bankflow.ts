/**
 * 银行流水智能分析实战演示批次数据
 * 全部人员、单位、企业、账号与金额均为脱敏演示样例，覆盖五大纪检高频查账模型。
 */
import type { BankBatch, BankTransaction, ReviewDecision } from '@/engines/bankflow'

function tx(
  batchId: string,
  index: number,
  data: Omit<BankTransaction, 'id' | 'batchId'>,
): BankTransaction {
  return { id: `${batchId}-${String(index).padStart(4, '0')}`, batchId, ...data }
}

export function seedBankBatches(): BankBatch[] {
  const b1 = 'PC-202611-01'
  const b1Txs: BankTransaction[] = [
    // —— 场景 1：工程承包企业大额转入 + 6 小时内拆分过桥转给特定关系人及理财 ——
    tx(b1, 1, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-09-23 14:18:22', direction: 'in', amount: 180000, balance: 246520,
      counterparty: '夏润建设工程有限公司', counterpartyAccount: '6222****4189',
      counterpartyRelation: '企业', summary: '工程材料垫付款结算', channel: '企业网银转账',
    }),
    tx(b1, 2, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-09-23 19:42:10', direction: 'out', amount: 120000, balance: 126520,
      counterparty: '孙某亮', counterpartyAccount: '6228****8024',
      counterpartyRelation: '关联人', summary: '往来借款归还', channel: '手机银行跨行转账',
    }),
    tx(b1, 3, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-09-23 20:15:36', direction: 'out', amount: 58000, balance: 68520,
      counterparty: '张某霞', counterpartyAccount: '6217****3317',
      counterpartyRelation: '关联人', summary: '代存家用资金', channel: '手机银行转账',
    }),

    // —— 场景 2：春节敏感节点 + 深夜大额快进快出过桥 ——
    tx(b1, 4, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-02-14 23:26:45', direction: 'in', amount: 100000, balance: 138400,
      counterparty: '禾川农机服务社', counterpartyAccount: '6231****5502',
      counterpartyRelation: '企业', summary: '年终分红代转', channel: '农商手机银行',
    }),
    tx(b1, 5, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-02-15 01:12:08', direction: 'out', amount: 98000, balance: 40400,
      counterparty: '孙某亮', counterpartyAccount: '6228****8024',
      counterpartyRelation: '关联人', summary: '春节周转用款', channel: '农商手机银行',
    }),

    // —— 场景 3：化整为零 / 拆分规避（5 日内分 4 笔低于 5 万向同一建材商转入/转出） ——
    tx(b1, 6, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-05-11 10:08:15', direction: 'in', amount: 19000, balance: 95210,
      counterparty: '德盛建材经销部', counterpartyAccount: '6212****7741',
      counterpartyRelation: '企业', summary: '建材回款第一笔', channel: '网银互联',
    }),
    tx(b1, 7, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-05-12 15:34:09', direction: 'in', amount: 19000, balance: 114210,
      counterparty: '德盛建材经销部', counterpartyAccount: '6212****7741',
      counterpartyRelation: '企业', summary: '建材回款第二笔', channel: '网银互联',
    }),
    tx(b1, 8, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-05-14 09:22:41', direction: 'in', amount: 18500, balance: 82900,
      counterparty: '德盛建材经销部', counterpartyAccount: '6212****7741',
      counterpartyRelation: '企业', summary: '货款尾款结算', channel: '跨行快汇',
    }),
    tx(b1, 9, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-05-15 16:47:19', direction: 'in', amount: 19500, balance: 102400,
      counterparty: '德盛建材经销部', counterpartyAccount: '6212****7741',
      counterpartyRelation: '企业', summary: '砂石料差价补款', channel: '跨行快汇',
    }),

    // —— 场景 4：高频重点往来 + 节假日/深夜微信密集小额转移 ——
    tx(b1, 10, {
      bank: '微信支付', sourceFile: '微信支付账单_赵某明_2026.csv',
      time: '2026-09-24 23:48:11', direction: 'in', amount: 16000, balance: 28400,
      counterparty: '刘某波（工程队）', counterpartyAccount: 'WX****9031',
      counterpartyRelation: '个人', summary: '中秋节礼金转账', channel: '微信转账',
    }),
    tx(b1, 11, {
      bank: '微信支付', sourceFile: '微信支付账单_赵某明_2026.csv',
      time: '2026-09-25 00:19:52', direction: 'out', amount: 15000, balance: 13400,
      counterparty: '张某霞', counterpartyAccount: 'WX****4428',
      counterpartyRelation: '关联人', summary: '零钱转存', channel: '微信转账',
    }),
    tx(b1, 12, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-06-18 11:05:30', direction: 'in', amount: 30000, balance: 141200,
      counterparty: '夏润建设工程有限公司', counterpartyAccount: '6222****4189',
      counterpartyRelation: '企业', summary: '项目协调咨询费', channel: '企业网银转账',
    }),
    tx(b1, 13, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-07-09 16:28:14', direction: 'in', amount: 45000, balance: 173200,
      counterparty: '夏润建设工程有限公司', counterpartyAccount: '6222****4189',
      counterpartyRelation: '企业', summary: '设备租赁往来款', channel: '企业网银转账',
    }),
    tx(b1, 14, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-08-19 15:11:03', direction: 'in', amount: 60000, balance: 215800,
      counterparty: '夏润建设工程有限公司', counterpartyAccount: '6222****4189',
      counterpartyRelation: '企业', summary: '阶段结算款', channel: '企业网银转账',
    }),
    tx(b1, 15, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-08-20 08:40:27', direction: 'out', amount: 60000, balance: 155800,
      counterparty: '孙某亮', counterpartyAccount: '6228****8024',
      counterpartyRelation: '关联人', summary: '转存购车尾款', channel: '手机银行跨行转账',
    }),

    // —— 场景 5：大额整存整取 / 现金存取与异常转出 ——
    tx(b1, 16, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-04-06 10:15:00', direction: 'out', amount: 50000, balance: 52400,
      counterparty: '柜面现金支取', counterpartyAccount: '网点柜面',
      counterpartyRelation: '个人', summary: '柜面大额整数取现', channel: '网点柜面现金',
    }),
    tx(b1, 17, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-10-02 23:14:29', direction: 'out', amount: 35000, balance: 33520,
      counterparty: '金鼎烟酒商行', counterpartyAccount: '6226****6190',
      counterpartyRelation: '企业', summary: '国庆节礼采购结算', channel: '手机银行转账',
    }),
    tx(b1, 18, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-03-19 14:52:08', direction: 'in', amount: 25000, balance: 79400,
      counterparty: '禾川农机服务社', counterpartyAccount: '6231****5502',
      counterpartyRelation: '企业', summary: '农机补贴代办费', channel: '农商手机银行',
    }),
    tx(b1, 19, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-06-20 23:55:18', direction: 'out', amount: 20000, balance: 121200,
      counterparty: '孙某亮', counterpartyAccount: '6228****8024',
      counterpartyRelation: '关联人', summary: '端午节前转款', channel: '手机银行跨行转账',
    }),
    tx(b1, 20, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-07-12 09:30:44', direction: 'out', amount: 40000, balance: 133200,
      counterparty: '瑞丰房地产置业有限公司', counterpartyAccount: '6225****1198',
      counterpartyRelation: '企业', summary: '车位定金代付', channel: '网银转账',
    }),
    tx(b1, 21, {
      bank: '微信支付', sourceFile: '微信支付账单_赵某明_2026.csv',
      time: '2026-02-11 23:08:33', direction: 'in', amount: 8000, balance: 21800,
      counterparty: '刘某波（工程队）', counterpartyAccount: 'WX****9031',
      counterpartyRelation: '个人', summary: '拜年红包', channel: '微信转账',
    }),
    tx(b1, 22, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-08-03 10:42:17', direction: 'in', amount: 20000, balance: 155800,
      counterparty: '刘某波（工程队）', counterpartyAccount: '6217****9031',
      counterpartyRelation: '个人', summary: '往来款项', channel: '手机银行转账',
    }),
    tx(b1, 23, {
      bank: '农商行', sourceFile: '山东农商行明细_赵某明_202601-10.csv',
      time: '2026-09-12 17:06:51', direction: 'in', amount: 38000, balance: 106520,
      counterparty: '刘某波（工程队）', counterpartyAccount: '6217****9031',
      counterpartyRelation: '个人', summary: '土方清运费分成', channel: '农商手机银行',
    }),
    tx(b1, 24, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-09-13 08:15:20', direction: 'out', amount: 36500, balance: 70020,
      counterparty: '张某霞', counterpartyAccount: '6217****3317',
      counterpartyRelation: '关联人', summary: '家庭理财认购', channel: '手机银行转账',
    }),
    tx(b1, 25, {
      bank: '微信支付', sourceFile: '微信支付账单_赵某明_2026.csv',
      time: '2026-10-04 01:40:12', direction: 'out', amount: 12000, balance: 9400,
      counterparty: '金鼎烟酒商行', counterpartyAccount: 'WX****6190',
      counterpartyRelation: '企业', summary: '高档白酒尾款', channel: '微信扫码支付',
    }),

    // —— 常规对照交易（工资、日常消费、亲属生活费，检验引擎不会误报） ——
    tx(b1, 26, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-10-10 09:00:05', direction: 'in', amount: 6820, balance: 76840,
      counterparty: '县财政统发工资专户', counterpartyAccount: '1612****0001',
      counterpartyRelation: '常规机构', summary: '2026年10月工资代发', channel: '批量代发',
    }),
    tx(b1, 27, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-09-10 09:00:03', direction: 'in', amount: 6820, balance: 113340,
      counterparty: '县财政统发工资专户', counterpartyAccount: '1612****0001',
      counterpartyRelation: '常规机构', summary: '2026年09月工资代发', channel: '批量代发',
    }),
    tx(b1, 28, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-08-10 09:00:08', direction: 'in', amount: 6820, balance: 162620,
      counterparty: '县财政统发工资专户', counterpartyAccount: '1612****0001',
      counterpartyRelation: '常规机构', summary: '2026年08月工资代发', channel: '批量代发',
    }),
    tx(b1, 29, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-07-10 09:00:04', direction: 'in', amount: 6820, balance: 180020,
      counterparty: '县财政统发工资专户', counterpartyAccount: '1612****0001',
      counterpartyRelation: '常规机构', summary: '2026年07月工资代发', channel: '批量代发',
    }),
    tx(b1, 30, {
      bank: '工商银行', sourceFile: '工商银行明细_赵某明_202601-10.xlsx',
      time: '2026-10-15 18:12:40', direction: 'out', amount: 3200, balance: 73640,
      counterparty: '赵某婷（子女）', counterpartyAccount: '6222****1904',
      counterpartyRelation: '亲属', summary: '大学生活费', channel: '手机银行转账',
    }),
    tx(b1, 31, {
      bank: '微信支付', sourceFile: '微信支付账单_赵某明_2026.csv',
      time: '2026-10-18 12:34:19', direction: 'out', amount: 468.5, balance: 8931.5,
      counterparty: '银座商城超市', counterpartyAccount: 'WX****1023',
      counterpartyRelation: '商户', summary: '日用百货采购', channel: '微信扫码支付',
    }),
    tx(b1, 32, {
      bank: '微信支付', sourceFile: '微信支付账单_赵某明_2026.csv',
      time: '2026-10-21 08:15:10', direction: 'out', amount: 320, balance: 8611.5,
      counterparty: '国网山东电力公司', counterpartyAccount: 'WX****0088',
      counterpartyRelation: '常规机构', summary: '家庭电费缴纳', channel: '生活缴费',
    }),
  ]

  const b2 = 'PC-202610-02'
  const b2Txs: BankTransaction[] = [
    tx(b2, 1, {
      bank: '建设银行', sourceFile: '建设银行明细_周某军_2026.xlsx',
      time: '2026-08-05 10:20:11', direction: 'in', amount: 240000, balance: 286400,
      counterparty: '和盛村村级工程专户', counterpartyAccount: '3700****6612',
      counterpartyRelation: '企业', summary: '排水沟整治项目拨款', channel: '对公网银',
    }),
    tx(b2, 2, {
      bank: '建设银行', sourceFile: '建设银行明细_周某军_2026.xlsx',
      time: '2026-08-05 14:45:30', direction: 'out', amount: 235000, balance: 51400,
      counterparty: '韩某强', counterpartyAccount: '6228****3309',
      counterpartyRelation: '关联人', summary: '转付施工承包款', channel: '手机银行转账',
    }),
    tx(b2, 3, {
      bank: '农业银行', sourceFile: '农业银行明细_周某军_2026.csv',
      time: '2026-08-08 09:40:00', direction: 'in', amount: 18000, balance: 42800,
      counterparty: '韩某强', counterpartyAccount: '6228****3309',
      counterpartyRelation: '关联人', summary: '材料返点款', channel: '掌上银行',
    }),
    tx(b2, 4, {
      bank: '农业银行', sourceFile: '农业银行明细_周某军_2026.csv',
      time: '2026-08-10 11:12:45', direction: 'in', amount: 18000, balance: 60800,
      counterparty: '韩某强', counterpartyAccount: '6228****3309',
      counterpartyRelation: '关联人', summary: '机械租赁返还', channel: '掌上银行',
    }),
    tx(b2, 5, {
      bank: '农业银行', sourceFile: '农业银行明细_周某军_2026.csv',
      time: '2026-08-12 16:05:18', direction: 'in', amount: 18000, balance: 78800,
      counterparty: '韩某强', counterpartyAccount: '6228****3309',
      counterpartyRelation: '关联人', summary: '人工费退回', channel: '掌上银行',
    }),
    tx(b2, 6, {
      bank: '支付宝', sourceFile: '支付宝账单_周某军_2026.csv',
      time: '2026-09-24 23:32:10', direction: 'in', amount: 15000, balance: 29500,
      counterparty: '鑫源建材经营部', counterpartyAccount: 'ALI****7715',
      counterpartyRelation: '企业', summary: '中秋节慰问转账', channel: '支付宝转账',
    }),
    tx(b2, 7, {
      bank: '建设银行', sourceFile: '建设银行明细_周某军_2026.xlsx',
      time: '2026-09-26 10:10:00', direction: 'out', amount: 60000, balance: 18800,
      counterparty: '柜面现金支取', counterpartyAccount: '网点柜面',
      counterpartyRelation: '个人', summary: '柜面整数取现', channel: '网点柜面现金',
    }),
    tx(b2, 8, {
      bank: '农业银行', sourceFile: '农业银行明细_周某军_2026.csv',
      time: '2026-09-15 09:05:00', direction: 'in', amount: 4200, balance: 83000,
      counterparty: '乡镇G财政所补贴专户', counterpartyAccount: '3701****2201',
      counterpartyRelation: '常规机构', summary: '村干部月度报酬', channel: '批量代发',
    }),
    tx(b2, 9, {
      bank: '支付宝', sourceFile: '支付宝账单_周某军_2026.csv',
      time: '2026-10-01 00:48:22', direction: 'out', amount: 9600, balance: 19900,
      counterparty: '盛世名烟名酒店', counterpartyAccount: 'ALI****5208',
      counterpartyRelation: '企业', summary: '节假日烟酒采购', channel: '支付宝扫码',
    }),
    tx(b2, 10, {
      bank: '农业银行', sourceFile: '农业银行明细_周某军_2026.csv',
      time: '2026-07-22 15:28:11', direction: 'in', amount: 22000, balance: 24800,
      counterparty: '韩某强', counterpartyAccount: '6228****3309',
      counterpartyRelation: '关联人', summary: '前期垫资款', channel: '掌上银行',
    }),
  ]

  return [
    {
      id: b1,
      name: '乡镇G农建办原负责人赵某明资金初核批次',
      subjectName: '赵某明',
      subjectUnit: '乡镇G农建办（原负责人）',
      importedAt: '2026-11-05 16:20',
      periodStart: '2026-02-11',
      periodEnd: '2026-10-21',
      cleanSummary: {
        fileCount: 3,
        rawRows: 35,
        importedRows: b1Txs.length,
        duplicateRows: 3,
        fixedFormatRows: 11,
        skippedRows: 0,
        banks: ['工商银行', '农商行', '微信支付'],
        mappings: [
          {
            fileName: '工商银行明细_赵某明_202601-10.xlsx',
            bank: '工商银行',
            rawRows: 20,
            keptRows: 18,
            dupRows: 2,
            mapping: { time: '交易时间', direction: '借贷标志', amount: '发生额', balance: '账户余额', counterparty: '对方户名', counterpartyAccount: '对方账号', summary: '交易摘要', channel: '交易渠道' },
          },
          {
            fileName: '山东农商行明细_赵某明_202601-10.csv',
            bank: '农商行',
            rawRows: 9,
            keptRows: 8,
            dupRows: 1,
            mapping: { time: '记账时间', income: '贷方发生额', expense: '借方发生额', balance: '本次余额', counterparty: '对方账户名', counterpartyAccount: '对方账号', summary: '摘要', channel: '交易渠道' },
          },
          {
            fileName: '微信支付账单_赵某明_2026.csv',
            bank: '微信支付',
            rawRows: 6,
            keptRows: 6,
            dupRows: 0,
            mapping: { time: '交易时间', direction: '收/支', amount: '金额(元)', counterparty: '交易对方', summary: '商品说明', channel: '支付方式' },
          },
        ],
      },
      transactions: b1Txs.sort((a, b) => b.time.localeCompare(a.time)),
    },
    {
      id: b2,
      name: '和盛村村级工程款专项穿透核查批次',
      subjectName: '周某军',
      subjectUnit: '乡镇G和盛村村委会',
      importedAt: '2026-10-29 11:05',
      periodStart: '2026-07-22',
      periodEnd: '2026-10-01',
      cleanSummary: {
        fileCount: 3,
        rawRows: 12,
        importedRows: b2Txs.length,
        duplicateRows: 2,
        fixedFormatRows: 4,
        skippedRows: 0,
        banks: ['建设银行', '农业银行', '支付宝'],
        mappings: [
          {
            fileName: '建设银行明细_周某军_2026.xlsx',
            bank: '建设银行',
            rawRows: 4,
            keptRows: 3,
            dupRows: 1,
            mapping: { time: '交易日期', direction: '借贷方向', amount: '交易金额', balance: '余额', counterparty: '对方户名', counterpartyAccount: '对方账号', summary: '摘要', channel: '交易渠道' },
          },
          {
            fileName: '农业银行明细_周某军_2026.csv',
            bank: '农业银行',
            rawRows: 6,
            keptRows: 5,
            dupRows: 1,
            mapping: { time: '交易时间', income: '收入金额', expense: '支出金额', balance: '当前余额', counterparty: '对方名称', counterpartyAccount: '对方卡号', summary: '交易摘要', channel: '交易方式' },
          },
          {
            fileName: '支付宝账单_周某军_2026.csv',
            bank: '支付宝',
            rawRows: 2,
            keptRows: 2,
            dupRows: 0,
            mapping: { time: '交易时间', direction: '收/支', amount: '金额', counterparty: '交易对方', summary: '商品名称', channel: '支付方式' },
          },
        ],
      },
      transactions: b2Txs.sort((a, b) => b.time.localeCompare(a.time)),
    },
  ]
}

export function seedBankDecisions(): Record<string, ReviewDecision> {
  return {
    'PC-202611-01-0001': {
      status: 'focus',
      note: '夏润建设为乡镇G排水项目施工方，转入 18 万元当日即拆转关联人，需结合工程验收凭证谈话核实。',
      by: '监督专员',
      time: '2026-11-06 10:15',
    },
    'PC-202611-01-0004': {
      status: 'focus',
      note: '春节前夕深夜收到农机服务社 10 万元，2 小时内即转出 9.8 万元至孙某亮，高度疑似过桥受贿。',
      by: '监督专员',
      time: '2026-11-06 14:30',
    },
    'PC-202611-01-0016': {
      status: 'pending',
      note: '待核实网点柜面取现用途及去向。',
      by: '监督专员',
      time: '2026-11-06 15:02',
    },
  }
}

/** 生成一份可直接一键模拟导入的真实多银行 CSV 样例文件集合（含重复行与不规范日期金额，便于演示自动清洗效果） */
export function buildDemoImportFiles(): { fileName: string; text: string }[] {
  const ccbCsv = [
    '中国建设银行个人活期账户交易明细清单（查询区间：2026-01-01 至 2026-10-31）',
    '户名：王某海,账号：6217****5821,币种：人民币',
    '交易时间,借贷方向,交易金额,账户余额,对方户名,对方账号,交易摘要,交易渠道',
    '2026/09/22 15:10:00,收入,"150,000.00","182,400.00",鲁北路桥工程有限公司,6222****7011,工程进度协调款,对公网银',
    '2026/09/22 15:10:00,收入,"150,000.00","182,400.00",鲁北路桥工程有限公司,6222****7011,工程进度协调款,对公网银',
    '2026/09/22 20:05:12,支出,"148,000.00","34,400.00",李某东,6228****4192,代存周转资金,手机银行',
    '2026/06/18 23:42:08,收入,"25,000.00","59,400.00",鲁北路桥工程有限公司,6222****7011,端午节前往来款,手机银行',
    '2026/05/03 10:15:00,支出,"19,000.00","40,400.00",恒鑫建材商行,6212****8830,建材货款1,手机银行',
    '2026/05/05 14:22:18,支出,"19,000.00","21,400.00",恒鑫建材商行,6212****8830,建材货款2,手机银行',
    '2026/05/07 16:08:44,支出,"18,000.00","3,400.00",恒鑫建材商行,6212****8830,建材货款3,手机银行',
    '2026/10/10 09:00:00,收入,"7,150.00","41,550.00",县财政统发工资专户,1612****0001,2026年10月工资代发,批量代发',
  ].join('\n')

  const psbcCsv = [
    '中国邮政储蓄银行账户明细对账单',
    '记账时间,贷方发生额,借方发生额,本次余额,对方户名,对方账号,摘要,交易渠道',
    '20260213 231800,60000.00,,84200.00,鲁北路桥工程有限公司,6222****7011,春节过节费,网银转账',
    '20260214 010530,,58000.00,26200.00,李某东,6228****4192,转存亲友账户,手机银行',
    '20260812 103000,30000.00,,56200.00,鲁北路桥工程有限公司,6222****7011,咨询顾问费,网银转账',
    '20261002 232510,,20000.00,36200.00,华泰名酒商行,6226****3105,国庆接待烟酒,手机银行',
  ].join('\n')

  return [
    { fileName: '建设银行流水_王某海_2026.csv', text: ccbCsv },
    { fileName: '邮储银行流水_王某海_2026.csv', text: psbcCsv },
  ]
}
