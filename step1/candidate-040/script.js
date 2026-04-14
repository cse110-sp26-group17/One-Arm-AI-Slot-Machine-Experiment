const SYMBOLS = [
  "PROMPT",
  "CACHE HIT",
  "GPU BURST",
  "SAFE MODE",
  "RATE LIMIT",
  "HALLUCINATION",
  "AGENT LOOP",
  "OPEN WEIGHTS"
];

const TRIPLE_MULTIPLIER = {
  "PROMPT": 4,
  "CACHE HIT": 5,
  "GPU BURST": 7,
  "SAFE MODE": 3,
  "RATE LIMIT": 2,
  "HALLUCINATION": 0,
  "AGENT LOOP": 1.5,
  "OPEN WEIGHTS": 10
};

const STORAGE_KEY = "token-tumbler-v1";
const START_BALANCE = 1200;
const MIN_BET = 25;
const MAX_BET = 250;
const BET_STEP = 25;
const PREDICTION_COST = 35;

const state = {
  balance: START_BALANCE,
  bet: 75,
  bestWin: 0,
  spins: 0,
  spinning: false
};

const els = {
  balance: document.getElementById("balance"),
  bet: document.getElementById("bet"),
  bestWin: document.getElementById("best-win"),
  spins: document.getElementById("spins"),
  status: document.getElementById("status"),
  spinBtn: document.getElementById("spin-btn"),
  predictionBtn: document.getElementById("prediction-btn"),
  resetBtn: document.getElementById("reset-btn"),
  betDown: document.getElementById("bet-down"),
  betUp: document.getElementById("bet-up"),
  reels: [...document.querySelectorAll(".reel")]
};

const audio = {
  ctx: null
};

function init() {
  hydrateState();
  render();
  wireEvents();
  setStatus("Every spin costs tokens. Every win funds more bad decisions.", "neutral");
}

function hydrateState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    state.balance = Number.isFinite(saved.balance) ? saved.balance : START_BALANCE;
    state.bet = Number.isFinite(saved.bet) ? clamp(saved.bet, MIN_BET, MAX_BET) : 75;
    state.bestWin = Number.isFinite(saved.bestWin) ? saved.bestWin : 0;
    state.spins = Number.isFinite(saved.spins) ? saved.spins : 0;
  } catch {
    state.balance = START_BALANCE;
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      balance: state.balance,
      bet: state.bet,
      bestWin: state.bestWin,
      spins: state.spins
    })
  );
}

function wireEvents() {
  document.addEventListener(
    "pointerdown",
    () => {
      if (!audio.ctx) {
        audio.ctx = new AudioContext();
      }
    },
    { once: true }
  );

  els.spinBtn.addEventListener("click", spin);
  els.predictionBtn.addEventListener("click", buyPrediction);
  els.resetBtn.addEventListener("click", resetGame);
  els.betDown.addEventListener("click", () => changeBet(-BET_STEP));
  els.betUp.addEventListener("click", () => changeBet(BET_STEP));
}

function changeBet(delta) {
  if (state.spinning) {
    return;
  }
  state.bet = clamp(state.bet + delta, MIN_BET, MAX_BET);
  persistState();
  render();
}

async function spin() {
  if (state.spinning) {
    return;
  }

  if (state.balance < state.bet) {
    setStatus("Insufficient tokens. The AI suggests a \"small top-up\".", "lose");
    playLoseTone();
    nudgeStatus();
    return;
  }

  state.spinning = true;
  state.balance -= state.bet;
  state.spins += 1;
  persistState();
  render();

  setStatus(`Burned ${state.bet} tokens. Running casino-grade inference...`, "neutral");
  playSpinTone();

  const finalSymbols = chooseFinalSymbols();
  const results = await Promise.all(
    els.reels.map((reel, index) => spinReel(reel, finalSymbols[index], 720 + index * 260))
  );

  const outcome = evaluate(results);
  state.balance += outcome.payout;
  state.bestWin = Math.max(state.bestWin, outcome.payout, state.bestWin);
  state.spinning = false;
  persistState();
  render();

  setStatus(outcome.message, outcome.kind);
  animateStatus();

  if (outcome.kind === "win") {
    playWinTone(outcome.payout >= state.bet * 6);
    if (navigator.vibrate) {
      navigator.vibrate([35, 40, 50]);
    }
  } else {
    playLoseTone();
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }
  }
}

function chooseFinalSymbols() {
  const weighted = [
    "PROMPT",
    "PROMPT",
    "CACHE HIT",
    "GPU BURST",
    "SAFE MODE",
    "RATE LIMIT",
    "HALLUCINATION",
    "AGENT LOOP",
    "OPEN WEIGHTS"
  ];
  return [rand(weighted), rand(weighted), rand(weighted)];
}

function spinReel(reelEl, finalSymbol, duration) {
  return new Promise((resolve) => {
    reelEl.classList.add("spinning");
    const interval = setInterval(() => {
      reelEl.textContent = rand(SYMBOLS);
    }, 90);

    setTimeout(() => {
      clearInterval(interval);
      reelEl.classList.remove("spinning");
      reelEl.textContent = finalSymbol;
      resolve(finalSymbol);
    }, duration);
  });
}

