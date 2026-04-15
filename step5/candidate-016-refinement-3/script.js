const BET_OPTIONS = [50, 100, 200, 500];
const DEFAULT_BET = 100;
const DEFAULT_BALANCE = 2000;
const DAILY_GRANT = 300;
const SAVE_KEY = "vegas-ai-slot-v2";
const LOG_LIMIT = 16;
const THIRD_REEL_HANG_MIN = 440;
const THIRD_REEL_HANG_MAX = 620;
const LEVER_TRIGGER = 0.78;

const SYMBOLS = [
  { id: "bot", emoji: "🤖", name: "Token Bot", weight: 22, pair: 1.8, triple: 4.6 },
  { id: "prompt", emoji: "📝", name: "Prompt Debt", weight: 18, pair: 2.2, triple: 5.8 },
  { id: "fire", emoji: "🔥", name: "GPU Burn", weight: 14, pair: 2.9, triple: 7.9 },
  { id: "brain", emoji: "🧠", name: "Hallucination Core", weight: 12, pair: 3.6, triple: 9.6 },
  { id: "chart", emoji: "📉", name: "Runway Collapse", weight: 10, pair: 4.4, triple: 12.4 },
  { id: "coin", emoji: "🪙", name: "VC Vault", weight: 8, pair: 5.8, triple: 15.2 },
  { id: "crown", emoji: "👑", name: "Model Overlord", weight: 6, pair: 7.2, triple: 19.4 },
];

const SPECIAL_COMBO = {
  ids: ["bot", "brain", "fire"],
  label: "Synthetic Meltdown",
  multiplier: 26,
};

const STORE_ITEMS = [
  {
    id: "lucky",
    name: "Lucky Chance",
    cost: 420,
    duration: 9,
    description: "Biases high-value symbols for 9 pulls.",
  },
  {
    id: "streak",
    name: "Streak Heat",
    cost: 470,
    duration: 8,
    description: "Consecutive wins add +0.12x, up to +0.78x.",
  },
  {
    id: "multi",
    name: "Multiplier Sauce",
    cost: 560,
    duration: 6,
    description: "Adds +38% payout multiplier while active.",
  },
  {
    id: "refund",
    name: "Token Refund",
    cost: 360,
    duration: 10,
    description: "Returns 42% of your bet on losses.",
  },
];

const SPIN_LINES = [
  "Lever pulled. The model is about to optimize your wallet into a case study.",
  "Inference roulette engaged. Confidence up, accountability unavailable.",
  "Prompt dispatched. Finance has entered airplane mode.",
  "Sampling tokens at Vegas speed. Explainability remains optional.",
];

const WIN_LINES = [
  "Miracle output: the AI cited reality and paid rent.",
  "Unexpected competence detected. Audit trail has been muted.",
  "Signal found in the noise. Even QA looked surprised.",
  "For one spin, your model stopped hallucinating the balance sheet.",
];

const LOSS_LINES = [
  "No line. Your tokens funded another confident wrong answer.",
  "Missed. The AI requested more context and billed immediately.",
  "Dead pull. Great latency, terrible outcomes.",
  "Loss locked. The model improved certainty, not returns.",
];

const AUTO_LINES = [
  "Autospin armed. Delegating fiscal policy to entropy.",
  "Autospin running. Human judgment has been sandboxed.",
  "Autospin active. The house model is now your portfolio manager.",
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
const leverTrackEl = document.getElementById("leverTrack");
const leverHandleEl = document.getElementById("leverHandle");
const leverHintEl = document.getElementById("leverHint");

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

const leverState = {
  pull: 0,
  dragging: false,
  pointerId: -1,
  startY: 0,
  startPull: 0,
  releaseTimer: 0,
};

let autoSpinTimer = 0;
let tensionToneTimer = 0;
let tensionMeterTimer = 0;

let audioCtx;
let masterGain;
let noiseBuffer;
let spinLoopNodes = null;

init();

function init() {
  loadState();
  buildReels();
  bindEvents();
  renderPayoutRules();
  renderStoreButtons();
  renderWinLog();
  syncUI();
  setResult("Drag the lever down and let the house model freestyle your runway.", "info");
  resetTensionMeter();
  setLeverPull(0, true);

  requestAnimationFrame(() => {
    measureReels();
    snapReels();
  });
}

function bindEvents() {
  chipsEl.forEach((chip) => {
    chip.addEventListener("click", () => setBet(Number(chip.dataset.bet)));
  });

  startAutoEl.addEventListener("click", () => {
    if (state.autoSpin || state.isSpinning || state.balance < state.bet) {
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
    setResult("Autospin stop requested. Current pull will finish cleanly.", "info");
    syncUI();
  });

  dailyGrantEl.addEventListener("click", claimDailyGrant);

  storeButtonsEl.forEach((button) => {
    button.addEventListener("click", () => buyBuff(button.dataset.buff || ""));
  });

  leverHandleEl.addEventListener("pointerdown", onLeverPointerDown);
  leverHandleEl.addEventListener("pointermove", onLeverPointerMove);
  leverHandleEl.addEventListener("pointerup", onLeverPointerUp);
  leverHandleEl.addEventListener("pointercancel", onLeverPointerUp);

  leverHandleEl.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !leverLocked()) {
      event.preventDefault();
      state.autoSpin = false;
      state.stopRequested = false;
      setLeverPull(0.95);
      setTimeout(() => setLeverPull(0, true), 130);
      spin();
    }
  });

  document.addEventListener("pointerdown", ensureAudioContext, { once: true });

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      measureReels();
      snapReels();
    });
  });
}

