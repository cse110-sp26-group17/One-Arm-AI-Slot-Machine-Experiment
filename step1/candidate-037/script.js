"use strict";

const STORAGE_KEY = "ai-token-trough-state-v1";
const BET_OPTIONS = [5, 10, 20, 40];
const MIN_BET = BET_OPTIONS[0];
const NUDGE_COST = 4;

const SYMBOLS = [
  {
    id: "bot",
    label: "BOT",
    note: "confident nonsense",
    className: "bot",
    weight: 22,
    triple: 5,
  },
  {
    id: "gpu",
    label: "GPU",
    note: "heat-to-profit engine",
    className: "gpu",
    weight: 18,
    triple: 6,
  },
  {
    id: "vc",
    label: "VC",
    note: "runway hallucination",
    className: "vc",
    weight: 14,
    triple: 8,
  },
  {
    id: "error404",
    label: "404",
    note: "hallucination cascade",
    className: "error404",
    weight: 17,
    triple: 4,
  },
  {
    id: "mint",
    label: "MINT",
    note: "token printer fantasy",
    className: "mint",
    weight: 11,
    triple: 10,
  },
  {
    id: "hype",
    label: "HYPE",
    note: "pitch deck fog",
    className: "hype",
    weight: 18,
    triple: 5,
  },
];

const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map((symbol) => [symbol.id, symbol]));

const HYPE_STATES = [
  {
    limit: 24,
    label: "Cold inbox",
    copy: "No one believes the deck, not even the deck.",
  },
  {
    limit: 49,
    label: "Warm deck",
    copy: "Mild investor optimism with traces of spreadsheet perfume.",
  },
  {
    limit: 74,
    label: "Trend thread",
    copy: "The machine has posted a chart with no axis labels.",
  },
  {
    limit: 100,
    label: "Bubble mode",
    copy: "Every spin sounds like a founder saying 'we scale with vibes.'",
  },
];

const defaultLog = [
  {
    title: "Machine online",
    detail: "Fresh tokens loaded. Ethics module still pending.",
  },
  {
    title: "Token economy live",
    detail: "Spend recklessly. Call it innovation if anyone asks.",
  },
];

const defaultState = {
  balance: 120,
  bestBalance: 120,
  bet: 10,
  spins: 0,
  hype: 42,
  soundOn: true,
  currentResults: ["bot", "gpu", "mint"],
  canNudge: false,
  log: defaultLog,
};

const elements = {
  tokenBalance: document.querySelector("#tokenBalance"),
  currentBet: document.querySelector("#currentBet"),
  bestBalance: document.querySelector("#bestBalance"),
  spinCount: document.querySelector("#spinCount"),
  spinButton: document.querySelector("#spinButton"),
  nudgeButton: document.querySelector("#nudgeButton"),
  soundButton: document.querySelector("#soundButton"),
  roundMessage: document.querySelector("#roundMessage"),
  hypeFill: document.querySelector("#hypeFill"),
  hypeLabel: document.querySelector("#hypeLabel"),
  meterCopy: document.querySelector("#meterCopy"),
  eventLog: document.querySelector("#eventLog"),
  betButtons: Array.from(document.querySelectorAll(".bet-button")),
  bailoutDialog: document.querySelector("#bailoutDialog"),
  acceptBailout: document.querySelector("#acceptBailout"),
  reels: [
    document.querySelector("#reel0"),
    document.querySelector("#reel1"),
    document.querySelector("#reel2"),
  ],
};

let state = loadState();
let spinLocked = false;
let audioContext = null;

renderAll();

elements.betButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextBet = Number(button.dataset.bet);
    state.bet = nextBet;
    state.canNudge = false;
    saveState();
    renderAll();
    showMessage("Bet adjusted. Truly nothing says wisdom like changing stakes mid-slide.");
  });
});

elements.spinButton.addEventListener("click", () => {
  spin();
});

elements.nudgeButton.addEventListener("click", () => {
  panicPivot();
});

elements.soundButton.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  saveState();
  renderControls();
  showMessage(
    state.soundOn
      ? "Sound is back on. The machine may now chirp like an excited keynote."
      : "Sound muted. A rare moment of digital restraint."
  );
});

elements.bailoutDialog.addEventListener("close", () => {
  if (elements.bailoutDialog.returnValue === "accept") {
    takeBailout();
  }
});

