const STORAGE_KEY = "ai-slot-bandit-v1";
const COST_PER_SPIN = 15;
const STARTING_TOKENS = 200;
const BAILOUT_AMOUNT = 75;
const BAILOUT_COOLDOWN_MS = 60_000;
const LOG_LIMIT = 10;

const machineSymbols = [
  { label: "GPU", weight: 12, triplePayout: 240, line: "Triple GPU. You accidentally trained a unicorn." },
  { label: "PROMPT", weight: 18, triplePayout: 160, line: "Prompt engineering paid rent for one more month." },
  { label: "CACHE", weight: 17, triplePayout: 120, line: "Cache hit cascade. Latency cried." },
  { label: "HYPE", weight: 21, triplePayout: 90, line: "Hype tokens minted. Fundamentals still unknown." },
  { label: "BUG", weight: 18, triplePayout: 45, line: "Three bugs in a row. Product calls it emergent behavior." },
  { label: "404", weight: 14, triplePayout: 15, line: "404 x3. You earned exactly one refund form." }
];

const specialCombos = {
  "CACHE|GPU|PROMPT": {
    payout: 130,
    isJackpot: true,
    line: "Real optimization appeared in production. Nobody believes the metrics."
  },
  "404|BUG|HYPE": {
    payout: 70,
    isJackpot: false,
    line: "You shipped chaos with confidence. Investors called it bold."
  }
};

const noWinLines = [
  "No match. The model asked for more context and ate your budget.",
  "No payout. Your tokens were converted into a keynote slide.",
  "No luck. A chatbot promised synergy and delivered disclaimers.",
  "Cold streak. The benchmark was run on vibes only."
];

const pairLines = [
  "Small win. Two symbols aligned and called it product-market fit.",
  "Pair landed. Enough tokens to keep the demo server alive.",
  "Inference credit unlocked. Barely enough to impress a recruiter."
];

const symbolMap = Object.fromEntries(machineSymbols.map((symbol) => [symbol.label, symbol]));
const totalWeight = machineSymbols.reduce((sum, symbol) => sum + symbol.weight, 0);

const reelElements = [
  document.getElementById("reel-0"),
  document.getElementById("reel-1"),
  document.getElementById("reel-2")
];

const spinButton = document.getElementById("spinButton");
const bailoutButton = document.getElementById("bailoutButton");
const shareButton = document.getElementById("shareButton");

const tokenBalanceElement = document.getElementById("tokenBalance");
const totalSpentElement = document.getElementById("totalSpent");
const totalWonElement = document.getElementById("totalWon");
const spinCountElement = document.getElementById("spinCount");
const jackpotCountElement = document.getElementById("jackpotCount");
const spinCostLabelElement = document.getElementById("spinCostLabel");
const announcerElement = document.getElementById("announcer");
const logListElement = document.getElementById("logList");

let state = loadState();
let spinning = false;
let audioContext = null;

spinCostLabelElement.textContent = String(COST_PER_SPIN);
render();
renderLog();

if (state.log.length === 0) {
  addLog("Casino boot complete. The model says this time it is definitely calibrated.");
  announce("Welcome. Spend responsibly. Hallucinations are non-refundable.");
}

spinButton.addEventListener("click", handleSpin);
bailoutButton.addEventListener("click", handleBailout);
shareButton.addEventListener("click", handleShare);

setInterval(render, 1000);

function loadState() {
  const base = {
    tokens: STARTING_TOKENS,
    totalSpent: 0,
    totalWon: 0,
    spins: 0,
    jackpots: 0,
    lastBailoutAt: 0,
    log: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return base;
    }

    const parsed = JSON.parse(raw);
    return {
      tokens: safeNumber(parsed.tokens, base.tokens),
      totalSpent: safeNumber(parsed.totalSpent, base.totalSpent),
      totalWon: safeNumber(parsed.totalWon, base.totalWon),
      spins: safeNumber(parsed.spins, base.spins),
      jackpots: safeNumber(parsed.jackpots, base.jackpots),
      lastBailoutAt: safeNumber(parsed.lastBailoutAt, base.lastBailoutAt),
      log: Array.isArray(parsed.log) ? parsed.log.slice(0, LOG_LIMIT).filter((entry) => typeof entry === "string") : []
    };
  } catch (error) {
    return base;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage write failures so gameplay still works in restricted contexts.
  }
}

function safeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function render() {
  tokenBalanceElement.textContent = formatTokens(state.tokens);
  totalSpentElement.textContent = formatTokens(state.totalSpent);
  totalWonElement.textContent = formatTokens(state.totalWon);
  spinCountElement.textContent = formatInteger(state.spins);
  jackpotCountElement.textContent = formatInteger(state.jackpots);

  spinButton.disabled = spinning || state.tokens < COST_PER_SPIN;

  const now = Date.now();
  const nextBailout = state.lastBailoutAt + BAILOUT_COOLDOWN_MS;
  if (now < nextBailout) {
    bailoutButton.disabled = true;
    bailoutButton.textContent = "Bailout Cooldown " + formatDuration(nextBailout - now);
  } else {
    bailoutButton.disabled = false;
    bailoutButton.textContent = "Ask VC For Bailout (+" + BAILOUT_AMOUNT + ")";
  }
}

function renderLog() {
  logListElement.replaceChildren();
  for (const entry of state.log) {
    const li = document.createElement("li");
    li.textContent = entry;
    logListElement.appendChild(li);
  }
}

function formatTokens(value) {
  return formatInteger(value) + " tk";
}

function formatInteger(value) {
  return Math.max(0, Math.floor(value)).toLocaleString("en-US");
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  state.log.unshift(timestamp + " - " + message);
  state.log = state.log.slice(0, LOG_LIMIT);
  renderLog();
  saveState();
}

function announce(message) {
  announcerElement.textContent = message;
}

async function handleSpin() {
  if (spinning) {
    return;
  }

  if (state.tokens < COST_PER_SPIN) {
    announce("Out of tokens. Try a bailout or accept analog hobbies.");
    return;
  }

  spinning = true;
  unlockAudio();

  try {
    state.tokens -= COST_PER_SPIN;
    state.totalSpent += COST_PER_SPIN;
    state.spins += 1;
    saveState();
    render();

    announce("Spent " + COST_PER_SPIN + " tokens. Sampling from the distribution...");
    addLog("You spent " + COST_PER_SPIN + " tokens to spin the hype wheel.");
    playSpinSound();

    const result = drawSymbols(3);
    await animateReels(result);

    const outcome = evaluateSpin(result);
    state.tokens += outcome.payout;
    state.totalWon += outcome.payout;
    if (outcome.isJackpot) {
      state.jackpots += 1;
    }

    saveState();
    render();

    announce(outcome.line + " (" + result.join(" | ") + ")");
    addLog("[" + result.join(" | ") + "] " + outcome.line + " Payout: " + outcome.payout + " tk.");

    if (outcome.payout > 0) {
      playWinSound(outcome.isJackpot);
      triggerVibration(outcome.isJackpot ? [30, 60, 120] : [20, 50, 20]);
    } else {
      playLossSound();
      triggerVibration(25);
    }
  } finally {
    spinning = false;
    render();
  }
}

async function handleBailout() {
  const now = Date.now();
  if (now < state.lastBailoutAt + BAILOUT_COOLDOWN_MS) {
    announce("VC says wait for the next funding cycle.");
    return;
  }

  unlockAudio();
  state.tokens += BAILOUT_AMOUNT;
  state.lastBailoutAt = now;
  saveState();
  render();

  announce("VC bailout approved: +" + BAILOUT_AMOUNT + " tokens for strategic storytelling.");
  addLog("Emergency pitch deck succeeded. +" + BAILOUT_AMOUNT + " bailout tokens.");
  playTone(520, 0.09, "triangle", 0.06);
  playTone(780, 0.12, "triangle", 0.05, 0.1);
}

