import { onActivated, onDeactivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
/** 记录定位与 URL ?id= 双向同步：跨模块跳转、刷新、后退都能回到同一条记录；页面被缓存隐藏时自动收起抽屉。 */
export function useRecordQuery(param = 'id') {
  const route = useRoute(), router = useRouter()
  const path = route.path
  const read = () => (route.query[param] ? String(route.query[param]) : null)
  const id = ref<string | null>(read())
  let active = true
  watch(() => route.query[param], () => { if (active && route.path === path) id.value = read() })
  watch(id, v => { if (!active || route.path !== path || read() === v) return; router.replace({ query: { ...route.query, [param]: v || undefined } }) })
  onActivated(() => { active = true; id.value = read() })
  onDeactivated(() => { active = false; id.value = null })
  return id
}
