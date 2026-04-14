const STORAGE_KEY = "prompt-casino-state-v1";
const START_TOKENS = 40;
const SPIN_COST = 5;
const AUTO_SPIN_COUNT = 5;

const symbols = [
  { emoji: "🤖", label: "BOT" },
  { emoji: "🪙", label: "TOKEN" },
  { emoji: "🧠", label: "MODEL" },
  { emoji: "💸", label: "BURN" },
  { emoji: "🧾", label: "INVOICE" },
  { emoji: "🧯", label: "PATCH" }
];

const resultCopy = {
  jackpot: [
    "Triple TOKEN. The board approved your AI budget.",
    "Three of a kind. The model finally did one useful thing.",
    "Jackpot. Investors called this 'disruptive'."
  ],
  pair: [
    "Two matched. Barely accurate, somehow profitable.",
    "Pair landed. Your chatbot answered one question correctly.",
    "Minor win. You can now afford exactly three GPU minutes."
  ],
  loss: [
    "No match. Your prompt became a motivational poem.",
    "Missed. The AI is confident and still wrong.",
    "Bust. Billing worked better than reasoning again."
  ],
  empty: [
    "No tokens left. Time to pivot to AI consulting.",
    "Bankrupt. Ship a slide deck and ask for seed money."
  ],
  reset: [
    "Ledger reset. New quarter, same hallucinations."
  ]
};

const reels = [
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
  document.getElementById("reel-3")
];
const tokenValue = document.getElementById("tokens");
const bestStreakValue = document.getElementById("best-streak");
const resultLine = document.getElementById("result-line");
const spinBtn = document.getElementById("spin-btn");
const autoSpinBtn = document.getElementById("autospin-btn");
const resetBtn = document.getElementById("reset-btn");
const announcerToggle = document.getElementById("announcer-toggle");
const eventLog = document.getElementById("event-log");

let audioCtx;
let state = loadState();
let spinning = false;
let queueAutoSpins = 0;

renderState();
renderLog();
setResult("Insert confidence and press SPIN.");

spinBtn.addEventListener("click", () => runSpin(false));
autoSpinBtn.addEventListener("click", () => startAutoSpin());
resetBtn.addEventListener("click", resetState);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        tokens: START_TOKENS,
        streak: 0,
        bestStreak: 0,
        log: []
      };
    }

    const parsed = JSON.parse(raw);
    return {
      tokens: Number.isFinite(parsed.tokens) ? parsed.tokens : START_TOKENS,
      streak: Number.isFinite(parsed.streak) ? parsed.streak : 0,
      bestStreak: Number.isFinite(parsed.bestStreak) ? parsed.bestStreak : 0,
      log: Array.isArray(parsed.log) ? parsed.log.slice(0, 8) : []
    };
  } catch {
    return {
      tokens: START_TOKENS,
      streak: 0,
      bestStreak: 0,
      log: []
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderState() {
  tokenValue.textContent = state.tokens.toString();
  bestStreakValue.textContent = state.bestStreak.toString();
  spinBtn.disabled = spinning || state.tokens < SPIN_COST;
  autoSpinBtn.disabled = spinning || state.tokens < SPIN_COST;
}

function renderLog() {
  eventLog.innerHTML = "";
  if (!state.log.length) {
    const li = document.createElement("li");
    li.textContent = "No evaluations yet.";
    eventLog.appendChild(li);
    return;
  }

  state.log.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry.text;
    li.className = entry.kind;
    eventLog.appendChild(li);
  });
}

