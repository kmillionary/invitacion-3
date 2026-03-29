import Phaser from "phaser";
import { audioManager } from "../audio/audioManager";
import { createGame } from "../game/createGame";
import { store } from "../state/store";
import type { GameState, RewardCardViewModel, UpgradeCardViewModel } from "../state/types";
import { RouletteScene } from "../game/RouletteScene";

const toneClass = (tone: GameState["lastOutcomeTone"]): string => `tone-${tone}`;
const instructionPages = [
  {
    eyebrow: "Guia rapida",
    title: "Como jugar",
    intro: "Todo es simple. Gira, gana y compra.",
    bullets: [
      "💋 Cada giro usa 1 beso.",
      "🪙 La ruleta puede darte monedas.",
      "🎁 Las monedas sirven en la tienda.",
      "😏 A veces tambien te toca pagar besos.",
    ],
  },
  {
    eyebrow: "Guia rapida",
    title: "Casillas e iconos",
    intro: "Cada dibujo te dice lo que puede pasar.",
    bullets: [
      "🪙 Monedas: ganas premio.",
      "🎁 Sorpresa: sale algo especial.",
      "💋 Escudo: te protege una vez.",
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
  private activeArcadeUpgradeId: string | null = null;
  private lastRenderedComboPulseToken = 0;
  private readonly handleDocumentClick = (event: MouseEvent): void => {
    if (!this.activeArcadeUpgradeId) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("[data-action='upgrade-tooltip']") || target.closest(".arcade-upgrade-tooltip")) {
      return;
    }

    this.activeArcadeUpgradeId = null;
    this.render(store.getState());
  };

  constructor(private root: HTMLElement) {}

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
    document.addEventListener("click", this.handleDocumentClick);
    this.lastRenderedComboPulseToken = store.getState().comboPulseToken;

    store.subscribe((state) => {
      audioManager.sync(state);
      this.syncJackpotState(state);
      this.render(state);
    });
  }

  async spin(): Promise<void> {
    const state = store.getState();

    if (!this.game || state.isSpinning || state.investedKisses <= 0 || state.surpriseModalOpen || state.surpriseStage !== "hidden") {
      return;
    }

    const segment = this.pickWeightedSegment();
    store.beginSpin(segment.id);
    audioManager.playSpin(store.getState());

    const scene = this.game.scene.getScene("roulette") as RouletteScene;
    await scene.spinToSegment(segment);
    const resolution = store.resolveSpin(segment.id);

    if (resolution) {
      const playedSound = audioManager.playTone(resolution.tone, store.getState(), resolution.audioCue);
      const effectParts = [
        typeof resolution.coinsDelta === "number" ? `monedas +${resolution.coinsDelta}` : null,
        typeof resolution.debtDelta === "number" ? `besos perdidos +${resolution.debtDelta}` : null,
        resolution.setDoubleStake ? "activa DOBLE APUESTA" : null,
        resolution.setKissShield ? "activa BESO BLINDADO" : null,
        resolution.consumeKissShield ? "bloquea perdida de besos" : null,
        resolution.opensSurprise ? "abre PREMIO SORPRESA" : null,
      ].filter(Boolean);

      console.log("[Ruleta]", {
        casilla: segment.label,
        efecto: effectParts.length > 0 ? effectParts.join(", ") : "sin cambio numerico directo",
        mensaje: resolution.message,
        sonido: playedSound,
      });

      scene.pulseTone(resolution.tone);

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
    const state = store.getState();

    if (state.jackpotEnding) {
      return;
    }

    if (state.jackpotActive) {
      store.awardJackpotCoin();
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

    const existingShopModal = this.uiRoot.querySelector<HTMLElement>(".shop-modal");
    if (existingShopModal) {
      this.shopScrollTop = existingShopModal.scrollTop;
    } else if (!state.shopOpen) {
      this.shopScrollTop = 0;
    }

    const statusTitle = state.jackpotActive
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
        : state.kissShieldActive
          ? "Beso blindado"
        : state.doubleStakeNextSpin
          ? "x2 activo"
        : state.comboMultiplier > 0
          ? `Combo x${state.comboMultiplier}`
        : state.surpriseStage === "pending" || state.surpriseStage === "choosing" || state.surpriseStage === "revealing" || state.surpriseStage === "revealed"
            ? "Wow! Premio sorpresa"
          : state.investedKisses > 0
            ? "Click en Girar"
            : "Agrega más besos";

    const statusDetail = state.jackpotActive
      ? `Presiona rapido | ${state.jackpotSecondsLeft}s`
      : state.jackpotEnding
        ? "Jackpot terminando..."
        : state.jackpotQueued
          ? "Tu siguiente giro activara un Jackpot"
        : state.isSpinning
          ? "La suerte esta decidiendo"
        : state.lastCoinLoss > 0 && state.surpriseStage === "hidden"
          ? `Te roba ${state.lastCoinLoss} monedas`
        : state.lastCoinReward > 0 && state.surpriseStage === "hidden"
          ? state.comboMultiplier > 0
            ? `Premio final: +${state.lastCoinReward} monedas`
            : `Premio final: +${state.lastCoinReward} monedas`
        : state.kissShieldTriggered
          ? "Tu escudo beso absorbio la perdida y saliste intacta."
        : state.kissShieldActive
          ? "No debes besos en el siguiente giro"
        : state.doubleStakeNextSpin
          ? "Siguiente giro duplica monedas o besos"
        : state.comboMultiplier === 0 && state.comboLastSource === "El combo se rompio."
          ? "Pierdes el combo 😛"
        : state.comboMultiplier > 0
          ? `Racha cargada en x${state.comboMultiplier}`
        : state.surpriseStage === "pending" || state.surpriseStage === "choosing" || state.surpriseStage === "revealing" || state.surpriseStage === "revealed"
            ? "La suerte te esta preparando algo especial"
        : state.multiplierPreview
          ? state.multiplierPreview
          : state.investedKisses > 0
            ? "Tu siguiente giro te espera"
            : "Recarga para seguir jugando";

    const statusMode = state.isSpinning
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

    this.uiRoot.innerHTML = `
      <header class="top-strip">
        <div class="icon-counter">
          <span class="icon-counter__emoji">💋</span>
          <strong>${state.investedKisses}</strong>
        </div>
        <div class="icon-counter">
          <span class="icon-counter__emoji">😏</span>
          <strong>${state.owedKisses}</strong>
        </div>
        <div class="icon-counter">
          <span class="icon-counter__emoji">🪙</span>
          <strong>${state.coins}</strong>
        </div>
        <button class="icon-counter icon-counter--button" data-action="shop" aria-label="Tienda">
          <span class="icon-counter__emoji">🎁</span>
        </button>
      </header>

      <aside class="arcade-status ${statusMode} ${comboPulseClass}" aria-live="polite">
        <strong class="arcade-status__value">${statusTitle}</strong>
        <span class="arcade-status__detail">${statusDetail}</span>
        ${this.renderArcadeUpgrades()}
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
          ${state.isSpinning || state.jackpotEnding || state.surpriseStage !== "hidden" ? "disabled" : ""}
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
            <div class="modal-scrim">
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
        <div class="modal-scrim onboarding-scrim">
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

  private renderArcadeUpgrades(): string {
    const installedUpgrades = store.getActiveArcadeUpgrades();

    if (installedUpgrades.length === 0) {
      return "";
    }

    const activeTooltip = installedUpgrades.find((upgrade) => upgrade.id === this.activeArcadeUpgradeId) ?? null;

    return `
      <div class="arcade-upgrades">
        <div class="arcade-upgrades__chips">
          ${installedUpgrades
            .map(
              (upgrade) => `
                <button
                  class="arcade-upgrade-chip ${this.activeArcadeUpgradeId === upgrade.id ? "is-active" : ""}"
                  data-action="upgrade-tooltip"
                  data-upgrade-id="${upgrade.id}"
                  aria-label="${upgrade.name}"
                >
                  <span>${upgrade.emoji}</span>
                </button>
              `,
            )
            .join("")}
        </div>
        ${
          activeTooltip
            ? `
              <div class="arcade-upgrade-tooltip">
                <strong>${activeTooltip.name}</strong>
                <span>${activeTooltip.description}</span>
              </div>
            `
            : ""
        }
      </div>
    `;
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
    const isRewardsTab = state.shopTab === "rewards";

    return `
      <div class="modal-scrim shop-scrim">
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
            <button class="shop-tab ${!isRewardsTab ? "is-active" : ""}" data-action="shop-tab" data-tab="upgrades">⚡ Mejoras</button>
          </div>

          <div class="shop-grid">
            ${isRewardsTab
              ? rewardCards.map((card) => this.renderShopCard(card, state)).join("")
              : upgradeCards.map((card) => this.renderUpgradeCard(card)).join("")}
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
          : card.canAfford
            ? "Comprar"
            : `Faltan ${upgrade.price - store.getState().coins}`;

    return `
      <article class="shop-card shop-card--upgrade ${card.isActive || card.isPurchased ? "is-bought" : ""} ${card.isSuperseded ? "is-locked" : ""}">
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

    this.uiRoot?.querySelectorAll<HTMLElement>("[data-action='upgrade-tooltip']").forEach((element) => {
      element.addEventListener("click", () => {
        const upgradeId = element.dataset.upgradeId;
        if (!upgradeId) {
          return;
        }

        this.activeArcadeUpgradeId = this.activeArcadeUpgradeId === upgradeId ? null : upgradeId;
        this.render(store.getState());
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
        if (tab === "rewards" || tab === "upgrades") {
          this.shopScrollTop = 0;
          store.setShopTab(tab);
        }
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
    if (state.kissShieldActive) {
      segments = segments.filter((segment) => segment.kind === "coins");
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
