import { useEffect, useRef, useState } from 'react'
import { FileText, Image as ImageIcon } from 'lucide-react'
import adminApi from '../../../lib/adminApi'
import { estImage, estPdf } from './helpers'

export default function VignettePiece({ piece }) {
  const cadre = useRef(null)
  const [src, setSrc] = useState('')
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!estImage(piece)) return undefined
    const el = cadre.current
    if (!el) return undefined
    let url = ''
    let ignore = false
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        try {
          const res = await adminApi.get(`/admin/pieces-jointes/${piece.id_piece}/apercu`, {
            responseType: 'blob',
          })
          if (ignore) return
          url = URL.createObjectURL(res.data)
          setSrc(url)
        } catch {
          if (!ignore) setErreur(true)
        }
      },
      { rootMargin: '80px' },
    )
    io.observe(el)
    return () => {
      ignore = true
      io.disconnect()
      if (url) URL.revokeObjectURL(url)
    }
  }, [piece])

  return (
    <div
      ref={cadre}
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-gray-100"
    >
      {src && !erreur ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : estPdf(piece) ? (
        <FileText className="h-5 w-5 text-[#b42318]" aria-hidden />
      ) : (
        <ImageIcon className="h-5 w-5 text-institutional" aria-hidden />
      )}
    </div>
  )
}
