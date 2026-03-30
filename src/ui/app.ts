import Phaser from "phaser";
import { audioManager } from "../audio/audioManager";
import { rewardCatalog, sessionConfig } from "../content/config";
import { createGame } from "../game/createGame";
import { sendRewardReservedEmail, sendSessionFinishedEmail } from "../services/mailer";
import { store } from "../state/store";
import type { DailyRewardCardViewModel, GameState, RewardCardViewModel, UpgradeCardViewModel } from "../state/types";
import { RouletteScene } from "../game/RouletteScene";

const toneClass = (tone: GameState["lastOutcomeTone"]): string => `tone-${tone}`;
const comboBreakCopies = [
  "Uy... se rompio el combo",
  "Se cayo solito, ni lo toque 😉",
  "No aguanto la presion",
  "¿Y el combo? bien, gracias",
  "Callamos y no juzgamos",
  "Combo salio del chat",
  "F por ese combo",
  "Duro menos que nosotros",
  "0% combo, 100% actitud",
  "Combo modo prueba gratis",
  "Combo eliminado 💀",
  "Era perfecto... hasta que no",
] as const;
const spinCopies = [
  "Vamos... no me falles ahora",
  "Se viene algo bueno",
  "No parpadees",
  "Momento canon",
  "El destino esta girando",
  "Esto es personal",
  "Vibe check en proceso",
  "No respires",
  "Esto puede ser epico",
  "Aguanta... AGUANTA",
  "Si sale combo... te beso",
  "Pide tu deseo",
  "Todo o nada",
  "Aqui se decide tu destino",
  "El universo esta mirando",
  "No hay vuelta atras",
  "Girando con fe",
  "Que Diosito decida",
  "Girandooo...",
] as const;
const instructionPages = [
  {
    eyebrow: "Guia rapida",
    title: "Como jugar",
    intro: "Todo es simple. Gira, gana y compra.",
    bullets: [
      "🪙 La ruleta puede darte monedas.",
      "🎁 Las monedas sirven en la tienda.",
      "😏 Solo pagas besos si cae una casilla de deuda.",
    ],
  },
  {
    eyebrow: "Guia rapida",
    title: "Casillas e iconos",
    intro: "Cada dibujo te dice lo que puede pasar.",
    bullets: [
      "🪙 Monedas: ganas premio.",
      "😏 Deuda: te quita 1 o 2 besos.",
      "🎁 Sorpresa: sale algo especial.",
      "🛡 Beso blindado: te protege una vez.",
      "x2 Multiplicador: el siguiente giro pega mas fuerte.",
      "🦹 Robamonedas: te quita monedas.",
      "🎡 Es el boton para girar.",
    ],
  },
  {
    eyebrow: "Guia rapida",
    title: "Combos, Jackpot y tienda",
    intro: "Estas son las partes mas poderosas del juego.",
    bullets: [
      "✨ Si te va bien varias veces, sube el combo.",
      "🪙 El combo multiplica monedas.",
      "💥 Una casilla mala rompe el combo.",
      "🎉 Jackpot es un premio especial para tocar rapido.",
      "⚡ Las mejoras te ayudan a jugar mejor.",
      "🎁 En la tienda compras regalos y mejoras.",
    ],
  },
] as const;

export class RomanticRouletteApp {
  private game?: Phaser.Game;
  private uiRoot?: HTMLElement;
  private jackpotIntervalId?: number;
  private wasJackpotActive = false;
  private surpriseTimers: number[] = [];
  private shopScrollTop = 0;
  private lastRenderedComboPulseToken = 0;
  private lastPointerUpgradeSignature = "";
  private lastSessionLockedForToday = false;

  constructor(private root: HTMLElement) {}

  private getComboBreakCopy(state: GameState): string {
    return comboBreakCopies[state.spinCount % comboBreakCopies.length];
  }

  private getSpinCopy(state: GameState): string {
    return spinCopies[state.spinCount % spinCopies.length];
  }

