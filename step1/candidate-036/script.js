const STORAGE_KEY = "arcade-slot-lab-state";
const STARTING_BALANCE = 2400;
const DAILY_GRANT = 350;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BET_OPTIONS = [25, 50, 100, 250];
const MAX_HISTORY = 12;
const MAX_WIN_HISTORY = 12;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const numberFormatter = new Intl.NumberFormat("en-US");

const SYMBOLS = [
  { key: "GEM", label: "GEM", sub: "shiny classic jackpot fuel", weight: 14, triple: 10 },
  { key: "COIN", label: "COIN", sub: "steady payout currency", weight: 18, triple: 8 },
  { key: "STAR", label: "STAR", sub: "rare premium flash", weight: 9, triple: 14 },
  { key: "BELL", label: "BELL", sub: "arcade bell ring", weight: 12, triple: 11 },
  { key: "ROCKET", label: "ROCKET", sub: "high-voltage momentum", weight: 10, triple: 12 },
  { key: "CHERRY", label: "CHERRY", sub: "vintage machine charm", weight: 16, triple: 7 },
  { key: "DIAMOND", label: "DIAMOND", sub: "ultra rare hit", weight: 7, triple: 16 },
  { key: "CROWN", label: "CROWN", sub: "top-tier prestige spin", weight: 8, triple: 15 },
];

const SPECIAL_COMBOS = {
  "COIN|GEM|STAR": {
    multiplier: 5,
    headline: "Treasure line",
    detail: "Core symbol trio aligned for a premium combo payout.",
  },
  "BELL|CHERRY|ROCKET": {
    multiplier: 5,
    headline: "Arcade rush",
    detail: "Old-school charm and speed merged into a combo hit.",
  },
  "CROWN|DIAMOND|STAR": {
    multiplier: 5,
    headline: "Royal flare",
    detail: "Rare symbols aligned in the spotlight lane.",
  },
};

const MACHINES = [
  {
    name: "Neon Mirage",
    status: "Fast reels, balanced payouts",
    machineBonus: 0.08,
    speedBonus: 0,
    accentClass: "theme-neon",
  },
  {
    name: "Solar Vault",
    status: "Slightly slower reels, stronger perk bonus",
    machineBonus: 0.14,
    speedBonus: 80,
    accentClass: "theme-solar",
  },
  {
    name: "Frost Pulse",
    status: "Snappiest reel timing with moderate bonus",
    machineBonus: 0.1,
    speedBonus: -70,
    accentClass: "theme-frost",
  },
];

const state = loadState();

const elements = {
  root: document.querySelector("#machine-root"),
  cabinetFrame: document.querySelector("#cabinet-frame"),
  screenFlash: document.querySelector("#screen-flash"),
  balance: document.querySelector("#balance"),
  betDisplay: document.querySelector("#bet-display"),
  perkMultiplier: document.querySelector("#perk-multiplier"),
  bestWin: document.querySelector("#best-win"),
  bestWinLabel: document.querySelector("#best-win-label"),
  spinButton: document.querySelector("#spin-button"),
  autoSpinButton: document.querySelector("#autospin-button"),
  stopAutoSpinButton: document.querySelector("#stop-autospin-button"),
  dailyButton: document.querySelector("#daily-button"),
  dailyTimer: document.querySelector("#daily-timer"),
  prevMachine: document.querySelector("#prev-machine"),
  nextMachine: document.querySelector("#next-machine"),
  machineName: document.querySelector("#machine-name"),
  carouselName: document.querySelector("#carousel-name"),
  chipGrid: document.querySelector("#chip-grid"),
  reels: Array.from(document.querySelectorAll(".reel")),
  headline: document.querySelector("#headline"),
  subheadline: document.querySelector("#subheadline"),
  statusPill: document.querySelector("#status-pill"),
  netBadge: document.querySelector("#net-badge"),
  history: document.querySelector("#history"),
  winHistory: document.querySelector("#win-history"),
  burstLayer: document.querySelector("#burst-layer"),
  liveRegion: document.querySelector("#live-region"),
  showcase: document.querySelector("#showcase"),
  showcaseTitle: document.querySelector("#showcase-title"),
  showcaseDetail: document.querySelector("#showcase-detail"),
};

let autoSpinTimer = null;
let dailyTimerInterval = null;
let audioContext;

render();
syncControls();
applyMachineTheme();
updateDailyClaimUI();
startDailyTicker();

