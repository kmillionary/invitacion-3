import type {
  DailyRewardItem,
  GameState,
  InvitationConfig,
  RewardItem,
  SpinResolution,
  SurpriseOption,
  UpgradeItem,
  WheelSegment,
} from "../state/types";

export const invitationConfig: InvitationConfig = {
  title: "Ruleta del amor",
  message:
    "Has desbloqueado una noche pensada para ti. Quiero invitarte a compartir tiempo conmigo, reirnos, consentirte y hacer de este momento algo muy nuestro.",
  dateText: "Sabado 12 de abril",
  timeText: "7:30 PM",
  placeText: "Atrio, zona 10",
  ctaLabel: "Aceptar invitacion",
};

export const sessionConfig = {
  sessionDurationMinutes: 30,
  sessionEndMessage: "Tu sesion de hoy ha terminado! regresa mañana para más premios.",
} as const;

export const dailyRewardCatalog: DailyRewardItem[] = [
  {
    day: 1,
    emoji: "🪙",
    title: "Monedas suaves",
    description: "Empieza el ciclo con 25 monedas gratis.",
    coins: 25,
  },
  {
    day: 2,
    emoji: "🛡",
    title: "Beso blindado",
    description: "Suma 1 beso blindado y 50 monedas al inventario.",
    coins: 50,
    shieldCharges: 1,
  },
  {
    day: 3,
    emoji: "🎁",
    title: "Sorpresa dulce",
    description: "Abre un premio sorpresa al instante y te da 100 monedas.",
    coins: 100,
    opensSurprise: true,
  },
  {
    day: 4,
    emoji: "💰",
    title: "Dia dorado",
    description: "Recoge 200 monedas para acercarte a la tienda.",
    coins: 200,
  },
  {
    day: 5,
    emoji: "👑",
    title: "Jackpot de bolsillo",
    description: "Te llevas 500 monedas de golpe.",
    coins: 500,
  },
  {
    day: 6,
    emoji: "🛡🛡",
    title: "Doble defensa",
    description: "Añade 2 besos blindados a tu inventario.",
    shieldCharges: 2,
  },
  {
    day: 7,
    emoji: "✨",
    title: "Racha brillante",
    description: "Activa x2 en tu siguiente giro y suma 75 monedas.",
    coins: 75,
    grantsDoubleStake: true,
  },
  {
    day: 8,
    emoji: "🎉",
    title: "Jackpot seguro",
    description: "Tu siguiente giro activa Jackpot y recibes 150 monedas.",
    coins: 150,
    grantsJackpot: true,
  },
  {
    day: 9,
    emoji: "💋",
    title: "Recarga intensa",
    description: "Añade 10 besos para jugar y 120 monedas.",
    coins: 120,
    kisses: 10,
  },
  {
    day: 10,
    emoji: "🌟",
    title: "Super dia",
    description: "Recibe 300 monedas, 1 beso blindado y x2 para el siguiente giro.",
    coins: 300,
    shieldCharges: 1,
    grantsDoubleStake: true,
  },
];

