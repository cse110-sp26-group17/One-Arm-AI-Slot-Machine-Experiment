const BET_OPTIONS = [25, 50, 100, 200];
const DEFAULT_BET = 100;
const DAILY_GRANT = 250;
const SESSION_REMINDER_INTERVAL = 25;
const PERK_PROGRESS_TARGET = 5;
const PERK_MULTIPLIERS = [1, 1.06, 1.14, 1.24, 1.35, 1.5];
const SAVE_KEY = "starlight-spinworks-v2";

const machines = [
  {
    name: "Solar Vault",
    theme: "solar",
    flavor: "High-volatility arcs with bright jackpot spikes.",
    jackpotBoost: 1.16,
    safetyCode: "SHD",
    special: {
      codes: ["SUN", "BOT", "SHD"],
      multiplier: 13,
      label: "Trinity Ignition",
    },
    symbols: [
      { code: "SUN", name: "Solar Crest", weight: 16, pair: 2.3, triple: 9.2 },
      { code: "BOT", name: "Core Automaton", weight: 18, pair: 2.1, triple: 7.7 },
      { code: "ORB", name: "Plasma Orb", weight: 19, pair: 1.9, triple: 6.9 },
      { code: "ARC", name: "Arc Relay", weight: 17, pair: 2.4, triple: 8.1 },
      { code: "NEX", name: "Nexus Crown", weight: 13, pair: 3.2, triple: 11.8 },
      { code: "SHD", name: "Shield Node", weight: 8, pair: 4.1, triple: 15.4 },
    ],
  },
  {
    name: "Rift Engine",
    theme: "rift",
    flavor: "Cool-tone machine with sharper high-end payout bursts.",
    jackpotBoost: 1.12,
    safetyCode: "AEG",
    special: {
      codes: ["RFT", "QNT", "AEG"],
      multiplier: 12,
      label: "Rift Overdrive",
    },
    symbols: [
      { code: "RFT", name: "Rift Core", weight: 17, pair: 2.2, triple: 8.4 },
      { code: "QNT", name: "Quantum Coil", weight: 15, pair: 2.7, triple: 9.6 },
      { code: "ICE", name: "Ice Prism", weight: 21, pair: 1.8, triple: 6.5 },
      { code: "GLY", name: "Glyph Disk", weight: 17, pair: 2.2, triple: 7.8 },
      { code: "VEC", name: "Vector Pulse", weight: 12, pair: 3.4, triple: 12.4 },
      { code: "AEG", name: "Aegis Bit", weight: 8, pair: 4.0, triple: 14.2 },
    ],
  },
  {
    name: "Neon Orchard",
    theme: "neon",
    flavor: "Smoother baseline hits with vibrant late-run fireworks.",
    jackpotBoost: 1.1,
    safetyCode: "VIT",
    special: {
      codes: ["NVA", "LUX", "VIT"],
      multiplier: 11,
      label: "Neon Bloom",
    },
    symbols: [
      { code: "NVA", name: "Nova Seed", weight: 20, pair: 2.0, triple: 7.2 },
      { code: "LUX", name: "Lux Vine", weight: 18, pair: 2.3, triple: 8.3 },
      { code: "PUL", name: "Pulse Bloom", weight: 17, pair: 2.4, triple: 8.7 },
      { code: "GRN", name: "Green Spark", weight: 15, pair: 2.8, triple: 10.1 },
      { code: "RSE", name: "Rose Flux", weight: 11, pair: 3.5, triple: 12.6 },
      { code: "VIT", name: "Vital Chip", weight: 9, pair: 3.9, triple: 14.6 },
    ],
  },
];

