import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  target: 'http://scheduler-backend:4000',
  changeOrigin: true,
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['scheduler.fmtagency.online'],
    proxy: {
      '/auth': apiProxy,
      '/profile': apiProxy,
      '/employees': apiProxy,
      '/stats': apiProxy,
      '/schedule': apiProxy,
      '/schedules': apiProxy,
      '/shifts': apiProxy,
      '/availability': apiProxy,
      '/requests': apiProxy,
      '/announcements': apiProxy,
      '/fixed-schedules': apiProxy,
      '/uploads': apiProxy,
    },
  },
  plugins: [react()],
})
