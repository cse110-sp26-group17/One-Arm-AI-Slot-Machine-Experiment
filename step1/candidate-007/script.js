const symbols = ["GPT", "TOKEN", "404", "LAG", "PROMPT", "HYPE"];
const startingTokens = 120;
const spinCost = 15;

const tokenCount = document.getElementById("token-count");
const resultMessage = document.getElementById("result-message");
const systemMood = document.getElementById("system-mood");
const spinButton = document.getElementById("spin-button");
const resetButton = document.getElementById("reset-button");
const reels = Array.from(document.querySelectorAll(".reel"));

let tokens = startingTokens;
let isSpinning = false;

const moods = {
  broke: "Context window collapsed",
  low: "Selling premium vibes",
  neutral: "Smug but solvent",
  rich: "Hallucinating prosperity"
};

const quips = {
  jackpot: [
    "Three GPTs. The model has decided you are venture capital now.",
    "Jackpot. Somewhere an AI startup just renamed this outcome to tokenomics."
  ],
  tokenTriple: [
    "Triple TOKEN. The machine respects your commitment to artificial scarcity.",
    "Three TOKENs. Congratulations on monetizing the concept of breathing near a GPU."
  ],
  triple: [
    "Three matching symbols. The algorithm clapped politely and paid out.",
    "Clean triple. Your reward is enough tokens for several aggressively average prompts."
  ],
  pair: [
    "A pair lands. Not enough for dignity, but enough for another spin.",
    "Two match. The machine calls this a strategic alignment."
  ],
  miss: [
    "No match. The model thanks you for your donation to speculative compute.",
    "Miss. Those tokens have been reinvested into hotter takes and slower load times."
  ],
  broke: [
    "Wallet empty. The AI suggests upgrading to the Pro Ultra Max Infinite plan.",
    "No tokens left. Have you considered describing your poverty in a better prompt?"
  ]
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function updateTokens() {
  tokenCount.textContent = String(tokens);

  if (tokens <= 0) {
    systemMood.textContent = moods.broke;
  } else if (tokens < 45) {
    systemMood.textContent = moods.low;
  } else if (tokens < 140) {
    systemMood.textContent = moods.neutral;
  } else {
    systemMood.textContent = moods.rich;
  }
}

function setMessage(message) {
  resultMessage.textContent = message;
}

function flashReels(className) {
  reels.forEach((reel) => {
    reel.classList.remove("win-flash", "loss-flash");
    reel.classList.add(className);
  });

  window.setTimeout(() => {
    reels.forEach((reel) => reel.classList.remove(className));
  }, 900);
}

function evaluateSpin(result) {
  const counts = result.reduce((map, symbol) => {
    map[symbol] = (map[symbol] || 0) + 1;
    return map;
  }, {});

  const uniqueCount = Object.keys(counts).length;

  if (counts["GPT"] === 3) {
    return { payout: 250, message: pick(quips.jackpot), win: true };
  }

  if (counts["TOKEN"] === 3) {
    return { payout: 120, message: pick(quips.tokenTriple), win: true };
  }

  if (counts["404"] === 3) {
    return {
      payout: 0,
      message: "Triple 404. The answer could not be found, but the invoice definitely was.",
      win: false
    };
  }

  if (uniqueCount === 1) {
    return { payout: 80, message: pick(quips.triple), win: true };
  }

  if (Object.values(counts).some((count) => count === 2)) {
    return { payout: 35, message: pick(quips.pair), win: true };
  }

  return { payout: 0, message: pick(quips.miss), win: false };
}

function animateReel(reel, delay) {
  return new Promise((resolve) => {
    reel.classList.add("spinning");

    const spinInterval = window.setInterval(() => {
      reel.textContent = pick(symbols);
    }, 90);

    window.setTimeout(() => {
      window.clearInterval(spinInterval);
      const finalSymbol = pick(symbols);
      reel.textContent = finalSymbol;
      reel.classList.remove("spinning");
      resolve(finalSymbol);
    }, delay);
  });
}

async function spin() {
  if (isSpinning) {
    return;
  }

  if (tokens < spinCost) {
    setMessage(pick(quips.broke));
    flashReels("loss-flash");
    return;
  }

  isSpinning = true;
  spinButton.disabled = true;

  tokens -= spinCost;
  updateTokens();
  setMessage("Processing prompt... burning tokens... consulting the vibes...");

  const result = [];

  for (const [index, reel] of reels.entries()) {
    const symbol = await animateReel(reel, 700 + index * 260);
    result.push(symbol);
  }

  const outcome = evaluateSpin(result);
  tokens += outcome.payout;
  updateTokens();
  setMessage(`${outcome.message} Result: ${result.join(" | ")}.`);
  flashReels(outcome.win ? "win-flash" : "loss-flash");

  isSpinning = false;
  spinButton.disabled = false;
}

function resetGame() {
  tokens = startingTokens;
  updateTokens();
  setMessage("Wallet rebooted. The AI is ready to separate you from your tokens again.");
  reels.forEach((reel) => {
    reel.textContent = "404";
    reel.classList.remove("win-flash", "loss-flash", "spinning");
  });
  spinButton.disabled = false;
  isSpinning = false;
}

spinButton.addEventListener("click", spin);
resetButton.addEventListener("click", resetGame);

updateTokens();
