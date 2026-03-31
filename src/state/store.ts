import { createSurprisePool, dailyRewardCatalog, energyConfig, invitationConfig, rewardCatalog, upgradeCatalog, wheelSegments } from "../content/config";
import type { DailyRewardCardViewModel, DailyRewardItem, GameState, RewardCardViewModel, RewardItem, SpinResolution, SurpriseOption, UpgradeCardViewModel, UpgradeFamily, UpgradeItem, WheelSegment } from "./types";

const STORAGE_KEY = "romantic-roulette-save-v1";
const LEGACY_UPGRADE_ID_MAP: Record<string, string> = {
  "golden-coin": "golden-coin-1",
  "jackpot-plus": "jackpot-extendido-1",
};
const REPLACEABLE_FAMILIES = new Set<UpgradeFamily>([
  "golden-coin",
  "impaciente",
  "suerte",
  "jackpot-extendido",
]);
const KISS_GUARD_SPIN_INTERVAL = 7;
const ENERGY_REGEN_INTERVAL_MS = 120_000;

const initialUnlockedRewards = rewardCatalog
  .filter((reward) => reward.tier === 1)
  .map((reward) => reward.id);
const wheelSegmentIds = wheelSegments.map((segment) => segment.id);

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const createWheelSegmentOrder = (): string[] => shuffle(wheelSegmentIds);

const getLocalDateKey = (timestamp = Date.now()): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createEnergyState = (updatedAt = Date.now()): Pick<GameState, "energy" | "energyMax" | "energyPerSpin" | "energyRegenPerMinute" | "energyLastUpdatedAt" | "energyDepleted"> => ({
  energy: energyConfig.energyMax,
  energyMax: energyConfig.energyMax,
  energyPerSpin: energyConfig.energyPerSpin,
  energyRegenPerMinute: energyConfig.energyRegenPerMinute,
  energyLastUpdatedAt: updatedAt,
  energyDepleted: false,
});

const syncEnergyState = (state: GameState, now = Date.now()): GameState => {
  const energyMax = state.energyMax > 0 ? state.energyMax : energyConfig.energyMax;
  const energyPerSpin = state.energyPerSpin > 0 ? state.energyPerSpin : energyConfig.energyPerSpin;
  const energyRegenPerMinute = state.energyRegenPerMinute > 0 ? state.energyRegenPerMinute : energyConfig.energyRegenPerMinute;
  let energy = Math.min(energyMax, Math.max(0, state.energy));
  let energyLastUpdatedAt = state.energyLastUpdatedAt > 0 ? state.energyLastUpdatedAt : now;

  if (state.jackpotActive || state.jackpotEnding) {
    return {
      ...state,
      energy,
      energyMax,
      energyPerSpin,
      energyRegenPerMinute,
      energyLastUpdatedAt: now,
      energyDepleted: energy < energyPerSpin,
    };
  }

  if (energy < energyMax && now > energyLastUpdatedAt) {
    const elapsedMs = now - energyLastUpdatedAt;
    const recoveredTicks = Math.floor(elapsedMs / ENERGY_REGEN_INTERVAL_MS);

    if (recoveredTicks > 0) {
      energy = Math.min(energyMax, energy + recoveredTicks * energyRegenPerMinute);
      energyLastUpdatedAt += recoveredTicks * ENERGY_REGEN_INTERVAL_MS;
    }
  }

  if (energy >= energyMax) {
    energy = energyMax;
    energyLastUpdatedAt = now;
  }

  return {
    ...state,
    energy,
    energyMax,
    energyPerSpin,
    energyRegenPerMinute,
    energyLastUpdatedAt,
    energyDepleted: energy < energyPerSpin,
  };
};

const normalizeWheelSegmentOrder = (order?: string[]): string[] => {
  if (!order) {
    return createWheelSegmentOrder();
  }

  const filtered = order.filter((segmentId, index, collection) =>
    wheelSegmentIds.includes(segmentId) && collection.indexOf(segmentId) === index
  );

  if (filtered.length !== wheelSegmentIds.length) {
    return createWheelSegmentOrder();
  }

  return filtered;
};

const initialState = (): GameState => ({
  ...createEnergyState(),
  dailyRewardLastClaimDateKey: null,
  dailyRewardLastClaimDayIndex: null,
  investedKisses: 0,
  owedKisses: 0,
  coins: 0,
  totalCoinsEarned: 0,
  totalCoinsSpent: 0,
  totalCoinsLost: 0,
  totalJackpotsTriggered: 0,
  totalSurprisesOpened: 0,
  committedTotal: 0,
  playerName: "",
  commitmentAccepted: false,
  instructionsSeen: false,
  helpOpen: false,
  instructionPage: 0,
  introStarted: false,
  acceptedInvitation: false,
  audioEnabled: true,
  musicEnabled: true,
  reservedRewardIds: [],
  claimedRewardIds: [],
  unlockedRewardIds: initialUnlockedRewards,
  purchasedUpgradeIds: [],
  shopTab: "rewards",
  doubleStakeNextSpin: false,
  kissShieldCharges: 0,
  kissGuardChargeReady: false,
  kissShieldTriggered: false,
  kissShieldSpinProgress: 0,
  lastCoinReward: 0,
  lastCoinLoss: 0,
  comboMultiplier: 0,
  comboPulseToken: 0,
  comboLastSource: "",
  comboPulseVariant: "normal",
  surpriseModalOpen: false,
  isSpinning: false,
  spinCount: 0,
  highestCoinsReached: 0,
  lastOutcomeMessage: "La ruleta esta lista. Pulsa girar para probar la base principal.",
  multiplierPreview: "",
  lastOutcomeTone: "neutral",
  jackpotActive: false,
  jackpotQueued: false,
  jackpotEnding: false,
  jackpotSecondsLeft: 0,
  jackpotCoinsWon: 0,
  pendingSpinSegmentId: null,
  currentPrizeOptions: [],
  pendingSurpriseCount: 0,
  surpriseStage: "hidden",
  selectedSurpriseCardIndex: null,
  revealedSurpriseOption: null,
  wheelSegmentOrder: createWheelSegmentOrder(),
  invitationOpen: false,
  shopOpen: false,
  refillModalOpen: false,
  topLayerVisible: true,
  invitation: invitationConfig,
});

