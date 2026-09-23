import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useLanguage } from '../i18n/LanguageContext'

export default function PlaceholderPage({ titleKey }) {
  const { t } = useLanguage()
  const title = titleKey === 'deposit' ? t.nav.deposit : t.nav.track

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start px-4 py-16 sm:px-6">
        <h1 className="mb-3 text-2xl font-bold text-institutional">{title}</h1>
        <p className="mb-6 text-sm text-gray-600">
          Cet écran sera construit prochainement.
        </p>
        <Link
          to="/"
          className="rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white"
        >
          {t.nav.home}
        </Link>
      </main>
      <Footer />
    </div>
  )
}
