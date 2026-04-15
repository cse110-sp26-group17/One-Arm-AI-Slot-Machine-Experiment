const STORAGE_KEY = "velocity-reels-state-v1";
const DAILY_GRANT_AMOUNT = 1200;
const MAX_LOG_ITEMS = 24;
const MAX_STREAK_BONUS = 0.36;
const STREAK_STEP = 0.06;
const MAX_LUCKY_CHARGE = 0.75;
const LUCKY_GAIN_PER_LOSS = 0.08;

const MACHINES = [
  {
    name: "Neon Mirage",
    flavor: "Fast rhythm, medium volatility, bright payouts.",
    symbols: ["7", "💎", "⚡", "🍒", "🪙", "🌟"],
    weights: [8, 7, 9, 12, 11, 5],
    triples: {
      "7": 12,
      "💎": 10,
      "⚡": 8,
      "🍒": 5,
      "🪙": 7,
      "🌟": 14,
    },
    pairMultiplier: 1.9,
    machineBonus: 0.04,
  },
  {
    name: "Dragon Vault",
    flavor: "High volatility with explosive dragon jackpots.",
    symbols: ["🐉", "🔥", "💰", "🧧", "💠", "🥇"],
    weights: [6, 10, 9, 12, 8, 4],
    triples: {
      "🐉": 16,
      "🔥": 11,
      "💰": 9,
      "🧧": 6,
      "💠": 8,
      "🥇": 18,
    },
    pairMultiplier: 1.75,
    machineBonus: 0.06,
  },
  {
    name: "Orbit Royale",
    flavor: "Balanced machine with frequent mid-size wins.",
    symbols: ["🪐", "👾", "🌌", "🚀", "🛰️", "✨"],
    weights: [9, 10, 8, 8, 11, 7],
    triples: {
      "🪐": 9,
      "👾": 7,
      "🌌": 10,
      "🚀": 11,
      "🛰️": 8,
      "✨": 13,
    },
    pairMultiplier: 2,
    machineBonus: 0.03,
  },
];

const DEFAULT_STATE = {
  balance: 5000,
  currentBet: 100,
  machineIndex: 0,
  spins: 0,
  wins: 0,
  losses: 0,
  totalSpent: 0,
  totalWon: 0,
  biggestWin: 0,
  winStreak: 0,
  luckyCharge: 0,
  lastDailyClaim: "",
  lastResult: "Ready to spin.",
  lastSymbols: ["7", "💎", "⚡"],
  isSpinning: false,
  autoSpin: false,
  autoSpinStopRequested: false,
  log: [],
};

const state = loadState();

const reels = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2"),
];

const elements = {
  balanceValue: document.getElementById("balanceValue"),
  betValue: document.getElementById("betValue"),
  biggestWinValue: document.getElementById("biggestWinValue"),
  machineName: document.getElementById("machineName"),
  machineFlavor: document.getElementById("machineFlavor"),
  resultText: document.getElementById("resultText"),
  spentValue: document.getElementById("spentValue"),
  wonValue: document.getElementById("wonValue"),
  netValue: document.getElementById("netValue"),
  streakValue: document.getElementById("streakValue"),
  luckyChargeValue: document.getElementById("luckyChargeValue"),
  totalBonusValue: document.getElementById("totalBonusValue"),
  streakBar: document.getElementById("streakBar"),
  luckyBar: document.getElementById("luckyBar"),
  spinButton: document.getElementById("spinButton"),
  autospinButton: document.getElementById("autospinButton"),
  stopButton: document.getElementById("stopButton"),
  dailyGrantButton: document.getElementById("dailyGrantButton"),
  prevMachineButton: document.getElementById("prevMachineButton"),
  nextMachineButton: document.getElementById("nextMachineButton"),
  betButtons: [...document.querySelectorAll(".bet-button")],
  logList: document.getElementById("logList"),
  rulesList: document.getElementById("rulesList"),
  machineShell: document.getElementById("machineShell"),
  flashFx: document.getElementById("flashFx"),
  confettiLayer: document.getElementById("confettiLayer"),
  fireworksLayer: document.getElementById("fireworksLayer"),
  multiplierLayer: document.getElementById("multiplierLayer"),
  biggestWinBanner: document.getElementById("biggestWinBanner"),
  biggestWinHeadline: document.getElementById("biggestWinHeadline"),
  biggestWinSub: document.getElementById("biggestWinSub"),
};