function onLeverPointerDown(event) {
  if (event.button !== 0 || leverLocked() || state.balance < state.bet) {
    return;
  }

  ensureAudioContext();
  leverState.dragging = true;
  leverState.pointerId = event.pointerId;
  leverState.startY = event.clientY;
  leverState.startPull = leverState.pull;

  clearTimeout(leverState.releaseTimer);
  leverTrackEl.classList.remove("releasing");
  leverHandleEl.classList.add("dragging");
  leverHandleEl.setPointerCapture(event.pointerId);
  leverHintEl.textContent = "Pull deeper to arm the spin";

  event.preventDefault();
}

function onLeverPointerMove(event) {
  if (!leverState.dragging || event.pointerId !== leverState.pointerId) {
    return;
  }

  const deltaY = event.clientY - leverState.startY;
  const nextPull = clamp(leverState.startPull + deltaY / leverTravelPx(), 0, 1);
  setLeverPull(nextPull);

  leverHintEl.textContent = nextPull >= LEVER_TRIGGER
    ? "Release now to fire the reels"
    : "Drag down to spin";
}

function onLeverPointerUp(event) {
  if (!leverState.dragging || event.pointerId !== leverState.pointerId) {
    return;
  }

  leverState.dragging = false;
  leverState.pointerId = -1;

  if (leverHandleEl.hasPointerCapture(event.pointerId)) {
    leverHandleEl.releasePointerCapture(event.pointerId);
  }

  leverHandleEl.classList.remove("dragging");

  const armed = leverState.pull >= LEVER_TRIGGER;
  setLeverPull(0, true);

  if (armed && !leverLocked() && state.balance >= state.bet) {
    state.autoSpin = false;
    state.stopRequested = false;
    spin();
  } else if (state.balance < state.bet) {
    setResult("Insufficient VC. Even satire runs on prepaid tokens.", "loss");
    playLossSound();
    syncUI();
  }
}

function leverTravelPx() {
  const raw = getComputedStyle(leverTrackEl).getPropertyValue("--lever-travel").trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 132;
}

function leverLocked() {
  return state.isSpinning || state.autoSpin;
}

function setLeverPull(nextPull, releasing = false) {
  leverState.pull = clamp(nextPull, 0, 1);
  leverTrackEl.style.setProperty("--lever-pull", leverState.pull.toFixed(3));

  if (releasing) {
    clearTimeout(leverState.releaseTimer);
    leverTrackEl.classList.add("releasing");
    leverState.releaseTimer = setTimeout(() => {
      leverTrackEl.classList.remove("releasing");
    }, 280);
  }
}

function animateLeverThrow() {
  if (leverState.dragging) {
    return;
  }

  setLeverPull(0.95, true);
  setTimeout(() => setLeverPull(0, true), 140);
}

