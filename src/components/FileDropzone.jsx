import { useRef, useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { FieldError } from './FormFields'

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 5 * 1024 * 1024

export default function FileDropzone({ file, onChange, error, onError }) {
  const { t } = useLanguage()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const validateAndSet = (next) => {
    if (!next) {
      onError(null)
      onChange(null)
      return
    }
    if (!ACCEPT.includes(next.type) && !/\.(pdf|jpe?g|png)$/i.test(next.name)) {
      onError(t.deposit.errors.fileType)
      return
    }
    if (next.size > MAX_BYTES) {
      onError(t.deposit.errors.fileSize)
      return
    }
    onError(null)
    onChange(next)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const next = e.dataTransfer.files?.[0]
    if (next) validateAndSet(next)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-4 py-8 text-center transition',
          dragging || error
            ? error
              ? 'border-red-400 bg-red-50'
              : 'border-action bg-[#e8f8ef]'
            : 'border-[#9fd4b5] bg-[#f0faf4] hover:border-action',
        ].join(' ')}
      >
        <FileUp className="mb-2 h-7 w-7 text-institutional" aria-hidden />
        <p className="text-sm text-gray-700">
          {t.deposit.request.dropTitle}{' '}
          <span className="font-medium text-action underline-offset-2 hover:underline">
            {t.deposit.request.browse}
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-500">{t.deposit.request.dropHint}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm">
          <span className="truncate text-gray-800">{file.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              validateAndSet(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="inline-flex rounded-[8px] p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Supprimer le fichier"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <FieldError message={error} />
    </div>
  )
}
