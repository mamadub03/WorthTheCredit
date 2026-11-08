import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The backend's CORS list and Auth0's callback URLs name port 5173. Fail loudly
  // instead of quietly moving to 5174, where every API call would be blocked.
  server: { port: 5173, strictPort: true },
})
