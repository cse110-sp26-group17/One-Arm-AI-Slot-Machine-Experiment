const STORAGE_KEY = "prompt-punk-slots-state-v3";
const START_BALANCE = 1500;
const DAILY_GRANT = 600;
const MAX_LOG_ENTRIES = 9;
const BET_OPTIONS = [25, 50, 100, 200, 500];
const DEFAULT_BET = 100;
const REMINDER_SPIN_INTERVAL = 60;

const SPIN_HEADLINES = [
  "Prompt queue primed. GPUs warming up...",
  "Inference pressure rising. Reel lock engaged...",
  "Token storm incoming. Hold the line...",
  "Model confidence spiking. Spin committed..."
];

const WIN_HEADLINES = [
  "Patch accepted.",
  "Token refund approved.",
  "Prompt dunk successful.",
  "Benchmark smashed."
];

const LOSS_HEADLINES = [
  "Model drifted. No line this round.",
  "Context window clipped that one.",
  "Close, but the bot dodged the roast.",
  "Resetting inference pressure."
];

const STORE_PERKS = [
  {
    id: "luckPatch",
    name: "Luck Patch",
    cost: 420,
    effectText: "8% chance per reel to upgrade into a stronger symbol at stop.",
    kind: "luck",
    value: 0.08
  },
  {
    id: "payoutKernel",
    name: "Payout Kernel",
    cost: 580,
    effectText: "Adds x1.18 payout multiplier on all winning spins.",
    kind: "payout",
    value: 1.18
  },
  {
    id: "rollbackShield",
    name: "Rollback Shield",
    cost: 510,
    effectText: "Refunds 22% of bet on non-winning spins.",
    kind: "refund",
    value: 0.22
  }
];

const MACHINES = [
  {
    id: "hallucination-highway",
    name: "Hallucination Highway",
    flavor: "Balanced chaos with regular mid-tier meme payouts.",
    accent: "#f4b042",
    machineMultiplier: 1,
    symbols: [
      { id: "token", label: "TOKEN", weight: 22, payout2: 1.4, payout3: 3.9, color: "#ffd166" },
      { id: "meme", label: "MEME", weight: 18, payout2: 1.8, payout3: 4.8, color: "#7ae582" },
      { id: "cache", label: "CACHE", weight: 14, payout2: 2.1, payout3: 6.1, color: "#8ecae6" },
      { id: "patch", label: "PATCH", weight: 10, payout2: 2.7, payout3: 8.6, color: "#ffadad" },
      { id: "roast", label: "ROAST", weight: 6, payout2: 3.3, payout3: 11.2, color: "#caffbf" },
      { id: "wild", label: "WILD", weight: 3, payout2: 4.2, payout3: 15.5, color: "#f9c74f" }
    ]
  },
  {
    id: "prompt-panic",
    name: "Prompt Panic",
    flavor: "Higher variance and sharper top-end triples.",
    accent: "#ff7b54",
    machineMultiplier: 1.08,
    symbols: [
      { id: "coin", label: "COIN", weight: 25, payout2: 1.3, payout3: 3.4, color: "#ffd166" },
      { id: "spam", label: "SPAM", weight: 16, payout2: 1.9, payout3: 5.2, color: "#f4a261" },
      { id: "bug", label: "BUG", weight: 12, payout2: 2.3, payout3: 6.8, color: "#e9edc9" },
      { id: "lag", label: "LAG", weight: 9, payout2: 2.9, payout3: 9.6, color: "#ffcad4" },
      { id: "ban", label: "BAN", weight: 5, payout2: 3.6, payout3: 12.8, color: "#bde0fe" },
      { id: "wild", label: "WILD", weight: 2, payout2: 4.8, payout3: 18.2, color: "#ffd166" }
    ]
  },
  {
    id: "datacenter-drama",
    name: "Datacenter Drama",
    flavor: "Steadier pacing with strong perk synergy.",
    accent: "#66d9e8",
    machineMultiplier: 0.94,
    symbols: [
      { id: "stack", label: "STACK", weight: 24, payout2: 1.5, payout3: 3.8, color: "#c7f9cc" },
      { id: "queue", label: "QUEUE", weight: 17, payout2: 1.9, payout3: 4.9, color: "#90e0ef" },
      { id: "trace", label: "TRACE", weight: 13, payout2: 2.2, payout3: 6.4, color: "#a0c4ff" },
      { id: "panic", label: "PANIC", weight: 10, payout2: 2.8, payout3: 8.9, color: "#ffc6ff" },
      { id: "flame", label: "FLAME", weight: 5, payout2: 3.4, payout3: 11.7, color: "#bdb2ff" },
      { id: "wild", label: "WILD", weight: 2, payout2: 4.3, payout3: 16.7, color: "#ffcf56" }
    ]
  }
];

