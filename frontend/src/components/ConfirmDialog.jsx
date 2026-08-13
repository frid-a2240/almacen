import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disableElevation>
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
