/** 界面展示用编号：去掉内部规则后缀（如 AS-SZ-HT-2026-018-unpaid → AS-SZ-HT-2026-018），只保留业务编号 */
export const showCode = (id: string) => id.replace(/-[a-z]+(?=-|$)/g, '')
