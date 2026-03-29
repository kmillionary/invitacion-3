import Phaser from "phaser";
import { BootScene } from "./BootScene";
import { RouletteScene } from "./RouletteScene";

export const createGame = (container: HTMLElement): Phaser.Game => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    backgroundColor: "#1b0c16",
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [BootScene, RouletteScene],
  });
};
