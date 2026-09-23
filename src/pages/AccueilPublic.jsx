import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroBanner from '../components/HeroBanner'
import DomainGuide from '../components/DomainGuide'
import HowItWorks from '../components/HowItWorks'
import KeyFigures from '../components/KeyFigures'
import FAQ from '../components/FAQ'

export default function AccueilPublic() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <DomainGuide />
        <HowItWorks />
        <KeyFigures />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
