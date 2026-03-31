import Phaser from "phaser";
import { store } from "../state/store";
import type { GameState, WheelSegment } from "../state/types";

const FULL_ROTATION = Math.PI * 2;

interface ResourceFlyToCounterConfig {
  icon: string;
  amount: number;
  color: string;
  labelPrefix?: string;
  targetViewportPoint: {
    x: number;
    y: number;
  };
}

interface ResourceFlyFromCounterConfig {
  icon: string;
  amount: number;
  color: string;
  labelPrefix?: string;
  sourceViewportPoint: {
    x: number;
    y: number;
  };
}

interface PointerUpgradeVisual {
  id: string;
  emoji: string;
  name: string;
  tooltipDetail?: string;
  badgeCount?: number | null;
}

interface BackgroundOrbConfig {
  x: number;
  y: number;
  radius: number;
  color: number;
  alpha: number;
  duration: number;
  xOffset: number;
  yOffset: number;
  scaleOffset: number;
}

export class RouletteScene extends Phaser.Scene {
  private wheelContainer?: Phaser.GameObjects.Container;
  private messageText?: Phaser.GameObjects.Text;
  private sessionLockContainer?: Phaser.GameObjects.Container;
  private sessionLockDetailText?: Phaser.GameObjects.Text;
  private backgroundGradient?: Phaser.GameObjects.Graphics;
  private backgroundMotionLayer?: Phaser.GameObjects.Container;
  private backgroundOrbs: Phaser.GameObjects.Arc[] = [];
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private pointerTriangle?: Phaser.GameObjects.Triangle;
  private pointerRing?: Phaser.GameObjects.Arc;
  private pointerSparkle?: Phaser.GameObjects.Text;
  private pointerUpgradeHalo?: Phaser.GameObjects.Arc;
  private pointerUpgradeContainer?: Phaser.GameObjects.Container;
  private pointerUpgradeTooltip?: Phaser.GameObjects.Container;
  private pointerUpgradeItems: PointerUpgradeVisual[] = [];
  private latestState?: GameState;
  private wheelRadius = 220;
  private readonly pointerAngle = 0;
  private jackpotSpinTween?: Phaser.Tweens.Tween;
  private jackpotBackgroundEvent?: Phaser.Time.TimerEvent;
  private luckGlowTween?: Phaser.Tweens.Tween;
  private luckGlowHalo?: Phaser.GameObjects.Arc;
  private luckOrbitContainer?: Phaser.GameObjects.Container;
  private luckGlowActive = false;

  constructor() {
    super("roulette");
  }