elements.chipGrid.addEventListener("click", (event) => {
  const target = event.target.closest("[data-bet]");
  if (!target || state.spinning || state.autospinActive) {
    return;
  }

  state.bet = Number(target.dataset.bet);
  render();
  saveState();
});

elements.spinButton.addEventListener("click", () => {
  spin("manual");
});

elements.autoSpinButton.addEventListener("click", () => {
  if (state.autospinActive || state.spinning) {
    return;
  }

  state.autospinActive = true;
  pulseStatus("Auto-spin active");
  queueAutoSpin(10);
  syncControls();
  saveState();
});

elements.stopAutoSpinButton.addEventListener("click", () => {
  stopAutoSpin("Auto-spin stopped");
});

elements.dailyButton.addEventListener("click", () => {
  claimDailyVC();
});

elements.prevMachine.addEventListener("click", () => {
  changeMachine(-1);
});

elements.nextMachine.addEventListener("click", () => {
  changeMachine(1);
});

async function spin(mode) {
  if (state.spinning) {
    return;
  }

  if (state.balance < state.bet) {
    setAnnouncement(
      "Insufficient VC",
      "Your balance is below the selected bet. Lower bet or claim daily VC.",
      0,
      "Need VC"
    );
    pulseStatus("Balance too low");
    vibrate([30, 30, 30]);
    if (state.autospinActive) {
      stopAutoSpin("Auto-spin paused: insufficient balance");
    }
    return;
  }

  ensureAudioContext();

  const machine = currentMachine();
  state.spinning = true;
  state.round += 1;
  state.balance -= state.bet;
  state.totalSpent += state.bet;
  state.lastNet = -state.bet;
  render();
  syncControls();

  triggerSpinCinematics(mode);
  pulseStatus(state.autospinActive ? "Auto-spin running" : "Spinning");
  setAnnouncement(
    "Spin in progress",
    `${machine.name} is rolling with ${formatMultiplier(effectiveMultiplier())} perk pressure.`,
    -state.bet,
    `Spent ${formatNumber(state.bet)}`
  );

  const outcomeSymbols = elements.reels.map(() => pickWeightedSymbol());
  const baseDuration = prefersReducedMotion ? 180 : 700;
  await Promise.all(
    elements.reels.map((reel, index) =>
      spinSingleReel(reel, outcomeSymbols[index], baseDuration + index * (180 + machine.speedBonus), index)
    )
  );

  const multiplier = effectiveMultiplier();
  const outcome = evaluateSpin(outcomeSymbols, state.bet, multiplier);
  state.balance += outcome.payout;
  state.totalWon += outcome.payout;
  state.lastNet = outcome.payout - state.bet;

  if (outcome.payout > 0) {
    state.winStreak += 1;
  } else {
    state.winStreak = 0;
  }

  const historyEntry = {
    label: `Round ${state.round}`,
    symbols: outcomeSymbols.map((symbol) => symbol.label),
    headline: outcome.headline,
    detail: outcome.detail,
    net: state.lastNet,
    payout: outcome.payout,
  };

  state.history.unshift(historyEntry);
  state.history = state.history.slice(0, MAX_HISTORY);

  if (state.lastNet > 0) {
    state.winHistory.unshift(historyEntry);
    state.winHistory = state.winHistory.slice(0, MAX_WIN_HISTORY);
  }

  if (outcome.payout > state.bestWin) {
    state.bestWin = outcome.payout;
    state.bestWinLabel = `${outcome.headline} (${outcomeSymbols.map((s) => s.label).join(" / ")})`;
    highlightShowcase(outcome, multiplier);
  }

  state.spinning = false;

  setAnnouncement(outcome.headline, outcome.detail, state.lastNet, outcome.badgeText);
  pulseStatus(outcome.status);
  reactToOutcome(outcome, multiplier);
  render();
  syncControls();
  saveState();

  if (state.autospinActive) {
    queueAutoSpin(100);
  }
}

