import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 배포 빌드는 GitHub Pages 프로젝트 경로(/office-english-quest/)에서 열리므로
// 자산 경로를 그에 맞춰 잡습니다. 개발 서버는 루트(/)에서 실행됩니다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/office-english-quest/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '^(/preview/[^/]+)?/api/': {
        target: 'http://127.0.0.1:8000',
        rewrite: (p) => p.replace(/^\/preview\/[^/]+/, ''),
      },
    },
  },
}))