for (const machine of MACHINES) {
  machine.weightedPool = buildWeightedPool(machine.symbols);
  machine.boostedPool = buildBoostedPool(machine.symbols);
}

const reels = [
  document.querySelector("#reel-0"),
  document.querySelector("#reel-1"),
  document.querySelector("#reel-2")
];

const appShell = document.querySelector(".app-shell");
const screenFlash = document.querySelector("#screen-flash");
const fireworksLayer = document.querySelector("#fireworks-layer");
const machineName = document.querySelector("#machine-name");
const machineFlavor = document.querySelector("#machine-flavor");
const balanceValue = document.querySelector("#balance-value");
const betValue = document.querySelector("#bet-value");
const perkValue = document.querySelector("#perk-value");
const biggestValue = document.querySelector("#biggest-value");
const spentValue = document.querySelector("#spent-value");
const wonValue = document.querySelector("#won-value");
const refundsValue = document.querySelector("#refunds-value");
const netValue = document.querySelector("#net-value");
const spinsValue = document.querySelector("#spins-value");
const spinTension = document.querySelector("#spin-tension");
const tensionMeter = document.querySelector("#tension-meter");
const tensionFill = document.querySelector("#tension-fill");
const headline = document.querySelector("#headline");
const payoutRules = document.querySelector("#payout-rules");
const biggestWinText = document.querySelector("#biggest-win-text");
const multiplierPopups = document.querySelector("#multiplier-popups");
const perkStore = document.querySelector("#perk-store");
const perkSummary = document.querySelector("#perk-summary");
const winLog = document.querySelector("#win-log");
const sessionLog = document.querySelector("#session-log");
const betStrip = document.querySelector("#bet-strip");
const spinBtn = document.querySelector("#spin-btn");
const autospinBtn = document.querySelector("#autospin-btn");
const stopBtn = document.querySelector("#stop-btn");
const dailyBtn = document.querySelector("#daily-btn");
const prevMachineBtn = document.querySelector("#prev-machine");
const nextMachineBtn = document.querySelector("#next-machine");

let state = loadState();
let isSpinning = false;
let isAutospin = false;
let autospinNonce = 0;
let audioCtx = null;

const READY_SYMBOL = { id: "ready", label: "READY", color: "#f4f1df" };

initialize();

function initialize() {
  state.bet = BET_OPTIONS.includes(state.bet) ? state.bet : DEFAULT_BET;
  state.machineIndex = clamp(state.machineIndex, 0, MACHINES.length - 1);
  state.storePerks = sanitizeStorePerks(state.storePerks);
  state.refunds = asFiniteNumber(state.refunds, 0);

  for (const reel of reels) {
    setReelSymbol(reel, READY_SYMBOL);
  }
  setTensionState(0, 1);

  bindEvents();
  renderAll();
}

function bindEvents() {
  spinBtn.addEventListener("click", () => {
    void spinOnce("manual");
  });

  autospinBtn.addEventListener("click", () => {
    void startAutospin();
  });

  stopBtn.addEventListener("click", () => {
    stopAutospin("Autospin stopped.");
  });

  dailyBtn.addEventListener("click", () => {
    claimDailyGrant();
  });

  prevMachineBtn.addEventListener("click", () => {
    cycleMachine(-1);
  });

  nextMachineBtn.addEventListener("click", () => {
    cycleMachine(1);
  });

  for (const chip of betStrip.querySelectorAll(".bet-chip")) {
    chip.addEventListener("click", () => {
      const value = Number.parseInt(chip.dataset.bet || "0", 10);
      setBet(value);
    });
  }

  perkStore.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button[data-perk-id]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    purchasePerk(button.dataset.perkId || "");
  });
}

function currentMachine() {
  return MACHINES[state.machineIndex];
}

function setBet(nextBet) {
  if (isSpinning || isAutospin) {
    return;
  }

  if (!BET_OPTIONS.includes(nextBet)) {
    return;
  }

  state.bet = nextBet;
  persistState();
  renderAll();

  if (state.balance < state.bet) {
    setHeadline("Current balance is below the selected bet.");
  }
}

