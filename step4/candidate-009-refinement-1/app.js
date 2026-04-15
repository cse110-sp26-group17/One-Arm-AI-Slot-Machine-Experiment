const STORAGE_KEY = "vegas-ai-mock-slot-v3";
const DAILY_GRANT_AMOUNT = 1200;
const MAX_LOG_ITEMS = 28;
const MAX_STREAK_BONUS = 0.42;
const STREAK_STEP = 0.07;
const MAX_LUCKY_CHARGE = 0.78;
const LUCKY_GAIN_PER_LOSS = 0.09;
const TENSION_COOLDOWN_MS = 320;
const BET_OPTIONS = [25, 50, 100, 250, 500];

const MACHINE = {
  symbols: ["🤖", "🧠", "🪙", "📉", "🧾", "🔥", "404", "💎", "🎰"],
  weights: [13, 12, 15, 11, 10, 8, 7, 4, 3],
  triples: {
    "🤖": 6,
    "🧠": 7,
    "🪙": 5,
    "📉": 8,
    "🧾": 9,
    "🔥": 12,
    "404": 11,
    "💎": 18,
    "🎰": 24,
  },
  pairMultiplier: 2.15,
  machineBonus: 0.05,
};

const STORE_ITEMS = {
  luckyChance: {
    id: "luckyChance",
    emoji: "🎲",
    name: "Lucky Chance",
    cost: 460,
    spins: 12,
    luckBoost: 0.16,
    payoutBoost: 0,
    refundRate: 0,
    streakHeatBoost: 0,
    description: "Pushes RNG toward premium symbols. Purely accidental math.",
  },
  streakHeat: {
    id: "streakHeat",
    emoji: "🔥",
    name: "Streak Heat",
    cost: 540,
    spins: 10,
    luckBoost: 0,
    payoutBoost: 0,
    refundRate: 0,
    streakHeatBoost: 0.14,
    description: "Keeps your streak alive when the AI confidently whiffs.",
  },
  multiplierFuel: {
    id: "multiplierFuel",
    emoji: "⚡",
    name: "Multiplier Fuel",
    cost: 680,
    spins: 8,
    luckBoost: 0,
    payoutBoost: 0.24,
    refundRate: 0,
    streakHeatBoost: 0,
    description: "Adds payout voltage. Compliance calls it user engagement.",
  },
  refundFirewall: {
    id: "refundFirewall",
    emoji: "🧯",
    name: "Refund Firewall",
    cost: 520,
    spins: 12,
    luckBoost: 0,
    payoutBoost: 0,
    refundRate: 0.4,
    streakHeatBoost: 0,
    description: "Partial rollback on losses. Prompt failure insurance.",
  },
};

const SPIN_START_QUIPS = [
  "Lever pulled. Routing {bet} VC into the confidence black hole.",
  "Deploying {bet} VC to train the house model on your pain.",
  "Token burn initiated: {bet} VC for premium uncertainty.",
];

const WIN_QUIPS = [
  "{label} landed. AI called it strategy. You banked +{payout} VC at x{mult}.",
  "The model hallucinated alpha. {label} pays +{payout} VC at x{mult}.",
  "Prompt reached production. {label} sends +{payout} VC at x{mult}.",
];

const LOSS_QUIPS = [
  "Model output: confidently wrong. House absorbs {loss} VC.",
  "Inference complete: your bankroll donated {loss} VC to GPU overhead.",
  "The AI said 'trust me'. It cost {loss} VC.",
];

const LOSS_REFUND_QUIPS = [
  "Bad spin, decent rollback. Net hit {loss} VC after refund patch.",
  "RNG betrayed you, firewall refunded dignity. Net {loss} VC.",
  "Token spill detected. Refund routine softened damage to {loss} VC.",
];

const PURCHASE_QUIPS = [
  "{perk} armed. Totally legitimate edge acquired.",
  "{perk} loaded. The house calls this retention optimization.",
  "{perk} purchased. Ethics review scheduled for never.",
];

const DEFAULT_STATE = {
  balance: 6000,
  currentBet: 100,
  spins: 0,
  wins: 0,
  losses: 0,
  totalSpent: 0,
  totalWon: 0,
  biggestWin: 0,
  winStreak: 0,
  luckyCharge: 0,
  lastDailyClaim: "",
  lastResult: "Pull the lever. Roast the model. Burn tokens responsibly-ish.",
  resultTone: "neutral",
  lastSymbols: ["🤖", "🪙", "📉"],
  isSpinning: false,
  autoSpin: false,
  autoSpinStopRequested: false,
  spinProgress: 0,
  storeBuffs: {
    luckyChance: 0,
    streakHeat: 0,
    multiplierFuel: 0,
    refundFirewall: 0,
  },
  winLog: [],
};

const state = loadState();

const reels = Array.from({ length: 3 }, (_, index) => ({
  column: document.getElementById(`reelCol${index}`),
  window: document.querySelector(`#reelCol${index} .reel-window`),
  track: document.getElementById(`reelTrack${index}`),
}));