export const rewardCatalog: RewardItem[] = [
  { id: "bolsita-de-cloro", emoji: "🫧", name: "Bolsita de cloro", price: 180, tier: 1, kind: "casual", lockedByDefault: false },
  { id: "gomitas-osito", emoji: "🧸", name: "Gomitas de osito", price: 220, tier: 1, kind: "casual", lockedByDefault: false },
  { id: "chocolate-tutto", emoji: "🍫", name: "Chocolate Tutto", price: 260, tier: 1, kind: "dulce", lockedByDefault: false },
  { id: "cafe-starbucks", emoji: "☕", name: "Cafe Starbucks", price: 300, tier: 1, kind: "experiencia", lockedByDefault: false },
  { id: "pastel-chocolate-berlin", emoji: "🍰", name: "Pastel de Chocolate Berlin", price: 340, tier: 1, kind: "dulce", lockedByDefault: false },
  { id: "ramo-floresitas", emoji: "💐", name: "Ramo de floresitas", price: 380, tier: 1, kind: "emocional", lockedByDefault: false },
  { id: "cajita-feliz", emoji: "🍔", name: "Cajita Feliz", price: 420, tier: 2, kind: "casual", lockedByDefault: true },
  { id: "pizza-mediana", emoji: "🍕", name: "Pizza mediana", price: 500, tier: 2, kind: "experiencia", lockedByDefault: true },
  { id: "combo-de-pollo", emoji: "🍗", name: "Combo de pollo", price: 620, tier: 2, kind: "experiencia", lockedByDefault: true },
  { id: "caja-sorpresa", emoji: "🎁", name: "Caja sorpresa", price: 700, tier: 2, kind: "misterio", lockedByDefault: true },
  { id: "regalo-de-mumuso", emoji: "🎀", name: "Regalo de Mumuso", price: 780, tier: 2, kind: "personal", lockedByDefault: true },
  { id: "vale-dollarcity-q80", emoji: "🎟", name: "Vale de Dollarcity Q80", price: 860, tier: 2, kind: "real", lockedByDefault: true },
  { id: "vale-megapaca-q100", emoji: "🛍", name: "Vale de Megapaca Q100", price: 1900, tier: 3, kind: "real", lockedByDefault: true, specialRequirement: "Desbloqueo especial" },
  { id: "vale-farmacia-q100", emoji: "💊", name: "Vale de Farmacia Q100", price: 2300, tier: 3, kind: "real", lockedByDefault: true, specialRequirement: "Desbloqueo especial" },
  { id: "vale-la-torre-q200", emoji: "🛒", name: "Vale de la Torre Q200", price: 2800, tier: 3, kind: "real", lockedByDefault: true, specialRequirement: "Desbloqueo + monedas" },
  { id: "vale-dollarcity-q160", emoji: "🎟", name: "Vale de Dollarcity Q160", price: 3600, tier: 3, kind: "real", lockedByDefault: true, specialRequirement: "Desbloqueo + progreso" },
  { id: "caja-misteriosa-grande", emoji: "💝", name: "Caja misteriosa grande", price: 4400, tier: 3, kind: "misterio", lockedByDefault: true, specialRequirement: "Desbloqueo + progreso" },
  { id: "vale-la-torre-q400", emoji: "🛒", name: "Vale de la Torre Q400", price: 5200, tier: 3, kind: "real", lockedByDefault: true, specialRequirement: "Maximo nivel" },
];

