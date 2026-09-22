import { useState } from 'react'
import { Avatar, Dialog, IconButton } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { thumbURL, imageURL } from '../api/client.js'

// El vale electrónico se guarda como PDF (ya no es una foto tomada a mano) —
// no tiene miniatura de imagen que mostrar, así que en vez de un <img> roto
// se abre en una pestaña nueva (el navegador ya trae su propio visor de PDF).
function esPdf(src) {
  return typeof src === 'string' && src.toLowerCase().endsWith('.pdf')
}

export default function Thumbnail({ src, shape = 'square', size = 56, bg }) {
  const [abierta, setAbierta] = useState(false)
  const pdf = esPdf(src)

  const abrir = () => {
    if (!src) return
    if (pdf) {
      window.open(imageURL(src), '_blank')
    } else {
      setAbierta(true)
    }
  }

  return (
    <>
      <Avatar
        src={pdf ? undefined : thumbURL(src) || undefined}
        slotProps={{ img: { loading: 'lazy' } }}
        variant={shape === 'round' ? 'circular' : 'rounded'}
        onClick={src ? abrir : undefined}
        sx={{ width: size, height: size, bgcolor: bg || '#2A2A2A', flexShrink: 0, cursor: src ? 'pointer' : 'default' }}
      >
        {pdf ? <PictureAsPdfOutlinedIcon sx={{ color: 'text.secondary' }} /> : <ImageOutlinedIcon sx={{ color: 'text.secondary' }} />}
      </Avatar>

      {src && !pdf && (
        <Dialog open={abierta} onClose={() => setAbierta(false)} maxWidth="lg">
          <IconButton
            onClick={() => setAbierta(false)}
            size="small"
            sx={{
              position: 'absolute', top: 4, right: 4, zIndex: 1,
              bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <img src={imageURL(src)} alt="" style={{ display: 'block', maxWidth: '90vw', maxHeight: '90vh' }} />
        </Dialog>
      )}
    </>
  )
}