const reels = Array.from(document.querySelectorAll(".reel"));
const appShellEl = document.querySelector(".app-shell");
const balanceEl = document.getElementById("balance");
const spinsEl = document.getElementById("spins");
const biggestWinEl = document.getElementById("biggestWin");
const spentEl = document.getElementById("spent");
const netEl = document.getElementById("net");
const resultTextEl = document.getElementById("resultText");
const betRangeEl = document.getElementById("betRange");
const betTextEl = document.getElementById("betText");
const chipsEl = Array.from(document.querySelectorAll(".chip"));
const spinBtnEl = document.getElementById("spinBtn");
const startAutoEl = document.getElementById("startAuto");
const stopAutoEl = document.getElementById("stopAuto");
const dailyGrantEl = document.getElementById("dailyGrant");
const dailyStatusEl = document.getElementById("dailyStatus");
const sessionGuardEl = document.getElementById("sessionGuard");
const payoutListEl = document.getElementById("payoutList");
const activityLogEl = document.getElementById("activityLog");
const machineNameEl = document.getElementById("machineName");
const machineFlavorEl = document.getElementById("machineFlavor");
const prevMachineEl = document.getElementById("prevMachine");
const nextMachineEl = document.getElementById("nextMachine");
const perkTierEl = document.getElementById("perkTier");
const perkMultiplierEl = document.getElementById("perkMultiplier");
const perkFillEl = document.getElementById("perkFill");
const perkStatusEl = document.getElementById("perkStatus");
const screenFlashEl = document.getElementById("screenFlash");
const multiplierPopEl = document.getElementById("multiplierPop");
const confettiLayerEl = document.getElementById("confettiLayer");
const fireworkLayerEl = document.getElementById("fireworkLayer");

const state = {
  balance: 1200,
  spins: 0,
  biggestWin: 0,
  totalSpent: 0,
  totalWon: 0,
  bet: DEFAULT_BET,
  isSpinning: false,
  autoSpin: false,
  fastStop: false,
  machineIndex: 0,
  lastDailyGrant: "",
  sessionGuard: true,
  perkTier: 0,
  perkCharge: 0,
  log: [],
};

let audioCtx;
let tensionTimers = [];

init();

function init() {
  loadState();
  bindEvents();
  applyMachine();
  paintIdleReels();

  if (state.log.length === 0) {
    pushLog("info", `${timestamp()} Session started.`);
  }

  syncUI();
  renderActivityLog();
  updateDailyGrantAvailability();
}

function bindEvents() {
  betRangeEl.addEventListener("input", () => {
    setBet(Number(betRangeEl.value));
  });

  for (const chip of chipsEl) {
    chip.addEventListener("click", () => {
      setBet(Number(chip.dataset.bet));
    });
  }

  spinBtnEl.addEventListener("click", () => {
    state.autoSpin = false;
    spin();
  });

  startAutoEl.addEventListener("click", () => {
    if (state.autoSpin) {
      return;
    }
    state.autoSpin = true;
    state.fastStop = false;
    setResult("Autospin engaged.", "info");
    syncUI();
    if (!state.isSpinning) {
      spin();
    }
  });

  stopAutoEl.addEventListener("click", () => {
    state.autoSpin = false;
    state.fastStop = true;
    if (state.isSpinning) {
      setResult("Stopping after the current reel settle.", "info");
    }
    syncUI();
  });

  dailyGrantEl.addEventListener("click", claimDailyGrant);

  sessionGuardEl.addEventListener("change", () => {
    state.sessionGuard = sessionGuardEl.checked;
    saveState();
  });

  prevMachineEl.addEventListener("click", () => cycleMachine(-1));
  nextMachineEl.addEventListener("click", () => cycleMachine(1));

  document.addEventListener("pointerdown", ensureAudioContext, { once: true });
}

function cycleMachine(direction) {
  if (state.isSpinning || state.autoSpin) {
    return;
  }
  const total = machines.length;
  state.machineIndex = (state.machineIndex + direction + total) % total;
  applyMachine();
  paintIdleReels();
  pushLog("info", `${timestamp()} Switched to ${currentMachine().name}.`);
  setResult(`Machine switched to ${currentMachine().name}.`, "info");
  renderActivityLog();
  saveState();
  syncUI();
}

function applyMachine() {
  const machine = currentMachine();
  document.body.dataset.theme = machine.theme;
  machineNameEl.textContent = machine.name;
  machineFlavorEl.textContent = machine.flavor;
  renderPayoutRules();
}

function currentMachine() {
  return machines[state.machineIndex];
}

function setBet(value) {
  const nextBet = nearestBet(value);
  state.bet = nextBet;
  syncUI();
  saveState();
}

