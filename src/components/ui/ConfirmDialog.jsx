import Modal from '../admin/Modal'
import Button from './Button'
import { useLanguage } from '../../i18n/LanguageContext'

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onClose,
  onConfirm,
}) {
  const { tf } = useLanguage()
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {tf('admin.ui.annuler')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel || tf('admin.ui.confirmer')}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">{children}</div>
    </Modal>
  )
}