const elements = {
  appShell: document.getElementById("appShell"),
  machineShell: document.getElementById("machineShell"),
  balanceValue: document.getElementById("balanceValue"),
  biggestWinValue: document.getElementById("biggestWinValue"),
  biggestWinShowcase: document.getElementById("biggestWinShowcase"),
  edgeValue: document.getElementById("edgeValue"),
  resultText: document.getElementById("resultText"),
  tensionBar: document.getElementById("tensionBar"),
  tensionValue: document.getElementById("tensionValue"),
  spinButton: document.getElementById("spinButton"),
  autospinButton: document.getElementById("autospinButton"),
  stopButton: document.getElementById("stopButton"),
  dailyGrantButton: document.getElementById("dailyGrantButton"),
  betButtons: [...document.querySelectorAll(".bet-button")],
  storeGrid: document.getElementById("storeGrid"),
  storeStatus: document.getElementById("storeStatus"),
  rulesList: document.getElementById("rulesList"),
  logList: document.getElementById("logList"),
  flashFx: document.getElementById("flashFx"),
  confettiLayer: document.getElementById("confettiLayer"),
  globalConfettiLayer: document.getElementById("globalConfettiLayer"),
  fireworksLayer: document.getElementById("fireworksLayer"),
  multiplierLayer: document.getElementById("multiplierLayer"),
  biggestWinBanner: document.getElementById("biggestWinBanner"),
  biggestWinHeadline: document.getElementById("biggestWinHeadline"),
  biggestWinSub: document.getElementById("biggestWinSub"),
};

buildStoreButtons();
bindEvents();
bootstrapReels();
renderRules();
renderAll();
setInterval(() => renderDailyGrantState(), 1000);

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function bindEvents() {
  elements.spinButton.addEventListener("click", () => {
    spinOnce();
  });

  elements.autospinButton.addEventListener("click", () => {
    if (state.autoSpin) {
      stopAutoSpin();
      return;
    }
    startAutoSpin();
  });

  elements.stopButton.addEventListener("click", stopAutoSpin);
  elements.dailyGrantButton.addEventListener("click", claimDailyGrant);

  elements.betButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.isSpinning || state.autoSpin) {
        return;
      }

      const bet = Number(button.dataset.bet);
      if (!BET_OPTIONS.includes(bet)) {
        return;
      }

      state.currentBet = bet;
      setStatus(`Bet rerouted to ${formatNumber(bet)} VC. The house thanks your optimism.`, "neutral");
      renderAll();
      persist();
    });
  });

  elements.storeGrid.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-store-item]");
    if (!target || state.isSpinning || state.autoSpin) {
      return;
    }

    purchaseStoreItem(target.dataset.storeItem);
  });
}

function buildStoreButtons() {
  elements.storeGrid.innerHTML = "";

  Object.values(STORE_ITEMS).forEach((item) => {
    const button = document.createElement("button");
    button.className = "store-button";
    button.type = "button";
    button.dataset.storeItem = item.id;
    button.innerHTML = `
      <span>${item.emoji} ${item.name}</span>
      <small class="store-line">${formatNumber(item.cost)} VC · ${item.description}</small>
      <em class="store-remaining" data-remaining-for="${item.id}">${item.spins} spins per buy</em>
    `;
    elements.storeGrid.appendChild(button);
  });
}