export const upgradeCatalog: UpgradeItem[] = [
  {
    id: "golden-coin-1",
    emoji: "🪙",
    name: "Moneda dorada 1",
    description: "+1 moneda en cada ganancia.",
    price: 260,
    tier: 1,
    kind: "economia",
    family: "golden-coin",
    level: 1,
    accentLabel: "Popular",
  },
  {
    id: "impaciente-1",
    emoji: "💨",
    name: "Impaciente 1",
    description: "La ruleta gira 10% mas rapido.",
    price: 340,
    tier: 1,
    kind: "velocidad",
    family: "impaciente",
    level: 1,
    accentLabel: "Agil",
  },
  {
    id: "suerte-1",
    emoji: "🍀",
    name: "Suerte 1",
    description: "Sube la probabilidad de +5 monedas.",
    price: 420,
    tier: 1,
    kind: "suerte",
    family: "suerte",
    level: 1,
    accentLabel: "Lucky",
  },
  {
    id: "kiss-guard",
    emoji: "🛡",
    name: "Beso protector",
    description: "Bloquea una deuda cada 7 giros.",
    price: 500,
    tier: 1,
    kind: "escudo",
    family: "kiss-guard",
    level: 1,
    accentLabel: "Defensa",
  },
  {
    id: "golden-coin-2",
    emoji: "🪙",
    name: "Moneda dorada 2",
    description: "+2 monedas en cada ganancia.",
    price: 620,
    tier: 2,
    kind: "economia",
    family: "golden-coin",
    level: 2,
    accentLabel: "Plus",
  },
  {
    id: "jackpot-extendido-1",
    emoji: "🎉",
    name: "Jackpot Extendido 1",
    description: "Jackpot dura 6 segundos.",
    price: 700,
    tier: 2,
    kind: "jackpot",
    family: "jackpot-extendido",
    level: 1,
    accentLabel: "Hot",
  },
  {
    id: "fast-fingers",
    emoji: "⚡",
    name: "Dedos veloces",
    description: "Cada toque en Jackpot vale 2 monedas.",
    price: 780,
    tier: 2,
    kind: "jackpot",
    family: "fast-fingers",
    level: 1,
    accentLabel: "Rapido",
  },
  {
    id: "impaciente-2",
    emoji: "💨",
    name: "Impaciente 2",
    description: "La ruleta gira 20% mas rapido.",
    price: 860,
    tier: 2,
    kind: "velocidad",
    family: "impaciente",
    level: 2,
    accentLabel: "Rush",
  },
  {
    id: "suerte-2",
    emoji: "🍀",
    name: "Suerte 2",
    description: "Sube la probabilidad de +10 monedas.",
    price: 940,
    tier: 2,
    kind: "suerte",
    family: "suerte",
    level: 2,
    accentLabel: "Lucky",
  },
  {
    id: "golden-coin-3",
    emoji: "🪙",
    name: "Moneda dorada 3",
    description: "+3 monedas en cada ganancia.",
    price: 1100,
    tier: 3,
    kind: "economia",
    family: "golden-coin",
    level: 3,
    accentLabel: "Max",
  },
  {
    id: "jackpot-extendido-2",
    emoji: "🎉",
    name: "Jackpot Extendido 2",
    description: "Jackpot dura 7 segundos.",
    price: 1220,
    tier: 3,
    kind: "jackpot",
    family: "jackpot-extendido",
    level: 2,
    accentLabel: "Ultra",
  },
  {
    id: "policia-del-amor",
    emoji: "👮",
    name: "Policia del amor",
    description: "Reduce la probabilidad de Robamonedas.",
    price: 1340,
    tier: 3,
    kind: "control",
    family: "policia-del-amor",
    level: 1,
    accentLabel: "Guardia",
  },
  {
    id: "impaciente-3",
    emoji: "💨",
    name: "Impaciente 3",
    description: "La ruleta gira 30% mas rapido.",
    price: 1460,
    tier: 3,
    kind: "velocidad",
    family: "impaciente",
    level: 3,
    accentLabel: "Turbo",
  },
  {
    id: "suerte-3",
    emoji: "🍀",
    name: "Suerte 3",
    description: "Sube la probabilidad de +15 monedas.",
    price: 1580,
    tier: 3,
    kind: "suerte",
    family: "suerte",
    level: 3,
    accentLabel: "Fortuna",
  },
];

const createCoinResolution = (
  amount: number,
  message: string,
): ((state: GameState) => SpinResolution) => {
  return (state) => {
    const multiplier = state.doubleStakeNextSpin ? 2 : 1;
    const finalAmount = amount * multiplier;
    const formula = multiplier > 1 ? `${amount} monedas x 2 = ${finalAmount}` : message;

    return {
      coinsDelta: finalAmount,
      lastCoinReward: finalAmount,
      incrementsCombo: true,
      comboSource: "monedas",
      clearDoubleStake: state.doubleStakeNextSpin,
      audioCue: "coins",
      message: formula,
      tone: multiplier > 1 ? "special" : "win",
    };
  };
};

const createDebtResolution = (
  amount: number,
  message: string,
): ((state: GameState) => SpinResolution) => {
  return (state) => {
    const multiplier = state.doubleStakeNextSpin ? 2 : 1;
    const finalAmount = amount * multiplier;
    const formula = multiplier > 1 ? `${amount} besos x 2 = ${finalAmount}` : message;

    if (state.kissShieldCharges > 0 || state.kissGuardChargeReady) {
      return {
        incrementsCombo: true,
        comboSource: "escudo",
        clearDoubleStake: state.doubleStakeNextSpin,
        consumeKissShield: true,
        audioCue: "power-up",
        message: `Te salvaste. Tu beso blindado bloqueo ${finalAmount} besos perdidos.`,
        tone: "special",
      };
    }

    return {
      debtDelta: finalAmount,
      breaksCombo: true,
      comboSource: "deuda",
      clearDoubleStake: state.doubleStakeNextSpin,
      audioCue: "kiss",
      message: formula,
      tone: multiplier > 1 ? "special" : "loss",
    };
  };
};

