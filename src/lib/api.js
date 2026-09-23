import axios from 'axios'

// Client unique pour appeler le backend Laravel.
// L'adresse vient du fichier .env (VITE_API_URL).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

export default api