function bootstrapReels() {
  reels.forEach((reel, index) => {
    const symbol = state.lastSymbols[index] || MACHINE.symbols[index] || "🤖";
    renderStaticSymbol(reel.track, symbol);
  });
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return cloneDefaultState();
  }

  try {
    const parsed = JSON.parse(saved);
    const merged = {
      ...cloneDefaultState(),
      ...parsed,
      storeBuffs: {
        ...cloneDefaultState().storeBuffs,
        ...(parsed.storeBuffs || {}),
      },
    };

    if (!BET_OPTIONS.includes(merged.currentBet)) {
      merged.currentBet = 100;
    }

    if (!Array.isArray(merged.lastSymbols) || merged.lastSymbols.length !== 3) {
      merged.lastSymbols = [...DEFAULT_STATE.lastSymbols];
    }

    if (!Array.isArray(merged.winLog)) {
      merged.winLog = [];
    }

    merged.spinProgress = Number.isFinite(merged.spinProgress) ? merged.spinProgress : 0;
    merged.machineIndex = 0;
    merged.isSpinning = false;
    merged.autoSpin = false;
    merged.autoSpinStopRequested = false;
    merged.resultTone = ["neutral", "win", "loss"].includes(merged.resultTone)
      ? merged.resultTone
      : "neutral";

    return merged;
  } catch {
    const fallback = cloneDefaultState();
    fallback.lastResult = "State data corrupted. Session reset by the house auditor.";
    return fallback;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getStoreBuffSpins(itemId) {
  return Math.max(0, Number(state.storeBuffs[itemId]) || 0);
}

function getStoreLuckBonus() {
  return getStoreBuffSpins("luckyChance") > 0 ? STORE_ITEMS.luckyChance.luckBoost : 0;
}

function getStoreStreakHeatBonus() {
  return getStoreBuffSpins("streakHeat") > 0 ? STORE_ITEMS.streakHeat.streakHeatBoost : 0;
}

function getStorePayoutBonus() {
  return getStoreBuffSpins("multiplierFuel") > 0 ? STORE_ITEMS.multiplierFuel.payoutBoost : 0;
}

function getStoreRefundRate() {
  return getStoreBuffSpins("refundFirewall") > 0 ? STORE_ITEMS.refundFirewall.refundRate : 0;
}

function getPerkMultiplier() {
  const streakBonus = Math.min(state.winStreak * STREAK_STEP, MAX_STREAK_BONUS);
  const luckyBonus = Math.min(state.luckyCharge, MAX_LUCKY_CHARGE);
  const payoutBonus = getStorePayoutBonus();
  const streakHeat = getStoreStreakHeatBonus();
  return 1 + MACHINE.machineBonus + streakBonus + luckyBonus + payoutBonus + streakHeat;
}

function getActiveStoreBuffSummary() {
  const parts = [];

  Object.values(STORE_ITEMS).forEach((item) => {
    const remaining = getStoreBuffSpins(item.id);
    if (remaining > 0) {
      parts.push(`${item.name} ${remaining}`);
    }
  });

  return parts.length ? parts.join(" • ") : "None";
}

function consumeStoreBuffSpin() {
  Object.keys(state.storeBuffs).forEach((id) => {
    if (getStoreBuffSpins(id) > 0) {
      state.storeBuffs[id] = getStoreBuffSpins(id) - 1;
    }
  });
}

function setStatus(text, tone = "neutral") {
  state.lastResult = text;
  state.resultTone = tone;
}

function setSpinProgress(progress) {
  const clamped = Math.max(0, Math.min(100, progress));
  state.spinProgress = clamped;
  elements.tensionBar.style.width = `${clamped}%`;
  elements.tensionValue.textContent = `${Math.round(clamped)}%`;
}

function renderAll() {
  elements.balanceValue.textContent = formatVc(state.balance);
  elements.biggestWinValue.textContent = formatVc(state.biggestWin);
  elements.biggestWinShowcase.textContent = `+${formatNumber(state.biggestWin)} VC`;
  elements.edgeValue.textContent = `x${getPerkMultiplier().toFixed(2)}`;
  elements.resultText.textContent = state.lastResult;
  elements.resultText.dataset.tone = state.resultTone;

  elements.spinButton.disabled = state.isSpinning || state.autoSpin || state.balance < state.currentBet;
  elements.autospinButton.disabled = state.isSpinning || state.balance < state.currentBet;
  elements.autospinButton.textContent = state.autoSpin ? "Autospin Running" : "Start Autospin";
  elements.stopButton.disabled = !state.autoSpin;

  elements.betButtons.forEach((button) => {
    const isActive = Number(button.dataset.bet) === state.currentBet;
    button.classList.toggle("active", isActive);
    button.disabled = state.isSpinning || state.autoSpin;
  });

  renderStore();
  renderDailyGrantState();
  renderLog();
  setSpinProgress(state.spinProgress);
}

function renderStore() {
  const activeSummary = getActiveStoreBuffSummary();
  const refundRate = Math.round(getStoreRefundRate() * 100);
  const luckyCharge = Math.round(state.luckyCharge * 100);

  elements.storeStatus.textContent = activeSummary === "None"
    ? "No perks armed. The house AI appreciates your honesty."
    : `Active: ${activeSummary}${refundRate ? ` • Refund ${refundRate}%` : ""} • Lucky Charge ${luckyCharge}%`;

  Object.values(STORE_ITEMS).forEach((item) => {
    const button = elements.storeGrid.querySelector(`[data-store-item="${item.id}"]`);
    if (!button) {
      return;
    }

    const remaining = getStoreBuffSpins(item.id);
    button.classList.toggle("active-buff", remaining > 0);
    button.disabled = state.isSpinning || state.autoSpin || state.balance < item.cost;

    const remainingLabel = button.querySelector(`[data-remaining-for="${item.id}"]`);
    if (remainingLabel) {
      remainingLabel.textContent = remaining > 0
        ? `${remaining} spins live`
        : `${item.spins} spins per buy`;
    }
  });
}

function renderDailyGrantState() {
  if (canClaimDaily()) {
    elements.dailyGrantButton.disabled = false;
    elements.dailyGrantButton.textContent = `Claim Daily +${formatNumber(DAILY_GRANT_AMOUNT)} VC`;
    return;
  }

  const waitMs = msUntilNextLocalDay();
  elements.dailyGrantButton.disabled = true;
  elements.dailyGrantButton.textContent = `Next Daily In ${formatDuration(waitMs)}`;
}

function renderLog() {
  elements.logList.innerHTML = "";

  if (!state.winLog.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "No gains yet. The machine is currently in smug mode.";
    elements.logList.appendChild(item);
    return;
  }

  state.winLog.forEach((entry) => {
    const item = document.createElement("li");
    const time = new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    item.innerHTML = `
      <span class="log-emoji">${entry.emoji}</span>
      <div class="log-copy">
        <strong>+${formatNumber(entry.amount)} VC</strong>
        <p>${entry.label}${entry.multiplier ? ` • x${entry.multiplier.toFixed(2)}` : ""}</p>
      </div>
      <span class="log-time">${time}</span>
    `;

    elements.logList.appendChild(item);
  });
}

function renderRules() {
  elements.rulesList.innerHTML = "";

  const bestTriples = Object.entries(MACHINE.triples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([symbol, multiplier]) => `3x ${symbol} = x${multiplier.toFixed(2)} base payout`);

  const rows = [
    ...bestTriples,
    `Any pair = x${MACHINE.pairMultiplier.toFixed(2)} base payout`,
    `House machine edge bonus = +${Math.round(MACHINE.machineBonus * 100)}%`,
    "Streak bonus = +7% per consecutive win (max +42%)",
    "Lucky Charge = +9% after each loss (max +78%)",
    "Store perks: Lucky Chance, Streak Heat, Multiplier Fuel, Refund Firewall",
  ];

  rows.forEach((row) => {
    const li = document.createElement("li");
    li.textContent = row;
    elements.rulesList.appendChild(li);
  });
}

let tensionAnimationFrame = 0;
function animateSpinTension(durationMs) {
  if (tensionAnimationFrame) {
    cancelAnimationFrame(tensionAnimationFrame);
    tensionAnimationFrame = 0;
  }

  const start = performance.now();

  const tick = (now) => {
    const progress = ((now - start) / durationMs) * 100;
    setSpinProgress(progress);

    if (state.isSpinning && progress < 100) {
      tensionAnimationFrame = requestAnimationFrame(tick);
    } else {
      tensionAnimationFrame = 0;
    }
  };

  tensionAnimationFrame = requestAnimationFrame(tick);

  return () => {
    if (tensionAnimationFrame) {
      cancelAnimationFrame(tensionAnimationFrame);
      tensionAnimationFrame = 0;
    }
    setSpinProgress(100);
  };
}

async function spinOnce() {
  if (state.isSpinning) {
    return false;
  }

  if (state.balance < state.currentBet) {
    setStatus("Insufficient VC for this bet. Claim daily VC or lower the burn rate.", "loss");
    renderAll();
    persist();
    return false;
  }

  state.isSpinning = true;
  state.spinProgress = 0;
  state.spins += 1;
  state.totalSpent += state.currentBet;
  state.balance -= state.currentBet;

  setStatus(
    pickRandom(SPIN_START_QUIPS).replace("{bet}", formatNumber(state.currentBet)),
    "neutral"
  );

  elements.machineShell.classList.add("spinning");
  renderAll();
  persist();

  const finalSymbols = reels.map(() => sampleWeightedSymbol());
  const reelDurations = reels.map((_, index) => 1500 + index * 360 + Math.floor(Math.random() * 140));
  const reelDelayStep = 80;
  const totalSpinDuration = reelDurations[reelDurations.length - 1] + reelDelayStep * (reels.length - 1);

  triggerFlash();
  screenShake(5, 240);
  playLeverPull();

  const stopSpinBed = playReelSpinBed(totalSpinDuration + 240);
  const stopTicks = playSpinTickLoop(totalSpinDuration + 200);
  const stopTensionAudio = playTensionRamp(totalSpinDuration + 280);
  const stopTensionBar = animateSpinTension(totalSpinDuration + 120);

  const landedSymbols = await Promise.all(
    reels.map((reel, index) =>
      animateReelToSymbol(
        reel,
        index,
        finalSymbols[index],
        reelDurations[index],
        index * reelDelayStep
      )
    )
  );

  stopSpinBed();
  stopTicks();
  stopTensionAudio();
  stopTensionBar();

  state.lastSymbols = landedSymbols;

  const outcome = scoreSpin(landedSymbols);
  let refund = 0;

  if (outcome.payout > 0) {
    state.balance += outcome.payout;
    state.totalWon += outcome.payout;
    state.wins += 1;
    state.winStreak += 1;
    state.luckyCharge = 0;

    setStatus(
      pickRandom(WIN_QUIPS)
        .replace("{label}", outcome.label)
        .replace("{payout}", formatNumber(outcome.payout))
        .replace("{mult}", outcome.finalMultiplier.toFixed(2)),
      "win"
    );

    triggerWinFx(outcome.finalMultiplier, outcome.isJackpot);

    addGainLogEntry({
      emoji: outcome.isJackpot ? "🎇" : "🤑",
      amount: outcome.payout,
      label: `${outcome.label} • ${landedSymbols.join(" ")}`,
      multiplier: outcome.finalMultiplier,
      ts: Date.now(),
    });

    if (outcome.payout > state.biggestWin) {
      state.biggestWin = outcome.payout;
      showBiggestWinBanner(outcome.payout, outcome.finalMultiplier);
      burstFireworks(outcome.isJackpot ? 44 : 30);
    }
  } else {
    state.losses += 1;

    if (getStoreBuffSpins("streakHeat") > 0) {
      state.winStreak = Math.max(0, state.winStreak - 1);
    } else {
      state.winStreak = 0;
    }

    state.luckyCharge = Math.min(MAX_LUCKY_CHARGE, state.luckyCharge + LUCKY_GAIN_PER_LOSS);

    const refundRate = getStoreRefundRate();
    if (refundRate > 0) {
      refund = Math.floor(state.currentBet * refundRate);
      state.balance += refund;
      state.totalWon += refund;

      addGainLogEntry({
        emoji: "🧯",
        amount: refund,
        label: "Refund Firewall rebate",
        multiplier: null,
        ts: Date.now(),
      });
    }

    const netLoss = state.currentBet - refund;

    if (refund > 0) {
      setStatus(
        pickRandom(LOSS_REFUND_QUIPS)
          .replace("{loss}", formatNumber(netLoss)),
        "loss"
      );
    } else {
      setStatus(
        pickRandom(LOSS_QUIPS)
          .replace("{loss}", formatNumber(state.currentBet)),
        "loss"
      );
    }

    triggerLossFx();
  }

  consumeStoreBuffSpin();

  state.isSpinning = false;
  elements.machineShell.classList.remove("spinning");

  if (state.autoSpinStopRequested) {
    state.autoSpin = false;
    state.autoSpinStopRequested = false;
  }

  setTimeout(() => {
    if (!state.isSpinning) {
      state.spinProgress = 0;
      renderAll();
    }
  }, TENSION_COOLDOWN_MS);

  renderAll();
  persist();
  return true;
}

function scoreSpin(symbols) {
  const counts = new Map();
  symbols.forEach((symbol) => {
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  });

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSymbol, topCount] = entries[0];

  let baseMultiplier = 0;
  let label = "No payout.";

  if (topCount === 3) {
    baseMultiplier = MACHINE.triples[topSymbol] || 5;
    label = `Triple ${topSymbol}`;
  } else if (topCount === 2) {
    baseMultiplier = MACHINE.pairMultiplier;
    label = `Pair ${topSymbol}`;
  }

  if (baseMultiplier <= 0) {
    return {
      payout: 0,
      finalMultiplier: 0,
      label,
      isJackpot: false,
    };
  }

  const perkMultiplier = getPerkMultiplier();
  const finalMultiplier = baseMultiplier * perkMultiplier;
  const payout = Math.floor(state.currentBet * finalMultiplier);
  const isJackpot = topCount === 3 && (topSymbol === "💎" || topSymbol === "🎰" || finalMultiplier >= 20);

  return {
    payout,
    finalMultiplier,
    label,
    isJackpot,
  };
}

