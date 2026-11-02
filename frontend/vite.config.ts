import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép máy ảo Android (10.0.2.2) và các thiết bị trong mạng LAN kết nối
    port: 5173,
  },
})
