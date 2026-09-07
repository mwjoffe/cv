import type { Game } from "./engine";

// Original arcade sounds: no audio files or network requests.
export function playEffect(
  ac: AudioContext,
  output: AudioNode,
  event: Game["event"],
  game: Game,
) {
  if (!event) return;
  if (event === "land" && game.mode === "freestyle") {
    // Staggered claps and several rising/falling "woo" voices make a little crowd.
    const noise = ac.createBuffer(
      1,
      Math.ceil(ac.sampleRate * 0.085),
      ac.sampleRate,
    );
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    for (let i = 0; i < 12; i++) {
      const source = ac.createBufferSource(),
        filter = ac.createBiquadFilter(),
        gain = ac.createGain();
      source.buffer = noise;
      filter.type = "highpass";
      filter.frequency.value = 950;
      gain.gain.value = 0.045;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      source.start(ac.currentTime + i * 0.065 + (i % 3) * 0.025);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
    for (let i = 0; i < 4; i++) {
      const voice = ac.createOscillator(),
        vowel = ac.createBiquadFilter(),
        volume = ac.createGain();
      const t = ac.currentTime + i * 0.085,
        pitch = 240 + i * 42;
      voice.type = "sawtooth";
      voice.frequency.setValueAtTime(pitch, t);
      voice.frequency.exponentialRampToValueAtTime(pitch * 1.65, t + 0.22);
      voice.frequency.exponentialRampToValueAtTime(pitch * 0.85, t + 0.8);
      vowel.type = "bandpass";
      vowel.frequency.value = 760 + i * 110;
      vowel.Q.value = 2.5;
      volume.gain.setValueAtTime(0.001, t);
      volume.gain.linearRampToValueAtTime(0.024, t + 0.1);
      volume.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      voice.connect(vowel);
      vowel.connect(volume);
      volume.connect(output);
      voice.start(t);
      voice.stop(t + 0.9);
      voice.onended = () => {
        voice.disconnect();
        vowel.disconnect();
        volume.disconnect();
      };
    }
    return;
  }
  const osc = ac.createOscillator(),
    gain = ac.createGain();
  const pitch = event === "bail" ? 150 : event === "collect" ? 880 : 330;
  osc.type = event === "bail" ? "sawtooth" : "square";
  osc.frequency.setValueAtTime(pitch, ac.currentTime);
  const duration = event === "bail" ? 0.45 : 0.13;
  if (event === "bail")
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + duration);
  gain.gain.setValueAtTime(0.025, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(output);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.01);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
