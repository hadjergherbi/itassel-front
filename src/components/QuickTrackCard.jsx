import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { useState } from 'react'

export default function QuickTrackCard() {
  const { t, isRtl } = useLanguage()
  const [ref, setRef] = useState('')
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  const handleSubmit = (e) => {
    e.preventDefault()
  }

  return (
    <div className="rounded-[8px] bg-white p-5 shadow-lg shadow-black/10 sm:p-6">
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-5 w-5 text-institutional" aria-hidden />
        <h2 className="text-lg font-bold text-gray-900">{t.quickTrack.title}</h2>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-gray-600">{t.quickTrack.help}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="quick-ref"
            className="mb-1.5 block text-sm font-medium text-gray-800"
          >
            {t.quickTrack.label}
          </label>
          <input
            id="quick-ref"
            type="text"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder={t.quickTrack.placeholder}
            className="w-full rounded-[8px] border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-institutional focus:ring-2 focus:ring-institutional/20"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040]"
        >
          {t.quickTrack.submit}
          <Arrow className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        {t.quickTrack.noFile}{' '}
        <Link
          to="/deposer"
          className="font-medium text-institutional underline-offset-2 hover:underline"
        >
          {t.quickTrack.depositNow}
        </Link>
      </p>
    </div>
  )
}
