import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import Modal from './Modal'
import Button from '../ui/Button'
import { FieldError, FieldHelp, FieldLabel, TextInput } from '../FormFields'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { useToast } from '../ui/Toast'
import { endpoints } from '../../lib/endpoints'
import { extractBlobErrors, extractErrors, nomDepuisDisposition } from '../../lib/adminApi'
import {
  datesPourPeriode,
  formatDateNumeric,
  nomService,
  periodeTropLongue,
} from '../../lib/statuts'
import { useLanguage } from '../../i18n/LanguageContext'

const PRESETS = ['30j', '3m', '6m', 'annee', 'perso']

function slugService(nom) {
  return String(nom || 'service')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'service'
}

function paramsExport({ natures, date_debut, date_fin, format, omettreNatures }) {
  const p = new URLSearchParams()
  if (!omettreNatures) natures.forEach((id) => p.append('natures[]', String(id)))
  if (date_debut) p.append('date_debut', date_debut)
  if (date_fin) p.append('date_fin', date_fin)
  if (format) p.append('format', format)
  return p
}

export default function ExportDoleancesModal({ open, onClose }) {
  const { tf } = useLanguage()
  const { utilisateur, estSuperAdmin } = useAdminAuth()
  const toast = useToast()
  const service = nomService(utilisateur)

  const [preset, setPreset] = useState('6m')
  const [dateDebut, setDateDebut] = useState(() => datesPourPeriode('6m').date_debut)
  const [dateFin, setDateFin] = useState(() => datesPourPeriode('6m').date_fin)
  const [natures, setNatures] = useState([])
  const [selection, setSelection] = useState([])
  const [cataloguePret, setCataloguePret] = useState(false)
  const [format, setFormat] = useState('csv')
  const [total, setTotal] = useState(null)
  const [apercuBusy, setApercuBusy] = useState(false)
  const [telechargement, setTelechargement] = useState(false)
  const [erreurPeriode, setErreurPeriode] = useState('')
  const [erreurApi, setErreurApi] = useState('')

  useEffect(() => {
    if (!open) return
    const d = datesPourPeriode('6m')
    setPreset('6m')
    setDateDebut(d.date_debut)
    setDateFin(d.date_fin)
    setFormat('csv')
    setErreurPeriode('')
    setErreurApi('')
    setTotal(null)
    setNatures([])
    setSelection([])
    setCataloguePret(false)
  }, [open])

  const appliquerPreset = (code) => {
    setPreset(code)
    if (code === 'perso') return
    const d = datesPourPeriode(code)
    setDateDebut(d.date_debut)
    setDateFin(d.date_fin)
  }

  const validationPeriode = useMemo(() => {
    if (!dateDebut || !dateFin) return tf('admin.export.datesRequises')
    if (dateFin < dateDebut) return tf('admin.export.dateOrdre')
    if (periodeTropLongue(dateDebut, dateFin)) return tf('admin.export.tropLongue')
    return ''
  }, [dateDebut, dateFin, tf])

  useEffect(() => {
    setErreurPeriode(validationPeriode)
  }, [validationPeriode])

  useEffect(() => {
    if (!open) return undefined
    if (validationPeriode) {
      setTotal(0)
      return undefined
    }
    const timer = setTimeout(() => {
      setApercuBusy(true)
      setErreurApi('')
      const omettreNatures = !cataloguePret
      endpoints
        .apercuExportDoleances(
          paramsExport({
            natures: selection,
            date_debut: dateDebut,
            date_fin: dateFin,
            omettreNatures,
          }),
        )
        .then((res) => {
          const liste = res.data?.par_nature ?? []
          setNatures((prev) => {
            if (!prev.length) return liste
            const map = new Map(liste.map((n) => [n.id_nature, n]))
            return prev.map((n) => map.get(n.id_nature) ?? { ...n, total: 0 })
          })
          setTotal(Number(res.data?.total ?? 0))
          if (!cataloguePret) {
            setSelection(liste.map((n) => n.id_nature))
            setCataloguePret(true)
          }
        })
        .catch((err) => {
          const { message, fields } = extractErrors(err, tf('admin.export.apercuImpossible'))
          setErreurApi(message)
          if (fields.date_debut || fields.date_fin) {
            setErreurPeriode(fields.date_debut || fields.date_fin || message)
          }
        })
        .finally(() => setApercuBusy(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [open, dateDebut, dateFin, selection, cataloguePret, validationPeriode, tf])

  const aucuneNature = selection.length === 0
  const periodeInvalide = Boolean(validationPeriode)
  const zeroResultat = !periodeInvalide && !aucuneNature && total === 0
  const peutTelecharger = !aucuneNature && !periodeInvalide && total > 0 && !telechargement

  const recap = (() => {
    if (aucuneNature) return tf('admin.export.zero')
    if (periodeInvalide) return tf('admin.export.corrigerPeriode')
    const n = total ?? 0
    const label = tf('admin.export.seront', { n })
    const detail = tf(selection.length === 1 ? 'admin.export.detail' : 'admin.export.detailPluriel', {
      n: selection.length,
      debut: formatDateNumeric(dateDebut),
      fin: formatDateNumeric(dateFin),
      format: format.toUpperCase(),
    })
    return `${label} · ${detail}`
  })()

  const telecharger = async () => {
    if (!peutTelecharger) return
    setTelechargement(true)
    setErreurApi('')
    try {
      const res = await endpoints.exportDoleances(
        paramsExport({ natures: selection, date_debut: dateDebut, date_fin: dateFin, format }),
      )
      const type = String(res.headers['content-type'] ?? '')
      if (type.includes('application/json')) {
        const json = JSON.parse(await res.data.text())
        setErreurApi(json.message || tf('admin.export.echec'))
        return
      }
      const fallback = `doleances_${slugService(service)}_${dateDebut}_${dateFin}.${format}`
      const nom = nomDepuisDisposition(res.headers['content-disposition'], fallback)
      const url = URL.createObjectURL(res.data)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = nom
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.show('success', tf('admin.export.telecharge', { nom }))
      onClose()
    } catch (err) {
      const { message, fields } = await extractBlobErrors(err, tf('admin.export.echec'))
      setErreurApi(message)
      if (fields.date_debut || fields.date_fin) {
        setErreurPeriode(fields.date_debut || fields.date_fin || message)
      }
    } finally {
      setTelechargement(false)
    }
  }

  const toutSelectionner = () => setSelection(natures.map((n) => n.id_nature))
  const toutDeselectionner = () => setSelection([])
  const toutCoche = natures.length > 0 && selection.length === natures.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={telechargement}
      icon={<Download className="h-5 w-5" aria-hidden />}
      title={tf('admin.export.titre')}
      subtitle={
        estSuperAdmin
          ? tf('admin.export.introSuper')
          : tf('admin.export.introService', { service })
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={telechargement}>
            {tf('admin.export.annuler')}
          </Button>
          <Button onClick={telecharger} disabled={!peutTelecharger} className="min-w-44">
            {telechargement ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {tf('admin.export.preparation')}
              </>
            ) : format === 'pdf' ? (
              tf('admin.export.pdf')
            ) : (
              tf('admin.export.csv')
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-800">{tf('admin.export.nature')}</p>
            <button
              type="button"
              onClick={toutCoche ? toutDeselectionner : toutSelectionner}
              className="whitespace-nowrap text-xs font-semibold text-institutional hover:underline"
            >
              {toutCoche ? tf('admin.export.toutDeselectionner') : tf('admin.export.toutSelectionner')}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {natures.map((n) => {
              const id = `export-nature-${n.id_nature}`
              const coche = selection.includes(n.id_nature)
              return (
                <label
                  key={n.id_nature}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-gray-200 px-3 py-2 text-sm"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={coche}
                    onChange={() =>
                      setSelection((prev) =>
                        prev.includes(n.id_nature)
                          ? prev.filter((x) => x !== n.id_nature)
                          : [...prev, n.id_nature],
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-institutional focus:ring-institutional"
                  />
                  <span className="flex-1">{n.libelle}</span>
                  <span className="font-mono text-xs text-gray-500">({n.total})</span>
                </label>
              )
            })}
          </div>
          {cataloguePret && aucuneNature && (
            <p className="mt-2 text-sm text-danger-text" role="alert">
              {tf('admin.export.natureRequise')}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-800">{tf('admin.export.periode')}</p>
          <div className="mb-3 inline-flex flex-wrap rounded-[8px] border border-gray-200 bg-gray-50 p-0.5">
            {PRESETS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => appliquerPreset(code)}
                className={[
                  'whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold transition',
                  preset === code ? 'bg-white text-institutional shadow-sm' : 'text-gray-600 hover:text-gray-900',
                ].join(' ')}
              >
                {tf(`admin.export.${code}`)}
              </button>
            ))}
          </div>
          {preset === 'perso' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="export-debut">{tf('admin.export.du')}</FieldLabel>
                <TextInput
                  id="export-debut"
                  type="date"
                  className="ltr-isolate"
                  value={dateDebut}
                  onChange={(e) => {
                    setPreset('perso')
                    setDateDebut(e.target.value)
                  }}
                  error={erreurPeriode}
                />
              </div>
              <div>
                <FieldLabel htmlFor="export-fin">{tf('admin.export.au')}</FieldLabel>
                <TextInput
                  id="export-fin"
                  type="date"
                  className="ltr-isolate"
                  value={dateFin}
                  onChange={(e) => {
                    setPreset('perso')
                    setDateFin(e.target.value)
                  }}
                  error={erreurPeriode}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldHelp>{tf('admin.export.max12')}</FieldHelp>
                <FieldError message={erreurPeriode} />
              </div>
            </div>
          )}
          {preset !== 'perso' && erreurPeriode && <FieldError message={erreurPeriode} />}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-800">{tf('admin.export.formatLabel')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'csv', label: 'CSV', hint: tf('admin.export.hintCsv'), Icon: FileSpreadsheet },
              { id: 'pdf', label: 'PDF', hint: tf('admin.export.hintPdf'), Icon: FileText },
            ].map((f) => (
              <label
                key={f.id}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-[8px] border px-3 py-3 transition',
                  format === f.id ? 'border-institutional bg-success-bg' : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="export-format"
                  value={f.id}
                  checked={format === f.id}
                  onChange={() => setFormat(f.id)}
                  className="mt-1 text-institutional focus:ring-institutional"
                />
                <f.Icon className="mt-0.5 h-5 w-5 text-institutional" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{f.label}</span>
                  <span className="block text-xs text-gray-500">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div
          className="rounded-[8px] bg-gray-50 px-4 py-3 text-sm text-gray-700"
          role="status"
          aria-live="polite"
        >
          {apercuBusy ? tf('admin.export.apercu') : recap}
        </div>

        {zeroResultat && (
          <p className="rounded-[8px] border border-warning-border bg-warning-bg px-3 py-2.5 text-sm text-warning-text" role="status">
            {tf('admin.export.aucunResultat')}
          </p>
        )}

        {erreurApi && (
          <p className="rounded-[8px] bg-danger-bg px-3 py-2.5 text-sm text-danger-text" role="alert">
            {erreurApi}
          </p>
        )}
      </div>
    </Modal>
  )
}
