const BET_OPTIONS = [25, 50, 100, 200];
const DEFAULT_BET = 100;
const DAILY_GRANT = 250;
const SESSION_REMINDER_INTERVAL = 25;
const PERK_PROGRESS_TARGET = 5;
const PERK_MULTIPLIERS = [1, 1.06, 1.14, 1.24, 1.35, 1.5];
const SAVE_KEY = "starlight-spinworks-v3";
const STORE_ITEMS = [
  {
    id: "luck",
    name: "Lucky Prompt Patch",
    cost: 450,
    duration: 10,
    description: "Boosts chances for high-tier symbols for 10 spins.",
  },
  {
    id: "payout",
    name: "Payout Booster",
    cost: 520,
    duration: 8,
    description: "Adds +20% payout multiplier for 8 spins.",
  },
  {
    id: "refund",
    name: "Patch Rollback",
    cost: 340,
    duration: 10,
    description: "Refunds 35% of bet on losing spins for 10 spins.",
  },
];

const machines = [
  {
    name: "Prompt Pit",
    theme: "solar",
    flavor: "Satirical machine for clowning on unstable AI outputs.",
    jackpotBoost: 1.15,
    safetyCode: "FIX",
    special: {
      codes: ["BOT", "ERR", "LOL"],
      multiplier: 12.8,
      label: "Model Meltdown",
    },
    symbols: [
      { code: "TOK", name: "Token Spill", weight: 20, pair: 1.8, triple: 6.6 },
      { code: "BOT", name: "Bot Loop", weight: 17, pair: 2.2, triple: 8.2 },
      { code: "GPU", name: "GPU Burn", weight: 16, pair: 2.4, triple: 8.9 },
      { code: "ERR", name: "Error Stack", weight: 15, pair: 2.8, triple: 10.8 },
      { code: "LOL", name: "Meme Reply", weight: 13, pair: 3.0, triple: 11.5 },
      { code: "FIX", name: "Quick Fix", weight: 9, pair: 4.1, triple: 14.8 },
    ],
  },
  {
    name: "Hallucination Harbor",
    theme: "rift",
    flavor: "Unhinged AI seascape with wild traceback-style jackpots.",
    jackpotBoost: 1.12,
    safetyCode: "LOG",
    special: {
      codes: ["AIO", "404", "LOG"],
      multiplier: 12.3,
      label: "Traceback Storm",
    },
    symbols: [
      { code: "LAG", name: "Latency Spike", weight: 21, pair: 1.8, triple: 6.4 },
      { code: "AIO", name: "AI Oracle", weight: 17, pair: 2.1, triple: 7.9 },
      { code: "RAM", name: "RAM Surge", weight: 18, pair: 2.2, triple: 8.1 },
      { code: "NLP", name: "NLP Tangle", weight: 13, pair: 2.9, triple: 10.7 },
      { code: "404", name: "Lost Endpoint", weight: 12, pair: 3.2, triple: 12.2 },
      { code: "LOG", name: "Audit Trail", weight: 9, pair: 4.0, triple: 14.4 },
    ],
  },
  {
    name: "Token Furnace",
    theme: "neon",
    flavor: "High-energy machine where token burn meets meme-grade chaos.",
    jackpotBoost: 1.1,
    safetyCode: "DBG",
    special: {
      codes: ["TOK", "MEM", "DBG"],
      multiplier: 11.7,
      label: "Cache Explosion",
    },
    symbols: [
      { code: "RNG", name: "Random Drift", weight: 20, pair: 1.9, triple: 6.8 },
      { code: "TOK", name: "Token Burn", weight: 19, pair: 2.0, triple: 7.3 },
      { code: "BOT", name: "Bot Stampede", weight: 17, pair: 2.2, triple: 8.0 },
      { code: "MEM", name: "Memory Leak", weight: 15, pair: 2.6, triple: 9.6 },
      { code: "PTC", name: "Patch Queue", weight: 12, pair: 3.1, triple: 11.4 },
      { code: "DBG", name: "Debug Hero", weight: 10, pair: 3.8, triple: 13.8 },
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
const buffStateEl = document.getElementById("buffState");
const storeStatusEl = document.getElementById("storeStatus");
const storeButtonsEl = Array.from(document.querySelectorAll(".store-item"));
const tensionFillEl = document.getElementById("tensionFill");
const tensionTextEl = document.getElementById("tensionText");
const biggestWinCardEl = document.getElementById("biggestWinCard");
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
  storeBuffs: {
    luck: 0,
    payout: 0,
    refund: 0,
  },
  log: [],
};

let audioCtx;
let tensionTimers = [];
let tensionMeterTimer = 0;

init();

function init() {
  loadState();
  bindEvents();
  applyMachine();
  paintIdleReels();
  resetTensionMeter();

  if (state.log.length === 0) {
    pushLog("info", `${timestamp()} Session started.`);
  }

  syncUI();
  renderActivityLog();
  renderStoreButtons();
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

  for (const button of storeButtonsEl) {
    button.addEventListener("click", () => {
      buyStoreBuff(button.dataset.buff || "");
    });
  }

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

  for (const item of STORE_ITEMS) {
    const storeRule = document.createElement("li");
    storeRule.textContent = `${item.name}: ${item.description} Cost ${fmtVc(item.cost)}.`;
    payoutListEl.appendChild(storeRule);
  }
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
  const weightedSpinSymbols = applyLuckWeighting(spinSymbols);
  const spinDuration = 830 + Math.random() * 220;
  const totalSettleDuration = spinDuration + (reels.length - 1) * 170;

  setResult("Reels charged. Resolving outcome...", "info");
  triggerShake();
  pulseFlash();
  startTensionAudio(totalSettleDuration);
  startTensionMeter(totalSettleDuration);
  syncUI();

  const outcomes = [
    pickWeighted(weightedSpinSymbols),
    pickWeighted(weightedSpinSymbols),
    pickWeighted(weightedSpinSymbols),
  ];

  await Promise.all(
    outcomes.map((symbol, index) => {
      const stopAfter = spinDuration + index * 170;
      return animateReel(reels[index], symbol.code, stopAfter, spinSymbols);
    })
  );

  clearTensionAudio();
  finishTensionMeter();

  const payoutResult = calculatePayout(outcomes, state.bet, machine);
  const perkMultiplier = currentPerkMultiplier();
  let payout = Math.round(payoutResult.basePayout * perkMultiplier);
  const payoutStoreActive = state.storeBuffs.payout > 0;

  if (payoutStoreActive && payout > 0) {
    payout = Math.round(payout * 1.2);
  }

  if (payoutResult.isJackpot) {
    payout = Math.round(payout * machine.jackpotBoost);
  }

  const isNewRecord = payout > state.biggestWin;

  if (payout > 0) {
    state.balance += payout;
    state.totalWon += payout;
    state.biggestWin = Math.max(state.biggestWin, payout);
    chargePerkMeter(payout, state.bet);

    const totalMult = payout / state.bet;
    const boostNote = payoutStoreActive ? " + Booster" : "";
    setResult(`${payoutResult.label}${boostNote}. Won ${fmtVc(payout)} (${totalMult.toFixed(2)}x).`, "win");
    pushLog("win", `${timestamp()} +${fmtVc(payout)} (${payoutResult.label}${boostNote})`);

    celebrateWin({
      payout,
      isJackpot: payoutResult.isJackpot,
      multiplier: totalMult,
    });

    if (isNewRecord) {
      triggerBiggestWinShowcase(payout, totalMult);
    }
  } else {
    coolPerkMeter();
    const refundActive = state.storeBuffs.refund > 0;

    if (refundActive) {
      const refund = Math.round(state.bet * 0.35);
      state.balance += refund;
      state.totalWon += refund;
      setResult(`No line hit. Patch Rollback refunded ${fmtVc(refund)}.`, "info");
      pushLog("info", `${timestamp()} +${fmtVc(refund)} (Patch Rollback refund)`);
      showMultiplierPop("Refund 35%");
      playTone(250, 0.08, "triangle", 0.06);
    } else {
      setResult(`No payout. ${fmtVc(state.bet)} spent this spin.`, "loss");
      pushLog("loss", `${timestamp()} -${fmtVc(state.bet)} (no payout)`);
      playLossSound();
    }
  }

  if (state.sessionGuard && state.spins % SESSION_REMINDER_INTERVAL === 0) {
    pushLog("info", `${timestamp()} Reminder: ${state.spins} spins completed.`);
    setResult(`Reminder: ${state.spins} spins completed. Take a short break.`, "info");
  }

  consumeStoreBuffSpin();
  state.isSpinning = false;
  resetTensionMeter(260);

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

function applyLuckWeighting(symbols) {
  if (state.storeBuffs.luck <= 0) {
    return symbols;
  }

  const sorted = [...symbols].sort((a, b) => b.triple - a.triple);
  const boostedCodes = new Set(sorted.slice(0, 2).map((symbol) => symbol.code));

  return symbols.map((symbol) => ({
    ...symbol,
    adjustedWeight: boostedCodes.has(symbol.code) ? symbol.weight * 1.28 : symbol.weight,
  }));
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

function triggerBiggestWinShowcase(payout, multiplier) {
  biggestWinCardEl.classList.remove("record");
  void biggestWinCardEl.offsetWidth;
  biggestWinCardEl.classList.add("record");
  spawnFireworks(6);
  showMultiplierPop(`New Record ${multiplier.toFixed(2)}x`);
  playTone(500, 0.09, "triangle", 0.08);
  playTone(760, 0.13, "triangle", 0.09, 0.11);
  pushLog("info", `${timestamp()} New biggest win: ${fmtVc(payout)}.`);
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

function consumeStoreBuffSpin() {
  for (const item of STORE_ITEMS) {
    state.storeBuffs[item.id] = Math.max(0, (state.storeBuffs[item.id] || 0) - 1);
  }
}

function storeItemById(id) {
  return STORE_ITEMS.find((item) => item.id === id);
}

function buyStoreBuff(buffId) {
  const item = storeItemById(buffId);
  if (!item || state.isSpinning || state.autoSpin) {
    return;
  }

  if (state.balance < item.cost) {
    setResult(`Not enough VC for ${item.name}.`, "loss");
    playLossSound();
    return;
  }

  state.balance -= item.cost;
  state.totalSpent += item.cost;
  state.storeBuffs[item.id] = (state.storeBuffs[item.id] || 0) + item.duration;

  setResult(`${item.name} activated for ${item.duration} spins.`, "info");
  pushLog("info", `${timestamp()} Bought ${item.name}: -${fmtVc(item.cost)} (${item.duration} spins).`);
  playTone(390, 0.08, "triangle", 0.07);
  playTone(570, 0.1, "triangle", 0.08, 0.09);

  saveState();
  syncUI();
  renderActivityLog();
}

function buffSummaryText() {
  const segments = [];
  for (const item of STORE_ITEMS) {
    const spinsLeft = state.storeBuffs[item.id] || 0;
    if (spinsLeft > 0) {
      segments.push(`${item.name}: ${spinsLeft} spin${spinsLeft === 1 ? "" : "s"} left`);
    }
  }

  return segments.length > 0 ? segments.join(" | ") : "none active.";
}

function renderStoreButtons() {
  for (const button of storeButtonsEl) {
    const item = storeItemById(button.dataset.buff || "");
    if (!item) {
      continue;
    }

    const spinsLeft = state.storeBuffs[item.id] || 0;
    const suffix = spinsLeft > 0 ? ` | ${spinsLeft} left` : "";
    button.textContent = `${item.name} - ${fmtVc(item.cost)}${suffix}`;
    button.classList.toggle("active", spinsLeft > 0);
    button.disabled = state.isSpinning || state.autoSpin || state.balance < item.cost;
  }

  storeStatusEl.textContent = `Store buffs: ${buffSummaryText()}`;
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

  buffStateEl.textContent = `Store buffs: ${buffSummaryText()}`;
  renderStoreButtons();
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

function startTensionMeter(durationMs) {
  if (tensionMeterTimer) {
    clearInterval(tensionMeterTimer);
  }

  const total = Math.max(300, durationMs);
  const startedAt = performance.now();
  tensionFillEl.style.width = "0%";
  tensionTextEl.textContent = "Charging";

  const tick = () => {
    const elapsed = performance.now() - startedAt;
    const pct = Math.min(100, elapsed / total * 100);
    tensionFillEl.style.width = `${pct.toFixed(1)}%`;
    tensionTextEl.textContent = pct >= 100 ? "Locked" : `${Math.round(pct)}%`;

    if (pct >= 100) {
      clearInterval(tensionMeterTimer);
      tensionMeterTimer = 0;
    }
  };

  tick();
  tensionMeterTimer = setInterval(tick, 40);
}

function finishTensionMeter() {
  if (tensionMeterTimer) {
    clearInterval(tensionMeterTimer);
    tensionMeterTimer = 0;
  }
  tensionFillEl.style.width = "100%";
  tensionTextEl.textContent = "Locked";
}

function resetTensionMeter(delayMs = 0) {
  const runReset = () => {
    tensionFillEl.style.width = "0%";
    tensionTextEl.textContent = "Idle";
  };

  if (delayMs > 0) {
    setTimeout(runReset, delayMs);
    return;
  }

  runReset();
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
    piece.style.top = `${Math.random() * 60}%`;
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
    const savedBuffs = saved.storeBuffs && typeof saved.storeBuffs === "object" ? saved.storeBuffs : {};
    state.storeBuffs = {
      luck: clamp(asNumber(savedBuffs.luck, 0), 0, 999),
      payout: clamp(asNumber(savedBuffs.payout, 0), 0, 999),
      refund: clamp(asNumber(savedBuffs.refund, 0), 0, 999),
    };

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
    storeBuffs: state.storeBuffs,
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
