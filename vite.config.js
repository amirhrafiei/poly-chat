import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'poly-chat';

// https://vite.dev/config/
export default defineConfig({
   base: `/${repoName}/`, 
  plugins: [react()],
  build: {
    outDir: 'docs',
  }
})
