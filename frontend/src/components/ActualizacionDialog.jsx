import { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, LinearProgress, Stack } from '@mui/material'
import SystemUpdateOutlinedIcon from '@mui/icons-material/SystemUpdateOutlined'
import {
  revisarActualizacion, descargarActualizacion, abrirInstalador,
  hayInstalacionPendiente, limpiarInstalacionPendiente,
} from '../utils/actualizador.js'

// Estados del flujo: 'disponible' (recién detectada, botón "Actualizar") ->
// 'descargando' (con %) -> 'permiso' (hay que activar "instalar de esta
// fuente" en Ajustes y regresar) -> 'listo' (ya se abrió el instalador de
// Android, falta que la persona le dé "Actualizar" ahí).
export default function ActualizacionDialog() {
  const [info, setInfo] = useState(null)
  const [estado, setEstado] = useState('disponible')
  const [porcentaje, setPorcentaje] = useState(0)
  const [error, setError] = useState('')

  const intentarInstalar = async () => {
    setError('')
    try {
      const permiso = await abrirInstalador()
      setEstado(permiso ? 'listo' : 'permiso')
    } catch {
      setError('No se pudo abrir el instalador.')
    }
  }

  useEffect(() => {
    revisarActualizacion().then((resultado) => {
      if (!resultado) return
      setInfo(resultado)
      // Si ya se había descargado y solo faltaba el permiso/instalar (la
      // pantalla de "permitir de esta fuente" puede reiniciar la app),
      // retoma solo en cuanto el usuario vuelve a la app.
      if (hayInstalacionPendiente()) {
        setEstado('permiso')
        const alVolver = () => {
          if (document.visibilityState !== 'visible') return
          document.removeEventListener('visibilitychange', alVolver)
          limpiarInstalacionPendiente()
          intentarInstalar()
        }
        document.addEventListener('visibilitychange', alVolver)
      }
    })
  }, [])

  if (!info) return null

  const actualizar = async () => {
    setError('')
    setEstado('descargando')
    setPorcentaje(0)
    try {
      await descargarActualizacion(info.url, setPorcentaje)
      await intentarInstalar()
    } catch {
      setEstado('disponible')
      setError('No se pudo descargar la actualización. Revisa que estés conectado al wifi de la empresa.')
    }
  }

  return (
    <Dialog open maxWidth="xs" fullWidth disableEscapeKeyDown={estado !== 'disponible'}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SystemUpdateOutlinedIcon color="primary" />
        Actualización disponible
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {estado === 'disponible' && (
            <Typography variant="body2" color="text.secondary">
              Hay una versión nueva de la app ({info.version}). Se descarga e instala sola, sin salir de aquí.
            </Typography>
          )}
          {estado === 'descargando' && (
            <>
              <Typography variant="body2" color="text.secondary">Descargando actualización… {porcentaje}%</Typography>
              <LinearProgress variant="determinate" value={porcentaje} />
            </>
          )}
          {estado === 'permiso' && (
            <Typography variant="body2" color="text.secondary">
              Activa "Permitir de esta fuente" en la pantalla de Ajustes y regresa a la app — se continúa solo.
            </Typography>
          )}
          {estado === 'listo' && (
            <Typography variant="body2" color="text.secondary">
              Toca "Actualizar" en el mensaje de Android para terminar. Al finalizar, abre la app de nuevo.
            </Typography>
          )}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {estado === 'disponible' && (
          <>
            <Button onClick={() => setInfo(null)}>Ahora no</Button>
            <Button variant="contained" disableElevation onClick={actualizar}>Actualizar</Button>
          </>
        )}
        {estado === 'permiso' && <Button variant="contained" disableElevation onClick={intentarInstalar}>Ya activé el permiso</Button>}
        {estado === 'listo' && <Button onClick={() => setInfo(null)}>Cerrar</Button>}
      </DialogActions>
    </Dialog>
  )
}