function cycleMachine(direction) {
  if (isSpinning || isAutospin) {
    return;
  }

  const total = MACHINES.length;
  state.machineIndex = (state.machineIndex + direction + total) % total;
  const machine = currentMachine();

  for (const reel of reels) {
    setReelSymbol(reel, weightedPick(machine.weightedPool));
  }

  setHeadline(`${machine.name} loaded.`);
  persistState();
  renderAll();
}

function purchasePerk(perkId) {
  if (isSpinning || isAutospin) {
    return;
  }

  const perk = STORE_PERKS.find((entry) => entry.id === perkId);
  if (!perk) {
    return;
  }

  if (state.storePerks[perkId]) {
    setHeadline(`${perk.name} is already installed.`);
    playSound("blocked");
    return;
  }

  if (state.balance < perk.cost) {
    setHeadline(`Need ${formatVc(perk.cost)} to buy ${perk.name}.`);
    playSound("blocked");
    return;
  }

  state.balance -= perk.cost;
  state.spent += perk.cost;
  state.storePerks[perkId] = true;
  pushSessionEntry(`Store purchase: ${perk.name} -${formatVc(perk.cost)}.`);
  showMultiplierPopups([`${perk.name} online`]);
  playSound("perk");
  triggerFlash(false);
  triggerShake("soft");
  setHeadline(`${perk.name} installed.`);

  persistState();
  renderAll();
}

function claimDailyGrant() {
  if (isSpinning || isAutospin) {
    return;
  }

  const today = dayKey(new Date());
  if (state.lastDailyClaimDay === today) {
    setHeadline("Daily grant already claimed. Come back tomorrow.");
    playSound("blocked");
    renderAll();
    return;
  }

  state.balance += DAILY_GRANT;
  state.lastDailyClaimDay = today;
  pushSessionEntry(`Daily grant claimed +${formatVc(DAILY_GRANT)}.`);
  setHeadline(`Daily grant secured: +${formatVc(DAILY_GRANT)}.`);
  playSound("daily");
  triggerFlash(false);
  triggerShake("soft");

  persistState();
  renderAll();
}

async function startAutospin() {
  if (isAutospin || isSpinning) {
    return;
  }

  if (state.balance < state.bet) {
    setHeadline("Not enough VC for autospin.");
    playSound("blocked");
    return;
  }

  isAutospin = true;
  autospinNonce += 1;
  const runNonce = autospinNonce;
  setHeadline("Autospin active. Stop anytime.");
  renderAll();

  while (isAutospin && runNonce === autospinNonce) {
    const ok = await spinOnce("auto");
    if (!ok) {
      break;
    }

    if (!isAutospin || runNonce !== autospinNonce) {
      break;
    }

    await sleep(90);
  }

  if (runNonce === autospinNonce) {
    isAutospin = false;
    renderAll();

    if (state.balance < state.bet) {
      setHeadline("Autospin stopped: insufficient VC.");
    }
  }
}

function stopAutospin(message) {
  if (!isAutospin) {
    return;
  }

  isAutospin = false;
  autospinNonce += 1;
  setHeadline(message);
  playSound("stop");
  renderAll();
}

