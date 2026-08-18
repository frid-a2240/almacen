import { Avatar } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { thumbURL } from '../api/client.js'

export default function Thumbnail({ src, shape = 'square', size = 56, bg }) {
  const url = thumbURL(src)
  return (
    <Avatar
      src={url || undefined}
      slotProps={{ img: { loading: 'lazy' } }}
      variant={shape === 'round' ? 'circular' : 'rounded'}
      sx={{ width: size, height: size, bgcolor: bg || '#2A2A2A', flexShrink: 0 }}
    >
      <ImageOutlinedIcon sx={{ color: 'text.secondary' }} />
    </Avatar>
  )
}
