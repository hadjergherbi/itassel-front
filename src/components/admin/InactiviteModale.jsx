import { useRef } from 'react'
import Modal from './Modal'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n/LanguageContext'

export default function InactiviteModale({
  ouvert,
  mode,
  secondes,
  onRester,
  onDeconnecter,
  onReconnecter,
}) {
  const principalRef = useRef(null)
  const { tf } = useLanguage()
  const expiration = mode === 'expiration'

  return (
    <Modal
      open={ouvert}
      title={tf('admin.inactivite.titre')}
      onClose={expiration ? onReconnecter : onRester}
      initialFocusRef={principalRef}
      footer={
        <>
          <Button variant="secondary" onClick={onDeconnecter}>
            {tf('admin.inactivite.deconnecter')}
          </Button>
          {expiration ? (
            <Button ref={principalRef} onClick={onReconnecter}>
              {tf('admin.inactivite.reconnecter')}
            </Button>
          ) : (
            <Button ref={principalRef} onClick={onRester}>
              {tf('admin.inactivite.rester')}
            </Button>
          )}
        </>
      }
    >
      <p className="text-sm text-gray-700" role="status" aria-live="polite">
        {tf('admin.inactivite.message', { n: secondes })}
      </p>
    </Modal>
  )
}
