const SPIN_COST = 5;
const STARTING_TOKENS = 40;
const FEED_LIMIT = 8;
const STORAGE_KEY = "token-grinder-3000-state-v1";

const SYMBOLS = [
  { id: "TOKEN", label: "TOKEN", weight: 6 },
  { id: "PROMPT", label: "PROMPT", weight: 5 },
  { id: "GPU", label: "GPU", weight: 4 },
  { id: "CACHE", label: "CACHE", weight: 4 },
  { id: "BOT", label: "BOT", weight: 3 },
  { id: "OOM", label: "OOM", weight: 2 },
  { id: "404", label: "404", weight: 2 }
];

const TRIPLE_PAYOUTS = {
  TOKEN: 22,
  PROMPT: 18,
  GPU: 30,
  CACHE: 15,
  BOT: 40,
  OOM: 60,
  404: 75
};

const STATUS_LINES = {
  spend: [
    "You spent 5 tokens asking AI to write a two-line regex.",
    "Another 5 tokens gone. The model said: 'Have you tried enterprise tier?'",
    "5 tokens paid. The bot replied with confidence and a typo.",
    "You funded another training run for a toaster with opinions."
  ],
  smallWin: [
    "The AI guessed correctly. Alert the press.",
    "Tiny win. The model may have read the docs this time.",
    "You recovered some tokens. Finance team unclenched slightly."
  ],
  bigWin: [
    "Jackpot. The model produced working code on the first try.",
    "Huge payout. Somewhere, a GPU just requested vacation.",
    "Big win. Even the hallucinations are impressed."
  ],
  lose: [
    "No match. AI recommended adding blockchain to solve it.",
    "No payout. The model insists your bug is a feature.",
    "Whiff. It answered in YAML when you asked for JavaScript.",
    "Loss. You got 14 paragraphs and zero runnable code."
  ],
  broke: [
    "Wallet empty. Time to mow lawns for token credits.",
    "Out of tokens. The AI sent you a premium pricing brochure.",
    "No tokens left. Even the chatbot asks if you want a trial."
  ]
};

const state = {
  tokens: STARTING_TOKENS,
  totalSpent: 0,
  totalWon: 0,
  spins: 0,
  feed: [],
  voiceOn: false,
  muted: false
};

let isSpinning = false;
let audioContext = null;

const reelElements = [
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
  document.getElementById("reel-3")
];

const tokenBankElement = document.getElementById("token-bank");
const spinCostElement = document.getElementById("spin-cost");
const sessionNetElement = document.getElementById("session-net");
const statusLineElement = document.getElementById("status-line");
const feedElement = document.getElementById("feed");

const spinButton = document.getElementById("spin-btn");
const voiceButton = document.getElementById("voice-btn");
const muteButton = document.getElementById("mute-btn");
const resetButton = document.getElementById("reset-btn");

loadState();
render();
bindEvents();

function bindEvents() {
  spinButton.addEventListener("click", () => {
    if (!isSpinning) {
      startSpin();
    }
  });

  voiceButton.addEventListener("click", () => {
    state.voiceOn = !state.voiceOn;
    voiceButton.textContent = state.voiceOn ? "Announcer: On" : "Announcer: Off";
    voiceButton.setAttribute("aria-pressed", String(state.voiceOn));
    addFeedItem(state.voiceOn ? "Announcer activated." : "Announcer muted.", "neutral");
    saveState();
    render();
  });

  muteButton.addEventListener("click", () => {
    state.muted = !state.muted;
    muteButton.textContent = state.muted ? "SFX: Off" : "SFX: On";
    muteButton.setAttribute("aria-pressed", String(state.muted));
    addFeedItem(state.muted ? "Sound effects disabled." : "Sound effects enabled.", "neutral");
    saveState();
    render();
  });

  resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset token wallet and history?");
    if (!confirmed) {
      return;
    }

    state.tokens = STARTING_TOKENS;
    state.totalSpent = 0;
    state.totalWon = 0;
    state.spins = 0;
    state.feed = [];
    setStatus("Wallet reset. Fresh tokens ready for bad decisions.");
    addFeedItem("Economy reset to default values.", "neutral");
    saveState();
    render();
  });
}

