
const BET_OPTIONS = [50, 100, 200, 500];
const DEFAULT_BET = 100;
const DEFAULT_BALANCE = 1800;
const DAILY_GRANT = 300;
const SAVE_KEY = "prompt-palace-v1";
const LOG_LIMIT = 14;

const SYMBOLS = [
  { id: "bot", emoji: "🤖", name: "Bot Loop", weight: 22, pair: 1.8, triple: 4.8 },
  { id: "receipt", emoji: "🧾", name: "Token Receipt", weight: 18, pair: 2.2, triple: 5.6 },
  { id: "fire", emoji: "🔥", name: "GPU Burn", weight: 14, pair: 2.8, triple: 7.8 },
  { id: "brain", emoji: "🧠", name: "Hallucination Core", weight: 12, pair: 3.5, triple: 9.4 },
  { id: "safety", emoji: "📉", name: "Safety Team", weight: 10, pair: 4.2, triple: 11.8 },
  { id: "coin", emoji: "🪙", name: "VC Vault", weight: 8, pair: 5.4, triple: 14.6 },
  { id: "crown", emoji: "👑", name: "Model Overlord", weight: 6, pair: 6.8, triple: 18.5 },
];

const SPECIAL_COMBO = {
  ids: ["bot", "brain", "fire"],
  label: "Synthetic Meltdown",
  multiplier: 25,
};

const STORE_ITEMS = [
  {
    id: "lucky",
    name: "Lucky Chance",
    cost: 420,
    duration: 9,
    description: "Biases reels toward high-paying emojis for 9 spins.",
  },
  {
    id: "streak",
    name: "Streak Heat",
    cost: 460,
    duration: 8,
    description: "Each consecutive win adds +0.12x, max +0.72x.",
  },
  {
    id: "multi",
    name: "Multiplier Surge",
    cost: 540,
    duration: 6,
    description: "Adds +35% payout multiplier while active.",
  },
  {
    id: "refund",
    name: "Graceful Refund",
    cost: 350,
    duration: 10,
    description: "Returns 40% bet on losing spins.",
  },
];

const SPIN_LINES = [
  "Lever pulled. Token telemetry says the model is thinking expensive thoughts.",
  "RNG compiling. Confidence levels high, factuality levels pending.",
  "Inference engine warmed up. Wallet cooling system not included.",
  "Prompt deployed. The house model is now freelancing with your VC.",
];

const WIN_LINES = [
  "The model cited real sources. Finance accepts this miracle.",
  "Quality output achieved. Extremely rare in production.",
  "You found signal in the noise. Compliance is furious.",
  "For one spin, the AI stopped hallucinating your balance sheet.",
];

const LOSS_LINES = [
  "No hit. Your VC funded another overconfident paragraph.",
  "Missed. Model requested more context and took your tokens anyway.",
  "The reels said no. So did your return on prompt engineering.",
  "Loss locked. The AI upgraded its certainty, not your bankroll.",
];

const AUTO_LINES = [
  "Autospin armed. Delegating financial decisions to pure entropy.",
  "Autospin running. Human oversight has been gracefully ignored.",
  "Autospin active. The model calls this an optimization pass.",
];

const balanceEl = document.getElementById("balance");
const biggestWinEl = document.getElementById("biggestWin");
const heatViewEl = document.getElementById("heatView");
const resultTextEl = document.getElementById("resultText");
const payoutListEl = document.getElementById("payoutList");
const winLogEl = document.getElementById("winLog");
const storeStatusEl = document.getElementById("storeStatus");
const betTextEl = document.getElementById("betText");
const autoStatusEl = document.getElementById("autoStatus");
const dailyStatusEl = document.getElementById("dailyStatus");
const dailyGrantEl = document.getElementById("dailyGrant");
const spinBtnEl = document.getElementById("spinBtn");
const startAutoEl = document.getElementById("startAuto");
const stopAutoEl = document.getElementById("stopAuto");
const chipsEl = Array.from(document.querySelectorAll(".chip"));
const storeButtonsEl = Array.from(document.querySelectorAll(".store-item"));
const reelWindows = Array.from(document.querySelectorAll(".reel-window"));
const reelStrips = Array.from(document.querySelectorAll(".reel-strip"));
const tensionFillEl = document.getElementById("tensionFill");
const tensionTextEl = document.getElementById("tensionText");
const multiplierPopEl = document.getElementById("multiplierPop");
const bigWinShowcaseEl = document.getElementById("bigWinShowcase");
const bigWinShowcaseValueEl = document.getElementById("bigWinShowcaseValue");
const bigWinShowcaseMultEl = document.getElementById("bigWinShowcaseMult");
const screenFlashEl = document.getElementById("screenFlash");
const confettiLayerEl = document.getElementById("confettiLayer");
const fireworkLayerEl = document.getElementById("fireworkLayer");