async function spin() {
  if (spinLocked) {
    return;
  }

  if (state.balance < state.bet) {
    openBailoutDialog();
    return;
  }

  spinLocked = true;
  ensureAudioContext();

  const wager = state.bet;

  state.balance -= wager;
  state.spins += 1;
  state.canNudge = false;
  normalizeBet(true);
  saveState();
  renderAll();

  showMessage("Tokens burned. Training the machine on your poor impulse control.");
  playPattern("spin");

  const nextResults = [pickSymbol(), pickSymbol(), pickSymbol()];
  await animateReels(nextResults, [0, 1, 2]);

  resolveRound(nextResults, wager, "spin");
  spinLocked = false;
  renderControls();

  if (state.balance < MIN_BET) {
    openBailoutDialog();
  }
}

async function panicPivot() {
  if (spinLocked) {
    return;
  }

  if (!state.canNudge) {
    showMessage("Panic Pivot unlocks after a losing spin. The machine respects dramatic timing.");
    return;
  }

  if (state.balance < NUDGE_COST) {
    showMessage("You cannot afford a pivot. The spreadsheet says 'sit with this feeling.'");
    return;
  }

  spinLocked = true;
  ensureAudioContext();

  const wager = state.bet;
  const currentSymbols = state.currentResults.map((id) => SYMBOL_BY_ID[id]);
  const nextResults = [...currentSymbols];

  state.balance -= NUDGE_COST;
  state.canNudge = false;
  normalizeBet(true);
  saveState();
  renderAll();

  showMessage("Emergency pivot purchased. One reel is about to pretend it was always the strategy.");
  playPattern("pivot");

  nextResults[2] = pickSymbol();
  await animateReels(nextResults, [2]);

  resolveRound(nextResults, wager, "pivot");
  spinLocked = false;
  renderControls();

  if (state.balance < MIN_BET) {
    openBailoutDialog();
  }
}

function resolveRound(results, betAmount, source) {
  const outcome = scoreResults(results, betAmount);

  state.currentResults = results.map((symbol) => symbol.id);

  if (outcome.payout > 0) {
    state.balance += outcome.payout;
  }

  state.bestBalance = Math.max(state.bestBalance, state.balance);
  state.hype = clamp(
    state.hype + (outcome.win ? 10 : -8) + (outcome.bigWin ? 12 : 0) + (source === "pivot" ? 4 : 0),
    0,
    100
  );
  state.canNudge = !outcome.win && source === "spin" && state.balance >= NUDGE_COST;

  normalizeBet(true);
  addLog(outcome.title, outcome.detail);
  saveState();
  renderAll();

  if (outcome.win) {
    showMessage(
      `You won ${formatTokens(outcome.payout)} tokens. ${outcome.title}.`
    );
    celebrateWin(results, outcome.bigWin);
    playPattern(outcome.bigWin ? "jackpot" : "win");
  } else {
    showMessage(
      state.canNudge
        ? `No payout. The machine kept your bet and suggests a Panic Pivot for ${NUDGE_COST} tokens.`
        : "No payout. Your tokens have been promoted to 'training data.'"
    );
    playPattern("loss");
  }
}

function scoreResults(results, betAmount) {
  const ids = results.map((symbol) => symbol.id);
  const counts = ids.reduce((map, id) => {
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});

  if (ids.join("-") === "bot-vc-bot") {
    const payout = betAmount * 7;
    return {
      win: true,
      bigWin: true,
      payout,
      title: "Pivot jackpot",
      detail: `Two bots flanking a VC. +${formatTokens(payout)} tokens for strategic theater.`,
    };
  }

  const tripleId = Object.keys(counts).find((id) => counts[id] === 3);
  if (tripleId) {
    const symbol = SYMBOL_BY_ID[tripleId];
    const payout = betAmount * symbol.triple;
    return {
      win: true,
      bigWin: symbol.triple >= 7,
      payout,
      title: `Triple ${symbol.label}`,
      detail: `The ${symbol.label} stack hit. +${formatTokens(payout)} tokens from pure algorithmic swagger.`,
    };
  }

  const pairId = Object.keys(counts).find((id) => counts[id] === 2);
  if (pairId) {
    const symbol = SYMBOL_BY_ID[pairId];
    const payout = betAmount * 2;
    return {
      win: true,
      bigWin: false,
      payout,
      title: `${symbol.label} pair`,
      detail: `A near miss got reframed as a product win. +${formatTokens(payout)} tokens.`,
    };
  }

  return {
    win: false,
    bigWin: false,
    payout: 0,
    title: "Dead spin",
    detail: "All three reels disagreed. The machine has called it an exploratory burn.",
  };
}

