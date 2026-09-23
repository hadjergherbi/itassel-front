import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import AccueilPublic from './pages/AccueilPublic'
import DeposerDoleance from './pages/DeposerDoleance'
import ConfirmationDepot from './pages/ConfirmationDepot'
import SuivreDemande from './pages/SuivreDemande'
import SuiviDossier from './pages/SuiviDossier'

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AccueilPublic />} />
          <Route path="/deposer" element={<DeposerDoleance />} />
          <Route path="/confirmation" element={<ConfirmationDepot />} />
          <Route path="/deposer/confirmation" element={<ConfirmationDepot />} />
          <Route path="/suivre" element={<SuivreDemande />} />
          <Route path="/suivre/dossier" element={<SuiviDossier />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
