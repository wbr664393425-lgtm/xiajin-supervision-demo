<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff, LockKeyhole, UserRound, ArrowRight, Radar, Scale, ShieldCheck, Sparkles, Check } from 'lucide-vue-next'
import BrandMark from './BrandMark.vue'
import { useSessionStore } from '@/stores/session'
import { useSystemStore } from '@/stores/system'
import { countyOutline, townLayout, MAP_W, MAP_H } from '@/mock/xiajin-map'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()
const username = ref(session.rememberedUsername())
const password = ref('')
const remember = ref(Boolean(username.value))
const showPassword = ref(false)
const accountInput = ref<HTMLInputElement>()
const passwordInput = ref<HTMLInputElement>()
const error = ref('')
const submitting = ref(false)
const invalidField = ref<'account' | 'password'>()
/** 登录成功后的过渡：ok 按钮变为成功态，wipe 从按钮处展开品牌色幕布，随后进入工作台 */
const phase = ref<'' | 'ok' | 'wipe'>('')
const origin = ref('50% 50%')
const submitBtn = ref<HTMLButtonElement>()
const wait = (ms: number) => new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms))

/** 背景线描：夏津县界与演示乡镇点位。 */
const outlinePath = 'M' + countyOutline.map(p => `${p[0]},${p[1]}`).join('L') + 'Z'
const seats = Object.values(townLayout)
const links = seats.flatMap((a, i) => seats.slice(i + 1).filter(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 95).map(b => [a, b] as const))
const highlights = [
  { icon: Radar, title: '问题发现', text: '信访研判、大数据穿透、智能巡察' },
  { icon: Scale, title: '审查审理', text: '要素抽取、文书校核、证据链校验' },
  { icon: Sparkles, title: '纪检智能体', text: '全景研判，引用可溯源' },
]

function clearError() {
  error.value = ''
  invalidField.value = undefined
}
async function submit() {
  if (phase.value || submitting.value) return
  if (!username.value.trim() || !password.value) {
    const missingAccount = !username.value.trim()
    invalidField.value = missingAccount ? 'account' : 'password'
    error.value = missingAccount ? '请输入账号' : '请输入密码'
    const input = missingAccount ? accountInput : passwordInput
    input.value?.focus()
    return
  }
  submitting.value = true
  try {
    if (!await session.signIn(username.value, password.value, remember.value)) {
      invalidField.value = 'password'
      error.value = '账号或密码不正确，请重新输入'
      passwordInput.value?.focus()
      passwordInput.value?.select()
      return
    }
  } catch (err) {
    error.value = err instanceof Error && !(err instanceof TypeError) ? err.message : '连接失败，请稍后重试'
    return
  } finally { submitting.value = false }

  const system = useSystemStore()
  system.role = 'leader'
  system.log('system', '登录', '展示账号', '展示账号登录')
  const b = submitBtn.value?.getBoundingClientRect()
  if (b) origin.value = `${b.left + b.width / 2}px ${b.top + b.height / 2}px`
  phase.value = 'ok'
  await wait(520)
  phase.value = 'wipe'
  await wait(640)
  const next = route.query.redirect
  const target = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
    ? router.resolve(next) : undefined
  const returnTo = target && (target.meta.module || target.name === 'forbidden') ? target.fullPath : '/home/dashboard'
  void router.replace(returnTo)
}
</script>

