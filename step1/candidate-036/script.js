const STORAGE_KEY = "prompt-circumstance-casino-state";
const STARTING_BALANCE = 240;
const SEED_ROUND_GRANT = 140;
const MAX_HISTORY = 8;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const numberFormatter = new Intl.NumberFormat("en-US");

const SYMBOLS = [
  {
    key: "TOKEN",
    label: "TOKEN",
    sub: "warm context straight from the furnace",
    weight: 18,
    triple: 8,
  },
  {
    key: "GPU",
    label: "GPU",
    sub: "premium compute with a side of heat death",
    weight: 12,
    triple: 12,
  },
  {
    key: "PROMPT",
    label: "PROMPT",
    sub: "polite spellcasting for autocomplete",
    weight: 15,
    triple: 7,
  },
  {
    key: "BOT",
    label: "BOT",
    sub: "an agent with way too much confidence",
    weight: 10,
    triple: 10,
  },
  {
    key: "HYPE",
    label: "HYPE",
    sub: "valuation first, product eventually",
    weight: 9,
    triple: 11,
  },
  {
    key: "FAKE",
    label: "FAKE",
    sub: "confident answers from nowhere",
    weight: 14,
    triple: 6,
  },
  {
    key: "LAG",
    label: "LAG",
    sub: "please hold while the cluster coughs",
    weight: 11,
    triple: 5,
  },
  {
    key: "SEED",
    label: "SEED",
    sub: "venture fuel for the next keynote",
    weight: 8,
    triple: 9,
  },
];

const SPECIAL_COMBOS = {
  "GPU|PROMPT|TOKEN": {
    multiplier: 5,
    headline: "Product-market-ish fit",
    detail: "You assembled compute, prompt hacks, and just enough tokens to call it a platform.",
  },
  "BOT|FAKE|PROMPT": {
    multiplier: 4,
    headline: "Autonomous slideshow",
    detail: "The machine built an agent demo that mostly works if nobody asks follow-up questions.",
  },
  "HYPE|SEED|TOKEN": {
    multiplier: 6,
    headline: "Series A energy",
    detail: "You turned jargon into runway. Finance departments hate this one trick.",
  },
};

const state = loadState();

const elements = {
  balance: document.querySelector("#balance"),
  betDisplay: document.querySelector("#bet-display"),
  bestWin: document.querySelector("#best-win"),
  seedRounds: document.querySelector("#seed-rounds"),
  spinButton: document.querySelector("#spin-button"),
  seedButton: document.querySelector("#seed-button"),
  heckleButton: document.querySelector("#heckle-button"),
  chipGrid: document.querySelector("#chip-grid"),
  reels: Array.from(document.querySelectorAll(".reel")),
  headline: document.querySelector("#headline"),
  subheadline: document.querySelector("#subheadline"),
  statusPill: document.querySelector("#status-pill"),
  netBadge: document.querySelector("#net-badge"),
  history: document.querySelector("#history"),
  burstLayer: document.querySelector("#burst-layer"),
  liveRegion: document.querySelector("#live-region"),
};

let audioContext;

render();
syncControls();

elements.chipGrid.addEventListener("click", (event) => {
  const target = event.target.closest("[data-bet]");

  if (!target || state.spinning) {
    return;
  }

  state.bet = Number(target.dataset.bet);
  render();
  saveState();
});

elements.spinButton.addEventListener("click", () => {
  spin();
});

elements.seedButton.addEventListener("click", () => {
  requestSeedRound();
});

elements.heckleButton.addEventListener("click", () => {
  state.hecklerEnabled = !state.hecklerEnabled;
  render();
  saveState();

  if (state.hecklerEnabled) {
    speak("Heckler voice restored. Very brave.");
  } else {
    window.speechSynthesis?.cancel();
  }
});

