import { Howl } from "howler";
import type { GameState } from "../state/types";

const createToneDataUri = (
  frequency: number,
  durationSeconds: number,
  volume = 0.35,
): string => {
  const sampleRate = 22050;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const pcm = new Int16Array(frameCount);

  for (let index = 0; index < frameCount; index += 1) {
    const attack = Math.min(1, index / (sampleRate * 0.015));
    const release = Math.min(1, (frameCount - index) / (sampleRate * 0.04));
    const envelope = Math.min(attack, release);
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate);
    pcm[index] = sample * 32767 * volume * envelope;
  }

  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  pcm.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample, true);
  });

  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:audio/wav;base64,${btoa(binary)}`;
};

export class AudioManager {
  private spin = new Howl({
    src: ["/spin.mp3", createToneDataUri(180, 0.18, 0.3)],
    volume: 0.65,
    html5: true,
  });
  private win = new Howl({
    src: ["/coins.mp3", createToneDataUri(640, 0.22, 0.35)],
    volume: 0.55,
    html5: true,
  });
  private loseVariants = [
    new Howl({ src: ["/kiss-1.mp3", createToneDataUri(220, 0.28, 0.32)], volume: 0.55, html5: true }),
    new Howl({ src: ["/kiss-2.mp3", createToneDataUri(240, 0.28, 0.32)], volume: 0.55, html5: true }),
    new Howl({ src: ["/kiss-3.mp3", createToneDataUri(260, 0.28, 0.32)], volume: 0.55, html5: true }),
  ];
  private unlock = new Howl({
    src: ["/special-price.mp3", createToneDataUri(880, 0.3, 0.3)],
    volume: 0.55,
    html5: true,
  });
  private powerUp = new Howl({
    src: ["/power-up.mp3", createToneDataUri(960, 0.35, 0.3)],
    volume: 0.55,
    html5: true,
  });
  private jackpot = new Howl({
    src: ["/jackpot.mp3", createToneDataUri(1080, 0.8, 0.3)],
    volume: 0.65,
    html5: true,
  });
  private purchase = new Howl({
    src: ["/purchase.mp3", createToneDataUri(720, 0.35, 0.3)],
    volume: 0.58,
    html5: true,
  });
  private reveal = new Howl({
    src: ["/reward.mp3", createToneDataUri(520, 0.9, 0.22)],
    volume: 0.5,
    html5: true,
  });
  private music = new Howl({
    src: ["/background.mp3", createToneDataUri(262, 1.8, 0.16)],
    loop: true,
    volume: 0.28,
    html5: true,
  });

  sync(state: GameState): void {
    if (!state.audioEnabled || !state.musicEnabled) {
      this.music.stop();
      return;
    }

    if (!this.music.playing()) {
      this.music.play();
    }
  }

  playSpin(state: GameState): void {
    if (state.audioEnabled) {
      this.spin.play();
    }
  }

  playTone(
    tone: GameState["lastOutcomeTone"],
    state: GameState,
    audioCue?: "coins" | "kiss" | "special-price" | "power-up" | "jackpot" | "purchase",
  ): "coins" | "kiss-1" | "kiss-2" | "kiss-3" | "special-price" | "power-up" | "jackpot" | "purchase" | "none" {
    if (!state.audioEnabled) {
      return "none";
    }

    if (audioCue === "jackpot") {
      this.jackpot.play();
      return "jackpot";
    } else if (audioCue === "purchase") {
      this.purchase.play();
      return "purchase";
    } else if (audioCue === "power-up") {
      this.powerUp.play();
      return "power-up";
    } else if (audioCue === "special-price") {
      this.unlock.play();
      return "special-price";
    } else if (audioCue === "coins" || tone === "win") {
      this.win.play();
      return "coins";
    } else if (audioCue === "kiss" || tone === "loss") {
      const randomIndex = Math.floor(Math.random() * this.loseVariants.length);
      this.loseVariants[randomIndex].play();
      return `kiss-${randomIndex + 1}` as "kiss-1" | "kiss-2" | "kiss-3";
    } else if (tone === "special") {
      this.unlock.play();
      return "special-price";
    }

    return "none";
  }

  playReveal(state: GameState): void {
    if (state.audioEnabled) {
      this.reveal.play();
    }
  }

  stopJackpot(): void {
    this.jackpot.stop();
  }
}

export const audioManager = new AudioManager();
