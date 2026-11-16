// VOID BLOOM — sound. Everything is synthesised with WebAudio: no audio
// files, nothing to load. Short shaped blips for the play sounds (petals,
// hits, pollen, dash, hurt, growth), a low pad and a sparse music-box pluck
// for the night underneath, and a soft bell when a new bell of the night
// begins. The context wakes on the first key or click, as browsers require.

const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic steps from the root
const ROOT = 196; // G3
const CHORDS = [
  [0, 3, 7, 12],
  [-4, 0, 3, 7],
  [-2, 2, 5, 10],
  [-7, -2, 2, 5],
];

function noteFreq(semiFromRoot) {
  return ROOT * Math.pow(2, semiFromRoot / 12);
}

export class SoundGarden {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.chordIndex = 0;
    this.step = 0;
  }

  /** Create/resume the context. Safe to call on every gesture. */
  wake() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  /** One shaped tone: the brick every sound here is built from. */
  tone({ freq = 440, end = null, seconds = 0.15, type = 'sine', gain = 0.2, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + seconds);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  /** A breath of filtered noise, for hits and bursts. */
  noise({ seconds = 0.12, gain = 0.15, freq = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const amp = this.ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t0);
  }

  shoot() {
    this.tone({ freq: 740, end: 420, seconds: 0.07, type: 'triangle', gain: 0.05 });
  }

  wisp() {
    this.tone({ freq: 980, end: 1320, seconds: 0.09, type: 'sine', gain: 0.045 });
  }

  hit() {
    this.noise({ seconds: 0.05, gain: 0.06, freq: 2400 });
  }

  kill() {
    this.tone({ freq: 320, end: 90, seconds: 0.14, type: 'square', gain: 0.06 });
    this.noise({ seconds: 0.1, gain: 0.05, freq: 900 });
  }

  pickup(step) {
    const lift = SCALE[step % SCALE.length] + 12;
    this.tone({ freq: noteFreq(lift), seconds: 0.1, type: 'sine', gain: 0.055 });
  }

  hurt() {
    this.tone({ freq: 180, end: 60, seconds: 0.22, type: 'sawtooth', gain: 0.12 });
    this.noise({ seconds: 0.16, gain: 0.08, freq: 500 });
  }

  dash() {
    this.noise({ seconds: 0.14, gain: 0.05, freq: 3200 });
    this.tone({ freq: 520, end: 880, seconds: 0.1, type: 'sine', gain: 0.03 });
  }

  nova() {
    this.tone({ freq: 240, end: 1240, seconds: 0.3, type: 'triangle', gain: 0.09 });
    this.noise({ seconds: 0.24, gain: 0.05, freq: 1600 });
  }

  levelup() {
    [0, 3, 7, 12].forEach((step, i) => {
      this.tone({ freq: noteFreq(step + 12), seconds: 0.22, type: 'triangle', gain: 0.09, delay: i * 0.07 });
    });
  }

  graft() {
    [7, 12, 19].forEach((step, i) => {
      this.tone({ freq: noteFreq(step), seconds: 0.3, type: 'sine', gain: 0.08, delay: i * 0.09 });
    });
  }

  bell() {
    this.tone({ freq: noteFreq(12) * 2, seconds: 1.1, type: 'sine', gain: 0.1 });
    this.tone({ freq: noteFreq(12) * 3, seconds: 0.7, type: 'sine', gain: 0.03 });
  }

  boss() {
    this.tone({ freq: 98, end: 49, seconds: 0.9, type: 'sawtooth', gain: 0.14 });
    this.tone({ freq: 147, end: 73, seconds: 0.9, type: 'square', gain: 0.06, delay: 0.05 });
  }

  win() {
    [0, 3, 7, 12, 15, 19, 24].forEach((step, i) => {
      this.tone({ freq: noteFreq(step + 12), seconds: 0.5, type: 'triangle', gain: 0.09, delay: i * 0.11 });
    });
  }

  lose() {
    [12, 10, 7, 3, 0].forEach((step, i) => {
      this.tone({ freq: noteFreq(step), seconds: 0.5, type: 'triangle', gain: 0.09, delay: i * 0.16 });
    });
  }

  click() {
    this.tone({ freq: 660, seconds: 0.06, type: 'triangle', gain: 0.06 });
  }

  /** Start the night music: a slow pad cycling four chords, a plucked
   *  pentatonic line over it, scheduled a beat at a time. */
  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    const beat = () => {
      if (this.muted) return;
      const chord = CHORDS[this.chordIndex % CHORDS.length];
      if (this.step % 8 === 0) {
        for (const semi of chord) {
          this.tone({ freq: noteFreq(semi - 12) / 1, seconds: 3.6, type: 'sine', gain: 0.028 });
        }
        this.chordIndex += 1;
      }
      if (this.step % 2 === 0 && Math.random() < 0.72) {
        const semi = chord[Math.floor(Math.random() * chord.length)] + 12;
        this.tone({ freq: noteFreq(semi), seconds: 0.5, type: 'triangle', gain: 0.035 });
      }
      this.step += 1;
    };
    beat();
    this.musicTimer = window.setInterval(beat, 460);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
