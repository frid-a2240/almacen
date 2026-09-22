import { createTheme } from '@mui/material/styles'
export const TEAL = '#00AFAA'
export const NAVY = '#263449'
export const AZUL_INSTITUCIONAL = '#0A2148'

const TIPOGRAFIA = {
  fontFamily: '"Mont", "Roboto", "Segoe UI", sans-serif',
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
}

const FORMA = { borderRadius: 8 }
function componentesOscuro(fondoAppBar) {
  return {
    MuiCssBaseline: { styleOverrides: { body: { WebkitFontSmoothing: 'antialiased' } } },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: fondoAppBar, backgroundImage: 'none', borderBottom: '1px solid #232C3B' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: fondoAppBar, backgroundImage: 'none', borderRight: '1px solid #232C3B' },
      },
    },
    MuiButton: { styleOverrides: { root: { borderRadius: 20, paddingInline: 20 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  }
}

function componentesClaro(colorPrincipal) {
  return {
    MuiCssBaseline: { styleOverrides: { body: { WebkitFontSmoothing: 'antialiased' } } },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#FFFFFF', backgroundImage: 'none', borderBottom: '1px solid #E4E7EC', color: '#101828' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#FFFFFF', backgroundImage: 'none', borderRight: '1px solid #E4E7EC' },
      },
    },
    MuiButton: { styleOverrides: { root: { borderRadius: 20, paddingInline: 20 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', border: '1px solid #E4E7EC' } } },
  }
}

const temaOscuro = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: TEAL, light: '#4DD9D3', dark: '#007D79', contrastText: '#0B1620' },
    secondary: { main: NAVY, light: '#3C4E68', dark: '#182131', contrastText: '#F2F4F7' },
    background: { default: '#0D1219', paper: '#141B26' },
    text: { primary: '#F2F4F7', secondary: '#8D96A8' },
    divider: '#232C3B',
  },
  typography: TIPOGRAFIA,
  shape: FORMA,
  components: componentesOscuro('#121926'),
})

const temaClaroTurquesa = createTheme({
  palette: {
    mode: 'light',
    primary: { main: TEAL, light: '#4DD9D3', dark: '#007D79', contrastText: '#FFFFFF' },
    secondary: { main: NAVY, light: '#3C4E68', dark: '#182131', contrastText: '#F2F4F7' },
    background: { default: '#F7F9FA', paper: '#FFFFFF' },
    text: { primary: '#101828', secondary: '#5B6472' },
    divider: '#E4E7EC',
  },
  typography: TIPOGRAFIA,
  shape: FORMA,
  components: componentesClaro(TEAL),
})

const temaClaroAzul = createTheme({
  palette: {
    mode: 'light',
    primary: { main: AZUL_INSTITUCIONAL, light: '#284A78', dark: '#061530', contrastText: '#FFFFFF' },
    secondary: { main: TEAL, light: '#4DD9D3', dark: '#007D79', contrastText: '#0B1620' },
    background: { default: '#F7F9FA', paper: '#FFFFFF' },
    text: { primary: '#101828', secondary: '#5B6472' },
    divider: '#E4E7EC',
  },
  typography: TIPOGRAFIA,
  shape: FORMA,
  components: componentesClaro(AZUL_INSTITUCIONAL),
})

export const TEMAS = {
  oscuro: { nombre: 'Oscuro', theme: temaOscuro },
  'claro-turquesa': { nombre: 'Claro · Turquesa institucional', theme: temaClaroTurquesa },
  'claro-azul': { nombre: 'Claro · Azul institucional', theme: temaClaroAzul },
}

export const MODO_POR_DEFECTO = 'oscuro'
