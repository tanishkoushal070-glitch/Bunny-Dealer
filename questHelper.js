const User = require("../models/User");

const QUEST_POOL = [
  // Work quests
  { questId: "work5",   name: "Hard Worker",       description: "Work 5 times",             type: "work",         target: 5,    reward: { grass: 500,  carrots: 0 } },
  { questId: "work10",  name: "Dedicated Worker",   description: "Work 10 times",            type: "work",         target: 10,   reward: { grass: 1500, carrots: 0 } },
  { questId: "work20",  name: "Workaholic",         description: "Work 20 times",            type: "work",         target: 20,   reward: { grass: 3000, carrots: 1 } },
  // Fishing quests
  { questId: "fish5",   name: "Weekend Fisher",     description: "Catch 5 fish",             type: "fish",         target: 5,    reward: { grass: 400,  carrots: 0 } },
  { questId: "fish10",  name: "Fisherman",          description: "Catch 10 fish",            type: "fish",         target: 10,   reward: { grass: 800,  carrots: 0 } },
  { questId: "fish25",  name: "Deep Sea Fisher",    description: "Catch 25 fish",            type: "fish",         target: 25,   reward: { grass: 2000, carrots: 1 } },
  // Hunting quests
  { questId: "hunt5",   name: "Beginner Hunter",    description: "Hunt 5 times",             type: "hunt",         target: 5,    reward: { grass: 600,  carrots: 0 } },
  { questId: "hunt15",  name: "Bunny Hunter",       description: "Hunt 15 times",            type: "hunt",         target: 15,   reward: { grass: 1200, carrots: 0 } },
  { questId: "hunt30",  name: "Master Hunter",      description: "Hunt 30 times",            type: "hunt",         target: 30,   reward: { grass: 2500, carrots: 2 } },
  // Gambling quests
  { questId: "gamble3", name: "Lucky Hand",         description: "Win 3 gambling games",     type: "gamblingWins", target: 3,    reward: { grass: 1000, carrots: 0 } },
  { questId: "gamble5", name: "High Roller",        description: "Win 5 gambling games",     type: "gamblingWins", target: 5,    reward: { grass: 2000, carrots: 1 } },
  { questId: "gamble10",name: "Casino King",        description: "Win 10 gambling games",    type: "gamblingWins", target: 10,   reward: { grass: 4000, carrots: 2 } },
  // Earnings quests
  { questId: "earn5k",  name: "Grass Grower",       description: "Earn 5,000 Grass",         type: "earned",       target: 5000, reward: { grass: 500,  carrots: 1 } },
  { questId: "earn20k", name: "Grass Baron",        description: "Earn 20,000 Grass",        type: "earned",       target: 20000,reward: { grass: 2000, carrots: 2 } },
  // Forage quests
  { questId: "forage8", name: "Forager",            description: "Forage 8 times",           type: "forage",       target: 8,    reward: { grass: 700,  carrots: 0 } },
  { questId: "forage15",name: "Nature Lover",       description: "Forage 15 times",          type: "forage",       target: 15,   reward: { grass: 1400, carrots: 1 } },
  // Mine quests
  { questId: "mine10",  name: "Miner",              description: "Mine 10 times",            type: "mine",         target: 10,   reward: { grass: 1000, carrots: 0 } },
  { questId: "mine25",  name: "Diamond Miner",      description: "Mine 25 times",            type: "mine",         target: 25,   reward: { grass: 3000, carrots: 2 } },
  // Duel quests
  { questId: "duel3",   name: "Fighter",            description: "Win 3 duels",              type: "duelWins",     target: 3,    reward: { grass: 1500, carrots: 0 } },
  // Scratch quests
  { questId: "scratch5",name: "Card Scratcher",     description: "Use 5 scratch cards",      type: "scratch",      target: 5,    reward: { grass: 800,  carrots: 0 } },
];

function getRandomQuests(count = 5) {
  const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5);
  const now = new Date();
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return shuffled.slice(0, count).map((q) => ({
    ...q,
    progress: 0,
    expiresAt: expiry,
  }));
}

async function updateQuestProgress(userId, type, amount = 1) {
  try {
    const user = await User.findOne({ userId });
    if (!user || !user.activeQuests?.length) return [];

    let updated = false;
    const completedQuests = [];

    for (const quest of user.activeQuests) {
      if (quest.type === type && quest.progress < quest.target) {
        const before = quest.progress;
        quest.progress = Math.min(quest.progress + amount, quest.target);
        if (quest.progress !== before) updated = true;
        if (quest.progress >= quest.target) {
          completedQuests.push(quest);
        }
      }
    }

    if (updated) {
      user.markModified("activeQuests");
      await user.save();
    }

    return completedQuests;
  } catch (err) {
    console.error("updateQuestProgress error:", err);
    return [];
  }
}

module.exports = { QUEST_POOL, getRandomQuests, updateQuestProgress };