  private formatLocalDateTime(timestamp = Date.now()): string {
    return new Intl.DateTimeFormat("es-GT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(timestamp);
  }

  private handleSessionEndEmail(state: GameState): void {
    const justLocked = state.sessionLockedForToday && !this.lastSessionLockedForToday;
    this.lastSessionLockedForToday = state.sessionLockedForToday;

    if (!justLocked || !state.sessionLockDateKey || state.sessionEndEmailSentForDateKey === state.sessionLockDateKey) {
      return;
    }

    store.markSessionEndEmailSent(state.sessionLockDateKey);
    void sendSessionFinishedEmail({
      finishedAt: this.formatLocalDateTime(),
      dateKey: state.sessionLockDateKey,
      metrics: store.getSessionEmailMetrics(),
    });
  }

  private getCounterCenter(counterName: "coins" | "owed-kisses" | "invested-kisses"): { x: number; y: number } | null {
    const counter = this.uiRoot?.querySelector<HTMLElement>(`[data-counter='${counterName}']`);
    if (!counter) {
      return null;
    }

    const rect = counter.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  private playSpinResultFlyAnimation(resolution: { coinsDelta?: number; debtDelta?: number; coinsLoss?: number; opensSurprise?: boolean }): void {
    if (!this.game || resolution.opensSurprise) {
      return;
    }

    const scene = this.game.scene.getScene("roulette") as RouletteScene | undefined;
    if (!scene) {
      return;
    }

    const latestState = store.getState();

    if (typeof resolution.coinsDelta === "number" && latestState.lastCoinReward > 0) {
      const coinsTarget = this.getCounterCenter("coins");
      if (coinsTarget) {
        scene.playResourceFlyToCounter({
          icon: "🪙",
          amount: latestState.lastCoinReward,
          color: "#f4b942",
          targetViewportPoint: coinsTarget,
        });
      }
    }

    if (typeof resolution.debtDelta === "number" && resolution.debtDelta > 0) {
      const kissesTarget = this.getCounterCenter("owed-kisses");
      if (kissesTarget) {
        scene.playResourceFlyToCounter({
          icon: "💋",
          amount: resolution.debtDelta,
          color: "#ef476f",
          targetViewportPoint: kissesTarget,
        });
      }
    }

    if (typeof resolution.coinsLoss === "number" && resolution.coinsLoss > 0) {
      const coinsSource = this.getCounterCenter("coins");
      if (coinsSource) {
        scene.playResourceFlyFromCounter({
          icon: "🪙",
          amount: resolution.coinsLoss,
          color: "#7b2cbf",
          labelPrefix: "-",
          sourceViewportPoint: coinsSource,
        });
      }
    }
  }

  private playJackpotFlyAnimation(): void {
    if (!this.game) {
      return;
    }

    const scene = this.game.scene.getScene("roulette") as RouletteScene | undefined;
    if (!scene) {
      return;
    }

    const latestState = store.getState();
    if (latestState.lastCoinReward <= 0) {
      return;
    }

    const coinsTarget = this.getCounterCenter("coins");
    if (!coinsTarget) {
      return;
    }

    scene.playResourceFlyToCounter({
      icon: "🪙",
      amount: latestState.lastCoinReward,
      color: "#f4b942",
      targetViewportPoint: coinsTarget,
    });
  }

  mount(): void {
    this.root.innerHTML = `
      <div class="main-shell">
        <div class="game-layer" id="game-shell"></div>
        <div class="ui-layer" id="ui-root"></div>
      </div>
    `;

    const host = this.root.querySelector<HTMLElement>("#game-shell");
    this.uiRoot = this.root.querySelector<HTMLElement>("#ui-root") ?? undefined;

    if (!host || !this.uiRoot) {
      throw new Error("No se encontro el contenedor del juego.");
    }

    this.game = createGame(host);
    this.game.scale.resize(Math.max(window.innerWidth, 1), Math.max(window.innerHeight, 1));
    this.lastRenderedComboPulseToken = store.getState().comboPulseToken;
    store.checkSessionStatus();
    this.lastSessionLockedForToday = store.getState().sessionLockedForToday;
    window.setInterval(() => {
      store.checkSessionStatus();
    }, 1000);

    store.subscribe((state) => {
      this.handleSessionEndEmail(state);
      audioManager.sync(state);
      this.syncJackpotState(state);
      this.render(state);
    });
  }

  async spin(): Promise<void> {
    store.checkSessionStatus();
    const state = store.getState();

    if (!this.game || state.sessionLockedForToday || state.isSpinning || state.investedKisses <= 0 || state.surpriseModalOpen || state.surpriseStage !== "hidden") {
      return;
    }

    const segment = this.pickWeightedSegment();
    store.beginSpin(segment.id);
    audioManager.playSpin(store.getState(), store.getSpinDurationMs());

    const scene = this.game.scene.getScene("roulette") as RouletteScene;
    await scene.spinToSegment(segment);
    audioManager.stopSpin();
    const comboBeforeSpin = store.getState().comboMultiplier;
    const resolution = store.resolveSpin(segment.id);

    if (resolution) {
      const resolvedState = store.getState();
      const comboIncreased = resolvedState.comboMultiplier > comboBeforeSpin;
      const playedSound = audioManager.playTone(resolution.tone, resolvedState, resolution.audioCue);
      const comboSoundPlayed = comboIncreased
        ? audioManager.playCombo(resolvedState, resolvedState.comboMultiplier)
        : false;
      const effectParts = [
        typeof resolution.coinsDelta === "number" ? `monedas +${resolution.coinsDelta}` : null,
        typeof resolution.debtDelta === "number" ? `besos perdidos +${resolution.debtDelta}` : null,
        resolution.setDoubleStake ? "activa DOBLE APUESTA" : null,
        resolution.setKissShield ? "activa BESO BLINDADO" : null,
        resolution.consumeKissShield ? "bloquea perdida de besos" : null,
        resolution.opensSurprise ? "abre PREMIO SORPRESA" : null,
        comboIncreased ? `combo x${resolvedState.comboMultiplier}` : null,
      ].filter(Boolean);

      console.log("[Ruleta]", {
        casilla: segment.label,
        efecto: effectParts.length > 0 ? effectParts.join(", ") : "sin cambio numerico directo",
        mensaje: resolution.message,
        sonido: playedSound,
        sonidoCombo: comboSoundPlayed ? `combo x${resolvedState.comboMultiplier}` : "none",
      });

      scene.pulseTone(
        resolution.tone,
        resolution.audioCue === "robamonedas" ? 0x4b1d75 : undefined,
      );
      this.playSpinResultFlyAnimation(resolution);

      if (resolution.opensSurprise) {
        this.clearSurpriseTimers();
        const timer = window.setTimeout(() => {
          store.openSurpriseSelection();
        }, 2000);
        this.surpriseTimers.push(timer);
      }
    }
  }

  private handlePrimaryAction(): Promise<void> | void {
    store.checkSessionStatus();
    const state = store.getState();

    if (state.sessionLockedForToday || state.jackpotEnding) {
      return;
    }

    if (state.jackpotActive) {
      store.awardJackpotCoin();
      this.playJackpotFlyAnimation();
      audioManager.playTone("win", state, "coins");
      return;
    }

    if (state.investedKisses <= 0 && !state.isSpinning) {
      store.openRefillModal();
      return;
    }

    return this.spin();
  }

  private render(state: GameState): void {
    if (!this.uiRoot) {
      return;
    }

    const sessionRemainingMs = store.getSessionRemainingMs();
    const sessionRemainingMinutes = Math.floor(sessionRemainingMs / 60_000);
    const sessionRemainingSeconds = Math.floor((sessionRemainingMs % 60_000) / 1000);
    const sessionRemainingText = `${sessionRemainingMinutes}m ${`${sessionRemainingSeconds}`.padStart(2, "0")}s`;

    const existingShopModal = this.uiRoot.querySelector<HTMLElement>(".shop-modal");
    if (existingShopModal) {
      this.shopScrollTop = existingShopModal.scrollTop;
    } else if (!state.shopOpen) {
      this.shopScrollTop = 0;
    }

    const activeUpgrades = store.getActiveArcadeUpgrades().map((upgrade) => ({
      id: upgrade.id,
      emoji: store.getArcadeUpgradeEmoji(upgrade),
      name: upgrade.name,
      tooltipDetail: store.getUpgradeTooltipDetail(upgrade),
      badgeCount: store.getArcadeUpgradeBadgeCount(upgrade, state),
    }));
    const upgradeSignature = activeUpgrades
      .map((upgrade) => `${upgrade.id}:${upgrade.emoji}:${upgrade.badgeCount ?? ""}:${upgrade.tooltipDetail ?? ""}`)
      .join("|");
    if (upgradeSignature !== this.lastPointerUpgradeSignature) {
      const rouletteScene = this.game?.scene.getScene("roulette") as RouletteScene | undefined;
      if (rouletteScene) {
        rouletteScene.syncPointerUpgrades(activeUpgrades);
        this.lastPointerUpgradeSignature = upgradeSignature;
      }
    }
    const statusTitle = state.sessionLockedForToday
      ? "Sesion terminada"
      : state.sessionPendingLockUntilComboBreak
        ? `Combo x${state.comboMultiplier}`
      : state.jackpotActive
      ? `🎉 Jackpot! +${state.jackpotCoinsWon}`
      : state.jackpotEnding
        ? `🎉 Jackpot! +${state.jackpotCoinsWon}`
        : state.jackpotQueued
          ? "🎡 Jackpot en espera"
        : state.isSpinning
          ? "Girando..."
        : state.lastCoinLoss > 0 && state.surpriseStage === "hidden"
          ? "Robamonedas!"
        : state.lastCoinReward > 0 && state.comboMultiplier > 0 && state.surpriseStage === "hidden"
          ? `Combo x${state.comboMultiplier}`
        : state.lastCoinReward > 0 && state.surpriseStage === "hidden"
          ? "Premio!"
        : state.kissShieldTriggered
          ? "Te salvaste!"
        : state.doubleStakeNextSpin
          ? "x2 activo"
        : state.comboMultiplier > 0
          ? `Combo x${state.comboMultiplier}`
        : state.surpriseStage === "pending" || state.surpriseStage === "choosing" || state.surpriseStage === "revealing" || state.surpriseStage === "revealed"
            ? "Wow! Premio sorpresa"
          : state.investedKisses > 0
            ? "Click en Girar"
            : "Agrega más besos";

    const statusDetail = state.sessionLockedForToday
      ? "Vuelve mañana para seguir jugando."
      : state.sessionPendingLockUntilComboBreak
        ? "Tiempo agotado. Tu combo te mantiene en juego."
      : state.jackpotActive
      ? `Presiona rapido | ${state.jackpotSecondsLeft}s`
      : state.jackpotEnding
        ? "Jackpot terminando..."
        : state.jackpotQueued
          ? "Tu siguiente giro activara un Jackpot"
        : state.isSpinning
          ? this.getSpinCopy(state)
        : state.lastCoinLoss > 0 && state.surpriseStage === "hidden"
          ? `Te roba ${state.lastCoinLoss} monedas`
        : state.lastCoinReward > 0 && state.surpriseStage === "hidden"
          ? state.comboMultiplier > 0
            ? `Premio final: +${state.lastCoinReward} monedas`
            : `Premio final: +${state.lastCoinReward} monedas`
        : state.kissShieldTriggered
          ? "Tu beso blindado absorbio la perdida y saliste intacta."
        : state.doubleStakeNextSpin
          ? "Siguiente giro duplica monedas o besos"
        : state.comboMultiplier === 0 && state.comboLastSource === "El combo se rompio."
          ? this.getComboBreakCopy(state)
        : state.comboMultiplier > 0
          ? `Racha cargada en x${state.comboMultiplier}`
        : state.surpriseStage === "pending" || state.surpriseStage === "choosing" || state.surpriseStage === "revealing" || state.surpriseStage === "revealed"
            ? "La suerte te esta preparando algo especial"
        : state.multiplierPreview
          ? state.multiplierPreview
          : state.investedKisses > 0
            ? `Tiempo restante: ${sessionRemainingText}`
            : "Recarga para seguir jugando";

    const statusMode = state.sessionLockedForToday
      ? "is-hot"
      : state.isSpinning
      ? "is-spinning"
      : state.jackpotEnding || state.jackpotActive || state.jackpotQueued || state.doubleStakeNextSpin
        ? "is-hot"
        : "is-idle";

    const shouldPulseCombo = state.comboPulseToken > 0 && state.comboPulseToken !== this.lastRenderedComboPulseToken;
    const comboPulseClass = shouldPulseCombo
      ? state.comboPulseVariant === "boost"
        ? "is-pulsing-boost"
        : "is-pulsing"
      : "";
    const shopNeedsAttention = store.hasShopAttention();

    this.uiRoot.innerHTML = `
      <header class="top-strip">
        <div class="top-strip__counters">
          <div class="icon-counter" data-counter="invested-kisses">
            <span class="icon-counter__emoji">💋</span>
            <strong>${state.investedKisses}</strong>
          </div>
          <div class="icon-counter" data-counter="owed-kisses">
            <span class="icon-counter__emoji">😏</span>
            <strong>${state.owedKisses}</strong>
          </div>
          <div class="icon-counter" data-counter="coins">
            <span class="icon-counter__emoji">🪙</span>
            <strong>${state.coins}</strong>
          </div>
        </div>
        <div class="top-strip__shop-box">
          <button
            class="shop-trigger ${shopNeedsAttention ? "is-available" : ""}"
            data-action="shop"
            aria-label="Tienda"
            ${state.sessionLockedForToday ? "disabled" : ""}
          >
            <span class="shop-trigger__emoji">🎁</span>
          </button>
        </div>
      </header>

      <aside class="arcade-status ${statusMode} ${comboPulseClass}" aria-live="polite">
        <strong class="arcade-status__value">${statusTitle}</strong>
        <span class="arcade-status__detail">${statusDetail}</span>
        ${this.renderArcadeUpgrades(state)}
      </aside>

      <section class="game-panel">
        <div class="floating-utility-buttons">
          <button
            class="floating-utility-button"
            data-action="open-help"
            aria-label="Abrir instructivo"
          >
            ❓
          </button>

          <button
            class="floating-utility-button floating-audio-button"
            data-action="toggle-audio"
            aria-label="${state.audioEnabled ? "Silenciar audio" : "Activar audio"}"
          >
            ${state.audioEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        <button
          class="spin-button ${toneClass(state.lastOutcomeTone)}"
          data-action="primary"
          ${state.sessionLockedForToday || state.isSpinning || state.jackpotEnding || state.surpriseStage !== "hidden" ? "disabled" : ""}
          aria-label="${state.jackpotActive ? "Jackpot!" : state.investedKisses > 0 ? "Girar" : "Agregar más besos"}"
        >
          <span class="spin-button__emoji">${state.isSpinning ? "✨" : state.jackpotEnding ? "⏳" : state.jackpotActive ? "💥" : state.investedKisses > 0 ? "🎡" : "💋"}</span>
          <span>${state.isSpinning ? "Girando..." : state.jackpotEnding ? "Jackpot terminando..." : state.jackpotActive ? "🎉 Jackpot!" : state.investedKisses > 0 ? "Girar" : "Agregar más besos"}</span>
        </button>
      </section>

      ${this.renderOnboarding(state)}

      ${
        state.surpriseStage !== "hidden" && state.surpriseStage !== "pending"
          ? `
            <div class="surprise-experience ${state.surpriseStage}">
              <div class="surprise-overlay"></div>
              <div class="surprise-stage">
                ${this.renderSurpriseCards(state)}
                ${this.renderSurpriseReveal(state)}
              </div>
            </div>
          `
          : ""
      }

      ${
        state.shopOpen
          ? this.renderShop(state)
          : ""
      }

      ${
        state.refillModalOpen
          ? `
            <div class="modal-scrim" data-action="dismiss-modal" data-dismiss-action="close-refill">
              <section class="refill-modal">
                <div class="onboarding-hero onboarding-hero--compact">
                  <span class="onboarding-hero__eyebrow">Sigue jugando</span>
                  <h2>Agregar más besos</h2>
                  <p>Elige cuantos quieres sumar.</p>
                </div>
                <div class="kiss-picker refill-actions" role="group" aria-label="Agregar besos">
                  ${[5, 10, 15, 20]
                    .map(
                      (amount) => `
                        <button class="refill-kiss-option" data-action="refill" data-amount="${amount}">
                          <span class="kiss-option__content">
                            <span class="kiss-option__emoji">💋</span>
                            <strong>${amount}</strong>
                            <small>besos</small>
                          </span>
                        </button>
                      `,
                    )
                    .join("")}
                </div>
                <button class="refill-close" data-action="close-refill">Cerrar</button>
              </section>
            </div>
          `
          : ""
      }

      ${this.renderSessionLockModal(state)}
    `;

    this.attachEvents();
    this.lastRenderedComboPulseToken = state.comboPulseToken;

    if (state.shopOpen) {
      const nextShopModal = this.uiRoot.querySelector<HTMLElement>(".shop-modal");
      if (nextShopModal) {
        nextShopModal.scrollTop = this.shopScrollTop;
      }
    }
  }

  private renderOnboarding(state: GameState): string {
    if (!state.instructionsSeen || state.helpOpen) {
      const page = instructionPages[state.instructionPage] ?? instructionPages[0];
      const isFirstPage = state.instructionPage === 0;
      const isLastPage = state.instructionPage === instructionPages.length - 1;
      const isInitialFlow = !state.instructionsSeen;

      return `
        <div class="modal-scrim onboarding-scrim" data-action="dismiss-modal" data-dismiss-action="${isInitialFlow ? "finish-instructions" : "close-help"}">
          <section class="onboarding-modal onboarding-modal--intro" aria-label="Instructivo del juego">
            <div class="onboarding-hero">
              <span class="onboarding-hero__eyebrow">${page.eyebrow}</span>
              <button
                class="onboarding-close"
                data-action="${isInitialFlow ? "finish-instructions" : "close-help"}"
                aria-label="Cerrar instructivo"
              >
                ✕
              </button>
              <h1>${page.title}</h1>
              <p>${page.intro}</p>
            </div>

            <div class="onboarding-copy">
              <ul class="onboarding-bullets">
              ${page.bullets
                .map(
                  (bullet) => `
                    <li>${bullet}</li>
                  `,
                )
                .join("")}
              </ul>
            </div>

            <div class="onboarding-actions">
              <button class="onboarding-nav-button" data-action="instruction-prev" ${isFirstPage ? "disabled" : ""} aria-label="Pagina anterior">←</button>
              <span class="onboarding-page-indicator onboarding-page-indicator--footer">Pagina ${state.instructionPage + 1} de ${instructionPages.length}</span>
              <button class="onboarding-nav-button" data-action="instruction-next" ${isLastPage ? "disabled" : ""} aria-label="Pagina siguiente">→</button>
            </div>
            <button class="onboarding-button onboarding-button--bottom" data-action="${isInitialFlow ? "finish-instructions" : "close-help"}">${isInitialFlow ? "Empezar" : "Cerrar"}</button>
          </section>
        </div>
      `;
    }

    if (state.commitmentAccepted) {
      return "";
    }

    return `
      <div class="modal-scrim onboarding-scrim">
        <section class="onboarding-modal onboarding-modal--setup" aria-label="Configurar besos iniciales">
          <div class="onboarding-hero onboarding-hero--compact">
            <span class="onboarding-hero__eyebrow">Antes de empezar</span>
            <h2>Elige tus besos iniciales</h2>
            <p>¿Cuántos besos apuestas?</p>
          </div>

          <div class="kiss-picker" role="radiogroup" aria-label="Besos iniciales">
            ${[5, 10, 15, 20]
              .map(
                (amount, index) => `
                  <label class="kiss-option">
                    <input type="radio" name="initial-kisses" value="${amount}" ${index === 1 ? "checked" : ""} />
                    <span class="kiss-option__content">
                      <span class="kiss-option__emoji">💋</span>
                      <strong>${amount}</strong>
                      <small>besos</small>
                    </span>
                  </label>
                `,
              )
              .join("")}
          </div>

          <label class="commitment-check">
            <input type="checkbox" id="commitment-check" />
            <span>
              Me comprometo a darte los besos que te deba.
            </span>
          </label>

          <p class="onboarding-error" data-onboarding-error hidden>
            Debes aceptar los terminos para entrar al juego.
          </p>

          <button class="onboarding-button" data-action="start-game" disabled>Entrar al juego</button>
        </section>
      </div>
    `;
  }

  private renderSessionLockModal(state: GameState): string {
    if (!state.sessionLockedForToday) {
      return "";
    }

    return `
      <div class="modal-scrim session-lock-scrim">
        <section class="session-lock-modal" aria-label="Sesion terminada">
          <div class="onboarding-hero">
            <span class="onboarding-hero__eyebrow">Hasta aqui por hoy</span>
            <h2>Sesion terminada</h2>
            <p>${sessionConfig.sessionEndMessage}</p>
          </div>
          <p class="session-lock-modal__detail">Tu limite diario es de ${sessionConfig.sessionDurationMinutes} minutos. Mañana se volvera a activar la ruleta.</p>
        </section>
      </div>
    `;
  }

  private renderSurpriseCards(state: GameState): string {
    return `
      <div class="surprise-header">
        <strong>Premio sorpresa</strong>
        <span>Elige uno de los regalos para descubrir tu premio</span>
      </div>
      <div class="surprise-cards ${state.surpriseStage}">
        ${[0, 1, 2]
          .map((index) => {
            const isSelected = state.selectedSurpriseCardIndex === index;
            const shouldHide = state.selectedSurpriseCardIndex !== null && !isSelected;
            return `
              <button
                class="surprise-mystery-card ${isSelected ? "is-selected" : ""} ${shouldHide ? "is-hidden" : ""}"
                data-action="surprise-card"
                data-card-index="${index}"
                ${state.surpriseStage !== "choosing" ? "disabled" : ""}
              >
                <span class="surprise-mystery-card__emoji">🎁</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  private renderArcadeUpgrades(_state: GameState): string {
    return "";
  }

  private renderSurpriseReveal(state: GameState): string {
    if (!state.revealedSurpriseOption || (state.surpriseStage !== "revealing" && state.surpriseStage !== "revealed")) {
      return "";
    }

    return `
      <div class="surprise-reveal ${state.surpriseStage}">
        <div class="surprise-reveal__card">
          <span class="surprise-reveal__emoji">${state.revealedSurpriseOption.emoji}</span>
          <strong>${state.revealedSurpriseOption.label}</strong>
          <p>${state.revealedSurpriseOption.description}</p>
          <button class="surprise-reveal__close" data-action="close-surprise">Continuar</button>
        </div>
      </div>
    `;
  }

  private renderShop(state: GameState): string {
    const rewardCards = store.getRewardCards().filter((card) => card.visible || card.isReserved || card.isClaimed);
    const upgradeCards = store.getUpgradeCards();
    const dailyRewardCards = store.getDailyRewardCards();
    const isRewardsTab = state.shopTab === "rewards";
    const isUpgradesTab = state.shopTab === "upgrades";
    const isDailyRewardsTab = state.shopTab === "daily-rewards";

    return `
      <div class="modal-scrim shop-scrim" data-action="dismiss-modal" data-dismiss-action="close-shop">
        <section class="shop-modal" aria-label="Tienda romantica">
          <div class="shop-modal__header">
            <div class="shop-copy">
              <strong>Tienda de regalos</strong>
              <span>Canjea tus monedas por sorpresas romanticas y desbloquea detalles bonitos.</span>
            </div>
            <button class="shop-close" data-action="close-shop" aria-label="Cerrar tienda">✕</button>
          </div>

          <div class="shop-tabs" role="tablist" aria-label="Secciones de tienda">
            <button class="shop-tab ${isRewardsTab ? "is-active" : ""}" data-action="shop-tab" data-tab="rewards">🎁 Regalos</button>
            <button class="shop-tab ${isUpgradesTab ? "is-active" : ""}" data-action="shop-tab" data-tab="upgrades">⚡ Mejoras</button>
            <button class="shop-tab ${isDailyRewardsTab ? "is-active" : ""}" data-action="shop-tab" data-tab="daily-rewards">🎀 Recompensas</button>
          </div>

          <div class="shop-grid">
            ${isRewardsTab
              ? rewardCards.map((card) => this.renderShopCard(card, state)).join("")
              : isUpgradesTab
                ? upgradeCards.map((card) => this.renderUpgradeCard(card)).join("")
                : dailyRewardCards.map((card) => this.renderDailyRewardCard(card)).join("")}
          </div>
        </section>
      </div>
    `;
  }

  private renderShopCard(card: RewardCardViewModel, state: GameState): string {
    const { reward } = card;
    const isLocked = card.stateLabel === "Bloqueado";
    const isBought = card.isReserved || card.isClaimed;
    const needsMoreCoins = !isLocked && !isBought && !card.canAfford;
    const rewardBadge = reward.tier === 3
      ? { label: "Epico", className: "shop-card__badge--epic" }
      : reward.tier === 2
        ? { label: "Raro", className: "shop-card__badge--rare" }
        : null;

    const ctaLabel = isBought
      ? "Comprado"
      : isLocked
        ? "Bloqueado"
        : needsMoreCoins
          ? `Faltan ${Math.max(reward.price - state.coins, 0)}`
          : "Comprar";

    return `
      <article class="shop-card ${isLocked ? "is-locked" : ""} ${isBought ? "is-bought" : ""}">
        ${rewardBadge ? `<span class="shop-card__badge ${rewardBadge.className}">${rewardBadge.label}</span>` : ""}
        <div class="shop-card__art" aria-hidden="true">${reward.emoji}</div>
        <strong class="shop-card__title">${reward.name}</strong>
        <span class="shop-card__price">🪙 ${card.displayPrice}</span>
        <button
          class="shop-card__button"
          data-action="buy-reward"
          data-reward-id="${reward.id}"
          ${(isLocked || isBought || !card.canReserve) ? "disabled" : ""}
        >
          ${ctaLabel}
        </button>
      </article>
    `;
  }

  private renderUpgradeCard(card: UpgradeCardViewModel): string {
    const { upgrade } = card;
    const upgradeBadge = upgrade.tier === 3
      ? { label: "Epico", className: "shop-card__badge--epic" }
      : upgrade.tier === 2
        ? { label: "Raro", className: "shop-card__badge--rare" }
        : null;
    const ctaLabel = card.isActive
      ? "Activa"
      : card.isPurchased
        ? "Comprada"
        : card.isSuperseded
          ? "Superada"
          : card.isBlockedByPrerequisite
            ? "Bloqueada"
          : card.canAfford
            ? "Comprar"
            : `Faltan ${upgrade.price - store.getState().coins}`;

    return `
      <article class="shop-card shop-card--upgrade ${card.isActive || card.isPurchased ? "is-bought" : ""} ${card.isSuperseded || card.isBlockedByPrerequisite ? "is-locked" : ""}">
        ${upgradeBadge ? `<span class="shop-card__badge ${upgradeBadge.className}">${upgradeBadge.label}</span>` : ""}
        <div class="shop-card__art shop-card__art--upgrade" aria-hidden="true">${upgrade.emoji}</div>
        <strong class="shop-card__title">${upgrade.name}</strong>
        <span class="shop-card__price">🪙 ${card.displayPrice}</span>
        <p class="shop-card__description">${upgrade.description}</p>
        ${card.helper ? `<p class="shop-card__description">${card.helper}</p>` : ""}
        <button
          class="shop-card__button"
          data-action="buy-upgrade"
          data-upgrade-id="${upgrade.id}"
          ${(!card.canBuy) ? "disabled" : ""}
        >
          ${ctaLabel}
        </button>
      </article>
    `;
  }

  private renderDailyRewardCard(card: DailyRewardCardViewModel): string {
    const { reward } = card;
    const cardStateClass = card.state === "available"
      ? "is-daily-available"
      : card.state === "claimed-today"
        ? "is-daily-claimed-today"
        : card.state === "claimed-past"
          ? "is-daily-claimed-past"
          : card.state === "locked"
            ? "is-daily-locked"
            : "is-daily-upcoming";
    const ctaLabel = card.state === "available"
      ? "Reclamar"
      : card.state === "claimed-today"
        ? "Reclamada"
        : card.state === "claimed-past"
          ? "Completada"
          : card.state === "locked"
            ? "Bloqueada"
            : "Pendiente";

    return `
      <article class="shop-card shop-card--daily ${cardStateClass}">
        <span class="shop-card__badge shop-card__badge--daily">Dia ${reward.day}</span>
        <div class="shop-card__art shop-card__art--daily" aria-hidden="true">${reward.emoji}</div>
        <strong class="shop-card__title">${reward.title}</strong>
        ${card.badgeLabel ? `<span class="shop-card__price">${card.badgeLabel}</span>` : ""}
        <p class="shop-card__description">${card.helper}</p>
        <button
          class="shop-card__button shop-card__button--daily"
          data-action="claim-daily-reward"
          data-daily-reward-day="${reward.day}"
          ${card.canClaim ? "" : "disabled"}
        >
          ${ctaLabel}
        </button>
      </article>
    `;
  }

  private syncJackpotState(state: GameState): void {
    if (!this.game) {
      return;
    }

    const rouletteScene = this.game.scene.getScene("roulette");
    if (!rouletteScene) {
      return;
    }

    const scene = rouletteScene as RouletteScene;

    if (state.jackpotActive && !this.wasJackpotActive) {
      this.wasJackpotActive = true;
      scene.startJackpotMode();
      if (this.jackpotIntervalId) {
        window.clearInterval(this.jackpotIntervalId);
      }

      const jackpotDurationSeconds = store.getJackpotDurationSeconds();
      const endAt = Date.now() + jackpotDurationSeconds * 1000;
      store.startJackpot(jackpotDurationSeconds);
      this.jackpotIntervalId = window.setInterval(() => {
        const remainingMs = endAt - Date.now();
        const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
        store.tickJackpot(secondsLeft);

        if (remainingMs <= 0) {
          if (this.jackpotIntervalId) {
            window.clearInterval(this.jackpotIntervalId);
            this.jackpotIntervalId = undefined;
          }
          store.beginJackpotEnding();
          void (async () => {
            try {
              await Promise.race([
                scene.stopJackpotModeSmooth(),
                new Promise<void>((resolve) => {
                  window.setTimeout(resolve, 2600);
                }),
              ]);
            } finally {
              scene.stopJackpotMode();
              audioManager.stopJackpot();
              store.endJackpot();
              this.wasJackpotActive = false;
            }
          })();
        }
      }, 100);
    } else if (!state.jackpotActive && this.wasJackpotActive) {
      this.wasJackpotActive = false;
      scene.stopJackpotMode();
      audioManager.stopJackpot();
      if (this.jackpotIntervalId) {
        window.clearInterval(this.jackpotIntervalId);
        this.jackpotIntervalId = undefined;
      }
    }
  }

  private attachEvents(): void {
    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='dismiss-modal']").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (event.target !== element) {
          return;
        }

        const dismissAction = element.dataset.dismissAction;
        if (!dismissAction) {
          return;
        }

        if (dismissAction === "close-shop") {
          store.closeShop();
          return;
        }

        if (dismissAction === "close-refill") {
          store.closeRefillModal();
          return;
        }

        if (dismissAction === "close-help") {
          store.closeHelp();
          return;
        }

        if (dismissAction === "finish-instructions") {
          store.finishInstructions();
        }
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='continue-intro']").forEach((element) => {
      element.addEventListener("click", () => {
        store.dismissInstructions();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='open-help']").forEach((element) => {
      element.addEventListener("click", () => {
        store.openHelp();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='close-help']").forEach((element) => {
      element.addEventListener("click", () => {
        store.closeHelp();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='instruction-next']").forEach((element) => {
      element.addEventListener("click", () => {
        store.nextInstructionPage();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='instruction-prev']").forEach((element) => {
      element.addEventListener("click", () => {
        store.previousInstructionPage();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='finish-instructions']").forEach((element) => {
      element.addEventListener("click", () => {
        store.finishInstructions();
      });
    });

    const commitmentCheck = this.uiRoot?.querySelector<HTMLInputElement>("#commitment-check");
    const onboardingSubmit = this.uiRoot?.querySelector<HTMLButtonElement>("[data-action='start-game']");
    const onboardingError = this.uiRoot?.querySelector<HTMLElement>("[data-onboarding-error]");

    const syncOnboardingForm = (): void => {
      if (!commitmentCheck || !onboardingSubmit) {
        return;
      }

      onboardingSubmit.disabled = !commitmentCheck.checked;
      if (commitmentCheck.checked && onboardingError) {
        onboardingError.hidden = true;
      }
    };

    commitmentCheck?.addEventListener("change", syncOnboardingForm);
    syncOnboardingForm();

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='start-game']").forEach((element) => {
      element.addEventListener("click", () => {
        const selectedKissInput = this.uiRoot?.querySelector<HTMLInputElement>("input[name='initial-kisses']:checked");
        const selectedKisses = Number(selectedKissInput?.value ?? 0);

        if (!commitmentCheck?.checked) {
          if (onboardingError) {
            onboardingError.hidden = false;
          }
          return;
        }

        if (selectedKisses > 0) {
          store.confirmCommitment(selectedKisses, "");
        }
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='primary']").forEach((element) => {
      element.addEventListener("click", async () => {
        await this.handlePrimaryAction();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='shop']").forEach((element) => {
      element.addEventListener("click", () => {
        void element;
        store.openShop();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='close-shop']").forEach((element) => {
      element.addEventListener("click", () => {
        store.closeShop();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='shop-tab']").forEach((element) => {
      element.addEventListener("click", () => {
        const tab = element.dataset.tab;
        if (tab === "rewards" || tab === "upgrades" || tab === "daily-rewards") {
          this.shopScrollTop = 0;
          store.setShopTab(tab);
        }
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='claim-daily-reward']").forEach((element) => {
      element.addEventListener("click", () => {
        const claimedReward = store.claimDailyReward();
        if (!claimedReward) {
          return;
        }

        audioManager.playTone("special", store.getState(), claimedReward.opensSurprise ? "purchase" : "coins");
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='buy-reward']").forEach((element) => {
      element.addEventListener("click", () => {
        const rewardId = element.dataset.rewardId;
        if (!rewardId) {
          return;
        }

        const reserved = store.reserveReward(rewardId);
        if (reserved) {
          const reward = rewardCatalog.find((item) => item.id === rewardId);
          const latestState = store.getState();
          if (reward) {
            void sendRewardReservedEmail({
              rewardName: reward.name,
              rewardEmoji: reward.emoji,
              price: reward.price,
              coinsRemaining: latestState.coins,
              reservedAt: this.formatLocalDateTime(),
              lastOutcomeMessage: latestState.lastOutcomeMessage,
            });
          }
          audioManager.playTone("special", store.getState(), "purchase");
        }
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='buy-upgrade']").forEach((element) => {
      element.addEventListener("click", () => {
        const upgradeId = element.dataset.upgradeId;
        if (!upgradeId) {
          return;
        }

        const purchased = store.purchaseUpgrade(upgradeId);
        if (purchased) {
          audioManager.playTone("special", store.getState(), "purchase");
        }
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='toggle-audio']").forEach((element) => {
      element.addEventListener("click", () => {
        store.toggleAudio();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='refill']").forEach((element) => {
      element.addEventListener("click", () => {
        const amount = Number(element.dataset.amount);
        if (amount > 0) {
          store.addMoreKisses(amount);
        }
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='close-refill']").forEach((element) => {
      element.addEventListener("click", () => {
        store.closeRefillModal();
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='surprise-card']").forEach((element) => {
      element.addEventListener("click", () => {
        const cardIndex = Number(element.dataset.cardIndex);
        const option = store.selectSurpriseCard(cardIndex);
        if (!option) {
          return;
        }

        audioManager.playReveal(store.getState());
      });
    });

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='close-surprise']").forEach((element) => {
      element.addEventListener("click", () => {
        this.clearSurpriseTimers();
        store.closeSurpriseExperience();
      });
    });
  }

  private pickWeightedSegment() {
    const state = store.getState();
    if (state.jackpotQueued) {
      return store.getWheelSegments().find((segment) => segment.id === "jackpot") ?? store.getWheelSegments()[0];
    }

    let segments = store.getWheelSegments();
    if (state.doubleStakeNextSpin) {
      segments = segments.filter((segment) => segment.kind === "coins" || segment.kind === "debt");
    }
    const debtWeightMultiplier = state.comboMultiplier > 0
      ? 1 + state.comboMultiplier * 0.08
      : 1;
    const activeLuckId = store.getActiveArcadeUpgrades().find((upgrade) => upgrade.family === "suerte")?.id;
    const hasLovePolice = store.getActiveArcadeUpgrades().some((upgrade) => upgrade.id === "policia-del-amor");

    const weightedSegments = segments.map((segment) => ({
      ...segment,
      effectiveWeight: (() => {
        if (segment.id === "coins-5" && activeLuckId === "suerte-1") {
          return 20;
        }
        if (segment.id === "coins-10" && activeLuckId === "suerte-2") {
          return 16;
        }
        if (segment.id === "coins-15" && activeLuckId === "suerte-3") {
          return 11;
        }
        if (segment.id === "coin-steal" && hasLovePolice) {
          return 2.5;
        }
        return segment.kind === "debt" ? segment.weight * debtWeightMultiplier : segment.weight;
      })(),
    }));

    const totalWeight = weightedSegments.reduce((sum, segment) => sum + segment.effectiveWeight, 0);
    let threshold = Math.random() * totalWeight;

    for (const segment of weightedSegments) {
      threshold -= segment.effectiveWeight;
      if (threshold <= 0) {
        return store.getWheelSegments().find((item) => item.id === segment.id) ?? segment;
      }
    }

    return store.getWheelSegments().find((item) => item.id === weightedSegments[weightedSegments.length - 1]?.id) ?? segments[segments.length - 1];
  }

  private clearSurpriseTimers(): void {
    this.surpriseTimers.forEach((timer) => window.clearTimeout(timer));
    this.surpriseTimers = [];
  }
}