function buildReelStrip(startSymbol, finalSymbol, randomCount) {
  const strip = [startSymbol];

  for (let i = 0; i < randomCount; i += 1) {
    strip.push(sampleWeightedSymbol());
  }

  strip.push(finalSymbol);
  return strip;
}

function symbolCellHtml(symbol) {
  return `<div class="symbol-cell">${symbol}</div>`;
}

function renderStaticSymbol(track, symbol) {
  track.style.transition = "none";
  track.style.transform = "translate3d(0, 0, 0)";
  track.innerHTML = symbolCellHtml(symbol);
}

function animateReelToSymbol(reel, reelIndex, finalSymbol, durationMs, delayMs) {
  return new Promise((resolve) => {
    const startSymbol = state.lastSymbols[reelIndex] || sampleWeightedSymbol();
    const strip = buildReelStrip(startSymbol, finalSymbol, 20 + reelIndex * 4 + Math.floor(Math.random() * 6));

    reel.track.style.transition = "none";
    reel.track.style.transform = "translate3d(0, 0, 0)";
    reel.track.innerHTML = strip.map((symbol) => symbolCellHtml(symbol)).join("");
    reel.column.classList.remove("lock-hit");

    const cellHeight = reel.window.clientHeight || 96;
    const finalIndex = strip.length - 1;
    const targetY = -finalIndex * cellHeight;

    const begin = () => {
      reel.column.classList.add("is-spinning");
      reel.track.style.transition = `transform ${durationMs}ms cubic-bezier(0.11, 0.78, 0.16, 1)`;
      reel.track.style.transform = `translate3d(0, ${targetY}px, 0)`;
    };

    const startTimer = window.setTimeout(() => {
      requestAnimationFrame(begin);
    }, delayMs);

    let done = false;
    let fallbackTimer = 0;

    const finish = () => {
      if (done) {
        return;
      }

      done = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(fallbackTimer);
      reel.track.removeEventListener("transitionend", onEnd);

      reel.column.classList.remove("is-spinning");
      reel.column.classList.add("lock-hit");
      renderStaticSymbol(reel.track, finalSymbol);
      playReelStopClick(reelIndex);
      screenShake(3 + reelIndex, 130);

      setTimeout(() => {
        reel.column.classList.remove("lock-hit");
      }, 150);

      resolve(finalSymbol);
    };

    const onEnd = (event) => {
      if (event.target !== reel.track || event.propertyName !== "transform") {
        return;
      }
      finish();
    };

    reel.track.addEventListener("transitionend", onEnd);
    fallbackTimer = window.setTimeout(finish, delayMs + durationMs + 120);
  });
}

