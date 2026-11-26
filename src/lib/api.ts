import { localApi } from './localApi'

// 개발 서버(npm run dev)에서는 vite.config.ts의 프록시를 통해 FastAPI로 갑니다.
// 배포 빌드(GitHub Pages)는 서버가 없으므로 브라우저 저장소 백엔드를 씁니다.
const remote = (endpoint: string, init?: RequestInit) =>
  fetch(import.meta.env.BASE_URL + 'api/' + endpoint.replace(/^\/+/, ''), init)

export const api = async (endpoint: string, init?: RequestInit): Promise<Response> => {
  if (!import.meta.env.DEV) return localApi(endpoint, init)
  try {
    return await remote(endpoint, init)
  } catch {
    // 로컬 백엔드를 띄우지 않았을 때도 화면이 막히지 않도록 저장소로 대체합니다.
    return localApi(endpoint, init)
  }
}
