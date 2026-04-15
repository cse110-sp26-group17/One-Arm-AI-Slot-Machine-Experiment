const symbols = ["🤖", "🪙", "🔥", "✨", "📉", "🧃"];
const reels = Array.from(document.querySelectorAll(".reel"));
const tokenCountEl = document.getElementById("tokenCount");
const spinCostEl = document.getElementById("spinCost");
const messageEl = document.getElementById("message");
const eventFeedEl = document.getElementById("eventFeed");
const spinButton = document.getElementById("spinButton");
const resetButton = document.getElementById("resetButton");

const startingTokens = 120;
const storageKey = "token-grinder-3000-state";
let tokens = startingTokens;
let spinCost = 15;
let spinning = false;

const commentary = {
  lose: [
    "The model hallucinated your profit margin. Classic.",
    "Your prompt budget has been reallocated to executive optimism.",
    "Those tokens were converted into a visionary roadmap deck.",
    "The reels generated vibes instead of value this time."
  ],
  pair: [
    "A matched pair. Enough tokens to keep the scam alive.",
    "Two symbols aligned. Investors call that traction.",
    "You found a tiny edge and instantly overfit to it."
  ],
  big: [
    "Massive win. Please enjoy these premium imaginary margins.",
    "The AI economy salutes you with a brief liquidity event.",
    "Your synthetic alpha has been approved for immediate celebration."
  ],
  broke: [
    "You are out of tokens. Time to pivot to enterprise consulting.",
    "Wallet empty. Consider rebranding as an AI thought leader.",
    "The runway is gone, but the keynote slides remain immaculate."
  ]
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed.tokens === "number") {
      tokens = Math.max(0, Math.floor(parsed.tokens));
    }
    if (typeof parsed.spinCost === "number") {
      spinCost = Math.min(30, Math.max(15, Math.floor(parsed.spinCost)));
    }
  } catch {
    // If saved data is invalid, fall back to defaults.
  }
}

function saveState() {
  window.localStorage.setItem(storageKey, JSON.stringify({ tokens, spinCost }));
}

function buzz(pattern) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

function renderStatus() {
  tokenCountEl.textContent = String(tokens);
  spinCostEl.textContent = String(spinCost);
  spinButton.textContent = `Spend ${spinCost} Tokens`;
  spinButton.disabled = spinning || tokens < spinCost;
}

function addFeedEntry(text, emphasis) {
  const item = document.createElement("li");
  if (emphasis) {
    item.innerHTML = `<strong>${emphasis}</strong> ${text}`;
  } else {
    item.textContent = text;
  }
  eventFeedEl.prepend(item);

  while (eventFeedEl.children.length > 5) {
    eventFeedEl.removeChild(eventFeedEl.lastElementChild);
  }
}

function setMessage(text) {
  messageEl.textContent = text;
}

function calculatePayout(results) {
  const [a, b, c] = results;

  if (a === b && b === c) {
    switch (a) {
      case "🤖":
        return { payout: 200, tone: "big", label: "Triple Bots" };
      case "🪙":
        return { payout: 120, tone: "big", label: "Token Flood" };
      case "🔥":
        return { payout: 90, tone: "big", label: "Hype Cycle" };
      case "✨":
        return { payout: 70, tone: "big", label: "Prompt Glow-Up" };
      default:
        return { payout: 55, tone: "big", label: "Off-Brand Jackpot" };
    }
  }

  if (a === b || b === c || a === c) {
    return { payout: 25, tone: "pair", label: "Pair Match" };
  }

  return { payout: 0, tone: "lose", label: "No Match" };
}

function pickSymbol() {
  const weighted = [
    "🤖", "🤖",
    "🪙", "🪙",
    "🔥", "🔥",
    "✨",
    "📉",
    "🧃"
  ];
  return randomItem(weighted);
}

function animateReel(reel, delay, finalSymbol) {
  reel.classList.add("spinning");

  return new Promise((resolve) => {
    let ticks = 0;
    const interval = window.setInterval(() => {
      reel.textContent = randomItem(symbols);
      ticks += 1;
    }, 90);

    window.setTimeout(() => {
      window.clearInterval(interval);
      reel.classList.remove("spinning");
      reel.textContent = finalSymbol;
      resolve();
    }, delay + ticks * 20);
  });
}

async function spin() {
  if (spinning || tokens < spinCost) {
    return;
  }

  spinning = true;
  tokens -= spinCost;
  renderStatus();
  setMessage("Allocating tokens to the inference casino...");

  const results = [pickSymbol(), pickSymbol(), pickSymbol()];

  await Promise.all(
    reels.map((reel, index) => animateReel(reel, 700 + index * 250, results[index]))
  );

  const outcome = calculatePayout(results);
  tokens += outcome.payout;
  spinning = false;

  if (outcome.payout > 0) {
    buzz([80, 40, 120]);
    setMessage(`${outcome.label}! You won ${outcome.payout} tokens.`);
    addFeedEntry(`${randomItem(commentary[outcome.tone])} Net result: +${outcome.payout - spinCost} tokens.`, outcome.label);
  } else if (tokens < spinCost) {
    buzz([180, 70, 180]);
    setMessage(randomItem(commentary.broke));
    addFeedEntry("The market has spoken and it said: maybe stop spinning.", "Wallet Alert");
  } else {
    buzz(120);
    setMessage(randomItem(commentary.lose));
    addFeedEntry(`Spin cost burned: ${spinCost} tokens. The board calls this disciplined experimentation.`, "No Match");
  }

  spinCost = Math.min(spinCost + 1, 30);
  saveState();
  renderStatus();
}

function resetGame() {
  tokens = startingTokens;
  spinCost = 15;
  spinning = false;
  reels.forEach((reel, index) => {
    reel.textContent = symbols[index];
    reel.classList.remove("spinning");
  });
  setMessage("Fresh funding secured. The token economy is irresponsible again.");
  addFeedEntry("A new round of venture capital has arrived. Burn rate restored.", "Reset");
  saveState();
  renderStatus();
}

spinButton.addEventListener("click", spin);
resetButton.addEventListener("click", resetGame);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    spin();
  }
});

loadState();
addFeedEntry("Welcome to Token Grinder 3000, where every spin is basically a pricing experiment.", "Launch");
addFeedEntry("Analysts predict strong demand for losing money with extra machine learning.", "Forecast");
renderStatus();