function nearestBet(rawValue) {
  return BET_OPTIONS.reduce((closest, option) => {
    return Math.abs(option - rawValue) < Math.abs(closest - rawValue) ? option : closest;
  }, BET_OPTIONS[0]);
}

function renderPayoutRules() {
  const machine = currentMachine();
  payoutListEl.innerHTML = "";

  for (const symbol of machine.symbols) {
    const item = document.createElement("li");
    item.textContent = `${symbol.code} ${symbol.name}: pair x${symbol.pair.toFixed(1)}, triple x${symbol.triple.toFixed(1)}`;
    payoutListEl.appendChild(item);
  }

  const special = document.createElement("li");
  special.textContent = `${machine.special.label} (${machine.special.codes.join(" + ")}): x${machine.special.multiplier.toFixed(1)}`;
  payoutListEl.appendChild(special);

  const rebate = document.createElement("li");
  rebate.textContent = `${machine.safetyCode} rebate: x0.2 if no other payout.`;
  payoutListEl.appendChild(rebate);

  const perks = document.createElement("li");
  perks.textContent = "Perks apply 1.00x to 1.50x on top of base payouts.";
  payoutListEl.appendChild(perks);
}

async function spin() {
  if (state.isSpinning) {
    return;
  }

  if (state.balance < state.bet) {
    state.autoSpin = false;
    setResult("Not enough VC for this bet. Lower bet or claim the daily grant.", "loss");
    syncUI();
    return;
  }

  state.isSpinning = true;
  state.fastStop = false;
  state.balance -= state.bet;
  state.totalSpent += state.bet;
  state.spins += 1;

  const machine = currentMachine();
  const spinSymbols = machine.symbols;
  const spinDuration = 830 + Math.random() * 220;

  setResult("Reels charged. Resolving outcome...", "info");
  triggerShake();
  pulseFlash();
  startTensionAudio(spinDuration);
  syncUI();

  const outcomes = [
    pickWeighted(spinSymbols),
    pickWeighted(spinSymbols),
    pickWeighted(spinSymbols),
  ];

  await Promise.all(
    outcomes.map((symbol, index) => {
      const stopAfter = spinDuration + index * 170;
      return animateReel(reels[index], symbol.code, stopAfter, spinSymbols);
    })
  );

  clearTensionAudio();

  const payoutResult = calculatePayout(outcomes, state.bet, machine);
  const perkMultiplier = currentPerkMultiplier();
  let payout = Math.round(payoutResult.basePayout * perkMultiplier);

  if (payoutResult.isJackpot) {
    payout = Math.round(payout * machine.jackpotBoost);
  }

  if (payout > 0) {
    state.balance += payout;
    state.totalWon += payout;
    state.biggestWin = Math.max(state.biggestWin, payout);
    chargePerkMeter(payout, state.bet);

    const totalMult = payout / state.bet;
    setResult(`${payoutResult.label}. Won ${fmtVc(payout)} (${totalMult.toFixed(2)}x).`, "win");
    pushLog("win", `${timestamp()} +${fmtVc(payout)} (${payoutResult.label})`);

    celebrateWin({
      payout,
      isJackpot: payoutResult.isJackpot,
      multiplier: totalMult,
    });
  } else {
    coolPerkMeter();
    setResult(`No payout. ${fmtVc(state.bet)} spent this spin.`, "loss");
    pushLog("loss", `${timestamp()} -${fmtVc(state.bet)} (no payout)`);
    playLossSound();
  }

  if (state.sessionGuard && state.spins % SESSION_REMINDER_INTERVAL === 0) {
    pushLog("info", `${timestamp()} Reminder: ${state.spins} spins completed.`);
    setResult(`Reminder: ${state.spins} spins completed. Take a short break.`, "info");
  }

  state.isSpinning = false;

  if (state.balance < state.bet) {
    state.autoSpin = false;
  }

  saveState();
  syncUI();
  renderActivityLog();

  if (state.autoSpin && state.balance >= state.bet) {
    setTimeout(() => {
      if (state.autoSpin && !state.isSpinning) {
        spin();
      }
    }, 120);
  }
}

