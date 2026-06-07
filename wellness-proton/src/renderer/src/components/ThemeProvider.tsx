import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function ThemeProvider(): null {
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  useEffect(() => {
    const theme = settings.data?.theme ?? 'light'
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [settings.data?.theme])

  return null
}