async function spinOnce(mode) {
  if (isSpinning) {
    return false;
  }

  if (state.balance < state.bet) {
    if (mode === "auto") {
      isAutospin = false;
    }
    setHeadline("Balance too low for that bet.");
    playSound("blocked");
    renderAll();
    return false;
  }

  isSpinning = true;
  const machine = currentMachine();

  state.balance -= state.bet;
  state.spent += state.bet;
  state.spins += 1;
  updatePerkLevel();

  const perkMultiplier = getPerkMultiplier();
  const storePayoutMultiplier = getStorePayoutMultiplier();
  const luckBoost = getLuckBoost();
  setHeadline(randomFrom(SPIN_HEADLINES));
  pushSessionEntry(`Spin -${formatVc(state.bet)} on ${machine.name}.`);
  persistState();
  renderAll();

  animateTension(1300, perkMultiplier * storePayoutMultiplier);
  playSpinTension(1200);
  triggerFlash(false);
  triggerShake("soft");

  const resultSymbols = await Promise.all([
    spinReel(reels[0], 760, machine, luckBoost),
    spinReel(reels[1], 1030, machine, luckBoost),
    spinReel(reels[2], 1290, machine, luckBoost)
  ]);

  const outcome = evaluateOutcome(resultSymbols, state.bet, machine, perkMultiplier, storePayoutMultiplier);

  if (outcome.payout > 0) {
    state.balance += outcome.payout;
    state.won += outcome.payout;

    const payoutText = `${outcome.reason} +${formatVc(outcome.payout)} (x${formatMultiplier(outcome.totalMultiplier)})`;
    pushWinEntry(payoutText);
    pushSessionEntry(`Win +${formatVc(outcome.payout)} via ${outcome.reason}.`);

    setHeadline(`${randomFrom(WIN_HEADLINES)} ${outcome.reason} paid ${formatVc(outcome.payout)}.`);
    triggerWinEffects(outcome);

    if (outcome.payout > state.biggestWin.amount) {
      state.biggestWin = {
        amount: outcome.payout,
        machine: machine.name,
        reason: outcome.reason,
        multiplier: outcome.totalMultiplier
      };
      setHeadline(`New biggest win: ${formatVc(outcome.payout)} on ${machine.name}!`);
      triggerFireworks();
      playSound("jackpot");
    }
  } else {
    state.losses += state.bet;
    const reelText = resultSymbols.map((symbol) => symbol.label).join(" / ");
    let refunded = 0;
    const refundRate = getRefundRate();

    if (refundRate > 0) {
      refunded = Math.max(1, Math.round(state.bet * refundRate));
      state.balance += refunded;
      state.refunds += refunded;
      pushSessionEntry(`Rollback Shield refunded +${formatVc(refunded)}.`);
      showMultiplierPopups([`Refund +${formatVc(refunded)}`]);
      playSound("perk");
    }

    const lossLine = refunded > 0 ? `No payout (${reelText}). Refund +${formatVc(refunded)}.` : `No payout (${reelText}).`;
    pushSessionEntry(lossLine);
    setHeadline(refunded > 0 ? `${randomFrom(LOSS_HEADLINES)} Refund triggered.` : randomFrom(LOSS_HEADLINES));
    playSound("lose");
    setTensionState(1, 1);
  }

  if (state.spins % REMINDER_SPIN_INTERVAL === 0) {
    pushSessionEntry("Reminder: take a short break and check your net result.");
    setHeadline("Break reminder: stretch, hydrate, then decide your next spin.");
  }

  persistState();
  isSpinning = false;
  renderAll();
  window.setTimeout(() => {
    if (!isSpinning) {
      setTensionState(0, 1);
    }
  }, 180);

  if (mode === "auto" && state.balance < state.bet) {
    isAutospin = false;
  }

  return true;
}

function evaluateOutcome(resultSymbols, bet, machine, perkMultiplier, storePayoutMultiplier) {
  const ids = resultSymbols.map((symbol) => symbol.id);
  const counts = {};

  for (const id of ids) {
    counts[id] = (counts[id] || 0) + 1;
  }

  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topId, topCount] = ordered[0];
  const topSymbol = machine.symbols.find((symbol) => symbol.id === topId);

  const premiumSymbols = [...machine.symbols]
    .filter((symbol) => symbol.id !== "wild")
    .sort((a, b) => b.payout3 - a.payout3)
    .slice(0, 2);
  const hasLegendaryCombo =
    ids.includes("wild") && premiumSymbols.length === 2 && premiumSymbols.every((symbol) => ids.includes(symbol.id));

  let baseMultiplier = 0;
  let reason = "No line";
  let jackpot = false;

  if (hasLegendaryCombo) {
    baseMultiplier = (premiumSymbols[0].payout3 + premiumSymbols[1].payout3) / 2;
    reason = `${premiumSymbols[0].label}/${premiumSymbols[1].label}/WILD combo`;
    jackpot = true;
  } else if (topCount === 3) {
    baseMultiplier = topSymbol.payout3;
    reason = `Triple ${topSymbol.label}`;
    jackpot = baseMultiplier >= 11;
  } else if (topCount === 2) {
    baseMultiplier = topSymbol.payout2;
    reason = `Pair ${topSymbol.label}`;
  }

  if (baseMultiplier <= 0) {
    return {
      payout: 0,
      reason,
      baseMultiplier: 0,
      machineMultiplier: machine.machineMultiplier,
      perkMultiplier,
      storePayoutMultiplier,
      totalMultiplier: 0,
      jackpot: false
    };
  }

  const totalMultiplier = baseMultiplier * machine.machineMultiplier * perkMultiplier * storePayoutMultiplier;
  const payout = Math.max(1, Math.round(bet * totalMultiplier));

  return {
    payout,
    reason,
    baseMultiplier,
    machineMultiplier: machine.machineMultiplier,
    perkMultiplier,
    storePayoutMultiplier,
    totalMultiplier,
    jackpot
  };
}

