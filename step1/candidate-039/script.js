const STARTING_TOKENS = 120;
const MIN_BET = 5;
const BET_STEP = 5;
const STORAGE_KEY = "token-treadmill-9000-v1";

const SYMBOLS = [
  { id: "TOKEN", weight: 16 },
  { id: "PROMPT", weight: 15 },
  { id: "GPU", weight: 13 },
  { id: "BOT", weight: 12 },
  { id: "CACHE", weight: 11 },
  { id: "HYPE", weight: 11 },
  { id: "404", weight: 9 },
  { id: "OOM", weight: 7 }
];

const TRIPLE_MULTIPLIER = {
  TOKEN: 16,
  PROMPT: 12,
  GPU: 11,
  BOT: 9,
  CACHE: 9,
  HYPE: 8,
  404: 0,
  OOM: 0
};

const MESSAGES = {
  win: [
    "Great success. The AI called this 'emergent behavior.'",
    "Tokens acquired. Accountability not found.",
    "Your prompt engineering degree just paid rent.",
    "The model says this outcome was 'statistically intentional.'"
  ],
  lose: [
    "No payout. Try adding more context and less hope.",
    "The model is thinking... mostly about your tokens.",
    "Loss detected. Suggested fix: buy more GPUs.",
    "This is what happens when you ship without tests."
  ],
  broke: [
    "Wallet empty. Perfect moment to pivot to an AI startup.",
    "You are out of tokens. Time to launch a token presale.",
    "Zero balance. The model recommends charging enterprise pricing."
  ],
  insurance: [
    "Insurance kicked in. Your bet was refunded by legal.",
    "Hallucination Insurance covered the damage.",
    "Refund processed. The compliance bot is thrilled."
  ]
};

const SHOP = {
  excuse_pack: {
    label: "Fine-Tuned Excuse Pack",
    cost: 20,
    buy(state) {
      state.excusePackCount += 1;
      return "You bought premium excuses. They fix nothing, beautifully.";
    }
  },
  gpu_overclock: {
    label: "GPU Overclock",
    cost: 45,
    buy(state) {
      state.gpuBoostSpins += 3;
      return "GPU Overclock online. Next 3 winning spins pay +50%.";
    }
  },
  insurance: {
    label: "Hallucination Insurance",
    cost: 35,
    buy(state) {
      state.insuranceCharges += 1;
      return "Insurance armed. Your next losing spin is refunded.";
    }
  }
};

const els = {
  tokenBalance: document.querySelector("#tokenBalance"),
  betAmount: document.querySelector("#betAmount"),
  spinCount: document.querySelector("#spinCount"),
  winRate: document.querySelector("#winRate"),
  message: document.querySelector("#message"),
  eventLog: document.querySelector("#eventLog"),
  reels: Array.from(document.querySelectorAll(".reel")),
  decreaseBet: document.querySelector("#decreaseBet"),
  increaseBet: document.querySelector("#increaseBet"),
  spinBtn: document.querySelector("#spinBtn"),
  dailyGrant: document.querySelector("#dailyGrant"),
  resetBtn: document.querySelector("#resetBtn"),
  activeBuffs: document.querySelector("#activeBuffs"),
  shopButtons: Array.from(document.querySelectorAll(".shop-item"))
};

const state = loadState();
let spinning = false;

render();
wireEvents();
setMessage("Model booted. Spend responsibly (or not).", false);

function wireEvents() {
  els.decreaseBet.addEventListener("click", () => {
    state.bet = Math.max(MIN_BET, state.bet - BET_STEP);
    persist();
    render();
  });

  els.increaseBet.addEventListener("click", () => {
    const maxBet = Math.max(MIN_BET, roundToStep(state.tokens));
    state.bet = Math.min(maxBet, state.bet + BET_STEP);
    persist();
    render();
  });

  els.spinBtn.addEventListener("click", spin);

  els.resetBtn.addEventListener("click", () => {
    if (!window.confirm("Reset wallet and history? This cannot be undone.")) {
      return;
    }

    Object.assign(state, freshState());
    persist();
    render();
    setMessage("Factory reset complete. Fresh tokens delivered.", true);
    pulse(els.tokenBalance, "#00b3a4");
  });

  els.dailyGrant.addEventListener("click", claimDailyGrant);

  for (const button of els.shopButtons) {
    button.addEventListener("click", () => {
      const itemId = button.dataset.item;
      buyItem(itemId);
    });
  }
}

