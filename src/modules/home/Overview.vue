<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Sparkles, UserCheck, ScrollText, Lock, Database, Server, Cpu, ChevronRight } from 'lucide-vue-next'
import { modules, featureCount, type ModuleDef } from '@/app/modules'
import { canVisit, roles } from '@/app/permissions'
import { useSystemStore } from '@/stores/system'
import { integrationGroups } from '@/mock/system'

const system = useSystemStore()
const business = modules.filter(m => m.key !== 'home')
const aiCount = modules.reduce((s, m) => s + m.features.filter(f => f.flow).length, 0)
const dataCount = integrationGroups.slice(0, 2).reduce((s, g) => s + g.items.length, 0)
const by = (g: string) => modules.filter(m => m.group === g)
const count = (list: ModuleDef[]) => list.reduce((s, m) => s + m.features.length, 0)
/** 业务闭环三个阶段，平台支撑与数据底座作为底层 */
const stages = [
  { no: '01', name: '问题发现', note: '信访举报、大数据比对、巡察阅卷三条渠道发现问题线索', mods: by('问题发现') },
  { no: '02', name: '审查审理', note: '银行资金流水穿透、案卷要素抽取到文书证据校验，辅助审查调查与审理', mods: by('审查审理') },
  { no: '03', name: '日常监督', note: '廉政档案、客观标签、警示教育与舆情，前移监督关口', mods: by('日常监督') },
]
const platform = computed(() => [...by('平台支撑'), modules.find(m => m.key === 'home')!])
const dataIcons = [Server, Database, Cpu]
const locked = (m: ModuleDef) => !canVisit(system.role, m.key)
const jump = (no: string) => document.getElementById(`stage-${no}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>
<template>
  <div class="page">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">平台能力全景</span>
        <h2>夏津县纪检监察智能监督与执纪办案一体化平台</h2>
        <p>以纪检大模型和规则引擎为支撑，贯通发现问题、审查审理、日常监督全流程，<br>智能引擎出疑点与初稿，纪检干部作判断与决定。</p>
        <ul class="principles">
          <li><Sparkles :size="14" />智能比对、抽取、起草</li>
          <li><UserCheck :size="14" />定性处置由人决定</li>
          <li><ScrollText :size="14" />全程审计留痕</li>
        </ul>
      </div>
      <div class="hero-nums">
        <div><strong class="num">{{ business.length }}</strong><span>业务模块</span></div>
        <div><strong class="num">{{ featureCount }}</strong><span>项功能</span></div>
        <div><strong class="num">{{ aiCount }}</strong><span>个智能处理环节</span></div>
        <div><strong class="num">{{ dataCount }}</strong><span>类数据对接</span></div>
      </div>
    </section>

    <nav class="loop" aria-label="业务闭环">
      <a v-for="(st, i) in stages" :key="st.no" :href="`#stage-${st.no}`" class="loop-step" @click.prevent="jump(st.no)">
        <b class="num">{{ st.no }}</b>
        <div><strong>{{ st.name }}</strong><span>{{ st.mods.length }} 个模块 · {{ count(st.mods) }} 项功能</span></div>
        <ChevronRight v-if="i < stages.length - 1" :size="22" class="loop-arrow" />
      </a>
    </nav>

    <section v-for="st in stages" :id="`stage-${st.no}`" :key="st.no" class="stage">
      <header class="stage-head">
        <b class="num">{{ st.no }}</b>
        <div><h3>{{ st.name }}</h3><p>{{ st.note }}</p></div>
      </header>
      <div class="mods" :class="`n${st.mods.length}`">
        <article v-for="m in st.mods" :key="m.key" class="mod" :class="{ locked: locked(m) }">
          <RouterLink :to="`/${m.key}`" class="mod-head">
            <span class="mi"><component :is="m.icon" :size="22" /></span>
            <div><h4>{{ m.title }}</h4><small class="num">{{ m.features.length }} 项功能</small></div>
            <span v-if="locked(m)" class="lk" :title="`${roles[system.role].name}无权访问`"><Lock :size="13" />无权限</span>
            <ArrowRight v-else :size="16" class="go" />
          </RouterLink>
          <div class="chips">
            <RouterLink v-for="f in m.features" :key="f.key" :to="`/${m.key}/${f.key}`" class="chip" :data-tip="f.desc">
              <span class="ci"><component :is="f.icon" :size="16" /></span><span class="ct">{{ f.title }}</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <section class="layer platform">
      <header class="layer-head"><h3>平台支撑</h3><p>纪检大模型、多模态识别、权限审计与综合工作台</p></header>
      <div class="layer-body">
        <div v-for="m in platform" :key="m.key" class="pm" :class="{ locked: locked(m) }">
          <RouterLink :to="`/${m.key}`" class="pm-title"><component :is="m.icon" :size="16" />{{ m.title }}</RouterLink>
          <div class="pm-list"><RouterLink v-for="f in m.features" :key="f.key" :to="`/${m.key}/${f.key}`" :data-tip="f.desc" class="pm-item">{{ f.title }}</RouterLink></div>
        </div>
      </div>
    </section>

    <section class="layer data">
      <header class="layer-head"><h3>数据底座</h3><p>业务系统与政务共享数据统一接入；正式部署运行在政务内网，数据不出内网</p><RouterLink to="/system/integration" class="more">对接状态<ArrowRight :size="14" /></RouterLink></header>
      <div class="layer-body">
        <div v-for="(g, i) in integrationGroups" :key="g.title" class="dg">
          <span class="dg-title"><component :is="dataIcons[i]" :size="15" />{{ g.title }}</span>
          <div class="dg-list"><span v-for="it in g.items" :key="it[0]">{{ it[0].replace(/（.*）/, '') }}</span></div>
        </div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.page{display:flex;flex-direction:column;gap:20px}
.hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:24px 40px;flex-wrap:wrap;padding:30px 36px;border-radius:var(--r-lg);background:var(--brand-grad);color:var(--on-brand);box-shadow:var(--shadow-red)}
.hero::before,.hero::after{content:"";position:absolute;border-radius:50%;pointer-events:none;border:1px solid rgba(255,255,255,.14)}
.hero::before{width:420px;height:420px;right:-90px;top:-170px;box-shadow:0 0 0 46px rgba(255,255,255,.04),0 0 0 92px rgba(255,255,255,.03)}
.hero::after{width:180px;height:180px;left:38%;bottom:-120px}
.hero-copy{position:relative;z-index:1;min-width:0;flex:1 1 480px}
.eyebrow{display:inline-block;font-size:12px;letter-spacing:.2em;color:var(--brand-accent-ink);padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.hero h2{font-size:26px;font-weight:700;letter-spacing:.06em;line-height:1.35;margin-top:12px}
.hero-copy>p{font-size:14px;line-height:1.8;opacity:.94;margin-top:8px}
.principles{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.principles li{display:flex;align-items:center;gap:6px;font-size:13px;padding:5px 12px;border-radius:16px;background:rgba(255,255,255,.12);color:var(--brand-accent-ink)}
.hero-nums{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,auto);gap:0;border-radius:var(--r-md);background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.hero-nums div{display:flex;flex-direction:column;align-items:center;padding:18px 24px;min-width:104px}
.hero-nums div+div{border-left:1px solid rgba(255,255,255,.14)}
.hero-nums strong{font-size:42px;line-height:1.05;font-weight:700;color:var(--brand-accent-ink)}
.hero-nums span{font-size:13px;opacity:.94;margin-top:6px;white-space:nowrap}

.loop{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.loop-step{position:relative;display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);transition:border-color var(--dur),transform var(--dur)}
.loop-step:hover{border-color:var(--red-line);transform:translateY(-2px)}
.loop-step>b{font-size:30px;line-height:1;font-weight:700;color:var(--red);opacity:.9}
.loop-step strong{display:block;font-size:16px;font-weight:700}
.loop-step span{font-size:12.5px;color:var(--text-3)}
.loop-arrow{position:absolute;right:-19px;top:50%;transform:translateY(-50%);z-index:1;color:var(--red);background:var(--bg);border-radius:50%;padding:2px;width:26px;height:26px}

.stage{scroll-margin-top:calc(var(--header-h) + 16px)}
.stage-head{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.stage-head>b{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--on-brand);background:var(--brand-grad);box-shadow:var(--shadow-red);flex:none}
.stage-head h3{font-size:18px;font-weight:700;letter-spacing:.04em}
.stage-head p{font-size:13px;color:var(--text-3)}
.mods{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr))}
.mods.n1{grid-template-columns:1fr}
.mods.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.mod{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);overflow:hidden;display:flex;flex-direction:column;transition:box-shadow var(--dur),border-color var(--dur)}
.mod:hover{box-shadow:var(--shadow-2);border-color:var(--red-line)}
.mod.locked{opacity:.55}
.mod-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:var(--panel-head);border-bottom:1px solid var(--line)}
.mod-head>div{flex:1;min-width:0}
.mi{width:44px;height:44px;border-radius:12px;background:var(--surface);color:var(--red);display:flex;align-items:center;justify-content:center;flex:none;box-shadow:var(--shadow-1)}
.mod-head h4{font-size:16px;font-weight:700}
.mod-head small{font-size:12px;color:var(--text-3)}
.go{color:var(--text-4);transition:transform var(--dur),color var(--dur)}
.mod-head:hover .go{color:var(--red);transform:translateX(3px)}
.lk{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-3)}
.chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:14px}
.mods.n1 .chips{grid-template-columns:repeat(5,minmax(0,1fr))}
.mods.n2 .chips{grid-template-columns:repeat(2,minmax(0,1fr))}
.chip{position:relative;display:flex;align-items:center;gap:8px;height:44px;padding:0 10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-size:14px;color:var(--text);transition:background var(--dur),border-color var(--dur),color var(--dur)}
.chip:hover{background:var(--red-25);border-color:var(--red-line);color:var(--red-600)}
.ci{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--red-50);color:var(--red);flex:none}
.ct{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;left:0;bottom:calc(100% + 6px);z-index:20;width:max-content;max-width:260px;padding:6px 10px;border-radius:8px;background:var(--toast-bg);color:#fff;font-size:12px;font-weight:400;line-height:1.5;white-space:normal;pointer-events:none;box-shadow:var(--shadow-2)}

.layer{border-radius:var(--r-lg);padding:16px 20px;display:grid;grid-template-columns:200px minmax(0,1fr);gap:16px 24px;align-items:start}
.layer-head h3{font-size:16px;font-weight:700;letter-spacing:.04em}
.layer-head p{font-size:12.5px;color:var(--text-3);line-height:1.6;margin-top:2px}
.layer-body{display:grid;gap:12px}
.platform{background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold-line)}
.platform .layer-body{grid-template-columns:repeat(3,minmax(0,1fr))}
.pm{background:var(--surface);border-radius:var(--r-md);padding:12px 14px;border:1px solid var(--gold-line)}
.pm.locked{opacity:.55}
.pm-title{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:var(--accent-ink-2);margin-bottom:8px}
.pm-list{display:flex;flex-wrap:wrap;gap:6px}
.pm-item{position:relative;font-size:13px;padding:4px 10px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line);color:var(--text-2)}
.pm-item:hover{color:var(--red);border-color:var(--red-line)}
.data{background:var(--surface);border:1px dashed var(--line-2)}
.data .layer-head .more{display:inline-flex;align-items:center;gap:2px;font-size:13px;color:var(--red);margin-top:6px}
.dg{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;align-items:start}
.dg-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text-2);padding-top:4px}
.dg-list{display:flex;flex-wrap:wrap;gap:6px}
.dg-list span{font-size:12.5px;padding:4px 10px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);color:var(--text-2)}
@media(max-width:1300px){.mods,.mods.n2{grid-template-columns:1fr}.mods.n1 .chips{grid-template-columns:repeat(3,minmax(0,1fr))}.platform .layer-body{grid-template-columns:1fr}.layer{grid-template-columns:1fr}}
</style>
