import { useState } from 'react'
import { Avatar, Dialog, IconButton } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { thumbURL, imageURL } from '../api/client.js'

export default function Thumbnail({ src, shape = 'square', size = 56, bg }) {
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <Avatar
        src={thumbURL(src) || undefined}
        slotProps={{ img: { loading: 'lazy' } }}
        variant={shape === 'round' ? 'circular' : 'rounded'}
        onClick={src ? () => setAbierta(true) : undefined}
        sx={{ width: size, height: size, bgcolor: bg || '#2A2A2A', flexShrink: 0, cursor: src ? 'pointer' : 'default' }}
      >
        <ImageOutlinedIcon sx={{ color: 'text.secondary' }} />
      </Avatar>

      {src && (
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
