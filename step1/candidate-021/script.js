const symbols = ["??", "??", "?", "???", "??", "??", "??", "??"];

const jackpots = {
  "??????": 85,
  "??????": 120,
  "??????": 65,
  "??????": 50,
  "??????": 35,
};

const roastLines = {
  winBig: [
    "Massive win. The model finally stopped hallucinating your balance.",
    "Jackpot! The AI calls this 'reinforcement learning by gambling.'",
    "Token shower detected. Somewhere a chatbot claims it predicted this.",
  ],
  win: [
    "Nice hit. You exploited the algorithm before it exploited you.",
    "Profit acquired. The AI terms of service now call you 'edge case.'",
    "You won tokens. The machine calls that a temporary bug.",
  ],
  lose: [
    "No payout. The model says this is an intentional feature.",
    "You lost. The AI sent a smiling apology generated at scale.",
    "Spin failed. Have you tried asking with better prompt engineering?",
  ],
  broke: [
    "Out of tokens. The AI recommends buying a Premium Feelings Plan.",
    "Balance empty. The model is confident this builds character.",
  ],
  buy: [
    "Purchased. Performance unchanged, but your optimism improved.",
    "Upgrade installed. Nothing happened, but the dashboard looks expensive.",
    "Transaction complete. You bought pure synthetic confidence.",
  ],
};

const storeItems = [
  {
    name: "Hallucination Shield",
    price: 25,
    description: "Prevents fake facts by aggressively believing them first.",
  },
  {
    name: "Prompt Glitter",
    price: 40,
    description: "Adds sparkle to prompts and measurable confusion to outputs.",
  },
  {
    name: "Ethics DLC",
    price: 55,
    description: "Injects moral confidence without changing behavior.",
  },
  {
    name: "Latency Turbo",
    price: 30,
    description: "Responses arrive faster, wrong answers arrive fastest.",
  },
];

let tokens = 100;
let spinCost = 5;
let isSpinning = false;

const tokensEl = document.getElementById("tokens");
const spinCostEl = document.getElementById("spin-cost");
const lastWinEl = document.getElementById("last-win");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spin-btn");
const reelsWrap = document.getElementById("reels");
const reels = [...reelsWrap.querySelectorAll(".reel")];
const storeGrid = document.getElementById("store-grid");
const template = document.getElementById("item-template");

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function updateDisplay(lastWin = 0) {
  tokensEl.textContent = String(tokens);
  spinCostEl.textContent = String(spinCost);
  lastWinEl.textContent = String(lastWin);
  spinBtn.disabled = tokens < spinCost || isSpinning;
  updateStoreButtons();
}

function setMessage(line) {
  messageEl.textContent = line;
}

function getPayout(combo) {
  if (jackpots[combo]) return jackpots[combo];

  const counts = Array.from(combo).reduce((acc, char) => {
    acc[char] = (acc[char] || 0) + 1;
    return acc;
  }, {});

  const hasPair = Object.values(counts).some((count) => count >= 2);
  return hasPair ? 10 : 0;
}

function updateStoreButtons() {
  const buttons = storeGrid.querySelectorAll("button[data-price]");
  buttons.forEach((button) => {
    const price = Number(button.dataset.price);
    button.disabled = tokens < price;
  });
}

function buildStore() {
  storeItems.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".item-name").textContent = item.name;
    node.querySelector(".item-desc").textContent = item.description;
    node.querySelector(".item-price").textContent = `${item.price} tokens`;

    const btn = node.querySelector(".buy-btn");
    btn.dataset.price = String(item.price);
    btn.addEventListener("click", () => {
      if (tokens < item.price) {
        setMessage(randomPick(roastLines.broke));
        return;
      }

      tokens -= item.price;
      spinCost = Math.max(3, spinCost - 1);
      updateDisplay(0);
      setMessage(`${randomPick(roastLines.buy)} Spin cost reduced to ${spinCost}.`);
    });

    storeGrid.appendChild(node);
  });
}

function spinAnimationTick() {
  reels.forEach((reel) => {
    reel.textContent = randomPick(symbols);
  });
}

async function spin() {
  if (tokens < spinCost || isSpinning) {
    setMessage(randomPick(roastLines.broke));
    return;
  }

  isSpinning = true;
  tokens -= spinCost;
  updateDisplay(0);
  reels.forEach((reel) => reel.classList.add("rolling"));

  const start = performance.now();
  while (performance.now() - start < 1150) {
    spinAnimationTick();
    await new Promise((resolve) => setTimeout(resolve, 90));
  }

  reels.forEach((reel) => reel.classList.remove("rolling"));

  const results = reels.map(() => randomPick(symbols));
  reels.forEach((reel, idx) => {
    reel.textContent = results[idx];
  });

  const combo = results.join("");
  const payout = getPayout(combo);
  tokens += payout;

  let msg;
  if (payout >= 50) {
    msg = randomPick(roastLines.winBig);
  } else if (payout > 0) {
    msg = randomPick(roastLines.win);
  } else {
    msg = randomPick(roastLines.lose);
  }

  if (payout > 0) {
    msg += ` Combo ${combo} paid ${payout} tokens.`;
  }

  setMessage(msg);
  isSpinning = false;
  updateDisplay(payout);
}

spinBtn.addEventListener("click", spin);

buildStore();
updateDisplay();