const reelStates = reelStrips.map(() => ({
  offset: 0,
  cellHeight: 0,
}));

const symbolIndex = new Map(SYMBOLS.map((symbol, index) => [symbol.id, index]));

const state = {
  balance: DEFAULT_BALANCE,
  bet: DEFAULT_BET,
  spins: 0,
  biggestWin: 0,
  autoSpin: false,
  isSpinning: false,
  stopRequested: false,
  lastDailyGrant: "",
  storeBuffs: {
    lucky: 0,
    streak: 0,
    multi: 0,
    refund: 0,
  },
  streakWins: 0,
  streakBonus: 0,
  winLog: [],
};

let audioCtx;
let masterGain;
let noiseBuffer;
let spinLoopNodes = null;
let tensionToneTimer = 0;
let tensionMeterTimer = 0;
let autoSpinTimer = 0;

init();

function init() {
  loadState();
  buildReels();
  bindEvents();
  renderPayoutRules();
  renderStoreButtons();
  renderWinLog();
  setResult("Pull spin. Let probability gaslight your wallet.", "info");
  resetTensionMeter();
  syncUI();

  requestAnimationFrame(() => {
    measureReels();
    snapReels();
  });
}

function bindEvents() {
  chipsEl.forEach((chip) => {
    chip.addEventListener("click", () => {
      setBet(Number(chip.dataset.bet));
    });
  });

  spinBtnEl.addEventListener("click", () => {
    state.autoSpin = false;
    state.stopRequested = false;
    spin();
  });

  startAutoEl.addEventListener("click", () => {
    if (state.autoSpin) {
      return;
    }

    state.autoSpin = true;
    state.stopRequested = false;
    setResult(sample(AUTO_LINES), "info");
    syncUI();

    if (!state.isSpinning) {
      spin();
    }
  });

  stopAutoEl.addEventListener("click", () => {
    state.autoSpin = false;
    state.stopRequested = true;
    clearTimeout(autoSpinTimer);
    setResult("Autospin stop requested. Current spin will lock out cleanly.", "info");
    syncUI();
  });

  dailyGrantEl.addEventListener("click", claimDailyGrant);

  storeButtonsEl.forEach((button) => {
    button.addEventListener("click", () => buyBuff(button.dataset.buff || ""));
  });

  document.addEventListener("pointerdown", ensureAudioContext, { once: true });
  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      measureReels();
      snapReels();
    });
  });
}

function buildReels() {
  const cycles = 12;

  reelStrips.forEach((strip, index) => {
    strip.innerHTML = "";

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      for (const symbol of SYMBOLS) {
        const cell = document.createElement("div");
        cell.className = "reel-cell";
        cell.textContent = symbol.emoji;
        strip.appendChild(cell);
      }
    }

    reelStates[index].offset = Math.floor(Math.random() * SYMBOLS.length);
  });
}

function measureReels() {
  reelStrips.forEach((strip, index) => {
    const firstCell = strip.querySelector(".reel-cell");
    if (!firstCell) {
      return;
    }

    const measured = firstCell.getBoundingClientRect().height;
    reelStates[index].cellHeight = Math.max(1, measured);
  });
}

function snapReels() {
  reelStrips.forEach((_, index) => {
    const cellHeight = reelStates[index].cellHeight || 70;
    reelStates[index].offset = (Math.round(reelStates[index].offset) % SYMBOLS.length + SYMBOLS.length) % SYMBOLS.length;
    setStripPosition(index, reelStates[index].offset * cellHeight, 0, "linear");
  });
}

