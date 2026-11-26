/** 演示乡镇及样例村居。保留既有记录的关联编号，界面与导出统一使用演示名称。 */
export interface Town { id: string; name: string; villages: string[] }
export const towns: Town[] = [
  { id: 'chengxi', name: '乡镇A', villages: ['西关社区', '纺织社区'] },
  { id: 'beichen', name: '乡镇B', villages: ['北辰社区', '花园社区'] },
  { id: 'chengdong', name: '乡镇C', villages: ['东关社区', '运河社区'] },
  { id: 'xilin', name: '乡镇D', villages: ['杏林村', '红杏村'] },
  { id: 'sangyuan', name: '乡镇E', villages: ['桑园村', '椹果村'] },
  { id: 'donghe', name: '乡镇F', villages: ['东河村', '河湾村'] },
  { id: 'qinghe', name: '乡镇G', villages: ['和盛村', '禾丰村', '前屯村'] },
  { id: 'maixiang', name: '乡镇H', villages: ['麦香村', '丰收村'] },
  { id: 'baita', name: '乡镇I', villages: ['白塔村', '塔前村'] },
  { id: 'xinqiao', name: '乡镇J', villages: ['新桥村', '石桥村'] },
  { id: 'qingyuan', name: '乡镇K', villages: ['清源村', '水泉村'] },
  { id: 'baimahu', name: '乡镇L', villages: ['湖滨村', '芦庄村'] },
  { id: 'liuwan', name: '乡镇M', villages: ['柳湾村', '东柳村'] },
  { id: 'tianzhuang', name: '乡镇N', villages: ['田东村', '槐树村'] },
]
export const townName = (id: string) => towns.find(t => t.id === id)?.name || id
export const townOf = (village: string) => towns.find(t => t.villages.includes(village))
