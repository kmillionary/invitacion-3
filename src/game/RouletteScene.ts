import Phaser from "phaser";
import { store } from "../state/store";
import type { GameState, WheelSegment } from "../state/types";

const FULL_ROTATION = Math.PI * 2;

export class RouletteScene extends Phaser.Scene {
  private wheelContainer?: Phaser.GameObjects.Container;
  private messageText?: Phaser.GameObjects.Text;
  private backgroundGradient?: Phaser.GameObjects.Graphics;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private pointerTriangle?: Phaser.GameObjects.Triangle;
  private pointerRing?: Phaser.GameObjects.Arc;
  private pointerSparkle?: Phaser.GameObjects.Text;
  private latestState?: GameState;
  private wheelRadius = 220;
  private readonly pointerAngle = 0;
  private jackpotSpinTween?: Phaser.Tweens.Tween;
  private jackpotBackgroundEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super("roulette");
  }

  create(): void {
    this.latestState = store.getState();
    this.buildBackground();
    this.buildWheel();
    this.buildPointer();
    this.buildMessage();

    store.subscribe((state) => {
      this.latestState = state;
      this.refreshMessage(state);
    });

    this.scale.on("resize", this.handleResize, this);
    this.handleResize({ width: this.scale.width, height: this.scale.height } as Phaser.Structs.Size);
  }

  spinToSegment(segment: WheelSegment): Promise<void> {
    if (!this.wheelContainer || !this.latestState) {
      return Promise.resolve();
    }

    const segments = store.getWheelSegments();
    const segmentIndex = segments.findIndex((item) => item.id === segment.id);
    const segmentAngle = FULL_ROTATION / segments.length;
    const segmentMidpoint = -Math.PI / 2 + segmentIndex * segmentAngle + segmentAngle / 2;
    const normalizedCurrent = Phaser.Math.Angle.Normalize(this.wheelContainer.rotation);
    const finalNormalized = Phaser.Math.Angle.Normalize(this.pointerAngle - segmentMidpoint);
    let delta = finalNormalized - normalizedCurrent;

    if (delta < 0) {
      delta += FULL_ROTATION;
    }

    const targetRotation = this.wheelContainer.rotation + FULL_ROTATION * 4 + delta;
    const expectedIndex = this.getSegmentIndexAtPointer(targetRotation, segments);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.wheelContainer,
        rotation: targetRotation,
        duration: store.getSpinDurationMs(),
        ease: "Cubic.easeOut",
        onUpdate: () => this.emitSparkles(),
        onComplete: () => {
          const landedIndex = this.getSegmentIndexAtPointer(this.wheelContainer?.rotation ?? targetRotation, segments);
          const normalizedFinalRotation = Phaser.Math.Angle.Normalize(this.wheelContainer?.rotation ?? targetRotation);

          console.group("[Ruleta Debug]");
          console.log("segmento elegido", {
            id: segment.id,
            label: segment.label,
            index: segmentIndex,
          });
          console.log("angulos", {
            pointerAngle: this.pointerAngle,
            segmentAngle,
            segmentMidpoint,
            normalizedCurrent,
            finalNormalized,
            delta,
            targetRotation,
            normalizedFinalRotation,
          });
          console.log("prediccion", {
            expectedIndex,
            expectedLabel: segments[expectedIndex]?.label,
          });
          console.log("resultado visual estimado", {
            landedIndex,
            landedLabel: segments[landedIndex]?.label,
          });
          console.groupEnd();

          resolve();
        },
      });
    });
  }

  pulseTone(tone: GameState["lastOutcomeTone"]): void {
    if (!this.wheelContainer) {
      return;
    }

    const tintMap: Record<GameState["lastOutcomeTone"], number> = {
      neutral: 0xfce8e6,
      win: 0xffd166,
      loss: 0xef476f,
      special: 0x06d6a0,
    };

    this.cameras.main.flash(220, 255, 245, 238, false);

    this.tweens.add({
      targets: this.wheelContainer,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 180,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    this.backgroundGradient?.clear();
    this.buildBackground(tintMap[tone]);
  }

  startJackpotMode(): void {
    if (!this.wheelContainer) {
      return;
    }

    this.stopJackpotMode();

    this.jackpotSpinTween = this.tweens.add({
      targets: this.wheelContainer,
      rotation: this.wheelContainer.rotation + FULL_ROTATION * 10,
      duration: 900,
      ease: "Linear",
      repeat: -1,
    });

    const colors = [0xff006e, 0x06d6a0, 0x8338ec, 0xfcbf49, 0xfb5607];
    this.jackpotBackgroundEvent = this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.buildBackground(color);
      },
    });
  }

  stopJackpotMode(): void {
    this.jackpotSpinTween?.stop();
    this.jackpotSpinTween = undefined;
    this.jackpotBackgroundEvent?.remove(false);
    this.jackpotBackgroundEvent = undefined;
    this.buildBackground();
  }

  stopJackpotModeSmooth(): Promise<void> {
    if (!this.wheelContainer) {
      this.stopJackpotMode();
      return Promise.resolve();
    }

    this.jackpotSpinTween?.stop();
    this.jackpotSpinTween = undefined;
    this.jackpotBackgroundEvent?.remove(false);
    this.jackpotBackgroundEvent = undefined;

    const currentRotation = this.wheelContainer.rotation;
    const targetRotation = currentRotation + FULL_ROTATION * 1.35;

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.wheelContainer,
        rotation: targetRotation,
        duration: 2100,
        ease: "Cubic.easeOut",
        onUpdate: () => {
          const colorMix = Phaser.Math.Between(0x8d1f42, 0xff865d);
          this.buildBackground(colorMix);
        },
        onComplete: () => {
          this.buildBackground();
          resolve();
        },
      });
    });
  }

  private buildBackground(color = 0xfce8e6): void {
    const width = this.scale.width;
    const height = this.scale.height;

    if (!this.backgroundGradient) {
      this.backgroundGradient = this.add.graphics();
      this.backgroundGradient.setDepth(-10);
    }

    this.backgroundGradient.clear();
    this.backgroundGradient.fillGradientStyle(color, 0xffd6c9, 0x6d0f3f, 0x250902, 1);
    this.backgroundGradient.fillRect(0, 0, width, height);

    this.backgroundGradient.fillStyle(0xffffff, 0.08);
    this.backgroundGradient.fillCircle(width * 0.82, height * 0.18, 120);
    this.backgroundGradient.fillCircle(width * 0.16, height * 0.28, 90);
  }

  private buildWheel(): void {
    const segments = store.getWheelSegments();
    const centerX = this.getWheelCenterX();
    const centerY = this.getWheelCenterY();
    this.wheelContainer = this.add.container(centerX, centerY);

    const disc = this.add.graphics();
    const labelObjects: Phaser.GameObjects.Text[] = [];
    const segmentAngle = FULL_ROTATION / segments.length;

    segments.forEach((segment, index) => {
      const start = -Math.PI / 2 + index * segmentAngle;
      const end = start + segmentAngle;
      disc.fillStyle(Phaser.Display.Color.HexStringToColor(segment.color).color, 1);
      disc.slice(0, 0, this.wheelRadius, start, end, false);
      disc.fillPath();

      disc.lineStyle(3, 0xfff2cc, 0.65);
      disc.beginPath();
      disc.moveTo(0, 0);
      disc.arc(0, 0, this.wheelRadius, start, end, false);
      disc.closePath();
      disc.strokePath();

      const textAngle = start + segmentAngle / 2;
      const label = this.add.text(
        Math.cos(textAngle) * (this.wheelRadius * 0.68),
        Math.sin(textAngle) * (this.wheelRadius * 0.68),
        segment.label,
        {
          fontFamily: "\"Fredoka\", sans-serif",
          fontSize: `${Math.max(12, Math.round(this.wheelRadius * 0.075))}px`,
          align: "center",
          color: "#fff9f2",
          stroke: "#59122b",
          strokeThickness: 4,
          wordWrap: { width: this.wheelRadius * 0.54 },
        },
      );
      label.setOrigin(0.5);
      label.setRotation(textAngle);
      labelObjects.push(label);
    });

    const centerDisc = this.add.circle(0, 0, 42, 0xfff1d6, 1);
    centerDisc.setStrokeStyle(8, 0xb6465f, 0.8);
    const centerHeart = this.add.text(0, -2, "💖", {
      fontSize: "28px",
    });
    centerHeart.setOrigin(0.5);

    this.wheelContainer.add([disc, ...labelObjects, centerDisc, centerHeart]);

    const particleManager = this.add.particles(0, 0, "__DEFAULT", {
      lifespan: 450,
      scale: { start: 0.18, end: 0 },
      speed: { min: 50, max: 120 },
      quantity: 1,
      frequency: -1,
      tint: [0xffd166, 0xff7b54, 0xffffff],
    });
    particleManager.setDepth(5);
    this.particles = particleManager;
  }

  private buildPointer(): void {
    const pointerX = this.getPointerX();
    const pointerY = this.getPointerY();
    this.pointerTriangle = this.add.triangle(
      pointerX,
      pointerY,
      42,
      0,
      42,
      44,
      0,
      22,
      0xfff1d6,
      1,
    );
    this.pointerTriangle.setStrokeStyle(5, 0x8d1b3d, 0.95);

    this.pointerRing = this.add.circle(pointerX + 22, pointerY, 16, 0xff7b54, 1);
    this.pointerRing.setStrokeStyle(5, 0xffffff, 0.85);
    this.pointerSparkle = this.add.text(pointerX + 22, pointerY, "✨", {
      fontSize: "20px",
    }).setOrigin(0.5);
  }

  private buildMessage(): void {
    this.messageText = this.add.text(this.scale.width / 2, this.scale.height * 0.12, "", {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: "#fff7ef",
      stroke: "#5c102f",
      strokeThickness: 5,
      align: "center",
      wordWrap: { width: Math.min(620, this.scale.width - 48) },
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setVisible(false);
    this.refreshMessage(store.getState());
  }

  private refreshMessage(state: GameState): void {
    this.messageText?.setText(state.lastOutcomeMessage);
  }

  private emitSparkles(): void {
    if (!this.particles || !this.wheelContainer) {
      return;
    }

    const angle = Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2);
    const radius = Phaser.Math.FloatBetween(20, this.wheelRadius);
    const x = this.wheelContainer.x + Math.cos(angle) * radius;
    const y = this.wheelContainer.y + Math.sin(angle) * radius;
    this.particles.emitParticleAt(x, y, 2);
  }

  private getSegmentIndexAtPointer(rotation: number, segments: WheelSegment[]): number {
    const normalizedRotation = Phaser.Math.Angle.Normalize(rotation);
    const segmentAngle = FULL_ROTATION / segments.length;
    const wheelAngleAtPointer = Phaser.Math.Angle.Normalize(this.pointerAngle - normalizedRotation);
    return Math.floor(wheelAngleAtPointer / segmentAngle) % segments.length;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.wheelContainer || !this.messageText) {
      return;
    }

    const width = gameSize.width;
    const height = gameSize.height;
    this.wheelRadius = this.getResponsiveRadius(width, height);
    this.refreshLayout();
  }

  private getResponsiveRadius(width: number, height: number): number {
    return Math.max(220, Math.min(width * 0.52, height * 0.4));
  }

  private getWheelCenterX(): number {
    return 0;
  }

  private getWheelCenterY(): number {
    const width = this.scale.width;
    const height = this.scale.height;
    this.wheelRadius = this.getResponsiveRadius(width, height);
    return height * 0.48;
  }

  private getPointerX(): number {
    return Math.min(this.scale.width - 44, this.wheelRadius + 46);
  }

  private getPointerY(): number {
    return this.getWheelCenterY();
  }

  private refreshLayout(): void {
    if (!this.wheelContainer || !this.messageText) {
      return;
    }

    const width = this.scale.width;
    const centerX = this.getWheelCenterX();
    const pointerY = this.getPointerY();
    const pointerX = this.getPointerX();
    const centerY = this.getWheelCenterY();
    this.buildBackground();
    this.wheelContainer.setPosition(centerX, centerY);
    this.messageText.setPosition(width / 2, this.scale.height * 0.12);
    this.messageText.setWordWrapWidth(Math.min(620, width - 48));
    this.pointerTriangle?.setPosition(pointerX, pointerY);
    this.pointerRing?.setPosition(pointerX + 22, pointerY);
    this.pointerSparkle?.setPosition(pointerX + 22, pointerY);
  }
}