function evaluate(symbols) {
  const counts = countSymbols(symbols);
  const unique = Object.keys(counts);

  if (unique.length === 1) {
    const symbol = unique[0];
    const multiplier = TRIPLE_MULTIPLIER[symbol] || 0;
    const payout = Math.round(state.bet * multiplier);

    if (payout <= 0) {
      return {
        payout: 0,
        kind: "lose",
        message: "Triple HALLUCINATION. Model confidence: 102%. Accuracy: optional."
      };
    }

    if (multiplier >= 7) {
      return {
        payout,
        kind: "win",
        message: `JACKPOT: ${symbol} x3 paid ${payout} tokens. Somehow the benchmark was real.`
      };
    }

    return {
      payout,
      kind: "win",
      message: `Triple ${symbol}. You won ${payout} tokens before the next outage.`
    };
  }

  const pairEntry = Object.entries(counts).find(([, count]) => count === 2);
  if (pairEntry) {
    const payout = Math.round(state.bet * 1.6);
    return {
      payout,
      kind: "win",
      message: `Two ${pairEntry[0]} symbols paid ${payout} tokens. Barely supervised success.`
    };
  }

  if (counts["HALLUCINATION"] && counts["RATE LIMIT"]) {
    return {
      payout: 0,
      kind: "lose",
      message: "Rate-limited while hallucinating. The AI calls this a premium feature."
    };
  }

  const lossLines = [
    "No match. The model spent your tokens on \"reasoning\".",
    "No payout. Your budget was used to generate confidence.",
    "All miss. The AI says this outcome is statistically delightful.",
    "No luck this round. Try adding \"please\" to your spin prompt."
  ];

  return {
    payout: 0,
    kind: "lose",
    message: rand(lossLines)
  };
}

function buyPrediction() {
  if (state.spinning) {
    return;
  }

  if (state.balance < PREDICTION_COST) {
    setStatus("Prediction denied: your token wallet is in low-power mode.", "lose");
    nudgeStatus();
    return;
  }

  state.balance -= PREDICTION_COST;
  persistState();
  render();

  const predictions = [
    "AI prediction: \"High chance of winning.\" Confidence: 3%.",
    "AI prediction: \"This spin is deterministic.\" It is not.",
    "AI prediction: \"Try smiling at the monitor.\"",
    "AI prediction: \"Outcome depends on cosmic prompt engineering.\"",
    "AI prediction: \"You are one token away from greatness.\""
  ];
  setStatus(`${rand(predictions)} (-${PREDICTION_COST} tokens)`, "neutral");
  playNeutralTone();
}

function resetGame() {
  if (state.spinning) {
    return;
  }

  state.balance = START_BALANCE;
  state.bet = 75;
  state.bestWin = 0;
  state.spins = 0;
  persistState();
  render();
  setStatus("Wallet reset. The AI has forgotten your losses, and your gains.", "neutral");
  playNeutralTone();
}

function render() {
  els.balance.textContent = format(state.balance);
  els.bet.textContent = format(state.bet);
  els.bestWin.textContent = format(state.bestWin);
  els.spins.textContent = format(state.spins);
  els.spinBtn.textContent = `Spin (-${state.bet} tokens)`;

  const controlsDisabled = state.spinning;
  const downLocked = controlsDisabled || state.bet <= MIN_BET;
  const upLocked = controlsDisabled || state.bet >= MAX_BET;

  els.betDown.disabled = downLocked;
  els.betUp.disabled = upLocked;
  els.spinBtn.disabled = controlsDisabled;
  els.predictionBtn.disabled = controlsDisabled;
  els.resetBtn.disabled = controlsDisabled;
}

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.classList.remove("win", "lose");
  if (kind === "win") {
    els.status.classList.add("win");
  }
  if (kind === "lose") {
    els.status.classList.add("lose");
  }
}

function animateStatus() {
  if (!els.status.animate) {
    return;
  }

  els.status.animate(
    [
      { transform: "translateY(6px)", opacity: 0.45 },
      { transform: "translateY(0)", opacity: 1 }
    ],
    { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
}

function nudgeStatus() {
  if (!els.status.animate) {
    return;
  }
  els.status.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" }
    ],
    { duration: 220, easing: "ease-out" }
  );
}

function playSpinTone() {
  blip(220, 0.06, "triangle", 0.05);
}

function playWinTone(isBig) {
  blip(520, 0.07, "sine", 0.08);
  setTimeout(() => blip(720, 0.09, "sine", 0.08), 70);
  if (isBig) {
    setTimeout(() => blip(930, 0.12, "square", 0.09), 140);
  }
}

function playLoseTone() {
  blip(180, 0.1, "sawtooth", 0.06);
}

function playNeutralTone() {
  blip(300, 0.06, "triangle", 0.04);
}

function blip(freq, duration, type, gainValue) {
  if (!audio.ctx) {
    return;
  }

  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  const now = audio.ctx.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function countSymbols(symbols) {
  return symbols.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {});
}

function rand(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function format(number) {
  return new Intl.NumberFormat("en-US").format(Math.round(number));
}

init();