const sampleUnique = <T>(items: T[], count: number): T[] => {
  const pool = [...items];
  const selected: T[] = [];

  while (pool.length > 0 && selected.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
};

const persistableState = (state: GameState): GameState => ({
  ...state,
  kissShieldTriggered: false,
  jackpotQueued: false,
  currentPrizeOptions: [],
  pendingSurpriseCount: 0,
  surpriseStage: "hidden",
  selectedSurpriseCardIndex: null,
  revealedSurpriseOption: null,
  surpriseModalOpen: false,
  isSpinning: false,
  helpOpen: false,
  instructionPage: 0,
  pendingSpinSegmentId: null,
  invitationOpen: false,
  shopOpen: false,
  refillModalOpen: false,
  topLayerVisible: true,
});

const loadState = (): GameState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return initialState();
    }

    const parsed = JSON.parse(raw) as Partial<GameState>;
    const purchasedUpgradeIds = (parsed.purchasedUpgradeIds ?? [])
      .map((upgradeId) => LEGACY_UPGRADE_ID_MAP[upgradeId] ?? upgradeId)
      .filter((upgradeId, index, collection) => collection.indexOf(upgradeId) === index)
      .filter((upgradeId) => upgradeCatalog.some((upgrade) => upgrade.id === upgradeId));
    const hasSavedShieldState = typeof parsed.kissShieldSpinProgress === "number";
    const legacyKissShieldActive = typeof (parsed as { kissShieldActive?: unknown }).kissShieldActive === "boolean"
      ? Boolean((parsed as { kissShieldActive?: boolean }).kissShieldActive)
      : false;
    return syncEnergyState({
      ...initialState(),
      ...parsed,
      purchasedUpgradeIds,
      energy: typeof parsed.energy === "number" ? parsed.energy : energyConfig.energyMax,
      energyMax: typeof parsed.energyMax === "number" ? parsed.energyMax : energyConfig.energyMax,
      energyPerSpin: typeof parsed.energyPerSpin === "number" ? parsed.energyPerSpin : energyConfig.energyPerSpin,
      energyRegenPerMinute: typeof parsed.energyRegenPerMinute === "number" ? parsed.energyRegenPerMinute : energyConfig.energyRegenPerMinute,
      energyLastUpdatedAt: typeof parsed.energyLastUpdatedAt === "number" ? parsed.energyLastUpdatedAt : Date.now(),
      energyDepleted: typeof parsed.energyDepleted === "boolean" ? parsed.energyDepleted : false,
      dailyRewardLastClaimDateKey: parsed.dailyRewardLastClaimDateKey ?? null,
      dailyRewardLastClaimDayIndex: parsed.dailyRewardLastClaimDayIndex ?? null,
      wheelSegmentOrder: normalizeWheelSegmentOrder(parsed.wheelSegmentOrder),
      shopTab: parsed.shopTab === "daily-rewards" ? "daily-rewards" : parsed.shopTab ?? "rewards",
      helpOpen: false,
      instructionPage: 0,
      kissShieldCharges: parsed.kissShieldCharges ?? 0,
      kissGuardChargeReady: hasSavedShieldState
        ? parsed.kissGuardChargeReady ?? legacyKissShieldActive ?? false
        : purchasedUpgradeIds.includes("kiss-guard"),
      kissShieldTriggered: false,
      kissShieldSpinProgress: hasSavedShieldState ? parsed.kissShieldSpinProgress ?? 0 : 0,
      jackpotQueued: false,
      currentPrizeOptions: [],
      pendingSurpriseCount: 0,
      surpriseStage: "hidden",
      selectedSurpriseCardIndex: null,
      revealedSurpriseOption: null,
      surpriseModalOpen: false,
      isSpinning: false,
      pendingSpinSegmentId: null,
      invitationOpen: false,
      shopOpen: false,
      refillModalOpen: false,
      topLayerVisible: true,
      invitation: {
        ...invitationConfig,
        ...parsed.invitation,
      },
    });
  } catch {
    return initialState();
  }
};

export class GameStore {
  private state: GameState;
  private listeners = new Set<(state: GameState) => void>();

  constructor() {
    this.state = loadState();
    this.syncUnlocks();
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): GameState {
    return this.state;
  }

  getEnergySecondsUntilNextCharge(now = Date.now()): number {
    const state = syncEnergyState(this.state, now);

    if (state.energy >= state.energyMax) {
      return 0;
    }

    const elapsedSinceLastTick = Math.max(0, now - state.energyLastUpdatedAt);
    return Math.max(1, Math.ceil((ENERGY_REGEN_INTERVAL_MS - elapsedSinceLastTick) / 1000));
  }

  checkEnergyStatus(now = Date.now()): void {
    this.refreshEnergyState(now);
  }