  create(): void {
    this.latestState = store.getState();
    this.buildBackground();
    this.buildWheel();
    this.buildPointer();
    this.buildMessage();
    this.buildSessionLockSign();
    this.syncPointerUpgrades(
      store.getActiveArcadeUpgrades().map((upgrade) => ({
        id: upgrade.id,
        emoji: store.getArcadeUpgradeEmoji(upgrade),
        name: upgrade.name,
        tooltipDetail: store.getUpgradeTooltipDetail(upgrade),
        badgeCount: store.getArcadeUpgradeBadgeCount(upgrade),
      })),
    );

    store.subscribe((state) => {
      this.latestState = state;
      this.refreshMessage(state);
      this.refreshSessionLockSign(state);
    });

    this.input.on("pointerdown", () => {
      this.hidePointerUpgradeTooltip();
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
          this.stopLuckGlow();
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

  startLuckGlow(level: 1 | 2 | 3): void {
    if (this.jackpotActiveVisualsRunning() || this.luckGlowActive) {
      return;
    }

    this.luckGlowActive = true;
    const baseColor = level === 3 ? 0x74d66f : level === 2 ? 0x63c864 : 0x56b95d;
    const haloAlpha = level === 3 ? 0.34 : level === 2 ? 0.34 : 0.22;
    const haloRadius = this.wheelRadius + (level === 3 ? 34 : level === 2 ? 38 : 26);
    const haloStroke = level === 3 ? 12 : level === 2 ? 14 : 10;
    const haloScaleFrom = level === 3 ? 0.96 : level === 2 ? 0.98 : 0.92;
    const haloScaleTo = level === 3 ? 1.06 : level === 2 ? 1.08 : 1.02;

    this.buildBackground(baseColor);
    this.luckGlowHalo?.setFillStyle(baseColor, haloAlpha);
    this.luckGlowHalo?.setStrokeStyle(haloStroke, 0xe7ffcb, haloAlpha + 0.12);
    this.luckGlowHalo?.setRadius(haloRadius);
    this.luckGlowHalo?.setScale(haloScaleFrom);
    this.luckGlowHalo?.setVisible(true);
    this.setLuckOrbitVisible(level === 3);
    this.luckGlowTween?.stop();
    if (this.luckGlowHalo) {
      this.tweens.killTweensOf(this.luckGlowHalo);
    }
    if (this.luckOrbitContainer) {
      this.tweens.killTweensOf(this.luckOrbitContainer);
    }

    if (level === 3 && this.luckOrbitContainer) {
      this.luckOrbitContainer.setRotation(0);
      this.luckOrbitContainer.setAlpha(0.92);
      this.luckOrbitContainer.setScale(0.96);
      this.tweens.add({
        targets: this.luckOrbitContainer,
        rotation: FULL_ROTATION,
        duration: 3200,
        ease: "Linear",
        repeat: -1,
      });
      this.tweens.add({
        targets: this.luckOrbitContainer,
        scale: 1.03,
        alpha: 1,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.luckGlowTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const value = tween.getValue() ?? 0;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xfce8e6),
          Phaser.Display.Color.ValueToColor(baseColor),
          100,
          50 + Math.round(value * 35),
        );
        this.buildBackground(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        this.luckGlowHalo?.setAlpha(Phaser.Math.Linear(haloAlpha, haloAlpha + 0.16, value));
        this.luckGlowHalo?.setScale(Phaser.Math.Linear(haloScaleFrom, haloScaleTo, value));
      },
    });
  }

  stopLuckGlow(): void {
    if (!this.luckGlowActive) {
      return;
    }

    this.luckGlowActive = false;
    this.luckGlowTween?.stop();
    this.luckGlowTween = undefined;
    if (this.luckGlowHalo) {
      this.tweens.killTweensOf(this.luckGlowHalo);
    }
    if (this.luckOrbitContainer) {
      this.tweens.killTweensOf(this.luckOrbitContainer);
      this.luckOrbitContainer.setRotation(0);
      this.luckOrbitContainer.setScale(1);
      this.luckOrbitContainer.setAlpha(0);
      this.luckOrbitContainer.setVisible(false);
    }
    this.luckGlowHalo?.setVisible(false);
    this.luckGlowHalo?.setAlpha(0);
    this.luckGlowHalo?.setScale(1);

    if (!this.jackpotActiveVisualsRunning()) {
      this.buildBackground();
    }
  }

  pulseTone(tone: GameState["lastOutcomeTone"], colorOverride?: number): void {
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
    this.buildBackground(colorOverride ?? tintMap[tone]);
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
    this.stopLuckGlow();
    this.buildBackground();
  }

  syncPointerUpgrades(upgrades: PointerUpgradeVisual[]): void {
    this.pointerUpgradeItems = upgrades;
    this.renderPointerUpgradePage(true);
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
    this.stopLuckGlow();

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

  playLuckBurst(level: 1 | 2 | 3): void {
    if (!this.wheelContainer) {
      return;
    }

    const burstCount = level === 3 ? 12 : level === 2 ? 9 : 6;
    const burstRadius = this.wheelRadius * 0.78;

    this.cameras.main.flash(180, 236, 255, 226, false);

    for (let index = 0; index < burstCount; index += 1) {
      const angle = (FULL_ROTATION / burstCount) * index + Phaser.Math.FloatBetween(-0.12, 0.12);
      const startRadius = burstRadius * Phaser.Math.FloatBetween(0.28, 0.45);
      const endRadius = burstRadius + Phaser.Math.Between(12, 42);
      const startX = this.wheelContainer.x + Math.cos(angle) * startRadius;
      const startY = this.wheelContainer.y + Math.sin(angle) * startRadius;
      const endX = this.wheelContainer.x + Math.cos(angle) * endRadius;
      const endY = this.wheelContainer.y + Math.sin(angle) * endRadius;
      const clover = this.add.text(startX, startY, "🍀", {
        fontFamily: "\"Fredoka\", sans-serif",
        fontSize: `${level === 3 ? 36 : level === 2 ? 31 : 26}px`,
      });
      clover.setOrigin(0.5);
      clover.setDepth(24);
      clover.setScale(0.82);
      clover.setAlpha(0);

      this.tweens.add({
        targets: clover,
        x: endX,
        y: endY,
        alpha: 1,
        scale: level === 3 ? 1.34 : level === 2 ? 1.2 : 1.12,
        angle: Phaser.Math.Between(-24, 24),
        duration: 440 + index * 18,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: clover,
            alpha: 0,
            scale: 0.2,
            duration: 220,
            ease: "Quad.easeIn",
            onComplete: () => {
              clover.destroy();
            },
          });
        },
      });
    }
  }

