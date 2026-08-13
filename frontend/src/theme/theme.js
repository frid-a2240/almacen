import { createTheme } from '@mui/material/styles'

// Paleta tomada directamente del logo de ISP (Infraestructura y Servicios Portuarios):
// teal de las olas superiores y azul marino de las olas inferiores.
const TEAL = '#00AFAA'
const NAVY = '#263449'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: TEAL,
      light: '#4DD9D3',
      dark: '#007D79',
      contrastText: '#0B1620',
    },
    secondary: {
      main: NAVY,
      light: '#3C4E68',
      dark: '#182131',
      contrastText: '#F2F4F7',
    },
    background: {
      default: '#0D1219',
      paper: '#141B26',
    },
    text: {
      primary: '#F2F4F7',
      secondary: '#8D96A8',
    },
    divider: '#232C3B',
  },

  typography: {
    fontFamily: '"Roboto", "Segoe UI", sans-serif',
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  },

  shape: { borderRadius: 8 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#121926',
          backgroundImage: 'none',
          borderBottom: '1px solid #232C3B',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#121926',
          backgroundImage: 'none',
          borderRight: '1px solid #232C3B',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 20, paddingInline: 20 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})

export default theme