function sampleWeightedSymbol() {
  const luckBoost = getStoreLuckBonus();

  const adjustedWeights = MACHINE.weights.map((weight, index) => {
    const highTier = index >= MACHINE.weights.length - 3;
    if (!highTier || luckBoost <= 0) {
      return weight;
    }

    return weight * (1 + luckBoost * 2);
  });

  const totalWeight = adjustedWeights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (let index = 0; index < MACHINE.symbols.length; index += 1) {
    roll -= adjustedWeights[index];
    if (roll <= 0) {
      return MACHINE.symbols[index];
    }
  }

  return MACHINE.symbols[MACHINE.symbols.length - 1];
}

async function startAutoSpin() {
  if (state.autoSpin || state.isSpinning) {
    return;
  }

  if (state.balance < state.currentBet) {
    setStatus("Autospin blocked: bankroll too low for this burn rate.", "loss");
    renderAll();
    persist();
    return;
  }

  state.autoSpin = true;
  state.autoSpinStopRequested = false;
  setStatus("Autospin engaged. Delegating your bankroll to an unsupervised agent.", "neutral");
  renderAll();
  persist();

  while (state.autoSpin) {
    const didSpin = await spinOnce();
    if (!didSpin) {
      break;
    }

    if (!state.autoSpin || state.balance < state.currentBet) {
      break;
    }

    await sleep(70);
  }

  state.autoSpin = false;
  state.autoSpinStopRequested = false;

  if (state.balance < state.currentBet) {
    setStatus("Autospin paused: wallet exhausted for current bet.", "loss");
  }

  renderAll();
  persist();
}

