import { ref } from 'vue'
import { defineStore } from 'pinia'

const storageKeys = {
  sessionStorage: 'xiajin-login:session',
  localStorage: 'xiajin-login:remembered-account',
}
type StorageArea = keyof typeof storageKeys

function readAccount(area: StorageArea) {
  try { return window[area].getItem(storageKeys[area]) || '' }
  catch { return '' }
}

function saveAccount(area: StorageArea, username: string) {
  try {
    if (username) window[area].setItem(storageKeys[area], username)
    else window[area].removeItem(storageKeys[area])
  } catch { /* 存储受限时仍可在当前页面完成演示。 */ }
}

export const useSessionStore = defineStore('session', () => {
  const signedIn = ref(!__SERVER_SESSION__ && readAccount('sessionStorage') === 'admin')
  const justSignedIn = ref(false)

  function rememberedUsername() { return readAccount('localStorage') }
  function forgetUsername() { saveAccount('localStorage', '') }

  async function checkSession() {
    if (__SERVER_SESSION__) {
      try {
        const response = await fetch('/api/session', { cache: 'no-store' })
        signedIn.value = response.ok && (await response.json()).authenticated === true
      } catch { signedIn.value = false }
    }
    return signedIn.value
  }

  async function signIn(username: string, password: string, remember: boolean) {
    const account = username.trim()
    if (__SERVER_SESSION__) {
      const response = await fetch('/api/session/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: account, password }),
      })
      if (response.status === 401) return false
      if (response.status === 429) throw new Error('登录尝试频繁，请稍后再试')
      if (response.status !== 204) throw new Error('登录服务暂时不可用，请稍后重试')
    } else {
      // 仅供本地静态演示，mobile 构建会移除整个分支。
      if (account !== 'admin' || password !== 'admin888') return false
      saveAccount('sessionStorage', account)
    }
    saveAccount('localStorage', remember ? account : '')
    signedIn.value = true
    justSignedIn.value = true
    return true
  }

  async function signOut() {
    if (__SERVER_SESSION__) {
      const response = await fetch('/api/session/logout', { method: 'POST' })
      if (response.status !== 204) throw new Error('退出失败')
    }
    saveAccount('sessionStorage', '')
    signedIn.value = false
  }

  return { signedIn, justSignedIn, rememberedUsername, forgetUsername, checkSession, signIn, signOut }
})
