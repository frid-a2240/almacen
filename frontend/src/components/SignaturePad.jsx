import { useRef, useState, useEffect } from 'react'
import { Box, Button, Typography } from '@mui/material'

/**
 * Captura de firma con canvas (mouse y touch). onChange recibe un File PNG
 * cuando el usuario termina de dibujar, o null si se borra.
 */
export default function SignaturePad({ onChange, height = 160, required = false }) {
  const canvasRef = useRef(null)
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [])

  const posicion = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const punto = e.touches ? e.touches[0] : e
    return {
      x: ((punto.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((punto.clientY - rect.top) / rect.height) * canvasRef.current.height,
    }
  }

  const iniciar = (e) => {
    dibujando.current = true
    const { x, y } = posicion(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const mover = (e) => {
    if (!dibujando.current) return
    e.preventDefault()
    const { x, y } = posicion(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    setVacio(false)
  }

  const terminar = () => {
    if (!dibujando.current) return
    dibujando.current = false
    canvasRef.current.toBlob((blob) => {
      if (blob) onChange(new File([blob], 'firma.png', { type: 'image/png' }))
    }, 'image/png')
  }

  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setVacio(true)
    onChange(null)
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Firma de recibido y conformidad{required && ' *'}
      </Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mt: 0.5 }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={height}
          style={{ width: '100%', height, touchAction: 'none', cursor: 'crosshair', display: 'block' }}
          onMouseDown={iniciar}
          onMouseMove={mover}
          onMouseUp={terminar}
          onMouseLeave={terminar}
          onTouchStart={iniciar}
          onTouchMove={mover}
          onTouchEnd={terminar}
        />
      </Box>
      <Button size="small" onClick={limpiar} disabled={vacio} sx={{ mt: 0.5 }}>
        Limpiar firma
      </Button>
    </Box>
  )
}