function setStripPosition(reelIndex, pixelOffset, durationMs, easing) {
  const strip = reelStrips[reelIndex];

  if (durationMs > 0) {
    strip.style.transition = `transform ${durationMs}ms ${easing}`;
  } else {
    strip.style.transition = "none";
  }

  strip.style.transform = `translateY(${-pixelOffset}px)`;
}
async function spin() {
  if (state.isSpinning) {
    return;
  }

  if (state.balance < state.bet) {
    state.autoSpin = false;
    state.stopRequested = true;
    setResult("Insufficient VC. Even bad models demand prepaid tokens.", "loss");
    syncUI();
    return;
  }

  ensureAudioContext();
  clearTimeout(autoSpinTimer);

  state.isSpinning = true;
  state.balance -= state.bet;
  state.spins += 1;

  const weightedSymbols = applyLuckyWeighting();
  const outcomes = [pickWeighted(weightedSymbols), pickWeighted(weightedSymbols), pickWeighted(weightedSymbols)];
  const targets = outcomes.map((symbol) => symbolIndex.get(symbol.id) || 0);

  const baseDuration = 1280 + Math.round(Math.random() * 120);
  const reelDurations = [baseDuration, baseDuration + 430, baseDuration + 860];
  const totalSpinDuration = reelDurations[2] + 60;

  setResult(sample(SPIN_LINES), "info");
  syncUI();
  playLeverPullSound();
  startSpinLoopSound();
  startTensionTone(totalSpinDuration);
  startTensionMeter(totalSpinDuration);

  await Promise.all(targets.map((targetIndex, reelIndex) => spinSingleReel(reelIndex, targetIndex, reelDurations[reelIndex])));

  stopSpinLoopSound();
  stopTensionTone();
  finishTensionMeter();

  const payoutMeta = calculatePayout(outcomes);
  const buffMultiplier = state.storeBuffs.multi > 0 ? 1.35 : 1;
  const heatMultiplier = state.storeBuffs.streak > 0 ? 1 + state.streakBonus : 1;
  const combinedMultiplier = payoutMeta.multiplier * buffMultiplier * heatMultiplier;
  const payout = Math.round(state.bet * combinedMultiplier);

  if (payout > 0) {
    const isJackpot = payoutMeta.jackpot || combinedMultiplier >= 12;
    const newRecord = payout > state.biggestWin;

    state.balance += payout;
    state.biggestWin = Math.max(state.biggestWin, payout);

    if (state.storeBuffs.streak > 0) {
      state.streakWins += 1;
      state.streakBonus = Math.min(0.72, state.streakBonus + 0.12);
    }

    setResult(`${sample(WIN_LINES)} ${payoutMeta.label}: +${fmtVc(payout)} (${combinedMultiplier.toFixed(2)}x).`, "win");
    showMultiplierPop(`${combinedMultiplier.toFixed(2)}x`);
    triggerWinFX({ payout, multiplier: combinedMultiplier, jackpot: isJackpot });
    pushWinLog({
      emoji: isJackpot ? "👑" : combinedMultiplier >= 6 ? "💥" : "🪙",
      amount: payout,
      text: `${payoutMeta.label} paid +${fmtVc(payout)} (${combinedMultiplier.toFixed(2)}x).`,
    });

    if (state.storeBuffs.streak > 0 && state.streakBonus > 0) {
      showMultiplierPop(`Heat +${state.streakBonus.toFixed(2)}x`);
    }

    if (newRecord) {
      triggerBigWinShowcase(payout, combinedMultiplier);
      pushWinLog({
        emoji: "🎆",
        amount: payout,
        text: `New biggest win locked at ${fmtVc(payout)}.`,
      });
    }
  } else {
    state.streakWins = 0;
    if (state.storeBuffs.streak <= 0) {
      state.streakBonus = 0;
    } else {
      state.streakBonus = Math.max(0, state.streakBonus - 0.2);
    }

    if (state.storeBuffs.refund > 0) {
      const refund = Math.round(state.bet * 0.4);
      state.balance += refund;
      setResult(`Missed line. Graceful Refund returned +${fmtVc(refund)}.`, "info");
      showMultiplierPop("Refund +40%");
      playCoinClinks(refund, 3);
      pushWinLog({
        emoji: "🧯",
        amount: refund,
        text: `Graceful Refund kicked back +${fmtVc(refund)}.`,
      });
    } else {
      setResult(sample(LOSS_LINES), "loss");
      playLossSound();
    }
  }

  consumeBuffSpin();
  state.isSpinning = false;
  resetTensionMeter(260);

  if (state.balance < state.bet) {
    state.autoSpin = false;
    state.stopRequested = true;
  }

  saveState();
  renderStoreButtons();
  renderWinLog();
  syncUI();

  if (state.autoSpin && !state.stopRequested && state.balance >= state.bet) {
    autoSpinTimer = setTimeout(() => {
      if (state.autoSpin && !state.isSpinning) {
        spin();
      }
    }, 110);
  }
}

