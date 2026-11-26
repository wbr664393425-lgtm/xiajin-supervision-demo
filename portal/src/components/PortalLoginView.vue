<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, LockKeyhole, ShieldCheck, UserCheck } from 'lucide-vue-next'
import BrandCrest from './BrandCrest.vue'
import { ROLES, TODAY } from '@/domain/mockData'
import { portalState, switchRole } from '@/domain/store'
import type { RoleKey } from '@/domain/types'

const selectedRole = ref<RoleKey>(portalState.role)
const accountInput = ref('xjjw_demo_01')
const codeInput = ref('••••••')

function enterPortal() {
  switchRole(selectedRole.value, true)
}
</script>

<template>
  <main class="login-portal">
    <div class="login-shell">
      <!-- 左侧：庄重文书导览区 -->
      <section class="login-editorial" aria-label="平台定位说明">
        <div class="crest-row">
          <BrandCrest variant="crest" :size="44" />
          <div>
            <p class="eyebrow">政务内网一体化监督工作门户 · 概念演示版</p>
            <h1 class="hero-title font-editorial">夏津县纪检监察智能监督门户</h1>
          </div>
        </div>

        <p class="hero-desc">
          把信访研判、农村三资、惠民资金、招投标与巡察整改统一到一张澄明案头。由本地规则引擎承担「读材料、比流水、标疑点、写初稿」，由纪检干部行使核实、定性与审批把关。
        </p>

        <div class="workflow-strip">
          <div class="wf-step">
            <span class="wf-num">01</span>
            <div>
              <strong>材料与共享库进入</strong>
              <p>来信、12345 工单、三资合同及户籍社保数据同步接入</p>
            </div>
          </div>
          <div class="wf-step">
            <span class="wf-num">02</span>
            <div>
              <strong>规则定位原文与疑点</strong>
              <p>拒绝黑盒评分，每一处提示均可回指原始语句或流水凭证</p>
            </div>
          </div>
          <div class="wf-step">
            <span class="wf-num">03</span>
            <div>
              <strong>人工核定并全程留痕</strong>
              <p>确认、修正、转核查或排除理由全部写入不可篡改审计流</p>
            </div>
          </div>
        </div>

        <footer class="editorial-footer">
          <ShieldCheck :size="15" aria-hidden="true" />
          <span>全站使用虚构乡镇（乡镇A–N）演示样本 · 不作自动违纪定性与量纪</span>
        </footer>
      </section>

      <!-- 右侧：身份选择与认证卡 -->
      <section class="login-card paper-card" aria-labelledby="signin-title">
        <div class="card-head">
          <LockKeyhole :size="18" class="card-icon" aria-hidden="true" />
          <div>
            <h2 id="signin-title">统一工作身份认证</h2>
            <p class="card-sub">基准日期：{{ TODAY }} · 选择演示岗位视角直接进入对应门户</p>
          </div>
        </div>

        <form class="signin-form" @submit.prevent="enterPortal">
          <fieldset class="role-fieldset">
            <legend class="fieldset-legend">选择进入的工作台视角</legend>
            <div class="role-options">
              <label
                v-for="role in ROLES"
                :key="role.key"
                class="role-option"
                :class="{ active: selectedRole === role.key }"
              >
                <input
                  v-model="selectedRole"
                  type="radio"
                  name="portal-role"
                  :value="role.key"
                  class="visually-hidden"
                />
                <div class="role-opt-head">
                  <span class="role-opt-title">{{ role.label }}</span>
                  <span class="role-opt-dept">{{ role.dept }}</span>
                </div>
                <p class="role-opt-desc">{{ role.summary }}</p>
              </label>
            </div>
          </fieldset>

          <div class="cred-grid">
            <div>
              <label for="login-account" class="field-label">演示工号</label>
              <input id="login-account" v-model="accountInput" type="text" autocomplete="username" class="field-input" />
            </div>
            <div>
              <label for="login-pwd" class="field-label">内网口令</label>
              <input id="login-pwd" v-model="codeInput" type="password" autocomplete="current-password" class="field-input" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary enter-btn">
            <UserCheck :size="17" aria-hidden="true" />
            <span>进入监督工作门户</span>
            <ArrowRight :size="16" aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-portal {
  min-block-size: 100dvh;
  display: grid;
  place-items: center;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  background:
    radial-gradient(circle at 12% 14%, rgb(23 63 95 / 0.06), transparent 42%),
    radial-gradient(circle at 88% 85%, rgb(176 46 35 / 0.05), transparent 36%),
    var(--bg-canvas);
}

.login-shell {
  inline-size: min(100%, 1120px);
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  gap: clamp(1.5rem, 3.5vw, 3rem);
  align-items: center;
}

.crest-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--brand-teal);
  margin-block-end: 0.25rem;
}

.hero-title {
  font-size: clamp(1.65rem, 2.8vw, 2.2rem);
  font-weight: 700;
  line-height: 1.25;
  color: var(--ink-primary);
}

.hero-desc {
  margin-block-start: 1.25rem;
  font-size: 1rem;
  line-height: 1.8;
  color: var(--ink-secondary);
}

.workflow-strip {
  margin-block-start: 1.65rem;
  display: grid;
  gap: 0.85rem;
}

.wf-step {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  background: rgb(255 255 255 / 0.72);
  border: 1px solid var(--border-hairline);
}

.wf-num {
  flex: none;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-indigo);
  background: var(--brand-teal-tint);
  padding: 0.2rem 0.45rem;
  border-radius: 5px;
}

.wf-step strong {
  display: block;
  font-size: 0.92rem;
}

.wf-step p {
  font-size: 0.82rem;
  color: var(--ink-muted);
  margin-block-start: 0.15rem;
}

.editorial-footer {
  margin-block-start: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.login-card {
  padding: 1.5rem;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding-block-end: 1rem;
  border-block-end: 1px solid var(--border-hairline);
}

.card-icon {
  color: var(--brand-indigo);
}

.card-head h2 {
  font-size: 1.12rem;
  font-weight: 700;
}

.card-sub {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.signin-form {
  margin-block-start: 1rem;
  display: grid;
  gap: 1rem;
}

.role-fieldset {
  border: 0;
  padding: 0;
  margin: 0;
}

.fieldset-legend {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-block-end: 0.5rem;
}

.role-options {
  display: grid;
  gap: 0.5rem;
}

.role-option {
  display: block;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-hairline);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.role-option:hover {
  border-color: var(--brand-teal-border);
}

.role-option.active {
  background: var(--brand-teal-tint);
  border-color: var(--brand-indigo);
}

.role-opt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.role-opt-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--ink-primary);
}

.role-opt-dept {
  font-size: 0.76rem;
  color: var(--brand-teal);
  font-weight: 600;
}

.role-opt-desc {
  font-size: 0.79rem;
  color: var(--ink-muted);
  margin-block-start: 0.15rem;
}

.cred-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.field-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-block-end: 0.25rem;
}

.field-input {
  inline-size: 100%;
  min-block-size: 38px;
  padding-inline: 0.7rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font-size: 0.88rem;
}

.enter-btn {
  inline-size: 100%;
  min-block-size: 44px;
  font-size: 0.95rem;
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
  }
}
</style>