function evaluateSpin(symbols, bet, multiplier) {
  const labels = symbols.map((symbol) => symbol.label);
  const sortedKey = [...labels].sort().join("|");
  const counts = labels.reduce((map, label) => {
    map[label] = (map[label] ?? 0) + 1;
    return map;
  }, {});
  const highestCount = Math.max(...Object.values(counts));

  if (highestCount === 3) {
    const symbol = symbols[0];
    const basePayout = bet * symbol.triple;
    const payout = Math.round(basePayout * multiplier);
    return {
      payout,
      headline: `${symbol.label} x3`,
      detail: `Triple match with ${formatMultiplier(multiplier)} perk boost applied.`,
      badgeText: `Net +${formatNumber(payout - bet)}`,
      status: "Triple match",
      outcomeType: "jackpot",
    };
  }

  if (SPECIAL_COMBOS[sortedKey]) {
    const combo = SPECIAL_COMBOS[sortedKey];
    const basePayout = bet * combo.multiplier;
    const payout = Math.round(basePayout * multiplier);
    return {
      payout,
      headline: combo.headline,
      detail: `${combo.detail} ${formatMultiplier(multiplier)} perk boost applied.`,
      badgeText: `Net +${formatNumber(payout - bet)}`,
      status: "Special combo",
      outcomeType: "special",
    };
  }

  if (highestCount === 2) {
    const basePayout = Math.round(bet * 2.2);
    const payout = Math.round(basePayout * multiplier);
    const matchedLabel = Object.keys(counts).find((label) => counts[label] === 2);
    return {
      payout,
      headline: `${matchedLabel} pair`,
      detail: `Pair payout with ${formatMultiplier(multiplier)} perk boost.`,
      badgeText: `Net +${formatNumber(payout - bet)}`,
      status: "Pair hit",
      outcomeType: "pair",
    };
  }

  return {
    payout: 0,
    headline: "No payout",
    detail: "No combination lined up on this spin.",
    badgeText: `Net -${formatNumber(bet)}`,
    status: "Awaiting next spin",
    outcomeType: "loss",
  };
}

function currentMachine() {
  return MACHINES[state.machineIndex] ?? MACHINES[0];
}

function effectiveMultiplier() {
  const machine = currentMachine();
  const streakBonus = Math.min(state.winStreak, 6) * 0.07;
  return 1 + streakBonus + machine.machineBonus;
}

function highlightShowcase(outcome, multiplier) {
  elements.showcaseTitle.textContent = `${outcome.headline} - ${formatNumber(outcome.payout)} VC`;
  elements.showcaseDetail.textContent = `New record with ${formatMultiplier(multiplier)} total multiplier.`;
  elements.showcase.classList.remove("is-pop");
  void elements.showcase.offsetWidth;
  elements.showcase.classList.add("is-pop");
  createBurst(34, true);
}

function triggerSpinCinematics(mode) {
  elements.cabinetFrame.classList.remove("is-shaking");
  if (!prefersReducedMotion) {
    void elements.cabinetFrame.offsetWidth;
    elements.cabinetFrame.classList.add("is-shaking");
  }

  elements.screenFlash.classList.remove("is-active");
  void elements.screenFlash.offsetWidth;
  elements.screenFlash.classList.add("is-active");

  playSpinTension(mode);
}

function spinSingleReel(reel, finalSymbol, duration, index) {
  const tickRate = prefersReducedMotion ? 45 : 72;

  return new Promise((resolve) => {
    reel.classList.add("is-spinning");
    let cursor = 0;

    const interval = window.setInterval(() => {
      renderReel(reel, SYMBOLS[cursor % SYMBOLS.length]);
      cursor += 1 + index;
    }, tickRate);

    window.setTimeout(() => {
      window.clearInterval(interval);
      reel.classList.remove("is-spinning");
      renderReel(reel, finalSymbol);
      animateElement(
        reel,
        [
          { transform: "translateY(-9px) scale(1.03)" },
          { transform: "translateY(0) scale(1)" },
        ],
        {
          duration: prefersReducedMotion ? 1 : 240,
          easing: "cubic-bezier(.18,.89,.32,1.28)",
        }
      );
      playStopTone(index);
      resolve();
    }, Math.max(160, duration));
  });
}

function renderReel(reel, symbol) {
  const label = reel.querySelector(".symbol-card__label");
  const sub = reel.querySelector(".symbol-card__sub");
  label.textContent = symbol.label;
  sub.textContent = symbol.sub;
}