function spinSingleReel(reelIndex, targetIndex, durationMs) {
  return new Promise((resolve) => {
    const strip = reelStrips[reelIndex];
    const reelWindow = reelWindows[reelIndex];
    const cellHeight = reelStates[reelIndex].cellHeight || 70;
    const cycleHeight = SYMBOLS.length * cellHeight;
    const currentOffsetPx = reelStates[reelIndex].offset * cellHeight;

    const extraLoops = 8 + reelIndex * 2 + Math.floor(Math.random() * 2);
    const travelSymbols = extraLoops * SYMBOLS.length + targetIndex;
    const targetPx = currentOffsetPx + travelSymbols * cellHeight;

    reelWindow.classList.add("spinning");

    const lockTimer = setTimeout(() => {
      lockReel(reelIndex);
    }, Math.max(140, durationMs - 24));

    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;

      clearTimeout(lockTimer);
      strip.removeEventListener("transitionend", onEnd);

      const normalizedPx = ((targetPx % cycleHeight) + cycleHeight) % cycleHeight;
      reelStates[reelIndex].offset = (Math.round(normalizedPx / cellHeight) % SYMBOLS.length + SYMBOLS.length) % SYMBOLS.length;

      setStripPosition(reelIndex, normalizedPx, 0, "linear");
      reelWindow.classList.remove("spinning");
      resolve();
    };

    const onEnd = () => {
      finish();
    };

    strip.addEventListener("transitionend", onEnd, { once: true });
    setStripPosition(reelIndex, targetPx, durationMs, "cubic-bezier(0.11, 0.78, 0.21, 1)");

    setTimeout(finish, durationMs + 80);
  });
}

function lockReel(reelIndex) {
  const reelWindow = reelWindows[reelIndex];
  reelWindow.classList.remove("locked");
  void reelWindow.offsetWidth;
  reelWindow.classList.add("locked");
  setTimeout(() => reelWindow.classList.remove("locked"), 260);
  playReelStopClick(reelIndex);
}

function applyLuckyWeighting() {
  if (state.storeBuffs.lucky <= 0) {
    return SYMBOLS;
  }

  const sortedByTriple = [...SYMBOLS].sort((a, b) => b.triple - a.triple);
  const boosted = new Set(sortedByTriple.slice(0, 3).map((symbol) => symbol.id));

  return SYMBOLS.map((symbol) => ({
    ...symbol,
    adjustedWeight: boosted.has(symbol.id) ? symbol.weight * 1.45 : symbol.weight,
  }));
}

function pickWeighted(symbols) {
  const total = symbols.reduce((sum, symbol) => sum + (symbol.adjustedWeight || symbol.weight), 0);
  let roll = Math.random() * total;

  for (const symbol of symbols) {
    roll -= symbol.adjustedWeight || symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }

  return symbols[symbols.length - 1];
}

function calculatePayout(outcomes) {
  const ids = outcomes.map((symbol) => symbol.id);
  const counts = new Map();

  for (const id of ids) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  const hasSpecial = SPECIAL_COMBO.ids.every((id) => ids.includes(id));
  if (hasSpecial) {
    return {
      multiplier: SPECIAL_COMBO.multiplier,
      label: SPECIAL_COMBO.label,
      jackpot: true,
    };
  }

  for (const symbol of SYMBOLS) {
    if (counts.get(symbol.id) === 3) {
      return {
        multiplier: symbol.triple,
        label: `Triple ${symbol.emoji} ${symbol.name}`,
        jackpot: symbol.triple >= 12,
      };
    }
  }

  for (const symbol of SYMBOLS) {
    if (counts.get(symbol.id) === 2) {
      return {
        multiplier: symbol.pair,
        label: `Pair ${symbol.emoji} ${symbol.name}`,
        jackpot: false,
      };
    }
  }

  if (ids.includes("coin")) {
    return {
      multiplier: 0.35,
      label: "VC drip",
      jackpot: false,
    };
  }

  return {
    multiplier: 0,
    label: "No line",
    jackpot: false,
  };
}
function triggerWinFX({ payout, multiplier, jackpot }) {
  triggerShake();
  pulseFlash();

  if (jackpot) {
    spawnConfetti(180);
    spawnFireworks(7);
    playJackpotFanfare();
  } else {
    spawnConfetti(multiplier >= 6 ? 120 : 70);
    if (multiplier >= 6) {
      spawnFireworks(4);
    }
    playCoinClinks(payout, clamp(Math.round(multiplier), 3, 9));
  }
}

