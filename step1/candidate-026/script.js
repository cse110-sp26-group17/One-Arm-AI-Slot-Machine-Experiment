"use strict";

const STORAGE_KEY = "ai_slot_machine_state_v1";
const STARTING_TOKENS = 120;
const HYPE_DECK_COST = 25;
const MAX_LOG_ITEMS = 12;
const BET_MIN = 5;
const BET_MAX = 30;

const SYMBOLS = [
  { id: "prompt", icon: "🧠", name: "Prompt Wizard", weight: 18, triple: 28, pair: 10 },
  { id: "gpu", icon: "🖥️", name: "GPU Coupon", weight: 16, triple: 34, pair: 12 },
  { id: "agent", icon: "🤖", name: "Agent Army", weight: 13, triple: 45, pair: 16 },
  { id: "vibe", icon: "🎨", name: "Vibe Coder", weight: 14, triple: 41, pair: 15 },
  { id: "deck", icon: "🧾", name: "Pitch Deck", weight: 14, triple: 32, pair: 10 },
  { id: "unicorn", icon: "🦄", name: "Series A", weight: 8, triple: 72, pair: 24 },
  { id: "tokens", icon: "🪙", name: "Token Printer", weight: 6, triple: 115, pair: 33 },
  { id: "hallucination", icon: "🫥", name: "Hallucination", weight: 11, triple: -38, pair: -12 }
];

const roastLines = [
  "Your model insisted confidence is the same thing as accuracy.",
  "A VC called your demo a 'pre-revenue personality disorder.'",
  "Three buzzwords entered, no product left.",
  "The benchmark looked great until someone opened the spreadsheet.",
  "You deployed to prod after reading exactly one tweet thread."
];

const jackpotLines = [
  "Investors clapped. Nobody asked for retention numbers.",
  "The roadmap now includes seven features and zero ethics reviews.",
  "Your AI generated a slide deck and somehow it closed a deal."
];

const state = loadState();

const reels = [
  document.querySelector("#reel0"),
  document.querySelector("#reel1"),
  document.querySelector("#reel2")
];
const tokenCountEl = document.querySelector("#tokenCount");
const spinCostDisplayEl = document.querySelector("#spinCostDisplay");
const biggestWinEl = document.querySelector("#biggestWinDisplay");
const hypeCountEl = document.querySelector("#hypeCountDisplay");
const betRange = document.querySelector("#betRange");
const betValue = document.querySelector("#betValue");
const statusLine = document.querySelector("#statusLine");
const spinBtn = document.querySelector("#spinBtn");
const hypeBtn = document.querySelector("#hypeBtn");
const copyBtn = document.querySelector("#copyBtn");
const resetBtn = document.querySelector("#resetBtn");
const eventLog = document.querySelector("#eventLog");

let spinning = false;

initialize();

function initialize() {
  setInitialReels();
  wireEvents();
  render();
  addLog("Welcome to Fine-Tuned Fortune. Burn responsibly.", "neutral");
}

function setInitialReels() {
  reels.forEach((reel) => {
    renderReel(reel, pickSymbol(false));
  });
}

function wireEvents() {
  betRange.addEventListener("input", () => {
    state.bet = Number(betRange.value);
    render();
    saveState();
  });

  spinBtn.addEventListener("click", spin);
  hypeBtn.addEventListener("click", buyHypeDeck);
  copyBtn.addEventListener("click", copyBraggingRights);
  resetBtn.addEventListener("click", resetEconomy);
}

async function spin() {
  if (spinning) {
    return;
  }

  const bet = Number(state.bet);
  if (state.tokens < bet) {
    setStatus("Not enough tokens. Reduce your spin budget or reset the economy.");
    addLog("Spin blocked: runway ended before demo day.", "loss");
    return;
  }

  spinning = true;
  setControlsDisabled(true);

  const usedHypeDeck = state.hypeDecks > 0;
  if (usedHypeDeck) {
    state.hypeDecks -= 1;
  }

  state.spins += 1;
  state.tokens -= bet;
  state.totalSpent += bet;
  render();

  setStatus(
    usedHypeDeck
      ? "Hype deck loaded. Reality filters disabled."
      : "Running model inference and praying."
  );

  const finalSymbols = [pickSymbol(usedHypeDeck), pickSymbol(usedHypeDeck), pickSymbol(usedHypeDeck)];
  await animateSpin(finalSymbols);

  const outcome = evaluateOutcome(finalSymbols, bet, usedHypeDeck);
  state.tokens = Math.max(0, state.tokens + outcome.bonus);
  if (outcome.bonus > 0) {
    state.wins += 1;
    state.totalWon += outcome.bonus;
    state.biggestWin = Math.max(state.biggestWin, outcome.bonus);
  } else {
    state.losses += 1;
    state.totalSpent += Math.abs(Math.min(outcome.bonus, 0));
  }

  setStatus(outcome.status);
  addLog(outcome.log, outcome.type);

  if (outcome.bonus >= 80) {
    celebrateJackpot();
  }

  render();
  saveState();

  spinning = false;
  setControlsDisabled(false);
}