bindEvents();
renderAll();
setInterval(() => renderDailyGrantState(), 1000);

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

  elements.prevMachineButton.addEventListener("click", () => cycleMachine(-1));
  elements.nextMachineButton.addEventListener("click", () => cycleMachine(1));

  elements.betButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.isSpinning) {
        return;
      }
      const bet = Number(button.dataset.bet);
      state.currentBet = bet;
      state.lastResult = `Bet updated to ${formatNumber(bet)} VC.`;
      renderAll();
      persist();
    });
  });
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(saved);
    const merged = { ...DEFAULT_STATE, ...parsed };

    if (![25, 50, 100, 250, 500].includes(merged.currentBet)) {
      merged.currentBet = 100;
    }

    if (!Array.isArray(merged.lastSymbols) || merged.lastSymbols.length !== 3) {
      merged.lastSymbols = [...DEFAULT_STATE.lastSymbols];
    }

    if (!Array.isArray(merged.log)) {
      merged.log = [];
    }

    if (typeof merged.machineIndex !== "number" || Number.isNaN(merged.machineIndex)) {
      merged.machineIndex = 0;
    }

    merged.machineIndex = clampMachineIndex(merged.machineIndex);
    merged.isSpinning = false;
    merged.autoSpin = false;
    merged.autoSpinStopRequested = false;
    return merged;
  } catch {
    return {
      ...structuredClone(DEFAULT_STATE),
      lastResult: "Saved state was unreadable. Session reset.",
    };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampMachineIndex(index) {
  const length = MACHINES.length;
  return ((index % length) + length) % length;
}

function getActiveMachine() {
  return MACHINES[clampMachineIndex(state.machineIndex)];
}

function getPerkMultiplier() {
  const streakBonus = Math.min(state.winStreak * STREAK_STEP, MAX_STREAK_BONUS);
  const luckyBonus = Math.min(state.luckyCharge, MAX_LUCKY_CHARGE);
  const machineBonus = getActiveMachine().machineBonus;
  return 1 + streakBonus + luckyBonus + machineBonus;
}

function renderAll() {
  const machine = getActiveMachine();
  const net = state.totalWon - state.totalSpent;

  elements.balanceValue.textContent = formatVc(state.balance);
  elements.betValue.textContent = formatVc(state.currentBet);
  elements.biggestWinValue.textContent = formatVc(state.biggestWin);
  elements.machineName.textContent = machine.name;
  elements.machineFlavor.textContent = machine.flavor;
  elements.resultText.textContent = state.lastResult;
  elements.spentValue.textContent = formatVc(state.totalSpent);
  elements.wonValue.textContent = formatVc(state.totalWon);
  elements.netValue.textContent = formatSignedVc(net);
  elements.netValue.style.color = net >= 0 ? "#7ff8e2" : "#ff9dad";

  elements.streakValue.textContent = String(state.winStreak);
  elements.luckyChargeValue.textContent = `${Math.round(state.luckyCharge * 100)}%`;
  elements.totalBonusValue.textContent = `x${getPerkMultiplier().toFixed(2)}`;
  elements.streakBar.style.width = `${Math.min((state.winStreak / 6) * 100, 100)}%`;
  elements.luckyBar.style.width = `${Math.min((state.luckyCharge / MAX_LUCKY_CHARGE) * 100, 100)}%`;

  if (!state.isSpinning && Array.isArray(state.lastSymbols) && state.lastSymbols.length === 3) {
    reels.forEach((reel, index) => {
      reel.textContent = state.lastSymbols[index];
    });
  }

  elements.spinButton.disabled = state.isSpinning || state.autoSpin || state.balance < state.currentBet;
  elements.autospinButton.disabled = state.isSpinning || state.balance < state.currentBet;
  elements.autospinButton.textContent = state.autoSpin ? "Autospin Running" : "Start Autospin";
  elements.stopButton.disabled = !state.autoSpin && !state.isSpinning;
  elements.prevMachineButton.disabled = state.isSpinning;
  elements.nextMachineButton.disabled = state.isSpinning;

  elements.betButtons.forEach((button) => {
    const isActive = Number(button.dataset.bet) === state.currentBet;
    button.classList.toggle("active", isActive);
    button.disabled = state.isSpinning;
  });

  renderDailyGrantState();
  renderLog();
  renderRules(machine);
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

  if (!state.log.length) {
    const empty = document.createElement("li");
    empty.textContent = "No spins yet.";
    elements.logList.appendChild(empty);
    return;
  }

  state.log.forEach((entry) => {
    const item = document.createElement("li");
    item.classList.add(entry.type === "loss" ? "loss" : "win");

    const time = new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (entry.type === "grant") {
      item.textContent = `DAILY +${formatNumber(entry.delta)} VC • ${time}`;
    } else if (entry.type === "win") {
      item.textContent = `WIN +${formatNumber(entry.payout)} VC (net ${formatSignedNumber(entry.delta)}) • ${entry.symbols} • ${time}`;
    } else {
      item.textContent = `LOSS ${formatSignedNumber(entry.delta)} VC • ${entry.symbols} • ${time}`;
    }

    elements.logList.appendChild(item);
  });
}

function renderRules(machine) {
  elements.rulesList.innerHTML = "";

  const tripleRows = Object.entries(machine.triples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, multiplier]) => `3x ${symbol} = x${multiplier.toFixed(2)} base`);

  const rows = [
    ...tripleRows,
    `Any pair = x${machine.pairMultiplier.toFixed(2)} base`,
    `Streak bonus: +6% per consecutive win (max +36%)`,
    `Lucky Charge: +8% per loss (max +75%)`,
    `Machine bonus: +${Math.round(machine.machineBonus * 100)}%`,
  ];

  rows.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    elements.rulesList.appendChild(li);
  });
}