function stopAutoSpin() {
  if (!state.autoSpin) {
    return;
  }

  state.autoSpin = false;
  state.autoSpinStopRequested = true;
  setStatus("Autospin stop queued. Current spin will hard-lock and halt.", "neutral");
  renderAll();
  persist();
}

function claimDailyGrant() {
  if (!canClaimDaily()) {
    setStatus("Daily VC already claimed. Come back after local midnight.", "loss");
    renderAll();
    persist();
    return;
  }

  state.balance += DAILY_GRANT_AMOUNT;
  state.lastDailyClaim = getTodayKey();

  setStatus(`Daily stipend injected: +${formatNumber(DAILY_GRANT_AMOUNT)} VC from the venture capital fairy.`, "win");

  addGainLogEntry({
    emoji: "💸",
    amount: DAILY_GRANT_AMOUNT,
    label: "Daily VC stipend",
    multiplier: null,
    ts: Date.now(),
  });

  triggerFlash();
  burstConfetti(18, {
    layer: elements.globalConfettiLayer,
    leftMin: 10,
    leftRange: 80,
    topMin: 0,
    topRange: 10,
    drift: 300,
    drop: Math.max(window.innerHeight * 0.88, 420),
    lifetime: 1080,
  });
  playGrantTone();
  screenShake(4, 220);
  renderAll();
  persist();
}

function purchaseStoreItem(itemId) {
  const item = STORE_ITEMS[itemId];
  if (!item) {
    return;
  }

  if (state.balance < item.cost) {
    setStatus(`Not enough VC for ${item.name}. The model says "insufficient context window".`, "loss");
    renderAll();
    persist();
    return;
  }

  state.balance -= item.cost;
  state.totalSpent += item.cost;
  state.storeBuffs[item.id] = getStoreBuffSpins(item.id) + item.spins;

  setStatus(
    pickRandom(PURCHASE_QUIPS).replace("{perk}", item.name),
    "neutral"
  );

  triggerFlash();
  playStorePurchaseTone();
  renderAll();
  persist();
}

function canClaimDaily() {
  return state.lastDailyClaim !== getTodayKey();
}

function msUntilNextLocalDay() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addGainLogEntry(entry) {
  state.winLog.unshift(entry);

  if (state.winLog.length > MAX_LOG_ITEMS) {
    state.winLog.length = MAX_LOG_ITEMS;
  }
}

