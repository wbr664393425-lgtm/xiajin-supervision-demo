<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CheckCircle2, Database, Download, FileSpreadsheet, Trash2, UploadCloud } from 'lucide-vue-next'
import { UiButton, UiModal, UiTag, UiUpload } from '@/design/ui'
import { useBankFlowStore } from '@/stores/bankflow'
import { buildDemoImportFiles } from '@/mock/bankflow'
import { downloadXlsx } from '@/engines/bankflow-xlsx'
import type { BankBatch, ParsedFileInput } from '@/engines/bankflow'
import { toast } from '@/app/toast'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; imported: [batch: BankBatch] }>()

const store = useBankFlowStore()
const form = reactive({ batchName: '', subjectName: '', subjectUnit: '' })
const pendingFiles = ref<{ name: string; size: number; bytes: Uint8Array }[]>([])
const importing = ref(false)
const lastResult = ref<BankBatch | null>(null)
const errorText = ref('')

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const supportedBanks = ['工商银行', '农业银行', '建设银行', '中国银行', '邮储银行', '农商行', '微信支付', '支付宝']

async function onFiles(files: File[]) {
  errorText.value = ''
  lastResult.value = null
  for (const f of files) {
    if (!/\.(xlsx|xls|csv|tsv|txt)$/i.test(f.name)) {
      errorText.value = `文件「${f.name}」格式不受支持，请上传表格明细文件`
      continue
    }
    const buf = new Uint8Array(await f.arrayBuffer())
    if (!pendingFiles.value.some(x => x.name === f.name && x.size === f.size)) {
      pendingFiles.value.push({ name: f.name, size: f.size, bytes: buf })
    }
  }
  if (!form.batchName && pendingFiles.value.length) {
    form.batchName = pendingFiles.value[0]!.name.replace(/\.[^.]+$/, '') + '（清洗核查批次）'
  }
}

function removeFile(idx: number) {
  pendingFiles.value.splice(idx, 1)
}

function loadDemoFiles() {
  errorText.value = ''
  lastResult.value = null
  const enc = new TextEncoder()
  const samples = buildDemoImportFiles()
  pendingFiles.value = samples.map(s => {
    const bytes = enc.encode(s.text)
    return { name: s.fileName, size: bytes.length, bytes }
  })
  form.batchName = '乡镇F交通建设办王某海资金核查批次'
  form.subjectName = '王某海'
  form.subjectUnit = '乡镇F交通建设办'
  toast('已载入建设银行与邮储银行 2 份示例明细（含重复行与多格式日期），可直接执行解析清洗')
}

function downloadTemplate() {
  downloadXlsx('银行流水导入标准模板.xlsx', [
    {
      name: '银行流水明细',
      headers: ['交易时间', '借贷方向', '交易金额', '账户余额', '对方户名', '对方账号', '交易摘要', '交易渠道'],
      rows: [
        ['2026-09-22 15:10:00', '收入', 120000, 185400, '示例建设工程有限公司', '6222****4189', '工程款结算', '企业网银'],
        ['2026-09-22 20:18:00', '支出', 118000, 67400, '张某明', '6228****8024', '资金周转', '手机银行'],
        ['2026-10-10 09:00:00', '收入', 6820, 74220, '县财政统发工资专户', '1612****0001', '10月工资代发', '批量代发'],
      ],
    },
  ])
  toast('已导出标准银行流水模板', 'ok')
}

async function runImport() {
  if (!pendingFiles.value.length) { errorText.value = '请先添加至少一份银行或支付平台流水文件'; return }
  errorText.value = ''
  importing.value = true
  try {
    const inputs: ParsedFileInput[] = pendingFiles.value.map(f => ({ fileName: f.name, bytes: f.bytes }))
    const batch = await store.addImportedBatch(inputs, {
      batchName: form.batchName || `${form.subjectName || '新建'}核查批次`,
      subjectName: form.subjectName || '被核查对象',
      subjectUnit: form.subjectUnit || '所属单位待补录',
    })
    lastResult.value = batch
    emit('imported', batch)
    toast(`导入清洗完成：入库 ${batch.cleanSummary.importedRows} 笔，自动去重 ${batch.cleanSummary.duplicateRows} 笔`, 'ok')
  } catch (err: any) {
    errorText.value = err?.message || '解析流水文件失败，请核对表头是否包含交易时间与金额列'
  } finally {
    importing.value = false
  }
}

function resetState() {
  pendingFiles.value = []
  lastResult.value = null
  form.batchName = ''
  form.subjectName = ''
  form.subjectUnit = ''
  errorText.value = ''
}

function finishAndClose() {
  open.value = false
}

// 无论点击按钮、遮罩还是按 Esc 关闭弹窗，均彻底清理上次清洗报告与暂存文件
watch(open, v => { if (!v) resetState() })

const fmtSize = (b: number) => (b < 1024 ? `${b} 字节` : `${(b / 1024).toFixed(1)} 千字节`)
const fieldLabels: Record<string, string> = {
  time: '交易时间', direction: '借贷方向', amount: '交易金额', income: '收入金额', expense: '支出金额',
  balance: '余额', counterparty: '对方户名', counterpartyAccount: '对方账号', summary: '交易摘要', channel: '交易渠道',
}
</script>

