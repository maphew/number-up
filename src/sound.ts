// Sound cues (num-ak7): every action gets a small, short, subtle audio
// augmentation. Nothing plays from files — every cue is pre-generated into an
// AudioBuffer at first gesture, then played back as-is. Playing muted must
// still feel the cue: see the #vignette companion.
export type Signal =
  | 'happy'    // Number went UP
  | 'sad'      // Number went DOWN
  | 'flat'     // no change (swap, ground)
  | 'pickup'   // an operator rides on Number — energised
  | 'consume'  // a number is eaten by an armed operator
  | 'blocked'  // edge, hole
  | 'over'     // run over
  | 'start';   // fresh run

export interface SoundKit {
  play(sig: Signal): boolean;
  toggle(): boolean;
  readonly enabled: boolean;
}

interface Voice {
  wave: 'sine' | 'tri' | 'square' | 'noise';
  f0: number;
  f1?: number;
  amp: number;
  onset?: number;
  dur: number;
  tau?: number;
  attack?: number;
}

const SR_BASE = 44100;

function waveAt(wave: Voice['wave'], phase: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(phase);
    case 'tri':
      return Math.asin(Math.sin(phase)) * (2 / Math.PI);
    case 'square':
      return Math.sin(phase) >= 0 ? 0.7 : -0.7;
    case 'noise':
      return Math.random() * 2 - 1;
  }
}

const RECIPES: Record<Signal, { dur: number; voices: Voice[] }> = {
  happy: {
    dur: 0.13,
    voices: [
      { wave: 'sine', f0: 523, f1: 784, amp: 0.5, dur: 0.12, tau: 0.05 },
      { wave: 'sine', f0: 1046, f1: 1568, amp: 0.16, dur: 0.11, tau: 0.04 },
    ],
  },
  sad: {
    dur: 0.19,
    voices: [
      { wave: 'sine', f0: 415, f1: 262, amp: 0.5, dur: 0.17, tau: 0.07 },
      { wave: 'sine', f0: 208, f1: 131, amp: 0.2, dur: 0.17, tau: 0.08 },
    ],
  },
  flat: {
    dur: 0.07,
    voices: [{ wave: 'sine', f0: 330, amp: 0.3, dur: 0.06, tau: 0.025 }],
  },
  pickup: {
    dur: 0.18,
    voices: [
      { wave: 'tri', f0: 659, amp: 0.45, dur: 0.05, tau: 0.02 },
      { wave: 'tri', f0: 988, amp: 0.4, onset: 0.03, dur: 0.06, tau: 0.02 },
      { wave: 'tri', f0: 1319, amp: 0.45, onset: 0.06, dur: 0.11, tau: 0.03 },
      { wave: 'sine', f0: 2637, amp: 0.08, onset: 0.07, dur: 0.08, tau: 0.02 },
    ],
  },
  consume: {
    dur: 0.16,
    voices: [
      { wave: 'noise', f0: 0, amp: 0.4, dur: 0.06, tau: 0.025, attack: 0.002 },
      { wave: 'sine', f0: 196, f1: 98, amp: 0.45, dur: 0.15, tau: 0.07 },
    ],
  },
  blocked: {
    dur: 0.09,
    voices: [
      { wave: 'square', f0: 96, amp: 0.28, dur: 0.08, tau: 0.035, attack: 0.002 },
      { wave: 'sine', f0: 64, amp: 0.2, dur: 0.08, tau: 0.04, attack: 0.002 },
    ],
  },
  over: {
    dur: 0.6,
    voices: [
      { wave: 'sine', f0: 311, f1: 98, amp: 0.5, dur: 0.55, tau: 0.2 },
      { wave: 'sine', f0: 156, f1: 49, amp: 0.25, dur: 0.55, tau: 0.22 },
    ],
  },
  start: {
    dur: 0.1,
    voices: [
      { wave: 'tri', f0: 392, amp: 0.3, dur: 0.06, tau: 0.03 },
      { wave: 'tri', f0: 660, amp: 0.2, onset: 0.04, dur: 0.05, tau: 0.02 },
    ],
  },
};

export function createSoundKit(): SoundKit {
  let enabled = true;
  let unlocked = false; // a user gesture has opened the AudioContext at least once
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  const buffers = new Map<Signal, AudioBuffer>();

  function render(recipe: { dur: number; voices: Voice[] }): AudioBuffer {
    const c = ctx as AudioContext;
    const sr = c.sampleRate || SR_BASE;
    const n = Math.ceil(recipe.dur * sr);
    const buf = c.createBuffer(1, n, sr);
    const data = buf.getChannelData(0);
    for (const v of recipe.voices) {
      const onset = v.onset ?? 0;
      const attack = v.attack ?? 0.004;
      const tau = v.tau ?? recipe.dur / 2;
      const f0 = v.f0;
      const f1 = v.f1 ?? v.f0;
      const tSpan = Math.max(v.dur, 1e-4);
      let phase = 0;
      const i0 = Math.floor(onset * sr);
      const i1 = Math.min(n, Math.floor((onset + tSpan) * sr));
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / sr;
        const r = f1 / f0;
        const f = f1 === undefined ? f0 : f0 * Math.exp(Math.log(r) * (t / tSpan));
        phase += (2 * Math.PI * f) / sr;
        if (t < attack) {
          data[i] = (data[i] ?? 0) + waveAt(v.wave, phase) * (t / attack) * v.amp;
          continue;
        }
        const back = Math.exp(-(t - attack) / tau);
        data[i] = (data[i] ?? 0) + waveAt(v.wave, phase) * back * v.amp;
      }
    }
    return buf;
  }

  function ensure(): void {
    if (ctx !== null && master !== null) {
      return;
    }
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC === undefined) {
      enabled = false;
      return;
    }
    try {
      ctx = new AC();
    } catch {
      enabled = false;
      return;
    }
    master = ctx.createGain();
    master.gain.value = 0.15; // subtle: cues augment, they never shout
    master.connect(ctx.destination);
    for (const sig of Object.keys(RECIPES) as Signal[]) {
      buffers.set(sig, render(RECIPES[sig]));
    }
  }

  return {
    // Returns whether the cue is reaching (or will reach) the speakers — a
    // still-locked AudioContext answers no, so callers can skip scheduling
    // second-half staggers that would land in silence.
    play(sig): boolean {
      if (!enabled) return false;
      ensure();
      const c = ctx;
      const m = master;
      if (c === null || m === null) return false;
      // The first user gesture (a move, a key, a tap) may find the context
      // suspended; resume it and play that move's cue on it. Pre-gesture cues
      // only ever come from restart(), which runs on load — skip those so
      // nothing plays late.
      if (c.state === 'suspended') {
        if (!unlocked) {
          if (sig === 'start') return false;
          unlocked = true;
        }
        void c.resume().then(() => {
          const buf = buffers.get(sig);
          if (!buf || c.state === 'suspended') return; // the vignette carries it
          const src = c.createBufferSource();
          src.buffer = buf;
          if (master !== null) src.connect(master);
          src.start();
        });
        return true;
      }
      const buf = buffers.get(sig);
      if (!buf) return false;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(m);
      src.start();
      return true;
    },
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    get enabled() {
      return enabled;
    },
  };
}
