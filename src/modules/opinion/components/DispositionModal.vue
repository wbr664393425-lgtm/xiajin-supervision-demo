<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FilePlus2, ClipboardCheck, ShieldCheck, Archive, Eye } from 'lucide-vue-next'
import { UiModal, UiButton, UiSelect, AiNotice } from '@/design/ui'
import { useOpinionStore, type DispositionAction } from '@/stores/opinion'
import { addDays } from '@/engines/deadline'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const props = defineProps<{ modelValue: boolean; topicId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [action: DispositionAction] }>()

const store = useOpinionStore()
const topic = computed(() => props.topicId ? store.topicById(props.topicId) : undefined)

const mode = ref<DispositionAction>('转问题线索')
const accused = ref('')
const issue = ref('')
const clueContent = ref('')
const assignee = ref('监督检查室')
const deadline = ref(addDays(today(), 10))
const targetName = ref('')
const clarifyScope = ref('书面澄清并在乡镇党委范围通报')
const reasonType = ref('非纪检受理·市政维修与便民诉求')
const note = ref('')

const actions: { key: DispositionAction; label: string; desc: string; icon: any }[] = [
  { key: '转问题线索', label: '拟转问题线索', desc: '预填要素真实入信访线索库', icon: FilePlus2 },
  { key: '交办核查督办', label: '交办核查督办', desc: '生成核查任务进全站待办', icon: ClipboardCheck },
  { key: '建议澄清正名', label: '建议澄清正名', desc: '护航实干干部、直通澄清专报', icon: ShieldCheck },
  { key: '非涉纪归档', label: '非涉纪归档', desc: '必填理由留痕，转民生参考', icon: Archive },
  { key: '持续关注', label: '持续关注', desc: '暂不转办，继续监测发酵动态', icon: Eye },
]

watch(() => [props.modelValue, props.topicId], () => {
  const t = topic.value
  if (!t || !props.modelValue) return
  if (t.category === '涉纪不实传言') mode.value = '建议澄清正名'
  else if (t.category === '非纪检民生') mode.value = '非涉纪归档'
  else if (t.level === 'high') mode.value = '转问题线索'
  else mode.value = '交办核查督办'

  accused.value = t.entities.people[0] || ''
  issue.value = t.category
  clueContent.value = `【涉纪公开舆情转办】${t.townName}${t.village || ''}：${t.title}。${t.summary} 代表性公开原文摘录：“${t.primaryPost.aiQuote}”`
  assignee.value = t.category === '作风效能' ? '党风政风监督室' : '监督检查室'
  deadline.value = addDays(today(), 10)
  targetName.value = t.entities.people[0] || `${t.townName}相关履职干部`
  clarifyScope.value = '书面澄清并在适当范围公布核实情况'
  reasonType.value = '非纪检受理·市政维修与便民诉求'
  note.value = ''
})

const canSubmit = computed(() => {
  if (!topic.value) return false
  if (mode.value === '非涉纪归档') return note.value.trim().length >= 10
  if (mode.value === '建议澄清正名') return targetName.value.trim().length >= 2 && note.value.trim().length >= 8
  if (mode.value === '转问题线索') return clueContent.value.trim().length >= 12
  return true
})