function buildReels() {
  const cycles = 13;

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
    const cellHeight = reelStates[index].cellHeight || 76;
    reelStates[index].offset = mod(reelStates[index].offset, SYMBOLS.length);
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
    setResult("Insufficient VC. Even satire runs on prepaid tokens.", "loss");
    playLossSound();
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

  const baseDuration = 1220 + Math.round(Math.random() * 120);
  const reelDurations = [baseDuration, baseDuration + 360, baseDuration + 820];
  const thirdHang = THIRD_REEL_HANG_MIN + Math.round(Math.random() * (THIRD_REEL_HANG_MAX - THIRD_REEL_HANG_MIN));
  const totalDuration = reelDurations[2] + thirdHang + 90;

  animateLeverThrow();
  setResult(sample(SPIN_LINES), "info");
  syncUI();

  playLeverPullSound();
  startSpinLoopSound();
  startTensionTone(totalDuration);
  startTensionMeter(totalDuration);

  await Promise.all(targets.map((targetIndex, reelIndex) => spinSingleReel(
    reelIndex,
    targetIndex,
    reelDurations[reelIndex],
    reelIndex === 2 ? thirdHang : 0,
  )));

  stopSpinLoopSound();
  stopTensionTone();
  finishTensionMeter();

  const payoutMeta = calculatePayout(outcomes);
  const storeMultiplier = state.storeBuffs.multi > 0 ? 1.38 : 1;
  const heatMultiplier = state.storeBuffs.streak > 0 ? 1 + state.streakBonus : 1;
  const totalMultiplier = payoutMeta.multiplier * storeMultiplier * heatMultiplier;
  const payout = Math.round(state.bet * totalMultiplier);

  if (payout > 0) {
    const jackpot = payoutMeta.jackpot || totalMultiplier >= 12;
    const newRecord = payout > state.biggestWin;

    state.balance += payout;
    state.biggestWin = Math.max(state.biggestWin, payout);

    if (state.storeBuffs.streak > 0) {
      state.streakWins += 1;
      state.streakBonus = Math.min(0.78, state.streakBonus + 0.12);
    }

    setResult(`${sample(WIN_LINES)} ${payoutMeta.label}: +${fmtVc(payout)} (${totalMultiplier.toFixed(2)}x).`, "win");
    showMultiplierPop(`${totalMultiplier.toFixed(2)}x`);
    triggerWinFX({ payout, multiplier: totalMultiplier, jackpot });

    pushWinLog({
      emoji: jackpot ? "👑" : totalMultiplier >= 7 ? "💥" : "🪙",
      amount: payout,
      text: `${payoutMeta.label} paid +${fmtVc(payout)} (${totalMultiplier.toFixed(2)}x).`,
    });

    if (newRecord) {
      triggerBigWinShowcase(payout, totalMultiplier);
      pushWinLog({
        emoji: "🎆",
        amount: payout,
        text: `New biggest win registered at ${fmtVc(payout)}.`,
      });
    }
  } else {
    state.streakWins = 0;
    if (state.storeBuffs.streak > 0) {
      state.streakBonus = Math.max(0, state.streakBonus - 0.22);
    } else {
      state.streakBonus = 0;
    }

    if (state.storeBuffs.refund > 0) {
      const refund = Math.round(state.bet * 0.42);
      state.balance += refund;
      setResult(`No line. Token Refund returned +${fmtVc(refund)} to keep the satire solvent.`, "info");
      showMultiplierPop("Refund +42%");
      playCoinClinks(refund, 4);
      pushWinLog({
        emoji: "🧯",
        amount: refund,
        text: `Token Refund rescued +${fmtVc(refund)}.`,
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
    }, 120);
  }
}

function spinSingleReel(reelIndex, targetIndex, durationMs, hangMs = 0) {
  return new Promise((resolve) => {
    const strip = reelStrips[reelIndex];
    const reelWindow = reelWindows[reelIndex];
    const cellHeight = reelStates[reelIndex].cellHeight || 76;
    const cycleHeight = SYMBOLS.length * cellHeight;
    const currentOffsetPx = reelStates[reelIndex].offset * cellHeight;

    const extraLoops = 8 + reelIndex * 2 + Math.floor(Math.random() * 2);
    const travelSymbols = extraLoops * SYMBOLS.length + targetIndex;
    const targetPx = currentOffsetPx + travelSymbols * cellHeight;

    reelWindow.classList.add("spinning");

    let arrived = false;
    const finish = () => {
      reelWindow.classList.remove("spinning", "hanging");
      resolve();
    };

    const lockAndFinish = () => {
      lockReel(reelIndex);
      finish();
    };

    const settleOffset = () => {
      const normalizedPx = mod(targetPx, cycleHeight);
      reelStates[reelIndex].offset = mod(Math.round(normalizedPx / cellHeight), SYMBOLS.length);
      setStripPosition(reelIndex, normalizedPx, 0, "linear");
    };

    const arrive = () => {
      if (arrived) {
        return;
      }
      arrived = true;

      strip.removeEventListener("transitionend", arrive);
      settleOffset();

      if (hangMs > 0) {
        reelWindow.classList.add("hanging");
        playThirdReelHangTone(hangMs);
        setTimeout(() => {
          reelWindow.classList.remove("hanging");
          lockAndFinish();
        }, hangMs);
        return;
      }

      lockAndFinish();
    };

    strip.addEventListener("transitionend", arrive, { once: true });
    setStripPosition(reelIndex, targetPx, durationMs, "cubic-bezier(0.11, 0.79, 0.22, 1)");

    setTimeout(arrive, durationMs + 80);
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
    adjustedWeight: boosted.has(symbol.id) ? symbol.weight * 1.48 : symbol.weight,
  }));
}

