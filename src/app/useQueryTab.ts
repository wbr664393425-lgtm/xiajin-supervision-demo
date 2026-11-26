import { onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
/** 页内视图切换同步到 URL（?view=），刷新和后退都能回到同一视图。 */
export function useQueryTab(param: string, fallback: string) {
  const route = useRoute(), router = useRouter(), path = route.path
  const read = () => String(route.query[param] || fallback)
  const tab = ref(read())
  watch(() => route.query[param], () => { if (route.path === path) tab.value = read() })
  watch(tab, v => { if (route.path === path && read() !== v) router.replace({ query: { ...route.query, [param]: v === fallback ? undefined : v } }) })
  onActivated(() => { tab.value = read() })
  return tab
}
