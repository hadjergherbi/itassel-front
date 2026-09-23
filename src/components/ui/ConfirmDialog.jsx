import Modal from '../admin/Modal'
import Button from './Button'

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmer',
  danger = false,
  busy = false,
  onClose,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">{children}</div>
    </Modal>
  )
}
