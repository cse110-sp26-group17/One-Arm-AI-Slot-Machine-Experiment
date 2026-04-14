"use strict";

const STARTING_TOKENS = 120;
const MIN_BET = 1;
const MAX_BET = 20;

const SYMBOLS = [
  { icon: "🤖", name: "Assistant", weight: 17, triple: 2 },
  { icon: "🧠", name: "Overfit Brain", weight: 13, triple: 3 },
  { icon: "🔥", name: "GPU Meltdown", weight: 11, triple: 4 },
  { icon: "🪙", name: "Token Cache", weight: 12, triple: 6 },
  { icon: "🧾", name: "Prompt Injection", weight: 15, triple: 2 },
  { icon: "🕳️", name: "Context Collapse", weight: 14, triple: 3 },
  { icon: "🛡️", name: "Safety Patch", weight: 10, triple: 5 },
  { icon: "✨", name: "Viral Demo", weight: 8, triple: 8 }
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

const roastWin = [
  "Congrats, your fake startup has positive unit economics for one spin.",
  "You won tokens. Please reinvest immediately into unnecessary agents.",
  "The model aligned with your wallet for exactly 0.8 seconds.",
  "Jackpot energy. Investors have scheduled 14 follow-up calls."
];

const roastLoss = [
  "No win. The machine blamed rate limits.",
  "That spin underperformed. Please increase GPU budget.",
  "Loss detected. Product says this is a feature.",
  "Your prompt was elegant, your outcome was not."
];

const roastNearMiss = [
  "Two matching symbols. The third one decided to pivot.",
  "Near miss. The model almost remembered the assignment.",
  "So close. One reel hallucinated a different objective."
];

const walletValue = document.querySelector("#walletValue");
const betValue = document.querySelector("#betValue");
const profitValue = document.querySelector("#profitValue");
const spinsValue = document.querySelector("#spinsValue");
const spentValue = document.querySelector("#spentValue");
const wonValue = document.querySelector("#wonValue");
const statusLine = document.querySelector("#statusLine");
const eventLog = document.querySelector("#eventLog");
const spinBtn = document.querySelector("#spinBtn");
const betDownBtn = document.querySelector("#betDown");
const betUpBtn = document.querySelector("#betUp");
const reelNodes = [...document.querySelectorAll(".reel")];

const state = loadState();
let audioCtx;
let isSpinning = false;

renderAll();
attachEvents();

function attachEvents() {
  spinBtn.addEventListener("click", spin);
  betDownBtn.addEventListener("click", () => adjustBet(-1));
  betUpBtn.addEventListener("click", () => adjustBet(1));
}

function loadState() {
  const fallback = {
    wallet: STARTING_TOKENS,
    bet: 5,
    totalSpent: 0,
    totalWon: 0,
    spins: 0
  };

  try {
    const raw = localStorage.getItem("ai-slot-state");
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return {
      wallet: asInt(parsed.wallet, fallback.wallet),
      bet: clamp(asInt(parsed.bet, fallback.bet), MIN_BET, MAX_BET),
      totalSpent: asInt(parsed.totalSpent, fallback.totalSpent),
      totalWon: asInt(parsed.totalWon, fallback.totalWon),
      spins: asInt(parsed.spins, fallback.spins)
    };
  } catch (_) {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem("ai-slot-state", JSON.stringify(state));
}

function asInt(value, fallback) {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function adjustBet(direction) {
  if (isSpinning) return;
  state.bet = clamp(state.bet + direction, MIN_BET, MAX_BET);
  if (state.bet > state.wallet && state.wallet > 0) {
    state.bet = state.wallet;
  }
  renderAll();
  saveState();
}

async function spin() {
  if (isSpinning) return;

  if (state.wallet <= 0) {
    setStatus("Wallet empty. Time to sell another AI wrapper app.", "loss");
    addLog("Out of tokens. Refresh only if you can emotionally handle a reset.");
    return;
  }

  if (state.bet > state.wallet) {
    state.bet = state.wallet;
    renderAll();
  }

  isSpinning = true;
  spinBtn.disabled = true;
  betDownBtn.disabled = true;
  betUpBtn.disabled = true;

  state.wallet -= state.bet;
  state.totalSpent += state.bet;
  state.spins += 1;
  renderAll();

  setStatus("Spinning... requesting absurd confidence from the model.", "");
  const results = await animateReels();
  const payout = calculatePayout(results, state.bet);
  const payoutText = payout > 0 ? `+${payout} tokens` : "no payout";

  state.wallet += payout;
  state.totalWon += payout;
  renderAll();
  saveState();

  if (payout > 0) {
    handleWinFeedback(results, payout);
  } else {
    handleLossFeedback(results);
  }

  addLog(`${results.map((r) => r.icon).join(" ")} -> ${payoutText} (bet ${state.bet})`);

  if (state.wallet === 0) {
    addLog("System notice: your runway is gone. Welcome to profitability mode.");
  }

  isSpinning = false;
  spinBtn.disabled = false;
  betDownBtn.disabled = false;
  betUpBtn.disabled = false;
}

function calculatePayout(results, bet) {
  const names = results.map((s) => s.name);
  const counts = new Map();

  names.forEach((name) => {
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  const highestMatch = Math.max(...counts.values());
  if (highestMatch === 3) {
    const symbol = results[0];
    return bet * symbol.triple;
  }
  if (highestMatch === 2) {
    return Math.ceil(bet * 0.7);
  }

  const tokenCount = results.filter((s) => s.name === "Token Cache").length;
  if (tokenCount >= 1) {
    return tokenCount;
  }

  return 0;
}

function pickSymbol() {
  let threshold = Math.random() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    threshold -= symbol.weight;
    if (threshold <= 0) return symbol;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function animateReels() {
  return new Promise((resolve) => {
    const results = [];
    let stopped = 0;

    reelNodes.forEach((reel, index) => {
      reel.classList.remove("flash-win", "flash-lose");
      reel.classList.add("spinning");

      const cycling = window.setInterval(() => {
        reel.textContent = pickSymbol().icon;
      }, 90);

      const stopAfter = 850 + index * 320;
      window.setTimeout(() => {
        window.clearInterval(cycling);
        const selected = pickSymbol();
        reel.textContent = selected.icon;
        reel.classList.remove("spinning");
        results[index] = selected;
        stopped += 1;

        reel.animate(
          [
            { transform: "translateY(-6px)" },
            { transform: "translateY(2px)" },
            { transform: "translateY(0)" }
          ],
          { duration: 260, easing: "ease-out" }
        );

        if (stopped === reelNodes.length) {
          resolve(results);
        }
      }, stopAfter);
    });
  });
}

function handleWinFeedback(results, payout) {
  const names = results.map((r) => r.name);
  const unique = new Set(names).size;
  const roast = unique === 2 ? pickRandom(roastNearMiss) : pickRandom(roastWin);

  setStatus(`Win: +${payout} tokens. ${roast}`, "win");
  reelNodes.forEach((reel) => {
    reel.classList.remove("flash-lose");
    reel.classList.add("flash-win");
  });

  playTone(780, 0.09, "triangle");
  setTimeout(() => playTone(1040, 0.1, "square"), 95);
  safeVibrate([20, 35, 20]);
}

function handleLossFeedback(results) {
  const names = results.map((r) => r.name);
  const unique = new Set(names).size;
  const roast = unique === 2 ? pickRandom(roastNearMiss) : pickRandom(roastLoss);

  setStatus(`No payout. ${roast}`, "loss");
  reelNodes.forEach((reel) => {
    reel.classList.remove("flash-win");
    reel.classList.add("flash-lose");
  });

  playTone(190, 0.08, "sawtooth");
  safeVibrate(26);
}

function setStatus(text, toneClass) {
  statusLine.textContent = text;
  statusLine.classList.remove("win", "loss");
  if (toneClass) {
    statusLine.classList.add(toneClass);
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function safeVibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency, duration, waveType) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {
    // Audio is optional; ignore if unavailable.
  }
}

function addLog(text) {
  const item = document.createElement("li");
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  item.textContent = `[${stamp}] ${text}`;
  eventLog.prepend(item);

  while (eventLog.children.length > 12) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function renderAll() {
  walletValue.textContent = String(state.wallet);
  betValue.textContent = String(state.bet);
  spinsValue.textContent = String(state.spins);
  spentValue.textContent = String(state.totalSpent);
  wonValue.textContent = String(state.totalWon);
  profitValue.textContent = String(state.totalWon - state.totalSpent);

  const noFunds = state.wallet <= 0;
  spinBtn.disabled = noFunds || isSpinning;
  if (noFunds) {
    spinBtn.textContent = "No Tokens Left";
  } else {
    spinBtn.textContent = "Spend Tokens & Pull";
  }
}
