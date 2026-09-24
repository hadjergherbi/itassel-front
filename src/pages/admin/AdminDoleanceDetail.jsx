import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleAlert, Pencil } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import AdminHistoryTimeline from '../../components/admin/AdminHistoryTimeline'
import ChangerStatutModal from '../../components/admin/ChangerStatutModal'
import ReaffectationPanel from '../../components/admin/ReaffectationPanel'
import ComplementOuvertCard from '../../components/admin/doleance/ComplementOuvertCard'
import AnnulerComplementModal from '../../components/admin/doleance/AnnulerComplementModal'
import ComplementDemandeur from '../../components/admin/doleance/ComplementDemandeur'
import Complements from '../../components/admin/doleance/Complements'
import RepondreDemandeur from '../../components/admin/doleance/RepondreDemandeur'
import NotesInternes from '../../components/admin/doleance/NotesInternes'
import PiecesJointes from '../../components/admin/doleance/PiecesJointes'
import Reponses from '../../components/admin/doleance/Reponses'
import Notifications from '../../components/admin/doleance/Notifications'
import ReclasserModal from '../../components/admin/doleance/ReclasserModal'
import { Card, Info } from '../../components/admin/doleance/shared'
import Button from '../../components/ui/Button'
import adminApi, { extractErrors } from '../../lib/adminApi'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { nomComplet, statutKey } from '../../lib/statuts'
import { useFormat, useLanguage } from '../../i18n/LanguageContext'
import { rassemblerPieces } from '../../components/admin/doleance/helpers'
import useVisionneuse from '../../components/admin/doleance/useVisionneuse'