<template>
  <UiModal v-model="open" title="批量导入银行流水并自动清洗" :width="720">
    <div class="imp-body">
      <div class="bank-strip">
        <span class="strip-label">自动适配机构</span>
        <UiTag v-for="b in supportedBanks" :key="b" size="sm" tone="gray">{{ b }}</UiTag>
      </div>

      <div class="form-grid">
        <div>
          <label class="label" for="bf-batch-name">核查批次名称</label>
          <input id="bf-batch-name" v-model="form.batchName" class="input" placeholder="例如：乡镇G农建办资金初核批次" />
        </div>
        <div>
          <label class="label" for="bf-subject">被核查对象姓名</label>
          <input id="bf-subject" v-model="form.subjectName" class="input" placeholder="例如：赵某明" />
        </div>
        <div>
          <label class="label" for="bf-unit">所属单位 / 职务</label>
          <input id="bf-unit" v-model="form.subjectUnit" class="input" placeholder="例如：乡镇G农建办" />
        </div>
      </div>

      <UiUpload
        accept=".xlsx,.xls,.csv,.tsv,.txt"
        multiple
        hint="支持多份主流银行及微信、支付宝导出的表格明细文件，自动识别表头、去重与标准化日期金额"
        @files="onFiles"
      />

      <div class="quick-bar">
        <UiButton size="sm" variant="soft" :icon="Database" @click="loadDemoFiles">一键载入多银行示例明细</UiButton>
        <UiButton size="sm" variant="ghost" :icon="Download" @click="downloadTemplate">下载标准导入模板</UiButton>
        <span class="spacer" />
        <span class="muted num">已选 {{ pendingFiles.length }} 份文件</span>
      </div>

      <ul v-if="pendingFiles.length" class="file-list">
        <li v-for="(f, i) in pendingFiles" :key="f.name + f.size">
          <FileSpreadsheet :size="16" class="f-ic" />
          <span class="f-name">{{ f.name }}</span>
          <span class="muted num f-size">{{ fmtSize(f.size) }}</span>
          <button type="button" class="f-del" aria-label="移除文件" @click="removeFile(i)"><Trash2 :size="14" /></button>
        </li>
      </ul>

      <p v-if="errorText" class="err-box">{{ errorText }}</p>

      <div v-if="lastResult" class="clean-report">
        <div class="cr-head">
          <CheckCircle2 :size="16" />
          <strong>清洗完成：已自动入库并切换至当前批次</strong>
        </div>
        <div class="cr-stats">
          <div><span class="muted">原始记录</span><strong class="num">{{ lastResult.cleanSummary.rawRows }} 笔</strong></div>
          <div><span class="muted">清洗入库</span><strong class="num ok">{{ lastResult.cleanSummary.importedRows }} 笔</strong></div>
          <div><span class="muted">自动去重</span><strong class="num warn">{{ lastResult.cleanSummary.duplicateRows }} 笔</strong></div>
          <div><span class="muted">格式标准化</span><strong class="num">{{ lastResult.cleanSummary.fixedFormatRows }} 笔</strong></div>
        </div>
        <div class="cr-maps">
          <div v-for="m in lastResult.cleanSummary.mappings" :key="m.fileName" class="cr-map-row">
            <div class="cr-map-top">
              <UiTag size="sm" tone="gold">{{ m.bank }}</UiTag>
              <strong>{{ m.fileName }}</strong>
              <span class="muted num">入库 {{ m.keptRows }} / 原始 {{ m.rawRows }}（去重 {{ m.dupRows }}）</span>
            </div>
            <div class="cr-fields">
              <span v-for="(rawCol, key) in m.mapping" :key="key">{{ fieldLabels[key] || key }} ← {{ rawCol }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton @click="finishAndClose">{{ lastResult ? '关闭并查看分析' : '取消' }}</UiButton>
      <UiButton v-if="!lastResult" variant="primary" :icon="UploadCloud" :loading="importing" :disabled="!pendingFiles.length" @click="runImport">
        {{ importing ? '正在清洗与筛查…' : '开始解析清洗' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.imp-body{display:flex;flex-direction:column;gap:14px}
.bank-strip{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line)}
.strip-label{font-size:12px;font-weight:600;color:var(--text-2);margin-right:4px}
.form-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px}
.quick-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}
.file-list{display:flex;flex-direction:column;gap:6px;max-height:150px;overflow:auto}
.file-list li{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);font-size:13px}
.f-ic{color:var(--red);flex:none}
.f-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);font-weight:500}
.f-size{font-size:12px}
.f-del{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-3)}
.f-del:hover{background:var(--risk-high-bg);color:var(--risk-high)}
.err-box{padding:8px 12px;border-radius:var(--r-sm);background:var(--risk-high-bg);color:var(--risk-high);font-size:13px}
.clean-report{padding:12px 14px;border-radius:var(--r-sm);background:var(--ok-bg);border:1px solid var(--ok-line);display:flex;flex-direction:column;gap:10px}
.cr-head{display:flex;align-items:center;gap:6px;color:var(--ok);font-size:14px}
.cr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.cr-stats>div{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-xs);padding:8px 10px}
.cr-stats span{display:block;font-size:12px}
.cr-stats strong{font-size:16px;color:var(--text)}
.cr-stats strong.ok{color:var(--ok)}
.cr-stats strong.warn{color:var(--risk-mid)}
.cr-maps{display:flex;flex-direction:column;gap:8px}
.cr-map-row{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-xs);padding:8px 10px}
.cr-map-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;margin-bottom:6px}
.cr-map-top strong{color:var(--text)}
.cr-fields{display:flex;flex-wrap:wrap;gap:5px}
.cr-fields span{font-size:12px;padding:2px 7px;border-radius:4px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--line)}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}.cr-stats{grid-template-columns:repeat(2,1fr)}}
</style>