  setState(updater: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void {
    const patch = typeof updater === "function" ? updater(this.state) : updater;
    this.state = { ...this.state, ...patch };
    this.syncUnlocks();
    this.persist();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private persist(): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState(this.state)));
  }

  private refreshEnergyState(now = Date.now()): void {
    const nextState = syncEnergyState(this.state, now);
    const currentStateJson = JSON.stringify(this.state);
    const nextStateJson = JSON.stringify(nextState);

    if (currentStateJson === nextStateJson) {
      return;
    }

    this.state = nextState;
    this.syncUnlocks();
    this.persist();
    this.emit();
  }

  private canSpendEnergy(state = this.state): boolean {
    return state.energy >= state.energyPerSpin;
  }

  private shouldKeepTopLayerVisible(state: GameState): boolean {
    return state.shopOpen
      || state.refillModalOpen
      || state.invitationOpen
      || state.surpriseModalOpen
      || !state.instructionsSeen
      || !state.commitmentAccepted;
  }

  private syncUnlocks(): void {
    const unlocked = new Set(this.state.unlockedRewardIds);
    rewardCatalog.filter((reward) => reward.tier === 1).forEach((reward) => unlocked.add(reward.id));

    this.state = {
      ...this.state,
      unlockedRewardIds: [...unlocked],
      highestCoinsReached: Math.max(this.state.highestCoinsReached, this.state.coins),
    };
  }

  private hasUpgrade(upgradeId: string): boolean {
    return this.state.purchasedUpgradeIds.includes(upgradeId);
  }

  private getUpgradeById(upgradeId: string): UpgradeItem | undefined {
    return upgradeCatalog.find((upgrade) => upgrade.id === upgradeId);
  }

  private getPurchasedUpgradeItems(state = this.state): UpgradeItem[] {
    return state.purchasedUpgradeIds
      .map((upgradeId) => this.getUpgradeById(upgradeId))
      .filter((upgrade): upgrade is UpgradeItem => Boolean(upgrade));
  }

  private getEffectiveUpgradeForFamily(family: UpgradeFamily, state = this.state): UpgradeItem | null {
    const purchasedInFamily = this.getPurchasedUpgradeItems(state)
      .filter((upgrade) => upgrade.family === family)
      .sort((left, right) => right.level - left.level);

    return purchasedInFamily[0] ?? null;
  }

  private hasHigherFamilyUpgrade(targetUpgrade: UpgradeItem, state = this.state): boolean {
    return this.getPurchasedUpgradeItems(state).some((upgrade) =>
      upgrade.family === targetUpgrade.family && upgrade.level > targetUpgrade.level
    );
  }

  private getPreviousFamilyUpgrade(targetUpgrade: UpgradeItem): UpgradeItem | null {
    if (targetUpgrade.level <= 1) {
      return null;
    }

    return upgradeCatalog.find((upgrade) =>
      upgrade.family === targetUpgrade.family && upgrade.level === targetUpgrade.level - 1
    ) ?? null;
  }

  private isUpgradeBlockedByPrerequisite(targetUpgrade: UpgradeItem, state = this.state): boolean {
    const previousUpgrade = this.getPreviousFamilyUpgrade(targetUpgrade);

    if (!previousUpgrade) {
      return false;
    }

    return !state.purchasedUpgradeIds.includes(previousUpgrade.id);
  }

  private normalizePurchasedUpgradeIds(nextUpgradeId: string, state = this.state): string[] {
    const targetUpgrade = this.getUpgradeById(nextUpgradeId);
    if (!targetUpgrade) {
      return state.purchasedUpgradeIds;
    }

    const nextIds = state.purchasedUpgradeIds.filter((upgradeId) => {
      const installed = this.getUpgradeById(upgradeId);
      if (!installed) {
        return false;
      }

      if (!REPLACEABLE_FAMILIES.has(targetUpgrade.family)) {
        return installed.id !== targetUpgrade.id;
      }

      return installed.family !== targetUpgrade.family;
    });

    return [...new Set([...nextIds, nextUpgradeId])];
  }

  private getGoldenCoinBonus(state = this.state): number {
    return this.getEffectiveUpgradeForFamily("golden-coin", state)?.level ?? 0;
  }

  private applyDirectCoinBonus(baseCoins: number, state = this.state): number {
    return baseCoins + this.getGoldenCoinBonus(state);
  }

  private getEffectiveCombo(multiplier: number): number {
    return multiplier > 0 ? multiplier : 1;
  }

  private getComboVariant(source?: string): GameState["comboPulseVariant"] {
    return source === "multiplicador" ? "boost" : "normal";
  }

  private buildComboIncreasePatch(
    state: GameState,
    source: string,
    bonus = 0,
  ): Pick<GameState, "comboMultiplier" | "comboPulseToken" | "comboLastSource" | "comboPulseVariant"> {
    const comboMultiplier = state.comboMultiplier + 1 + bonus;

    return {
      comboMultiplier,
      comboPulseToken: state.comboPulseToken + 1,
      comboLastSource: source,
      comboPulseVariant: this.getComboVariant(source),
    };
  }

  private buildComboBreakPatch(message = "El combo se rompio."): Pick<GameState, "comboMultiplier" | "comboLastSource"> {
    return {
      comboMultiplier: 0,
      comboLastSource: message,
    };
  }

  private applyComboToCoinGain(
    baseCoins: number,
    comboMultiplier: number,
    fallbackMessage: string,
  ): { finalCoins: number; message: string } {
    const effectiveCombo = this.getEffectiveCombo(comboMultiplier);
    const finalCoins = baseCoins * effectiveCombo;

    if (effectiveCombo > 1) {
      return {
        finalCoins,
        message: `${baseCoins} monedas x combo x${effectiveCombo} = ${finalCoins}`,
      };
    }

    return {
      finalCoins,
      message: fallbackMessage,
    };
  }

  private getRewardPrice(reward: RewardItem): number {
    return reward.price;
  }

  private getDailyRewardByDay(day: number): DailyRewardItem {
    return dailyRewardCatalog[(day - 1 + dailyRewardCatalog.length) % dailyRewardCatalog.length] ?? dailyRewardCatalog[0];
  }

  private hasClaimedDailyRewardToday(now = Date.now()): boolean {
    return this.state.dailyRewardLastClaimDateKey === getLocalDateKey(now);
  }

  private getNextDailyRewardDayIndex(now = Date.now()): number {
    if (this.hasClaimedDailyRewardToday(now)) {
      return this.state.dailyRewardLastClaimDayIndex ?? 1;
    }

    if (!this.state.dailyRewardLastClaimDayIndex) {
      return 1;
    }

    return this.state.dailyRewardLastClaimDayIndex >= dailyRewardCatalog.length
      ? 1
      : this.state.dailyRewardLastClaimDayIndex + 1;
  }

  private buildDailyRewardHelper(reward: DailyRewardItem): string {
    const parts: string[] = [];
    const surpriseCount = reward.surpriseCount ?? (reward.opensSurprise ? 1 : 0);

    if (reward.coins) {
      parts.push(`+${reward.coins} monedas`);
    }
    if (reward.kisses) {
      parts.push(`+${reward.kisses} besos`);
    }
    if (reward.shieldCharges) {
      parts.push(`+${reward.shieldCharges} beso${reward.shieldCharges === 1 ? "" : "s"} blindado${reward.shieldCharges === 1 ? "" : "s"}`);
    }
    if (reward.grantsDoubleStake) {
      parts.push("x2 siguiente giro");
    }
    if (reward.grantsJackpot) {
      parts.push("Jackpot asegurado");
    }
    if (surpriseCount > 0) {
      parts.push(surpriseCount === 1 ? "1 sorpresa" : `${surpriseCount} sorpresas`);
    }

    return parts.join(" • ");
  }

  getJackpotDurationSeconds(): number {
    const jackpotLevel = this.getEffectiveUpgradeForFamily("jackpot-extendido")?.level ?? 0;
    if (jackpotLevel >= 2) {
      return 7;
    }
    if (jackpotLevel === 1) {
      return 6;
    }
    return 5;
  }

  getSpinDurationMs(): number {
    const impacienteLevel = this.getEffectiveUpgradeForFamily("impaciente")?.level ?? 0;
    const multiplier = impacienteLevel === 3 ? 0.7 : impacienteLevel === 2 ? 0.8 : impacienteLevel === 1 ? 0.9 : 1;
    return Math.round(3750 * multiplier);
  }

  hasKissShieldAvailable(state = this.state): boolean {
    return state.kissShieldCharges > 0 || state.kissGuardChargeReady;
  }

  getKissShieldTotalCharges(state = this.state): number {
    return state.kissShieldCharges + (state.kissGuardChargeReady ? 1 : 0);
  }

  getKissShieldSpinsRemaining(): number {
    if (!this.state.purchasedUpgradeIds.includes("kiss-guard") || this.state.kissGuardChargeReady) {
      return 0;
    }

    return Math.max(0, KISS_GUARD_SPIN_INTERVAL - this.state.kissShieldSpinProgress);
  }

  getUpgradeTooltipDetail(upgrade: UpgradeItem): string {
    if (upgrade.id !== "kiss-guard") {
      return upgrade.description;
    }

    const totalCharges = this.getKissShieldTotalCharges();

    if (totalCharges > 0) {
      if (this.state.kissGuardChargeReady && this.state.kissShieldCharges > 0) {
        return `Tienes ${totalCharges} besos blindados guardados. Uno viene de la mejora.`;
      }

      return `Tienes ${totalCharges} ${totalCharges === 1 ? "beso blindado guardado" : "besos blindados guardados"}.`;
    }

    const spinsRemaining = this.getKissShieldSpinsRemaining();
    return `Faltan ${spinsRemaining} ${spinsRemaining === 1 ? "giro" : "giros"} para recargarlo.`;
  }

  getArcadeUpgradeEmoji(upgrade: UpgradeItem): string {
    if (upgrade.id !== "kiss-guard") {
      return upgrade.emoji;
    }

    return "🛡";
  }

  getArcadeUpgradeBadgeCount(upgrade: UpgradeItem, state = this.state): number | null {
    if (upgrade.id !== "kiss-guard") {
      return null;
    }

    return this.getKissShieldTotalCharges(state);
  }

  getActiveArcadeUpgrades(): UpgradeItem[] {
    const activeByFamily = new Map<UpgradeFamily, UpgradeItem>();

    this.getPurchasedUpgradeItems()
      .sort((left, right) => left.price - right.price)
      .forEach((upgrade) => {
        const current = activeByFamily.get(upgrade.family);
        if (!current || upgrade.level > current.level) {
          activeByFamily.set(upgrade.family, upgrade);
        }
      });

    if (this.getKissShieldTotalCharges() > 0 && !activeByFamily.has("kiss-guard")) {
      const temporaryKissShield = this.getUpgradeById("kiss-guard");
      if (temporaryKissShield) {
        activeByFamily.set("kiss-guard", temporaryKissShield);
      }
    }

    return [...activeByFamily.values()].sort((left, right) => left.price - right.price);
  }

  getMetricsSnapshot(): Record<string, unknown> {
    const state = this.state;

    return {
      girosTotales: state.spinCount,
      energiaActual: state.energy,
      energiaMaxima: state.energyMax,
      energiaPorGiro: state.energyPerSpin,
      energiaPorRecarga: state.energyRegenPerMinute,
      energiaCadaMinutos: ENERGY_REGEN_INTERVAL_MS / 60_000,
      besosInvertidosTotal: state.committedTotal,
      besosDisponibles: state.investedKisses,
      besosAdeudados: state.owedKisses,
      monedasActuales: state.coins,
      monedasTotalesGanadas: state.totalCoinsEarned,
      monedasTotalesGastadas: state.totalCoinsSpent,
      monedasTotalesPerdidas: state.totalCoinsLost,
      picoMonedas: state.highestCoinsReached,
      jackpotsActivados: state.totalJackpotsTriggered,
      sorpresasAbiertas: state.totalSurprisesOpened,
      besosBlindadosAcumulados: this.getKissShieldTotalCharges(state),
      besoBlindadoDeMejoraListo: state.kissGuardChargeReady,
      girosParaRecargaBesoBlindado: this.getKissShieldSpinsRemaining(),
      mejorasActivas: this.getActiveArcadeUpgrades().map((upgrade) => upgrade.name),
      mejorasCompradas: this.getPurchasedUpgradeItems().map((upgrade) => upgrade.name),
      regalosReservados: state.reservedRewardIds.length,
      regalosReclamados: state.claimedRewardIds.length,
      invitacionAceptada: state.acceptedInvitation,
      ordenActualRuleta: this.getWheelSegments().map((segment) => segment.label),
      ultimoMensaje: state.lastOutcomeMessage,
    };
  }

  startIntro(): void {
    this.refreshEnergyState();
    this.setState({ introStarted: true, topLayerVisible: true });
  }

  claimDailyReward(now = Date.now()): DailyRewardItem | null {
    this.refreshEnergyState(now);

    if (this.hasClaimedDailyRewardToday(now)) {
      return null;
    }

    const todayKey = getLocalDateKey(now);
    const rewardDayIndex = this.getNextDailyRewardDayIndex(now);
    const reward = this.getDailyRewardByDay(rewardDayIndex);

    this.setState((state) => {
      const coinsEarned = reward.coins ?? 0;
      const surpriseCount = reward.surpriseCount ?? (reward.opensSurprise ? 1 : 0);
      const opensImmediateSurprise = surpriseCount > 0;
      const patch: Partial<GameState> = {
        dailyRewardLastClaimDateKey: todayKey,
        dailyRewardLastClaimDayIndex: reward.day,
        coins: state.coins + coinsEarned,
        totalCoinsEarned: state.totalCoinsEarned + coinsEarned,
        highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + coinsEarned),
        investedKisses: state.investedKisses + (reward.kisses ?? 0),
        kissShieldCharges: state.kissShieldCharges + (reward.shieldCharges ?? 0),
        doubleStakeNextSpin: reward.grantsDoubleStake ? true : state.doubleStakeNextSpin,
        jackpotQueued: reward.grantsJackpot ? true : state.jackpotQueued,
        lastCoinReward: coinsEarned,
        lastCoinLoss: 0,
        multiplierPreview: reward.grantsDoubleStake
          ? "Tu siguiente giro tendra x2."
          : reward.grantsJackpot
            ? "Tu siguiente giro activara Jackpot."
            : "",
        lastOutcomeMessage: `${reward.title}: ${this.buildDailyRewardHelper(reward)}.`,
        kissShieldTriggered: false,
        lastOutcomeTone: "special",
        pendingSurpriseCount: opensImmediateSurprise ? Math.max(0, surpriseCount - 1) : state.pendingSurpriseCount,
      };

      if (opensImmediateSurprise) {
        patch.currentPrizeOptions = sampleUnique(createSurprisePool(), 3);
        patch.surpriseModalOpen = true;
        patch.surpriseStage = "choosing";
        patch.selectedSurpriseCardIndex = null;
        patch.revealedSurpriseOption = null;
        patch.topLayerVisible = true;
        patch.totalSurprisesOpened = state.totalSurprisesOpened + 1;
      }

      return patch;
    });

    return reward;
  }

  dismissInstructions(): void {
    this.setState({ instructionsSeen: true, introStarted: true, instructionPage: 0, helpOpen: false, topLayerVisible: true });
  }

  openHelp(): void {
    this.setState({ helpOpen: true, instructionPage: 0, topLayerVisible: true });
  }

  closeHelp(): void {
    this.setState((state) => ({
      helpOpen: false,
      instructionPage: 0,
      topLayerVisible: this.shouldKeepTopLayerVisible({
        ...state,
        helpOpen: false,
      }),
    }));
  }

  nextInstructionPage(): void {
    this.setState((state) => ({
      instructionPage: Math.min(5, state.instructionPage + 1),
      topLayerVisible: true,
    }));
  }

  previousInstructionPage(): void {
    this.setState((state) => ({
      instructionPage: Math.max(0, state.instructionPage - 1),
      topLayerVisible: true,
    }));
  }

  finishInstructions(): void {
    this.setState({
      instructionsSeen: true,
      helpOpen: false,
      instructionPage: 0,
      introStarted: true,
      topLayerVisible: true,
    });
  }

  confirmCommitment(selectedKisses: number, playerName: string): void {
    this.refreshEnergyState();

    this.setState((state) => ({
      investedKisses: selectedKisses,
      committedTotal: state.committedTotal + selectedKisses,
      commitmentAccepted: true,
      playerName,
      topLayerVisible: false,
      lastOutcomeMessage: "La ruleta ya escucho tu promesa.",
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "neutral",
    }));
  }

  addMoreKisses(amount: number): void {
    this.refreshEnergyState();

    this.setState((state) => ({
      investedKisses: state.investedKisses + amount,
      committedTotal: state.committedTotal + amount,
      refillModalOpen: false,
      topLayerVisible: false,
      lastOutcomeMessage: "Volviste a apostar con el corazon por delante.",
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "neutral",
    }));
  }

  startJackpot(seconds: number): void {
    this.setState({
      jackpotActive: true,
      jackpotQueued: false,
      jackpotEnding: false,
      jackpotSecondsLeft: seconds,
      jackpotCoinsWon: 0,
      totalJackpotsTriggered: this.state.totalJackpotsTriggered + 1,
      lastCoinReward: 0,
      lastCoinLoss: 0,
      lastOutcomeMessage: "Jackpot! Presiona rapido para ganar monedas.",
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    });
  }

  tickJackpot(secondsLeft: number): void {
    this.setState({
      jackpotSecondsLeft: Math.max(0, secondsLeft),
    });
  }

  awardJackpotCoin(): void {
    if (!this.state.jackpotActive || this.state.jackpotEnding) {
      return;
    }

    const jackpotGain = this.hasUpgrade("fast-fingers") ? 2 : 1;

    this.setState((state) => ({
      ...(() => {
        const comboMultiplier = this.getEffectiveCombo(state.comboMultiplier);
        const finalGain = this.applyDirectCoinBonus(jackpotGain, state) * comboMultiplier;
        return {
          coins: state.coins + finalGain,
          totalCoinsEarned: state.totalCoinsEarned + finalGain,
          highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + finalGain),
          jackpotCoinsWon: state.jackpotCoinsWon + finalGain,
          lastCoinReward: finalGain,
          lastCoinLoss: 0,
          lastOutcomeMessage: comboMultiplier > 1
            ? `${this.applyDirectCoinBonus(jackpotGain, state)} monedas x combo x${comboMultiplier} = ${finalGain}`
            : "Jackpot activo. Sigue presionando para sumar monedas.",
        };
      })(),
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    }));
  }

  endJackpot(): void {
    this.setState((state) => ({
      jackpotActive: false,
      jackpotEnding: false,
      jackpotSecondsLeft: 0,
      jackpotCoinsWon: 0,
      lastCoinReward: state.jackpotCoinsWon,
      lastCoinLoss: 0,
      lastOutcomeMessage: state.jackpotCoinsWon > 0
        ? `Jackpot cobrado: +${state.jackpotCoinsWon} monedas`
        : "El Jackpot termino. La ruleta vuelve a la normalidad.",
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "neutral",
    }));
  }

  beginJackpotEnding(): void {
    this.setState({
      jackpotEnding: true,
      jackpotSecondsLeft: 0,
      lastOutcomeMessage: "Jackpot terminando...",
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    });
  }

  openRefillModal(): void {
    this.refreshEnergyState();

    this.setState({ refillModalOpen: true, topLayerVisible: true });
  }

  closeRefillModal(): void {
    this.setState({ refillModalOpen: false, topLayerVisible: false });
  }

  openShop(): void {
    this.refreshEnergyState();

    this.setState({ shopOpen: true, topLayerVisible: true });
  }

  closeShop(): void {
    this.setState({ shopOpen: false, topLayerVisible: false });
  }

  setShopTab(tab: GameState["shopTab"]): void {
    this.setState({ shopTab: tab });
  }

  openInvitation(): void {
    this.refreshEnergyState();

    this.setState({ invitationOpen: true, topLayerVisible: true });
  }

  closeInvitation(): void {
    this.setState({ invitationOpen: false, topLayerVisible: false });
  }

  toggleAudio(): void {
    this.setState((state) => ({ audioEnabled: !state.audioEnabled }));
  }

  toggleMusic(): void {
    this.setState((state) => ({ musicEnabled: !state.musicEnabled }));
  }

  beginSpin(segmentId: string): void {
    this.refreshEnergyState();
    if (!this.canSpendEnergy() || this.state.isSpinning || this.state.investedKisses <= 0 || this.state.surpriseModalOpen || this.state.surpriseStage !== "hidden") {
      return;
    }

    this.setState((state) => ({
      energy: Math.max(0, state.energy - state.energyPerSpin),
      energyDepleted: state.energy - state.energyPerSpin < state.energyPerSpin,
      energyLastUpdatedAt: Date.now(),
      isSpinning: true,
      spinCount: state.spinCount + 1,
      pendingSpinSegmentId: segmentId,
      lastOutcomeMessage: "La ruleta ya esta girando...",
      multiplierPreview: "",
      kissShieldTriggered: false,
      lastOutcomeTone: "neutral",
    }));
  }

  resolveSpin(segmentId: string): SpinResolution | null {
    this.refreshEnergyState();
    const segment = this.state.jackpotQueued
      ? {
          id: "queued-jackpot",
          label: "Jackpot!",
          color: "#ffd166",
          weight: 0,
          kind: "modifier" as const,
          resolve: (): SpinResolution => ({
            comboSource: "giro de la suerte",
            startsJackpot: true,
            audioCue: "jackpot",
            message: "Giro de la suerte activado. Jackpot asegurado.",
            tone: "special",
          }),
        }
      : wheelSegments.find((item) => item.id === segmentId);

    if (!segment) {
      return null;
    }

    const currentState = this.state;
    const shouldAutoChargeKissShield = currentState.purchasedUpgradeIds.includes("kiss-guard")
      && !currentState.kissGuardChargeReady
      && currentState.kissShieldSpinProgress + 1 >= KISS_GUARD_SPIN_INTERVAL;
    const resolution = segment.resolve(
      shouldAutoChargeKissShield
        ? { ...currentState, kissGuardChargeReady: true }
        : currentState
    );

    this.setState((state) => {
      const patch: Partial<GameState> = {
        isSpinning: false,
        pendingSpinSegmentId: null,
        lastCoinReward: 0,
        lastCoinLoss: 0,
        lastOutcomeMessage: resolution.message,
        multiplierPreview: resolution.clearDoubleStake ? resolution.message : "",
        lastOutcomeTone: resolution.tone,
      };

      if (state.jackpotQueued) {
        patch.jackpotQueued = false;
      }

      let comboMultiplier = state.comboMultiplier;

      if (resolution.breaksCombo) {
        Object.assign(patch, this.buildComboBreakPatch("El combo se rompio."));
        comboMultiplier = 0;
      } else if (resolution.incrementsCombo) {
        const comboPatch = this.buildComboIncreasePatch(state, resolution.comboSource ?? "combo", resolution.comboBonus ?? 0);
        Object.assign(patch, comboPatch);
        comboMultiplier = comboPatch.comboMultiplier;
      }

      if (typeof resolution.coinsDelta === "number") {
        const comboResult = this.applyComboToCoinGain(
          this.applyDirectCoinBonus(resolution.coinsDelta, state),
          comboMultiplier,
          resolution.message,
        );
        const finalCoinsDelta = comboResult.finalCoins;
        patch.coins = state.coins + finalCoinsDelta;
        patch.totalCoinsEarned = state.totalCoinsEarned + finalCoinsDelta;
        patch.highestCoinsReached = Math.max(state.highestCoinsReached, state.coins + finalCoinsDelta);
        patch.lastCoinReward = finalCoinsDelta;
        patch.lastCoinLoss = 0;
        patch.lastOutcomeMessage = comboResult.message;
      }

      if (typeof resolution.coinsLoss === "number") {
        patch.coins = Math.max(0, state.coins - resolution.coinsLoss);
        patch.totalCoinsLost = state.totalCoinsLost + resolution.coinsLoss;
        patch.lastCoinReward = 0;
        patch.lastCoinLoss = resolution.coinsLoss;
        patch.lastOutcomeMessage = resolution.message;
        if (resolution.breaksCombo) {
          patch.lastOutcomeMessage = `${resolution.message} El combo se rompio.`;
        }
      }

      if (typeof resolution.debtDelta === "number") {
        patch.investedKisses = Math.max(0, state.investedKisses - resolution.debtDelta);
        patch.owedKisses = state.owedKisses + resolution.debtDelta;
        if (resolution.breaksCombo) {
          patch.lastOutcomeMessage = `${resolution.message} El combo se rompio.`;
        }
      }

      if (typeof resolution.lastCoinReward === "number" && typeof resolution.coinsDelta !== "number") {
        patch.lastCoinReward = resolution.lastCoinReward;
      }

      if (resolution.setDoubleStake) {
        patch.doubleStakeNextSpin = true;
        patch.lastOutcomeMessage = comboMultiplier > 0
          ? `Multiplicador x2 activo. Combo x${comboMultiplier}`
          : "Multiplicador x2 activo";
        patch.multiplierPreview = "";
      }

      if (resolution.clearDoubleStake) {
        patch.doubleStakeNextSpin = false;
      }

      if (resolution.setKissShield) {
        patch.kissShieldCharges = state.kissShieldCharges + 1;
        patch.kissShieldTriggered = false;
      }

      if (resolution.consumeKissShield) {
        if (state.kissShieldCharges > 0) {
          patch.kissShieldCharges = state.kissShieldCharges - 1;
        } else if (state.kissGuardChargeReady) {
          patch.kissGuardChargeReady = false;
        }
        patch.kissShieldTriggered = true;
        patch.lastOutcomeMessage = comboMultiplier > 0
          ? `El beso blindado salvo tu racha. Combo x${comboMultiplier}`
          : resolution.message;
      }

      const ownsKissGuard = state.purchasedUpgradeIds.includes("kiss-guard");
      if (ownsKissGuard && !resolution.setKissShield && !resolution.consumeKissShield) {
        if (state.kissGuardChargeReady) {
          patch.kissShieldSpinProgress = 0;
        } else if (shouldAutoChargeKissShield) {
          patch.kissGuardChargeReady = true;
          patch.kissShieldTriggered = false;
          patch.kissShieldSpinProgress = 0;
        } else {
          const nextProgress = state.kissShieldSpinProgress + 1;
          if (nextProgress >= KISS_GUARD_SPIN_INTERVAL) {
            patch.kissGuardChargeReady = true;
            patch.kissShieldSpinProgress = 0;
          } else {
            patch.kissShieldSpinProgress = nextProgress;
          }
        }
      }

      if (resolution.opensSurprise) {
        patch.currentPrizeOptions = sampleUnique(createSurprisePool(), 3);
        patch.surpriseStage = "pending";
        patch.selectedSurpriseCardIndex = null;
        patch.revealedSurpriseOption = null;
        patch.totalSurprisesOpened = state.totalSurprisesOpened + 1;
        patch.lastOutcomeMessage = comboMultiplier > 0
          ? `Premio sorpresa. Combo x${comboMultiplier} listo.`
          : resolution.message;
      }

      if (resolution.startsJackpot) {
        patch.jackpotActive = true;
        patch.jackpotSecondsLeft = this.getJackpotDurationSeconds();
        patch.lastOutcomeMessage = comboMultiplier > 0
          ? `Jackpot activo con combo x${comboMultiplier}`
          : resolution.message;
      } else if (state.investedKisses <= 0) {
        patch.topLayerVisible = true;
      }

      return patch;
    });

    this.refreshEnergyState();

    return resolution;
  }

  chooseSurprise(optionId: string): SurpriseOption | null {
    const option = this.state.currentPrizeOptions.find((item) => item.id === optionId);

    if (!option) {
      return null;
    }

    this.setState((state) => {
      const {
        revealLabel: _revealLabel,
        revealDescription: _revealDescription,
        revealEmoji: _revealEmoji,
        ...statePatch
      } = option.apply(state);

      return {
        ...statePatch,
        currentPrizeOptions: [],
        surpriseModalOpen: false,
        topLayerVisible: false,
        lastOutcomeMessage: `Elegiste: ${option.label}.`,
        kissShieldTriggered: false,
        lastOutcomeTone: "special",
      };
    });

    return option;
  }

  openSurpriseSelection(): void {
    this.refreshEnergyState();
    if (this.state.currentPrizeOptions.length === 0 || this.state.surpriseStage !== "pending") {
      return;
    }

    this.setState({
      surpriseModalOpen: true,
      surpriseStage: "choosing",
      topLayerVisible: true,
      lastOutcomeMessage: "Elige una carta misteriosa.",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    });
  }

  selectSurpriseCard(cardIndex: number): SurpriseOption | null {
    this.refreshEnergyState();
    if (this.state.surpriseStage !== "choosing") {
      return null;
    }

    const options = this.state.currentPrizeOptions;
    if (options.length === 0) {
      return null;
    }

    const randomOption = options[Math.floor(Math.random() * options.length)];

    this.setState((state) => ({
      ...(() => {
        const optionPatch = randomOption.apply(state);
        const { revealLabel, revealDescription, revealEmoji, ...statePatch } = optionPatch;
        const rawCoinsDelta = typeof statePatch.coins === "number" ? statePatch.coins - state.coins : 0;

        if (rawCoinsDelta > 0) {
          const comboResult = this.applyComboToCoinGain(
            this.applyDirectCoinBonus(rawCoinsDelta, state),
            state.comboMultiplier,
            `Premio revelado: ${revealLabel ?? randomOption.label}.`,
          );

          return {
            ...statePatch,
            coins: state.coins + comboResult.finalCoins,
            totalCoinsEarned: state.totalCoinsEarned + comboResult.finalCoins,
            highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + comboResult.finalCoins),
            lastCoinReward: comboResult.finalCoins,
            lastCoinLoss: 0,
            lastOutcomeMessage: comboResult.message,
            revealedSurpriseOption: {
              ...randomOption,
              emoji: revealEmoji ?? randomOption.emoji,
              label: revealLabel ?? randomOption.label,
              description: revealDescription ?? randomOption.description,
            },
          };
        }

        return {
          ...statePatch,
          lastOutcomeMessage: `Premio revelado: ${revealLabel ?? randomOption.label}.`,
          revealedSurpriseOption: {
            ...randomOption,
            emoji: revealEmoji ?? randomOption.emoji,
            label: revealLabel ?? randomOption.label,
            description: revealDescription ?? randomOption.description,
          },
        };
      })(),
      surpriseStage: "revealed",
      selectedSurpriseCardIndex: cardIndex,
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    }));

    return randomOption;
  }

  finalizeSurpriseReveal(): void {
    const option = this.state.revealedSurpriseOption;

    if (!option || this.state.surpriseStage !== "revealing") {
      return;
    }

    this.setState((state) => ({
      ...(() => {
        const optionPatch = option.apply(state);
        const { revealLabel, revealDescription, revealEmoji, ...statePatch } = optionPatch;
        const rawCoinsDelta = typeof statePatch.coins === "number" ? statePatch.coins - state.coins : 0;

        if (rawCoinsDelta > 0) {
          const comboResult = this.applyComboToCoinGain(
            this.applyDirectCoinBonus(rawCoinsDelta, state),
            state.comboMultiplier,
            `Premio revelado: ${revealLabel ?? option.label}.`,
          );

          return {
            ...statePatch,
            coins: state.coins + comboResult.finalCoins,
            totalCoinsEarned: state.totalCoinsEarned + comboResult.finalCoins,
            highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + comboResult.finalCoins),
            lastCoinReward: comboResult.finalCoins,
            lastCoinLoss: 0,
            lastOutcomeMessage: comboResult.message,
            revealedSurpriseOption: {
              ...option,
              emoji: revealEmoji ?? option.emoji,
              label: revealLabel ?? option.label,
              description: revealDescription ?? option.description,
            },
          };
        }

        return {
          ...statePatch,
          lastOutcomeMessage: `Premio revelado: ${revealLabel ?? option.label}.`,
          revealedSurpriseOption: {
            ...option,
            emoji: revealEmoji ?? option.emoji,
            label: revealLabel ?? option.label,
            description: revealDescription ?? option.description,
          },
        };
      })(),
      surpriseStage: "revealed",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    }));
  }

  closeSurpriseExperience(): void {
    this.setState((state) => {
      if (state.pendingSurpriseCount > 0) {
        return {
          currentPrizeOptions: sampleUnique(createSurprisePool(), 3),
          pendingSurpriseCount: state.pendingSurpriseCount - 1,
          surpriseModalOpen: true,
          surpriseStage: "choosing",
          selectedSurpriseCardIndex: null,
          revealedSurpriseOption: null,
          topLayerVisible: true,
          totalSurprisesOpened: state.totalSurprisesOpened + 1,
          lastOutcomeMessage: "Otra sorpresa te esta esperando.",
          lastOutcomeTone: "special",
        };
      }

      return {
        surpriseModalOpen: false,
        surpriseStage: "hidden",
        currentPrizeOptions: [],
        pendingSurpriseCount: 0,
        selectedSurpriseCardIndex: null,
        revealedSurpriseOption: null,
        topLayerVisible: false,
      };
    });
  }

  reserveReward(rewardId: string): boolean {
    this.refreshEnergyState();

    const reward = rewardCatalog.find((item) => item.id === rewardId);

    if (!reward) {
      return false;
    }

    const card = this.getRewardCard(reward);

    if (!card.canReserve) {
      return false;
    }

    const price = this.getRewardPrice(reward);

    this.setState((state) => ({
      coins: state.coins - price,
      totalCoinsSpent: state.totalCoinsSpent + price,
      reservedRewardIds: [...new Set([...state.reservedRewardIds, rewardId])],
      unlockedRewardIds: [...new Set([...state.unlockedRewardIds, rewardId])],
      lastOutcomeMessage: "Premio reservado. Queda esperando tu decision final.",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    }));

    return true;
  }

  purchaseUpgrade(upgradeId: string): boolean {
    this.refreshEnergyState();

    const upgrade = upgradeCatalog.find((item) => item.id === upgradeId);

    if (!upgrade
      || this.state.purchasedUpgradeIds.includes(upgradeId)
      || this.state.coins < upgrade.price
      || this.hasHigherFamilyUpgrade(upgrade)
      || this.isUpgradeBlockedByPrerequisite(upgrade)) {
      return false;
    }

    this.setState((state) => ({
      coins: state.coins - upgrade.price,
      totalCoinsSpent: state.totalCoinsSpent + upgrade.price,
      purchasedUpgradeIds: this.normalizePurchasedUpgradeIds(upgradeId, state),
      kissGuardChargeReady: upgradeId === "kiss-guard" ? true : state.kissGuardChargeReady,
      kissShieldTriggered: false,
      kissShieldSpinProgress: upgradeId === "kiss-guard" ? 0 : state.kissShieldSpinProgress,
      lastOutcomeMessage: `${upgrade.name} ya forma parte de tus mejoras.`,
      lastOutcomeTone: "special",
    }));

    return true;
  }

  claimReward(rewardId: string): boolean {
    this.refreshEnergyState();

    const reward = rewardCatalog.find((item) => item.id === rewardId);

    if (!reward || !this.state.acceptedInvitation || !this.state.reservedRewardIds.includes(rewardId)) {
      return false;
    }

    this.setState((state) => ({
      claimedRewardIds: [...new Set([...state.claimedRewardIds, rewardId])],
      lastOutcomeMessage: `${reward.name} ya quedo marcado como reclamable.`,
      kissShieldTriggered: false,
      lastOutcomeTone: "win",
    }));

    return true;
  }

  acceptInvitation(): void {
    this.refreshEnergyState();

    this.setState({
      acceptedInvitation: true,
      invitationOpen: false,
      topLayerVisible: false,
      lastOutcomeMessage: "La invitacion fue aceptada. Todos tus premios reservados te esperan.",
      kissShieldTriggered: false,
      lastOutcomeTone: "special",
    });
  }

  resetProgress(): void {
    this.state = initialState();
    this.persist();
    this.emit();
  }

  getWheelSegments(): WheelSegment[] {
    const orderedSegments = this.state.wheelSegmentOrder
      .map((segmentId) => wheelSegments.find((segment) => segment.id === segmentId))
      .filter((segment): segment is WheelSegment => Boolean(segment));

    return orderedSegments.length === wheelSegments.length ? orderedSegments : wheelSegments;
  }

  getRewardCards(): RewardCardViewModel[] {
    return rewardCatalog.map((reward) => this.getRewardCard(reward));
  }

  getUpgradeCards(): UpgradeCardViewModel[] {
    return upgradeCatalog.map((upgrade) => {
      const isPurchased = this.state.purchasedUpgradeIds.includes(upgrade.id);
      const activeUpgrade = this.getEffectiveUpgradeForFamily(upgrade.family);
      const isActive = activeUpgrade?.id === upgrade.id;
      const isSuperseded = Boolean(activeUpgrade && activeUpgrade.level > upgrade.level);
      const isBlockedByPrerequisite = this.isUpgradeBlockedByPrerequisite(upgrade);
      const previousUpgrade = this.getPreviousFamilyUpgrade(upgrade);
      const canAfford = this.state.coins >= upgrade.price;
      const canBuy = !isPurchased && !isSuperseded && !isBlockedByPrerequisite && canAfford;
      const stateLabel = isActive
        ? "Activa"
        : isPurchased
          ? "Comprada"
          : isSuperseded
            ? "Superada"
            : isBlockedByPrerequisite
              ? "Bloqueada por version superior"
            : canAfford
              ? "Disponible"
              : "Te faltan monedas";
      const helper = isActive
        ? ""
        : isPurchased
          ? "Ya la tienes comprada, pero otra version de la misma familia esta activa."
          : isSuperseded
            ? "Fue sustituida por una version superior."
            : isBlockedByPrerequisite && previousUpgrade
              ? `Se necesita ${previousUpgrade.name} para que puedas comprar este.`
            : "";

      return {
        upgrade,
        isPurchased,
        isActive,
        isSuperseded,
        isBlockedByPrerequisite,
        canAfford,
        canBuy,
        displayPrice: upgrade.price,
        stateLabel,
        helper,
      };
    });
  }

  getDailyRewardCards(now = Date.now()): DailyRewardCardViewModel[] {
    const claimedToday = this.hasClaimedDailyRewardToday(now);
    const currentDayIndex = this.getNextDailyRewardDayIndex(now);

    return dailyRewardCatalog.map((reward) => {
      let state: DailyRewardCardViewModel["state"] = "upcoming";

      if (reward.day === currentDayIndex) {
        state = claimedToday
          ? "claimed-today"
          : "available";
      } else if (
        (!claimedToday && reward.day < currentDayIndex)
        || (claimedToday && reward.day < currentDayIndex)
      ) {
        state = "claimed-past";
      }

      let badgeLabel = "";
      let helper = reward.description;

      if (state === "available") {
        badgeLabel = "Hoy";
        helper = `Lista para reclamar. ${this.buildDailyRewardHelper(reward)}`;
      } else if (state === "claimed-today") {
        badgeLabel = "";
        helper = reward.description;
      } else if (state === "claimed-past") {
        badgeLabel = "Completada";
        helper = "Esta recompensa ya formo parte de tu ciclo actual.";
      }

      return {
        reward,
        state,
        isToday: reward.day === currentDayIndex,
        canClaim: state === "available",
        badgeLabel,
        helper,
      };
    });
  }

  hasShopAttention(): boolean {
    const hasAvailableReward = this.getRewardCards().some((card) => card.canReserve || card.canClaim);
    const hasAvailableUpgrade = this.getUpgradeCards().some((card) => card.canBuy);
    const hasAvailableDailyReward = this.getDailyRewardCards().some((card) => card.canClaim);
    return hasAvailableReward || hasAvailableUpgrade || hasAvailableDailyReward;
  }

  private getRewardCard(reward: RewardItem): RewardCardViewModel {
    const state = this.state;
    const unlocked = state.unlockedRewardIds.includes(reward.id) || reward.tier === 1;
    const reserved = state.reservedRewardIds.includes(reward.id);
    const claimed = state.claimedRewardIds.includes(reward.id);
    const visible = true;
    const displayPrice = this.getRewardPrice(reward);
    const canAfford = state.coins >= displayPrice;
    const canReserve = visible && unlocked && !reserved && !claimed && canAfford;
    const canClaim = reserved && state.acceptedInvitation && !claimed;

    let stateLabel: RewardCardViewModel["stateLabel"];
    let helper = "Los premios desbloqueados solo podran reclamarse si aceptas la invitacion.";

    if (claimed) {
      stateLabel = "Reclamado";
      helper = "Este premio ya fue marcado como reclamado.";
    } else if (!visible || !unlocked) {
      stateLabel = "Bloqueado";
      helper = reward.tier === 2
        ? "Se desbloquea con Premio Sorpresa, en orden del mas barato al mas caro."
        : "Se desbloquea con Premio Sorpresa, en orden del mas barato al mas caro.";
    } else if (reserved && state.acceptedInvitation) {
      stateLabel = "Listo para reclamar";
      helper = "Tu invitacion ya fue aceptada. Este premio esta listo.";
    } else if (reserved) {
      stateLabel = "Requiere aceptar la invitacion";
      helper = "Ya lo reservaste. Solo falta aceptar la invitacion para reclamarlo.";
    } else if (canAfford) {
      stateLabel = "Disponible";
      helper = "Tienes monedas suficientes para reservar este premio.";
    } else {
      stateLabel = "Te faltan monedas";
      helper = `Te faltan ${displayPrice - state.coins} monedas para reservarlo.`;
    }

    return {
      reward,
      visible,
      displayPrice,
      canAfford,
      canReserve,
      canClaim,
      isReserved: reserved,
      isClaimed: claimed,
      stateLabel,
      helper,
    };
  }
}

export const store = new GameStore();
