import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = {
  teal: {
    id: 'teal',
    name: 'Market',
    swatch: ['#4C7683', '#BAD9CE', '#DDEEC1', '#E5B64A'],
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
  field: {
    id: 'field',
    name: 'Field',
    swatch: ['#584C4C', '#6F7B69', '#CCCCCC', '#000000'],
    vars: {
      '--primary':        '#6F7B69',
      '--primary-dark':   '#4A5445',
      '--primary-light':  '#B8C0B4',
      '--accent':         '#584C4C',
      '--accent-light':   '#E8E4E4',
      '--sage':           '#D4D8D0',
      '--sage-dark':      '#6F7B69',
      '--charcoal':       '#1A1A1A',
      '--charcoal-soft':  '#584C4C',
      '--tan':            '#8A7A6A',
      '--tan-light':      '#F0EDE8',
      '--tan-border':     '#CCCCCC',
      '--cream':          '#F4F4F2',
      '--cream-light':    '#FFFFFF',
      '--cream-border':   '#BBBBBB',
      '--danger':         '#B05848',
      '--danger-light':   '#F0E0D8',
      '--nav-bg':         '#1A1A1A',
      '--nav-indicator':  '#6F7B69',
      '--aisle-bg':       '#584C4C',
      '--aisle-text':     '#E8E4E4',
      '--sidebar-bg':     '#E8E8E4',
      '--card-bg':        '#FFFFFF',
      '--selector-bg':    '#E8E4E0',
      '--highlight':      '#6F7B69',
    },
  },
  grunge: {
    id: 'grunge',
    name: 'Grunge',
    swatch: ['#11151a', '#4c5b55', '#7d6778', '#dfd3c8'],
    vars: {
      '--primary':        '#4c5b55',
      '--primary-dark':   '#27323b',
      '--primary-light':  '#7d9090',
      '--accent':         '#7d6778',
      '--accent-light':   '#ede5e8',
      '--sage':           '#4c5b55',
      '--sage-dark':      '#27323b',
      '--charcoal':       '#11151a',
      '--charcoal-soft':  '#4c5b55',
      '--tan':            '#a08878',
      '--tan-light':      '#f5f0ea',
      '--tan-border':     '#dfd3c8',
      '--cream':          '#f0ece6',
      '--cream-light':    '#faf8f5',
      '--cream-border':   '#dfd3c8',
      '--danger':         '#8a3030',
      '--danger-light':   '#f0e0e0',
      '--nav-bg':         '#11151a',
      '--nav-indicator':  '#7d6778',
      '--aisle-bg':       '#27323b',
      '--aisle-text':     '#dfd3c8',
      '--sidebar-bg':     '#dfd3c8',
      '--card-bg':        '#faf8f5',
      '--selector-bg':    '#ede5e8',
      '--highlight':      '#7d6778',
    },
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children, serverTheme, onSaveTheme }) {
  const [themeId, setThemeId] = useState(() => serverTheme || localStorage.getItem('thestore-theme') || 'teal')

  // Sync from server when it loads
  useEffect(() => {
    if (serverTheme && serverTheme !== themeId) {
      setThemeId(serverTheme)
    }
  }, [serverTheme])

  useEffect(() => {
    const theme = THEMES[themeId] || THEMES.teal
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([key, val]) => root.style.setProperty(key, val))
    localStorage.setItem('thestore-theme', themeId)
  }, [themeId])

  function handleSetTheme(id) {
    setThemeId(id)
    if (onSaveTheme) onSaveTheme(id)
  }

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId: handleSetTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
