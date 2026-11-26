import { useEffect, useMemo, useState } from 'react'
type ReviewOption = { text: string; correct: boolean; whyWrong?: string }
export type ReviewItem = { id: string; kind: 'learned' | 'wrong'; day: number; scene: string; line: string; pattern: string; meaning: string; example: string; options: ReviewOption[]; chosen?: string; whyWrong?: string }
type Props = { open: boolean; onClose: () => void; learned: ReviewItem[]; wrongNotes: ReviewItem[] }
const key = 'office-review-mastered'
const readMastered = () => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as string[] } catch { return [] } }
export function ReviewModal({ open, onClose, learned, wrongNotes }: Props) {
  const [tab, setTab] = useState<'learned' | 'wrong'>('learned')
  const [query, setQuery] = useState('')
  const [hideMastered, setHideMastered] = useState(false)
  const [mastered, setMastered] = useState<string[]>(readMastered)
  const [quiz, setQuiz] = useState<ReviewItem[] | null>(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  useEffect(() => { if (open) { setQuiz(null); setFinished(false); setQuery('') } }, [open])
  const toggleMastered = (id: string) => setMastered(current => {
    const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* 저장 공간을 쓸 수 없는 환경도 지원합니다. */ }
    return next
  })
  const filtered = useMemo(() => {
    const source = tab === 'learned' ? learned : wrongNotes
    const word = query.trim().toLowerCase()
    return source.filter(item => (!hideMastered || !mastered.includes(item.id)) && (!word || [item.pattern, item.meaning, item.line, item.chosen].filter(Boolean).join(' ').toLowerCase().includes(word))).slice(0, tab === 'learned' ? 60 : 40)
  }, [tab, learned, wrongNotes, query, hideMastered, mastered])
  const startQuiz = () => {
    const pool = [...wrongNotes, ...learned].filter(item => item.options.length === 4)
    const unique = Array.from(new Map(pool.map(item => [item.id, item])).values())
    if (!unique.length) return
    const selected = [...unique].sort(() => Math.random() - .5).slice(0, 5)
    setQuiz(selected); setQuizIndex(0); setPicked(null); setCorrectCount(0); setFinished(false)
  }
  const answer = (index: number) => {
    if (!quiz || picked !== null) return
    setPicked(index)
    const isCorrect = quiz[quizIndex].options[index]?.correct
    window.setTimeout(() => {
      const total = correctCount + (isCorrect ? 1 : 0)
      if (quizIndex === quiz.length - 1) { setCorrectCount(total); setFinished(true) }
      else { setCorrectCount(total); setQuizIndex(value => value + 1); setPicked(null) }
    }, 500)
  }
  if (!open) return null
  if (quiz && finished) return <div className="review-overlay" role="dialog" aria-modal="true" aria-label="복습 퀴즈 결과"><section className="review-modal glass review-quiz"><button className="review-close" onClick={() => setQuiz(null)}>×</button><p className="kicker">REVIEW COMPLETE</p><h2>복습 퀴즈 결과</h2><strong className="quiz-result">{quiz.length}문제 중 {correctCount}개 정답</strong><p>본게임 점수와 기록에는 반영되지 않아요. 가볍게 다시 확인해 보세요.</p><button className="primary-btn" onClick={() => setQuiz(null)}>복습장으로 돌아가기</button></section></div>
  if (quiz) {
    const item = quiz[quizIndex]
    return <div className="review-overlay" role="dialog" aria-modal="true" aria-label="복습 퀴즈"><section className="review-modal glass review-quiz"><button className="review-close" onClick={() => setQuiz(null)}>×</button><p className="kicker">REVIEW QUIZ · {quizIndex + 1}/{quiz.length}</p><h2>{item.line}</h2><p className="review-question">알맞은 표현을 골라 보세요.</p><div className="review-options">{item.options.map((option, index) => <button key={option.text} className={picked === null ? '' : option.correct ? 'right' : picked === index ? 'wrong' : ''} onClick={() => answer(index)}>{String.fromCharCode(65 + index)}. {option.text}</button>)}</div></section></div>
  }
  return <div className="review-overlay" role="dialog" aria-modal="true" aria-label="표현 복습장"><section className="review-modal glass"><div className="review-heading"><div><p className="kicker">STUDY NOTE</p><h2>표현 복습장 / 오답 노트</h2></div><button className="review-close" onClick={onClose} aria-label="복습장 닫기">×</button></div><div className="review-tools"><div className="review-tabs"><button className={tab === 'learned' ? 'active' : ''} onClick={() => setTab('learned')}>배운 표현 <span>{learned.length}</span></button><button className={tab === 'wrong' ? 'active' : ''} onClick={() => setTab('wrong')}>오답 노트 <span>{wrongNotes.length}</span></button></div><button className="primary-btn review-quiz-button" onClick={startQuiz} disabled={!learned.length && !wrongNotes.length}>복습 퀴즈 5문제</button></div><div className="review-filters"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="표현 또는 뜻 검색" aria-label="표현 또는 뜻 검색"/><label><input type="checkbox" checked={hideMastered} onChange={event => setHideMastered(event.target.checked)}/> 외운 것 숨기기</label></div><div className="review-list">{filtered.length === 0 ? <p className="review-empty">{tab === 'learned' ? '아직 배운 표현이 없어요. 장면을 진행하며 표현을 모아 보세요.' : '아직 오답 기록이 없어요. 틀린 문제는 여기에 차곡차곡 모아 드려요.'}</p> : filtered.map(item => <article className={mastered.includes(item.id) ? 'mastered' : ''} key={`${item.kind}-${item.id}`}><div className="review-card-top"><span>DAY {item.day} · {item.scene}</span>{tab === 'learned' && <label className="master-check"><input type="checkbox" checked={mastered.includes(item.id)} onChange={() => toggleMastered(item.id)}/> 외웠어요</label>}</div>{tab === 'learned' ? <><b>{item.pattern}</b><p>{item.meaning}</p><em>{item.example}</em></> : <><strong>{item.line}</strong><p><b>내 답:</b> {item.chosen}</p><p><b>정답:</b> {item.options.find(option => option.correct)?.text}</p><em>{item.whyWrong}</em></>}</article>)}</div></section></div>
}