function pickWeighted(symbols) {
  const totalWeight = symbols.reduce((sum, symbol) => sum + (symbol.adjustedWeight || symbol.weight), 0);
  let roll = Math.random() * totalWeight;

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

  ids.forEach((id) => {
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  const special = SPECIAL_COMBO.ids.every((id) => ids.includes(id));
  if (special) {
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
      multiplier: 0.4,
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
    setResult(`Not enough VC for ${item.name}. Even parody has a budget.`, "loss");
    playLossSound();
    return;
  }

  state.balance -= item.cost;
  state.storeBuffs[item.id] += item.duration;

  if (item.id === "streak") {
    state.streakBonus = 0;
    state.streakWins = 0;
  }

  setResult(`${item.name} loaded for ${item.duration} pulls. Probability now wearing cologne.`, "info");
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
    button.innerHTML = `<strong>${item.name}</strong><small>${fmtVc(item.cost)} | ${item.description}</small><small>${left > 0 ? `${left} pull${left === 1 ? "" : "s"} remaining` : "Inactive"}</small>`;
  });

  storeStatusEl.textContent = buffSummary();
}

function renderPayoutRules() {
  payoutListEl.innerHTML = "";

  SYMBOLS.forEach((symbol) => {
    const line = document.createElement("li");
    line.textContent = `${symbol.emoji} ${symbol.name}: pair x${symbol.pair.toFixed(1)}, triple x${symbol.triple.toFixed(1)}`;
    payoutListEl.appendChild(line);
  });

  const special = document.createElement("li");
  special.textContent = `${SPECIAL_COMBO.label} (${SPECIAL_COMBO.ids.map((id) => SYMBOLS[symbolIndex.get(id)].emoji).join(" + ")}): x${SPECIAL_COMBO.multiplier.toFixed(1)} jackpot`;
  payoutListEl.appendChild(special);

  const drip = document.createElement("li");
  drip.textContent = "Any 🪙 on a miss: x0.4 VC drip consolation.";
  payoutListEl.appendChild(drip);

  const perk = document.createElement("li");
  perk.textContent = "Store perks stack on top of the base multiplier.";
  payoutListEl.appendChild(perk);
}

function triggerWinFX({ payout, multiplier, jackpot }) {
  triggerShake();
  pulseFlash();

  if (jackpot) {
    spawnConfetti(220);
    spawnFireworks(9);
    playJackpotFanfare();
    return;
  }

  spawnConfetti(multiplier >= 6 ? 150 : 90);
  if (multiplier >= 6) {
    spawnFireworks(4);
  }
  playCoinClinks(payout, clamp(Math.round(multiplier), 3, 10));
}

function triggerBigWinShowcase(payout, multiplier) {
  bigWinShowcaseValueEl.textContent = fmtVc(payout);
  bigWinShowcaseMultEl.textContent = `x${multiplier.toFixed(2)}`;
  bigWinShowcaseEl.classList.remove("show");
  void bigWinShowcaseEl.offsetWidth;
  bigWinShowcaseEl.classList.add("show");
  showMultiplierPop(`Record x${multiplier.toFixed(2)}`);
}

