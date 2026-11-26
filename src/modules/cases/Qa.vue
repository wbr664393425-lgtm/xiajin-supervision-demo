<script setup lang="ts">
import { computed, nextTick, onActivated, ref } from 'vue'
import { useRoute } from 'vue-router'
import { BookOpenCheck, Send, Library, MessageCircleQuestion } from 'lucide-vue-next'
import { UiCard, UiTag, AiNotice, UiEmpty } from '@/design/ui'
import { useCasesStore } from '@/stores/cases'
import { useSystemStore } from '@/stores/system'
import { kbSearch, composeAnswer } from '@/engines/cases'
import { kbSuggestions } from '@/mock/cases'
import { useAssistantStore } from '@/stores/assistant'
import { streamChat } from '@/app/llm'
import { SYSTEM_PROMPT, buildUserPrompt, boundaryCheck } from '@/engines/prompts'
import { normalizeOutput, splitCites, splitSections } from '@/engines/assistant'

const store = useCasesStore(), system = useSystemStore(), route = useRoute(), assistant = useAssistantStore()
const q = ref(''), thinking = ref(false), selected = ref<string | null>(null), cite = ref<number | null>(null)
const thread = ref<HTMLElement>()
const answers = computed(() => store.qa.map(item => { const hits = kbSearch(item.q, store.kb); return { ...item, hits, ans: composeAnswer(item.q, hits), sections: item.llm ? splitSections(item.llm).filter(s => s.title !== '使用提醒') : [] } }))
const streaming = ref('')
const scrollEnd = async () => { await nextTick(); thread.value?.scrollTo({ top: thread.value.scrollHeight }) }
const current = computed(() => answers.value.find(a => a.id === selected.value) || answers.value.at(-1))
async function ask(text = q.value) {
  const query = text.trim(); if (!query || thinking.value) return
  q.value = ''; thinking.value = true
  const useLlm = assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline'
  if (!useLlm) await new Promise(r => setTimeout(r, 650))
  const id = store.ask(query); selected.value = id; cite.value = null
  const item = store.qa.find(x => x.id === id)!
  item.engine = 'local'
  if (useLlm) {
    // 先检索本地知识库，再由纪检大模型结合检索结果作答并标注引用
    const hits = kbSearch(query, store.kb)
    const refs = hits.map((h, i) => ({ n: i + 1, title: h.entry.title, excerpt: h.entry.content }))
    let out = ''; streaming.value = id
    try {
      for await (const c of streamChat([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildUserPrompt('law', query, refs) }], { maxTokens: 1600 })) {
        if (c.type !== 'content') continue
        out += c.text; item.llm = normalizeOutput(out); thinking.value = false; void scrollEnd()
      }
    } catch (e) { console.warn('[AI] 大模型不可用，已切换离线引擎：', e) }
    streaming.value = ''
    if (out.trim()) {
      const hitsB = boundaryCheck(out)
      item.llm = normalizeOutput(out) + (hitsB.length ? `\n\n边界提醒\n检测到可能属于定性或量纪的表述：${hitsB.join('、')}。请工作人员删改。` : '')
      item.engine = 'llm'; assistant.status = 'online'
    } else { delete item.llm; assistant.status = 'offline' }
  }
  thinking.value = false
  system.log('cases', '查询', query.slice(0, 30), item.engine === 'llm' ? '法规知识库检索 + 纪检大模型问答' : '法规知识库检索问答')
  await nextTick(); thread.value?.scrollTo({ top: thread.value.scrollHeight, behavior: 'smooth' })
}
onActivated(() => { const pre = String(route.query.q || ''); if (pre && !store.qa.some(x => x.q === pre)) void ask(pre) })
</script>
<template>
  <div class="qa-grid">
    <UiCard :icon="MessageCircleQuestion" title="纪检法规智能问答" subtitle="私有化知识库 · 党纪条规要点、工作指引、本地规范、典型案例" class="chat">
      <div ref="thread" class="thread scroll-thin">
        <UiEmpty v-if="!answers.length && !thinking" :icon="BookOpenCheck" title="用自然语言提问" text="检索结果附引用来源，仅作参考，不替代审理定性。">
          <div class="sugs"><button v-for="s in kbSuggestions" :key="s" @click="ask(s)">{{ s }}</button></div>
        </UiEmpty>
        <template v-for="a in answers" :key="a.id">
          <div class="q"><span>{{ a.q }}</span></div>
          <article class="a" :class="{ on: current?.id === a.id }" @click="selected = a.id">
            <template v-if="a.sections.length">
              <div v-for="(sec, si) in a.sections" :key="si" class="sec"><h5>{{ sec.title.replace(/\s*\[\d+\]/g, '') }}</h5><p><template v-for="(p, j) in splitCites(sec.body)" :key="j"><button v-if="'cite' in p" class="cite" @click.stop="selected = a.id; cite = p.cite">{{ p.cite }}</button><template v-else>{{ p.text }}</template></template><i v-if="streaming === a.id && si === a.sections.length - 1" class="caret" /></p></div>
              <small class="eng">纪检大模型 · 结合知识库 {{ a.hits.length }} 条资料作答</small>
            </template>
            <template v-else-if="streaming !== a.id">
            <p class="lead">{{ a.ans.lead }}</p>
            <ol v-if="a.ans.points.length" class="points"><li v-for="p in a.ans.points" :key="p.cite">{{ p.text }}<button class="cite" @click.stop="selected = a.id; cite = p.cite">{{ p.cite }}</button></li></ol>
            <template v-if="a.ans.checks.length"><h5>核查提示</h5><ul class="checks"><li v-for="c in a.ans.checks" :key="c">{{ c }}</li></ul></template>
            </template>
            <AiNotice text="检索参考，不替代审理定性；正式引用请以现行有效的权威文本为准。" />
          </article>
        </template>
        <div v-if="thinking" class="a thinking"><i /><i /><i /><span>正在检索知识库并组织回答…</span></div>
      </div>
      <div class="composer"><textarea v-model="q" rows="1" placeholder="例如：拆分发票报销餐费怎么认定？（回车发送）" aria-label="提问" @keydown.enter.exact.prevent="ask()" /><button class="send" :disabled="!q.trim() || thinking" aria-label="发送" @click="ask()"><Send :size="16" /></button></div>
    </UiCard>
    <UiCard :icon="Library" title="引用来源" :subtitle="current ? `命中 ${current.hits.length} 条` : '提问后显示'">
      <UiEmpty v-if="!current?.hits.length" title="暂无引用" />
      <ol class="sources"><li v-for="(h, i) in current?.hits" :key="h.entry.id" :class="{ on: cite === i + 1 }"><div class="sh"><span class="cite static">{{ i + 1 }}</span><UiTag size="sm" :tone="h.entry.type === '典型案例' ? 'blue' : h.entry.type === '本地规范' ? 'green' : 'gold'">{{ h.entry.type }}</UiTag><small>{{ i === 0 || h.score >= (current!.hits[0]!.score * .6) ? '高度相关' : '相关' }}</small></div><strong>{{ h.entry.title }}</strong><p>{{ h.entry.content }}</p><small class="src">{{ h.entry.source }} · 命中：{{ h.matched.slice(0, 6).join(' ') }}</small></li></ol>
    </UiCard>
  </div>