async function spin() {
  if (spinning) {
    return;
  }

  if (state.tokens < state.bet) {
    setMessage(sample(MESSAGES.broke), true);
    shakeMachine();
    return;
  }

  spinning = true;
  setControlsDisabled(true);

  state.tokens -= state.bet;
  state.spins += 1;
  persist();
  render();

  const finalSymbols = await Promise.all(
    els.reels.map((reel, index) => runReel(reel, 850 + index * 340))
  );

  const result = evaluate(finalSymbols, state.bet);
  let message;

  if (result.type === "lose" && state.insuranceCharges > 0) {
    state.insuranceCharges -= 1;
    if (state.gpuBoostSpins > 0) {
      state.gpuBoostSpins -= 1;
    }
    state.tokens += state.bet;
    message = `${sample(MESSAGES.insurance)} (${symbolText(finalSymbols)})`;
    logEvent(`[INSURED] ${symbolText(finalSymbols)} -> refund ${state.bet}`);
    vibrate([50, 30, 70]);
  } else if (result.payout > 0) {
    state.tokens += result.payout;
    state.wins += 1;

    if (state.gpuBoostSpins > 0) {
      const boost = Math.ceil(result.payout * 0.5);
      state.tokens += boost;
      state.gpuBoostSpins -= 1;
      message = `${sample(MESSAGES.win)} Boosted +${boost}. (${symbolText(finalSymbols)})`;
      logEvent(`[WIN+BOOST] ${symbolText(finalSymbols)} -> +${result.payout + boost}`);
      pulse(els.tokenBalance, "#ff7b2c");
    } else {
      message = `${sample(MESSAGES.win)} (${symbolText(finalSymbols)})`;
      logEvent(`[WIN] ${symbolText(finalSymbols)} -> +${result.payout}`);
      pulse(els.tokenBalance, "#00b3a4");
    }

    vibrate([20, 50, 20, 50]);
  } else {
    if (state.gpuBoostSpins > 0) {
      state.gpuBoostSpins -= 1;
    }

    message = `${sample(MESSAGES.lose)} (${symbolText(finalSymbols)})`;
    logEvent(`[LOSS] ${symbolText(finalSymbols)} -> -${state.bet}`);
    shakeMachine();
    vibrate(80);
  }

  spinning = false;

  persist();
  render();
  setMessage(message, false);
}

function evaluate(symbols, bet) {
  const [a, b, c] = symbols;
  const counts = countSymbols(symbols);

  if (a === b && b === c) {
    const multiplier = TRIPLE_MULTIPLIER[a] ?? 0;
    return {
      type: multiplier > 0 ? "triple" : "lose",
      payout: multiplier * bet
    };
  }

  const maxCount = Math.max(...Object.values(counts));

  if (maxCount === 2) {
    return {
      type: "pair",
      payout: bet * 2
    };
  }

  if (symbols.includes("TOKEN") && symbols.includes("PROMPT")) {
    return {
      type: "combo",
      payout: Math.ceil(bet * 1.4)
    };
  }

  return {
    type: "lose",
    payout: 0
  };
}

function countSymbols(symbols) {
  return symbols.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {});
}

function runReel(reelEl, durationMs) {
  return new Promise((resolve) => {
    const textEl = reelEl.querySelector("span");
    reelEl.classList.add("is-spinning");

    const spinInterval = window.setInterval(() => {
      textEl.textContent = weightedSymbol();
    }, 78);

    window.setTimeout(() => {
      window.clearInterval(spinInterval);
      const final = weightedSymbol();
      textEl.textContent = final;
      reelEl.classList.remove("is-spinning");
      resolve(final);
    }, durationMs);
  });
}

function buyItem(itemId) {
  const item = SHOP[itemId];

  if (!item) {
    return;
  }

  if (spinning) {
    setMessage("Wait for the current spin to finish before shopping.", true);
    return;
  }

  if (state.tokens < item.cost) {
    setMessage(`Not enough tokens for ${item.label}.`, true);
    shakeMachine();
    return;
  }

  state.tokens -= item.cost;
  const itemMessage = item.buy(state);

  logEvent(`[SHOP] ${item.label} -${item.cost}`);
  persist();
  render();
  setMessage(itemMessage, false);
  pulse(els.activeBuffs, "#ffca3a");
}