function pickWeighted(symbols) {
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const symbol of symbols) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }

  return symbols[symbols.length - 1];
}

function calculatePayout(outcomes, bet, machine) {
  const codes = outcomes.map((symbol) => symbol.code);
  const counts = new Map();

  for (const symbol of outcomes) {
    counts.set(symbol.code, (counts.get(symbol.code) || 0) + 1);
  }

  if (machine.special.codes.every((code) => codes.includes(code))) {
    return {
      basePayout: Math.round(bet * machine.special.multiplier),
      label: machine.special.label,
      isJackpot: true,
    };
  }

  for (const symbol of machine.symbols) {
    if (counts.get(symbol.code) === 3) {
      return {
        basePayout: Math.round(bet * symbol.triple),
        label: `Triple ${symbol.code}`,
        isJackpot: symbol.triple >= 10,
      };
    }
  }

  for (const symbol of machine.symbols) {
    if (counts.get(symbol.code) === 2) {
      return {
        basePayout: Math.round(bet * symbol.pair),
        label: `Pair ${symbol.code}`,
        isJackpot: false,
      };
    }
  }

  if (codes.includes(machine.safetyCode)) {
    return {
      basePayout: Math.round(bet * 0.2),
      label: `${machine.safetyCode} rebate`,
      isJackpot: false,
    };
  }

  return {
    basePayout: 0,
    label: "No match",
    isJackpot: false,
  };
}

function animateReel(reel, finalCode, stopAfterMs, symbols) {
  return new Promise((resolve) => {
    reel.classList.add("spinning");
    const startedAt = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      reel.textContent = randomSymbol.code;

      if (elapsed >= stopAfterMs || (state.fastStop && elapsed >= 130)) {
        reel.textContent = finalCode;
        reel.classList.remove("spinning");
        playTone(300 + Math.random() * 140, 0.045, "square", 0.055);
        resolve();
        return;
      }

      setTimeout(tick, 60);
    };

    tick();
  });
}

function celebrateWin({ payout, isJackpot, multiplier }) {
  triggerShake();
  pulseFlash();

  const confettiCount = payout >= state.bet * 5 ? 70 : 40;
  spawnConfetti(confettiCount);

  if (isJackpot || payout >= state.bet * 8) {
    spawnFireworks(4);
    showMultiplierPop(`Jackpot ${multiplier.toFixed(2)}x`);
  } else {
    showMultiplierPop(`${multiplier.toFixed(2)}x`);
  }

  playWinSound(payout, state.bet);
}

function chargePerkMeter(payout, bet) {
  const gain = Math.min(2.2, 0.9 + payout / Math.max(1, bet) * 0.17);
  state.perkCharge += gain;

  while (state.perkCharge >= PERK_PROGRESS_TARGET && state.perkTier < PERK_MULTIPLIERS.length - 1) {
    state.perkCharge -= PERK_PROGRESS_TARGET;
    state.perkTier += 1;
    pushLog("info", `${timestamp()} Perk tier advanced to ${state.perkTier + 1}.`);
    showMultiplierPop(`Perk Up ${currentPerkMultiplier().toFixed(2)}x`);
    playTone(450, 0.08, "triangle", 0.07);
    playTone(620, 0.1, "triangle", 0.07, 0.08);
  }
}

function coolPerkMeter() {
  state.perkCharge = Math.max(0, state.perkCharge - 0.55);
}

function currentPerkMultiplier() {
  return PERK_MULTIPLIERS[state.perkTier];
}

function setResult(message, type) {
  resultTextEl.textContent = message;
  resultTextEl.classList.remove("win", "loss", "info");
  if (type) {
    resultTextEl.classList.add(type);
  }
}

function claimDailyGrant() {
  const today = localDateToken();
  if (state.lastDailyGrant === today) {
    setResult("Daily grant already claimed today. Returns at local midnight.", "info");
    return;
  }

  state.balance += DAILY_GRANT;
  state.lastDailyGrant = today;
  pushLog("info", `${timestamp()} Daily grant claimed: +${fmtVc(DAILY_GRANT)}.`);
  setResult(`Daily VC grant received: +${fmtVc(DAILY_GRANT)}.`, "win");

  playTone(420, 0.09, "triangle", 0.08);
  playTone(610, 0.1, "triangle", 0.08, 0.1);

  saveState();
  syncUI();
  renderActivityLog();
  updateDailyGrantAvailability();
}