function pushWinLog(entry) {
  if (entry.amount <= 0) {
    return;
  }

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
    const line = document.createElement("li");
    line.textContent = "🛰️ No gains yet. The house AI is still profiling your optimism.";
    winLogEl.appendChild(line);
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
  setResult(`Bet set to ${fmtVc(nextBet)}. Throughput over prudence remains policy.`, "info");
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

  startAutoEl.disabled = state.isSpinning || state.autoSpin || state.balance < state.bet;
  stopAutoEl.disabled = !state.autoSpin && !state.isSpinning;

  autoStatusEl.textContent = state.autoSpin
    ? "Autospin active. House AI controls pacing."
    : state.stopRequested
      ? "Autospin stopped. Manual control restored."
      : "Manual mode armed.";

  const lockLever = leverLocked() || state.balance < state.bet;
  leverHandleEl.disabled = lockLever;
  leverHandleEl.classList.toggle("disabled", lockLever);
  leverHandleEl.setAttribute("aria-disabled", String(lockLever));

  if (!leverState.dragging) {
    if (state.autoSpin) {
      leverHintEl.textContent = "Autospin is driving the lever.";
    } else if (state.isSpinning) {
      leverHintEl.textContent = "Reels in motion...";
    } else if (state.balance < state.bet) {
      leverHintEl.textContent = "Top up VC or lower the bet";
    } else {
      leverHintEl.textContent = "Drag down to spin";
    }
  }

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

  const started = performance.now();
  const total = Math.max(600, durationMs);
  tensionFillEl.style.width = "0%";
  tensionTextEl.textContent = "Charging";

  const tick = () => {
    const elapsed = performance.now() - started;
    const progress = clamp(elapsed / total, 0, 1);
    tensionFillEl.style.width = `${(progress * 100).toFixed(1)}%`;
    tensionTextEl.textContent = progress >= 1 ? "Locked" : `Panic ${Math.round(progress * 100)}%`;

    if (progress >= 1) {
      clearInterval(tensionMeterTimer);
      tensionMeterTimer = 0;
    }
  };

  tick();
  tensionMeterTimer = setInterval(tick, 32);
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

function spawnConfetti(count) {
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.setProperty("--x", `${Math.random() * 100}%`);
    piece.style.setProperty("--h", `${Math.floor(Math.random() * 360)}`);
    piece.style.setProperty("--rot", `${Math.floor(Math.random() * 360)}deg`);
    piece.style.setProperty("--dur", `${1.1 + Math.random() * 1.3}s`);
    confettiLayerEl.appendChild(piece);
    setTimeout(() => piece.remove(), 2500);
  }
}

