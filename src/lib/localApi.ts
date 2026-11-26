// 브라우저 저장소(localStorage) 기반 백엔드.
// GitHub Pages는 정적 호스팅이라 FastAPI 서버를 함께 올릴 수 없습니다.
// 그래서 backend/main.py의 API 계약(경로·필드·연산)을 그대로 옮겨,
// 플레이 기록·답변·날짜 전환·점수판을 브라우저에 저장합니다.
// 화면 코드(App.tsx)는 서버가 있을 때와 똑같은 응답을 받습니다.

type Row = { [key: string]: any }
type Store = { games: Row[]; answers: Row[]; nextGameId: number; nextAnswerId: number }

const STORE_KEY = 'office-english-quest-store-v1'
const RELATION_KEYS = [
  'sophie_affinity',
  'colleague_1_affinity',
  'colleague_2_affinity',
  'colleague_3_affinity',
  'colleague_4_affinity',
  'colleague_5_affinity',
  'boss_affinity',
  'buyer_affinity',
]
let memoryStore: Store | null = null // 저장소 사용이 막힌 환경(시크릿 모드 등)을 위한 임시 보관

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0)
const blank = (): Store => ({ games: [], answers: [], nextGameId: 1, nextAnswerId: 1 })

const load = (): Store => {
  if (memoryStore) return memoryStore
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
    if (parsed && Array.isArray(parsed.games)) {
      const games = parsed.games as Row[]
      const answers = Array.isArray(parsed.answers) ? (parsed.answers as Row[]) : []
      return {
        games,
        answers,
        nextGameId: num(parsed.nextGameId) || games.reduce((max, game) => Math.max(max, num(game.id)), 0) + 1,
        nextAnswerId: num(parsed.nextAnswerId) || answers.reduce((max, answer) => Math.max(max, num(answer.id)), 0) + 1,
      }
    }
  } catch {
    /* 저장소가 비었거나 읽을 수 없으면 새로 시작합니다. */
  }
  return blank()
}

const persist = (store: Store) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
    memoryStore = null
  } catch {
    memoryStore = store
  }
}

const reply = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const readBody = (init?: RequestInit): Row => {
  try {
    return init?.body ? JSON.parse(String(init.body)) : {}
  } catch {
    return {}
  }
}

const createGame = (body: Row) => {
  const player = String(body?.player ?? '').trim()
  if (!player || player.length > 24) return reply({ detail: '이름은 1~24자로 입력해 주세요.' }, 400)
  const store = load()
  const now = stamp()
  const game: Row = {
    id: store.nextGameId,
    player,
    score: 0,
    grade: 100,
    completed: 0,
    current_scene: 0,
    created_at: now,
    updated_at: now,
    affinity: 0,
    trust: 50,
    coins: 0,
    day: 1,
    flags: '{}',
    learned: '[]',
  }
  RELATION_KEYS.forEach((key) => { game[key] = 0 })
  store.games.push(game)
  store.nextGameId += 1
  persist(store)
  return reply(game)
}

const gameDetail = (id: number) => {
  const store = load()
  const game = store.games.find((row) => num(row.id) === id)
  if (!game) return reply({ detail: '게임 기록을 찾을 수 없습니다.' }, 404)
  const answers = store.answers
    .filter((answer) => num(answer.game_id) === id)
    .map((answer) => ({
      scene_index: answer.scene_index,
      choice_index: answer.choice_index,
      question_index: answer.question_index,
      quiz_id: answer.quiz_id,
      correct: answer.correct,
      points: answer.points,
    }))
  return reply({ ...game, answers })
}

