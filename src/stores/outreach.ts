import { computed } from 'vue'
import { defineStore } from 'pinia'
import { cadres, posts } from '@/mock/outreach'
import { objectiveTags, clusterPosts } from '@/engines/outreach'
import { useCluesStore } from './clues'
import { useSupervisionStore } from './supervision'
import { registerSearch } from '@/app/search'
import { nowText, persisted } from './persist'

export const useArchiveStore = defineStore('archive', () => {
  const clues = useCluesStore(), sup = useSupervisionStore()
  const summaries = persisted<Record<string, string>>('archive.summaries', () => ({}))
  const opinions = persisted<{ id: string; cadre: string; post: string; time: string; text: string }[]>('archive.opinions', () => [])
  const live = (name: string, town: string, unit: string) => ({ clues: clues.list.filter(c => c.parsed.fields.accused.value.startsWith(name)).length, findings: sup.all.filter(f => f.town === town && (f.subject.includes(unit.replace(/^.+?(镇|乡|街道)/, '')) || f.title.includes(unit.replace(/^.+?(镇|乡|街道)/, '')))).length })
  const list = computed(() => cadres.map(c => ({ ...c, tags: objectiveTags(c, live(c.name, c.town, c.unit)) })))
  registerSearch(() => cadres.map(c => ({ id: c.id, title: `${c.name} · ${c.unit}${c.title}`, type: '廉政档案', to: `/archive/records?id=${c.id}` })))
  return { list, summaries, opinions, addOpinion: (cadre: string, post: string, text: string) => opinions.value.unshift({ id: `LZ-${Date.now().toString(36).toUpperCase()}`, cadre, post, time: nowText(), text }) }
})

export const useOutreachStore = defineStore('outreach', () => {
  const generated = persisted<{ id: string; type: string; title: string; time: string; text: string }[]>('outreach.generated', () => [])
  const alerts = persisted<Record<string, '已转线索' | '持续关注' | '已忽略'>>('outreach.alerts', () => ({}))
  const clusters = computed(() => clusterPosts(posts))
  return { generated, alerts, clusters, posts }
})