export default function AdminDoleanceDetail() {
  const { reference } = useParams()
  const location = useLocation()
  const { estSuperAdmin } = useAdminAuth()
  const { tf } = useLanguage()
  const { formatDate } = useFormat()

  const [dossier, setDossier] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [dossierReaffecte, setDossierReaffecte] = useState(null)
  const [statuts, setStatuts] = useState([])
  const [modeles, setModeles] = useState([])
  const [notice, setNotice] = useState(null)
  const [modalStatut, setModalStatut] = useState(false)
  const [presetStatut, setPresetStatut] = useState(null)
  const [modalAnnuler, setModalAnnuler] = useState(false)
  const [modalReclasser, setModalReclasser] = useState(false)
  const [consulteId, setConsulteId] = useState(null)
  const [busyExamen, setBusyExamen] = useState(false)
  const toutesPieces = useMemo(() => rassemblerPieces(dossier), [dossier])
  const { ouvrir, visionneuse } = useVisionneuse(toutesPieces)

  const charger = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setNotice(null)
        setLoadState('loading')
      }
      try {
        const res = await adminApi.get(`/admin/doleances/${encodeURIComponent(reference)}`)
        setDossier(res.data)
        setDossierReaffecte(null)
        setLoadState('ready')
      } catch (err) {
        const data = err.response?.data
        if (err.response?.status === 403 && data?.code === 'dossier_reaffecte') {
          setDossierReaffecte({
            message: data.message,
            reference: data.reference ?? reference,
            service: data.service,
          })
          setLoadState('reaffecte')
        } else if (err.response?.status === 404 || err.response?.status === 403) {
          setLoadState('notfound')
        } else if (!silent) {
          setLoadState('error')
        }
      }
    },
    [reference],
  )

  useEffect(() => {
    charger()
  }, [charger])

  useEffect(() => {
    if (loadState !== 'ready') return undefined
    const hash = location.hash
    if (hash !== '#notes-internes' && !hash.startsWith('#note-')) return undefined
    const t = window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: hash.startsWith('#note-') ? 'center' : 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [loadState, location.hash, location.key])

  useEffect(() => {
    adminApi.get('/admin/statuts').then((r) => setStatuts(r.data ?? [])).catch(() => {})
    adminApi.get('/admin/modeles-message').then((r) => setModeles(r.data ?? [])).catch(() => {})
  }, [])

  const modelesReponse = useMemo(() => modeles.filter((m) => m.type_usage === 'reponse'), [modeles])
  const modelesComplement = useMemo(() => modeles.filter((m) => m.type_usage === 'complement'), [modeles])

  const onDone = (type, text) => {
    setNotice({ type, text })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (type === 'success' || type === 'error' || type === 'info') charger({ silent: true })
  }

  const ouvrirStatut = (preset = null) => {
    setPresetStatut(preset)
    setModalStatut(true)
  }

  const idComplementRecu = dossier?.complements?.find((c) => c.etat === 'recu')?.id_complement
  const complementConsulte = consulteId === idComplementRecu

  const marquerExamine = async (idComplement) => {
    if (busyExamen || !idComplement) return
    setBusyExamen(true)
    try {
      const res = await adminApi.post(`/admin/complements/${idComplement}/examiner`)
      onDone('success', res.data?.message || tf('admin.detail.examineOk'))
    } catch (err) {
      const code = err.response?.data?.code
      const { message } = extractErrors(err, tf('admin.detail.examineImpossible'))
      onDone(
        'error',
        code === 'etat_invalide'
          ? message || tf('admin.detail.plusEnAttente')
          : message,
      )
    } finally {
      setBusyExamen(false)
    }
  }

  const retour = (
    <Link
      to="/admin/doleances"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition hover:text-institutional"
    >
      <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> {tf('admin.detail.retour')}
    </Link>
  )

  if (loadState === 'loading') {
    return (
      <div className="mx-auto max-w-7xl">
        {retour}
        <p className="text-sm text-gray-500">{tf('admin.detail.chargement')}</p>
      </div>
    )
  }

  if (loadState === 'reaffecte') {
    return (
      <div className="mx-auto max-w-7xl">
        {retour}
        <div className="max-w-lg rounded-[8px] border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-bold text-gray-900">{tf('admin.detail.reaffecteTitre')}</h1>
          <p className="mb-4 text-sm text-gray-700">
            {dossierReaffecte?.message ||
              (dossierReaffecte?.service
                ? tf('admin.detail.reaffecteService', {
                    reference: dossierReaffecte?.reference ?? reference,
                    service: dossierReaffecte.service,
                  })
                : tf('admin.detail.reaffecte', { reference: dossierReaffecte?.reference ?? reference }))}
          </p>
          <Link
            to="/admin/doleances"
            className="inline-flex rounded-[8px] bg-action px-4 py-2 text-sm font-medium text-white"
          >
            {tf('admin.detail.retour')}
          </Link>
        </div>
      </div>
    )
  }

  if (loadState === 'notfound' || loadState === 'error') {
    return (
      <div className="mx-auto max-w-7xl">
        {retour}
        <div className="max-w-lg rounded-[8px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-gray-700">
            {loadState === 'notfound'
              ? tf('admin.detail.introuvable')
              : tf('admin.detail.erreur')}
          </p>
          {loadState === 'error' && (
            <Button onClick={() => charger()}>{tf('admin.detail.retry')}</Button>
          )}
        </div>
      </div>
    )
  }

  const d = dossier
  const complements = d.complements ?? []
  const ouvert = complements.find((c) => c.etat === 'en_attente')
  const recu = complements.find((c) => c.etat === 'recu')
  const autres = complements.filter(
    (c) => c !== ouvert && !(d.complement_a_examiner && c === recu),
  )
  const legacy = d.ancien_classement || statutKey(d.statut) === 'a_reclasser'
  const transitions = d.transitions_autorisees?.length
    ? d.transitions_autorisees
    : statuts.filter((s) => s.id_statut !== d.id_statut && s.id_statut !== d.statut?.id_statut)

  const noticeClass = {
    success: 'border-action/30 bg-[#e6f6ed] text-institutional',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-[#c5d9ee] bg-[#e8f1fb] text-[#1a5f9e]',
  }

  return (
    <div className="mx-auto max-w-7xl">
      {retour}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ltr-isolate font-mono text-2xl font-bold text-institutional">
              {d.reference}
            </h1>
            <StatusBadge status={statutKey(d.statut)} label={d.statut?.libelle} showDot />
            {legacy && <StatusBadge status="a_reclasser" label={tf('admin.detail.ancienClassement')} />}
            {d.complement_a_examiner && (
              <StatusBadge status="en_cours" label={tf('admin.detail.complementRecu')} showDot />
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">{tf('admin.detail.recueLe', { date: formatDate(d.date_depot) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {legacy && estSuperAdmin && (
            <Button variant="secondary" onClick={() => setModalReclasser(true)}>
              {tf('admin.detail.reclasser')}
            </Button>
          )}
          <Button onClick={() => ouvrirStatut(null)}>
            <Pencil className="h-4 w-4" aria-hidden />
            {tf('admin.detail.changerStatut')}
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-6 flex items-start gap-2 rounded-[8px] border px-4 py-3 text-sm ${noticeClass[notice.type] ?? noticeClass.success}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          {notice.type === 'error' && <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          <span>{notice.text}</span>
        </div>
      )}

      {d.complement_a_examiner && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-warning-border bg-warning-bg px-4 py-3">
          <p className="text-sm text-warning-text">
            <span className="font-semibold">{tf('admin.detail.complementNonExamine')}</span>{' '}
            {tf('admin.detail.consulterAvant')}{' '}
            <a href="#complement-demandeur" className="font-medium underline underline-offset-2">
              {tf('admin.detail.allerComplement')}
            </a>
          </p>
          <Button
            disabled={!complementConsulte || busyExamen}
            title={
              complementConsulte ? undefined : tf('admin.detail.consulterDabord')
            }
            onClick={() => marquerExamine(idComplementRecu)}
          >
            <Check className="h-4 w-4" aria-hidden />
            {busyExamen ? tf('admin.detail.enregistrement') : tf('admin.detail.marquerExamine')}
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card title={tf('admin.detail.contenu')}>
            <div className="mb-5 grid gap-4 sm:grid-cols-4">
              <Info label={tf('admin.detail.nature')}>{d.nature?.libelle}</Info>
              <Info label={tf('admin.detail.domaine')}>{d.service?.nom_service}</Info>
              <Info label={tf('admin.detail.qualite')}>{d.qualite?.libelle}</Info>
              <Info label={tf('admin.detail.wilaya')}>{d.wilaya}</Info>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-1 text-xs text-gray-500">{tf('admin.detail.objet')}</p>
              <p className="mb-4 text-base font-semibold text-gray-900">{d.objet}</p>
              <p className="mb-1 text-xs text-gray-500">{tf('admin.detail.description')}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">{d.description}</p>
            </div>
            {d.doleance_initiale && (
              <p className="mt-4 text-sm text-gray-600">
                {tf('admin.detail.doubleDe')}{' '}
                <Link
                  to={`/admin/doleances/${d.doleance_initiale.reference}`}
                  className="ltr-isolate font-mono font-semibold text-institutional hover:underline"
                >
                  {d.doleance_initiale.reference}
                </Link>
              </p>
            )}
          </Card>

          <Card title={tf('admin.detail.demandeur')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Info label={tf('admin.detail.nomPrenom')}>{nomComplet(d)}</Info>
              <Info label={tf('admin.detail.email')}>
                <span className="ltr-isolate">{d.email}</span>
              </Info>
              <Info label={tf('admin.detail.telephone')}>
                <span className="ltr-isolate">{d.telephone}</span>
              </Info>
            </div>
          </Card>

          {ouvert && (
            <ComplementOuvertCard
              complement={ouvert}
              onAnnuler={() => setModalAnnuler(true)}
            />
          )}

          <PiecesJointes
            pieces={d.pieces_jointes}
            onError={(msg) => onDone('error', msg)}
            onOuvrir={ouvrir}
          />

          {d.complement_a_examiner && recu && (
            <ComplementDemandeur
              complement={recu}
              consulte={complementConsulte}
              onConsulter={() => setConsulteId(idComplementRecu)}
              onError={(msg) => onDone('error', msg)}
              onOuvrir={ouvrir}
            />
          )}

          <Complements
            complements={autres}
            onError={(msg) => onDone('error', msg)}
            onOuvrir={ouvrir}
          />
          <Reponses reponses={d.reponses} />
          <RepondreDemandeur dossier={d} modeles={modelesReponse} onDone={onDone} />
          <NotesInternes dossier={d} onRefresh={() => charger({ silent: true })} />
        </div>

        <div className="space-y-6">
          <ReaffectationPanel dossier={d} onDone={onDone} />
          <Notifications notifications={d.notifications} />
          <AdminHistoryTimeline
            historique={d.historique}
            notesInternes={d.notes_internes}
            demandeur={d}
            onDone={onDone}
          />
        </div>
      </div>

      <ChangerStatutModal
        key={`${d.reference}-${presetStatut || 'aucun'}-${modalStatut ? 'ouvert' : 'ferme'}`}
        open={modalStatut}
        onClose={() => {
          setModalStatut(false)
          setPresetStatut(null)
        }}
        dossier={d}
        transitions={transitions}
        modelesComplement={modelesComplement}
        modelesReponse={modelesReponse}
        preset={presetStatut}
        onDone={onDone}
        onAnnulerComplement={() => setModalAnnuler(true)}
      />
      <AnnulerComplementModal
        open={modalAnnuler && Boolean(ouvert)}
        onClose={() => setModalAnnuler(false)}
        complement={ouvert}
        dossier={d}
        onDone={onDone}
        onReaffecte={(data) => {
          setDossierReaffecte({
            message: data?.message,
            reference: data?.reference ?? reference,
            service: data?.service,
          })
          setLoadState('reaffecte')
        }}
      />
      <ReclasserModal
        open={modalReclasser}
        onClose={() => setModalReclasser(false)}
        dossier={d}
        transitions={statuts}
        onDone={onDone}
      />
      {visionneuse}
    </div>
  )
}
