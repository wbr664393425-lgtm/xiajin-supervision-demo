/** DeepSeek（OpenAI 兼容）流式客户端：经本地 Vite 代理 /api/llm 转发，浏览器端不接触密钥。 */
export const llmModel = typeof __LLM_MODEL__ !== 'undefined' ? __LLM_MODEL__ : ''
export const llmConfigured = typeof __LLM_ENABLED__ !== 'undefined' ? __LLM_ENABLED__ : false
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export type StreamChunk = { type: 'content' | 'reasoning'; text: string }

export async function* streamChat(messages: ChatMessage[], opts: { signal?: AbortSignal; thinking?: boolean; maxTokens?: number } = {}): AsyncGenerator<StreamChunk> {
  const res = await fetch('/api/llm/chat/completions', {
    method: 'POST', signal: opts.signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: llmModel, messages, stream: true, temperature: 0.3, max_tokens: opts.maxTokens || 2048, chat_template_kwargs: { thinking: Boolean(opts.thinking) } }),
  })
  if (!res.ok || !res.body) throw new Error(`模型服务返回 ${res.status}`)
  const reader = res.body.getReader(), decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const data = t.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta || {}
        const r = delta.reasoning ?? delta.reasoning_content
        if (r) yield { type: 'reasoning', text: r }
        if (delta.content) yield { type: 'content', text: delta.content }
      } catch { /* 忽略不完整片段 */ }
    }
  }
}
/** 连通性检测：发一个极短请求，3 秒内成功即视为可用。 */
export async function pingLlm(): Promise<boolean> {
  if (!llmConfigured) return false
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch('/api/llm/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: llmModel, messages: [{ role: 'user', content: '只回复OK' }], max_tokens: 4, chat_template_kwargs: { thinking: false } }) })
    clearTimeout(timer)
    return res.ok
  } catch { return false }
}
