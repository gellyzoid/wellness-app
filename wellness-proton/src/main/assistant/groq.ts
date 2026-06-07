export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
  signal?: AbortSignal
}

export async function streamChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  cb: StreamCallbacks
): Promise<void> {
  if (!apiKey) {
    cb.onError('No Groq API key configured. Add one in Settings → AI assistant.')
    return
  }

  let response: Response
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_completion_tokens: 4096,
        top_p: 1,
        stream: true
      }),
      signal: cb.signal
    })
  } catch (e) {
    cb.onError(
      e instanceof Error && e.name === 'AbortError'
        ? 'cancelled'
        : `Network error: ${e instanceof Error ? e.message : 'unknown'}`
    )
    return
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    cb.onError(`Groq API ${response.status}: ${text.slice(0, 300) || response.statusText}`)
    return
  }
  if (!response.body) {
    cb.onError('Empty response from Groq API')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') {
          cb.onDone()
          return
        }
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta.length > 0) cb.onChunk(delta)
        } catch {
          // ignore malformed line
        }
      }
    }
    cb.onDone()
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      cb.onError('cancelled')
    } else {
      cb.onError(`Stream error: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }
}

export async function testKey(apiKey: string, model: string): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) return { ok: false, error: 'No API key provided' }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_completion_tokens: 5,
        stream: false
      })
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `${res.status}: ${text.slice(0, 200) || res.statusText}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}
