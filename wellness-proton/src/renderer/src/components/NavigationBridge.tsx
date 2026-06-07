import { useEffect } from 'react'
import { useNavigate } from 'react-router'

export default function NavigationBridge(): null {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = (_event: unknown, route: string): void => {
      if (typeof route === 'string' && route.startsWith('/')) navigate(route)
    }
    window.electron.ipcRenderer.on('navigate', handler)
    return () => {
      window.electron.ipcRenderer.removeAllListeners('navigate')
    }
  }, [navigate])
  return null
}
