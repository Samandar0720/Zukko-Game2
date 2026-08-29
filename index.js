import express from 'express';
import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { DB } from './db.js';
import { registerAllGames } from './games.js';

if (!config.botToken) {
  console.error('❌ BOT_TOKEN belgilanmagan! Bot ishga tushmaydi.');
  process.exit(1);
}

const bot = new Telegraf(config.botToken);
const app = express();

app.use(express.json());

// Express Health Check endpoint (Render deploy uchun)
app.get('/', (req, res) => {
  res.send('🎮 Zukko Telegram Bot Muvaffaqiyatli Ishlamoqda!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Basic Commands
bot.start((ctx) => {
  const name = ctx.from.first_name || 'Do\'stim';
  const text = `Salom ${name}! 👋\n\n` +
    `🤖 Men **Zukko Game Bot**man — Har xil (1 kishilik, 2 kishilik va ko'pchilik) o'yinlar boti!\n\n` +
    `Zerikkanda bir o'zingiz o'ynaysizmi, do'stingiz bilan duel qilasizmi yoki guruhda o'ynaysizmi — barchasi bor!\n\n` +
    `🎮 O'yinlar menyusini ochish uchun /game buyrug'ini yuboring.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '👤 1 Kishilik (Solo)', callback_data: 'cat_solo' },
        { text: '⚔️ 2 Kishilik (Duel)', callback_data: 'cat_duel' }
      ],
      [
        { text: '👥 3+ Kishilik (Guruh)', callback_data: 'cat_party' },
        { text: '🎲 Barcha O\'yinlar', callback_data: 'cat_all' }
      ],
      [
        { text: '🏆 Top O\'yinchilar', callback_data: 'menu_top' },
        { text: '➕ Guruhga qo\'shish', url: `https://t.me/${ctx.botInfo.username}?startgroup=true` }
      ]
    ]
  };

  return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
});