</template>
<style scoped>
.qa-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px;align-items:start}
.chat :deep(.ui-card-body){display:flex;flex-direction:column;height:calc(100vh - 250px);min-height:520px}
.thread{flex:1;overflow:auto;display:flex;flex-direction:column;gap:12px;padding-right:4px}
.sugs{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}
.sugs button{padding:6px 12px;border-radius:16px;border:1px solid var(--line-2);font-size:13px;background:var(--surface)}
.sugs button:hover{border-color:var(--red);color:var(--red)}
.q{display:flex;justify-content:flex-end}
.q span{max-width:80%;background:var(--red);color:#fff;padding:9px 14px;border-radius:14px 14px 4px 14px;font-size:14px;line-height:1.7}
.a{background:var(--surface-2);border:1px solid var(--line);border-radius:4px 14px 14px 14px;padding:14px 16px;cursor:pointer;animation:rise var(--dur) var(--ease)}
.a.on{border-color:var(--red-line)}
.lead{font-size:14px;margin-bottom:8px}
.points{list-style:decimal;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.8;margin-bottom:8px}
h5{font-size:13px;color:var(--text-3);margin:8px 0 4px}
.checks{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.checks li{font-size:13px;color:var(--text-2);padding-left:12px;position:relative}
.checks li::before{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:var(--gold)}
.cite{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;margin-left:4px;border-radius:4px;background:var(--red-50);color:var(--red);font-size:11px;font-weight:700;vertical-align:2px}
.cite.static{margin:0}
.sec h5{font-size:14px;color:var(--text);margin:10px 0 2px}
.sec:first-child h5{margin-top:0}
.sec p{font-size:14px;line-height:1.85;white-space:pre-line;color:var(--text-2)}
.eng{display:block;font-size:12px;color:var(--ok);margin:8px 0 4px}
.caret{display:inline-block;width:2px;height:15px;background:var(--red);margin-left:2px;vertical-align:-2px;animation:blink 1s infinite}
.thinking{display:flex;align-items:center;gap:5px;color:var(--text-3);font-size:13px;cursor:default}
.thinking i{width:6px;height:6px;border-radius:50%;background:var(--red);animation:blink 1s infinite}
.thinking i:nth-child(2){animation-delay:.15s}.thinking i:nth-child(3){animation-delay:.3s}
@keyframes blink{50%{opacity:.2}}
.composer{display:flex;gap:8px;align-items:flex-end;margin-top:12px;padding:8px 8px 8px 14px;border:1px solid var(--line-2);border-radius:14px;background:var(--surface);box-shadow:var(--shadow-1)}
.composer:focus-within{border-color:var(--red)}
.composer textarea{flex:1;border:0;outline:0;resize:none;font-size:14px;line-height:1.6;padding:6px 0;min-height:34px;max-height:120px;background:none}
.send{width:36px;height:36px;border-radius:10px;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center}
.send:disabled{background:var(--surface-3);color:var(--text-4)}
.sources{display:flex;flex-direction:column;gap:10px}
.sources li{padding:12px 14px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);transition:all var(--dur)}
.sources li.on{border-color:var(--red);background:var(--red-25)}
.sh{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.sh small{margin-left:auto;font-size:12px;color:var(--text-3)}
.sources strong{display:block;font-size:14px;margin-bottom:4px}
.sources p{font-size:13px;line-height:1.8;color:var(--text-2);font-family:var(--font-serif)}
.src{display:block;font-size:12px;color:var(--text-3);margin-top:6px}
@media(max-width:1200px){.qa-grid{grid-template-columns:1fr}}
</style>