const createCoinStealResolution = (
  percentage: number,
): ((state: GameState) => SpinResolution) => {
  return (state) => {
    const baseLoss = Math.floor(state.coins * percentage);
    const multiplier = state.doubleStakeNextSpin ? 2 : 1;
    const amplifiedLoss = baseLoss * multiplier;
    const finalLoss = Math.min(state.coins, amplifiedLoss);
    const percentageLabel = Math.round(percentage * 100);

    if (state.coins <= 0) {
      return {
        coinsLoss: 0,
        breaksCombo: true,
        comboSource: "robamonedas",
        clearDoubleStake: state.doubleStakeNextSpin,
        audioCue: "robamonedas",
        message: "Robamonedas paso, pero no encontro monedas que llevarse.",
        tone: "loss",
      };
    }

    const formula = multiplier > 1
      ? `Robamonedas: ${percentageLabel}% = -${baseLoss} monedas | x2 = -${finalLoss}`
      : `Robamonedas: ${percentageLabel}% = -${finalLoss} monedas`;

    return {
      coinsLoss: finalLoss,
      breaksCombo: true,
      comboSource: "robamonedas",
      clearDoubleStake: state.doubleStakeNextSpin,
      audioCue: "robamonedas",
      message: formula,
      tone: "loss",
    };
  };
};

export const wheelSegments: WheelSegment[] = [
  { id: "coins-5", label: "+5 monedas", color: "#ef476f", weight: 14, kind: "coins", resolve: createCoinResolution(5, "Tus monedas acaban de subir con un giro coqueto.") },
  { id: "debt-2", label: "Debes 1 beso", color: "#d1495b", weight: 12, kind: "debt", resolve: createDebtResolution(1, "La ruleta cobro un pequeno tributo de besos.") },
  {
    id: "all-or-nothing",
    label: "Multiplicador x2",
    color: "#ff006e",
    weight: 6,
    kind: "modifier",
    resolve: () => ({
      incrementsCombo: true,
      comboBonus: 2,
      comboSource: "multiplicador",
      setDoubleStake: true,
      audioCue: "power-up",
      message: "Multiplicador x2 activo",
      tone: "special",
    }),
  },
  { id: "coins-8", label: "+8 monedas", color: "#ff7b54", weight: 12, kind: "coins", resolve: createCoinResolution(8, "La suerte te sonrio con un premio sabroso.") },
  {
    id: "jackpot",
    label: "Jackpot!",
    color: "#ffd166",
    weight: 8,
    kind: "modifier",
    resolve: () => ({
      comboSource: "jackpot",
      startsJackpot: true,
      audioCue: "jackpot",
      message: "Jackpot! Presiona rapido el boton para sumar monedas.",
      tone: "special",
    }),
  },
  { id: "debt-3", label: "Debes 1 beso", color: "#a53860", weight: 10, kind: "debt", resolve: createDebtResolution(1, "Uy... ese giro vino con deuda traviesa.") },
  { id: "coins-10", label: "+10 monedas", color: "#f9a03f", weight: 10, kind: "coins", resolve: createCoinResolution(10, "Eso ya huele a premio bonito.") },
  {
    id: "surprise",
    label: "Premio sorpresa",
    color: "#06d6a0",
    weight: 6,
    kind: "surprise",
    resolve: () => ({
      incrementsCombo: true,
      comboSource: "premio sorpresa",
      opensSurprise: true,
      audioCue: "special-price",
      message: "Premio sorpresa. Prepárate para elegir.",
      tone: "special",
    }),
  },
  { id: "coin-steal", label: "Robamonedas", color: "#7b2cbf", weight: 5, kind: "debt", resolve: createCoinStealResolution(0.12) },
  { id: "coins-15", label: "+15 monedas", color: "#fcbf49", weight: 5, kind: "coins", resolve: createCoinResolution(15, "Mini jackpot romantico desbloqueado.") },
  {
    id: "double-stake",
    label: "Beso blindado",
    color: "#8338ec",
    weight: 6,
    kind: "modifier",
    resolve: () => ({
      incrementsCombo: true,
      comboSource: "beso blindado",
      setKissShield: true,
      audioCue: "power-up",
      message: "Guardaste un beso blindado mas para el siguiente tropiezo.",
      tone: "special",
    }),
  },
  { id: "debt-5-hard", label: "Debes 2 besos", color: "#8d0801", weight: 5, kind: "debt", resolve: createDebtResolution(2, "Debes 2 besos y el combo se rompe.") },
];

