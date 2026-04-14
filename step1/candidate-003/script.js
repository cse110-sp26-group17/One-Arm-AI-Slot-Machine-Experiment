const START_TOKENS = 120;
const SPIN_COST = 10;
const STORAGE_KEY = "token-tumbler-state-v1";
const symbols = ["🧠", "🤖", "💸", "🔌", "📉", "🧾", "🌀"];

const reels = [
  document.getElementById("reel-0"),
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
];

const spinBtn = document.getElementById("spinBtn");
const refillBtn = document.getElementById("refillBtn");
const voiceBtn = document.getElementById("voiceBtn");
const balanceEl = document.getElementById("balance");
const costEl = document.getElementById("cost");
const messageEl = document.getElementById("message");

const roastMessages = {
  win: [
    "Model alignment success. By accident.",
    "The AI guessed right and now wants equity.",
    "Congrats. You monetized stochastic parroting.",
    "Your prompt was vague, yet somehow profitable.",
  ],
  lose: [
    "Hallucination detected. Tokens have been reassigned to cloud bills.",
    "The model wrote 800 words and answered none of the question.",
    "Great confidence. Zero accuracy. Classic.",
    "Your tokens funded another benchmark chart.",
  ],
  broke: [
    "Wallet empty. The AI suggests buying a premium plan.",
    "Out of tokens. Maybe try touching grass APIs.",
  ],
  refill: [
    "VC approved your deck. +60 hype tokens.",
    "A startup incubator gave you grant money. Please misuse responsibly.",
    "You pivoted to 'agentic blockchain'. Investors applauded.",
  ],
};

const state = {
  balance: START_TOKENS,
  spinning: false,
  voiceOn: false,
};

costEl.textContent = String(SPIN_COST);

loadState();
render();

spinBtn.addEventListener("click", spin);
refillBtn.addEventListener("click", refill);
voiceBtn.addEventListener("click", toggleVoice);

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (typeof parsed.balance === "number" && Number.isFinite(parsed.balance)) {
      state.balance = Math.max(0, Math.floor(parsed.balance));
    }

    if (typeof parsed.voiceOn === "boolean") {
      state.voiceOn = parsed.voiceOn;
    }
  } catch {
    // Ignore malformed saved state and continue with defaults.
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      balance: state.balance,
      voiceOn: state.voiceOn,
    }),
  );
}

async function spin() {
  if (state.spinning) {
    return;
  }

  if (state.balance < SPIN_COST) {
    announce(randomFrom(roastMessages.broke), "negative");
    nudgeDevice();
    return;
  }

  state.spinning = true;
  state.balance -= SPIN_COST;
  render();

  clearReelEffects();
  reels.forEach((reel) => reel.classList.add("spinning"));
  announce("Burning tokens to summon synthetic wisdom...", "");

  const results = await spinAnimation();
  reels.forEach((reel) => reel.classList.remove("spinning"));

  const payout = getPayout(results);
  state.balance += payout;

  if (payout > 0) {
    reels.forEach((reel) => reel.classList.add("win"));
    announce(`${randomFrom(roastMessages.win)} You won ${payout} tokens.`, "positive");
    playBeepSequence([600, 780, 960], 0.09);
  } else {
    announce(randomFrom(roastMessages.lose), "negative");
    playBeepSequence([240, 210], 0.11);
    nudgeDevice();
  }

  state.spinning = false;
  persistState();
  render();
}

function refill() {
  if (state.spinning) {
    return;
  }

  state.balance += 60;
  persistState();
  render();
  announce(randomFrom(roastMessages.refill), "positive");
  playBeepSequence([420, 530], 0.08);
}

function toggleVoice() {
  state.voiceOn = !state.voiceOn;
  voiceBtn.textContent = state.voiceOn ? "Narrator: On" : "Narrator: Off";
  persistState();

  if (state.voiceOn) {
    speak("Narrator enabled. Welcome to token mismanagement simulator.");
  } else {
    window.speechSynthesis?.cancel();
  }
}

function render() {
  balanceEl.textContent = String(state.balance);
  spinBtn.disabled = state.spinning || state.balance < SPIN_COST;
  refillBtn.disabled = state.spinning;
  voiceBtn.disabled = state.spinning;

  if (!state.spinning && state.balance < SPIN_COST) {
    spinBtn.textContent = "Too Broke To Prompt";
  } else {
    spinBtn.textContent = "Burn Tokens";
  }

  voiceBtn.textContent = state.voiceOn ? "Narrator: On" : "Narrator: Off";
}

function clearReelEffects() {
  reels.forEach((reel) => reel.classList.remove("win"));
}

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getPayout([a, b, c]) {
  if (a === "🧠" && b === "🧠" && c === "🧠") {
    return 120;
  }

  if (a === b && b === c) {
    return 50;
  }

  const cashCount = [a, b, c].filter((symbol) => symbol === "💸").length;
  if (cashCount >= 2) {
    return 20;
  }

  const combo = [a, b, c].sort().join("");
  if (combo === ["🧠", "🔌", "📉"].sort().join("")) {
    return 35;
  }

  return 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spinAnimation() {
  const final = [];

  for (let i = 0; i < reels.length; i += 1) {
    const reel = reels[i];

    for (let tick = 0; tick < 11 + i * 4; tick += 1) {
      reel.textContent = randomSymbol();
      await delay(55 + tick * 2);
    }

    const landed = randomSymbol();
    reel.textContent = landed;
    final.push(landed);
    playBeepSequence([300 + i * 100], 0.04);
  }

  return final;
}

function announce(text, tone) {
  messageEl.textContent = text;
  messageEl.classList.remove("positive", "negative");

  if (tone === "positive") {
    messageEl.classList.add("positive");
  }

  if (tone === "negative") {
    messageEl.classList.add("negative");
  }

  speak(text);
}

function nudgeDevice() {
  if (navigator.vibrate) {
    navigator.vibrate([30, 30, 30]);
  }
}

function speak(text) {
  if (!state.voiceOn || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

let audioContext;

function playBeepSequence(frequencies, duration) {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
  } catch {
    return;
  }

  const now = audioContext.currentTime;

  frequencies.forEach((freq, index) => {
    const start = now + index * (duration + 0.015);
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.frequency.value = freq;
    osc.type = "triangle";

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(start);
    osc.stop(start + duration + 0.02);
  });
}
