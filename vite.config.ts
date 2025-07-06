import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react'
import path from "path"
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [
      "4338-88-159-114-129.ngrok-free.app"
    ]
  }
})