function updateDailyGrantAvailability() {
  const claimedToday = state.lastDailyGrant === localDateToken();
  dailyGrantEl.disabled = claimedToday;
  dailyStatusEl.textContent = claimedToday
    ? "Grant claimed for today. Next claim unlocks after local midnight."
    : "One claim per day."
}

function syncUI() {
  const net = state.totalWon - state.totalSpent;

  balanceEl.textContent = fmtVc(state.balance);
  spinsEl.textContent = state.spins.toString();
  biggestWinEl.textContent = fmtVc(state.biggestWin);
  spentEl.textContent = fmtVc(state.totalSpent);
  netEl.textContent = `${net >= 0 ? "+" : ""}${fmtVc(net)}`;
  netEl.classList.remove("pos", "neg");
  netEl.classList.add(net >= 0 ? "pos" : "neg");

  betRangeEl.value = state.bet.toString();
  betTextEl.textContent = state.bet.toString();

  const controlsLocked = state.isSpinning || state.autoSpin;

  spinBtnEl.disabled = state.isSpinning || state.autoSpin || state.balance < state.bet;
  startAutoEl.disabled = state.autoSpin || state.isSpinning || state.balance < state.bet;
  stopAutoEl.disabled = !state.autoSpin && !state.isSpinning;
  betRangeEl.disabled = controlsLocked;
  prevMachineEl.disabled = controlsLocked;
  nextMachineEl.disabled = controlsLocked;

  for (const chip of chipsEl) {
    const chipBet = Number(chip.dataset.bet);
    chip.classList.toggle("active", chipBet === state.bet);
    chip.disabled = controlsLocked;
  }

  sessionGuardEl.checked = state.sessionGuard;

  perkTierEl.textContent = (state.perkTier + 1).toString();
  perkMultiplierEl.textContent = `${currentPerkMultiplier().toFixed(2)}x`;

  if (state.perkTier >= PERK_MULTIPLIERS.length - 1) {
    perkFillEl.style.width = "100%";
    perkStatusEl.textContent = "Perk meter maxed. Highest bonus active.";
  } else {
    const fillPct = (state.perkCharge / PERK_PROGRESS_TARGET) * 100;
    perkFillEl.style.width = `${Math.min(100, fillPct).toFixed(0)}%`;
    perkStatusEl.textContent = `${state.perkCharge.toFixed(1)} / ${PERK_PROGRESS_TARGET} charge to next perk tier.`;
  }

  updateDailyGrantAvailability();
}

function paintIdleReels() {
  const symbols = currentMachine().symbols;
  for (const reel of reels) {
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    reel.textContent = randomSymbol.code;
  }
}

function pushLog(type, text) {
  state.log.unshift({ type, text });
  if (state.log.length > 16) {
    state.log.length = 16;
  }
}

function renderActivityLog() {
  activityLogEl.innerHTML = "";

  for (const entry of state.log) {
    const item = document.createElement("li");
    item.classList.add(entry.type || "info");
    item.textContent = entry.text;
    activityLogEl.appendChild(item);
  }
}

function triggerShake() {
  appShellEl.classList.remove("shake");
  void appShellEl.offsetWidth;
  appShellEl.classList.add("shake");
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

function spawnConfetti(count) {
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.setProperty("--x", `${Math.random() * 100}%`);
    piece.style.setProperty("--h", `${Math.floor(Math.random() * 360)}`);
    piece.style.setProperty("--rot", `${Math.floor(Math.random() * 360)}deg`);
    piece.style.setProperty("--dur", `${0.8 + Math.random() * 0.8}s`);
    confettiLayerEl.appendChild(piece);
    setTimeout(() => piece.remove(), 1800);
  }
}