function triggerWinEffects(outcome) {
  const confettiCount = outcome.jackpot ? 150 : 80;
  triggerFlash(true);
  triggerShake(outcome.jackpot ? "hard" : "soft");
  dropConfetti(confettiCount);
  showMultiplierPopups([
    `Base x${formatMultiplier(outcome.baseMultiplier)}`,
    `Machine x${formatMultiplier(outcome.machineMultiplier)}`,
    `Perk x${formatMultiplier(outcome.perkMultiplier)}`,
    `Store x${formatMultiplier(outcome.storePayoutMultiplier)}`,
    `Total x${formatMultiplier(outcome.totalMultiplier)}`
  ]);

  if (outcome.jackpot) {
    triggerFireworks();
    playSound("jackpot");
  } else {
    playSound("win");
  }
}

function spinReel(reelElement, durationMs, machine, luckBoost) {
  return new Promise((resolve) => {
    reelElement.classList.add("spinning");

    const teaseTimer = window.setInterval(() => {
      setReelSymbol(reelElement, weightedPick(machine.weightedPool));
    }, 55);

    window.setTimeout(() => {
      window.clearInterval(teaseTimer);
      const finalSymbol = pickFinalSymbol(machine, luckBoost);
      setReelSymbol(reelElement, finalSymbol);
      reelElement.classList.remove("spinning");
      resolve(finalSymbol);
    }, durationMs);
  });
}

function pickFinalSymbol(machine, luckBoost) {
  let symbol = weightedPick(machine.weightedPool);
  if (luckBoost <= 0) {
    return symbol;
  }

  if (Math.random() > luckBoost) {
    return symbol;
  }

  const boosted = weightedPick(machine.boostedPool);
  if (boosted.payout3 >= symbol.payout3) {
    symbol = boosted;
  }
  return symbol;
}

function setReelSymbol(reelElement, symbol) {
  reelElement.dataset.symbol = symbol.id;
  reelElement.style.setProperty("--symbol-color", symbol.color);
  const span = reelElement.querySelector("span");
  span.textContent = symbol.label;
}

function updatePerkLevel() {
  const previous = state.perkLevel;
  state.perkLevel = Math.min(8, Math.floor(state.spins / 10));

  if (state.perkLevel > previous) {
    const value = getPerkMultiplier();
    showMultiplierPopups([`Perk Up x${formatMultiplier(value)}`]);
    pushSessionEntry(`Perk boosted to x${formatMultiplier(value)}.`);
    playSound("perk");
  }
}

function getPerkMultiplier() {
  return 1 + state.perkLevel * 0.07;
}

function getStorePayoutMultiplier() {
  return state.storePerks.payoutKernel ? 1.18 : 1;
}

function getLuckBoost() {
  return state.storePerks.luckPatch ? 0.08 : 0;
}

function getRefundRate() {
  return state.storePerks.rollbackShield ? 0.22 : 0;
}

function showMultiplierPopups(lines) {
  for (const text of lines) {
    const item = document.createElement("span");
    item.className = "multiplier-popup";
    item.textContent = text;
    item.style.left = `${20 + Math.random() * 60}%`;
    item.style.animationDelay = `${Math.random() * 120}ms`;
    multiplierPopups.append(item);

    window.setTimeout(() => {
      item.remove();
    }, 1400);
  }
}

function animateTension(durationMs, tensionBoost) {
  const started = performance.now();

  const frame = (now) => {
    if (!isSpinning) {
      setTensionState(0, 1);
      return;
    }

    const progress = clamp((now - started) / durationMs, 0, 1);
    const value = 1 + progress * 1.6 + (tensionBoost - 1) * 0.5;
    setTensionState(progress, value);

    if (progress < 1) {
      window.requestAnimationFrame(frame);
    }
  };

  window.requestAnimationFrame(frame);
}

function setTensionState(progress, value) {
  const percent = Math.round(clamp(progress, 0, 1) * 100);
  tensionFill.style.width = `${percent}%`;
  tensionMeter.setAttribute("aria-valuenow", String(percent));
  spinTension.textContent = `Tension x${formatMultiplier(value)}`;
}

