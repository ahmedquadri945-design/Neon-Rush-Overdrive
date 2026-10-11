// Fully procedural sound via the Web Audio API — engine hum, nitro whoosh,
// impacts, pickups and UI blips. No audio assets required.

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  private engineGain: GainNode | null = null;
  private engineOscA: OscillatorNode | null = null;
  private engineOscB: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private boostSrc: AudioBufferSourceNode | null = null;
  private boostGain: GainNode | null = null;
  private boostFilter: BiquadFilterNode | null = null;

  private ready = false;

  get isMuted() {
    return this.muted;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ready) {
      this.ctx?.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(ctx.destination);

      // noise buffer (reused for whoosh + impacts)
      const len = ctx.sampleRate * 1.2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;

      // engine: two detuned saws -> lowpass -> gain
      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 700;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineFilter.connect(this.engineGain).connect(this.master);

      this.engineOscA = ctx.createOscillator();
      this.engineOscA.type = "sawtooth";
      this.engineOscB = ctx.createOscillator();
      this.engineOscB.type = "square";
      this.engineOscA.connect(this.engineFilter);
      this.engineOscB.connect(this.engineFilter);
      this.engineOscA.start();
      this.engineOscB.start();

      // boost whoosh loop (looping noise through bandpass)
      this.boostFilter = ctx.createBiquadFilter();
      this.boostFilter.type = "bandpass";
      this.boostFilter.frequency.value = 900;
      this.boostFilter.Q.value = 0.8;
      this.boostGain = ctx.createGain();
      this.boostGain.gain.value = 0;
      this.boostFilter.connect(this.boostGain).connect(this.master);
      this.boostSrc = ctx.createBufferSource();
      this.boostSrc.buffer = buf;
      this.boostSrc.loop = true;
      this.boostSrc.connect(this.boostFilter);
      this.boostSrc.start();

      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  }

  /** speedRatio 0..1, boosting 0..1 */
  setEngine(speedRatio: number, boosting: number) {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 55 + speedRatio * 150 + boosting * 60;
    this.engineOscA?.frequency.setTargetAtTime(base, t, 0.08);
    this.engineOscB?.frequency.setTargetAtTime(base * 0.5 + 2, t, 0.08);
    this.engineFilter?.frequency.setTargetAtTime(500 + speedRatio * 1800 + boosting * 1200, t, 0.1);
    this.engineGain?.gain.setTargetAtTime(0.05 + speedRatio * 0.06, t, 0.1);
    this.boostGain?.gain.setTargetAtTime(boosting * 0.16, t, 0.08);
    this.boostFilter?.frequency.setTargetAtTime(700 + boosting * 1600, t, 0.1);
  }

  private noiseBurst(dur: number, freq: number, gain: number, type: BiquadFilterType = "bandpass") {
    if (!this.ready || !this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType = "sine", endFreq?: number) {
    if (!this.ready || !this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(this.master!);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  playCollision() {
    this.noiseBurst(0.5, 220, 0.5, "lowpass");
    this.tone(120, 0.4, 0.5, "square", 40);
  }
  playScrape() {
    this.noiseBurst(0.18, 1800, 0.16, "bandpass");
  }
  playNearMiss() {
    this.noiseBurst(0.28, 1400, 0.2, "bandpass");
    this.tone(660, 0.12, 0.06, "sine", 990);
  }
  playPickup() {
    this.tone(720, 0.12, 0.18, "triangle", 1180);
    this.tone(1080, 0.16, 0.1, "sine", 1500);
  }
  playBoostStart() {
    this.tone(180, 0.5, 0.22, "sawtooth", 720);
    this.noiseBurst(0.6, 500, 0.2, "bandpass");
  }
  playUI() {
    this.tone(520, 0.07, 0.14, "square", 720);
  }
  playGameOver() {
    this.tone(300, 0.7, 0.28, "sawtooth", 70);
    this.noiseBurst(0.8, 200, 0.3, "lowpass");
  }

  stopAll() {
    if (!this.ctx) return;
    this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.boostGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }
}