function spawnFireworks(count) {
  for (let i = 0; i < count; i += 1) {
    const burst = document.createElement("span");
    burst.className = "firework";
    burst.style.setProperty("--x", `${10 + Math.random() * 80}%`);
    burst.style.setProperty("--y", `${8 + Math.random() * 70}%`);
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

function ensureAudioContext() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.24;

      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.86;

      masterGain.connect(compressor);
      compressor.connect(audioCtx.destination);

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

  for (let index = 0; index < length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
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
  band.frequency.setValueAtTime(1000, now);
  band.frequency.exponentialRampToValueAtTime(140, now + 0.35);
  band.Q.value = 0.8;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

  pullNoise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(masterGain);
  pullNoise.start(now);
  pullNoise.stop(now + 0.37);

  const thunk = audioCtx.createOscillator();
  thunk.type = "triangle";
  thunk.frequency.setValueAtTime(220, now);
  thunk.frequency.exponentialRampToValueAtTime(76, now + 0.26);

  const thunkGain = audioCtx.createGain();
  thunkGain.gain.setValueAtTime(0.0001, now);
  thunkGain.gain.exponentialRampToValueAtTime(0.095, now + 0.02);
  thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

  thunk.connect(thunkGain);
  thunkGain.connect(masterGain);
  thunk.start(now);
  thunk.stop(now + 0.31);
}

function startSpinLoopSound() {
  if (!audioCtx || !masterGain || !noiseBuffer) {
    return;
  }

  stopSpinLoopSound();

  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.075, now + 0.18);

  const rumble = audioCtx.createOscillator();
  rumble.type = "sawtooth";
  rumble.frequency.value = 88;

  const rumbleGain = audioCtx.createGain();
  rumbleGain.gain.value = 0.05;

  const sub = audioCtx.createOscillator();
  sub.type = "triangle";
  sub.frequency.value = 44;

  const subGain = audioCtx.createGain();
  subGain.gain.value = 0.038;

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1500;
  filter.Q.value = 0.62;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.022;

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
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

  rumble.stop(now + 0.21);
  sub.stop(now + 0.21);
  noise.stop(now + 0.21);

  spinLoopNodes = null;
}

function playReelStopClick(index) {
  if (!audioCtx || !masterGain) {
    return;
  }

  const now = audioCtx.currentTime + index * 0.006;

  const click = audioCtx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(2100 + index * 110, now);

  const clickGain = audioCtx.createGain();
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.exponentialRampToValueAtTime(0.052, now + 0.004);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  click.connect(clickGain);
  clickGain.connect(masterGain);
  click.start(now);
  click.stop(now + 0.05);

  const thud = audioCtx.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(196 - index * 12, now);
  thud.frequency.exponentialRampToValueAtTime(120, now + 0.08);

  const thudGain = audioCtx.createGain();
  thudGain.gain.setValueAtTime(0.0001, now);
  thudGain.gain.exponentialRampToValueAtTime(0.086, now + 0.012);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  thud.connect(thudGain);
  thudGain.connect(masterGain);
  thud.start(now);
  thud.stop(now + 0.1);
}

function startTensionTone(durationMs) {
  stopTensionTone();

  const started = performance.now();
  tensionToneTimer = setInterval(() => {
    const elapsed = performance.now() - started;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const freq = 250 + progress * 620;

    playTone(freq, 0.05, "triangle", 0.038);

    if (progress >= 1) {
      stopTensionTone();
    }
  }, 120);
}

function playThirdReelHangTone(hangMs) {
  if (!audioCtx || !masterGain) {
    return;
  }

  const ticks = clamp(Math.round(hangMs / 150), 2, 5);

  for (let index = 0; index < ticks; index += 1) {
    const freq = 420 + index * 120;
    const delay = index * 0.12;
    playTone(freq, 0.045, "triangle", 0.032, delay);
  }
}

function stopTensionTone() {
  clearInterval(tensionToneTimer);
  tensionToneTimer = 0;
}

function playCoinClinks(amount, countHint = 4) {
  if (!audioCtx || !masterGain) {
    return;
  }

  const count = clamp(countHint + Math.floor(amount / 650), 3, 12);

  for (let index = 0; index < count; index += 1) {
    const delay = index * (0.052 + Math.random() * 0.03);
    const freq = 1080 + Math.random() * 920;
    const when = audioCtx.currentTime + delay;

    const ping = audioCtx.createOscillator();
    ping.type = "triangle";
    ping.frequency.setValueAtTime(freq, when);
    ping.frequency.exponentialRampToValueAtTime(freq * 0.62, when + 0.09);

    const pingGain = audioCtx.createGain();
    pingGain.gain.setValueAtTime(0.0001, when);
    pingGain.gain.exponentialRampToValueAtTime(0.06, when + 0.008);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);

    ping.connect(pingGain);
    pingGain.connect(masterGain);
    ping.start(when);
    ping.stop(when + 0.14);
  }
}

function playJackpotFanfare() {
  if (!audioCtx || !masterGain) {
    return;
  }

  const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];

  notes.forEach((freq, index) => {
    const when = audioCtx.currentTime + index * 0.1;

    const lead = audioCtx.createOscillator();
    lead.type = "sawtooth";
    lead.frequency.setValueAtTime(freq, when);

    const low = audioCtx.createOscillator();
    low.type = "triangle";
    low.frequency.setValueAtTime(freq * 0.5, when);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.084, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);

    lead.connect(gain);
    low.connect(gain);
    gain.connect(masterGain);

    lead.start(when);
    low.start(when);
    lead.stop(when + 0.22);
    low.stop(when + 0.22);
  });

  playCoinClinks(2600, 10);
}

function playLossSound() {
  playTone(150, 0.12, "sawtooth", 0.05);
  playTone(92, 0.14, "triangle", 0.038, 0.02);
}

function playStorePurchaseSound() {
  playTone(380, 0.06, "triangle", 0.05);
  playTone(560, 0.08, "triangle", 0.06, 0.05);
}

function playDailyGrantSound() {
  playTone(420, 0.08, "triangle", 0.06);
  playTone(620, 0.1, "triangle", 0.07, 0.07);
  playCoinClinks(DAILY_GRANT, 4);
}

function playTone(frequency, seconds, type, gainLevel, delay = 0) {
  if (!audioCtx || !masterGain) {
    return;
  }

  const when = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(gainLevel, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(when);
  osc.stop(when + seconds + 0.02);
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
    state.streakBonus = clamp(asNumber(parsed.streakBonus, 0), 0, 0.78);

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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mod(value, base) {
  return ((value % base) + base) % base;
}