function triggerShake(level) {
  const className = level === "hard" ? "shake-hard" : "shake-soft";
  appShell.classList.remove("shake-soft", "shake-hard");
  void appShell.offsetWidth;
  appShell.classList.add(className);

  window.setTimeout(() => {
    appShell.classList.remove(className);
  }, level === "hard" ? 420 : 240);
}

function triggerFlash(intense) {
  screenFlash.classList.remove("active", "intense");
  void screenFlash.offsetWidth;
  screenFlash.classList.add("active");
  if (intense) {
    screenFlash.classList.add("intense");
  }

  window.setTimeout(() => {
    screenFlash.classList.remove("active", "intense");
  }, intense ? 240 : 160);
}

function triggerFireworks() {
  fireworksLayer.classList.remove("active");
  void fireworksLayer.offsetWidth;
  fireworksLayer.classList.add("active");

  window.setTimeout(() => {
    fireworksLayer.classList.remove("active");
  }, 1300);
}

function dropConfetti(count) {
  const colors = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#f8edeb"];

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = "-8px";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.transform = `translateY(0) rotate(${Math.random() * 360}deg)`;
    piece.style.animationDuration = `${1200 + Math.random() * 900}ms`;
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    document.body.append(piece);

    window.setTimeout(() => {
      piece.remove();
    }, 2200);
  }
}

function renderAll() {
  const machine = currentMachine();
  const perkMultiplier = getPerkMultiplier();
  const storePayoutMultiplier = getStorePayoutMultiplier();
  const totalPayoutMultiplier = perkMultiplier * storePayoutMultiplier;
  const net = state.won + state.refunds - state.spent;
  const canAffordBet = state.balance >= state.bet;

  machineName.textContent = machine.name;
  machineFlavor.textContent = machine.flavor;
  document.documentElement.style.setProperty("--machine-accent", machine.accent);

  balanceValue.textContent = formatVc(state.balance);
  betValue.textContent = formatVc(state.bet);
  perkValue.textContent = `x${formatMultiplier(totalPayoutMultiplier)}`;
  biggestValue.textContent = formatVc(state.biggestWin.amount);
  spentValue.textContent = formatVc(state.spent);
  wonValue.textContent = formatVc(state.won);
  refundsValue.textContent = formatVc(state.refunds);
  spinsValue.textContent = formatNumber(state.spins);
  netValue.textContent = `${net > 0 ? "+" : ""}${formatVc(net)}`;
  netValue.classList.toggle("positive", net > 0);
  netValue.classList.toggle("negative", net < 0);

  for (const chip of betStrip.querySelectorAll(".bet-chip")) {
    const value = Number.parseInt(chip.dataset.bet || "0", 10);
    chip.classList.toggle("active", value === state.bet);
    chip.disabled = isSpinning || isAutospin;
  }

  spinBtn.disabled = isSpinning || isAutospin || !canAffordBet;
  autospinBtn.disabled = isSpinning || isAutospin || !canAffordBet;
  autospinBtn.textContent = isAutospin ? "Autospinning..." : "Autospin";
  stopBtn.disabled = !isAutospin;
  prevMachineBtn.disabled = isSpinning || isAutospin;
  nextMachineBtn.disabled = isSpinning || isAutospin;

  const claimedToday = state.lastDailyClaimDay === dayKey(new Date());
  dailyBtn.disabled = claimedToday || isSpinning || isAutospin;
  dailyBtn.textContent = claimedToday ? "Daily Claimed" : `Daily VC +${formatNumber(DAILY_GRANT)}`;

  renderBiggestWin();
  renderPerkStore();
  renderPerkSummary();
  renderPayoutRules(machine);
  renderLogs(winLog, state.winLog, "No wins yet.");
  renderLogs(sessionLog, state.sessionLog, "No session entries yet.");
}

function renderBiggestWin() {
  if (state.biggestWin.amount <= 0) {
    biggestWinText.textContent = "No wins yet.";
    return;
  }

  biggestWinText.textContent = `${formatVc(state.biggestWin.amount)} on ${state.biggestWin.machine} (${state.biggestWin.reason}, x${formatMultiplier(state.biggestWin.multiplier)}).`;
}

