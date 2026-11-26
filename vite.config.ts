import { fileURLToPath, URL } from 'node:url'
import https from 'node:https'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 只读取 LLM_ 前缀变量，且不以 VITE_ 开头：密钥只在本地开发/预览服务中使用，不会打进前端包。
  const mobile = mode === 'mobile'
  const env = mobile ? {} : loadEnv(mode, process.cwd(), 'LLM_')
  const proxy: Record<string, ProxyOptions> = env.LLM_BASE_URL && env.LLM_API_KEY ? {
    '/api/llm': {
      target: env.LLM_BASE_URL,
      changeOrigin: false,
      secure: true,
      // 网关要求自定义 Host 头；TLS 证书校验与 SNI 仍按网关域名进行
      agent: new https.Agent({ keepAlive: true, servername: new URL(env.LLM_BASE_URL).hostname }),
      rewrite: path => path.replace(/^\/api\/llm/, ''),
      headers: { host: env.LLM_HOST_HEADER || new URL(env.LLM_BASE_URL).host, authorization: `Bearer ${env.LLM_API_KEY}` },
      configure: p => p.on('proxyReq', req => { req.removeHeader('cookie'); req.removeHeader('origin'); req.removeHeader('referer') }),
    },
  } : {}
  return {
    plugins: [vue()],
    define: {
      __SERVER_SESSION__: JSON.stringify(mobile),
      __LLM_MODEL__: JSON.stringify(env.LLM_MODEL || ''),
      __LLM_ENABLED__: JSON.stringify(mobile || Boolean(env.LLM_BASE_URL && env.LLM_API_KEY)),
    },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5186, strictPort: true, proxy },
    preview: { proxy },
    test: { environment: 'node', include: ['src/**/*.test.ts'], css: true },
  } as any
})
