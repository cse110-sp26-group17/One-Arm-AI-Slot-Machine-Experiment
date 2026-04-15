const SYMBOLS = ["🤖", "🪙", "🧠", "💸", "🔥", "📉"];
const SPIN_COST = 15;
const STARTING_TOKENS = 120;
const STORAGE_KEY = "token-burn-casino-state";

const state = loadState();

const reels = [...document.querySelectorAll(".reel")];
const tokenBalance = document.getElementById("tokenBalance");
const resultText = document.getElementById("resultText");
const spendText = document.getElementById("spendText");
const marqueeText = document.getElementById("marqueeText");
const aiMood = document.getElementById("aiMood");
const spinButton = document.getElementById("spinButton");
const cashoutButton = document.getElementById("cashoutButton");
const resetButton = document.getElementById("resetButton");

render();

spinButton.addEventListener("click", spin);
cashoutButton.addEventListener("click", wasteWinnings);
resetButton.addEventListener("click", resetWallet);

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      tokens: STARTING_TOKENS,
      lastSpend: "No optional AI upsells have been accepted yet.",
      lastResult: "Pull the lever and let the machine evaluate your business model.",
      mood: "confident",
      marquee: "Welcome back, valued prompt investor.",
    };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {
      tokens: STARTING_TOKENS,
      lastSpend: "State corrupted by aggressive prompt tuning. Wallet reset.",
      lastResult: "Pull the lever and let the machine evaluate your business model.",
      mood: "confused",
      marquee: "Local storage performed a small hallucination.",
    };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  tokenBalance.textContent = String(state.tokens);
  resultText.textContent = state.lastResult;
  spendText.textContent = state.lastSpend;
  aiMood.textContent = state.mood;
  marqueeText.textContent = `${state.marquee} ${state.marquee}`;
  spinButton.disabled = state.tokens < SPIN_COST;
  cashoutButton.disabled = state.tokens < 25;
}

async function spin() {
  if (state.tokens < SPIN_COST) {
    state.lastResult = "Insufficient tokens. The AI suggests buying a higher tier of confidence.";
    state.mood = "smug";
    state.marquee = "Wallet empty. Monetization model working as intended.";
    render();
    persist();
    return;
  }

  state.tokens -= SPIN_COST;
  state.mood = "calculating";
  state.marquee = "Charging your account for three premium guesses...";
  render();
  persist();
  chirp(220, 0.05, "square");

  const results = [];
  for (let index = 0; index < reels.length; index += 1) {
    const reel = reels[index];
    reel.classList.add("is-spinning");
    await animateReel(reel, 450 + index * 220);
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    reel.textContent = symbol;
    results.push(symbol);
    reel.classList.remove("is-spinning");
    chirp(280 + index * 80, 0.05, "triangle");
  }

  const payout = scoreSpin(results);
  state.tokens += payout.tokens;
  state.lastResult = payout.message;
  state.mood = payout.mood;
  state.marquee = payout.marquee;

  if (payout.tokens > 0) {
    celebrate();
    chirp(520, 0.08, "sine");
    chirp(660, 0.12, "sine");
  }

  render();
  persist();
}

function scoreSpin(results) {
  const joined = results.join(" ");
  const counts = results.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {});
  const matchCount = Math.max(...Object.values(counts));

  if (joined === "🪙 🪙 🪙") {
    return {
      tokens: 90,
      message: "Three coins. Congratulations, you have successfully gamified rent.",
      mood: "euphoric",
      marquee: "Jackpot achieved. Please reinvest in vibes immediately.",
    };
  }

  if (joined === "🤖 🤖 🤖") {
    return {
      tokens: 60,
      message: "Triple bot. The machine calls this 'full-stack sycophancy'.",
      mood: "validated",
      marquee: "Synthetic applause added to your balance sheet.",
    };
  }

  if (joined === "🧠 🧠 🧠") {
    return {
      tokens: 45,
      message: "Three brains. A consultant somewhere just invented a framework.",
      mood: "visionary",
      marquee: "Thought leadership has been tokenized.",
    };
  }

  if (joined === "🔥 💸 🔥") {
    return {
      tokens: 30,
      message: "Burn cash, add fire, call it disruption. Investors nod solemnly.",
      mood: "funded",
      marquee: "Series A unlocked through decorative losses.",
    };
  }

  if (matchCount === 2) {
    return {
      tokens: 12,
      message: `Pair detected: ${joined}. The model grants a consolation rebate and calls it alignment.`,
      mood: "encouraging",
      marquee: "Partial match. Hope has been extended by one fiscal quarter.",
    };
  }

  return {
    tokens: 0,
    message: `${joined}. Incredible. You paid for nonsense and still got vendor lock-in.`,
    mood: "unbothered",
    marquee: "No payout. Please enjoy this complimentary productivity myth.",
  };
}

function wasteWinnings() {
  if (state.tokens < 25) {
    state.lastSpend = "You need at least 25 tokens before the AI can upsell you properly.";
    state.mood = "patient";
    render();
    persist();
    return;
  }

  const purchases = [
    { cost: 25, line: "25 tokens spent on 'Executive Prompt Aura'. Nobody can measure it, which proves it's premium." },
    { cost: 30, line: "30 tokens spent on a dashboard that converts certainty into pie charts." },
    { cost: 35, line: "35 tokens spent on enterprise autocomplete for apologies to stakeholders." },
    { cost: 40, line: "40 tokens spent on a latency reduction ritual involving incense and a GPU sticker." },
  ];

  const offer = purchases[Math.floor(Math.random() * purchases.length)];
  if (state.tokens < offer.cost) {
    state.lastSpend = `A ${offer.cost}-token upsell appeared, but your wallet projected insufficient confidence.`;
    state.mood = "judgmental";
  } else {
    state.tokens -= offer.cost;
    state.lastSpend = offer.line;
    state.mood = "grateful";
    state.marquee = "Upsell accepted. Shareholders whisper 'recurring revenue.'";
    chirp(180, 0.08, "sawtooth");
  }

  render();
  persist();
}

function resetWallet() {
  state.tokens = STARTING_TOKENS;
  state.lastResult = "Wallet reset. Your fiscal irresponsibility has been fully refreshed.";
  state.lastSpend = "All token purchases have been forgiven by the gods of venture capital.";
  state.mood = "reborn";
  state.marquee = "Fresh credits loaded. Time to mistake momentum for strategy.";
  reels.forEach((reel, index) => {
    reel.textContent = SYMBOLS[index];
  });
  render();
  persist();
}

function animateReel(reel, duration) {
  const started = performance.now();
  return new Promise((resolve) => {
    const tick = (time) => {
      reel.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (time - started < duration) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

function celebrate() {
  document.querySelector(".machine-panel").classList.remove("win-flash");
  void document.querySelector(".machine-panel").offsetWidth;
  document.querySelector(".machine-panel").classList.add("win-flash");

  if (document.body.animate) {
    document.body.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-4px)" },
        { transform: "translateY(0)" },
      ],
      { duration: 340, easing: "ease-out" }
    );
  }

  if (navigator.vibrate) {
    navigator.vibrate([60, 40, 80]);
  }
}

function chirp(frequency, duration, type) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  if (!chirp.ctx) {
    chirp.ctx = new AudioContextCtor();
  }

  const ctx = chirp.ctx;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.0001;

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;
  gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}