function renderPerkStore() {
  perkStore.textContent = "";

  for (const perk of STORE_PERKS) {
    const owned = !!state.storePerks[perk.id];
    const card = document.createElement("article");
    card.className = "perk-card";
    if (owned) {
      card.classList.add("owned");
    }

    const header = document.createElement("div");
    header.className = "perk-card-header";

    const title = document.createElement("h4");
    title.textContent = perk.name;

    const cost = document.createElement("span");
    cost.className = "cost";
    cost.textContent = owned ? "Owned" : formatVc(perk.cost);

    header.append(title, cost);

    const text = document.createElement("p");
    text.textContent = perk.effectText;

    const button = document.createElement("button");
    button.className = "perk-buy";
    button.dataset.perkId = perk.id;
    button.textContent = owned ? "Installed" : "Buy";
    button.disabled = owned || isSpinning || isAutospin || state.balance < perk.cost;

    card.append(header, text, button);
    perkStore.append(card);
  }
}

function renderPerkSummary() {
  const active = STORE_PERKS.filter((perk) => state.storePerks[perk.id]);
  if (active.length === 0) {
    perkSummary.textContent = "No store perks purchased yet.";
    return;
  }

  perkSummary.textContent = `Active perks: ${active.map((perk) => perk.name).join(" | ")}`;
}

function renderPayoutRules(machine) {
  payoutRules.textContent = "";

  const boost = document.createElement("li");
  boost.textContent = `Machine boost: x${formatMultiplier(machine.machineMultiplier)}`;
  payoutRules.append(boost);

  const sorted = [...machine.symbols].sort((a, b) => b.payout3 - a.payout3).slice(0, 5);
  for (const symbol of sorted) {
    const li = document.createElement("li");
    const pair = symbol.payout2 * machine.machineMultiplier;
    const triple = symbol.payout3 * machine.machineMultiplier;
    li.textContent = `${symbol.label}: Pair x${formatMultiplier(pair)} | Triple x${formatMultiplier(triple)}`;
    payoutRules.append(li);
  }

  const perk = document.createElement("li");
  perk.textContent = `Spin multiplier: x${formatMultiplier(getPerkMultiplier())}`;
  payoutRules.append(perk);

  const storeBoost = document.createElement("li");
  storeBoost.textContent = `Store payout boost: x${formatMultiplier(getStorePayoutMultiplier())}`;
  payoutRules.append(storeBoost);

  const luckBoost = document.createElement("li");
  luckBoost.textContent = `Luck upgrade chance per reel: ${Math.round(getLuckBoost() * 100)}%`;
  payoutRules.append(luckBoost);

  const refund = document.createElement("li");
  refund.textContent = `Loss refund rate: ${Math.round(getRefundRate() * 100)}%`;
  payoutRules.append(refund);
}

function renderLogs(listElement, entries, emptyMessage) {
  listElement.textContent = "";

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyMessage;
    listElement.append(li);
    return;
  }

  for (const entry of entries) {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.textContent = new Date(entry.time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const text = document.createElement("span");
    text.textContent = entry.text;

    li.append(time, text);
    listElement.append(li);
  }
}

function pushWinEntry(text) {
  state.winLog.unshift({ time: Date.now(), text });
  while (state.winLog.length > MAX_LOG_ENTRIES) {
    state.winLog.pop();
  }
}

function pushSessionEntry(text) {
  state.sessionLog.unshift({ time: Date.now(), text });
  while (state.sessionLog.length > MAX_LOG_ENTRIES) {
    state.sessionLog.pop();
  }
}

function setHeadline(text) {
  headline.textContent = text;
}

function defaultStorePerks() {
  const defaults = {};
  for (const perk of STORE_PERKS) {
    defaults[perk.id] = false;
  }
  return defaults;
}

function sanitizeStorePerks(value) {
  const safe = defaultStorePerks();
  if (!value || typeof value !== "object") {
    return safe;
  }

  for (const perk of STORE_PERKS) {
    safe[perk.id] = Boolean(value[perk.id]);
  }
  return safe;
}

function defaultState() {
  return {
    balance: START_BALANCE,
    spent: 0,
    won: 0,
    refunds: 0,
    losses: 0,
    bet: DEFAULT_BET,
    spins: 0,
    perkLevel: 0,
    machineIndex: 0,
    lastDailyClaimDay: "",
    storePerks: defaultStorePerks(),
    winLog: [],
    sessionLog: [],
    biggestWin: {
      amount: 0,
      machine: "",
      reason: "",
      multiplier: 0
    }
  };
}

