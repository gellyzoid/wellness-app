import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Sparkles, Square, Plus, Trash2, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import PageHeader from '../components/PageHeader'
import type { AssistantChatMessage, ChatMessage, ChatSession } from '../../../shared/types'

const QUICK_PROMPTS = [
  'How am I doing this week?',
  'Suggest a 20-minute workout I can do now.',
  'Am I sleeping enough?',
  'What should I eat for dinner given my logged meals today?'
]

interface Msg extends AssistantChatMessage {
  id: string
  streaming?: boolean
}

export default function Assistant(): React.JSX.Element {
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => window.api.settings.get() })
  const sessions = useQuery({ queryKey: ['chat', 'sessions'], queryFn: () => window.api.chat.listSessions() })

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const sessionRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const deleteSession = useMutation({
    mutationFn: (id: string) => window.api.chat.deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'sessions'] })
    }
  })

  const loadSession = async (session: ChatSession): Promise<void> => {
    if (streaming) return
    const msgs = await window.api.chat.getMessages(session.id)
    setMessages(msgs.map((m) => ({ id: m.id, role: m.role, content: m.content })))
    setActiveSessionId(session.id)
    activeSidRef.current = session.id
    setError(null)
  }

  const activeSidRef = useRef<string | null>(null)

  const saveCurrentSession = async (finalMessages: Msg[]): Promise<void> => {
    const userMsgs = finalMessages.filter((m) => m.role === 'user')
    if (userMsgs.length === 0) return
    const title = userMsgs[0].content.slice(0, 60) + (userMsgs[0].content.length > 60 ? '…' : '')
    if (!activeSidRef.current) {
      activeSidRef.current = crypto.randomUUID()
      setActiveSessionId(activeSidRef.current)
    }
    const sid = activeSidRef.current
    const chatMsgs: ChatMessage[] = finalMessages
      .filter((m) => !m.streaming && m.content)
      .map((m) => ({ id: m.id, session_id: sid, role: m.role, content: m.content, created_at: '' }))
    await window.api.chat.saveSession({ id: sid, title, created_at: '' }, chatMsgs)
    qc.invalidateQueries({ queryKey: ['chat', 'sessions'] })
  }

  const send = (prompt?: string): void => {
    const content = (prompt ?? input).trim()
    if (!content || streaming) return
    setInput('')
    setError(null)

    const sessionId = crypto.randomUUID()
    sessionRef.current = sessionId
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content }
    const assistantMsg: Msg = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }
    const history: AssistantChatMessage[] = [
      ...messages.map(({ role, content }) => ({ role, content })),
      { role: 'user', content }
    ]
    setMessages((m) => [...m, userMsg, assistantMsg])
    setStreaming(true)

    const ipc = window.electron.ipcRenderer
    const chunkChannel = `assistant:chunk:${sessionId}`
    const doneChannel = `assistant:done:${sessionId}`
    const errorChannel = `assistant:error:${sessionId}`

    const onChunk = (_e: unknown, text: string): void => {
      setMessages((all) =>
        all.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + text } : m))
      )
    }
    const finish = (finalMsgs: Msg[]): void => {
      ipc.removeAllListeners(chunkChannel)
      ipc.removeAllListeners(doneChannel)
      ipc.removeAllListeners(errorChannel)
      setStreaming(false)
      sessionRef.current = null
      saveCurrentSession(finalMsgs)
    }
    ipc.on(chunkChannel, onChunk)
    ipc.on(doneChannel, () => {
      setMessages((all) => {
        const updated = all.map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false } : m))
        finish(updated)
        return updated
      })
    })
    ipc.on(errorChannel, (_e: unknown, msg: string) => {
      if (msg !== 'cancelled') setError(msg)
      setMessages((all) => {
        const updated = all
          .map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false } : m))
          .filter((m) => !(m.id === assistantMsg.id && m.content === ''))
        finish(updated)
        return updated
      })
    })

    window.api.assistant.chat({ sessionId, history })
  }

  const cancel = (): void => {
    if (sessionRef.current) window.api.assistant.cancel(sessionRef.current)
  }

  const newChat = (): void => {
    if (streaming) return
    setMessages([])
    setActiveSessionId(null)
    activeSidRef.current = null
    setError(null)
  }

  const hasKey = !!settings.data?.groq_api_key

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle="VitaCloud — your private wellness coach, powered by Groq"
      />
      <div className="flex h-[calc(100vh-110px)]">

        {/* Sidebar */}
        <div className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={newChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {sessions.data?.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-4 px-2">No past conversations yet.</p>
            )}
            {sessions.data?.map((s) => (
              <div
                key={s.id}
                className={
                  'group flex items-start gap-1 rounded-md px-2 py-2 cursor-pointer ' +
                  (activeSessionId === s.id
                    ? 'bg-brand-50 dark:bg-brand-950'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800')
                }
                onClick={() => loadSession(s)}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate leading-snug">{s.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {format(new Date(s.created_at.replace(' ', 'T')), 'MMM d, h:mm a')}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession.mutate(s.id); if (activeSessionId === s.id) newChat() }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col p-6 min-w-0">
          {!hasKey && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-lg p-4 text-sm">
              No Groq API key configured. Add one in{' '}
              <a href="#/settings" className="underline font-medium">Settings → AI assistant</a>{' '}
              to start chatting.
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 space-y-4"
          >
            {messages.length === 0 ? (
              <EmptyState onPick={send} disabled={!hasKey} />
            ) : (
              messages.map((m) => <Bubble key={m.id} msg={m} />)
            )}
            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-2">
                {error}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={hasKey ? 'Ask about your wellness…' : 'Add an API key in Settings first'}
              disabled={!hasKey || streaming}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            />
            {streaming ? (
              <button
                onClick={cancel}
                className="px-4 py-2.5 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 flex items-center gap-2"
              >
                <Square className="w-4 h-4" /> Stop
              </button>
            ) : (
              <button
                onClick={() => send()}
                disabled={!hasKey || !input.trim()}
                className="px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function EmptyState({ onPick, disabled }: { onPick: (p: string) => void; disabled: boolean }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center mb-3">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Hi! I&apos;m VitaCloud, your wellness coach.</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
        I can see your hydration, exercise, sleep, meals, and medication data. Ask me anything —
        your data never leaves your machine except to the model you configured.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            disabled={disabled}
            className="text-left text-sm px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: Msg }): React.JSX.Element {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed bg-brand-600 text-white">
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600">
        {msg.content ? (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        ) : msg.streaming ? (
          <Cursor />
        ) : null}
        {msg.streaming && msg.content && <Cursor />}
      </div>
    </div>
  )
}

function Cursor(): React.JSX.Element {
  return <span className="inline-block w-1.5 h-4 bg-current ml-0.5 align-middle animate-pulse" />
}