const getCheapestLockedTierTwoRewardId = (state: GameState): string | null => {
  const reward = rewardCatalog
    .filter((item) => item.tier === 2)
    .filter((item) => !state.unlockedRewardIds.includes(item.id))
    .sort((left, right) => left.price - right.price)[0];

  return reward?.id ?? null;
};

const getCheapestLockedTierThreeRewardId = (state: GameState): string | null => {
  const reward = rewardCatalog
    .filter((item) => item.tier === 3)
    .filter((item) => !state.unlockedRewardIds.includes(item.id))
    .sort((left, right) => left.price - right.price)[0];

  return reward?.id ?? null;
};

const getCheapestReservableRewardId = (state: GameState): string | null => {
  const reward = rewardCatalog
    .filter((item) => item.tier === 1 || item.tier === 2)
    .filter((item) => !state.reservedRewardIds.includes(item.id))
    .filter((item) => !state.claimedRewardIds.includes(item.id))
    .sort((left, right) => left.price - right.price)[0];

  return reward?.id ?? null;
};

const getCheapestFreeUpgradeId = (state: GameState): string | null => {
  const purchasedUpgrades = upgradeCatalog.filter((item) => state.purchasedUpgradeIds.includes(item.id));

  const upgrade = upgradeCatalog
    .filter((item) => item.tier === 1 || item.tier === 2)
    .filter((item) => !state.purchasedUpgradeIds.includes(item.id))
    .filter((item) => !purchasedUpgrades.some((owned) => owned.family === item.family && owned.level > item.level))
    .filter((item) => item.level === 1 || purchasedUpgrades.some((owned) => owned.family === item.family && owned.level === item.level - 1))
    .sort((left, right) => left.price - right.price)[0];

  return upgrade?.id ?? null;
};

const applyGrantedUpgrade = (state: GameState, upgradeId: string): Pick<GameState, "purchasedUpgradeIds" | "kissGuardChargeReady" | "kissShieldSpinProgress"> => {
  const grantedUpgrade = upgradeCatalog.find((item) => item.id === upgradeId);

  if (!grantedUpgrade) {
    return {
      purchasedUpgradeIds: state.purchasedUpgradeIds,
      kissGuardChargeReady: state.kissGuardChargeReady,
      kissShieldSpinProgress: state.kissShieldSpinProgress,
    };
  }

  const purchasedUpgradeIds = state.purchasedUpgradeIds
    .filter((ownedId) => {
      const ownedUpgrade = upgradeCatalog.find((item) => item.id === ownedId);
      if (!ownedUpgrade) {
        return false;
      }

      return ownedUpgrade.family !== grantedUpgrade.family;
    })
    .concat(grantedUpgrade.id)
    .filter((ownedId, index, collection) => collection.indexOf(ownedId) === index);

  return {
    purchasedUpgradeIds,
    kissGuardChargeReady: grantedUpgrade.id === "kiss-guard" ? true : state.kissGuardChargeReady,
    kissShieldSpinProgress: grantedUpgrade.id === "kiss-guard" ? 0 : state.kissShieldSpinProgress,
  };
};

