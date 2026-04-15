"use strict";

const STARTING_TOKENS = 120;
const SPIN_COST = 10;
const TUNE_COST = 25;
const AIRDROP_AMOUNT = 50;
const AIRDROP_COOLDOWN_MS = 60 * 1000;
const STORAGE_KEY = "token-grinder-3000-state-v1";
const MAX_HISTORY = 9;

const SYMBOLS = [
  { label: "TOKEN", weight: 19, triple: 120, pair: 24 },
  { label: "GPU", weight: 15, triple: 85, pair: 18 },
  { label: "PROMPT", weight: 20, triple: 50, pair: 10 },
  { label: "CACHE", weight: 16, triple: 34, pair: 8 },
  { label: "BOT", weight: 14, triple: 30, pair: 7 },
  { label: "404", weight: 10, triple: 0, pair: 0 },
  { label: "HALLUC", weight: 6, triple: 0, pair: 0 },
];

const tripleRoasts = {
  TOKEN: "Triple TOKEN. Congratulations, you accidentally built a monetization feature.",
  GPU: "Triple GPU. Compute is expensive, but today it paid rent.",
  PROMPT: "Triple PROMPT. You optimized wording and the universe said yes.",
  CACHE: "Triple CACHE. Serving stale answers has never felt so profitable.",
  BOT: "Triple BOT. The swarm approves your deployment.",
  "404": "Triple 404. Your balance could not be found.",
  HALLUC: "Triple HALLUC. The model is confident and wrong at scale.",
};

const pairRoasts = {
  TOKEN: "Pair of TOKEN. The platform nudges you back in.",
  GPU: "Pair of GPU. You sold a tiny sliver of compute.",
  PROMPT: "Pair of PROMPT. Prompt engineering finally purchased lunch.",
  CACHE: "Pair of CACHE. Duplicate output, duplicate joy.",
  BOT: "Pair of BOT. Agents cooperating suspiciously well.",
  "404": "Pair of 404. Two broken links and one bad decision.",
  HALLUC: "Pair of HALLUC. Evidence-free optimism detected.",
};

const dryLines = [
  "No match. The model calls this exploratory spending.",
  "Nothing aligned. Please increase hype and try again.",
  "Loss registered. We recommend blaming the benchmark.",
  "Reels missed. Please file a postmortem no one will read.",
  "No payout. At least your telemetry is rich.",
];

const reelEls = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2"),
];

const tokenBalanceEl = document.getElementById("tokenBalance");
const spinCountEl = document.getElementById("spinCount");
const winRateEl = document.getElementById("winRate");
const netTokensEl = document.getElementById("netTokens");
const statusMessageEl = document.getElementById("statusMessage");
const historyListEl = document.getElementById("historyList");
const spinButton = document.getElementById("spinButton");
const tuneButton = document.getElementById("tuneButton");
const airdropButton = document.getElementById("airdropButton");
const shareButton = document.getElementById("shareButton");
const resetButton = document.getElementById("resetButton");
const machineEl = document.querySelector(".machine");

let spinning = false;
let audioContext = null;
let state = loadState();

function defaultState() {
  return {
    tokens: STARTING_TOKENS,
    spins: 0,
    wins: 0,
    tokensWon: 0,
    tokensSpent: 0,
    boostSpins: 0,
    lastAirdropAt: 0,
    history: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    const defaults = defaultState();
    const merged = { ...defaults, ...parsed };
    merged.history = Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : [];
    merged.tokens = safeNumber(merged.tokens, defaults.tokens);
    merged.spins = safeNumber(merged.spins, 0);
    merged.wins = safeNumber(merged.wins, 0);
    merged.tokensWon = safeNumber(merged.tokensWon, 0);
    merged.tokensSpent = safeNumber(merged.tokensSpent, 0);
    merged.boostSpins = safeNumber(merged.boostSpins, 0);
    merged.lastAirdropAt = safeNumber(merged.lastAirdropAt, 0);
    return merged;
  } catch (_error) {
    return defaultState();
  }
}

function safeNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_error) {
    // Persistence can fail in restricted contexts. Gameplay should still continue.
  }
}

function setStatus(message) {
  statusMessageEl.textContent = message;
}

function addHistory(message) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  state.history.unshift({ time, message });
  state.history = state.history.slice(0, MAX_HISTORY);
}

function renderHistory() {
  if (!state.history.length) {
    historyListEl.innerHTML = "<li><span class=\"time\">NOW</span>Booted Token Grinder 3000. Odds are emotional.</li>";
    return;
  }

  historyListEl.innerHTML = state.history
    .map((entry) => `<li><span class="time">${entry.time}</span>${entry.message}</li>`)
    .join("");
}

