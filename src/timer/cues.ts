import type { Cue } from './engine';

type AudioCtor = typeof AudioContext;
const getCtor = (): AudioCtor | undefined =>
  typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext);

/**
 * Beeps and voice for timer cues. Nothing makes a sound until `unlock()` has run from a
 * user gesture (the Start tap), which is what browsers require for audio.
 */
export class CuePlayer {
  private ctx: AudioContext | null = null;
  sound = true;
  voice = false;

  unlock(): void {
    const Ctor = getCtor();
    if (!Ctor) return;
    this.ctx ??= new Ctor();
    void this.ctx.resume();
  }

  private beep(freq: number, ms: number, when = 0): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + when;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.02);
  }

  speak(text: string): void {
    if (!this.voice || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  play(cue: Cue, spoken?: string): void {
    if (this.sound) {
      switch (cue.type) {
        case 'tick':
          this.beep(880, 140);
          break;
        case 'segment_start':
          this.beep(1320, 380);
          break;
        case 'halfway':
          this.beep(660, 160);
          this.beep(660, 160, 0.25);
          break;
        case 'finish':
          this.beep(1100, 300);
          this.beep(1100, 300, 0.4);
          this.beep(1500, 700, 0.8);
          break;
      }
    }
    if (spoken) this.speak(spoken);
  }

  dispose(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    void this.ctx?.close();
    this.ctx = null;
  }
}
