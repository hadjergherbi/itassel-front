import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  RotateCw,
} from 'lucide-react'
import Modal from '../Modal'
import { useAdminAuth } from '../../../admin/AdminAuthContext'
import adminApi, { extractBlobErrors } from '../../../lib/adminApi'
import { formatTaille } from '../../../lib/statuts'
import { useLanguage } from '../../../i18n/LanguageContext'
import {
  estImage,
  estPdf,
  estPrevisualisable,
  mimeDepuisType,
  telecharger,
  tronquerNomFichier,
  typeAffiche,
} from './helpers'

function libelleOrigine(origine, tf) {
  return String(origine ?? '').toUpperCase() === 'COMPLEMENT'
    ? tf('admin.piecesJointes.reponseComplement')
    : tf('admin.piecesJointes.depotInitial')
}

function estMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? '')
}

function IconeType({ piece, className = 'h-5 w-5' }) {
  if (estPdf(piece)) return <FileText className={`${className} text-[#b42318]`} aria-hidden />
  return <ImageIcon className={`${className} text-institutional`} aria-hidden />
}

function ImageApercu({ src, alt, tf }) {
  const [mode, setMode] = useState('fit')
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [glisse, setGlisse] = useState(false)
  const drag = useRef(null)

  useEffect(() => {
    setMode('fit')
    setRotation(0)
    setOffset({ x: 0, y: 0 })
    setGlisse(false)
  }, [src])

  const zoomer = (delta) => {
    const base = mode === 'fit' ? 100 : mode
    setMode(Math.min(400, Math.max(25, base + delta)))
  }

  const onPointerDown = (e) => {
    if (mode === 'fit') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    setGlisse(true)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })
  }
  const finDrag = () => {
    drag.current = null
    setGlisse(false)
  }

  const zoomed = mode !== 'fit'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-neutral-800"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finDrag}
        onPointerCancel={finDrag}
        onDoubleClick={() => {
          if (mode === 'fit') setMode(100)
          else {
            setMode('fit')
            setOffset({ x: 0, y: 0 })
          }
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={zoomed ? 'max-w-none select-none' : 'h-full w-full object-contain select-none'}
          style={
            zoomed
              ? {
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  cursor: glisse ? 'grabbing' : 'grab',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg) scale(${mode / 100})`,
                }
              : { transform: `rotate(${rotation}deg)` }
          }
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-100 bg-white px-3 py-2">
        <button type="button" className={btnOutil(mode === 'fit')} onClick={() => { setMode('fit'); setOffset({ x: 0, y: 0 }) }}>
          {tf('admin.piecesJointes.ajuster')}
        </button>
        <button type="button" className={btnOutil(mode === 100)} onClick={() => setMode(100)}>
          {tf('admin.piecesJointes.tailleReelle')}
        </button>
        <button type="button" className={btnOutil(false)} onClick={() => zoomer(-25)} aria-label={tf('admin.piecesJointes.zoomMoins')}>
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" className={btnOutil(false)} onClick={() => zoomer(25)} aria-label={tf('admin.piecesJointes.zoomPlus')}>
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btnOutil(false)}
          onClick={() => setRotation((r) => r + 90)}
          aria-label={tf('admin.piecesJointes.rotation')}
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function btnOutil(actif) {
  return [
    'inline-flex items-center justify-center rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition',
    actif ? 'bg-success-bg text-institutional' : 'text-gray-700 hover:bg-gray-100',
  ].join(' ')
}

export default function VisionneusePieceJointe({ pieces, index, onIndex, onClose }) {
  const { tf, isRtl } = useLanguage()
  const { peut } = useAdminAuth()
  const peutTelecharger = peut('pieces_jointes.telecharger')
  const piece = pieces[index]
  const cache = useRef(new Map())
  const [etat, setEtat] = useState('chargement')
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [essai, setEssai] = useState(0)

  const revoquerTout = () => {
    for (const entree of cache.current.values()) URL.revokeObjectURL(entree.url)
    cache.current.clear()
  }

  useEffect(() => () => revoquerTout(), [])

  useEffect(() => {
    if (!piece) return undefined
    let ignore = false

    const charger = async () => {
      if (!estPrevisualisable(piece)) {
        setEtat('type')
        setUrl('')
        setMessage(tf('admin.piecesJointes.typeIndispo'))
        return
      }
      const deja = cache.current.get(piece.id_piece)
      if (deja) {
        setUrl(deja.url)
        setEtat('pret')
        return
      }
      setEtat('chargement')
      setUrl('')
      try {
        const res = await adminApi.get(`/admin/pieces-jointes/${piece.id_piece}/apercu`, {
          responseType: 'blob',
        })
        if (ignore) return
        const mime = mimeDepuisType(piece) || res.data.type || 'application/octet-stream'
        const blob = new Blob([res.data], { type: mime })
        const objet = URL.createObjectURL(blob)
        cache.current.set(piece.id_piece, { url: objet, blob })
        setUrl(objet)
        setEtat('pret')
      } catch (err) {
        if (ignore) return
        const status = err.response?.status
        const fallback =
          status === 404
            ? tf('admin.piecesJointes.introuvable')
            : status === 415
              ? tf('admin.piecesJointes.typeIndispo')
              : tf('admin.piecesJointes.reseau')
        const { message: api } = await extractBlobErrors(err, fallback)
        setMessage(api || fallback)
        setEtat(status === 404 ? 'introuvable' : status === 415 ? 'type' : 'reseau')
      }
    }

    charger()
    return () => {
      ignore = true
    }
  }, [piece, tf, essai])

  const aller = useCallback(
    (delta) => {
      const cible = index + delta
      if (cible < 0 || cible >= pieces.length) return
      onIndex(cible)
    },
    [index, onIndex, pieces.length],
  )

  useEffect(() => {
    const onKey = (e) => {
      const prec = isRtl ? 'ArrowRight' : 'ArrowLeft'
      const suiv = isRtl ? 'ArrowLeft' : 'ArrowRight'
      if (e.key === prec) {
        e.preventDefault()
        aller(-1)
      } else if (e.key === suiv) {
        e.preventDefault()
        aller(1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aller, isRtl])

  if (!piece) return null

  const nom = piece.nom_fichier || ''
  const meta = tf('admin.piecesJointes.metaOrigine', {
    origine: libelleOrigine(piece.origine, tf),
    type: typeAffiche(piece),
    taille: formatTaille(piece.taille),
  })
  const pdfNatif = typeof navigator !== 'undefined' && navigator.pdfViewerEnabled !== false && !estMobile()

  const ouvrirOnglet = () => {
    if (!url) return
    window.open(url, '_blank', 'noopener')
  }

  const onTelecharger = () => {
    telecharger(piece, () => {}, {
      introuvable: tf('admin.piecesJointes.telechargementIntrouvable'),
      echec: tf('admin.piecesJointes.telechargementEchec'),
    })
  }

  return (
    <Modal
      open
      viewer
      onClose={onClose}
      closeLabel={tf('admin.piecesJointes.fermer')}
      icon={<IconeType piece={piece} />}
      title={<span title={nom}>{tronquerNomFichier(nom, 48)}</span>}
      subtitle={
        <p>
          {meta}
          {pieces.length > 1 && (
            <span className="ms-2 font-medium text-gray-800">
              {tf('admin.piecesJointes.position', { n: index + 1, total: pieces.length })}
            </span>
          )}
        </p>
      }
      headerActions={
        <>
          {peutTelecharger && (
            <button
              type="button"
              onClick={onTelecharger}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              aria-label={tf('admin.piecesJointes.telechargerFichier', { nom })}
            >
              <Download className="h-4 w-4" aria-hidden />
              {tf('admin.piecesJointes.telecharger')}
            </button>
          )}
          <button
            type="button"
            onClick={ouvrirOnglet}
            disabled={!url}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            aria-label={tf('admin.piecesJointes.nouvelOnglet')}
          >
            <ExternalLink className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            {tf('admin.piecesJointes.nouvelOnglet')}
          </button>
        </>
      }
    >
      <p className="sr-only" aria-live="polite">
        {tf('admin.piecesJointes.annonce', { nom })}
      </p>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {etat === 'chargement' && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {tf('admin.piecesJointes.chargement')}
          </div>
        )}

        {etat === 'pret' && estImage(piece) && (
          <ImageApercu src={url} alt={tf('admin.piecesJointes.apercu', { nom })} tf={tf} />
        )}

        {etat === 'pret' && estPdf(piece) && (
          pdfNatif ? (
            <iframe
              src={url}
              title={tf('admin.piecesJointes.apercu', { nom })}
              className="h-full min-h-0 w-full flex-1 border-0"
            />
          ) : (
            <EncartErreur
              message={tf('admin.piecesJointes.pdfIndispo')}
              onOnglet={ouvrirOnglet}
              onTelecharger={peutTelecharger ? onTelecharger : undefined}
              tf={tf}
            />
          )
        )}

        {(etat === 'introuvable' || etat === 'type' || etat === 'reseau') && (
          <EncartErreur
            message={message}
            onTelecharger={peutTelecharger && (etat === 'type' || etat === 'introuvable') ? onTelecharger : undefined}
            onRetry={etat === 'reseau' ? () => setEssai((n) => n + 1) : undefined}
            tf={tf}
          />
        )}

        {pieces.length > 1 && (
          <>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => aller(-1)}
              className="absolute start-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow disabled:opacity-30"
              aria-label={tf('admin.piecesJointes.precedent')}
            >
              <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              disabled={index === pieces.length - 1}
              onClick={() => aller(1)}
              className="absolute end-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow disabled:opacity-30"
              aria-label={tf('admin.piecesJointes.suivant')}
            >
              <ChevronRight className="h-5 w-5 rtl:-scale-x-100" />
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

function EncartErreur({ message, onOnglet, onTelecharger, onRetry, tf }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="max-w-md text-sm text-gray-700">{message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onOnglet && (
          <button
            type="button"
            onClick={onOnglet}
            className="rounded-[8px] bg-institutional px-4 py-2 text-sm font-medium text-white hover:bg-institutional-hover"
          >
            {tf('admin.piecesJointes.nouvelOnglet')}
          </button>
        )}
        {onTelecharger && (
          <button
            type="button"
            onClick={onTelecharger}
            className="rounded-[8px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-institutional"
          >
            {tf('admin.piecesJointes.telecharger')}
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[8px] bg-institutional px-4 py-2 text-sm font-medium text-white hover:bg-institutional-hover"
          >
            {tf('admin.piecesJointes.retry')}
          </button>
        )}
      </div>
    </div>
  )
}
