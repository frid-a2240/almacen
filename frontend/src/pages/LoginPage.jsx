import { useState } from 'react'
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const [numeroControl, setNumeroControl] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEntrando(true)
    try {
      await login(numeroControl, password)
    } catch {
      setError('Número de control o contraseña incorrectos.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <Box
      sx={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'background.default', px: 2,
      }}
    >
      <Paper
        component="form" onSubmit={enviar}
        sx={{ width: '100%', maxWidth: 380, p: 4, bgcolor: 'background.paper', borderRadius: 2 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box component="img" src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="ISP" sx={{ width: 56, height: 56, mb: 1.5 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>ALMACEN ISP</Typography>
          <Typography variant="body2" color="text.secondary">Inicia sesión para continuar</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Número de control" required fullWidth autoFocus
          value={numeroControl}
          onChange={(e) => setNumeroControl(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Contraseña" type="password" required fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
        />
        <Button type="submit" variant="contained" fullWidth disableElevation disabled={entrando}>
          Iniciar sesión
        </Button>
      </Paper>
    </Box>
  )
}