bot.help((ctx) => {
  const helpText = `🎮 **Zukko Bot O'yinlar Ro'yxati va Buyruqlari:**\n\n` +
    `👤 **1 Kishilik O'yinlar (Solo / Zerikkanda):**\n` +
    `• /wordle — O'zbekcha Wordle (5-harfli so'z topish)\n` +
    `• /mines — Mina Maydoni (Minesweeper mini grid)\n` +
    `• /sontop — Son Topish (1 dan 100 gacha)\n` +
    `• /quiz — Viktorina / Bilag'on jangi\n\n` +
    `⚔️ **2 Kishilik Duellar (1v1):**\n` +
    `• /xo — X-O (Tic-Tac-Toe 3x3 grid)\n` +
    `• /rps — Tosh-Qaychi-Qog'oz instant duel\n\n` +
    `👥 **3+ va Ko'pchilik O'yinlari (Party):**\n` +
    `• /spy — Josus (Spyfall party game)\n` +
    `• /croc — Timsah (Pantomima / Emoji mime)\n` +
    `• /alias — Taxmin qil (So'z ta'riflash)\n` +
    `• /fibbage — Soxta javob (Fibbage)\n` +
    `• /superlatives — Eng ko'p ovoz\n` +
    `• /truthlie — 2 chin va 1 yolg'on\n` +
    `• /story — Hikoya zanjiri\n\n` +
    `🏆 **/top** — Reyting va to'plangan ballar.`;

  return ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// /game or /games menu
bot.command(['game', 'games', 'oyinlar'], (ctx) => {
  const text = `🎮 **Zukko O'yinlar Boti**\n\nQanday o'yin o'ynamoqchisiz? O'yinchilar soniga qarab toifani tanlang:`;
  const keyboard = {
    inline_keyboard: [
      [{ text: '👤 1 Kishilik O\'yinlar (Solo)', callback_data: 'cat_solo' }],
      [{ text: '⚔️ 2 Kishilik Duellar (1v1)', callback_data: 'cat_duel' }],
      [{ text: '👥 3+ Kishilik Guruh O\'yinlari (Party)', callback_data: 'cat_party' }],
      [{ text: '🎲 Barcha o\'yinlar ro\'yxati', callback_data: 'cat_all' }]
    ]
  };
  return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
});

// Callback Category Actions
bot.action('cat_solo', (ctx) => {
  ctx.answerCbQuery();
  const text = `👤 **1 Kishilik O'yinlar (Solo — Zerikkanda o'ynash uchun):**\n\n` +
    `🔤 **/wordle** — O'zbekcha Wordle\n` +
    `💣 **/mines** — Mina Maydoni\n` +
    `🔢 **/sontop** — Son Topish\n` +
    `🧠 **/quiz** — Bilag'on jangi\n\n` +
    `_Ushbu o'yinlarni shaxsiy botda (DM) ham, guruhda ham o'ynashingiz mumkin!_`;
  return ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.action('cat_duel', (ctx) => {
  ctx.answerCbQuery();
  const text = `⚔️ **2 Kishilik Duellar (1v1):**\n\n` +
    `❌⭕ **/xo** — X-O (Tic-Tac-Toe)\n` +
    `✂️🪨📄 **/rps** — Tosh-Qaychi-Qog'oz\n\n` +
    `_O'yinni boshlang va do'stingizni duelga chaqiring!_`;
  return ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.action('cat_party', (ctx) => {
  ctx.answerCbQuery();
  const text = `👥 **3+ Kishilik Guruh O'yinlari (Party Games):**\n\n` +
    `🕵️‍♂️ **/spy** — Josus (Spyfall)\n` +
    `🐊 **/croc** — Timsah (Pantomima)\n` +
    `🎭 **/alias** — Taxmin qil\n` +
    `🎣 **/fibbage** — Soxta javob\n` +
    `🏆 **/superlatives** — Eng ko'p ovoz\n` +
    `🤥 **/truthlie** — 2 Chin 1 Yolg'on\n` +
    `📖 **/story** — Hikoya zanjiri`;
  return ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.action('cat_all', (ctx) => {
  ctx.answerCbQuery();
  return bot.handleUpdate({ ...ctx.update, message: ctx.callbackQuery.message, text: '/help' });
});

bot.action('menu_top', (ctx) => {
  ctx.answerCbQuery();
  return sendTopLeaderboard(ctx);
});

bot.command(['top', 'stats', 'leaderboard'], (ctx) => sendTopLeaderboard(ctx));

function sendTopLeaderboard(ctx) {
  const top = DB.getTopScores(10);
  if (top.length === 0) {
    return ctx.reply("🏆 Hali hech kim ochko to'plamadi. O'yinlarni o'ynab birinchi bo'ling!");
  }

  let text = `🏆 **Eng Kuchli O'yinchilar (Top 10):**\n\n`;
  top.forEach((player, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
    text += `${medal} **${player.name}** (${player.username}): **${player.points} ball**\n`;
  });

  return ctx.reply(text, { parse_mode: 'Markdown' });
}

// Xavfsizlik qatlami: barcha ctx.answerCbQuery() chaqiruvlarini
// "eskirgan query" xatosidan himoyalaymiz, shunda 57 joyni birma-bir
// try/catch bilan o'rashning hojati qolmaydi.
bot.use((ctx, next) => {
  if (ctx.answerCbQuery) {
    const original = ctx.answerCbQuery.bind(ctx);
    ctx.answerCbQuery = async (...args) => {
      try {
        return await original(...args);
      } catch (err) {
        const desc = err?.response?.description || err?.message || '';
        if (desc.includes('query is too old') || desc.includes('query ID is invalid')) {
          return; // eskirgan — jim o'tkazib yuboramiz
        }
        throw err;
      }
    };
  }
  return next();
});

// Register all 13 games
registerAllGames(bot);

// Launch mode setup
const PORT = config.port;

// Global xato ushlagich: har qanday action/middleware xatosi
// (masalan, eskirgan callback query) butun botni yiqitmasligi uchun.
bot.catch((err, ctx) => {
  const desc = err?.response?.description || err?.message || '';
  if (desc.includes('query is too old') || desc.includes('query ID is invalid')) {
    // Eskirgan callback query — e'tiborsiz qoldiramiz, bu normal holat
    console.log(`⚠️ Eskirgan callback query e'tiborsiz qoldirildi (update ${ctx?.update?.update_id}).`);
    return;
  }
  console.error(`❌ Botda kutilmagan xato (update ${ctx?.update?.update_id}):`, err);
});

if (config.webhookUrl) {
  const webhookPath = `/webhook/${config.botToken}`;
  app.use(bot.webhookCallback(webhookPath));
  bot.telegram.setWebhook(`${config.webhookUrl}${webhookPath}`);
  console.log(`🌐 Webhook o'rnatildi: ${config.webhookUrl}${webhookPath}`);
} else {
  bot.launch({
    dropPendingUpdates: true, // restart paytida yig'ilib qolgan eski update'larni tashlab yuborish
  }).then(() => {
    console.log('🚀 Zukko Telegram Bot Polling rejimida muvaffaqiyatli ishga tushdi!');
  }).catch((err) => {
    console.error('❌ Bot launch error:', err);
  });
}

app.listen(PORT, () => {
  console.log(`🌐 Express server ${PORT}-portda ishlamoqda.`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