async function startSpin() {
  if (state.tokens < SPIN_COST) {
    const brokeLine = pick(STATUS_LINES.broke);
    setStatus(brokeLine);
    addFeedItem("Spin denied: not enough tokens.", "loss");
    softBuzz();
    speakLine(brokeLine);
    render();
    return;
  }

  isSpinning = true;
  state.tokens -= SPIN_COST;
  state.totalSpent += SPIN_COST;
  state.spins += 1;
  spinButton.disabled = true;

  const spendLine = pick(STATUS_LINES.spend);
  setStatus(spendLine);
  addFeedItem(spendLine, "neutral");
  saveState();
  render();
  ensureAudioContext();
  playSpinStartSfx();
  pulseVibration([16, 12, 16]);

  const results = await Promise.all(
    reelElements.map((reelElement, index) => spinReel(reelElement, 900 + index * 320))
  );

  const payout = calculatePayout(results);
  state.tokens += payout;
  if (payout > 0) {
    state.totalWon += payout;
  }

  const message = buildOutcomeMessage(results, payout);
  const kind = payout > 0 ? "win" : "loss";
  setStatus(message);
  addFeedItem(message, kind);
  saveState();
  render();

  if (payout > 0) {
    playWinSfx(payout >= 40);
    pulseVibration(payout >= 40 ? [20, 40, 20, 40, 40] : [20, 24, 20]);
    speakLine(pick(payout >= 40 ? STATUS_LINES.bigWin : STATUS_LINES.smallWin));
  } else {
    playLoseSfx();
    softBuzz();
  }

  isSpinning = false;
  spinButton.disabled = false;
}

function spinReel(reelElement, durationMs) {
  return new Promise((resolve) => {
    reelElement.classList.add("spinning");
    const intervalMs = 85;

    const intervalId = window.setInterval(() => {
      reelElement.textContent = pick(SYMBOLS).label;
      playTickSfx();
    }, intervalMs);

    window.setTimeout(() => {
      clearInterval(intervalId);
      reelElement.classList.remove("spinning");
      const finalSymbol = weightedPick(SYMBOLS);
      reelElement.textContent = finalSymbol.label;
      resolve(finalSymbol.id);
    }, durationMs);
  });
}

function calculatePayout(results) {
  const counts = {};
  for (const symbol of results) {
    counts[symbol] = (counts[symbol] || 0) + 1;
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topSymbol, topCount] = entries[0];

  if (topCount === 3) {
    return TRIPLE_PAYOUTS[topSymbol] || 0;
  }

  if (topCount === 2) {
    return 8;
  }

  return 0;
}

function buildOutcomeMessage(results, payout) {
  const joined = results.join(" | ");

  if (payout >= 40) {
    return `${joined}: JACKPOT +${payout} tokens. The model stopped hallucinating for 3 seconds.`;
  }

  if (payout > 0) {
    return `${joined}: +${payout} tokens. ${pick(STATUS_LINES.smallWin)}`;
  }

  return `${joined}: +0 tokens. ${pick(STATUS_LINES.lose)}`;
}

function render() {
  tokenBankElement.textContent = String(state.tokens);
  spinCostElement.textContent = String(SPIN_COST);

  const net = state.totalWon - state.totalSpent;
  sessionNetElement.textContent = (net >= 0 ? "+" : "") + String(net);
  sessionNetElement.classList.toggle("negative", net < 0);

  voiceButton.textContent = state.voiceOn ? "Announcer: On" : "Announcer: Off";
  muteButton.textContent = state.muted ? "SFX: Off" : "SFX: On";
  voiceButton.setAttribute("aria-pressed", String(state.voiceOn));
  muteButton.setAttribute("aria-pressed", String(state.muted));

  spinButton.disabled = isSpinning || state.tokens < SPIN_COST;
  spinButton.textContent = state.tokens >= SPIN_COST ? `Spin (-${SPIN_COST} tokens)` : "Out of tokens";

  feedElement.innerHTML = "";
  state.feed.forEach((item) => {
    const row = document.createElement("li");
    row.className = item.kind;
    row.textContent = item.text;
    feedElement.appendChild(row);
  });
}