function triggerWinFx(multiplier, isJackpot) {
  triggerFlash();

  burstConfetti(32);
  burstConfetti(isJackpot ? 180 : 120, {
    layer: elements.globalConfettiLayer,
    leftMin: 2,
    leftRange: 96,
    topMin: 0,
    topRange: 16,
    drift: 360,
    drop: Math.max(window.innerHeight * 0.94, 460),
    lifetime: 1200,
  });

  burstMultiplier(multiplier);
  screenShake(isJackpot ? 12 : 8, isJackpot ? 420 : 320);

  if (isJackpot) {
    burstFireworks(46);
    playJackpotFanfare();
  } else {
    playCoinClinkBurst(multiplier);
  }
}

function triggerLossFx() {
  screenShake(3, 180);
  playLossTone();
}

function triggerFlash() {
  elements.flashFx.classList.remove("active");
  void elements.flashFx.offsetWidth;
  elements.flashFx.classList.add("active");
}

function burstConfetti(count, options = {}) {
  const {
    layer = elements.confettiLayer,
    leftMin = 12,
    leftRange = 76,
    topMin = 3,
    topRange = 16,
    drift = 260,
    drop = 220,
    lifetime = 980,
  } = options;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "confetti";
    particle.style.left = `${leftMin + Math.random() * leftRange}%`;
    particle.style.top = `${topMin + Math.random() * topRange}%`;
    particle.style.background = `hsl(${Math.floor(16 + Math.random() * 78)} 96% 63%)`;
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * drift}px`);
    particle.style.setProperty("--drop", `${drop}px`);
    layer.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, lifetime);
  }
}

function burstFireworks(count) {
  for (let index = 0; index < count; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "firework";
    sparkle.style.left = `${14 + Math.random() * 72}%`;
    sparkle.style.top = `${8 + Math.random() * 56}%`;
    sparkle.style.background = `hsl(${Math.floor(20 + Math.random() * 62)} 100% 70%)`;
    sparkle.style.setProperty("--x", `${(Math.random() - 0.5) * 210}px`);
    sparkle.style.setProperty("--y", `${(Math.random() - 0.5) * 210}px`);
    elements.fireworksLayer.appendChild(sparkle);

    setTimeout(() => {
      sparkle.remove();
    }, 800);
  }
}

function burstMultiplier(multiplier) {
  const bubble = document.createElement("span");
  bubble.className = "mult-popup";
  bubble.textContent = `x${multiplier.toFixed(2)}`;
  elements.multiplierLayer.appendChild(bubble);

  setTimeout(() => {
    bubble.remove();
  }, 780);
}

let biggestBannerTimer = 0;
function showBiggestWinBanner(payout, multiplier) {
  elements.biggestWinHeadline.textContent = `+${formatNumber(payout)} VC`;
  elements.biggestWinSub.textContent = `x${multiplier.toFixed(2)} final multiplier`;
  elements.biggestWinBanner.classList.add("show");

  if (biggestBannerTimer) {
    clearTimeout(biggestBannerTimer);
  }

  biggestBannerTimer = setTimeout(() => {
    elements.biggestWinBanner.classList.remove("show");
  }, 2300);
}

function screenShake(intensity, durationMs) {
  elements.appShell.style.setProperty("--shake-intensity", `${intensity}px`);
  elements.appShell.classList.remove("shake");
  void elements.appShell.offsetWidth;
  elements.appShell.classList.add("shake");

  setTimeout(() => {
    elements.appShell.classList.remove("shake");
  }, durationMs);
}

function formatVc(value) {
  return `${formatNumber(value)} VC`;
}

function formatNumber(value) {
  return Math.floor(value).toLocaleString("en-US");
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)] || "";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const sound = {
  context: null,
  noiseBuffer: null,
};

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!sound.context) {
    sound.context = new AudioContextCtor();
  }

  if (sound.context.state === "suspended") {
    sound.context.resume().catch(() => {});
  }

  return sound.context;
}

function getNoiseBuffer(ctx) {
  if (sound.noiseBuffer) {
    return sound.noiseBuffer;
  }

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.9;
  }

  sound.noiseBuffer = buffer;
  return sound.noiseBuffer;
}

function playTone(frequency, duration, type, peak, delay = 0) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const start = ctx.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playToneSweep(fromFrequency, toFrequency, duration, type, peak, delay = 0) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const start = ctx.currentTime + delay;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(fromFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(toFrequency, 20), end);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.03);
}

function playNoiseBurst(duration, peak, fromFreq, toFreq, delay = 0) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";

  const gainNode = ctx.createGain();
  const start = ctx.currentTime + delay;
  const end = start + duration;

  filter.frequency.setValueAtTime(fromFreq, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(toFreq, 40), end);
  filter.Q.setValueAtTime(0.9, start);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.006);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(start);
  source.stop(end + 0.02);
}

function playLeverPull() {
  playToneSweep(220, 92, 0.14, "triangle", 0.055, 0);
  playNoiseBurst(0.08, 0.045, 1400, 320, 0);
  playTone(84, 0.09, "sine", 0.03, 0.045);
}

function playReelSpinBed(durationMs) {
  const ctx = getAudioContext();
  if (!ctx) {
    return () => {};
  }

  const now = ctx.currentTime;
  const end = now + durationMs / 1000;

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(520, now);
  noiseFilter.frequency.linearRampToValueAtTime(430, end);
  noiseFilter.Q.setValueAtTime(0.75, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.linearRampToValueAtTime(0.03, now + 0.1);
  noiseGain.gain.linearRampToValueAtTime(0.018, end);

  const rumble = ctx.createOscillator();
  rumble.type = "sawtooth";
  rumble.frequency.setValueAtTime(58, now);
  rumble.frequency.linearRampToValueAtTime(72, end);

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.0001, now);
  rumbleGain.gain.linearRampToValueAtTime(0.012, now + 0.08);
  rumbleGain.gain.linearRampToValueAtTime(0.0001, end + 0.1);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  rumble.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);

  noise.start(now);
  rumble.start(now);

  let stopped = false;
  return () => {
    if (stopped) {
      return;
    }

    stopped = true;
    const stopAt = ctx.currentTime + 0.1;
    noiseGain.gain.cancelScheduledValues(ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    rumbleGain.gain.cancelScheduledValues(ctx.currentTime);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    noise.stop(stopAt + 0.03);
    rumble.stop(stopAt + 0.04);
  };
}

function playSpinTickLoop(durationMs) {
  let timer = 0;

  const fireTick = () => {
    playTone(290 + Math.random() * 90, 0.018, "triangle", 0.011, 0);
    playNoiseBurst(0.018, 0.009, 2200, 1400, 0);
  };

  timer = window.setInterval(fireTick, 92);
  const stopTimer = window.setTimeout(() => {
    window.clearInterval(timer);
  }, durationMs + 40);

  return () => {
    window.clearInterval(timer);
    window.clearTimeout(stopTimer);
  };
}

function playReelStopClick(index) {
  playNoiseBurst(0.024, 0.024, 2800, 900, 0);
  playTone(190 + index * 28, 0.05, "square", 0.026, 0.004);
}

function playTensionRamp(durationMs) {
  const ctx = getAudioContext();
  if (!ctx) {
    return () => {};
  }

  const now = ctx.currentTime;
  const end = now + durationMs / 1000;

  const lead = ctx.createOscillator();
  lead.type = "sawtooth";
  lead.frequency.setValueAtTime(110, now);
  lead.frequency.exponentialRampToValueAtTime(370, end);

  const support = ctx.createOscillator();
  support.type = "triangle";
  support.frequency.setValueAtTime(170, now);
  support.frequency.exponentialRampToValueAtTime(640, end);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.032, now + 0.12);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  filter.frequency.linearRampToValueAtTime(2200, end);

  lead.connect(gainNode);
  support.connect(gainNode);
  gainNode.connect(filter);
  filter.connect(ctx.destination);

  lead.start(now);
  support.start(now);

  let stopped = false;
  return () => {
    if (stopped) {
      return;
    }

    stopped = true;
    const stopAt = ctx.currentTime + 0.08;
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    lead.stop(stopAt + 0.02);
    support.stop(stopAt + 0.03);
  };
}

function playCoinClinkBurst(multiplier) {
  const count = Math.min(10, Math.max(4, Math.round(multiplier + 1)));

  for (let i = 0; i < count; i += 1) {
    const delay = i * 0.048 + Math.random() * 0.012;
    playTone(1180 + Math.random() * 480, 0.08, "triangle", 0.034, delay);
    playTone(760 + Math.random() * 320, 0.06, "sine", 0.02, delay + 0.008);
  }
}

function playJackpotFanfare() {
  const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];

  melody.forEach((frequency, index) => {
    const delay = index * 0.12;
    playTone(frequency, 0.2, "sawtooth", 0.05, delay);
    playTone(frequency * 2, 0.13, "triangle", 0.025, delay + 0.025);
  });

  [523.25, 659.25, 783.99].forEach((frequency) => {
    playTone(frequency, 0.58, "square", 0.034, 0.64);
  });

  playCoinClinkBurst(9);
}

function playLossTone() {
  playToneSweep(190, 84, 0.18, "sawtooth", 0.036, 0);
  playNoiseBurst(0.06, 0.02, 900, 180, 0.03);
}

function playGrantTone() {
  playTone(510, 0.11, "triangle", 0.05, 0);
  playTone(760, 0.14, "sine", 0.048, 0.07);
}

function playStorePurchaseTone() {
  playTone(330, 0.09, "triangle", 0.04, 0);
  playTone(520, 0.11, "sine", 0.046, 0.06);
}