function renderAll() {
  renderStats();
  renderCurrentResults();
  renderControls();
  renderMeter();
  renderLog();
}

function renderStats() {
  elements.tokenBalance.textContent = String(state.balance);
  elements.currentBet.textContent = String(state.bet);
  elements.bestBalance.textContent = String(state.bestBalance);
  elements.spinCount.textContent = String(state.spins);
}

function renderCurrentResults() {
  state.currentResults
    .map((id) => SYMBOL_BY_ID[id] || SYMBOLS[0])
    .forEach((symbol, index) => setReelFace(elements.reels[index], symbol));
}

function renderControls() {
  elements.betButtons.forEach((button) => {
    const betValue = Number(button.dataset.bet);
    button.classList.toggle("is-active", betValue === state.bet);
    button.disabled = spinLocked;
  });

  elements.spinButton.disabled = spinLocked || state.balance < state.bet;
  elements.nudgeButton.disabled = spinLocked || !state.canNudge || state.balance < NUDGE_COST;
  elements.nudgeButton.textContent = state.canNudge
    ? `Panic Pivot (-${NUDGE_COST})`
    : "Panic Pivot";
  elements.soundButton.textContent = `Sound: ${state.soundOn ? "On" : "Off"}`;
}

function renderMeter() {
  const meterState =
    HYPE_STATES.find((entry) => state.hype <= entry.limit) || HYPE_STATES[HYPE_STATES.length - 1];
  elements.hypeFill.style.width = `${state.hype}%`;
  elements.hypeLabel.textContent = meterState.label;
  elements.meterCopy.textContent = meterState.copy;
}

function renderLog() {
  elements.eventLog.innerHTML = "";

  state.log.forEach((entry) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    const span = document.createElement("span");

    strong.textContent = entry.title;
    span.textContent = entry.detail;

    item.append(strong, span);
    elements.eventLog.append(item);
  });
}

function setReelFace(element, symbol) {
  element.className = `symbol-card ${symbol.className}`;
  element.querySelector(".symbol-chip").textContent = symbol.label;
  element.querySelector(".symbol-name").textContent = symbol.label;
  element.querySelector(".symbol-note").textContent = symbol.note;
}

async function animateReels(results, indexes) {
  await Promise.all(
    indexes.map((reelIndex, order) => animateSingleReel(reelIndex, results[reelIndex], order))
  );
}

function animateSingleReel(reelIndex, targetSymbol, order) {
  const reel = elements.reels[reelIndex];
  const reelWindow = reel.parentElement;
  const duration = 780 + order * 220;

  reelWindow.classList.add("is-spinning");
  reel.animate(
    [
      { transform: "scale(0.98) translateY(-4px)", filter: "blur(0px)" },
      { transform: "scale(1.01) translateY(5px)", filter: "blur(2px)" },
      { transform: "scale(1) translateY(0)", filter: "blur(0px)" },
    ],
    {
      duration: 220,
      iterations: Math.ceil(duration / 220),
      easing: "ease-in-out",
    }
  );

  return new Promise((resolve) => {
    const start = performance.now();

    function tick(now) {
      if (now - start < duration) {
        setReelFace(reel, pickSymbol());
        window.setTimeout(() => requestAnimationFrame(tick), 90);
        return;
      }

      setReelFace(reel, targetSymbol);
      reelWindow.classList.remove("is-spinning");
      reel.animate(
        [
          { transform: "scale(0.92)" },
          { transform: "scale(1.06)" },
          { transform: "scale(1)" },
        ],
        {
          duration: 260,
          easing: "cubic-bezier(.19,1,.22,1)",
        }
      );
      playPattern("stop", order);
      resolve();
    }

    requestAnimationFrame(tick);
  });
}

