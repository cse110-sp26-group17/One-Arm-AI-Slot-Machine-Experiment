const STARTING_TOKENS = 100;
const SPIN_COST = 10;
const SAVE_KEY = "prompt-profit-slots-v1";

const symbols = ["🤖", "🧠", "🔥", "💸", "📉", "🪙", "🧪", "💀"];

const symbolLabels = {
  "🤖": "Autonomous Intern",
  "🧠": "Hallucination Engine",
  "🔥": "GPU Meltdown",
  "💸": "VC Burn Rate",
  "📉": "Token Crash",
  "🪙": "Meme Coin",
  "🧪": "Prompt Experiment",
  "💀": "Model Collapse"
};

const el = {
  reels: [
    document.getElementById("reel0"),
    document.getElementById("reel1"),
    document.getElementById("reel2")
  ],
  tokenCount: document.getElementById("tokenCount"),
  spinCost: document.getElementById("spinCost"),
  lastPayout: document.getElementById("lastPayout"),
  message: document.getElementById("message"),
  spinBtn: document.getElementById("spinBtn"),
  resetBtn: document.getElementById("resetBtn")
};

let state = loadState();
let audioContext;
let isSpinning = false;

el.spinCost.textContent = SPIN_COST;
render();

el.spinBtn.addEventListener("click", spin);
el.resetBtn.addEventListener("click", resetGame);

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return {
        tokens: STARTING_TOKENS,
        lastPayout: 0,
        reelValues: ["🤖", "🧠", "🔥"]
      };
    }
    const parsed = JSON.parse(raw);
    return {
      tokens: Number.isFinite(parsed.tokens) ? parsed.tokens : STARTING_TOKENS,
      lastPayout: Number.isFinite(parsed.lastPayout) ? parsed.lastPayout : 0,
      reelValues: Array.isArray(parsed.reelValues) ? parsed.reelValues : ["🤖", "🧠", "🔥"]
    };
  } catch {
    return {
      tokens: STARTING_TOKENS,
      lastPayout: 0,
      reelValues: ["🤖", "🧠", "🔥"]
    };
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function render() {
  el.tokenCount.textContent = state.tokens;
  el.lastPayout.textContent = state.lastPayout;
  state.reelValues.forEach((value, index) => {
    el.reels[index].textContent = value;
    const label = symbolLabels[value] || "Mystery Token";
    el.reels[index].setAttribute("aria-label", `Reel ${index + 1}: ${label}`);
  });

  const canSpin = !isSpinning && state.tokens >= SPIN_COST;
  el.spinBtn.disabled = !canSpin;
  if (state.tokens < SPIN_COST) {
    setMessage("Out of tokens. Your AI startup is now pivoting to consulting.", "lose");
  }
}

async function spin() {
  if (isSpinning || state.tokens < SPIN_COST) return;

  isSpinning = true;
  state.tokens -= SPIN_COST;
  state.lastPayout = 0;
  setMessage("Spinning the prompt wheel... maybe this one scales?", "");
  playTone(220, 0.06, "sawtooth", 0.03);
  vibrate(30);

  render();
  saveState();

  for (let i = 0; i < el.reels.length; i += 1) {
    await animateReel(i);
  }

  const payout = evaluate(state.reelValues);
  state.tokens += payout;
  state.lastPayout = payout;

  if (payout > 0) {
    setMessage(getWinMessage(state.reelValues, payout), "win");
    playTone(720, 0.08, "triangle", 0.06);
    playTone(920, 0.12, "triangle", 0.05);
    vibrate([40, 20, 40]);
  } else {
    setMessage(getLoseMessage(state.reelValues), "lose");
    playTone(150, 0.12, "square", 0.02);
  }

  isSpinning = false;
  render();
  saveState();
}

async function animateReel(reelIndex) {
  const reel = el.reels[reelIndex];
  reel.classList.add("spinning");
  const cycles = 8 + reelIndex * 4;

  for (let i = 0; i < cycles; i += 1) {
    const value = symbols[randomInt(0, symbols.length - 1)];
    state.reelValues[reelIndex] = value;
    reel.textContent = value;
    playTone(300 + i * 10, 0.015, "square", 0.01);
    await wait(55);
  }

  const finalValue = symbols[randomInt(0, symbols.length - 1)];
  state.reelValues[reelIndex] = finalValue;
  reel.textContent = finalValue;
  reel.classList.remove("spinning");
}

function evaluate(reelValues) {
  const [a, b, c] = reelValues;

  if (a === b && b === c) {
    if (a === "🪙") return 80;
    if (a === "💸") return 60;
    if (a === "💀") return 1;
    return 45;
  }

  if (a === b || b === c || a === c) {
    return 15;
  }

  // Mock bonus for a "realistic" AI trajectory: hype, burn, collapse.
  if (reelValues.includes("🧠") && reelValues.includes("💸") && reelValues.includes("📉")) {
    return 25;
  }

  return 0;
}

function getWinMessage(reelValues, payout) {
  const [a, b, c] = reelValues;
  if (a === b && b === c && a === "💀") {
    return `Triple Model Collapse! You win ${payout} TOK and a cautionary blog post.`;
  }
  if (a === b && b === c) {
    return `JACKPOT: ${symbolLabels[a]} x3. You gained ${payout} TOK.`;
  }
  if (payout === 25) {
    return `Perfect AI lifecycle combo. Investors are clapping. +${payout} TOK.`;
  }
  return `Two-of-a-kind! The market believes your demo. +${payout} TOK.`;
}

function getLoseMessage(reelValues) {
  const names = reelValues.map((symbol) => symbolLabels[symbol]);
  return `No match: ${names.join(", ")}. Tokens burned for "inference".`;
}

function setMessage(text, tone) {
  el.message.textContent = text;
  el.message.classList.remove("win", "lose");
  if (tone) {
    el.message.classList.add(tone);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resetGame() {
  state = {
    tokens: STARTING_TOKENS,
    lastPayout: 0,
    reelValues: ["🤖", "🧠", "🔥"]
  };
  setMessage("Fresh funding round closed. Tokens reset to 100 TOK.", "");
  playTone(460, 0.08, "sine", 0.05);
  render();
  saveState();
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function getAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    audioContext = new Ctx();
  }
  return audioContext;
}

function playTone(freq, duration, type, gainValue) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  osc.start(now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.stop(now + duration);
}
