import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = {
  teal: {
    id: 'teal',
    name: 'Market',
    swatch: ['#6BBDB5', '#A8B87A', '#3D6B8A', '#E8EAD8'],
    vars: {
      '--primary':       '#6BBDB5',
      '--primary-dark':  '#3D9E96',
      '--primary-light': '#A0C8C2',
      '--accent':        '#3D6B8A',
      '--accent-light':  '#C8E8E4',
      '--sage':          '#A8B87A',
      '--sage-dark':     '#7A9050',
      '--charcoal':      '#3D4442',
      '--charcoal-soft': '#7A8A7A',
      '--tan':           '#C4A878',
      '--tan-light':     '#F5F0E4',
      '--tan-border':    '#E0D8C8',
      '--cream':         '#E8EAD8',
      '--cream-light':   '#F4F6EC',
      '--cream-border':  '#D0D4B8',
      '--danger':        '#B05848',
      '--danger-light':  '#F0E0D8',
      '--nav-bg':        '#3D4442',
      '--nav-indicator': '#6BBDB5',
      '--aisle-bg':      '#3D6B8A',
      '--aisle-text':    '#C8E8E4',
    },
  },
  pink: {
    id: 'pink',
    name: 'Blossom',
    swatch: ['#C97B9A', '#D4A0B5', '#8A4A6A', '#F5EAF0'],
    vars: {
      '--primary':       '#C97B9A',
      '--primary-dark':  '#A85C7E',
      '--primary-light': '#DFB0C8',
      '--accent':        '#8A4A6A',
      '--accent-light':  '#F0D8E8',
      '--sage':          '#C4A0B8',
      '--sage-dark':     '#8A6A80',
      '--charcoal':      '#3A2A30',
      '--charcoal-soft': '#8A7A80',
      '--tan':           '#C4907A',
      '--tan-light':     '#FAF0EC',
      '--tan-border':    '#E8D0C8',
      '--cream':         '#F5EAF0',
      '--cream-light':   '#FDF5F8',
      '--cream-border':  '#E0C8D4',
      '--danger':        '#B05848',
      '--danger-light':  '#F0E0D8',
      '--nav-bg':        '#3A2A30',
      '--nav-indicator': '#C97B9A',
      '--aisle-bg':      '#8A4A6A',
      '--aisle-text':    '#F0D8E8',
    },
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('thestore-theme') || 'teal')

  useEffect(() => {
    const theme = THEMES[themeId] || THEMES.teal
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([key, val]) => root.style.setProperty(key, val))
    localStorage.setItem('thestore-theme', themeId)
  }, [themeId])

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