async function spinOnce() {
  if (state.isSpinning) {
    return false;
  }

  if (state.balance < state.currentBet) {
    state.lastResult = "Insufficient VC for this bet. Lower the bet or claim your daily grant.";
    renderAll();
    persist();
    return false;
  }

  state.isSpinning = true;
  state.totalSpent += state.currentBet;
  state.balance -= state.currentBet;
  state.spins += 1;
  state.lastResult = "Reels spinning...";
  renderAll();
  persist();

  const machine = getActiveMachine();
  screenShake(5, 220);
  const stopTension = playTensionRamp(1300);

  const finalSymbols = [];
  for (let index = 0; index < reels.length; index += 1) {
    const symbol = await animateReel(reels[index], machine, 560 + index * 220);
    finalSymbols.push(symbol);
    playReelStopTone(index);
  }
  stopTension();

  const outcome = scoreSpin(finalSymbols, machine);
  state.lastSymbols = finalSymbols;

  if (outcome.payout > 0) {
    state.balance += outcome.payout;
    state.totalWon += outcome.payout;
    state.wins += 1;
    state.winStreak += 1;
    state.luckyCharge = 0;
    state.lastResult = `${outcome.label} +${formatNumber(outcome.payout)} VC (x${outcome.finalMultiplier.toFixed(2)}).`;

    triggerWinFx(outcome.finalMultiplier);

    if (outcome.payout > state.biggestWin) {
      state.biggestWin = outcome.payout;
      showBiggestWinBanner(outcome.payout, outcome.finalMultiplier);
      burstFireworks(26);
    }
  } else {
    state.losses += 1;
    state.winStreak = 0;
    state.luckyCharge = Math.min(MAX_LUCKY_CHARGE, state.luckyCharge + LUCKY_GAIN_PER_LOSS);
    state.lastResult = `${outcome.label} -${formatNumber(state.currentBet)} VC. Lucky Charge increased.`;
    triggerLossFx();
  }

  addLogEntry({
    type: outcome.payout > 0 ? "win" : "loss",
    delta: outcome.payout - state.currentBet,
    payout: outcome.payout,
    bet: state.currentBet,
    symbols: finalSymbols.join(" "),
    ts: Date.now(),
  });

  state.isSpinning = false;

  if (state.autoSpinStopRequested) {
    state.autoSpin = false;
    state.autoSpinStopRequested = false;
  }

  renderAll();
  persist();
  return true;
}