function reactToOutcome(outcome, multiplier) {
  if (outcome.outcomeType === "loss") {
    playToneSequence([[210, 0.05, "sawtooth"]]);
    return;
  }

  createBurst(outcome.outcomeType === "jackpot" ? 30 : 18, outcome.outcomeType === "jackpot");
  vibrate(outcome.outcomeType === "jackpot" ? [40, 30, 60, 30, 80] : [20, 20, 20]);

  if (outcome.outcomeType === "jackpot") {
    playToneSequence([
      [523, 0.08, "triangle"],
      [659, 0.08, "triangle"],
      [784, 0.12, "triangle"],
      [1046, 0.17, "triangle"],
    ]);
  } else {
    playToneSequence([
      [440, 0.08, "sine"],
      [554, 0.08, "triangle"],
      [698, 0.12, "triangle"],
    ]);
  }

  elements.headline.textContent = `${outcome.headline} (${formatMultiplier(multiplier)})`;
}

function claimDailyVC() {
  if (!canClaimDaily()) {
    return;
  }

  ensureAudioContext();
  state.balance += DAILY_GRANT;
  state.lastDailyClaimAt = Date.now();
  state.lastNet = DAILY_GRANT;

  const entry = {
    label: "Daily VC",
    symbols: ["DAILY", "VC", "CLAIM"],
    headline: "Daily credit claimed",
    detail: `+${formatNumber(DAILY_GRANT)} VC added. Next claim in 24h.`,
    net: DAILY_GRANT,
    payout: DAILY_GRANT,
  };

  state.history.unshift(entry);
  state.history = state.history.slice(0, MAX_HISTORY);
  state.winHistory.unshift(entry);
  state.winHistory = state.winHistory.slice(0, MAX_WIN_HISTORY);

  setAnnouncement(
    "Daily VC claimed",
    `You received ${formatNumber(DAILY_GRANT)} VC. Claim resets in 24 hours.`,
    DAILY_GRANT,
    `+${formatNumber(DAILY_GRANT)} VC`
  );
  pulseStatus("Daily reward claimed");
  playToneSequence([
    [392, 0.08, "triangle"],
    [523, 0.08, "triangle"],
    [659, 0.14, "triangle"],
  ]);
  updateDailyClaimUI();
  render();
  saveState();
}

function canClaimDaily() {
  if (!Number.isFinite(state.lastDailyClaimAt)) {
    return true;
  }
  return Date.now() - state.lastDailyClaimAt >= DAILY_COOLDOWN_MS;
}

function timeUntilDailyReady() {
  if (canClaimDaily()) {
    return 0;
  }

  const remaining = DAILY_COOLDOWN_MS - (Date.now() - state.lastDailyClaimAt);
  return Math.max(0, remaining);
}

