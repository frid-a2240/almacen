import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Alert } from '@mui/material'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, error }) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
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
