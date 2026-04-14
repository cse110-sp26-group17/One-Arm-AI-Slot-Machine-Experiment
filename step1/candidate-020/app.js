const STARTING_TOKENS = 120;
const STORAGE_KEY = "token-burner-9000-state-v1";
const SPIN_DURATION_MS = 1200;
const SPIN_FRAME_MS = 90;
const AUTO_SPIN_COUNT = 5;
const MAX_LOG_ITEMS = 8;

const SYMBOLS = [
  { id: "token", icon: "TOK", label: "TOKEN", weight: 20 },
  { id: "gpu", icon: "GPU", label: "GPU MELTDOWN", weight: 10 },
  { id: "fact", icon: "DOC", label: "FACT CHECK", weight: 10 },
  { id: "audit", icon: "LOG", label: "AUDIT TRAIL", weight: 9 },
  { id: "captcha", icon: "BOT", label: "CAPTCHA", weight: 15 },
  { id: "latency", icon: "LAG", label: "HIGH LATENCY", weight: 13 },
  { id: "apology", icon: "SRY", label: "MODEL APOLOGY", weight: 13 },
  { id: "hallucination", icon: "???", label: "HALLUCINATION", weight: 10 }
];

const TRIPLE_PAYOUTS = {
  token: 12,
  gpu: 8,
  fact: 7,
  audit: 6,
  captcha: 5,
  latency: 4,
  apology: 3,
  hallucination: 2
};

const winLines = [
  "Impossible. The AI cited a real source for once.",
  "Your prompt was concise, grounded, and somehow profitable.",
  "A venture capitalist just called this a disruptive jackpot.",
  "The benchmark finally matched production. You win."
];

const loseLines = [
  "The model is confident, wrong, and still charging by token.",
  "Great spin. Your budget was converted into vibes.",
  "Hallucination tax applied. Please prompt again.",
  "The AI says this was a feature, not a loss."
];

const excuseLines = [
  "As an AI, I cannot stop burning your tokens.",
  "I am 73% sure that was a jackpot in another universe.",
  "The result is accurate to the best of my imagination.",
  "I cannot provide financial advice, only financial comedy.",
  "Latency was high because I was being creative."
];

const reels = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2")
];

const tokenCount = document.getElementById("tokenCount");
const spinCount = document.getElementById("spinCount");
const winningsCount = document.getElementById("winningsCount");
const statusMessage = document.getElementById("statusMessage");
const betSelect = document.getElementById("betSelect");
const spinButton = document.getElementById("spinButton");
const autoButton = document.getElementById("autoButton");
const resetButton = document.getElementById("resetButton");
const roastButton = document.getElementById("roastButton");
const eventLog = document.getElementById("eventLog");

let gameState = loadState();
let isSpinning = false;
let isAutoSpinning = false;
let audioContext = null;

hydrateUi();
wireEvents();
renderReels([pickSymbol(), pickSymbol(), pickSymbol()]);
setStatus("Machine online. Tokens fear your courage.", "neutral");

function wireEvents() {
  spinButton.addEventListener("click", () => {
    void spinOnce({ source: "manual" });
  });

  autoButton.addEventListener("click", () => {
    void runAutoSpins();
  });

  resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset your wallet back to 120 tokens?");
    if (!confirmed) {
      return;
    }
    gameState = {
      tokens: STARTING_TOKENS,
      spins: 0,
      winnings: 0,
      log: ["Wallet reset. New startup funding secured."]
    };
    persistState();
    hydrateUi();
    renderReels([pickSymbol(), pickSymbol(), pickSymbol()]);
    setStatus("Fresh budget loaded. Try not to over-prompt.", "neutral");
  });

  roastButton.addEventListener("click", () => {
    const line = randomItem(excuseLines);
    setStatus(`AI Excuse: "${line}"`, "lose");
    addLog(`Excuse generator: ${line}`);
    persistState();
    hydrateUi();
    speak(line);
    vibratePattern([12, 30, 18]);
  });

  if (!("speechSynthesis" in window)) {
    roastButton.title = "Speech API not available in this browser.";
  }
}

async function runAutoSpins() {
  if (isSpinning || isAutoSpinning) {
    return;
  }
  isAutoSpinning = true;
  syncControls();
  setStatus("Auto-burn started: five ethically questionable spins.", "neutral");
  for (let index = 0; index < AUTO_SPIN_COUNT; index += 1) {
    const successful = await spinOnce({
      source: "auto",
      autoLabel: `${index + 1}/${AUTO_SPIN_COUNT}`
    });
    if (!successful) {
      break;
    }
    await sleep(180);
  }
  isAutoSpinning = false;
  syncControls();
}