function renderStats() {
  tokenBalanceEl.textContent = `${state.tokens}`;
  spinCountEl.textContent = `${state.spins}`;

  const winRate = state.spins ? Math.round((state.wins / state.spins) * 100) : 0;
  winRateEl.textContent = `${winRate}%`;

  const net = state.tokensWon - state.tokensSpent;
  netTokensEl.textContent = net >= 0 ? `+${net}` : `${net}`;
  netTokensEl.style.color = net >= 0 ? "var(--good)" : "var(--danger)";

  spinButton.disabled = spinning || state.tokens < SPIN_COST;
  tuneButton.disabled = spinning || state.tokens < TUNE_COST;
  shareButton.disabled = spinning;

  if (state.boostSpins > 0) {
    spinButton.textContent = `Spin (-${SPIN_COST}) Boost x${state.boostSpins}`;
  } else {
    spinButton.textContent = `Spin (-${SPIN_COST})`;
  }

  const waitMs = Math.max(0, AIRDROP_COOLDOWN_MS - (Date.now() - state.lastAirdropAt));
  if (waitMs > 0) {
    airdropButton.disabled = true;
    airdropButton.textContent = `Airdrop in ${formatMs(waitMs)}`;
  } else {
    airdropButton.disabled = spinning;
    airdropButton.textContent = `Collect Airdrop (+${AIRDROP_AMOUNT})`;
  }
}

function render() {
  renderStats();
  renderHistory();
}

function formatMs(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    audioContext = new AudioCtx();
  }
  return audioContext;
}

function playTone(freq, duration, type, volume) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

function playSpinSound() {
  playTone(180, 0.09, "square", 0.04);
  setTimeout(() => playTone(220, 0.09, "square", 0.04), 75);
}

function playWinSound() {
  playTone(380, 0.12, "triangle", 0.05);
  setTimeout(() => playTone(520, 0.15, "triangle", 0.05), 110);
}

function playJackpotSound() {
  playTone(320, 0.11, "sawtooth", 0.045);
  setTimeout(() => playTone(430, 0.11, "sawtooth", 0.045), 90);
  setTimeout(() => playTone(620, 0.17, "triangle", 0.06), 180);
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function drawSymbol(boosted) {
  const weighted = SYMBOLS.map((symbol) => {
    if (!boosted) {
      return symbol;
    }
    if (symbol.label === "TOKEN" || symbol.label === "GPU") {
      return { ...symbol, weight: Math.round(symbol.weight * 1.35) };
    }
    if (symbol.label === "404" || symbol.label === "HALLUC") {
      return { ...symbol, weight: Math.max(1, Math.round(symbol.weight * 0.8)) };
    }
    return symbol;
  });

  const totalWeight = weighted.reduce((acc, symbol) => acc + symbol.weight, 0);
  let pick = Math.random() * totalWeight;
  for (const symbol of weighted) {
    pick -= symbol.weight;
    if (pick <= 0) {
      return symbol;
    }
  }
  return weighted[weighted.length - 1];
}

function randomDryLine() {
  return dryLines[Math.floor(Math.random() * dryLines.length)];
}

function evaluateSpin(resultLabels, boosted) {
  const counts = resultLabels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topLabel, topCount] = entries[0];
  const symbolInfo = SYMBOLS.find((s) => s.label === topLabel);

  if (topCount === 3) {
    const base = symbolInfo ? symbolInfo.triple : 0;
    const payout = boosted ? Math.round(base * 1.35) : base;
    return {
      payout,
      win: payout > 0,
      jackpot: payout >= 100,
      message: tripleRoasts[topLabel] || "Triple match achieved.",
    };
  }

  if (topCount === 2) {
    const base = symbolInfo ? symbolInfo.pair : 0;
    const payout = boosted ? Math.round(base * 1.35) : base;
    return {
      payout,
      win: payout > 0,
      jackpot: false,
      message: pairRoasts[topLabel] || "Pair match achieved.",
    };
  }

  if (resultLabels.includes("404") && resultLabels.includes("HALLUC")) {
    return {
      payout: 0,
      win: false,
      jackpot: false,
      message: "404 plus HALLUC. Your AI confidently returned no results.",
    };
  }

  return {
    payout: 0,
    win: false,
    jackpot: false,
    message: randomDryLine(),
  };
}

function spinReel(reelEl, finalLabel, ticks, tickMs) {
  return new Promise((resolve) => {
    reelEl.classList.add("is-spinning");
    let remaining = ticks;

    const timer = setInterval(() => {
      const random = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      reelEl.textContent = random.label;
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(timer);
        reelEl.textContent = finalLabel;
        reelEl.classList.remove("is-spinning");
        reelEl.classList.add("is-stop");
        setTimeout(() => reelEl.classList.remove("is-stop"), 220);
        resolve();
      }
    }, tickMs);
  });
}

async function animateReels(finalLabels) {
  const promises = reelEls.map((reelEl, index) => spinReel(reelEl, finalLabels[index], 12 + (index * 4), 62));
  await Promise.all(promises);
}

