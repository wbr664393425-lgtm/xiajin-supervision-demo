<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Receipt, FileSignature, AudioLines, ScanLine, Play, Pause, Check, ArrowRight, CircleAlert } from 'lucide-vue-next'
import { UiCard, UiButton, UiTabs, UiTag, AiNotice } from '@/design/ui'
import PaperDoc from '@/modules/supervision/parts/PaperDoc.vue'
import { useSystemStore } from '@/stores/system'
import { useQueryTab } from '@/app/useQueryTab'
import { transcriptSample } from '@/engines/assistant'

const system = useSystemStore()
const tab = useQueryTab('kind', 'contract')
type Doc = { title: string; kind: 'invoice' | 'contract' | 'receipt'; stamp: string; lines: string[]; fields: [string, string, number][]; checks?: [string, boolean][]; next: { label: string; to: string } }
const docs: Record<string, Doc> = {
  invoice: { title: '餐饮服务发票', kind: 'invoice', stamp: '发票专用章', lines: ['发票号码：37010092', '销售方：运河人家酒楼', '购买方：县住建局', '项目：餐饮服务', '价税合计：玖佰捌拾元整 ¥980.00', '开票时间：2026年10月17日 22:30'], fields: [['发票号码', '37010092', .99], ['销售方', '运河人家酒楼', .98], ['购买方', '县住建局', .97], ['金额', '980 元', .99], ['开票时间', '2026-10-17 22:30', .94]], checks: [['开票时间在 22 点后，属非工作时段', false], ['同日同店另有 2 张发票', false], ['购买方与报销单位一致', true]], next: { label: '查看公务支出疑点', to: '/supervision/expense' } },
  contract: { title: '集体资产租赁合同', kind: 'contract', stamp: '和盛村村民委员会', lines: ['合同编号：SZ-HT-2026-018', '出租方：乡镇G和盛村村民委员会', '承租方：禾川农机服务社', '租赁标的：村北集体场地 12 亩', '租赁期限：2026年1月1日至2026年12月31日', '年租金：叁万陆仟元整（¥36,000）', '付款方式：2026年6月30日前一次性付清'], fields: [['合同编号', 'SZ-HT-2026-018', .99], ['承租方', '禾川农机服务社', .97], ['年租金', '36,000 元', .98], ['付款期限', '2026-06-30', .95], ['租赁期限', '2026-01-01 至 2026-12-31', .93]], checks: [['台账合同金额一致', true], ['流水已收 12,000 元，差额 24,000 元', false], ['未见村民代表会议记录', false]], next: { label: '查看合同与流水比对', to: '/supervision/assets?view=ledger' } },
  receipt: { title: '收 款 收 据', kind: 'receipt', stamp: '财务专用章', lines: ['今收到：东河种植大户', '交来：2026年度集体耕地承包费（首期）', '金额：捌万元整  ¥80,000.00', '收款方式：银行转账', '日期：2026年3月30日', '收款单位：乡镇F东河村股份经济合作社'], fields: [['付款方', '东河种植大户', .96], ['事由', '2026年度承包费（首期）', .9], ['金额', '80,000 元', .99], ['日期', '2026-03-30', .97]], checks: [['与银行流水 R-05 匹配', true], ['合同年租金 160,000 元，仅收首期', false], ['付款期限 2026-03-31 已过，未见二期', false]], next: { label: '查看三资风险疑点', to: '/supervision/assets' } },
  voucher: { title: '增值税普通发票', kind: 'invoice', stamp: '发票专用章', lines: ['发票号码：FP-37010026', '购买方：乡镇K清源村股份经济合作社', '货物名称：办公用品一批', '价税合计：贰仟叁佰捌拾元整 ¥2,380.00', '开票日期：2026年10月6日'], fields: [['发票号码', 'FP-37010026', .99], ['购买方', '清源村股份经济合作社', .95], ['金额', '2,380 元', .99], ['开票日期', '2026-10-06', .97]], checks: [['该发票号已被凭证 PZ-1001、PZ-1002 引用 2 次', false], ['购买方与入账单位一致', true]], next: { label: '查看重复报账疑点', to: '/supervision/assets' } },
}
const tabs = [{ value: 'contract', label: '合同照片' }, { value: 'receipt', label: '收款收据' }, { value: 'voucher', label: '报账发票' }, { value: 'invoice', label: '餐饮票据' }, { value: 'audio', label: '谈话音频' }]
const doc = computed(() => docs[tab.value])
const state = ref<'idle' | 'scan' | 'done'>('done')
async function parse() { state.value = 'scan'; await new Promise(r => setTimeout(r, 1300)); state.value = 'done'; system.log('assistant', '生成', doc.value?.title || '谈话音频', '多模态一键解析') }
const playing = ref(false), pos = ref(166), shown = ref(transcriptSample.length)
let timer = 0
const bars = Array.from({ length: 64 }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 1.7) * 30 + Math.sin(i * .43) * 16)))
function toggle() { playing.value = !playing.value; clearInterval(timer); if (playing.value && pos.value >= 166) { pos.value = 0; shown.value = 0 } if (playing.value) timer = window.setInterval(() => { pos.value = Math.min(166, pos.value + 2); shown.value = transcriptSample.filter(s => { const [m, sec] = s.t.split(':').map(Number); return m! * 60 + sec! <= pos.value * 0.36 }).length; if (pos.value >= 166) { playing.value = false; clearInterval(timer) } }, 80) }
async function transcribe() { state.value = 'scan'; await new Promise(r => setTimeout(r, 1200)); shown.value = transcriptSample.length; pos.value = 166; state.value = 'done'; system.log('assistant', '生成', '谈话音频', '录音转写与要素提取') }
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
onBeforeUnmount(() => clearInterval(timer))
</script>
<template>
  <div class="page">
    <UiTabs v-model="tab" :items="tabs" @update:model-value="state = 'done'" />
    <div v-if="doc" class="mm-grid">
      <UiCard :icon="doc.kind === 'contract' ? FileSignature : Receipt" :title="doc.title" subtitle="现场拍摄照片">
        <PaperDoc :title="doc.title" :lines="doc.lines" :stamp="doc.stamp" :kind="doc.kind" :scanning="state === 'scan'" />
        <UiButton class="mt" block variant="primary" :icon="ScanLine" :loading="state === 'scan'" @click="parse">{{ state === 'done' ? '重新解析' : '一键解析' }}</UiButton>
      </UiCard>
      <UiCard title="识别结果与台账比对" subtitle="版面识别 + 字段抽取 + 与台账、流水比对">
        <p v-if="state !== 'done'" class="wait muted">{{ state === 'scan' ? '正在识别…' : '点击左侧「一键解析」' }}</p>
        <template v-else>
          <dl class="fields"><div v-for="f in doc.fields" :key="f[0]"><dt>{{ f[0] }}</dt><dd>{{ f[1] }}</dd><span class="num" :class="{ low: f[2] < .95 }">{{ f[2].toFixed(2) }}</span></div></dl>
          <template v-if="doc.checks"><h4>与台账、流水比对</h4><ul class="checks"><li v-for="c in doc.checks" :key="c[0]" :class="{ ok: c[1] }"><component :is="c[1] ? Check : CircleAlert" :size="15" />{{ c[0] }}</li></ul></template>
          <RouterLink :to="doc.next.to" class="next"><span>{{ doc.next.label }}</span><ArrowRight :size="16" /></RouterLink>
          <AiNotice text="置信度低于 0.95 的字段已标出，识别结果须与原件逐项核对后使用。" />
        </template>
      </UiCard>
    </div>
    <div v-else class="mm-grid">
      <UiCard :icon="AudioLines" title="证人刘某谈话录音" subtitle="时长 02:46 · 谈话录音">
        <div class="wave"><i v-for="(h, i) in bars" :key="i" :style="{ height: `${h}px` }" :class="{ past: i / bars.length <= pos / 166 }" /></div>
        <div class="player"><button class="play" :aria-label="playing ? '暂停' : '播放'" @click="toggle"><component :is="playing ? Pause : Play" :size="18" /></button><div class="track"><i :style="{ width: `${(pos / 166) * 100}%` }" /></div><span class="num">{{ fmt(pos) }} / 02:46</span></div>
        <UiButton class="mt" block variant="primary" :icon="AudioLines" :loading="state === 'scan'" @click="transcribe">一键转写并提取要素</UiButton>
      </UiCard>
      <UiCard title="转写文本" :subtitle="`说话人分离 · ${shown}/${transcriptSample.length} 段`">
        <ol class="lines"><li v-for="s in transcriptSample.slice(0, shown)" :key="s.t" :class="{ who: s.who !== '谈话人' }"><span class="num t">{{ s.t }}</span><UiTag size="sm" :tone="s.who === '谈话人' ? 'gray' : 'red'">{{ s.who }}</UiTag><p>{{ s.text }}</p></li></ol>
        <template v-if="state === 'done'"><h4>提取要素</h4><div class="els"><UiTag tone="blue">时间：1月5日 / 去年12月底</UiTag><UiTag tone="red">金额：三万六 / 六万左右</UiTag><UiTag tone="gold">人员：张主任、妻弟</UiTag><UiTag tone="gold" :icon="Check">事由：先签合同后开会</UiTag></div><RouterLink to="/cases/extract?case=AJ-2026-012" class="next"><span>与案卷材料交叉印证</span><ArrowRight :size="16" /></RouterLink></template>
        <AiNotice text="转写文本需与原始录音逐句核对后使用。" />
      </UiCard>
    </div>
  </div>