async function startAutoSpin() {
  if (state.autoSpin || state.isSpinning) {
    return;
  }

  if (state.balance < state.currentBet) {
    state.lastResult = "Autospin unavailable: not enough VC for the selected bet.";
    renderAll();
    persist();
    return;
  }

  state.autoSpin = true;
  state.autoSpinStopRequested = false;
  state.lastResult = "Autospin engaged. Press Stop any time.";
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

    await sleep(80);
  }

  state.autoSpin = false;
  state.autoSpinStopRequested = false;

  if (state.balance < state.currentBet) {
    state.lastResult = "Autospin paused: insufficient VC for current bet.";
  }

  renderAll();
  persist();
}

function stopAutoSpin() {
  if (!state.autoSpin && !state.isSpinning) {
    return;
  }

  state.autoSpin = false;
  state.autoSpinStopRequested = true;
  state.lastResult = "Autospin stop requested.";
  renderAll();
  persist();
}

function cycleMachine(step) {
  if (state.isSpinning) {
    return;
  }

  state.machineIndex = clampMachineIndex(state.machineIndex + step);
  const machine = getActiveMachine();
  state.lastSymbols = machine.symbols.slice(0, 3);
  state.lastResult = `Switched to ${machine.name}.`;
  renderAll();
  persist();
}

function claimDailyGrant() {
  if (!canClaimDaily()) {
    state.lastResult = "Daily grant already claimed. Come back at local midnight.";
    renderAll();
    persist();
    return;
  }

  state.balance += DAILY_GRANT_AMOUNT;
  state.lastDailyClaim = getTodayKey();
  state.lastResult = `Daily grant claimed: +${formatNumber(DAILY_GRANT_AMOUNT)} VC.`;

  addLogEntry({
    type: "grant",
    delta: DAILY_GRANT_AMOUNT,
    payout: DAILY_GRANT_AMOUNT,
    bet: 0,
    symbols: "Daily Grant",
    ts: Date.now(),
  });

  triggerFlash();
  screenShake(4, 220);
  playGrantTone();
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

function scoreSpin(symbols, machine) {
  const counts = new Map();
  symbols.forEach((symbol) => {
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  });

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSymbol, topCount] = entries[0];

  let baseMultiplier = 0;
  let label = "No payout.";

  if (topCount === 3) {
    baseMultiplier = machine.triples[topSymbol] || 5;
    label = `Triple ${topSymbol}!`;
  } else if (topCount === 2) {
    baseMultiplier = machine.pairMultiplier;
    label = `Pair hit (${topSymbol}).`;
  }

  if (baseMultiplier <= 0) {
    return {
      payout: 0,
      finalMultiplier: 0,
      label,
    };
  }

  const perkMultiplier = getPerkMultiplier();
  const finalMultiplier = baseMultiplier * perkMultiplier;
  const payout = Math.floor(state.currentBet * finalMultiplier);

  return {
    payout,
    finalMultiplier,
    label,
  };
}

async function animateReel(reel, machine, durationMs) {
  reel.classList.add("is-spinning");
  const start = performance.now();
  let softDuration = durationMs;

  while (performance.now() - start < softDuration) {
    reel.textContent = sampleWeightedSymbol(machine);
    await sleep(42);

    if (state.autoSpinStopRequested) {
      softDuration = Math.min(softDuration, performance.now() - start + 75);
    }
  }

  const finalSymbol = sampleWeightedSymbol(machine);
  reel.textContent = finalSymbol;
  reel.classList.remove("is-spinning");
  return finalSymbol;
}

