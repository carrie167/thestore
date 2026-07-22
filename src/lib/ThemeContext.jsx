import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = {
  teal: {
    id: 'teal',
    name: 'Market',
    swatch: ['#4C7683', '#BAD9CE', '#DDEEC1', '#EFCB97'],
    vars: {
      '--primary':        '#4C7683',
      '--primary-dark':   '#355965',
      '--primary-light':  '#BAD9CE',
      '--accent':         '#4C7683',
      '--accent-light':   '#CBE9E5',
      '--sage':           '#DDEEC1',
      '--sage-dark':      '#7B9E68',
      '--charcoal':       '#4A5254',
      '--charcoal-soft':  '#7B8587',
      '--tan':            '#E5B64A',
      '--tan-light':      '#FDF6E8',
      '--tan-border':     '#EFCB97',
      '--cream':          '#F5F6F7',
      '--cream-light':    '#FFFFFF',
      '--cream-border':   '#D9DFE1',
      '--danger':         '#B05848',
      '--danger-light':   '#F0E0D8',
      '--nav-bg':         '#4C7683',
      '--nav-indicator':  '#E5B64A',
      '--aisle-bg':       '#355965',
      '--aisle-text':     '#BAD9CE',
      '--sidebar-bg':     '#BAD9CE',
      '--card-bg':        '#FFFFFF',
      '--selector-bg':    '#CBE9E5',
      '--highlight':      '#E5B64A',
    },
  },
  pink: {
    id: 'pink',
    name: 'Blossom',
    swatch: ['#C97B9A', '#F0D8E8', '#D4B8C8', '#E8C8A0'],
    vars: {
      '--primary':        '#C97B9A',
      '--primary-dark':   '#A85C7E',
      '--primary-light':  '#F0D8E8',
      '--accent':         '#8A4A6A',
      '--accent-light':   '#FAF0F5',
      '--sage':           '#E8D8E8',
      '--sage-dark':      '#8A6A80',
      '--charcoal':       '#3A2A30',
      '--charcoal-soft':  '#8A7A80',
      '--tan':            '#C4907A',
      '--tan-light':      '#FAF0EC',
      '--tan-border':     '#E8D0C8',
      '--cream':          '#FDF5F8',
      '--cream-light':    '#FFFFFF',
      '--cream-border':   '#E8D0DC',
      '--danger':         '#B05848',
      '--danger-light':   '#F0E0D8',
      '--nav-bg':         '#8A4A6A',
      '--nav-indicator':  '#F0A8C0',
      '--aisle-bg':       '#A85C7E',
      '--aisle-text':     '#FAF0F5',
      '--sidebar-bg':     '#F0D8E8',
      '--card-bg':        '#FFFFFF',
      '--selector-bg':    '#FAF0F5',
      '--highlight':      '#C4907A',
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
