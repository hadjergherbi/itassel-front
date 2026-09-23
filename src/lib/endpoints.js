import adminApi from './adminApi'
import api from './api'

export const endpoints = {
  tableauDeBord: (params) => adminApi.get('/admin/tableau-de-bord', { params }),
  doleances: (params) => adminApi.get('/admin/doleances', { params }),
  doleance: (reference) => adminApi.get(`/admin/doleances/${encodeURIComponent(reference)}`),
  exportDoleances: (params) =>
    adminApi.get('/admin/doleances/export', { params, responseType: 'blob' }),
  reclasser: (reference, body) => adminApi.post(`/admin/doleances/${reference}/reclasser`, body),
  reaffecter: (reference, body) =>
    adminApi.post(`/admin/doleances/${encodeURIComponent(reference)}/reaffecter`, body),

  services: () => adminApi.get('/admin/services'),
  creerService: (body) => adminApi.post('/admin/services', body),
  modifierService: (id, body) => adminApi.put(`/admin/services/${id}`, body),
  designerResponsable: (idService, idResponsable) =>
    adminApi.put(`/admin/services/${idService}/responsable`, { id_responsable: idResponsable }),
  responsablesPossibles: (idService) =>
    adminApi.get(`/admin/services/${idService}/responsables-possibles`),

  utilisateurs: (params) => adminApi.get('/admin/utilisateurs', { params }),
  impactUtilisateur: (id) => adminApi.get(`/admin/utilisateurs/${id}/impact`),
  creerUtilisateur: (body) => adminApi.post('/admin/utilisateurs', body),
  modifierUtilisateur: (id, body) => adminApi.put(`/admin/utilisateurs/${id}`, body),
  supprimerUtilisateur: (id) => adminApi.delete(`/admin/utilisateurs/${id}`),
  activerUtilisateur: (id) => adminApi.post(`/admin/utilisateurs/${id}/activer`),
  desactiverUtilisateur: (id, idRemplacant) =>
    adminApi.post(`/admin/utilisateurs/${id}/desactiver`, { id_remplacant: idRemplacant }),
  renvoyerInvitation: (id) => adminApi.post(`/admin/utilisateurs/${id}/renvoyer-invitation`),
  reinitialiserMdp: (id) => adminApi.post(`/admin/utilisateurs/${id}/reinitialiser-mot-de-passe`),

  roles: () => adminApi.get('/admin/roles'),
  permissions: () => adminApi.get('/admin/permissions'),
  majPermissionsRole: (code, codes) =>
    adminApi.put(`/admin/roles/${code}/permissions`, { permissions: codes }),

  referentiel: (type) => adminApi.get(`/admin/parametres/${type}`),
  creerReferentiel: (type, body) => adminApi.post(`/admin/parametres/${type}`, body),
  modifierReferentiel: (type, id, body) => adminApi.put(`/admin/parametres/${type}/${id}`, body),
  supprimerReferentiel: (type, id) => adminApi.delete(`/admin/parametres/${type}/${id}`),
  notifications: () => adminApi.get('/admin/parametres/notifications'),
  sauverNotifications: (body) => adminApi.put('/admin/parametres/notifications', body),

  annulerComplement: (id, body) => adminApi.post(`/admin/complements/${id}/annuler`, body),

  logsDashboard: () => adminApi.get('/admin/journaux/tableau-de-bord'),
  journal: (params) => adminApi.get('/admin/journaux', { params }),
  exportJournal: (params) =>
    adminApi.get('/admin/journaux/export', { params, responseType: 'blob' }),

  verifierJeton: (jeton) => api.post('/admin/mot-de-passe/verifier-jeton', { jeton }),
  definirMotDePasse: (body) => api.post('/admin/mot-de-passe/definir', body),
}
