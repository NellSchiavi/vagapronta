import * as React from 'react'

type Theme = 'light' | 'dark'
const KEY = 'vp-theme'

function readInitial(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(readInitial)

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1C1713' : '#F7F2EA')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* navegação privada: segue sem lembrar a preferência */
    }
  }, [theme])

  const toggle = React.useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => React.useContext(ThemeContext)