function sampleWeightedSymbol(machine) {
  const totalWeight = machine.weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (let index = 0; index < machine.symbols.length; index += 1) {
    roll -= machine.weights[index];
    if (roll <= 0) {
      return machine.symbols[index];
    }
  }

  return machine.symbols[machine.symbols.length - 1];
}

function triggerWinFx(multiplier) {
  triggerFlash();
  burstConfetti(28);
  burstMultiplier(multiplier);
  screenShake(8, 320);
  playWinStinger();
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

function burstConfetti(count) {
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "confetti";
    particle.style.left = `${10 + Math.random() * 80}%`;
    particle.style.top = `${2 + Math.random() * 18}%`;
    particle.style.background = `hsl(${Math.floor(Math.random() * 360)} 98% 66%)`;
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * 280}px`);
    elements.confettiLayer.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 950);
  }
}

function burstFireworks(count) {
  for (let index = 0; index < count; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "firework";
    sparkle.style.left = `${15 + Math.random() * 70}%`;
    sparkle.style.top = `${8 + Math.random() * 56}%`;
    sparkle.style.background = `hsl(${Math.floor(20 + Math.random() * 60)} 100% 70%)`;
    sparkle.style.setProperty("--x", `${(Math.random() - 0.5) * 180}px`);
    sparkle.style.setProperty("--y", `${(Math.random() - 0.5) * 180}px`);
    elements.fireworksLayer.appendChild(sparkle);

    setTimeout(() => {
      sparkle.remove();
    }, 760);
  }
}

function burstMultiplier(multiplier) {
  const bubble = document.createElement("span");
  bubble.className = "mult-popup";
  bubble.textContent = `x${multiplier.toFixed(2)}`;
  elements.multiplierLayer.appendChild(bubble);

  setTimeout(() => {
    bubble.remove();
  }, 740);
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
  elements.machineShell.style.setProperty("--shake-intensity", `${intensity}px`);
  elements.machineShell.classList.remove("shake");
  void elements.machineShell.offsetWidth;
  elements.machineShell.classList.add("shake");

  setTimeout(() => {
    elements.machineShell.classList.remove("shake");
  }, durationMs);
}

function addLogEntry(entry) {
  state.log.unshift(entry);
  if (state.log.length > MAX_LOG_ITEMS) {
    state.log.length = MAX_LOG_ITEMS;
  }
}

function formatVc(value) {
  return `${formatNumber(value)} VC`;
}

function formatSignedVc(value) {
  return `${value >= 0 ? "+" : "-"}${formatNumber(Math.abs(value))} VC`;
}

function formatSignedNumber(value) {
  return `${value >= 0 ? "+" : "-"}${formatNumber(Math.abs(value))}`;
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const sound = {
  context: null,
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

function playTensionRamp(durationMs) {
  const ctx = getAudioContext();
  if (!ctx) {
    return () => {};
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = "sawtooth";

  const now = ctx.currentTime;
  const end = now + durationMs / 1000;

  oscillator.frequency.setValueAtTime(130, now);
  oscillator.frequency.exponentialRampToValueAtTime(420, end);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.08);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(now);

  let stopped = false;
  return () => {
    if (stopped) {
      return;
    }
    stopped = true;
    const stopAt = ctx.currentTime + 0.08;
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.stop(stopAt + 0.02);
  };
}

function playReelStopTone(index) {
  playTone(280 + index * 85, 0.06, "triangle", 0.05);
}

function playWinStinger() {
  playTone(520, 0.08, "square", 0.05, 0.02);
  playTone(680, 0.12, "triangle", 0.055, 0.08);
  playTone(840, 0.15, "sine", 0.06, 0.13);
}

function playLossTone() {
  playTone(230, 0.1, "sawtooth", 0.04, 0);
}

function playGrantTone() {
  playTone(480, 0.08, "triangle", 0.05, 0);
  playTone(720, 0.1, "sine", 0.05, 0.06);
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
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}