<template>
  <main class="login" :class="phase && `is-${phase}`">
    <svg class="county" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path :d="outlinePath" class="c-fill" />
      <line v-for="(l, i) in links" :key="i" :x1="l[0][0]" :y1="l[0][1]" :x2="l[1][0]" :y2="l[1][1]" class="c-link" />
      <path :d="outlinePath" class="c-edge" />
      <g v-for="(p, i) in seats" :key="`s${i}`"><circle :cx="p[0]" :cy="p[1]" r="7" class="c-halo" /><circle :cx="p[0]" :cy="p[1]" r="2.6" class="c-dot" /></g>
    </svg>
    <div class="rings" aria-hidden="true" />

    <section class="intro">
      <header class="brand">
        <BrandMark :size="52" />
        <div><strong>夏津县纪检监察</strong><span>夏津县纪委监委</span></div>
      </header>
      <div class="headline">
        <h1>智能监督与执纪办案<br>一体化平台</h1>
        <p>以纪检大模型和规则引擎为支撑，贯通发现问题、审查审理、日常监督全流程。<br>智能引擎出疑点与初稿，纪检干部作判断与决定，全程审计留痕。</p>
      </div>
      <ul class="points">
        <li v-for="h in highlights" :key="h.title"><span class="pi"><component :is="h.icon" :size="18" /></span><div><strong>{{ h.title }}</strong><small>{{ h.text }}</small></div></li>
      </ul>
      <footer class="intro-foot">建议使用新版浏览器，屏幕分辨率 1440×900 及以上</footer>
    </section>

    <section class="panel" aria-labelledby="login-title">
      <form class="card" novalidate @submit.prevent="submit" @input="clearError">
        <div class="card-head">
          <span class="card-badge"><ShieldCheck :size="14" />安全登录</span>
          <h2 id="login-title">欢迎登录</h2>
          <p>请输入账号和密码进入平台</p>
        </div>
        <div class="field">
          <label for="login-account">账号</label>
          <div class="entry" :class="{ invalid: invalidField === 'account' }">
            <UserRound aria-hidden="true" />
            <input id="login-account" ref="accountInput" v-model="username" name="username" autocomplete="username"
              autocapitalize="none" :spellcheck="false" required placeholder="请输入账号"
              :aria-invalid="invalidField === 'account'" :aria-describedby="error ? 'login-error' : undefined">
          </div>
        </div>
        <div class="field">
          <label for="login-password">密码</label>
          <div class="entry" :class="{ invalid: invalidField === 'password' }">
            <LockKeyhole aria-hidden="true" />
            <input id="login-password" ref="passwordInput" v-model="password" name="password" :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password" required placeholder="请输入密码"
              :aria-invalid="invalidField === 'password'" :aria-describedby="error ? 'login-error' : undefined">
            <button class="visibility" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              aria-controls="login-password" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              <component :is="showPassword ? EyeOff : Eye" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p v-if="error" id="login-error" class="error" role="alert">{{ error }}</p>
        <label class="remember">
          <input v-model="remember" type="checkbox" @change="!remember && session.forgetUsername()">
          记住账号
        </label>
        <button ref="submitBtn" class="submit" :class="{ ok: phase }" type="submit" :disabled="Boolean(phase) || submitting">
          <template v-if="phase"><span class="ok-mark"><Check :size="16" :stroke-width="3" aria-hidden="true" /></span>登录成功，正在进入</template>
          <template v-else-if="submitting">正在登录</template>
          <template v-else>登 录<ArrowRight :size="18" aria-hidden="true" /></template>
        </button>
      </form>
    </section>
    <div v-if="phase === 'wipe'" class="wipe" :style="{ '--o': origin }" aria-hidden="true"><BrandMark :size="64" /></div>
  </main>
</template>

<style scoped>
.login{position:relative;overflow:hidden;min-height:100vh;min-height:100svh;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(440px,1fr);background:var(--brand-grad);color:var(--on-brand);color-scheme:light}
.login::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 18% 12%,rgba(255,214,150,.18),transparent 42%),radial-gradient(circle at 70% 110%,rgba(0,0,0,.28),transparent 55%);z-index:0}
.login::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;background-image:radial-gradient(rgba(255,255,255,.22) 1px,transparent 1.2px);background-size:22px 22px;-webkit-mask-image:linear-gradient(100deg,#000 0%,transparent 60%);mask-image:linear-gradient(100deg,#000 0%,transparent 60%);z-index:0}
.county{position:absolute;z-index:0;left:16vw;top:52%;width:min(42vw,760px);transform:translateY(-50%);opacity:.75;pointer-events:none}
.c-fill{fill:rgba(255,230,184,.05)}
.c-edge{fill:none;stroke:rgba(255,214,150,.55);stroke-width:1.4;stroke-linejoin:round}
.c-link{stroke:rgba(255,214,150,.22);stroke-width:.8;stroke-dasharray:2 3}
.c-halo{fill:rgba(255,214,150,.16)}
.c-dot{fill:var(--brand-accent-ink)}
.rings{position:absolute;z-index:0;right:-260px;top:-260px;width:760px;height:760px;border-radius:50%;border:1px solid rgba(255,255,255,.1);box-shadow:0 0 0 70px rgba(255,255,255,.025),0 0 0 140px rgba(255,255,255,.02);pointer-events:none}

.intro{position:relative;z-index:1;display:flex;flex-direction:column;padding:48px 56px 32px 64px;min-width:0}
.brand{display:flex;align-items:center;gap:14px}
.brand strong{display:block;font-size:24px;font-weight:700;letter-spacing:.12em;line-height:1.3}
.brand span{display:block;font-size:13px;letter-spacing:.3em;opacity:.92;margin-top:2px}
.headline{margin-top:auto}
.headline h1{font-size:clamp(38px,3.4vw,58px);line-height:1.22;font-weight:800;letter-spacing:.06em;text-shadow:0 2px 18px rgba(80,0,0,.25)}
.headline p{margin-top:18px;font-size:15px;line-height:1.9;opacity:.92;max-width:560px}
.points{list-style:none;margin:32px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:760px}
.points li{display:flex;align-items:flex-start;gap:10px;padding:14px;border-radius:12px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);backdrop-filter:blur(4px)}
.pi{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none;background:rgba(255,214,150,.18);color:var(--brand-accent-ink)}
.points strong{display:block;font-size:14px;font-weight:600}
.points small{display:block;font-size:12px;opacity:.92;line-height:1.5;margin-top:2px}
.intro-foot{margin-top:auto;padding-top:40px;font-size:12px;opacity:.92;letter-spacing:.04em}

