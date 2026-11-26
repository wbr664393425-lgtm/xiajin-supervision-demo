<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
/** 与设计系统一致的下拉框：浮层挂到 body，避免被卡片或弹窗裁切；支持键盘上下选择、回车确认、Esc 关闭。 */
const props = withDefaults(defineProps<{ modelValue: string; options: (string | { value: string; label: string; hint?: string })[]; placeholder?: string; size?: 'sm' | 'md'; label?: string }>(), { size: 'md' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
const opts = computed(() => props.options.map(o => typeof o === 'string' ? { value: o, label: o, hint: '' } : { hint: '', ...o }))
const current = computed(() => opts.value.find(o => o.value === props.modelValue))
const open = ref(false), hover = ref(0), trigger = ref<HTMLButtonElement>(), pos = ref({ left: 0, top: 0, width: 0, up: false })
function place() { const r = trigger.value!.getBoundingClientRect(); const up = window.innerHeight - r.bottom < Math.min(280, opts.value.length * 38 + 12) && r.top > 300; pos.value = { left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: r.width, up } }
async function show() { place(); hover.value = Math.max(0, opts.value.findIndex(o => o.value === props.modelValue)); open.value = true; await nextTick(); window.addEventListener('scroll', hide, true); window.addEventListener('resize', hide) }
function hide() { open.value = false; window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide) }
function pick(v: string) { emit('update:modelValue', v); emit('change', v); hide(); trigger.value?.focus() }
function key(e: KeyboardEvent) {
  if (!open.value && ['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); void show(); return }
  if (!open.value) return
  if (e.key === 'ArrowDown') { e.preventDefault(); hover.value = (hover.value + 1) % opts.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); hover.value = (hover.value - 1 + opts.value.length) % opts.value.length }
  else if (e.key === 'Enter') { e.preventDefault(); pick(opts.value[hover.value]!.value) }
  else if (e.key === 'Escape' || e.key === 'Tab') hide()
}
onBeforeUnmount(hide)
onDeactivated(hide)
</script>
<template>
  <div class="ui-select" :class="[`s-${size}`, { open }]">
    <button ref="trigger" type="button" class="trigger" :aria-label="label" aria-haspopup="listbox" :aria-expanded="open" @click="open ? hide() : show()" @keydown="key">
      <span :class="{ ph: !current }">{{ current?.label || placeholder || '请选择' }}</span><ChevronDown :size="15" class="chev" />
    </button>
    <Teleport to="body">
      <template v-if="open">
        <div class="ui-select-mask" @mousedown="hide" />
        <ul class="ui-select-pop scroll-thin" role="listbox" :class="{ up: pos.up }" :style="{ left: pos.left + 'px', top: pos.top + 'px', minWidth: pos.width + 'px' }">
          <li v-for="(o, i) in opts" :key="o.value" role="option" :aria-selected="o.value === modelValue" :class="{ on: o.value === modelValue, hover: i === hover }" @mouseenter="hover = i" @mousedown.prevent="pick(o.value)">
            <span>{{ o.label }}<small v-if="o.hint">{{ o.hint }}</small></span><Check v-if="o.value === modelValue" :size="14" />
          </li>
        </ul>
      </template>
    </Teleport>
  </div>
</template>
<style scoped>
.ui-select{position:relative;min-width:0}
.trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--text);text-align:left;transition:border-color var(--dur),box-shadow var(--dur)}
.s-md .trigger{height:38px;padding:0 10px 0 12px;font-size:14px}
.s-sm .trigger{height:30px;padding:0 8px 0 10px;font-size:13px}
.trigger:hover{border-color:var(--red-line)}
.open .trigger,.trigger:focus-visible{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50);outline:none}
.trigger span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ph{color:var(--text-4)}
.chev{color:var(--text-3);transition:transform var(--dur)}
.open .chev{transform:rotate(180deg);color:var(--red)}
</style>
<style>
.ui-select-mask{position:fixed;inset:0;z-index:600}
.ui-select-pop{position:fixed;z-index:601;max-height:280px;overflow:auto;margin:0;padding:5px;list-style:none;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow-2);animation:rise 160ms var(--ease)}
.ui-select-pop.up{transform:translateY(-100%)}
.ui-select-pop li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:7px;font-size:14px;color:var(--text);cursor:pointer;white-space:nowrap}
.ui-select-pop li small{display:block;font-size:12px;color:var(--text-3)}
.ui-select-pop li.hover{background:var(--surface-3)}
.ui-select-pop li.on{color:var(--red);font-weight:600;background:var(--red-25)}
.ui-select-pop li svg{color:var(--red)}
</style>
