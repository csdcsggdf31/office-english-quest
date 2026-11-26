type SoundKind = 'hover' | 'select' | 'dialogue' | 'correct' | 'wrong' | 'affinity' | 'coin' | 'scene' | 'ending'
type Mood = 'bright' | 'warm' | 'night'

class Soundscape {
  private context: AudioContext | null = null
  private bgmGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private timer: number | null = null
  private step = 0
  private mode: Mood = 'bright'
  enabled = true
  bgmLevel = 14
  sfxLevel = 25

  constructor() {
    try {
      this.enabled = localStorage.getItem('office-sound-enabled') !== 'false'
      this.bgmLevel = Number(localStorage.getItem('office-bgm-level') ?? 14)
      this.sfxLevel = Number(localStorage.getItem('office-sfx-level') ?? 25)
    } catch { /* 저장 공간을 사용할 수 없는 환경도 지원합니다. */ }
  }

  activate() {
    if (!this.context) {
      this.context = new AudioContext()
      this.bgmGain = this.context.createGain()
      this.sfxGain = this.context.createGain()
      this.bgmGain.connect(this.context.destination)
      this.sfxGain.connect(this.context.destination)
      this.applyLevels(true)
      this.startLoop()
    }
    if (this.context.state === 'suspended') void this.context.resume()
  }

  private applyLevels(immediate = false) {
    if (!this.context || !this.bgmGain || !this.sfxGain) return
    const at = this.context.currentTime
    const ramp = immediate ? 0.01 : 0.12
    const bgm = this.enabled ? (this.bgmLevel / 100) * 0.16 : 0
    const sfx = this.enabled ? (this.sfxLevel / 100) * 0.25 : 0
    this.bgmGain.gain.cancelScheduledValues(at)
    this.sfxGain.gain.cancelScheduledValues(at)
    this.bgmGain.gain.linearRampToValueAtTime(bgm, at + ramp)
    this.sfxGain.gain.linearRampToValueAtTime(sfx, at + ramp)
  }

  settings() { return { enabled: this.enabled, bgmLevel: this.bgmLevel, sfxLevel: this.sfxLevel } }
  setEnabled(enabled: boolean) { this.enabled = enabled; try { localStorage.setItem('office-sound-enabled', String(enabled)) } catch {}; this.applyLevels() }
  setBgmLevel(level: number) { this.bgmLevel = level; try { localStorage.setItem('office-bgm-level', String(level)) } catch {}; this.applyLevels() }
  setSfxLevel(level: number) { this.sfxLevel = level; try { localStorage.setItem('office-sfx-level', String(level)) } catch {}; this.applyLevels() }

  setMood(mode: Mood) {
    if (this.mode === mode) return
    this.mode = mode
    if (!this.context || !this.bgmGain) return
    const at = this.context.currentTime
    const value = this.enabled ? (this.bgmLevel / 100) * 0.16 : 0
    this.bgmGain.gain.cancelScheduledValues(at)
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, at)
    this.bgmGain.gain.linearRampToValueAtTime(value, at + 1.2)
  }

  private tone(freq: number, duration: number, gain: number, type: OscillatorType, target: GainNode, when = 0) {
    if (!this.context) return
    const start = this.context.currentTime + when
    const osc = this.context.createOscillator()
    const amp = this.context.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.025, duration / 4))
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(amp); amp.connect(target); osc.start(start); osc.stop(start + duration + 0.03)
  }

  private startLoop() {
    if (!this.context || !this.bgmGain || this.timer !== null) return
    const play = () => {
      if (!this.context || !this.bgmGain) return
      const notes = this.mode === 'night' ? [220, 261.63, 329.63, 440] : this.mode === 'warm' ? [174.61, 220, 261.63, 349.23] : [261.63, 329.63, 392, 523.25]
      const note = notes[this.step % notes.length]
      this.tone(note, 0.42, 0.24, 'sine', this.bgmGain)
      this.tone(note * 0.5, 0.78, 0.12, 'triangle', this.bgmGain)
      if (this.step % 4 === 0) this.tone(notes[0] * 0.5, 1.65, 0.17, 'sine', this.bgmGain)
      this.step += 1
    }
    play()
    this.timer = window.setInterval(play, 480)
  }

  play(kind: SoundKind) {
    if (!this.context || !this.sfxGain || !this.enabled) return
    const sound: Record<SoundKind, Array<[number, number, number, OscillatorType, number]>> = {
      hover: [[880, .045, .16, 'sine', 0]], select: [[540, .08, .22, 'triangle', 0]], dialogue: [[300, .06, .1, 'sine', 0]],
      correct: [[523.25, .12, .25, 'sine', 0], [659.25, .18, .25, 'sine', .12]], wrong: [[310, .14, .16, 'sine', 0], [233, .2, .14, 'sine', .12]],
      affinity: [[783.99, .1, .18, 'sine', 0], [1046.5, .24, .16, 'sine', .1]], coin: [[987.77, .07, .2, 'triangle', 0], [1318.51, .14, .16, 'triangle', .07]],
      scene: [[180, .3, .12, 'sine', 0]], ending: [[523.25, .12, .22, 'sine', 0], [659.25, .12, .22, 'sine', .12], [783.99, .12, .22, 'sine', .24], [1046.5, .3, .24, 'sine', .36]],
    }
    sound[kind].forEach(([freq, duration, gain, type, when]) => this.tone(freq, duration, gain, type, this.sfxGain!, when))
  }
}

export const soundscape = new Soundscape()