function triggerBigWinShowcase(payout, multiplier) {
  bigWinShowcaseValueEl.textContent = fmtVc(payout);
  bigWinShowcaseMultEl.textContent = `x${multiplier.toFixed(2)}`;
  bigWinShowcaseEl.classList.remove("show");
  void bigWinShowcaseEl.offsetWidth;
  bigWinShowcaseEl.classList.add("show");
  spawnFireworks(9);
  showMultiplierPop(`Record x${multiplier.toFixed(2)}`);
}

function spawnConfetti(count) {
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.setProperty("--x", `${Math.random() * 100}%`);
    piece.style.setProperty("--h", `${Math.floor(Math.random() * 360)}`);
    piece.style.setProperty("--rot", `${Math.floor(Math.random() * 360)}deg`);
    piece.style.setProperty("--dur", `${1.2 + Math.random() * 1.1}s`);
    confettiLayerEl.appendChild(piece);
    setTimeout(() => piece.remove(), 2400);
  }
}

function spawnFireworks(count) {
  for (let i = 0; i < count; i += 1) {
    const burst = document.createElement("span");
    burst.className = "firework";
    burst.style.setProperty("--x", `${10 + Math.random() * 80}%`);
    burst.style.setProperty("--y", `${10 + Math.random() * 65}%`);
    burst.style.setProperty("--h", `${Math.floor(Math.random() * 360)}`);
    fireworkLayerEl.appendChild(burst);
    setTimeout(() => burst.remove(), 900);
  }
}

function triggerShake() {
  document.body.classList.remove("screen-shake");
  void document.body.offsetWidth;
  document.body.classList.add("screen-shake");
}

function pulseFlash() {
  screenFlashEl.classList.remove("active");
  void screenFlashEl.offsetWidth;
  screenFlashEl.classList.add("active");
}

function showMultiplierPop(text) {
  multiplierPopEl.textContent = text;
  multiplierPopEl.classList.remove("show");
  void multiplierPopEl.offsetWidth;
  multiplierPopEl.classList.add("show");
}

function consumeBuffSpin() {
  STORE_ITEMS.forEach((item) => {
    state.storeBuffs[item.id] = Math.max(0, (state.storeBuffs[item.id] || 0) - 1);
  });

  if (state.storeBuffs.streak <= 0) {
    state.streakBonus = 0;
    state.streakWins = 0;
  }
}

function storeItemById(id) {
  return STORE_ITEMS.find((item) => item.id === id);
}

function buyBuff(buffId) {
  const item = storeItemById(buffId);
  if (!item || state.isSpinning || state.autoSpin) {
    return;
  }

  if (state.balance < item.cost) {
    setResult(`Not enough VC for ${item.name}. Even satire has a budget.`, "loss");
    playLossSound();
    return;
  }

  state.balance -= item.cost;
  state.storeBuffs[item.id] += item.duration;

  if (item.id === "streak") {
    state.streakBonus = 0;
    state.streakWins = 0;
  }

  setResult(`${item.name} loaded for ${item.duration} spins.`, "info");
  playStorePurchaseSound();
  renderStoreButtons();
  syncUI();
  saveState();
}

function buffSummary() {
  const active = [];

  STORE_ITEMS.forEach((item) => {
    const left = state.storeBuffs[item.id] || 0;
    if (left > 0) {
      active.push(`${item.name}: ${left}`);
    }
  });

  if (active.length === 0) {
    return "No perks active. Raw RNG has the mic.";
  }

  return `Active perks -> ${active.join(" | ")}`;
}

function renderStoreButtons() {
  storeButtonsEl.forEach((button) => {
    const item = storeItemById(button.dataset.buff || "");
    if (!item) {
      return;
    }

    const left = state.storeBuffs[item.id] || 0;
    button.classList.toggle("active", left > 0);
    button.disabled = state.isSpinning || state.autoSpin || state.balance < item.cost;
    button.innerHTML = `<strong>${item.name}</strong><small>${fmtVc(item.cost)} | ${item.description}</small><small>${left > 0 ? `${left} spin${left === 1 ? "" : "s"} remaining` : "Inactive"}</small>`;
  });

  storeStatusEl.textContent = buffSummary();
}

function renderPayoutRules() {
  payoutListEl.innerHTML = "";

  SYMBOLS.forEach((symbol) => {
    const item = document.createElement("li");
    item.textContent = `${symbol.emoji} ${symbol.name}: pair x${symbol.pair.toFixed(1)}, triple x${symbol.triple.toFixed(1)}`;
    payoutListEl.appendChild(item);
  });

  const special = document.createElement("li");
  special.textContent = `${SPECIAL_COMBO.label} (${SPECIAL_COMBO.ids.map((id) => SYMBOLS[symbolIndex.get(id)].emoji).join(" + ")}): x${SPECIAL_COMBO.multiplier.toFixed(1)} jackpot`;
  payoutListEl.appendChild(special);

  const drip = document.createElement("li");
  drip.textContent = "Any 🪙 on a miss: x0.35 VC drip consolation.";
  payoutListEl.appendChild(drip);

  const buffs = document.createElement("li");
  buffs.textContent = "Store perks stack on top of base multipliers.";
  payoutListEl.appendChild(buffs);
}