function setResult(text) {
  resultLine.textContent = text;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pushLog(text, kind) {
  state.log.unshift({ text, kind });
  state.log = state.log.slice(0, 8);
  renderLog();
}

function chooseSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function evaluateSpin(results) {
  const labels = results.map((item) => item.label);
  const counts = labels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const maxMatch = Math.max(...Object.values(counts));

  if (maxMatch === 3) {
    return { kind: "jackpot", payout: 35 };
  }

  if (maxMatch === 2) {
    return { kind: "pair", payout: 10 };
  }

  return { kind: "loss", payout: 0 };
}

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(sequence) {
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  sequence.forEach((tone, idx) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = tone.freq;
    gain.gain.value = 0.0001;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const start = now + idx * tone.delay;
    gain.gain.exponentialRampToValueAtTime(0.03, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  });
}

function buzz(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function announce(text) {
  if (!announcerToggle.checked || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function highlightWinners(matchKind, results) {
  reels.forEach((reel) => reel.classList.remove("is-win"));

  if (matchKind === "loss") {
    return;
  }

  const labels = results.map((item) => item.label);
  const target = labels.find((label, _, arr) => arr.filter((x) => x === label).length >= 2);
  reels.forEach((reel, idx) => {
    if (results[idx].label === target) {
      reel.classList.add("is-win");
    }
  });
}

async function animateReel(reelEl, finalSymbol, durationMs) {
  reelEl.classList.add("is-spinning");

  const tickMs = 70;
  const loops = Math.floor(durationMs / tickMs);

  for (let i = 0; i < loops; i += 1) {
    reelEl.textContent = chooseSymbol().emoji;
    await delay(tickMs);
  }

  reelEl.textContent = finalSymbol.emoji;
  reelEl.classList.remove("is-spinning");

  reelEl.animate(
    [
      { transform: "translateY(-8px) scale(1.04)" },
      { transform: "translateY(2px) scale(0.98)" },
      { transform: "translateY(0) scale(1)" }
    ],
    { duration: 230, easing: "cubic-bezier(0.18, 0.9, 0.2, 1)" }
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSpin(isAutoMode) {
  if (spinning) {
    return;
  }

  if (state.tokens < SPIN_COST) {
    setResult(pickRandom(resultCopy.empty));
    pushLog("Tried spinning with zero tokens. Typical AI startup move.", "bad");
    renderState();
    return;
  }

  spinning = true;
  reels.forEach((reel) => reel.classList.remove("is-win"));
  state.tokens -= SPIN_COST;
  renderState();
  saveState();

  const finalResults = [chooseSymbol(), chooseSymbol(), chooseSymbol()];
  await Promise.all([
    animateReel(reels[0], finalResults[0], 700),
    animateReel(reels[1], finalResults[1], 960),
    animateReel(reels[2], finalResults[2], 1240)
  ]);

  const outcome = evaluateSpin(finalResults);
  const phrase = pickRandom(resultCopy[outcome.kind]);

  if (outcome.payout > 0) {
    state.tokens += outcome.payout;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    setResult(`${phrase} +${outcome.payout} tokens.`);
    pushLog(`Win: ${finalResults.map((s) => s.label).join(" / ")} (+${outcome.payout})`, "good");
    highlightWinners(outcome.kind, finalResults);

    if (outcome.kind === "jackpot") {
      playTone([
        { freq: 440, duration: 0.2, delay: 0.12 },
        { freq: 660, duration: 0.2, delay: 0.12 },
        { freq: 880, duration: 0.28, delay: 0.12 }
      ]);
      buzz([40, 30, 90]);
    } else {
      playTone([
        { freq: 420, duration: 0.16, delay: 0.1 },
        { freq: 580, duration: 0.2, delay: 0.1 }
      ]);
      buzz([35]);
    }
  } else {
    state.streak = 0;
    setResult(`${phrase} -${SPIN_COST} tokens burned.`);
    pushLog(`Loss: ${finalResults.map((s) => s.label).join(" / ")}`, "bad");
    playTone([{ freq: 180, duration: 0.24, delay: 0.1 }]);
    buzz([15, 20, 15]);
  }

  announce(resultLine.textContent);
  saveState();
  renderState();
  spinning = false;

  if (isAutoMode && queueAutoSpins > 0 && state.tokens >= SPIN_COST) {
    queueAutoSpins -= 1;
    await delay(230);
    runSpin(true);
  } else {
    queueAutoSpins = 0;
    autoSpinBtn.textContent = `Auto Spin x${AUTO_SPIN_COUNT}`;
  }
}

function startAutoSpin() {
  if (spinning || state.tokens < SPIN_COST) {
    return;
  }

  const possible = Math.min(AUTO_SPIN_COUNT, Math.floor(state.tokens / SPIN_COST));
  if (possible <= 0) {
    return;
  }

  queueAutoSpins = possible - 1;
  autoSpinBtn.textContent = `Auto Spin (${possible})`;
  runSpin(true);
}

function resetState() {
  state = {
    tokens: START_TOKENS,
    streak: 0,
    bestStreak: 0,
    log: [{ text: pickRandom(resultCopy.reset), kind: "good" }]
  };
  saveState();
  renderState();
  renderLog();
  setResult(resultCopy.reset[0]);
  reels.forEach((reel) => {
    reel.classList.remove("is-win");
    reel.textContent = "🤖";
  });
}