async function spin() {
  if (state.spinning) {
    return;
  }

  if (state.balance < state.bet) {
    setAnnouncement(
      "Out of tokens",
      "You cannot afford this spin. The machine recommends a seed round instead of self-control.",
      0,
      "Need tokens"
    );
    pulseStatus("Bankroll depleted");
    vibrate([40, 30, 40]);
    speak("Insufficient tokens. Please contact your nearest venture capitalist.");
    return;
  }

  ensureAudioContext();

  state.spinning = true;
  state.round += 1;
  state.balance -= state.bet;
  state.lastNet = -state.bet;
  render();
  syncControls();

  pulseStatus("Querying casino model");
  setAnnouncement(
    "Inference in progress",
    "The reels are consulting a breathtaking quantity of expensive probability.",
    -state.bet,
    `Spent ${state.bet}`
  );
  playToneSequence([
    [320, 0.05, "sawtooth"],
    [280, 0.07, "sine"],
    [240, 0.09, "triangle"],
  ]);
  vibrate(18);

  const outcomeSymbols = elements.reels.map(() => pickWeightedSymbol());
  await Promise.all(
    elements.reels.map((reel, index) =>
      spinSingleReel(reel, outcomeSymbols[index], 850 + index * (prefersReducedMotion ? 80 : 220), index)
    )
  );

  const outcome = evaluateSpin(outcomeSymbols, state.bet);
  state.balance += outcome.payout;
  state.bestWin = Math.max(state.bestWin, outcome.payout);
  state.lastNet = outcome.payout - state.bet;
  state.history.unshift({
    label: `Round ${state.round}`,
    symbols: outcomeSymbols.map((symbol) => symbol.label),
    headline: outcome.headline,
    detail: outcome.detail,
    net: state.lastNet,
  });
  state.history = state.history.slice(0, MAX_HISTORY);
  state.spinning = false;

  setAnnouncement(outcome.headline, outcome.detail, state.lastNet, outcome.badgeText);
  pulseStatus(outcome.status);
  reactToOutcome(outcome);
  render();
  syncControls();
  saveState();
}

function requestSeedRound() {
  if (state.spinning) {
    return;
  }

  ensureAudioContext();
  state.balance += SEED_ROUND_GRANT;
  state.seedRounds += 1;
  state.lastNet = SEED_ROUND_GRANT;
  state.history.unshift({
    label: `VC ${state.seedRounds}`,
    symbols: ["SEED", "ROUND", "SIGNED"],
    headline: "Fresh runway acquired",
    detail: "A venture fund mistook your losses for growth and handed you more tokens.",
    net: SEED_ROUND_GRANT,
  });
  state.history = state.history.slice(0, MAX_HISTORY);

  setAnnouncement(
    "Seed round closed",
    "You pitched the burn rate as momentum. The machine wired more pretend capital.",
    SEED_ROUND_GRANT,
    `Plus ${SEED_ROUND_GRANT}`
  );
  pulseStatus("Investor optimism detected");
  vibrate([25, 35, 25, 35, 25]);
  playToneSequence([
    [392, 0.08, "triangle"],
    [494, 0.08, "triangle"],
    [588, 0.16, "triangle"],
  ]);
  speak("Congratulations. Another fund confused losses with vision.");
  render();
  syncControls();
  saveState();
}

function render() {
  elements.balance.textContent = formatNumber(state.balance);
  elements.betDisplay.textContent = formatNumber(state.bet);
  elements.bestWin.textContent = formatNumber(state.bestWin);
  elements.seedRounds.textContent = formatNumber(state.seedRounds);
  elements.heckleButton.textContent = `Heckler Voice: ${state.hecklerEnabled ? "On" : "Off"}`;

  for (const chip of elements.chipGrid.querySelectorAll("[data-bet]")) {
    chip.classList.toggle("is-active", Number(chip.dataset.bet) === state.bet);
  }

  renderHistory();
  updateButtonStates();
}

function renderHistory() {
  elements.history.innerHTML = "";

  for (const entry of state.history) {
    const item = document.createElement("li");
    const round = document.createElement("span");
    const summary = document.createElement("p");
    const net = document.createElement("span");

    round.className = "history__round";
    round.textContent = entry.label ?? "Round ?";

    summary.className = "history__summary";
    summary.textContent = `${entry.symbols.join(" / ")}. ${entry.headline}. ${entry.detail}`;

    net.className = `history__net ${entry.net >= 0 ? "is-win" : "is-loss"}`;
    net.textContent = entry.net >= 0 ? `+${formatNumber(entry.net)}` : `-${formatNumber(Math.abs(entry.net))}`;

    item.append(round, summary, net);
    elements.history.append(item);
  }

  if (state.history.length === 0) {
    const empty = document.createElement("li");
    const round = document.createElement("span");
    const summary = document.createElement("p");
    const net = document.createElement("span");

    round.className = "history__round";
    round.textContent = "Round 0";
    summary.className = "history__summary";
    summary.textContent = "No spins yet. The machine is still pretending to be ethical.";
    net.className = "history__net";
    net.textContent = "0";
    empty.append(round, summary, net);
    elements.history.append(empty);
  }
}

function updateButtonStates() {
  elements.spinButton.disabled = state.spinning;
  elements.seedButton.disabled = state.spinning;
  elements.spinButton.textContent = state.spinning ? "Spinning..." : "Spin For Inference";

  for (const chip of elements.chipGrid.querySelectorAll("[data-bet]")) {
    chip.disabled = state.spinning;
  }
}

function syncControls() {
  updateButtonStates();
}