function loadState() {
  const fallback = defaultState();
  let parsed;

  try {
    parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }

  const biggest = parsed.biggestWin && typeof parsed.biggestWin === "object" ? parsed.biggestWin : {};

  return {
    balance: asFiniteNumber(parsed.balance, fallback.balance),
    spent: asFiniteNumber(parsed.spent, fallback.spent),
    won: asFiniteNumber(parsed.won, fallback.won),
    refunds: asFiniteNumber(parsed.refunds, fallback.refunds),
    losses: asFiniteNumber(parsed.losses, fallback.losses),
    bet: asFiniteNumber(parsed.bet, fallback.bet),
    spins: asFiniteNumber(parsed.spins, fallback.spins),
    perkLevel: asFiniteNumber(parsed.perkLevel, fallback.perkLevel),
    machineIndex: asFiniteNumber(parsed.machineIndex, fallback.machineIndex),
    lastDailyClaimDay: typeof parsed.lastDailyClaimDay === "string" ? parsed.lastDailyClaimDay : "",
    storePerks: sanitizeStorePerks(parsed.storePerks),
    winLog: sanitizeLogs(parsed.winLog),
    sessionLog: sanitizeLogs(parsed.sessionLog),
    biggestWin: {
      amount: asFiniteNumber(biggest.amount, 0),
      machine: typeof biggest.machine === "string" ? biggest.machine : "",
      reason: typeof biggest.reason === "string" ? biggest.reason : "",
      multiplier: asFiniteNumber(biggest.multiplier, 0)
    }
  };
}

function sanitizeLogs(logs) {
  if (!Array.isArray(logs)) {
    return [];
  }

  return logs
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_LOG_ENTRIES)
    .map((entry) => ({
      time: asFiniteNumber(entry.time, Date.now()),
      text: String(entry.text || "")
    }));
}

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildWeightedPool(symbols) {
  const pool = [];
  let runningWeight = 0;

  for (const symbol of symbols) {
    runningWeight += symbol.weight;
    pool.push({ cumulativeWeight: runningWeight, symbol });
  }

  return pool;
}

function buildBoostedPool(symbols) {
  const boostedSymbols = symbols.map((symbol) => ({
    ...symbol,
    weight: symbol.weight * (1 + symbol.payout3 / 15)
  }));
  return buildWeightedPool(boostedSymbols);
}

function weightedPick(pool) {
  const max = pool[pool.length - 1].cumulativeWeight;
  const point = Math.random() * max;

  for (const entry of pool) {
    if (point <= entry.cumulativeWeight) {
      return entry.symbol;
    }
  }

  return pool[pool.length - 1].symbol;
}

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return;
  }

  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return;
  }

  audioCtx = new Context();
}

function playToneAt(freq, startOffset, duration, type, gainValue) {
  if (!audioCtx) {
    return;
  }

  const now = audioCtx.currentTime + startOffset;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playSpinTension(durationMs) {
  initAudio();
  if (!audioCtx) {
    return;
  }

  const steps = 10;
  for (let i = 0; i < steps; i += 1) {
    const offset = (i * durationMs) / steps / 1000;
    const freq = 170 + i * 28;
    playToneAt(freq, offset, 0.09, "square", 0.022 + i * 0.002);
  }
}

function playSound(kind) {
  initAudio();
  if (!audioCtx) {
    return;
  }

  switch (kind) {
    case "win":
      playToneAt(480, 0, 0.11, "triangle", 0.06);
      playToneAt(690, 0.08, 0.12, "triangle", 0.055);
      playToneAt(920, 0.17, 0.15, "triangle", 0.05);
      break;
    case "jackpot":
      playToneAt(520, 0, 0.15, "sawtooth", 0.07);
      playToneAt(780, 0.1, 0.15, "triangle", 0.065);
      playToneAt(1120, 0.2, 0.2, "triangle", 0.06);
      break;
    case "lose":
      playToneAt(220, 0, 0.11, "sine", 0.03);
      playToneAt(150, 0.09, 0.12, "sine", 0.03);
      break;
    case "blocked":
      playToneAt(130, 0, 0.1, "square", 0.025);
      break;
    case "daily":
      playToneAt(360, 0, 0.1, "triangle", 0.045);
      playToneAt(540, 0.1, 0.1, "triangle", 0.045);
      break;
    case "perk":
      playToneAt(420, 0, 0.07, "triangle", 0.04);
      playToneAt(630, 0.08, 0.08, "triangle", 0.04);
      break;
    case "stop":
      playToneAt(210, 0, 0.08, "square", 0.03);
      break;
    default:
      break;
  }
}

function formatVc(value) {
  return `${formatNumber(value)} VC`;
}

function formatMultiplier(value) {
  return value.toFixed(2);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function asFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
