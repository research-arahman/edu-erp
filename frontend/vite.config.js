import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // In development, forward all API paths to FastAPI so the browser
      // never makes a cross-origin request and CORS is not involved.
      // Add new top-level route prefixes here as the API grows.
      '^/(countries|institutes|selector|candidates|employers|jobs|inquiries|tasks|accounting|industries|health)':
        'http://127.0.0.1:8000',
    },
  },
})
