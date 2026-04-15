const STARTING_TOKENS = 120;
const SPIN_COST = 10;
const SYMBOLS = ["🤖", "📉", "💥", "🧠", "🪙", "🧾"];
const STATE_KEY = "ai_slot_state_v1";

const payouts = {
  "🧠": 120,
  "📉": 90,
  "🤖": 70,
  "💥": 60,
  defaultTriple: 40,
  pair: 20,
};

const quips = {
  bigWin: [
    "Three brains. You have outperformed most roadmap slides.",
    "Synthetic Genius activated. Investors are pretending this was planned.",
    "Benchmark score up. Real-world usefulness: pending.",
  ],
  win: [
    "Nice. Your token burn has become token earn.",
    "The model says you are a strategic visionary.",
    "A win. Please update your LinkedIn headline.",
  ],
  lose: [
    "No match. The algorithm calls this character building.",
    "You paid for inference and got vibes.",
    "Another spin, another enterprise use case.",
  ],
  broke: [
    "Out of tokens. Time to pivot to a subscription plan.",
    "Treasury empty. Try resetting your funding round.",
    "No credits left. Please insert Series A.",
  ],
};

const els = {
  balance: document.getElementById("balance"),
  cost: document.getElementById("cost"),
  jackpots: document.getElementById("jackpots"),
  reels: [0, 1, 2].map((i) => document.getElementById(`reel${i}`)),
  message: document.getElementById("message"),
  spinBtn: document.getElementById("spinBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

let state = loadState();
let audioContext;

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) {
    return { balance: STARTING_TOKENS, jackpots: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.balance === "number" && typeof parsed.jackpots === "number") {
      return parsed;
    }
  } catch {}

  return { balance: STARTING_TOKENS, jackpots: 0 };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setMessage(text, isWarn = false) {
  els.message.textContent = text;
  els.message.classList.toggle("warn", isWarn);
}

function render() {
  els.balance.textContent = state.balance.toString();
  els.cost.textContent = SPIN_COST.toString();
  els.jackpots.textContent = state.jackpots.toString();
  els.spinBtn.disabled = state.balance < SPIN_COST;
}

function evaluate(result) {
  const counts = result.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topSymbol, topCount] = entries[0];

  if (topCount === 3) {
    const win = payouts[topSymbol] || payouts.defaultTriple;
    return { win, jackpot: true, tone: win >= 100 ? "bigWin" : "win" };
  }

  if (topCount === 2) {
    return { win: payouts.pair, jackpot: false, tone: "win" };
  }

  return { win: 0, jackpot: false, tone: "lose" };
}

function buzz(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function beep(freq = 320, duration = 0.08, type = "triangle", gain = 0.05) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audioContext) audioContext = new AudioCtx();

  const osc = audioContext.createOscillator();
  const vol = audioContext.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;

  osc.connect(vol);
  vol.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

async function animateReels(finalSymbols) {
  for (const reel of els.reels) reel.classList.add("spin");

  const timers = [650, 900, 1150];
  await Promise.all(
    els.reels.map((reel, i) =>
      new Promise((resolve) => {
        const tick = setInterval(() => {
          reel.textContent = pick(SYMBOLS);
        }, 70);

        setTimeout(() => {
          clearInterval(tick);
          reel.classList.remove("spin");
          reel.textContent = finalSymbols[i];
          reel.animate(
            [
              { transform: "translateY(-8px)", offset: 0 },
              { transform: "translateY(0)", offset: 1 },
            ],
            { duration: 200, easing: "cubic-bezier(.2,.9,.2,1)" }
          );
          resolve();
        }, timers[i]);
      })
    )
  );
}

async function spin() {
  if (state.balance < SPIN_COST) {
    setMessage(pick(quips.broke), true);
    buzz(220);
    return;
  }

  state.balance -= SPIN_COST;
  render();
  els.spinBtn.disabled = true;

  beep(200, 0.07, "square", 0.04);

  const rolled = [pick(SYMBOLS), pick(SYMBOLS), pick(SYMBOLS)];
  await animateReels(rolled);

  const outcome = evaluate(rolled);
  state.balance += outcome.win;

  els.reels.forEach((reel) => reel.classList.toggle("win", outcome.win > 0));

  if (outcome.jackpot) {
    state.jackpots += 1;
    beep(660, 0.08);
    setTimeout(() => beep(880, 0.1), 90);
    setTimeout(() => beep(1100, 0.12), 180);
  } else if (outcome.win > 0) {
    beep(540, 0.09);
  } else {
    buzz(100);
  }

  const msg = outcome.win > 0
    ? `${pick(quips[outcome.tone])} +${outcome.win} tokens.`
    : `${pick(quips.lose)} -${SPIN_COST} tokens.`;

  setMessage(msg, false);

  saveState();
  render();
}

function resetState() {
  state = { balance: STARTING_TOKENS, jackpots: 0 };
  saveState();
  els.reels.forEach((reel) => {
    reel.classList.remove("win");
    reel.textContent = "🤖";
  });
  setMessage("Fresh funding secured. Spend responsibly (you won't).", false);
  render();
}

els.spinBtn.addEventListener("click", spin);
els.resetBtn.addEventListener("click", resetState);

render();