</template>
<style scoped>
.mm-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.mt{margin-top:16px}
.wait{padding:60px 0;text-align:center}
.fields{margin:0 0 12px;display:flex;flex-direction:column;gap:6px}
.fields div{display:grid;grid-template-columns:90px 1fr 46px;align-items:center;padding:8px 12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line);animation:rise var(--dur) var(--ease) both}
dt{font-size:13px;color:var(--text-3)}
dd{margin:0;font-size:14px;font-weight:600}
.fields span{font-size:12px;color:var(--ok);text-align:right}
.fields span.low{color:var(--risk-mid)}
.next{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:var(--red-25);border:1px solid var(--red-line);color:var(--red);font-size:14px;font-weight:500;margin-bottom:12px}
.next:hover{background:var(--red-50)}
.wave{display:flex;align-items:center;gap:3px;height:90px;padding:0 4px;background:var(--surface-2);border-radius:10px}
.wave i{flex:1;border-radius:2px;background:var(--line-2);transition:background .2s}
.wave i.past{background:var(--red)}
.player{display:flex;align-items:center;gap:12px;margin-top:12px}
.play{width:40px;height:40px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-red)}
.track{flex:1;height:5px;border-radius:3px;background:var(--surface-3);overflow:hidden}
.track i{display:block;height:100%;background:var(--red)}
.player span{font-size:13px;color:var(--text-3)}
.lines{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.lines li{display:grid;grid-template-columns:44px auto 1fr;gap:8px;align-items:flex-start;animation:rise var(--dur) var(--ease) both}
.t{font-size:12px;color:var(--text-3);padding-top:2px}
.lines p{font-size:14px;line-height:1.7}
.lines li.who p{color:var(--text)}
h4{font-size:14px;margin:8px 0}
.checks{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:6px}
.checks li{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--risk-mid)}
.checks li.ok{color:var(--ok)}
.els{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
@media(max-width:1100px){.mm-grid{grid-template-columns:1fr}}
</style>