const saveAnswer = (id: number, body: Row) => {
  const store = load()
  const game = store.games.find((row) => num(row.id) === id)
  if (!game) return reply({ detail: '게임 기록을 찾을 수 없습니다.' }, 404)
  const relation = RELATION_KEYS.includes(body?.relationship_key) ? body.relationship_key : 'sophie_affinity'
  store.answers.push({
    id: store.nextAnswerId,
    game_id: id,
    scene_index: num(body?.scene_index),
    choice_index: num(body?.choice_index),
    question_index: num(body?.question_index),
    quiz_id: typeof body?.quiz_id === 'string' ? body.quiz_id : '',
    correct: body?.correct ? 1 : 0,
    points: num(body?.points),
    created_at: stamp(),
  })
  store.nextAnswerId += 1
  game.score = num(game.score) + num(body?.points)
  game.grade = Math.max(0, num(game.grade) + num(body?.grade_delta))
  game.affinity = Math.max(0, num(game.affinity) + num(body?.affinity_delta))
  game.trust = clamp(num(game.trust) + num(body?.trust_delta), 0, 100)
  game.coins = Math.max(0, num(game.coins) + num(body?.coins_delta))
  game[relation] = clamp(num(game[relation]) + num(body?.relationship_delta), 0, 100)
  game.current_scene = num(body?.current_scene)
  game.day = num(body?.day) || 1
  game.flags = JSON.stringify(body?.flags ?? {})
  game.learned = JSON.stringify(body?.learned ?? [])
  game.completed = body?.completed ? 1 : 0
  game.updated_at = stamp()
  persist(store)
  return reply(game)
}

const advanceDay = (id: number, body: Row) => {
  const day = num(body?.day)
  if (![1, 2, 3].includes(day)) return reply({ detail: '올바른 날짜가 아닙니다.' }, 400)
  const store = load()
  const game = store.games.find((row) => num(row.id) === id)
  if (!game) return reply({ detail: '게임 기록을 찾을 수 없습니다.' }, 404)
  game.day = day
  game.current_scene = 0
  game.completed = 0
  game.updated_at = stamp()
  persist(store)
  return reply(game)
}

// 서버의 GROUP BY player / MAX(...) 집계와 같은 결과를 만듭니다.
const leaderboard = () => {
  const store = load()
  const grouped = new Map<string, Row>()
  const takeMax = (current: Row, game: Row, key: string) => Math.max(num(current[key]), num(game[key]))
  store.games.forEach((game) => {
    const player = String(game.player ?? '')
    const current = grouped.get(player)
    if (!current) {
      grouped.set(player, { ...game })
      return
    }
    grouped.set(player, {
      ...current,
      score: takeMax(current, game, 'score'),
      grade: takeMax(current, game, 'grade'),
      affinity: takeMax(current, game, 'affinity'),
      trust: takeMax(current, game, 'trust'),
      coins: takeMax(current, game, 'coins'),
      sophie_affinity: takeMax(current, game, 'sophie_affinity'),
      completed: takeMax(current, game, 'completed'),
      updated_at: String(game.updated_at) > String(current.updated_at) ? game.updated_at : current.updated_at,
    })
  })
  return [...grouped.values()]
    .sort((a, b) => num(b.score) - num(a.score) || num(b.grade) - num(a.grade) || String(a.updated_at).localeCompare(String(b.updated_at)))
    .slice(0, 50)
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

const recentGames = () => {
  const store = load()
  return [...store.games]
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, 30)
}

export async function localApi(endpoint: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const segments = endpoint.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  const [resource, id, action] = segments
  const targetId = num(id)

  if (resource === 'health') return reply({ ok: true })
  if (resource === 'leaderboard' && method === 'GET') return reply(leaderboard())
  if (resource === 'games' && segments.length === 1) {
    if (method === 'POST') return createGame(readBody(init))
    if (method === 'GET') return reply(recentGames())
  }
  if (resource === 'games' && segments.length === 2 && method === 'GET') return gameDetail(targetId)
  if (resource === 'games' && action === 'answers' && method === 'POST') return saveAnswer(targetId, readBody(init))
  if (resource === 'games' && action === 'advance-day' && method === 'POST') return advanceDay(targetId, readBody(init))
  return reply({ detail: '지원하지 않는 요청입니다.' }, 404)
}