async function spinOnce({ source, autoLabel } = {}) {
  if (isSpinning) {
    return false;
  }

  const spend = Number(betSelect.value);
  if (Number.isNaN(spend) || spend <= 0) {
    return false;
  }

  if (gameState.tokens < spend) {
    setStatus("Out of tokens. The AI has consumed your entire runway.", "lose");
    addLog("Spin blocked: insufficient tokens.");
    persistState();
    hydrateUi();
    vibratePattern([40, 40, 40]);
    return false;
  }

  isSpinning = true;
  syncControls();
  gameState.tokens -= spend;
  gameState.spins += 1;
  hydrateUi();
  persistState();

  const rollTicker = startSpinAnimation();
  const result = [pickSymbol(), pickSymbol(), pickSymbol()];
  await sleep(SPIN_DURATION_MS);
  window.clearInterval(rollTicker);
  reels.forEach((reel) => reel.classList.remove("spinning"));
  renderReels(result);

  const multiplier = evaluatePayout(result);
  const payout = spend * multiplier;
  let summary;

  if (payout > 0) {
    gameState.tokens += payout;
    gameState.winnings += payout;
    summary = `${randomItem(winLines)} +${payout} tokens (${multiplier}x).`;
    setStatus(summary, "win");
    playWinSfx();
    vibratePattern([25, 60, 25]);
  } else {
    summary = `${randomItem(loseLines)} -${spend} tokens.`;
    setStatus(summary, "lose");
    playLoseSfx();
    vibratePattern(24);
  }

  const spinSource = source === "auto" ? `Auto ${autoLabel}` : "Manual";
  const outcomeText = result.map((symbol) => symbol.label).join(" | ");
  addLog(`${spinSource}: ${outcomeText} => ${payout > 0 ? `+${payout}` : `-${spend}`} tokens`);

  persistState();
  hydrateUi();
  isSpinning = false;
  syncControls();
  return true;
}

function startSpinAnimation() {
  reels.forEach((reel) => {
    reel.classList.add("spinning");
  });
  return window.setInterval(() => {
    renderReels([pickSymbol(), pickSymbol(), pickSymbol()]);
  }, SPIN_FRAME_MS);
}

function evaluatePayout(result) {
  const ids = result.map((symbol) => symbol.id);
  const uniqueCount = new Set(ids).size;

  if (uniqueCount === 1) {
    return TRIPLE_PAYOUTS[ids[0]] || 2;
  }

  const tokenCountInRow = ids.filter((id) => id === "token").length;
  if (tokenCountInRow >= 2) {
    return 3;
  }

  const hasToken = ids.includes("token");
  const hasFact = ids.includes("fact");
  const hasAudit = ids.includes("audit");
  if (hasToken && hasFact && hasAudit) {
    return 5;
  }

  return 0;
}

function renderReels(result) {
  result.forEach((symbol, index) => {
    reels[index].textContent = `${symbol.icon} ${symbol.label}`;
  });
}

function setStatus(message, tone) {
  statusMessage.textContent = message;
  statusMessage.classList.remove("win", "lose", "flash");
  if (tone === "win") {
    statusMessage.classList.add("win");
  } else if (tone === "lose") {
    statusMessage.classList.add("lose");
  }
  // Re-adding the same class triggers the status flash animation.
  void statusMessage.offsetWidth;
  statusMessage.classList.add("flash");
}

function hydrateUi() {
  tokenCount.textContent = String(gameState.tokens);
  spinCount.textContent = String(gameState.spins);
  winningsCount.textContent = String(gameState.winnings);
  renderLog();
}

function syncControls() {
  const busy = isSpinning || isAutoSpinning;
  spinButton.disabled = busy;
  autoButton.disabled = busy;
  betSelect.disabled = busy;
  resetButton.disabled = isSpinning;
}

function addLog(text) {
  gameState.log.unshift(text);
  gameState.log = gameState.log.slice(0, MAX_LOG_ITEMS);
}

function renderLog() {
  eventLog.textContent = "";
  if (!gameState.log.length) {
    const item = document.createElement("li");
    item.textContent = "No runs yet. Touch grass while you still can.";
    eventLog.appendChild(item);
    return;
  }
  gameState.log.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    eventLog.appendChild(item);
  });
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        tokens: STARTING_TOKENS,
        spins: 0,
        winnings: 0,
        log: ["Wallet initialized. Tokens loaded from local reality."]
      };
    }
    const parsed = JSON.parse(raw);
    const tokens = Number(parsed.tokens);
    const spins = Number(parsed.spins);
    const winnings = Number(parsed.winnings);
    const log = Array.isArray(parsed.log) ? parsed.log.slice(0, MAX_LOG_ITEMS) : [];
    if ([tokens, spins, winnings].some((value) => Number.isNaN(value))) {
      throw new Error("Invalid persisted state.");
    }
    return { tokens, spins, winnings, log };
  } catch (error) {
    return {
      tokens: STARTING_TOKENS,
      spins: 0,
      winnings: 0,
      log: ["State recovery used. Previous machine memory was corrupted."]
    };
  }
}

function persistState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (error) {
    // If persistence fails, the game should still run in memory.
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
  return SYMBOLS[SYMBOLS.length - 1];
}

function randomItem(items) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playTone({ frequency, duration = 0.1, type = "square", gain = 0.05 }) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.value = gain;
  oscillator.connect(volume);
  volume.connect(ctx.destination);

  const now = ctx.currentTime;
  volume.gain.setValueAtTime(gain, now);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playWinSfx() {
  playTone({ frequency: 360, duration: 0.08, type: "triangle", gain: 0.06 });
  window.setTimeout(() => {
    playTone({ frequency: 520, duration: 0.12, type: "triangle", gain: 0.06 });
  }, 70);
}

function playLoseSfx() {
  playTone({ frequency: 150, duration: 0.09, type: "sawtooth", gain: 0.045 });
}

function vibratePattern(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const phrase = new SpeechSynthesisUtterance(text);
  phrase.rate = 1.03;
  phrase.pitch = 0.95;
  phrase.lang = "en-US";
  window.speechSynthesis.speak(phrase);
}