function evaluateOutcome(symbols, bet, usedHypeDeck) {
  const counts = new Map();
  symbols.forEach((symbol) => {
    counts.set(symbol.id, (counts.get(symbol.id) || 0) + 1);
  });

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topId, topCount] = entries[0];
  const topSymbol = SYMBOLS.find((item) => item.id === topId);
  const allHallucination = topCount === 3 && topId === "hallucination";

  if (allHallucination) {
    const penalty = Math.round(bet * 0.5) + 18;
    return {
      bonus: -penalty,
      type: "loss",
      status: "Triple Hallucination. The model cited a website that does not exist.",
      log: `Catastrophic miss: spent ${bet} and burned ${penalty} more fixing fake references.`
    };
  }

  if (topCount === 3) {
    const payout = Math.max(0, topSymbol.triple + bet);
    const extra = usedHypeDeck ? " Hype deck absolutely lied, but it worked." : "";
    return {
      bonus: payout,
      type: "win",
      status: `Triple ${topSymbol.name}. You won ${payout} tokens.`,
      log: `Jackpot line: ${topSymbol.icon} ${topSymbol.icon} ${topSymbol.icon}. ${pickRandom(jackpotLines)}${extra}`
    };
  }

  if (topCount === 2) {
    if (topId === "hallucination") {
      const penalty = Math.max(6, Math.round(bet * 0.4));
      return {
        bonus: -penalty,
        type: "loss",
        status: `Two Hallucinations. Cleanup fee: ${penalty} tokens.`,
        log: `Spent ${bet}, then spent ${penalty} more deleting imaginary data pipelines.`
      };
    }

    const payout = Math.max(0, topSymbol.pair + Math.round(bet * 0.35));
    return {
      bonus: payout,
      type: "win",
      status: `Partial match on ${topSymbol.name}. You won ${payout} tokens.`,
      log: `Two-of-a-kind win: reclaiming ${payout} tokens from the cloud bill.`
    };
  }

  const consolation = symbols.some((symbol) => symbol.id === "tokens") ? 4 : 0;
  return {
    bonus: consolation,
    type: consolation > 0 ? "win" : "loss",
    status:
      consolation > 0
        ? `No match, but one Token Printer slipped you ${consolation} tokens.`
        : `No match. ${pickRandom(roastLines)}`,
    log:
      consolation > 0
        ? `Spent ${bet}, recovered ${consolation}. Tiny airdrop accepted.`
        : `Spent ${bet}. Outcome: all vibes, no reproducible metrics.`
  };
}

function buyHypeDeck() {
  if (spinning) {
    return;
  }

  if (state.tokens < HYPE_DECK_COST) {
    setStatus("Not enough tokens for a hype deck. Try winning before marketing.");
    addLog("Hype deck purchase failed: investor confidence below threshold.", "loss");
    return;
  }

  state.tokens -= HYPE_DECK_COST;
  state.hypeDecks += 1;
  state.totalSpent += HYPE_DECK_COST;
  saveState();
  render();

  setStatus("Hype deck purchased. Next spin gets an optimistic narrative.");
  addLog("Bought one hype deck for 25 tokens. Terms and reality may not align.", "hype");
}

async function copyBraggingRights() {
  const summary = [
    "I survived the One-Arm AI Slot Machine.",
    `Tokens in wallet: ${state.tokens}.`,
    `Spins: ${state.spins}.`,
    `Biggest single payout: ${state.biggestWin}.`,
    `Total won: ${state.totalWon}, total spent: ${state.totalSpent}.`
  ].join(" ");

  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    setStatus("Clipboard API unavailable in this browser.");
    addLog("Could not copy bragging rights: clipboard not supported.", "loss");
    return;
  }

  try {
    await navigator.clipboard.writeText(summary);
    setStatus("Bragging rights copied to clipboard.");
    addLog("Copied a victory report to clipboard. Compliance did not review it.", "neutral");
  } catch {
    setStatus("Clipboard write failed.");
    addLog("Copy failed. Try a secure origin or different browser.", "loss");
  }
}

function resetEconomy() {
  if (spinning) {
    return;
  }

  const ok = window.confirm("Reset token balance, stats, and hype decks?");
  if (!ok) {
    return;
  }

  Object.assign(state, getDefaultState());
  betRange.value = String(state.bet);
  setInitialReels();
  saveState();
  render();
  addLog("Economy reset. New quarter, same questionable strategy.", "neutral");
  setStatus("Economy reset complete.");
}

