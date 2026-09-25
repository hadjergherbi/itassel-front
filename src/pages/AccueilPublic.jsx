import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroBanner from '../components/HeroBanner'
import HowItWorks from '../components/HowItWorks'

export default function AccueilPublic() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