function pushWinLog(entry) {
  state.winLog.unshift({
    emoji: entry.emoji,
    amount: entry.amount,
    text: entry.text,
    time: timestamp(),
  });

  if (state.winLog.length > LOG_LIMIT) {
    state.winLog.length = LOG_LIMIT;
  }
}

function renderWinLog() {
  winLogEl.innerHTML = "";

  if (state.winLog.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "🛰️ No gains logged yet. The house AI is calibrating your disappointment.";
    winLogEl.appendChild(empty);
    return;
  }

  state.winLog.forEach((entry) => {
    const line = document.createElement("li");
    line.textContent = `${entry.emoji} +${fmtVc(entry.amount)} | ${entry.text} (${entry.time})`;
    winLogEl.appendChild(line);
  });
}

function claimDailyGrant() {
  const today = localDateToken();
  if (state.lastDailyGrant === today) {
    setResult("Daily grant already claimed. Finance reopens at local midnight.", "info");
    syncUI();
    return;
  }

  state.balance += DAILY_GRANT;
  state.lastDailyGrant = today;
  setResult(`Daily VC bailout credited: +${fmtVc(DAILY_GRANT)}.`, "win");
  showMultiplierPop("Daily +300 VC");
  playDailyGrantSound();

  pushWinLog({
    emoji: "📆",
    amount: DAILY_GRANT,
    text: "Daily grant collected before the model spent it first.",
  });

  saveState();
  renderWinLog();
  syncUI();
}

function updateDailyGrantState() {
  const claimed = state.lastDailyGrant === localDateToken();
  dailyGrantEl.disabled = claimed;
  dailyStatusEl.textContent = claimed
    ? "Daily grant claimed. Next unlock at local midnight."
    : "Grant available now.";
}

function setBet(nextBet) {
  if (!BET_OPTIONS.includes(nextBet) || state.isSpinning || state.autoSpin) {
    return;
  }

  state.bet = nextBet;
  setResult(`Bet adjusted to ${fmtVc(nextBet)}. Maximum token burn remains online.`, "info");
  syncUI();
  saveState();
}

function syncUI() {
  balanceEl.textContent = fmtVc(state.balance);
  biggestWinEl.textContent = fmtVc(state.biggestWin);
  heatViewEl.textContent = `${(1 + state.streakBonus).toFixed(2)}x`;
  betTextEl.textContent = fmtVc(state.bet);

  chipsEl.forEach((chip) => {
    const chipBet = Number(chip.dataset.bet);
    chip.classList.toggle("active", chipBet === state.bet);
    chip.disabled = state.isSpinning || state.autoSpin;
  });

  const controlsLocked = state.isSpinning;
  spinBtnEl.disabled = controlsLocked || state.autoSpin || state.balance < state.bet;
  startAutoEl.disabled = controlsLocked || state.autoSpin || state.balance < state.bet;
  stopAutoEl.disabled = !state.autoSpin && !state.isSpinning;

  autoStatusEl.textContent = state.autoSpin
    ? "Autospin active. House AI now controls pacing."
    : state.stopRequested
      ? "Autospin stopped. Manual control restored."
      : "Manual mode armed.";

  renderStoreButtons();
  updateDailyGrantState();
}

function setResult(message, type) {
  resultTextEl.textContent = message;
  resultTextEl.classList.remove("win", "loss", "info");
  if (type) {
    resultTextEl.classList.add(type);
  }
}

function startTensionMeter(durationMs) {
  clearInterval(tensionMeterTimer);

  const start = performance.now();
  const total = Math.max(500, durationMs);
  tensionFillEl.style.width = "0%";
  tensionTextEl.textContent = "Charging";

  const tick = () => {
    const elapsed = performance.now() - start;
    const pct = clamp(elapsed / total, 0, 1);
    tensionFillEl.style.width = `${(pct * 100).toFixed(1)}%`;
    tensionTextEl.textContent = pct >= 1 ? "Locked" : `AI panic ${Math.round(pct * 100)}%`;

    if (pct >= 1) {
      clearInterval(tensionMeterTimer);
      tensionMeterTimer = 0;
    }
  };

  tick();
  tensionMeterTimer = setInterval(tick, 35);
}