async function animateSpin(finalSymbols) {
  const spinPromises = reels.map((reel, index) => animateSingleReel(reel, finalSymbols[index], index));
  await Promise.all(spinPromises);
}

function animateSingleReel(reel, finalSymbol, index) {
  return new Promise((resolve) => {
    reel.classList.add("is-spinning");

    const tick = window.setInterval(() => {
      renderReel(reel, pickSymbol(false));
    }, 85);

    const duration = 820 + index * 220;
    window.setTimeout(() => {
      window.clearInterval(tick);
      reel.classList.remove("is-spinning");
      renderReel(reel, finalSymbol);

      reel.animate(
        [
          { transform: "translateY(-14px)" },
          { transform: "translateY(6px)" },
          { transform: "translateY(0px)" }
        ],
        { duration: 360, easing: "cubic-bezier(0.18, 0.84, 0.25, 1)" }
      );

      resolve();
    }, duration);
  });
}

function renderReel(reel, symbol) {
  reel.innerHTML = `<span class="symbol-icon">${symbol.icon}</span><span class="symbol-name">${symbol.name}</span>`;
}

function pickSymbol(boosted) {
  const pool = SYMBOLS.map((symbol) => {
    let weight = symbol.weight;
    if (boosted) {
      if (symbol.id === "hallucination") {
        weight = Math.max(1, weight - 8);
      }
      if (symbol.id === "tokens" || symbol.id === "unicorn") {
        weight += 6;
      }
      if (symbol.id === "agent" || symbol.id === "vibe") {
        weight += 2;
      }
    }
    return { ...symbol, weight };
  });

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const symbol of pool) {
    threshold -= symbol.weight;
    if (threshold <= 0) {
      return symbol;
    }
  }

  return pool[pool.length - 1];
}

function celebrateJackpot() {
  if (navigator.vibrate) {
    navigator.vibrate([60, 35, 90]);
  }

  if (window.speechSynthesis) {
    try {
      const utterance = new SpeechSynthesisUtterance("Jackpot. Tokens acquired. Morals pending.");
      utterance.rate = 1;
      utterance.pitch = 1.1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis can fail if blocked by browser settings.
    }
  }
}

function setControlsDisabled(disabled) {
  spinBtn.disabled = disabled;
  hypeBtn.disabled = disabled;
  betRange.disabled = disabled;
  resetBtn.disabled = disabled;
  copyBtn.disabled = disabled;
}

function render() {
  tokenCountEl.textContent = formatInt(state.tokens);
  spinCostDisplayEl.textContent = formatInt(state.bet);
  biggestWinEl.textContent = formatInt(state.biggestWin);
  hypeCountEl.textContent = formatInt(state.hypeDecks);
  betValue.textContent = formatInt(state.bet);
  betRange.value = String(state.bet);
  hypeBtn.textContent = `Buy Hype Deck (-${HYPE_DECK_COST}) | Loaded: ${state.hypeDecks}`;

  const canSpin = state.tokens >= state.bet && !spinning;
  spinBtn.disabled = !canSpin;
}

function addLog(message, type) {
  const li = document.createElement("li");
  li.className = type;
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  li.innerHTML = `<span class="time">${stamp}</span>${message}`;
  eventLog.prepend(li);

  while (eventLog.children.length > MAX_LOG_ITEMS) {
    eventLog.removeChild(eventLog.lastElementChild);
  }
}

function setStatus(message) {
  statusLine.textContent = message;
}

function formatInt(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(value)));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getDefaultState() {
  return {
    tokens: STARTING_TOKENS,
    spins: 0,
    wins: 0,
    losses: 0,
    biggestWin: 0,
    bet: 10,
    hypeDecks: 0,
    totalSpent: 0,
    totalWon: 0
  };
}

function loadState() {
  const defaults = getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...sanitizeState(parsed)
    };
  } catch {
    return defaults;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
}

function sanitizeState(input) {
  const defaults = getDefaultState();
  const output = { ...defaults };
  const numericKeys = Object.keys(defaults);

  numericKeys.forEach((key) => {
    const value = Number(input[key]);
    if (Number.isFinite(value) && value >= 0) {
      output[key] = value;
    }
  });

  output.bet = clamp(Math.round(output.bet), BET_MIN, BET_MAX);
  output.tokens = Math.round(output.tokens);
  output.spins = Math.round(output.spins);
  output.wins = Math.round(output.wins);
  output.losses = Math.round(output.losses);
  output.biggestWin = Math.round(output.biggestWin);
  output.hypeDecks = Math.round(output.hypeDecks);
  output.totalSpent = Math.round(output.totalSpent);
  output.totalWon = Math.round(output.totalWon);
  return output;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