function setAnnouncement(headline, detail, net, badgeText) {
  elements.headline.textContent = headline;
  elements.subheadline.textContent = detail;
  elements.netBadge.textContent = badgeText ?? (net >= 0 ? `Net +${net}` : `Net ${net}`);
  elements.netBadge.style.background = net >= 0 ? "rgba(126, 245, 187, 0.1)" : "rgba(255, 119, 100, 0.14)";
  elements.netBadge.style.color = net >= 0 ? "var(--mint)" : "var(--alarm)";
  elements.liveRegion.textContent = `${headline}. ${detail}`;
}

function pulseStatus(text) {
  elements.statusPill.textContent = text;
  animateElement(
    elements.statusPill,
    [
      { transform: "scale(1)", opacity: 0.75 },
      { transform: "scale(1.06)", opacity: 1 },
      { transform: "scale(1)", opacity: 1 },
    ],
    {
      duration: prefersReducedMotion ? 1 : 420,
      easing: "ease-out",
    }
  );
}

function renderReel(reel, symbol) {
  const label = reel.querySelector(".symbol-card__label");
  const sub = reel.querySelector(".symbol-card__sub");

  label.textContent = symbol.label;
  sub.textContent = symbol.sub;
}

function spinSingleReel(reel, finalSymbol, duration, index) {
  const tickRate = prefersReducedMotion ? 75 : 90;

  return new Promise((resolve) => {
    reel.classList.add("is-spinning");
    let cursor = 0;

    const interval = window.setInterval(() => {
      renderReel(reel, SYMBOLS[cursor % SYMBOLS.length]);
      cursor += 1 + index;
    }, tickRate);

    window.setTimeout(() => {
      window.clearInterval(interval);
      reel.classList.remove("is-spinning");
      renderReel(reel, finalSymbol);
      animateElement(
        reel,
        [
          { transform: "translateY(-8px) scale(1.02)" },
          { transform: "translateY(0) scale(1)" },
        ],
        {
          duration: prefersReducedMotion ? 1 : 260,
          easing: "cubic-bezier(.18,.89,.32,1.28)",
        }
      );
      playStopTone(index);
      resolve();
    }, duration);
  });
}

function evaluateSpin(symbols, bet) {
  const labels = symbols.map((symbol) => symbol.label);
  const sortedKey = [...labels].sort().join("|");
  const counts = labels.reduce((map, label) => {
    map[label] = (map[label] ?? 0) + 1;
    return map;
  }, {});
  const highestCount = Math.max(...Object.values(counts));

  if (highestCount === 3) {
    const symbol = symbols[0];
    const payout = bet * symbol.triple;

    return {
      payout,
      headline: `${symbol.label} x3`,
      detail: tripleDetail(symbol),
      badgeText: `Net +${payout - bet}`,
      status: "Jackpot-ish event",
      outcomeType: "jackpot",
    };
  }

  if (SPECIAL_COMBOS[sortedKey]) {
    const combo = SPECIAL_COMBOS[sortedKey];
    const payout = bet * combo.multiplier;

    return {
      payout,
      headline: combo.headline,
      detail: combo.detail,
      badgeText: `Net +${payout - bet}`,
      status: "Narrative synergy",
      outcomeType: "special",
    };
  }

  if (highestCount === 2) {
    const payout = Math.round(bet * 2.2);
    const matchedLabel = Object.keys(counts).find((label) => counts[label] === 2);

    return {
      payout,
      headline: `${matchedLabel} pair`,
      detail: `Two reels matched, which is basically how half the AI industry defines a benchmark win.`,
      badgeText: `Net +${payout - bet}`,
      status: "Partial hallucination accepted",
      outcomeType: "pair",
    };
  }

  if (labels.includes("TOKEN") && labels.includes("GPU")) {
    const payout = Math.round(bet * 1.4);

    return {
      payout,
      headline: "Compute rebate",
      detail: "You did not win, but the house returned a few tokens for demonstrating responsible GPU worship.",
      badgeText: `Net +${payout - bet}`,
      status: "Tiny rebate issued",
      outcomeType: "rebate",
    };
  }

  return {
    payout: 0,
    headline: "Burn rate normal",
    detail: "The reels produced pure vibes. Your tokens have been converted into a more impressive monthly active narrative.",
    badgeText: `Net -${bet}`,
    status: "House remains profitable",
    outcomeType: "loss",
  };
}