async function handleSpin() {
  if (spinning) {
    return;
  }

  if (state.tokens < SPIN_COST) {
    setStatus("Out of tokens. Try the airdrop or admit the experiment failed.");
    return;
  }

  spinning = true;
  machineEl.classList.remove("jackpot");

  const boosted = state.boostSpins > 0;
  state.tokens -= SPIN_COST;
  state.tokensSpent += SPIN_COST;
  state.spins += 1;
  if (boosted) {
    state.boostSpins -= 1;
  }

  render();
  saveState();
  playSpinSound();
  vibrate([24, 18, 24]);

  const finalSymbols = [drawSymbol(boosted).label, drawSymbol(boosted).label, drawSymbol(boosted).label];
  await animateReels(finalSymbols);

  const result = evaluateSpin(finalSymbols, boosted);
  if (result.payout > 0) {
    state.tokens += result.payout;
    state.tokensWon += result.payout;
    state.wins += 1;
  }

  const combo = finalSymbols.join(" | ");
  const boostTag = boosted ? " [fine-tuned]" : "";
  addHistory(`${combo} -> ${result.payout > 0 ? `+${result.payout}` : "+0"} tokens${boostTag}.`);

  let status = `${combo}. ${result.message}`;
  if (result.payout > 0) {
    status += ` Payout: +${result.payout} tokens.`;
    if (result.jackpot) {
      machineEl.classList.add("jackpot");
      playJackpotSound();
      vibrate([40, 40, 40, 40]);
      status += " Jackpot energy detected.";
      if ("speechSynthesis" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const utterance = new SpeechSynthesisUtterance("Jackpot. Investors are pretending this is sustainable.");
        utterance.rate = 1;
        utterance.pitch = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } else {
      playWinSound();
      vibrate(22);
    }
  } else {
    playTone(140, 0.08, "square", 0.035);
  }

  setStatus(status);
  render();
  saveState();
  spinning = false;
  render();
}

function handleTuneModel() {
  if (spinning) {
    return;
  }
  if (state.tokens < TUNE_COST) {
    setStatus("Fine-tuning requires 25 tokens and fragile confidence.");
    return;
  }

  state.tokens -= TUNE_COST;
  state.tokensSpent += TUNE_COST;
  state.boostSpins += 3;
  addHistory(`Spent ${TUNE_COST} tokens to fine-tune. Next 3 spins are slightly less cursed.`);
  setStatus("Fine-tune complete. For three spins, TOKEN/GPU odds and payouts are boosted.");
  playTone(260, 0.07, "triangle", 0.04);
  setTimeout(() => playTone(330, 0.1, "triangle", 0.04), 70);
  render();
  saveState();
}

function handleAirdrop() {
  const waitMs = Math.max(0, AIRDROP_COOLDOWN_MS - (Date.now() - state.lastAirdropAt));
  if (waitMs > 0) {
    setStatus(`Airdrop still cooling down. Try again in ${formatMs(waitMs)}.`);
    return;
  }

  state.tokens += AIRDROP_AMOUNT;
  state.tokensWon += AIRDROP_AMOUNT;
  state.lastAirdropAt = Date.now();
  addHistory(`Claimed an investor airdrop: +${AIRDROP_AMOUNT} tokens.`);
  setStatus("Airdrop received. Your runway was extended by one dramatic tweet.");
  playTone(300, 0.09, "triangle", 0.04);
  render();
  saveState();
}

async function handleShare() {
  const message = `I have ${state.tokens} AI tokens after ${state.spins} spins in Token Grinder 3000.`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Token Grinder 3000",
        text: message,
      });
      setStatus("Brag shared. Your personal brand grew 12%.");
      return;
    } catch (_error) {
      // User may cancel share action.
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(message);
      setStatus("Brag copied to clipboard. Deploy it responsibly.");
      return;
    } catch (_error) {
      // Clipboard can fail due to browser permission rules.
    }
  }

  setStatus(`Manual brag mode: "${message}"`);
}

function handleReset() {
  if (spinning) {
    return;
  }
  const confirmed = window.confirm("Reset your wallet and history? This will erase saved progress.");
  if (!confirmed) {
    return;
  }
  state = defaultState();
  reelEls.forEach((reel) => {
    reel.textContent = "PROMPT";
  });
  setStatus("Reset complete. New experiment, same questionable ethics.");
  addHistory("Performed hard reset. Fresh wallet initialized.");
  render();
  saveState();
}

spinButton.addEventListener("click", handleSpin);
tuneButton.addEventListener("click", handleTuneModel);
airdropButton.addEventListener("click", handleAirdrop);
shareButton.addEventListener("click", handleShare);
resetButton.addEventListener("click", handleReset);

setInterval(() => {
  if (!spinning) {
    renderStats();
  }
}, 1000);

render();