function finishTensionMeter() {
  clearInterval(tensionMeterTimer);
  tensionMeterTimer = 0;
  tensionFillEl.style.width = "100%";
  tensionTextEl.textContent = "Locked";
}

function resetTensionMeter(delayMs = 0) {
  const reset = () => {
    tensionFillEl.style.width = "0%";
    tensionTextEl.textContent = "Idle";
  };

  if (delayMs > 0) {
    setTimeout(reset, delayMs);
    return;
  }

  reset();
}
function ensureAudioContext() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      const comp = audioCtx.createDynamicsCompressor();

      comp.threshold.value = -24;
      comp.knee.value = 24;
      comp.ratio.value = 8;
      comp.attack.value = 0.002;
      comp.release.value = 0.2;

      masterGain.gain.value = 0.85;
      masterGain.connect(comp);
      comp.connect(audioCtx.destination);

      noiseBuffer = buildNoiseBuffer(audioCtx);
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (error) {
    // Audio is optional.
  }
}

function buildNoiseBuffer(context) {
  const length = context.sampleRate;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

function playLeverPullSound() {
  if (!audioCtx || !masterGain || !noiseBuffer) {
    return;
  }

  const now = audioCtx.currentTime;

  const pullNoise = audioCtx.createBufferSource();
  pullNoise.buffer = noiseBuffer;

  const band = audioCtx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(900, now);
  band.frequency.exponentialRampToValueAtTime(130, now + 0.32);
  band.Q.value = 0.8;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

  pullNoise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(masterGain);

  pullNoise.start(now);
  pullNoise.stop(now + 0.35);

  const thunk = audioCtx.createOscillator();
  const thunkGain = audioCtx.createGain();
  thunk.type = "triangle";
  thunk.frequency.setValueAtTime(210, now);
  thunk.frequency.exponentialRampToValueAtTime(72, now + 0.24);
  thunkGain.gain.setValueAtTime(0.0001, now);
  thunkGain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
  thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  thunk.connect(thunkGain);
  thunkGain.connect(masterGain);
  thunk.start(now);
  thunk.stop(now + 0.3);
}

function startSpinLoopSound() {
  if (!audioCtx || !masterGain || !noiseBuffer) {
    return;
  }

  stopSpinLoopSound();

  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.18);

  const rumble = audioCtx.createOscillator();
  rumble.type = "sawtooth";
  rumble.frequency.value = 86;

  const rumbleGain = audioCtx.createGain();
  rumbleGain.gain.value = 0.05;

  const sub = audioCtx.createOscillator();
  sub.type = "triangle";
  sub.frequency.value = 43;

  const subGain = audioCtx.createGain();
  subGain.gain.value = 0.038;

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1450;
  filter.Q.value = 0.6;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.02;

  rumble.connect(rumbleGain);
  rumbleGain.connect(gain);

  sub.connect(subGain);
  subGain.connect(gain);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(gain);

  gain.connect(masterGain);

  rumble.start(now);
  sub.start(now);
  noise.start(now);

  spinLoopNodes = { rumble, sub, noise, gain };
}

function stopSpinLoopSound() {
  if (!audioCtx || !spinLoopNodes) {
    return;
  }

  const now = audioCtx.currentTime;
  const { rumble, sub, noise, gain } = spinLoopNodes;

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  rumble.stop(now + 0.2);
  sub.stop(now + 0.2);
  noise.stop(now + 0.2);

  spinLoopNodes = null;
}

function playReelStopClick(index) {
  if (!audioCtx || !masterGain || !noiseBuffer) {
    return;
  }

  const now = audioCtx.currentTime + index * 0.01;

  const click = audioCtx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(2200 + index * 90, now);

  const clickGain = audioCtx.createGain();
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  click.connect(clickGain);
  clickGain.connect(masterGain);
  click.start(now);
  click.stop(now + 0.05);

  const thud = audioCtx.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(190 - index * 12, now);
  thud.frequency.exponentialRampToValueAtTime(120, now + 0.07);

  const thudGain = audioCtx.createGain();
  thudGain.gain.setValueAtTime(0.0001, now);
  thudGain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  thud.connect(thudGain);
  thudGain.connect(masterGain);
  thud.start(now);
  thud.stop(now + 0.09);
}
function startTensionTone(durationMs) {
  stopTensionTone();

  const started = performance.now();
  tensionToneTimer = setInterval(() => {
    const elapsed = performance.now() - started;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const freq = 250 + progress * 560;
    playTone(freq, 0.05, "triangle", 0.04);

    if (progress >= 1) {
      stopTensionTone();
    }
  }, 130);
}

