import { useEffect, useRef, useState } from 'react'
type Props = { text: string; speaker: string; onAdvance: () => void; autoAdvanceDelay?: number | null; instant?: boolean }
export function TypeDialogue({ text, speaker, onAdvance, autoAdvanceDelay = null, instant = false }: Props) {
  const [shown, setShown] = useState('')
  const completeRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const textRef = useRef(text)
  const finished = shown.length >= text.length
  useEffect(() => {
    textRef.current = text
    completeRef.current = false
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
    if (instant) {
      setShown(text)
      completeRef.current = true
      return () => undefined
    }
    setShown('')
    let index = 0
    timerRef.current = window.setInterval(() => {
      index += 1
      const next = text.slice(0, index)
      setShown(next)
      if (index >= text.length) {
        completeRef.current = true
        if (timerRef.current !== null) window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, 18)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
      timerRef.current = null
      advanceTimerRef.current = null
    }
  }, [text, instant])
  useEffect(() => {
    if (!finished || autoAdvanceDelay === null) return
    advanceTimerRef.current = window.setTimeout(onAdvance, autoAdvanceDelay)
    return () => {
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [finished, autoAdvanceDelay, onAdvance])
  const handleClick = () => {
    if (!completeRef.current) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
      completeRef.current = true
      setShown(textRef.current)
      return
    }
    onAdvance()
  }
  return <button type="button" className="vn-dialogue" onClick={handleClick} aria-label={finished ? '다음 대화로 진행' : '대사 전체 표시'}>
    <span className="dialogue-name">{speaker}</span>
    <span className="dialogue-text">{shown}</span>
    <span className={`dialogue-next ${finished ? 'ready' : ''}`} aria-hidden="true">▼</span>
  </button>
}
