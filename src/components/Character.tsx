import { useMemo } from 'react'
type Mood = 'neutral' | 'happy' | 'worried' | 'serious'
const profiles = {
  '소피': { hair: 'hair-sophie', suit: 'suit-sophie', accent: '✦', label: '소피 팀장님' },
  '윤': { hair: 'hair-yoon', suit: 'suit-yoon', accent: '!', label: '윤 동료 1' },
  '민': { hair: 'hair-min', suit: 'suit-min', accent: '✦', label: '민 동료 2' },
  '지아': { hair: 'hair-jia', suit: 'suit-jia', accent: '♥', label: '지아 동료 3' },
  '도현': { hair: 'hair-dohyun', suit: 'suit-dohyun', accent: '!', label: '도현 동료 4' },
  '하린': { hair: 'hair-harin', suit: 'suit-harin', accent: '♥', label: '하린 동료 5' },
  '대표': { hair: 'hair-ceo', suit: 'suit-ceo', accent: '!', label: '대표 사장' },
  '해외 바이어': { hair: 'hair-buyer', suit: 'suit-buyer', accent: '✦', label: '해외 바이어' },
} as const
export function Character({ person, mood = 'neutral' }: { person: string; mood?: Mood }) {
  const key = useMemo(() => Object.keys(profiles).find(name => person.includes(name)) ?? '소피', [person]) as keyof typeof profiles
  const profile = profiles[key]
  const wearsGlasses = key === '민' || key === '대표'
  return <div className={`character-standing ${profile.hair} ${profile.suit} mood-${mood}`} aria-label={`${profile.label} 일러스트`}>
    <div className="character-aura" />
    <div className="emotion-effect" aria-hidden="true">{mood === 'happy' ? '♥' : mood === 'worried' ? '💦' : profile.accent}</div>
    <div className="character-figure">
      <div className="hair-back" />
      <div className="pony-tail" />
      <div className="shoulders"><i /><i /></div>
      <div className="blouse"><i /></div>
      <div className="neck" />
      <div className="face">
        <div className="bangs"><i /><i /><i /></div>
        <div className="brow brow-left" /><div className="brow brow-right" />
        <div className="eye eye-left"><i /><b /></div><div className="eye eye-right"><i /><b /></div>
        {wearsGlasses && <div className="glasses" aria-hidden="true"><i /><i /></div>}
        <div className="blush blush-left" /><div className="blush blush-right" />
        <div className="mouth" />
      </div>
      <div className="hair-front" />
    </div>
  </div>
}
