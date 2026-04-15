(() => {
  "use strict";

  const STORAGE_KEY = "latency-casino-state-v1";
  const MIN_BET = 5;
  const MAX_BET = 60;

  const SYMBOLS = ["PROMPT", "GPU", "AGENT", "HYPE", "BUG", "404", "VIBE"];

  const BASE_WEIGHTS = {
    PROMPT: 16,
    GPU: 14,
    AGENT: 12,
    HYPE: 15,
    BUG: 14,
    "404": 13,
    VIBE: 16
  };

  const TRIPLE_MULTIPLIERS = {
    PROMPT: 7,
    GPU: 8,
    AGENT: 10,
    HYPE: 6,
    BUG: 5,
    VIBE: 4
  };

  const COSTS = {
    hype: 25,
    patch: 18,
    cache: 30
  };

  const LOSS_LINES = [
    "Your model delivered 98% confidence and 0% usefulness.",
    "The roadmap now includes another pivot and zero revenue.",
    "You burned tokens proving that vibes are not a benchmark.",
    "The demo looked amazing until someone asked for reproducibility.",
    "Investors loved the deck. Users loved uninstalling."
  ];

  const PAIR_LINES = [
    "Two symbols aligned. Product calls this traction.",
    "Near miss upgraded into a launch announcement.",
    "Partial match. Marketing is already writing a thread.",
    "Two-of-a-kind. The KPI graph points upward for no reason."
  ];

  const JACKPOT_LINES = [
    "Triple match. Call it autonomous profitability.",
    "All three aligned. Please do not rerun this experiment.",
    "You found signal in the noise. Finance is suspicious.",
    "Jackpot landed. Compliance has left the building."
  ];

  const els = {
    wallet: document.getElementById("walletValue"),
    spins: document.getElementById("spinsValue"),
    hype: document.getElementById("hypeValue"),
    patch: document.getElementById("patchValue"),
    cache: document.getElementById("cacheValue"),
    status: document.getElementById("statusText"),
    reels: [0, 1, 2].map((i) => document.getElementById(`reel${i}`)),
    betInput: document.getElementById("betInput"),
    spinBtn: document.getElementById("spinBtn"),
    buyHype: document.getElementById("buyHype"),
    buyPatch: document.getElementById("buyPatch"),
    buyCache: document.getElementById("buyCache"),
    logList: document.getElementById("logList"),
    bailoutBtn: document.getElementById("bailoutBtn")
  };

  const formatInt = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  });

  let state = loadState();
  let spinning = false;

  bindEvents();
  render();
  addLog("Latency Casino online. Wallet connected to bad decisions.", "info");

  function bindEvents() {
    els.betInput.addEventListener("input", onBetInput);
    els.spinBtn.addEventListener("click", spin);

    els.buyHype.addEventListener("click", () => buyUpgrade("hype"));
    els.buyPatch.addEventListener("click", () => buyUpgrade("patch"));
    els.buyCache.addEventListener("click", () => buyUpgrade("cache"));

    els.bailoutBtn.addEventListener("click", emergencyFunding);
  }

  function onBetInput() {
    normalizeBetInput();
    render();
  }

  function getDefaultState() {
    return {
      tokens: 150,
      spins: 0,
      hypeCredits: 0,
      patchNotes: 0,
      luckyCacheSpins: 0,
      wins: 0,
      losses: 0
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
      return sanitizeState(parsed, defaults);
    } catch {
      return defaults;
    }
  }

  function sanitizeState(parsed, defaults) {
    const safe = { ...defaults };
    Object.keys(defaults).forEach((key) => {
      const n = Number(parsed[key]);
      if (Number.isFinite(n) && n >= 0) {
        safe[key] = Math.floor(n);
      }
    });
    safe.tokens = Math.max(0, safe.tokens);
    return safe;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeBetInput() {
    const parsed = Number(els.betInput.value);
    if (!Number.isFinite(parsed)) {
      els.betInput.value = String(MIN_BET);
      return;
    }
    const clamped = Math.min(MAX_BET, Math.max(MIN_BET, parsed));
    const stepped = Math.floor(clamped / MIN_BET) * MIN_BET;
    els.betInput.value = String(Math.max(MIN_BET, stepped));
  }

  function secureRandom() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }

  function randomChoice(items) {
    const index = Math.floor(secureRandom() * items.length);
    return items[index];
  }

  function pickWeightedSymbol() {
    const weights = { ...BASE_WEIGHTS };

    if (state.luckyCacheSpins > 0) {
      weights.PROMPT += 5;
      weights.GPU += 3;
      weights.AGENT += 2;
      weights["404"] = Math.max(2, weights["404"] - 6);
      weights.BUG = Math.max(3, weights.BUG - 4);
    }

    const total = SYMBOLS.reduce((sum, sym) => sum + weights[sym], 0);
    let mark = secureRandom() * total;

    for (const symbol of SYMBOLS) {
      mark -= weights[symbol];
      if (mark <= 0) {
        return symbol;
      }
    }

    return SYMBOLS[SYMBOLS.length - 1];
  }

  async function spin() {
    if (spinning) {
      return;
    }

    normalizeBetInput();
    const bet = Number(els.betInput.value);

    if (bet > state.tokens) {
      addLog("Not enough tokens for that bet. Try a smaller delusion.", "loss");
      setStatus("Insufficient wallet balance.");
      playTone("loss");
      return;
    }

    spinning = true;
    setControlsDisabled(true);

    state.tokens -= bet;
    state.spins += 1;
    render();

    setStatus("Running inference. Please ignore the cloud invoice.");

    const result = [pickWeightedSymbol(), pickWeightedSymbol(), pickWeightedSymbol()];

    await animateReels(result);
    settleResult(result, bet);

    if (state.luckyCacheSpins > 0) {
      state.luckyCacheSpins -= 1;
    }

    saveState();
    spinning = false;
    setControlsDisabled(false);
    render();
  }

  async function animateReels(finalSymbols) {
    const jobs = els.reels.map((reel, i) => {
      return new Promise((resolve) => {
        reel.classList.add("spinning");

        const timer = setInterval(() => {
          reel.textContent = randomChoice(SYMBOLS);
        }, 80);

        setTimeout(() => {
          clearInterval(timer);
          reel.classList.remove("spinning");
          reel.classList.add("settle");
          reel.textContent = finalSymbols[i];
          setTimeout(() => reel.classList.remove("settle"), 200);
          resolve();
        }, 850 + i * 190);
      });
    });

    await Promise.all(jobs);
  }

  function settleResult(symbols, bet) {
    const counts = symbols.reduce((acc, sym) => {
      acc[sym] = (acc[sym] || 0) + 1;
      return acc;
    }, {});

    const matches = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [topSymbol, topCount] = matches[0];

    let payout = 0;
    let message = "";
    let logType = "loss";
    let tone = "loss";

    if (topCount === 3) {
      if (topSymbol === "404") {
        const outageFee = Math.round(bet * 0.6);
        state.tokens = Math.max(0, state.tokens - outageFee);
        state.losses += 1;
        message = `Triple 404. Incident response fee: -${outageFee} tokens.`;
      } else {
        payout = Math.round(bet * TRIPLE_MULTIPLIERS[topSymbol]);
        const boosted = applyHypeCredits(payout);
        payout = boosted.amount;
        state.tokens += payout;
        state.wins += 1;

        message = `${randomChoice(JACKPOT_LINES)} +${payout} tokens on ${topSymbol}${boosted.note}`;
        logType = "win";
        tone = "win";
      }
    } else if (topCount === 2) {
      payout = Math.round(bet * 2.2);
      const boosted = applyHypeCredits(payout);
      payout = boosted.amount;

      state.tokens += payout;
      state.wins += 1;

      message = `${randomChoice(PAIR_LINES)} +${payout} tokens${boosted.note}`;
      logType = "win";
      tone = "win";
    } else {
      state.losses += 1;
      message = randomChoice(LOSS_LINES);

      if (state.patchNotes > 0) {
        const refund = Math.round(bet * 0.5);
        state.patchNotes -= 1;
        state.tokens += refund;
        message += ` Patch note applied: +${refund} token refund.`;
        logType = "info";
        tone = "info";
      }
    }

    addLog(message, logType);
    setStatus(message);
    playTone(tone);
    pulseWallet();
  }

  function applyHypeCredits(baseAmount) {
    if (state.hypeCredits <= 0) {
      return {
        amount: baseAmount,
        note: ""
      };
    }

    state.hypeCredits -= 1;
    const boosted = Math.round(baseAmount * 1.6);

    return {
      amount: boosted,
      note: " (hype credit multiplied payout)"
    };
  }

  function buyUpgrade(type) {
    if (spinning) {
      return;
    }

    if (type === "hype") {
      if (!spendTokens(COSTS.hype)) {
        return;
      }
      state.hypeCredits += 1;
      addLog("Hype credit purchased. Next win can ignore realism.", "info");
      setStatus("Hype credit ready.");
      playTone("info");
    }

    if (type === "patch") {
      if (!spendTokens(COSTS.patch)) {
        return;
      }
      state.patchNotes += 1;
      addLog("Patch note purchased. Next loss gets partial refund.", "info");
      setStatus("Patch note queued.");
      playTone("info");
    }

    if (type === "cache") {
      if (!spendTokens(COSTS.cache)) {
        return;
      }
      state.luckyCacheSpins += 3;
      addLog("Lucky cache purchased. Odds boosted for 3 spins.", "info");
      setStatus("Lucky cache activated.");
      playTone("info");
    }

    saveState();
    render();
  }

  function spendTokens(cost) {
    if (state.tokens < cost) {
      addLog(`Need ${cost} tokens. Finance says try manifesting them.`, "loss");
      setStatus("Purchase failed: not enough tokens.");
      playTone("loss");
      return false;
    }

    state.tokens -= cost;
    return true;
  }

  function emergencyFunding() {
    if (spinning) {
      return;
    }

    state.tokens += 90;
    addLog("Emergency funding round closed. +90 tokens.", "info");
    setStatus("Runway extended by optimism.");
    saveState();
    render();
    playTone("info");
  }

  function playTone(kind) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.type = kind === "loss" ? "sawtooth" : "triangle";
    gain.gain.value = 0.00001;

    const now = audio.currentTime;

    if (kind === "win") {
      oscillator.frequency.setValueAtTime(380, now);
      oscillator.frequency.linearRampToValueAtTime(760, now + 0.2);
    } else if (kind === "info") {
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.linearRampToValueAtTime(520, now + 0.2);
    } else {
      oscillator.frequency.setValueAtTime(190, now);
      oscillator.frequency.linearRampToValueAtTime(140, now + 0.2);
    }

    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.21);

    oscillator.start(now);
    oscillator.stop(now + 0.22);
    oscillator.onended = () => {
      audio.close().catch(() => {});
    };

    if (navigator.vibrate) {
      if (kind === "win") {
        navigator.vibrate([30, 20, 30]);
      } else if (kind === "loss") {
        navigator.vibrate([45]);
      }
    }
  }

  function setControlsDisabled(disabled) {
    els.spinBtn.disabled = disabled;
    els.betInput.disabled = disabled;
    els.buyHype.disabled = disabled;
    els.buyPatch.disabled = disabled;
    els.buyCache.disabled = disabled;
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

  function pulseWallet() {
    els.wallet.classList.remove("pulse");
    void els.wallet.offsetWidth;
    els.wallet.classList.add("pulse");
  }

  function addLog(text, kind) {
    const row = document.createElement("li");
    row.className = kind;

    const stamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    row.textContent = `[${stamp}] ${text}`;
    els.logList.prepend(row);

    while (els.logList.children.length > 12) {
      els.logList.removeChild(els.logList.lastChild);
    }
  }

  function render() {
    els.wallet.textContent = formatInt.format(state.tokens);
    els.spins.textContent = formatInt.format(state.spins);
    els.hype.textContent = formatInt.format(state.hypeCredits);
    els.patch.textContent = formatInt.format(state.patchNotes);
    els.cache.textContent = formatInt.format(state.luckyCacheSpins);

    els.wallet.style.color = state.tokens < 25 ? "var(--rose)" : "var(--text)";

    const canAnyBet = state.tokens >= MIN_BET;
    const inputBet = Number(els.betInput.value);
    const activeBet = Number.isFinite(inputBet) ? inputBet : MIN_BET;
    const canSpinBet = state.tokens >= activeBet && activeBet >= MIN_BET;

    els.bailoutBtn.classList.toggle("hidden", canAnyBet);

    els.betInput.disabled = spinning;
    els.spinBtn.disabled = spinning || !canSpinBet;
    els.buyHype.disabled = spinning || state.tokens < COSTS.hype;
    els.buyPatch.disabled = spinning || state.tokens < COSTS.patch;
    els.buyCache.disabled = spinning || state.tokens < COSTS.cache;
  }
})();