function updateDailyClaimUI() {
  const remaining = timeUntilDailyReady();
  const claimable = remaining === 0;
  elements.dailyButton.disabled = state.spinning || !claimable;

  if (claimable) {
    elements.dailyTimer.textContent = "Daily claim ready.";
    return;
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  elements.dailyTimer.textContent = `Next claim in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function startDailyTicker() {
  window.clearInterval(dailyTimerInterval);
  dailyTimerInterval = window.setInterval(updateDailyClaimUI, 1000);
}

function queueAutoSpin(delay) {
  window.clearTimeout(autoSpinTimer);
  autoSpinTimer = window.setTimeout(() => {
    if (!state.autospinActive || state.spinning) {
      return;
    }
    spin("auto");
  }, delay);
}

function stopAutoSpin(message) {
  state.autospinActive = false;
  window.clearTimeout(autoSpinTimer);
  if (message) {
    pulseStatus(message);
  }
  syncControls();
  saveState();
}

function changeMachine(direction) {
  if (state.spinning) {
    return;
  }

  const total = MACHINES.length;
  state.machineIndex = (state.machineIndex + direction + total) % total;
  state.winStreak = 0;
  applyMachineTheme();

  const machine = currentMachine();
  setAnnouncement(
    machine.name,
    `${machine.status}. Machine bonus ${formatMultiplier(1 + machine.machineBonus)}.`,
    0,
    "Machine ready"
  );
  pulseStatus(machine.status);
  render();
  saveState();
}

function applyMachineTheme() {
  for (const machine of MACHINES) {
    elements.root.classList.remove(machine.accentClass);
  }
  const machine = currentMachine();
  elements.root.classList.add(machine.accentClass);
  elements.machineName.textContent = `${machine.name}: +${Math.round(machine.machineBonus * 100)}% perk`;
  elements.carouselName.textContent = machine.name;
}

function render() {
  elements.balance.textContent = formatNumber(state.balance);
  elements.betDisplay.textContent = formatNumber(state.bet);
  elements.perkMultiplier.textContent = formatMultiplier(effectiveMultiplier());
  elements.bestWin.textContent = formatNumber(state.bestWin);
  elements.bestWinLabel.textContent = state.bestWinLabel || "No showcase yet";

  for (const chip of elements.chipGrid.querySelectorAll("[data-bet]")) {
    chip.classList.toggle("is-active", Number(chip.dataset.bet) === state.bet);
  }

  renderSessionHistory();
  renderWinHistory();
  updateButtonStates();
  updateDailyClaimUI();
}

function renderSessionHistory() {
  elements.history.innerHTML = "";

  for (const entry of state.history) {
    const item = document.createElement("li");
    const round = document.createElement("span");
    const summary = document.createElement("p");
    const net = document.createElement("span");

    round.className = "history__round";
    round.textContent = entry.label ?? "Round ?";

    summary.className = "history__summary";
    summary.textContent = `${entry.symbols.join(" / ")}. ${entry.headline}. ${entry.detail}`;

    net.className = `history__net ${entry.net >= 0 ? "is-win" : "is-loss"}`;
    net.textContent = entry.net >= 0 ? `+${formatNumber(entry.net)}` : `-${formatNumber(Math.abs(entry.net))}`;

    item.append(round, summary, net);
    elements.history.append(item);
  }

  if (state.history.length === 0) {
    renderEmptyHistory(elements.history, "Session", "No spins yet.");
  }
}

function renderWinHistory() {
  elements.winHistory.innerHTML = "";

  for (const entry of state.winHistory) {
    const item = document.createElement("li");
    const round = document.createElement("span");
    const summary = document.createElement("p");
    const net = document.createElement("span");

    round.className = "history__round";
    round.textContent = entry.label ?? "Win";

    summary.className = "history__summary";
    summary.textContent = `${entry.symbols.join(" / ")}. ${entry.headline}.`;

    net.className = "history__net is-win";
    net.textContent = `+${formatNumber(Math.max(entry.net, 0))}`;

    item.append(round, summary, net);
    elements.winHistory.append(item);
  }

  if (state.winHistory.length === 0) {
    renderEmptyHistory(elements.winHistory, "Wins", "No wins yet.");
  }
}

function renderEmptyHistory(container, label, text) {
  const empty = document.createElement("li");
  const round = document.createElement("span");
  const summary = document.createElement("p");
  const net = document.createElement("span");

  round.className = "history__round";
  round.textContent = label;
  summary.className = "history__summary";
  summary.textContent = text;
  net.className = "history__net";
  net.textContent = "0";

  empty.append(round, summary, net);
  container.append(empty);
}

function updateButtonStates() {
  elements.spinButton.disabled = state.spinning;
  elements.autoSpinButton.disabled = state.spinning || state.autospinActive;
  elements.stopAutoSpinButton.disabled = !state.autospinActive;
  elements.prevMachine.disabled = state.spinning || state.autospinActive;
  elements.nextMachine.disabled = state.spinning || state.autospinActive;

  elements.spinButton.textContent = state.spinning ? "Spinning..." : "Spin";
  elements.autoSpinButton.textContent = state.autospinActive ? "Auto-Spin Running" : "Start Auto-Spin";

  for (const chip of elements.chipGrid.querySelectorAll("[data-bet]")) {
    chip.disabled = state.spinning || state.autospinActive;
  }
}

function syncControls() {
  updateButtonStates();
}

function setAnnouncement(headline, detail, net, badgeText) {
  elements.headline.textContent = headline;
  elements.subheadline.textContent = detail;
  elements.netBadge.textContent = badgeText ?? (net >= 0 ? `Net +${formatNumber(net)}` : `Net -${formatNumber(Math.abs(net))}`);
  elements.netBadge.style.background = net >= 0 ? "rgba(126, 245, 187, 0.12)" : "rgba(255, 119, 100, 0.16)";
  elements.netBadge.style.color = net >= 0 ? "var(--mint)" : "var(--alarm)";
  elements.liveRegion.textContent = `${headline}. ${detail}`;
}

function pulseStatus(text) {
  elements.statusPill.textContent = text;
  animateElement(
    elements.statusPill,
    [
      { transform: "scale(1)", opacity: 0.75 },
      { transform: "scale(1.06)", opacity: 1 },
      { transform: "scale(1)", opacity: 1 },
    ],
    {
      duration: prefersReducedMotion ? 1 : 380,
      easing: "ease-out",
    }
  );
}

function pickWeightedSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    cursor -= symbol.weight;
    if (cursor <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function loadState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return {
        balance: Number.isFinite(saved.balance) ? saved.balance : STARTING_BALANCE,
        bet: BET_OPTIONS.includes(saved.bet) ? saved.bet : 100,
        bestWin: Number.isFinite(saved.bestWin) ? saved.bestWin : 0,
        bestWinLabel: typeof saved.bestWinLabel === "string" ? saved.bestWinLabel : "",
        history: Array.isArray(saved.history) ? saved.history.slice(0, MAX_HISTORY) : [],
        winHistory: Array.isArray(saved.winHistory) ? saved.winHistory.slice(0, MAX_WIN_HISTORY) : [],
        lastNet: Number.isFinite(saved.lastNet) ? saved.lastNet : 0,
        round: Number.isFinite(saved.round) ? saved.round : 0,
        spinning: false,
        autospinActive: false,
        machineIndex: Number.isFinite(saved.machineIndex) ? Math.max(0, Math.min(saved.machineIndex, MACHINES.length - 1)) : 0,
        winStreak: Number.isFinite(saved.winStreak) ? Math.max(0, saved.winStreak) : 0,
        totalSpent: Number.isFinite(saved.totalSpent) ? saved.totalSpent : 0,
        totalWon: Number.isFinite(saved.totalWon) ? saved.totalWon : 0,
        lastDailyClaimAt: Number.isFinite(saved.lastDailyClaimAt) ? saved.lastDailyClaimAt : null,
      };
    }
  } catch (error) {
    console.warn("Unable to load saved state", error);
  }

  return {
    balance: STARTING_BALANCE,
    bet: 100,
    bestWin: 0,
    bestWinLabel: "",
    history: [],
    winHistory: [],
    lastNet: 0,
    round: 0,
    spinning: false,
    autospinActive: false,
    machineIndex: 0,
    winStreak: 0,
    totalSpent: 0,
    totalWon: 0,
    lastDailyClaimAt: null,
  };
}

function saveState() {
  const serializable = {
    balance: state.balance,
    bet: state.bet,
    bestWin: state.bestWin,
    bestWinLabel: state.bestWinLabel,
    history: state.history,
    winHistory: state.winHistory,
    lastNet: state.lastNet,
    round: state.round,
    machineIndex: state.machineIndex,
    winStreak: state.winStreak,
    totalSpent: state.totalSpent,
    totalWon: state.totalWon,
    lastDailyClaimAt: state.lastDailyClaimAt,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn("Unable to save state", error);
  }
}

function createBurst(count, fireworksMode) {
  if (prefersReducedMotion) {
    return;
  }

  const colors = fireworksMode
    ? ["#f0b24c", "#ff6f91", "#7ef5bb", "#f8f3dc", "#70d7ff"]
    : ["#f0b24c", "#ff6f91", "#7ef5bb", "#ff7764"];

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = `burst ${fireworksMode ? "is-firework" : ""}`;
    piece.style.setProperty("--angle", `${(360 / count) * index}deg`);
    piece.style.setProperty("--distance", `${8 + Math.random() * 26}rem`);
    piece.style.background = colors[index % colors.length];
    piece.style.left = `${38 + Math.random() * 24}%`;
    piece.style.top = `${30 + Math.random() * 24}%`;
    piece.style.animationDelay = `${Math.random() * 80}ms`;
    elements.burstLayer.append(piece);
    window.setTimeout(() => piece.remove(), 1200);
  }
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playSpinTension(mode) {
  if (!audioContext) {
    return;
  }

  const base = mode === "auto" ? 250 : 270;
  playToneSequence([
    [base, 0.04, "sawtooth"],
    [base + 40, 0.06, "triangle"],
    [base + 100, 0.09, "sine"],
  ]);
}

function playStopTone(index) {
  const frequency = 300 + index * 70;
  playToneSequence([[frequency, 0.04, "square"]]);
}

function playToneSequence(sequence) {
  if (!audioContext) {
    return;
  }

  let when = audioContext.currentTime;

  for (const [frequency, duration, type] of sequence) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.06, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
    when += duration * 0.9;
  }
}

function animateElement(element, keyframes, options) {
  if (typeof element.animate === "function") {
    element.animate(keyframes, options);
  }
}

function formatNumber(value) {
  return numberFormatter.format(Math.round(value));
}

function formatMultiplier(value) {
  return `x${value.toFixed(2)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function vibrate(pattern) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}