async function handleShare() {
  const text =
    "One-Armed LLM Bandit: " +
    state.tokens +
    " tokens after " +
    state.spins +
    " spins. Spent " +
    state.totalSpent +
    ", won " +
    state.totalWon +
    ".";

  if (navigator.share) {
    try {
      await navigator.share({
        title: "One-Armed LLM Bandit",
        text
      });
      announce("Score shared. Reputation risk transferred.");
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        announce("Share cancelled. Your streak remains confidential.");
        return;
      }
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      announce("Score copied to clipboard.");
      return;
    } catch (error) {
      announce("Clipboard blocked. Manual bragging mode enabled.");
      return;
    }
  }

  announce("Share not available in this browser.");
}

function drawSymbols(count) {
  return Array.from({ length: count }, () => pickWeightedSymbol());
}

function pickWeightedSymbol() {
  const roll = randomFloat() * totalWeight;
  let bucket = 0;
  for (const symbol of machineSymbols) {
    bucket += symbol.weight;
    if (roll < bucket) {
      return symbol.label;
    }
  }
  return machineSymbols[machineSymbols.length - 1].label;
}

function randomFloat() {
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const randomValue = new Uint32Array(1);
    window.crypto.getRandomValues(randomValue);
    return randomValue[0] / 4294967296;
  }
  return Math.random();
}

function evaluateSpin(result) {
  const counts = {};
  for (const symbol of result) {
    counts[symbol] = (counts[symbol] || 0) + 1;
  }

  const uniqueKey = [...result].sort().join("|");
  if (specialCombos[uniqueKey]) {
    const special = specialCombos[uniqueKey];
    return { payout: special.payout, isJackpot: special.isJackpot, line: special.line };
  }

  const maxCount = Math.max(...Object.values(counts));
  if (maxCount === 3) {
    const symbol = symbolMap[result[0]];
    const payout = symbol ? symbol.triplePayout : 0;
    const isJackpot = payout >= 130;
    return {
      payout,
      isJackpot,
      line: symbol ? symbol.line : "Triple match. Probability disagrees."
    };
  }

  if (maxCount === 2) {
    return {
      payout: 40,
      isJackpot: false,
      line: pickLine(pairLines)
    };
  }

  return {
    payout: 0,
    isJackpot: false,
    line: pickLine(noWinLines)
  };
}

function pickLine(lines) {
  const index = Math.floor(randomFloat() * lines.length);
  return lines[index];
}

function animateReels(finalSymbols) {
  const durations = [800, 1080, 1360];

  return new Promise((resolve) => {
    reelElements.forEach((reel, index) => {
      reel.classList.add("spinning");
      const intervalId = setInterval(() => {
        const randomSymbol = machineSymbols[Math.floor(randomFloat() * machineSymbols.length)];
        reel.textContent = randomSymbol.label;
      }, 72);

      setTimeout(() => {
        clearInterval(intervalId);
        reel.classList.remove("spinning");
        reel.classList.add("landed");
        reel.textContent = finalSymbols[index];
        setTimeout(() => {
          reel.classList.remove("landed");
        }, 220);

        if (index === durations.length - 1) {
          setTimeout(resolve, 60);
        }
      }, durations[index]);
    });
  });
}

function unlockAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playSpinSound() {
  playTone(230, 0.05, "square", 0.03);
  playTone(320, 0.05, "square", 0.025, 0.08);
  playTone(390, 0.06, "square", 0.022, 0.16);
}

function playWinSound(isJackpot) {
  if (isJackpot) {
    playTone(440, 0.08, "triangle", 0.06);
    playTone(660, 0.08, "triangle", 0.05, 0.1);
    playTone(880, 0.14, "triangle", 0.05, 0.2);
    return;
  }

  playTone(390, 0.06, "triangle", 0.045);
  playTone(520, 0.09, "triangle", 0.04, 0.1);
}

function playLossSound() {
  playTone(180, 0.09, "sawtooth", 0.03);
  playTone(140, 0.12, "sawtooth", 0.025, 0.08);
}

function playTone(frequency, durationSeconds, type, gainValue, delaySeconds = 0) {
  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime + delaySeconds;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + durationSeconds + 0.01);
}

function triggerVibration(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
