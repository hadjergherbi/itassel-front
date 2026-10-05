import axios from 'axios'
import { urlApi } from './urlApi'

// Client unique pour appeler le backend Laravel.
// L'adresse vient du fichier .env (VITE_API_URL).
const api = axios.create({
  baseURL: urlApi(),
  headers: {
    Accept: 'application/json',
  },
})

export default api