import { useEffect, useRef, useState } from 'react'
import { BellOff } from 'lucide-react'

export default function ChimePlayer(): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const handler = (): void => {
      el.currentTime = 0
      el.play().catch((err) => console.warn('chime play failed', err))
    }
    const onPlay = (): void => setPlaying(true)
    const onEnded = (): void => setPlaying(false)
    const onPause = (): void => setPlaying(false)

    window.electron.ipcRenderer.on('play-chime', handler)
    el.addEventListener('play', onPlay)
    el.addEventListener('ended', onEnded)
    el.addEventListener('pause', onPause)
    return () => {
      window.electron.ipcRenderer.removeAllListeners('play-chime')
      el.removeEventListener('play', onPlay)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('pause', onPause)
    }
  }, [])

  const stop = (): void => {
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
  }

  return (
    <>
      <audio ref={audioRef} src="/soft-bell.mp3" preload="auto" />
      {playing && (
        <button
          onClick={stop}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white text-sm shadow-lg hover:bg-slate-800"
          aria-label="Stop sound"
        >
          <BellOff className="w-4 h-4" />
          Stop sound
        </button>
      )}
    </>
  )
}