  private jackpotActiveVisualsRunning(): boolean {
    return Boolean(this.jackpotSpinTween || this.jackpotBackgroundEvent);
  }

  playResourceFlyToCounter(config: ResourceFlyToCounterConfig): void {
    if (!this.wheelContainer || config.amount <= 0) {
      return;
    }

    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) {
      return;
    }

    const targetX = ((config.targetViewportPoint.x - canvasRect.left) / canvasRect.width) * this.scale.width;
    const targetY = ((config.targetViewportPoint.y - canvasRect.top) / canvasRect.height) * this.scale.height;

    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      return;
    }

    const originX = this.wheelContainer.x;
    const originY = this.wheelContainer.y;
    const burstCount = Phaser.Math.Clamp(Math.round(config.amount), 6, 10);
    const flightDuration = Phaser.Math.Between(700, 950);
    const label = this.add.text(originX, originY - 18, `${config.labelPrefix ?? "+"}${config.amount}`, {
      fontFamily: "\"Fredoka\", sans-serif",
      fontSize: "30px",
      color: config.color,
      stroke: "#fff8f0",
      strokeThickness: 5,
    });
    label.setOrigin(0.5);
    label.setDepth(20);

    this.tweens.add({
      targets: label,
      y: originY - 72,
      alpha: 0,
      scale: 1.08,
      duration: 820,
      ease: "Cubic.easeOut",
      onComplete: () => {
        label.destroy();
      },
    });

    for (let index = 0; index < burstCount; index += 1) {
      const icon = this.add.text(originX, originY, config.icon, {
        fontFamily: "\"Fredoka\", sans-serif",
        fontSize: `${Phaser.Math.Between(24, 32)}px`,
      });
      icon.setOrigin(0.5);
      icon.setDepth(19);

      const burstAngle = Phaser.Math.FloatBetween(-2.5, -0.65);
      const burstDistance = Phaser.Math.Between(32, 84);
      const burstX = originX + Math.cos(burstAngle) * burstDistance;
      const burstY = originY + Math.sin(burstAngle) * burstDistance;
      const midX = Phaser.Math.Linear(burstX, targetX, 0.35) + Phaser.Math.Between(-36, 36);
      const midY = Phaser.Math.Linear(burstY, targetY, 0.35) - Phaser.Math.Between(20, 64);

      this.tweens.add({
        targets: icon,
        x: burstX,
        y: burstY,
        scale: 1.12,
        duration: Phaser.Math.Between(120, 180),
        ease: "Quad.easeOut",
        onComplete: () => {
          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: flightDuration,
            ease: "Cubic.easeInOut",
            onUpdate: (tween) => {
              const value = tween.getValue() ?? 0;
              const curveX = Phaser.Math.Interpolation.CatmullRom([burstX, midX, targetX], value);
              const curveY = Phaser.Math.Interpolation.CatmullRom([burstY, midY, targetY], value);
              icon.setPosition(curveX, curveY);
              icon.setScale(Phaser.Math.Linear(1.12, 0.68, value));
              icon.setAlpha(Phaser.Math.Linear(1, 0.8, value));
            },
            onComplete: () => {
              this.tweens.add({
                targets: icon,
                scale: 0.2,
                alpha: 0,
                duration: 110,
                onComplete: () => {
                  icon.destroy();
                },
              });
            },
          });
        },
      });
    }

    const pulseRing = this.add.circle(targetX, targetY, 12, Phaser.Display.Color.HexStringToColor(config.color).color, 0.3);
    pulseRing.setDepth(18);
    this.tweens.add({
      targets: pulseRing,
      scale: 2.4,
      alpha: 0,
      duration: 340,
      delay: flightDuration - 120,
      ease: "Quad.easeOut",
      onComplete: () => {
        pulseRing.destroy();
      },
    });
  }

  playResourceFlyFromCounter(config: ResourceFlyFromCounterConfig): void {
    if (!this.wheelContainer || config.amount <= 0) {
      return;
    }

    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) {
      return;
    }

    const sourceX = ((config.sourceViewportPoint.x - canvasRect.left) / canvasRect.width) * this.scale.width;
    const sourceY = ((config.sourceViewportPoint.y - canvasRect.top) / canvasRect.height) * this.scale.height;

    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) {
      return;
    }

    const targetX = this.wheelContainer.x;
    const targetY = this.wheelContainer.y;
    const burstCount = Phaser.Math.Clamp(Math.round(config.amount), 6, 10);
    const flightDuration = Phaser.Math.Between(720, 930);
    const label = this.add.text(sourceX, sourceY - 18, `${config.labelPrefix ?? "-"}${config.amount}`, {
      fontFamily: "\"Fredoka\", sans-serif",
      fontSize: "30px",
      color: config.color,
      stroke: "#fff8f0",
      strokeThickness: 5,
    });
    label.setOrigin(0.5);
    label.setDepth(20);

    this.tweens.add({
      targets: label,
      y: sourceY - 60,
      alpha: 0,
      scale: 1.08,
      duration: 760,
      ease: "Cubic.easeOut",
      onComplete: () => {
        label.destroy();
      },
    });

    for (let index = 0; index < burstCount; index += 1) {
      const icon = this.add.text(sourceX, sourceY, config.icon, {
        fontFamily: "\"Fredoka\", sans-serif",
        fontSize: `${Phaser.Math.Between(24, 32)}px`,
      });
      icon.setOrigin(0.5);
      icon.setDepth(19);

      const driftAngle = Phaser.Math.FloatBetween(-2.2, -0.9);
      const driftDistance = Phaser.Math.Between(18, 42);
      const driftX = sourceX + Math.cos(driftAngle) * driftDistance;
      const driftY = sourceY + Math.sin(driftAngle) * driftDistance;
      const midX = Phaser.Math.Linear(driftX, targetX, 0.42) + Phaser.Math.Between(-48, 48);
      const midY = Phaser.Math.Linear(driftY, targetY, 0.42) + Phaser.Math.Between(-24, 56);

      this.tweens.add({
        targets: icon,
        x: driftX,
        y: driftY,
        scale: 1.04,
        duration: Phaser.Math.Between(110, 170),
        ease: "Quad.easeOut",
        onComplete: () => {
          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: flightDuration,
            ease: "Cubic.easeInOut",
            onUpdate: (tween) => {
              const value = tween.getValue() ?? 0;
              const curveX = Phaser.Math.Interpolation.CatmullRom([driftX, midX, targetX], value);
              const curveY = Phaser.Math.Interpolation.CatmullRom([driftY, midY, targetY], value);
              icon.setPosition(curveX, curveY);
              icon.setScale(Phaser.Math.Linear(1.04, 0.62, value));
              icon.setAlpha(Phaser.Math.Linear(1, 0.78, value));
            },
            onComplete: () => {
              this.tweens.add({
                targets: icon,
                scale: 0.2,
                alpha: 0,
                duration: 110,
                onComplete: () => {
                  icon.destroy();
                },
              });
            },
          });
        },
      });
    }

    const pulseRing = this.add.circle(targetX, targetY, 16, Phaser.Display.Color.HexStringToColor(config.color).color, 0.28);
    pulseRing.setDepth(18);
    this.tweens.add({
      targets: pulseRing,
      scale: 0.4,
      alpha: 0,
      duration: 320,
      delay: flightDuration - 120,
      ease: "Quad.easeOut",
      onComplete: () => {
        pulseRing.destroy();
      },
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

  private buildBackgroundMotion(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    if (!this.backgroundMotionLayer) {
      this.backgroundMotionLayer = this.add.container(0, 0);
      this.backgroundMotionLayer.setDepth(-9);
    }

    this.tweens.killTweensOf(this.backgroundOrbs);
    this.backgroundMotionLayer.removeAll(true);
    this.backgroundOrbs = [];

    const orbConfigs: BackgroundOrbConfig[] = [
      {
        x: width * 0.16,
        y: height * 0.18,
        radius: Math.max(90, width * 0.08),
        color: 0xffffff,
        alpha: 0.06,
        duration: 7000,
        xOffset: width * 0.035,
        yOffset: height * 0.04,
        scaleOffset: 0.12,
      },
      {
        x: width * 0.82,
        y: height * 0.2,
        radius: Math.max(110, width * 0.1),
        color: 0xffd6c9,
        alpha: 0.1,
        duration: 9200,
        xOffset: width * 0.045,
        yOffset: height * 0.03,
        scaleOffset: 0.16,
      },
      {
        x: width * 0.22,
        y: height * 0.72,
        radius: Math.max(100, width * 0.09),
        color: 0xffb3cb,
        alpha: 0.1,
        duration: 8600,
        xOffset: width * 0.03,
        yOffset: height * 0.05,
        scaleOffset: 0.14,
      },
      {
        x: width * 0.88,
        y: height * 0.74,
        radius: Math.max(120, width * 0.12),
        color: 0xfff1d6,
        alpha: 0.07,
        duration: 10400,
        xOffset: width * 0.05,
        yOffset: height * 0.04,
        scaleOffset: 0.18,
      },
    ];

    orbConfigs.forEach((config, index) => {
      const orb = this.add.circle(config.x, config.y, config.radius, config.color, config.alpha);
      orb.setBlendMode(Phaser.BlendModes.SCREEN);
      orb.setScrollFactor(0);
      this.backgroundMotionLayer?.add(orb);
      this.backgroundOrbs.push(orb);

      this.tweens.add({
        targets: orb,
        x: config.x + config.xOffset,
        y: config.y - config.yOffset,
        scale: 1 + config.scaleOffset,
        alpha: config.alpha + 0.03,
        duration: config.duration,
        delay: index * 240,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    });

    for (let index = 0; index < 7; index += 1) {
      const sparkle = this.add.text(
        width * (0.12 + index * 0.12),
        height * (0.22 + (index % 3) * 0.18),
        "✦",
        {
          fontFamily: "\"Fredoka\", sans-serif",
          fontSize: `${18 + (index % 3) * 6}px`,
          color: "#fff6ef",
        },
      );
      sparkle.setOrigin(0.5);
      sparkle.setAlpha(0.08);
      sparkle.setAngle(index % 2 === 0 ? -12 : 12);
      this.backgroundMotionLayer?.add(sparkle);

      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - 18,
        alpha: 0.2,
        scale: 1.18,
        duration: 1800 + index * 220,
        delay: index * 180,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private buildWheel(): void {
    const segments = store.getWheelSegments();
    const centerX = this.getWheelCenterX();
    const centerY = this.getWheelCenterY();
    this.luckGlowHalo = this.add.circle(centerX, centerY, this.wheelRadius + 26, 0x63c864, 0);
    this.luckGlowHalo.setDepth(-1);
    this.luckGlowHalo.setStrokeStyle(10, 0xe7ffcb, 0);
    this.luckGlowHalo.setBlendMode(Phaser.BlendModes.SCREEN);
    this.luckGlowHalo.setVisible(false);
    this.luckOrbitContainer = this.add.container(centerX, centerY);
    this.luckOrbitContainer.setDepth(7);
    this.luckOrbitContainer.setVisible(false);
    this.luckOrbitContainer.setAlpha(0);

    const orbitRadius = this.wheelRadius + 50;
    const orbitAngles = [-90, -30, 30, 90, 150, 210];
    orbitAngles.forEach((angleDeg, index) => {
      const angle = Phaser.Math.DegToRad(angleDeg);
      const clover = this.add.text(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, "🍀", {
        fontFamily: "\"Fredoka\", sans-serif",
        fontSize: index % 2 === 0 ? "36px" : "32px",
      });
      clover.setOrigin(0.5);
      clover.setAngle(index % 2 === 0 ? -12 : 12);
      this.luckOrbitContainer?.add(clover);
    });
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
    this.pointerUpgradeHalo = this.add.circle(pointerX + 22, pointerY, 26, 0xffb3cb, 0.12);
    this.pointerUpgradeHalo.setStrokeStyle(2, 0xffd6e3, 0.2);
    this.pointerUpgradeHalo.setVisible(false);
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
    this.pointerUpgradeContainer = this.add.container(this.getWheelCenterX(), this.getWheelCenterY());
    this.pointerUpgradeTooltip = this.add.container(0, 0);
    this.pointerUpgradeTooltip.setDepth(40);
    this.pointerUpgradeTooltip.setVisible(false);
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

  private buildSessionLockSign(): void {
    const signWidth = Math.min(420, this.scale.width - 36);
    const signHeight = this.scale.width < 720 ? 220 : 244;
    const bulbCount = 10;
    const bulbs: Phaser.GameObjects.Arc[] = [];
    const frame = this.add.graphics();
    frame.fillStyle(0x5e1530, 0.94);
    frame.lineStyle(6, 0xffd37a, 0.95);
    frame.fillRoundedRect(-signWidth / 2, -signHeight / 2, signWidth, signHeight, 32);
    frame.strokeRoundedRect(-signWidth / 2, -signHeight / 2, signWidth, signHeight, 32);

    const inner = this.add.graphics();
    inner.fillStyle(0xfff4dc, 0.98);
    inner.lineStyle(3, 0xffb347, 0.82);
    inner.fillRoundedRect(-signWidth / 2 + 18, -signHeight / 2 + 18, signWidth - 36, signHeight - 36, 24);
    inner.strokeRoundedRect(-signWidth / 2 + 18, -signHeight / 2 + 18, signWidth - 36, signHeight - 36, 24);

    for (let index = 0; index < bulbCount; index += 1) {
      const progress = index / (bulbCount - 1);
      const x = Phaser.Math.Linear(-signWidth / 2 + 28, signWidth / 2 - 28, progress);
      const topBulb = this.add.circle(x, -signHeight / 2 + 16, 7, 0xffd166, 1);
      const bottomBulb = this.add.circle(x, signHeight / 2 - 16, 7, 0xffd166, 1);
      bulbs.push(topBulb, bottomBulb);
    }

    const eyebrow = this.add.text(0, -56, "Ruleta del amor", {
      fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
      fontSize: this.scale.width < 720 ? "16px" : "18px",
      color: "#a44a2f",
      fontStyle: "bold",
    }).setOrigin(0.5);
    eyebrow.setLetterSpacing(3);

    const title = this.add.text(0, -8, "Batería vacía", {
      fontFamily: "Georgia, serif",
      fontSize: this.scale.width < 720 ? "32px" : "40px",
      color: "#7f1734",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);

    this.sessionLockDetailText = this.add.text(0, 50, "", {
      fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
      fontSize: this.scale.width < 720 ? "13px" : "14px",
      color: "#6b3240",
      align: "center",
      wordWrap: { width: signWidth - 150 },
      lineSpacing: 1,
    }).setOrigin(0.5);

    this.sessionLockContainer = this.add.container(
      this.scale.width / 2,
      this.getWheelCenterY(),
      [frame, inner, ...bulbs, eyebrow, title, this.sessionLockDetailText],
    );
    this.sessionLockContainer.setDepth(60);
    this.sessionLockContainer.setVisible(false);

    bulbs.forEach((bulb, index) => {
      this.tweens.add({
        targets: bulb,
        alpha: 0.34,
        scale: 0.9,
        duration: 500 + (index % 4) * 90,
        yoyo: true,
        repeat: -1,
        delay: index * 60,
        ease: "Sine.easeInOut",
      });
    });

    this.refreshSessionLockSign(store.getState());
  }

  private refreshSessionLockSign(state: GameState): void {
    if (!this.sessionLockContainer || !this.sessionLockDetailText) {
      return;
    }

    if (state.energyDepleted && !state.isSpinning && !state.jackpotActive && !state.jackpotEnding) {
      this.sessionLockDetailText.setText("Regresa más tarde para volver a jugar.");
      this.sessionLockContainer.setVisible(true);
      this.messageText?.setVisible(false);
      this.pointerUpgradeContainer?.setVisible(false);
      this.pointerUpgradeHalo?.setVisible(false);
      this.pointerTriangle?.setAlpha(0.22);
      this.pointerRing?.setAlpha(0.22);
      this.pointerSparkle?.setAlpha(0.22);
      this.wheelContainer?.setAlpha(0.3);
      return;
    }

    this.sessionLockContainer.setVisible(false);
    this.messageText?.setVisible(false);
    this.pointerUpgradeContainer?.setVisible(true);
    this.pointerTriangle?.setAlpha(1);
    this.pointerRing?.setAlpha(1);
    this.pointerSparkle?.setAlpha(1);
    this.wheelContainer?.setAlpha(1);
    this.renderPointerUpgradePage(true);
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
    return Math.min(this.scale.width - 44, this.wheelRadius + 66);
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
    this.buildBackgroundMotion();
    this.wheelContainer.setPosition(centerX, centerY);
    this.luckGlowHalo?.setPosition(centerX, centerY);
    this.luckGlowHalo?.setRadius(this.wheelRadius + 26);
    this.luckOrbitContainer?.setPosition(centerX, centerY);
    this.updateLuckOrbitLayout();
    this.messageText.setPosition(width / 2, this.scale.height * 0.12);
    this.messageText.setWordWrapWidth(Math.min(620, width - 48));
    this.pointerUpgradeHalo?.setPosition(pointerX + 22, pointerY);
    this.pointerTriangle?.setPosition(pointerX, pointerY);
    this.pointerRing?.setPosition(pointerX + 22, pointerY);
    this.pointerSparkle?.setPosition(pointerX + 22, pointerY);
    this.pointerUpgradeContainer?.setPosition(centerX, centerY);
    this.sessionLockContainer?.setPosition(width / 2, centerY);
    this.hidePointerUpgradeTooltip();
    this.renderPointerUpgradePage(true);
    this.refreshSessionLockSign(store.getState());
  }

  private setLuckOrbitVisible(visible: boolean): void {
    if (!this.luckOrbitContainer) {
      return;
    }

    this.luckOrbitContainer.setVisible(visible);
    this.luckOrbitContainer.setAlpha(visible ? 1 : 0);
  }

  private updateLuckOrbitLayout(): void {
    if (!this.luckOrbitContainer) {
      return;
    }

    const orbitRadius = this.wheelRadius + 50;
    const orbitAngles = [-90, -30, 30, 90, 150, 210];
    this.luckOrbitContainer.iterate((child: Phaser.GameObjects.GameObject) => {
      const clover = child as Phaser.GameObjects.Text;
      const index = this.luckOrbitContainer?.getIndex(clover) ?? 0;
      const angle = Phaser.Math.DegToRad(orbitAngles[index] ?? -90);
      clover.setPosition(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius);
      clover.setFontSize(index % 2 === 0 ? 36 : 32);
    });
  }

  private renderPointerUpgradePage(isImmediate: boolean): void {
    if (!this.pointerUpgradeContainer || !this.pointerUpgradeHalo) {
      return;
    }

    this.pointerUpgradeContainer.removeAll(true);
    this.hidePointerUpgradeTooltip();

    if (this.pointerUpgradeItems.length === 0) {
      this.pointerUpgradeHalo.setVisible(false);
      return;
    }

    this.pointerUpgradeHalo.setVisible(true);
    this.pointerUpgradeHalo.setScale(1);
    this.tweens.killTweensOf(this.pointerUpgradeHalo);
    this.tweens.add({
      targets: this.pointerUpgradeHalo,
      scale: 1.12,
      alpha: 0.2,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const visibleItems = this.pointerUpgradeItems;
    const radius = this.wheelRadius + (this.scale.width < 720 ? 34 : 48);
    const startAngle = Phaser.Math.DegToRad(-58);
    const endAngle = Phaser.Math.DegToRad(58);
    const centerAngle = (startAngle + endAngle) / 2;
    const step = visibleItems.length > 1 ? (endAngle - startAngle) / (visibleItems.length - 1) : 0;

    visibleItems.forEach((upgrade, index) => {
      const angle = visibleItems.length === 1 ? centerAngle : startAngle + step * index;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const hasShieldCount = upgrade.badgeCount !== null && upgrade.badgeCount !== undefined;
      const iconText = hasShieldCount ? `${upgrade.emoji}${upgrade.badgeCount}` : upgrade.emoji;
      const ringRadius = this.scale.width < 720 ? 18 : 20;
      const iconFontSize = hasShieldCount ? (this.scale.width < 720 ? "11px" : "12px") : (this.scale.width < 720 ? "16px" : "18px");

      const ring = this.add.circle(x, y, ringRadius, 0x34111f, 0.9);
      ring.setStrokeStyle(2, 0xffd8a8, 0.45);
      const icon = this.add.text(x, y, iconText, {
        fontSize: iconFontSize,
      }).setOrigin(0.5);
      icon.setPadding(2, 5, 2, 3);
      icon.setY(y + 2.5);
      ring.setInteractive({ useHandCursor: true });
      icon.setInteractive({ useHandCursor: true });

      ring.setScale(isImmediate ? 1 : 0.72);
      ring.setAlpha(isImmediate ? 1 : 0);
      icon.setScale(isImmediate ? 1 : 0.72);
      icon.setAlpha(isImmediate ? 1 : 0);

      this.pointerUpgradeContainer?.add([ring, icon]);

      const floatOffset = Phaser.Math.Between(0, 200);
      this.tweens.add({
        targets: [ring, icon],
        y: y - 3,
        duration: 1100 + floatOffset,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      if (!isImmediate) {
        this.tweens.add({
          targets: [ring, icon],
          alpha: 1,
          scale: 1,
          duration: 260,
          delay: index * 45,
          ease: "Back.easeOut",
        });
      }

      const openTooltip = (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        const worldX = (this.pointerUpgradeContainer?.x ?? 0) + x;
        const worldY = (this.pointerUpgradeContainer?.y ?? 0) + y;
        this.showPointerUpgradeTooltip(upgrade, worldX, worldY - (this.scale.width < 720 ? 18 : 22));
      };
      ring.on("pointerdown", openTooltip);
      icon.on("pointerdown", openTooltip);
    });
  }

  private showPointerUpgradeTooltip(upgrade: PointerUpgradeVisual, x: number, y: number): void {
    if (!this.pointerUpgradeTooltip) {
      return;
    }

    this.pointerUpgradeTooltip.removeAll(true);

    const titleWrapWidth = this.scale.width < 720 ? 116 : 140;
    const detailWrapWidth = this.scale.width < 720 ? 122 : 148;
    const title = this.add.text(0, 0, upgrade.name, {
      fontFamily: "\"Fredoka\", sans-serif",
      fontSize: this.scale.width < 720 ? "12px" : "13px",
      color: "#fff7ef",
      align: "center",
      wordWrap: { width: titleWrapWidth },
    }).setOrigin(0.5);

    const detail = upgrade.tooltipDetail
      ? this.add.text(0, 0, upgrade.tooltipDetail, {
          fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
          fontSize: this.scale.width < 720 ? "10px" : "11px",
          color: "#ffd9b8",
          align: "center",
          wordWrap: { width: detailWrapWidth },
          lineSpacing: 2,
        }).setOrigin(0.5, 0)
      : undefined;

    const gapY = detail ? 4 : 0;
    const titleHeight = title.height;
    const detailHeight = detail?.height ?? 0;
    const contentHeight = titleHeight + (detail ? gapY + detailHeight : 0);
    const maxContentWidth = Math.max(title.width, detail?.width ?? 0);

    title.setY(-contentHeight / 2 + titleHeight / 2);

    if (detail) {
      detail.setY(contentHeight / 2 - detailHeight);
    }

    const paddingX = 10;
    const paddingY = 7;
    const textObjects = detail ? [title, detail] : [title];
    const bubble = this.add.graphics();
    bubble.fillStyle(0x34111f, 0.94);
    bubble.lineStyle(2, 0xffd8a8, 0.4);
    bubble.fillRoundedRect(
      -maxContentWidth / 2 - paddingX,
      -contentHeight / 2 - paddingY,
      maxContentWidth + paddingX * 2,
      contentHeight + paddingY * 2,
      12,
    );
    bubble.strokeRoundedRect(
      -maxContentWidth / 2 - paddingX,
      -contentHeight / 2 - paddingY,
      maxContentWidth + paddingX * 2,
      contentHeight + paddingY * 2,
      12,
    );

    this.pointerUpgradeTooltip.add([bubble, ...textObjects]);
    this.pointerUpgradeTooltip.setPosition(x, y);
    this.pointerUpgradeTooltip.setVisible(true);
    this.pointerUpgradeTooltip.setAlpha(0);
    this.pointerUpgradeTooltip.setScale(0.92);
    this.tweens.killTweensOf(this.pointerUpgradeTooltip);
    this.tweens.add({
      targets: this.pointerUpgradeTooltip,
      alpha: 1,
      scale: 1,
      duration: 160,
      ease: "Back.easeOut",
    });
  }

  private hidePointerUpgradeTooltip(): void {
    if (!this.pointerUpgradeTooltip) {
      return;
    }

    this.pointerUpgradeTooltip.removeAll(true);
    this.pointerUpgradeTooltip.setVisible(false);
    this.pointerUpgradeTooltip.setAlpha(0);
  }
}