function stopTensionTone() {
  clearInterval(tensionToneTimer);
  tensionToneTimer = 0;
}

function playCoinClinks(amount, countHint = 4) {
  if (!audioCtx || !masterGain) {
    return;
  }

  const count = clamp(countHint + Math.floor(amount / 600), 3, 12);

  for (let i = 0; i < count; i += 1) {
    const delay = i * (0.055 + Math.random() * 0.03);
    const freq = 1100 + Math.random() * 900;

    const ping = audioCtx.createOscillator();
    ping.type = "triangle";
    ping.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    ping.frequency.exponentialRampToValueAtTime(freq * 0.62, audioCtx.currentTime + delay + 0.09);

    const pingGain = audioCtx.createGain();
    pingGain.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
    pingGain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + delay + 0.008);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.12);

    ping.connect(pingGain);
    pingGain.connect(masterGain);
    ping.start(audioCtx.currentTime + delay);
    ping.stop(audioCtx.currentTime + delay + 0.14);
  }
}

function playJackpotFanfare() {
  if (!audioCtx || !masterGain) {
    return;
  }

  const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((freq, index) => {
    const when = audioCtx.currentTime + index * 0.1;

    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, when);

    const osc2 = audioCtx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 0.5, when);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.08, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc.start(when);
    osc2.start(when);
    osc.stop(when + 0.22);
    osc2.stop(when + 0.22);
  });

  playCoinClinks(2200, 10);
}

function playLossSound() {
  playTone(145, 0.11, "sawtooth", 0.05);
  playTone(90, 0.13, "triangle", 0.04, 0.02);
}

function playStorePurchaseSound() {
  playTone(370, 0.06, "triangle", 0.05);
  playTone(540, 0.08, "triangle", 0.06, 0.06);
}

function playDailyGrantSound() {
  playTone(420, 0.08, "triangle", 0.06);
  playTone(620, 0.1, "triangle", 0.07, 0.08);
  playCoinClinks(DAILY_GRANT, 4);
}

function playTone(frequency, seconds, type, gainLevel, delay = 0) {
  if (!audioCtx || !masterGain) {
    return;
  }

  const now = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    state.balance = asNumber(parsed.balance, DEFAULT_BALANCE);
    state.bet = DEFAULT_BET;
    state.spins = asNumber(parsed.spins, 0);
    state.biggestWin = asNumber(parsed.biggestWin, 0);
    state.lastDailyGrant = typeof parsed.lastDailyGrant === "string" ? parsed.lastDailyGrant : "";

    const savedBuffs = parsed.storeBuffs && typeof parsed.storeBuffs === "object" ? parsed.storeBuffs : {};
    state.storeBuffs = {
      lucky: clamp(asNumber(savedBuffs.lucky, 0), 0, 99),
      streak: clamp(asNumber(savedBuffs.streak, 0), 0, 99),
      multi: clamp(asNumber(savedBuffs.multi, 0), 0, 99),
      refund: clamp(asNumber(savedBuffs.refund, 0), 0, 99),
    };

    state.streakWins = clamp(asNumber(parsed.streakWins, 0), 0, 99);
    state.streakBonus = clamp(asNumber(parsed.streakBonus, 0), 0, 0.72);

    if (Array.isArray(parsed.winLog)) {
      state.winLog = parsed.winLog
        .filter((entry) => entry && typeof entry.text === "string")
        .map((entry) => ({
          emoji: typeof entry.emoji === "string" ? entry.emoji : "🪙",
          amount: Math.max(0, asNumber(entry.amount, 0)),
          text: entry.text,
          time: typeof entry.time === "string" ? entry.time : timestamp(),
        }))
        .slice(0, LOG_LIMIT);
    }
  } catch (error) {
    console.warn("Failed to load state", error);
  }
}

function saveState() {
  const payload = {
    balance: state.balance,
    bet: state.bet,
    spins: state.spins,
    biggestWin: state.biggestWin,
    lastDailyGrant: state.lastDailyGrant,
    storeBuffs: state.storeBuffs,
    streakWins: state.streakWins,
    streakBonus: state.streakBonus,
    winLog: state.winLog,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function localDateToken(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmtVc(value) {
  return `${Math.round(value).toLocaleString()} VC`;
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function asNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