export const createSurprisePool = (): SurpriseOption[] => [
  {
    id: "surprise-25-coins",
    label: "25 monedas",
    description: "Una lluvia de monedas cae directo en tu marcador.",
    emoji: "🪙",
    apply: (state) => ({
      coins: state.coins + 25,
      lastCoinReward: 25,
      highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + 25),
    }),
  },
  {
    id: "surprise-unlock-tier-two",
    label: "Desbloquea nivel 2",
    description: "Abre gratis el regalo bloqueado mas barato del nivel 2.",
    emoji: "🔓",
    apply: (state) => {
      const rewardId = getCheapestLockedTierTwoRewardId(state);
      const reward = rewardCatalog.find((item) => item.id === rewardId);

      if (!rewardId || !reward) {
        return {
          coins: state.coins + 25,
          lastCoinReward: 25,
          highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + 25),
          revealLabel: "25 monedas",
          revealDescription: "El nivel 2 ya estaba abierto, asi que la sorpresa se convirtio en 25 monedas.",
        };
      }

      return {
        unlockedRewardIds: [...new Set([...state.unlockedRewardIds, rewardId])],
        revealLabel: "Desbloqueaste un regalo raro",
        revealDescription: `Se desbloqueo ${reward.name} en la tienda de regalos.`,
      };
    },
  },
  {
    id: "surprise-unlock-tier-three",
    label: "Desbloquea nivel 3",
    description: "Abre gratis el regalo bloqueado mas barato del nivel 3.",
    emoji: "👑",
    apply: (state) => {
      const rewardId = getCheapestLockedTierThreeRewardId(state);
      const reward = rewardCatalog.find((item) => item.id === rewardId);

      if (!rewardId || !reward) {
        return {
          coins: state.coins + 25,
          lastCoinReward: 25,
          highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + 25),
          revealLabel: "25 monedas",
          revealDescription: "El nivel 3 ya estaba abierto, asi que la sorpresa se convirtio en 25 monedas.",
        };
      }

      return {
        unlockedRewardIds: [...new Set([...state.unlockedRewardIds, rewardId])],
        revealLabel: "Desbloqueaste un regalo Epico",
        revealDescription: `Se desbloqueo ${reward.name} en la tienda de regalos.`,
      };
    },
  },
  {
    id: "surprise-free-reward",
    label: "Ganas el regalo mas barato",
    description: "Te llevas gratis el regalo mas barato disponible entre nivel 1 y nivel 2.",
    emoji: "🎁",
    apply: (state) => {
      const rewardId = getCheapestReservableRewardId(state);
      const reward = rewardCatalog.find((item) => item.id === rewardId);

      if (!rewardId || !reward) {
        return {
          coins: state.coins + 30,
          lastCoinReward: 30,
          highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + 30),
          revealLabel: "30 monedas",
          revealDescription: "Ya no quedaban regalos de tier 1 o 2 por ganar, asi que recibiste 30 monedas.",
        };
      }

      return {
        reservedRewardIds: [...new Set([...state.reservedRewardIds, rewardId])],
        unlockedRewardIds: [...new Set([...state.unlockedRewardIds, rewardId])],
        revealLabel: `Ganaste ${reward.name}`,
        revealEmoji: reward.emoji,
        revealDescription: `El regalo gratis fue ${reward.name}. Ya quedo reservado para ti.`,
      };
    },
  },
  {
    id: "surprise-free-upgrade",
    label: "Gana mejora gratis",
    description: "Te llevas una mejora gratis entre nivel 1 y nivel 2.",
    emoji: "⚡",
    apply: (state) => {
      const upgradeId = getCheapestFreeUpgradeId(state);
      const upgrade = upgradeCatalog.find((item) => item.id === upgradeId);

      if (!upgradeId || !upgrade) {
        return {
          coins: state.coins + 30,
          lastCoinReward: 30,
          highestCoinsReached: Math.max(state.highestCoinsReached, state.coins + 30),
          revealLabel: "30 monedas",
          revealDescription: "Ya no quedaban mejoras de tier 1 o 2 por ganar, asi que recibiste 30 monedas.",
        };
      }

      return {
        ...applyGrantedUpgrade(state, upgradeId),
        revealLabel: `Ganaste ${upgrade.name}`,
        revealEmoji: upgrade.emoji,
        revealDescription: upgrade.description,
      };
    },
  },
  {
    id: "surprise-lucky-spin",
    label: "Giro de la suerte",
    description: "Tu siguiente giro se convierte en Jackpot automaticamente.",
    emoji: "🎡",
    apply: () => ({
      jackpotQueued: true,
      revealLabel: "Giro de la suerte",
      revealDescription: "Tu siguiente giro activara un Jackpot automaticamente.",
    }),
  },
];