function spawnFireworks(count) {
  for (let i = 0; i < count; i += 1) {
    const burst = document.createElement("span");
    burst.className = "firework";
    burst.style.setProperty("--x", `${12 + Math.random() * 76}%`);
    burst.style.setProperty("--y", `${12 + Math.random() * 46}%`);
    burst.style.setProperty("--h", `${Math.floor(Math.random() * 360)}`);
    fireworkLayerEl.appendChild(burst);
    setTimeout(() => burst.remove(), 760);
  }
}

function ensureAudioContext() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (error) {
    // Audio is optional.
  }
}

function playTone(frequency, seconds, type = "sine", gainLevel = 0.06, delay = 0) {
  try {
    ensureAudioContext();
    if (!audioCtx) {
      return;
    }

    const now = audioCtx.currentTime + delay;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(now);
    oscillator.stop(now + seconds + 0.02);
  } catch (error) {
    // Audio can fail on strict autoplay policies.
  }
}

function startTensionAudio(spinDuration) {
  clearTensionAudio();
  const notes = [170, 210, 250, 290, 340];
  const stepMs = Math.max(90, spinDuration / notes.length);

  notes.forEach((freq, index) => {
    const timer = setTimeout(() => {
      playTone(freq, 0.06, "triangle", 0.045);
    }, index * stepMs);
    tensionTimers.push(timer);
  });
}

function clearTensionAudio() {
  for (const timer of tensionTimers) {
    clearTimeout(timer);
  }
  tensionTimers = [];
}

function playWinSound(payout, bet) {
  const ratio = payout / Math.max(1, bet);

  if (ratio >= 8) {
    playTone(350, 0.08, "triangle", 0.08);
    playTone(520, 0.1, "triangle", 0.09, 0.1);
    playTone(710, 0.12, "triangle", 0.1, 0.22);
    return;
  }

  if (ratio >= 4) {
    playTone(320, 0.07, "triangle", 0.07);
    playTone(500, 0.09, "triangle", 0.08, 0.1);
    return;
  }

  playTone(430, 0.09, "sine", 0.065);
}

function playLossSound() {
  playTone(145, 0.1, "sawtooth", 0.05);
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") {
      return;
    }

    state.balance = asNumber(saved.balance, state.balance);
    state.spins = asNumber(saved.spins, state.spins);
    state.biggestWin = asNumber(saved.biggestWin, state.biggestWin);
    state.totalSpent = asNumber(saved.totalSpent, state.totalSpent);
    state.totalWon = asNumber(saved.totalWon, state.totalWon);
    state.bet = BET_OPTIONS.includes(Number(saved.bet)) ? Number(saved.bet) : state.bet;
    state.lastDailyGrant = typeof saved.lastDailyGrant === "string" ? saved.lastDailyGrant : "";
    state.machineIndex = clamp(asNumber(saved.machineIndex, state.machineIndex), 0, machines.length - 1);
    state.sessionGuard = typeof saved.sessionGuard === "boolean" ? saved.sessionGuard : true;
    state.perkTier = clamp(asNumber(saved.perkTier, state.perkTier), 0, PERK_MULTIPLIERS.length - 1);
    state.perkCharge = clamp(asNumber(saved.perkCharge, state.perkCharge), 0, PERK_PROGRESS_TARGET);

    if (Array.isArray(saved.log)) {
      state.log = saved.log
        .filter((entry) => entry && typeof entry.text === "string")
        .map((entry) => ({
          type: ["win", "loss", "info"].includes(entry.type) ? entry.type : "info",
          text: entry.text,
        }))
        .slice(0, 16);
    }
  } catch (error) {
    console.warn("Failed to load save state", error);
  }
}

function saveState() {
  const payload = {
    balance: state.balance,
    spins: state.spins,
    biggestWin: state.biggestWin,
    totalSpent: state.totalSpent,
    totalWon: state.totalWon,
    bet: state.bet,
    lastDailyGrant: state.lastDailyGrant,
    machineIndex: state.machineIndex,
    sessionGuard: state.sessionGuard,
    perkTier: state.perkTier,
    perkCharge: state.perkCharge,
    log: state.log,
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
  const rounded = Math.round(value);
  return `${rounded.toLocaleString()} VC`;
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function asNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