function reactToOutcome(outcome) {
  switch (outcome.outcomeType) {
    case "jackpot":
      createBurst(26);
      vibrate([45, 30, 55, 30, 75]);
      playToneSequence([
        [523, 0.09, "triangle"],
        [659, 0.09, "triangle"],
        [784, 0.14, "triangle"],
        [988, 0.2, "triangle"],
      ]);
      speak(`${elements.headline.textContent}. Incredible. The hype machine loves you.`);
      break;
    case "special":
      createBurst(18);
      vibrate([30, 20, 30]);
      playToneSequence([
        [440, 0.08, "sine"],
        [554, 0.08, "triangle"],
        [698, 0.12, "triangle"],
      ]);
      speak(`${elements.headline.textContent}. That is the closest thing to strategy this casino has seen.`);
      break;
    case "pair":
      vibrate(20);
      playToneSequence([
        [392, 0.06, "sine"],
        [494, 0.08, "triangle"],
      ]);
      speak("Pair detected. The machine is grading on a startup curve.");
      break;
    case "rebate":
      playToneSequence([[330, 0.08, "sine"]]);
      break;
    default:
      playToneSequence([[196, 0.08, "sawtooth"]]);
      speak("No payout. The market has chosen storytelling over substance.");
      break;
  }
}

function tripleDetail(symbol) {
  switch (symbol.key) {
    case "GPU":
      return "Three GPU reels. Somewhere, a data center just dimmed the lights and called it innovation.";
    case "TOKEN":
      return "Three TOKEN reels. Congratulations, you monetized autocomplete and got paid in the fumes.";
    case "PROMPT":
      return "Three PROMPT reels. Manners still matter when begging a machine for useful text.";
    case "BOT":
      return "Three BOT reels. Your agent swarm achieved sentience just long enough to file an expense report.";
    case "HYPE":
      return "Three HYPE reels. Nothing shipped, but the valuation is now legally classified as inspirational.";
    case "FAKE":
      return "Three FAKE reels. The machine made everything up and still beat expectations.";
    case "LAG":
      return "Three LAG reels. Even the jackpot arrived late, like a product roadmap with latency issues.";
    case "SEED":
      return "Three SEED reels. Venture money is now raining from the ceiling with absolutely no follow-up diligence.";
    default:
      return "The machine aligned three symbols and briefly believed in itself.";
  }
}

function pickWeightedSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    cursor -= symbol.weight;

    if (cursor <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function loadState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));

    if (saved && typeof saved === "object") {
      return {
        balance: Number.isFinite(saved.balance) ? saved.balance : STARTING_BALANCE,
        bet: [10, 25, 50, 100].includes(saved.bet) ? saved.bet : 10,
        bestWin: Number.isFinite(saved.bestWin) ? saved.bestWin : 0,
        seedRounds: Number.isFinite(saved.seedRounds) ? saved.seedRounds : 0,
        history: Array.isArray(saved.history) ? saved.history.slice(0, MAX_HISTORY) : [],
        hecklerEnabled: saved.hecklerEnabled !== false,
        lastNet: Number.isFinite(saved.lastNet) ? saved.lastNet : 0,
        round: Number.isFinite(saved.round) ? saved.round : 0,
        spinning: false,
      };
    }
  } catch (error) {
    console.warn("Unable to load saved state", error);
  }

  return {
    balance: STARTING_BALANCE,
    bet: 10,
    bestWin: 0,
    seedRounds: 0,
    history: [],
    hecklerEnabled: true,
    lastNet: 0,
    round: 0,
    spinning: false,
  };
}

function saveState() {
  const serializable = {
    balance: state.balance,
    bet: state.bet,
    bestWin: state.bestWin,
    seedRounds: state.seedRounds,
    history: state.history,
    hecklerEnabled: state.hecklerEnabled,
    lastNet: state.lastNet,
    round: state.round,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn("Unable to save state", error);
  }
}

function createBurst(count) {
  if (prefersReducedMotion) {
    return;
  }

  const colors = ["#f0b24c", "#ff6f91", "#7ef5bb", "#ff7764", "#f8f3dc"];

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = "burst";
    piece.style.setProperty("--angle", `${(360 / count) * index}deg`);
    piece.style.setProperty("--distance", `${8 + Math.random() * 24}rem`);
    piece.style.background = colors[index % colors.length];
    piece.style.left = `${44 + Math.random() * 12}%`;
    piece.style.top = `${38 + Math.random() * 18}%`;
    piece.style.animationDelay = `${Math.random() * 100}ms`;
    elements.burstLayer.append(piece);
    window.setTimeout(() => piece.remove(), 1100);
  }
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playStopTone(index) {
  const frequency = 260 + index * 50;
  playToneSequence([[frequency, 0.04, "square"]]);
}

function playToneSequence(sequence) {
  if (!audioContext) {
    return;
  }

  let when = audioContext.currentTime;

  for (const [frequency, duration, type] of sequence) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.05, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
    when += duration * 0.9;
  }
}

function animateElement(element, keyframes, options) {
  if (typeof element.animate === "function") {
    element.animate(keyframes, options);
  }
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function vibrate(pattern) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

function speak(text) {
  if (!state.hecklerEnabled || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 0.86;
  utterance.rate = 1.04;
  utterance.volume = 0.75;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