function setStatus(text) {
  statusLineElement.textContent = text;
}

function addFeedItem(text, kind) {
  const stamped = `${formatTime(new Date())} - ${text}`;
  state.feed.unshift({ text: stamped, kind });
  state.feed = state.feed.slice(0, FEED_LIMIT);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function weightedPick(list) {
  const totalWeight = list.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of list) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }
  return list[list.length - 1];
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.feed = [{
        text: `${formatTime(new Date())} - Wallet initialized with ${STARTING_TOKENS} tokens.`,
        kind: "neutral"
      }];
      return;
    }

    const saved = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) {
      return;
    }

    state.tokens = asNumber(saved.tokens, STARTING_TOKENS);
    state.totalSpent = asNumber(saved.totalSpent, 0);
    state.totalWon = asNumber(saved.totalWon, 0);
    state.spins = asNumber(saved.spins, 0);
    state.voiceOn = Boolean(saved.voiceOn);
    state.muted = Boolean(saved.muted);
    state.feed = Array.isArray(saved.feed) ? saved.feed.slice(0, FEED_LIMIT) : [];

    if (state.feed.length === 0) {
      state.feed.push({
        text: `${formatTime(new Date())} - Wallet loaded. AI still expensive.`,
        kind: "neutral"
      });
    }
  } catch (_error) {
    state.feed = [{
      text: `${formatTime(new Date())} - Save data was corrupted. Wallet repaired.`,
      kind: "neutral"
    }];
  }
}

function saveState() {
  const payload = {
    tokens: state.tokens,
    totalSpent: state.totalSpent,
    totalWon: state.totalWon,
    spins: state.spins,
    feed: state.feed,
    voiceOn: state.voiceOn,
    muted: state.muted
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    setStatus("Could not save your wallet. Browser storage may be disabled.");
  }
}

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function ensureAudioContext() {
  if (audioContext || state.muted) {
    return;
  }

  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return;
  }

  audioContext = new Context();
}

function playTone({
  frequency = 440,
  type = "square",
  duration = 0.08,
  gain = 0.025
}) {
  if (state.muted || !audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playSpinStartSfx() {
  playTone({ frequency: 170, type: "sawtooth", duration: 0.11, gain: 0.03 });
  window.setTimeout(() => {
    playTone({ frequency: 210, type: "sawtooth", duration: 0.09, gain: 0.02 });
  }, 70);
}

function playTickSfx() {
  playTone({ frequency: 360, type: "triangle", duration: 0.045, gain: 0.009 });
}

function playWinSfx(bigWin) {
  const notes = bigWin ? [523.25, 659.25, 783.99, 987.77] : [392, 523.25, 659.25];
  notes.forEach((freq, idx) => {
    window.setTimeout(() => {
      playTone({ frequency: freq, type: "square", duration: 0.11, gain: 0.03 });
    }, idx * 85);
  });
}

function playLoseSfx() {
  playTone({ frequency: 180, type: "sine", duration: 0.12, gain: 0.025 });
  window.setTimeout(() => {
    playTone({ frequency: 130, type: "sine", duration: 0.18, gain: 0.03 });
  }, 80);
}

function softBuzz() {
  if (!("vibrate" in navigator)) {
    return;
  }
  navigator.vibrate(35);
}

function pulseVibration(pattern) {
  if (!("vibrate" in navigator)) {
    return;
  }
  navigator.vibrate(pattern);
}

function speakLine(line) {
  if (!state.voiceOn || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(line);
  utterance.rate = 1;
  utterance.pitch = 0.8;
  utterance.volume = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