function submit() {
  const t = topic.value
  if (!t || !canSubmit.value) return
  if (mode.value === '转问题线索') {
    const id = store.transferToClue(t.id, {
      accused: accused.value,
      issue: issue.value,
      content: clueContent.value,
      note: note.value,
    })
    if (id) toast(`已真实写入信访线索库（${id}），并记入审计日志`, 'ok', { label: '查看线索台账', to: `/clues/ledger?id=${id}` })
  } else if (mode.value === '交办核查督办') {
    const task = store.createVerifyTask(t.id, { assignee: assignee.value, deadline: deadline.value, note: note.value })
    if (task) toast(`已生成核查任务（${task.id}）并派发至${assignee.value}`, 'ok', { label: '查看核查任务', to: `/home/tasks?id=${task.id}` })
  } else if (mode.value === '建议澄清正名') {
    const id = store.proposeClarification(t.id, { targetName: targetName.value, basis: note.value, scope: clarifyScope.value })
    if (id) toast(`已形成澄清正名建议单（${id}），可前往专报中心生成澄清专报`, 'ok', { label: '查看澄清专报', to: '/opinion/reports?kind=clarify' })
  } else if (mode.value === '非涉纪归档') {
    store.archiveNonDiscipline(t.id, reasonType.value, note.value)
    toast('已按非纪检受理范围归档并留痕审计日志', 'ok')
  } else {
    store.markFollowUp(t.id, note.value)
    toast('已标记持续关注，保留在待研判监测列表', 'ok')
  }
  emit('done', mode.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <UiModal :model-value="modelValue" :title="topic ? `人工分流处置 · ${topic.title}` : '人工分流处置'" :width="620" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="topic" class="dm-wrap">
      <div class="dm-modes">
        <button v-for="a in actions" :key="a.key" type="button" class="dm-card" :class="{ on: mode === a.key }" @click="mode = a.key">
          <component :is="a.icon" :size="16" />
          <strong>{{ a.label }}</strong>
          <small>{{ a.desc }}</small>
        </button>
      </div>

      <template v-if="mode === '转问题线索'">
        <div class="dm-row2">
          <div><label class="label">被反映对象（可空）</label><input v-model="accused" class="input" placeholder="如：张某军" /></div>
          <div><label class="label">涉及领域</label><input v-model="issue" class="input" /></div>
        </div>
        <label class="label mt">转办线索摘要（将直接写入信访线索库，来源标为「舆情转办」）</label>
        <textarea v-model="clueContent" class="textarea" rows="4" />
        <label class="label mt">研判转办说明</label>
        <input v-model="note" class="input" placeholder="简述拟转信访线索核查的理由（选填）" />
      </template>

      <template v-else-if="mode === '交办核查督办'">
        <div class="dm-row2">
          <div>
            <label class="label">承办部门</label>
            <UiSelect v-model="assignee" :options="['监督检查室', '党风政风监督室', '信访室', '属地乡镇纪委', '派驻纪检监察组']" />
          </div>
          <div><label class="label">核查反馈期限</label><input v-model="deadline" type="date" class="input" /></div>
        </div>
        <label class="label mt">核查督办要点</label>
        <textarea v-model="note" class="textarea" rows="3" placeholder="明确重点核查的合同、凭证、公示记录或窗口监控时段" />
      </template>

      <template v-else-if="mode === '建议澄清正名'">
        <div class="dm-row2">
          <div><label class="label">拟澄清对象</label><input v-model="targetName" class="input" /></div>
          <div>
            <label class="label">建议澄清方式</label>
            <UiSelect v-model="clarifyScope" :options="['书面澄清并在适当范围公布核实情况', '会议澄清（乡镇党委扩大会）', '联合宣传部门公开通报澄清']" />
          </div>
        </div>
        <label class="label mt">核实依据与澄清理由（不少于 8 字）</label>
        <textarea v-model="note" class="textarea" rows="3" placeholder="例如：跨库核验廉政档案与经济责任审计均无异常，现场执法公告与目击留言印证网传视频系断章取义。" />
      </template>

      <template v-else-if="mode === '非涉纪归档'">
        <label class="label">归档类别</label>
        <UiSelect v-model="reasonType" :options="['非纪检受理·市政维修与便民诉求', '非纪检受理·政策咨询与建议', '非纪检受理·业务范围内已回应办结', '重复反映·已并入主线办理']" />
        <label class="label mt">不予受理 / 归档理由（必填，不少于 10 字，全程写入审计日志）</label>
        <textarea v-model="note" class="textarea" rows="3" placeholder="说明核判依据及拟转交民生/职能部门参考意见（如：经人工核阅，该话题反映社区路灯维修与改造排期，无涉纪违法指向，转民生服务参考）" />
        <small class="char-tip" :class="{ ok: note.trim().length >= 10 }">当前已输入 {{ note.trim().length }} 字（至少 10 字）</small>
      </template>

      <template v-else>
        <label class="label">持续关注备注</label>
        <textarea v-model="note" class="textarea" rows="3" placeholder="说明后续关注重点及升级研判触发条件" />
      </template>

      <AiNotice text="分流处置决定由纪检监察干部作出并写入审计日志；系统绝不自动立案、不作违纪定性、不执行删帖控评。" />
    </div>

    <template #footer>
      <UiButton @click="emit('update:modelValue', false)">取消</UiButton>
      <UiButton variant="primary" :disabled="!canSubmit" @click="submit">确认提交并留痕</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.dm-wrap{display:flex;flex-direction:column;gap:10px}
.dm-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:4px}
.dm-card{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:10px 11px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);text-align:left;transition:border-color var(--dur),background var(--dur)}
.dm-card:hover{border-color:var(--red-line)}
.dm-card.on{border-color:var(--red);background:var(--red-25);box-shadow:inset 0 0 0 1px var(--red)}
.dm-card svg{color:var(--red)}
.dm-card strong{font-size:13.5px;color:var(--text)}
.dm-card small{font-size:11.5px;color:var(--text-3);line-height:1.4}
.dm-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mt{margin-top:6px}
.char-tip{font-size:12px;color:var(--risk-mid)}
.char-tip.ok{color:var(--ok)}
@media(max-width:600px){.dm-modes{grid-template-columns:1fr 1fr}.dm-row2{grid-template-columns:1fr}}
</style>