function claimDailyGrant() {
  const today = new Date().toISOString().slice(0, 10);

  if (state.lastDailyClaim === today) {
    setMessage("Daily freebie already claimed today. Come back tomorrow.", true);
    return;
  }

  const grant = 25 + Math.floor(Math.random() * 16);
  state.tokens += grant;
  state.lastDailyClaim = today;

  logEvent(`[GRANT] Daily stipend +${grant}`);
  persist();
  render();
  setMessage(`Daily freebie claimed: +${grant} tokens.`, false);
  pulse(els.tokenBalance, "#00b3a4");
}

function render() {
  const maxBet = Math.max(MIN_BET, roundToStep(state.tokens));

  if (state.bet > maxBet) {
    state.bet = maxBet;
  }

  if (state.bet < MIN_BET) {
    state.bet = MIN_BET;
  }

  const rate = state.spins > 0 ? Math.round((state.wins / state.spins) * 100) : 0;

  els.tokenBalance.textContent = state.tokens.toLocaleString();
  els.betAmount.textContent = state.bet.toLocaleString();
  els.spinCount.textContent = state.spins.toLocaleString();
  els.winRate.textContent = `${rate}%`;

  els.eventLog.innerHTML = "";
  const items = state.log.slice(0, 8);

  for (const row of items) {
    const li = document.createElement("li");
    li.textContent = row;
    els.eventLog.appendChild(li);
  }

  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No events yet. Spin and generate synthetic drama.";
    els.eventLog.appendChild(li);
  }

  const active = [];

  if (state.gpuBoostSpins > 0) {
    active.push(`GPU Overclock (${state.gpuBoostSpins} spin${state.gpuBoostSpins > 1 ? "s" : ""} left)`);
  }

  if (state.insuranceCharges > 0) {
    active.push(
      `Hallucination Insurance (${state.insuranceCharges} charge${state.insuranceCharges > 1 ? "s" : ""})`
    );
  }

  if (state.excusePackCount > 0) {
    active.push(`Excuse Pack x${state.excusePackCount}`);
  }

  els.activeBuffs.textContent = active.length ? `Active: ${active.join(" | ")}` : "No active upgrades.";

  els.decreaseBet.disabled = spinning || state.bet <= MIN_BET;
  els.increaseBet.disabled = spinning || state.bet >= maxBet;
  els.spinBtn.disabled = spinning || state.tokens < state.bet;
  els.dailyGrant.disabled = spinning;

  for (const button of els.shopButtons) {
    button.disabled = spinning;
  }
}

function setControlsDisabled(disabled) {
  els.decreaseBet.disabled = disabled || state.bet <= MIN_BET;
  els.increaseBet.disabled = disabled;
  els.spinBtn.disabled = disabled;
  els.dailyGrant.disabled = disabled;

  for (const button of els.shopButtons) {
    button.disabled = disabled;
  }
}

function setMessage(text, isWarning) {
  els.message.textContent = text;
  els.message.style.borderLeft = isWarning ? "6px solid #b6342f" : "6px solid #00b3a4";
}

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function symbolText(symbols) {
  return symbols.join(" | ");
}

function weightedSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    roll -= symbol.weight;

    if (roll <= 0) {
      return symbol.id;
    }
  }

  return SYMBOLS[SYMBOLS.length - 1].id;
}

function roundToStep(value) {
  return Math.floor(value / BET_STEP) * BET_STEP;
}

function logEvent(text) {
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.log.unshift(`${stamp} ${text}`);
  state.log = state.log.slice(0, 30);
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return freshState();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...freshState(),
      ...parsed,
      log: Array.isArray(parsed.log) ? parsed.log.slice(0, 30) : []
    };
  } catch {
    return freshState();
  }
}

function freshState() {
  return {
    tokens: STARTING_TOKENS,
    bet: MIN_BET,
    spins: 0,
    wins: 0,
    log: [],
    gpuBoostSpins: 0,
    insuranceCharges: 0,
    excusePackCount: 0,
    lastDailyClaim: ""
  };
}

function pulse(element, color) {
  if (!element || !element.animate) {
    return;
  }

  element.animate(
    [
      { transform: "scale(1)", boxShadow: `0 0 0 0 ${color}66` },
      { transform: "scale(1.06)", boxShadow: `0 0 0 10px ${color}00` },
      { transform: "scale(1)", boxShadow: `0 0 0 0 ${color}00` }
    ],
    {
      duration: 420,
      easing: "ease-out"
    }
  );
}

function shakeMachine() {
  const machine = document.querySelector(".machine");

  if (!machine || !machine.animate) {
    return;
  }

  machine.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(3px)" },
      { transform: "translateX(0)" }
    ],
    {
      duration: 320,
      easing: "ease-in-out"
    }
  );
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
