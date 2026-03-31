export type RewardTier = 1 | 2 | 3;
export type UpgradeTier = 1 | 2 | 3;

export type RewardKind =
  | "dulce"
  | "experiencia"
  | "emocional"
  | "casual"
  | "misterio"
  | "real"
  | "personal";

export type UpgradeKind =
  | "economia"
  | "escudo"
  | "jackpot"
  | "velocidad"
  | "suerte"
  | "control";

export type UpgradeFamily =
  | "golden-coin"
  | "kiss-guard"
  | "impaciente"
  | "suerte"
  | "jackpot-extendido"
  | "fast-fingers"
  | "policia-del-amor";

export type UpgradeCardStateLabel =
  | "Disponible"
  | "Activa"
  | "Comprada"
  | "Superada"
  | "Bloqueada por version superior"
  | "Te faltan monedas";

export type DailyRewardCardState =
  | "locked"
  | "available"
  | "claimed-today"
  | "claimed-past"
  | "upcoming";

export type RewardStateLabel =
  | "Disponible"
  | "Te faltan monedas"
  | "Bloqueado"
  | "Reservado"
  | "Listo para reclamar"
  | "Requiere aceptar la invitacion"
  | "Reclamado";

export interface InvitationConfig {
  title: string;
  message: string;
  dateText: string;
  timeText: string;
  placeText: string;
  ctaLabel: string;
}

export interface RewardItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
  tier: RewardTier;
  kind: RewardKind;
  lockedByDefault: boolean;
  specialRequirement?: string;
  repeatable?: boolean;
  opensSurpriseOnPurchase?: boolean;
}

export interface UpgradeItem {
  id: string;
  emoji: string;
  name: string;
  description: string;
  price: number;
  tier: UpgradeTier;
  kind: UpgradeKind;
  family: UpgradeFamily;
  level: number;
  accentLabel?: string;
}

export interface DailyRewardItem {
  day: number;
  emoji: string;
  title: string;
  description: string;
  coins?: number;
  kisses?: number;
  shieldCharges?: number;
  grantsDoubleStake?: boolean;
  grantsJackpot?: boolean;
  opensSurprise?: boolean;
  surpriseCount?: number;
}

export interface SurpriseApplyResult extends Partial<GameState> {
  revealLabel?: string;
  revealDescription?: string;
  revealEmoji?: string;
}

export type WheelSegmentKind = "coins" | "debt" | "modifier" | "surprise" | "risk";

export interface SpinResolution {
  coinsDelta?: number;
  coinsLoss?: number;
  debtDelta?: number;
  lastCoinReward?: number;
  incrementsCombo?: boolean;
  comboBonus?: number;
  breaksCombo?: boolean;
  comboSource?: string;
  setDoubleStake?: boolean;
  clearDoubleStake?: boolean;
  setKissShield?: boolean;
  consumeKissShield?: boolean;
  startsJackpot?: boolean;
  audioCue?: "coins" | "kiss" | "robamonedas" | "special-price" | "power-up" | "jackpot" | "purchase";
  message: string;
  tone: "win" | "loss" | "neutral" | "special";
  opensSurprise?: boolean;
}

export interface WheelSegment {
  id: string;
  label: string;
  color: string;
  weight: number;
  kind: WheelSegmentKind;
  resolve: (state: GameState) => SpinResolution;
}

export interface SurpriseOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
  apply: (state: GameState) => SurpriseApplyResult;
}

export interface GameState {
  energy: number;
  energyMax: number;
  energyPerSpin: number;
  energyRegenPerMinute: number;
  energyLastUpdatedAt: number;
  energyDepleted: boolean;
  dailyRewardLastClaimDateKey: string | null;
  dailyRewardLastClaimDayIndex: number | null;
  shopSurpriseLastPurchaseDateKey: string | null;
  investedKisses: number;
  owedKisses: number;
  coins: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  totalCoinsLost: number;
  totalJackpotsTriggered: number;
  totalSurprisesOpened: number;
  committedTotal: number;
  playerName: string;
  commitmentAccepted: boolean;
  instructionsSeen: boolean;
  helpOpen: boolean;
  instructionPage: number;
  introStarted: boolean;
  acceptedInvitation: boolean;
  audioEnabled: boolean;
  musicEnabled: boolean;
  reservedRewardIds: string[];
  claimedRewardIds: string[];
  unlockedRewardIds: string[];
  purchasedUpgradeIds: string[];
  shopTab: "rewards" | "upgrades" | "daily-rewards";
  doubleStakeNextSpin: boolean;
  kissShieldCharges: number;
  kissGuardChargeReady: boolean;
  kissShieldTriggered: boolean;
  kissShieldSpinProgress: number;
  lastCoinReward: number;
  lastCoinLoss: number;
  comboMultiplier: number;
  comboPulseToken: number;
  comboLastSource: string;
  comboPulseVariant: "normal" | "boost";
  surpriseModalOpen: boolean;
  isSpinning: boolean;
  spinCount: number;
  highestCoinsReached: number;
  lastOutcomeMessage: string;
  multiplierPreview: string;
  lastOutcomeTone: "win" | "loss" | "neutral" | "special";
  jackpotActive: boolean;
  jackpotQueued: boolean;
  jackpotEnding: boolean;
  jackpotSecondsLeft: number;
  jackpotCoinsWon: number;
  pendingSpinSegmentId: string | null;
  currentPrizeOptions: SurpriseOption[];
  pendingSurpriseCount: number;
  surpriseStage: "hidden" | "pending" | "choosing" | "revealing" | "revealed";
  selectedSurpriseCardIndex: number | null;
  revealedSurpriseOption: SurpriseOption | null;
  wheelSegmentOrder: string[];
  invitationOpen: boolean;
  shopOpen: boolean;
  refillModalOpen: boolean;
  topLayerVisible: boolean;
  invitation: InvitationConfig;
}

export interface RewardCardViewModel {
  reward: RewardItem;
  visible: boolean;
  displayPrice: number;
  canAfford: boolean;
  canReserve: boolean;
  canClaim: boolean;
  isReserved: boolean;
  isClaimed: boolean;
  isPurchaseLimitedToday?: boolean;
  stateLabel: RewardStateLabel;
  helper: string;
}

export interface UpgradeCardViewModel {
  upgrade: UpgradeItem;
  isPurchased: boolean;
  isActive: boolean;
  isSuperseded: boolean;
  isBlockedByPrerequisite: boolean;
  canAfford: boolean;
  canBuy: boolean;
  displayPrice: number;
  stateLabel: UpgradeCardStateLabel;
  helper: string;
}

export interface DailyRewardCardViewModel {
  reward: DailyRewardItem;
  state: DailyRewardCardState;
  isToday: boolean;
  canClaim: boolean;
  badgeLabel: string;
  helper: string;
}