function celebrateWin(results, isBigWin) {
  const counts = results.reduce((map, symbol) => {
    map[symbol.id] = (map[symbol.id] || 0) + 1;
    return map;
  }, {});

  results.forEach((symbol, index) => {
    const reel = elements.reels[index];
    if (counts[symbol.id] > 1 || isBigWin) {
      reel.animate(
        [
          { transform: "translateY(0) scale(1)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
          { transform: "translateY(-6px) scale(1.02)", boxShadow: "0 14px 26px rgba(255,255,255,0.26)" },
          { transform: "translateY(0) scale(1)" },
        ],
        {
          duration: 520,
          easing: "ease-out",
        }
      );
    }
  });

  elements.roundMessage.animate(
    [
      { transform: "translateY(4px)", opacity: 0.6 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    {
      duration: 250,
      easing: "ease-out",
    }
  );

  if (isBigWin && navigator.vibrate) {
    navigator.vibrate([80, 40, 110]);
  }
}

function addLog(title, detail) {
  state.log = [{ title, detail }, ...state.log].slice(0, 6);
}

function showMessage(text) {
  elements.roundMessage.textContent = text;
  elements.roundMessage.animate(
    [
      { opacity: 0.35, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    {
      duration: 180,
      easing: "ease-out",
    }
  );
}

function openBailoutDialog() {
  if (elements.bailoutDialog.open) {
    return;
  }

  showMessage("Wallet empty. A VC is approaching with a term sheet and suspicious enthusiasm.");

  if (typeof elements.bailoutDialog.showModal === "function") {
    elements.bailoutDialog.showModal();
  }
}

function takeBailout() {
  state.balance += 80;
  state.hype = clamp(state.hype + 14, 0, 100);
  state.canNudge = false;
  normalizeBet(true);
  addLog("VC bailout", "Eighty tokens arrived attached to the phrase 'blitzscale responsibly.'");
  saveState();
  renderAll();
  showMessage("Bailout accepted. Your dignity is unchanged because it was never in the cap table.");
  playPattern("win");
}

function normalizeBet(forceDown) {
  if (!BET_OPTIONS.includes(state.bet)) {
    state.bet = 10;
  }

  if (forceDown && state.balance >= MIN_BET && state.bet > state.balance) {
    const affordableBets = BET_OPTIONS.filter((bet) => bet <= state.balance);
    state.bet = affordableBets[affordableBets.length - 1] || MIN_BET;
  }
}

function pickSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function ensureAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || audioContext) {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return;
  }

  audioContext = new AudioCtx();
}

function playPattern(kind, variant = 0) {
  if (!state.soundOn || !audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const baseTime = audioContext.currentTime;

  if (kind === "spin") {
    playTone(190, 0.06, baseTime, 0.03, "triangle");
    playTone(240, 0.08, baseTime + 0.08, 0.025, "triangle");
    return;
  }

  if (kind === "pivot") {
    playTone(240, 0.05, baseTime, 0.026, "square");
    playTone(360, 0.08, baseTime + 0.06, 0.022, "triangle");
    return;
  }

  if (kind === "stop") {
    playTone(310 + variant * 60, 0.055, baseTime, 0.024, "triangle");
    return;
  }

  if (kind === "loss") {
    playTone(210, 0.08, baseTime, 0.026, "sawtooth");
    return;
  }

  if (kind === "win") {
    playTone(480, 0.08, baseTime, 0.022, "triangle");
    playTone(640, 0.1, baseTime + 0.08, 0.024, "triangle");
    return;
  }

  if (kind === "jackpot") {
    playTone(520, 0.09, baseTime, 0.023, "triangle");
    playTone(740, 0.1, baseTime + 0.1, 0.024, "triangle");
    playTone(920, 0.16, baseTime + 0.21, 0.026, "sine");
  }
}

function playTone(frequency, duration, startTime, volume, type) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...cloneDefaultState(),
      ...parsed,
      log:
        Array.isArray(parsed.log) && parsed.log.length
          ? parsed.log.slice(0, 6)
          : defaultLog.map((entry) => ({ ...entry })),
      currentResults:
        Array.isArray(parsed.currentResults) && parsed.currentResults.length === 3
          ? parsed.currentResults
          : defaultState.currentResults,
    };
  } catch (error) {
    return cloneDefaultState();
  }
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    return;
  }
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function cloneDefaultState() {
  return {
    ...defaultState,
    currentResults: [...defaultState.currentResults],
    log: defaultLog.map((entry) => ({ ...entry })),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