.panel{position:relative;z-index:1;display:grid;place-items:center;padding:40px 56px 40px 24px}
.card{width:min(100%,440px);padding:40px 40px 28px;border-radius:20px;background:rgba(255,255,255,.97);color:#262321;box-shadow:0 30px 80px rgba(60,0,0,.35),0 2px 0 rgba(255,255,255,.6) inset;animation:rise .5s var(--ease) both}
.card-head{margin-bottom:26px}
.card-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--red-600);background:var(--red-50);padding:3px 10px;border-radius:12px}
.card h2{font-size:28px;font-weight:700;letter-spacing:.06em;margin-top:12px;line-height:1.3}
.card-head p{font-size:14px;color:#6B655F;margin-top:4px}
.field+.field{margin-top:18px}
.field>label{display:block;font-size:14px;font-weight:600;color:#4a4440;margin-bottom:8px}
.entry{display:flex;align-items:center;gap:10px;height:50px;padding:0 6px 0 14px;border-radius:11px;background:#f8f5f1;border:1px solid #e9e2d8;color:#9a928a;transition:border-color var(--dur),background var(--dur),box-shadow var(--dur)}
.entry:hover{border-color:#dcd2c4}
.entry:focus-within{background:#fff;border-color:var(--red);box-shadow:0 0 0 4px var(--red-50);color:var(--red)}
.entry.invalid{border-color:var(--red);background:#fff}
.entry>svg,.visibility svg{width:20px;height:20px;stroke-width:1.8;flex:none}
.entry input{flex:1;min-width:0;height:100%;padding:0;border:0;background:transparent;color:#262321;outline:none;font-size:15px}
.entry input::placeholder{color:#776E65}
.visibility{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;color:#9a928a}
.visibility:hover{color:var(--red);background:var(--red-25)}
.login :is(button,input[type="checkbox"]):focus-visible{outline:2px solid var(--red);outline-offset:2px}
.error{margin-top:10px;font-size:13px;color:var(--red-600)}
.remember{display:flex;align-items:center;gap:8px;width:fit-content;margin-top:16px;cursor:pointer;font-size:14px;color:#5b5550}
.remember input{width:16px;height:16px;margin:0;accent-color:var(--red);cursor:pointer}
.submit{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:52px;margin-top:22px;border-radius:11px;background:var(--brand-grad);color:var(--on-brand);font-size:17px;font-weight:700;letter-spacing:.1em;box-shadow:var(--shadow-red);transition:transform var(--dur),box-shadow var(--dur),filter var(--dur)}
.submit:hover{filter:brightness(1.06);transform:translateY(-1px)}
.submit:active{transform:translateY(0)}
.submit svg{transition:transform var(--dur)}
.submit:hover svg{transform:translateX(3px)}
.submit.ok{background:linear-gradient(140deg,#2C7A57,#1F5E42);box-shadow:0 8px 24px rgba(44,122,87,.3);cursor:default;transform:none;filter:none}
.ok-mark{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.22);animation:pop .4s var(--ease) both}
.is-ok .card,.is-wipe .card{transform:translateY(-4px);box-shadow:0 40px 90px rgba(60,0,0,.4)}
.card{transition:transform .5s var(--ease),box-shadow .5s var(--ease),opacity .4s}
.intro,.county{transition:transform .9s var(--ease),opacity .6s}
.is-wipe .intro{opacity:0;transform:translateX(-24px)}
.is-wipe .county{opacity:0}
.is-wipe .card{opacity:0;transform:scale(.96)}
.wipe{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:var(--brand-grad);clip-path:circle(0 at var(--o));animation:wipe .64s cubic-bezier(.7,0,.25,1) forwards}
.wipe svg{opacity:0;animation:mark .5s .25s var(--ease) forwards}
@keyframes wipe{to{clip-path:circle(150vmax at var(--o))}}
@keyframes mark{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
@keyframes pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
@media(prefers-reduced-motion:reduce){.wipe,.wipe svg,.ok-mark,.card{animation:none}.wipe{clip-path:none}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media(max-width:1100px){
  .login{grid-template-columns:1fr}
  .intro{padding:32px 28px 8px}
  .headline{margin-top:28px}
  .points,.intro-foot{display:none}
  .panel{padding:24px 16px 48px}
  .county{left:50%;top:22%;width:120vw;transform:translate(-50%,-40%);opacity:.5}
}
</style>
