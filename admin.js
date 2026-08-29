import { DB } from './db.js';

// Faqat shu Telegram ID admin sifatida sozlamalarni o'zgartira oladi.
const ADMIN_ID = 1621559223;

// Har bir sozlama uchun: ko'rsatiladigan nom, emoji va tanlov variantlari.
const SETTINGS_META = {
  minesCount: {
    label: 'Minalar soni',
    emoji: '💣',
    options: [1, 2, 3, 4, 5, 6]
  },
  minesRevealPoints: {
    label: 'Xavfsiz katak bali',
    emoji: '💎',
    options: [1, 3, 5, 10]
  },
  minesWinBonus: {
    label: "G'alaba bonusi",
    emoji: '🏆',
    options: [10, 20, 30, 50]
  },
  quizQuestionCount: {
    label: 'Viktorina savollar soni',
    emoji: '🧠',
    options: [4, 5, 6, 8, 10]
  },
  quizCorrectPoints: {
    label: "To'g'ri javob bali (viktorina)",
    emoji: '✅',
    options: [5, 10, 15, 20]
  },
  flagPoints: {
    label: 'Bayroq o\'yini bali',
    emoji: '🏳️',
    options: [5, 10, 15, 20]
  },
  anagramPoints: {
    label: 'Anagramma bali',
    emoji: '🧩',
    options: [5, 10, 15, 20]
  }
};

function isAdmin(ctx) {
  return ctx.from && ctx.from.id === ADMIN_ID;
}

function buildMainMenu() {
  const current = DB.getAllSettings();
  const rows = Object.entries(SETTINGS_META).map(([key, meta]) => ([{
    text: `${meta.emoji} ${meta.label}: ${current[key]}`,
    callback_data: `adm_open_${key}`
  }]));
  rows.push([{ text: '🔄 Standart holatga qaytarish', callback_data: 'adm_reset' }]);
  return { inline_keyboard: rows };
}

function buildOptionsMenu(key) {
  const meta = SETTINGS_META[key];
  const current = DB.getSetting(key);
  const rows = [];
  let row = [];
  meta.options.forEach((val, idx) => {
    const mark = val === current ? '✅ ' : '';
    row.push({ text: `${mark}${val}`, callback_data: `adm_set_${key}_${val}` });
    if (row.length === 3) {
      rows.push(row);
      row = [];
    }
  });
  if (row.length) rows.push(row);
  rows.push([{ text: '⬅️ Orqaga', callback_data: 'adm_back' }]);
  return { inline_keyboard: rows };
}

export function registerAdminPanel(bot) {
  bot.command(['settings', 'sozlamalar', 'admin'], async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Bu buyruq faqat bot administratori uchun.');
    }
    await ctx.reply(
      '⚙️ **Bot sozlamalari**\n\nO\'zgartirmoqchi bo\'lgan sozlamani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });

  bot.action(/^adm_open_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    const key = ctx.match[1];
    const meta = SETTINGS_META[key];
    if (!meta) return ctx.answerCbQuery('⚠️ Topilmadi.');

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `${meta.emoji} **${meta.label}**\n\nYangi qiymatni tanlang:`,
      { parse_mode: 'Markdown', reply_markup: buildOptionsMenu(key) }
    );
  });

  bot.action(/^adm_set_(.+)_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    const key = ctx.match[1];
    const value = parseInt(ctx.match[2], 10);
    if (!SETTINGS_META[key]) return ctx.answerCbQuery('⚠️ Topilmadi.');

    DB.setSetting(key, value);
    await ctx.answerCbQuery(`✅ Saqlandi: ${value}`);
    await ctx.editMessageText(
      '⚙️ **Bot sozlamalari**\n\nO\'zgartirmoqchi bo\'lgan sozlamani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });

  bot.action('adm_back', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '⚙️ **Bot sozlamalari**\n\nO\'zgartirmoqchi bo\'lgan sozlamani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });

  bot.action('adm_reset', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    DB.resetSettings();
    await ctx.answerCbQuery('🔄 Standart holatga qaytarildi!');
    await ctx.editMessageText(
      '⚙️ **Bot sozlamalari**\n\nO\'zgartirmoqchi bo\'lgan sozlamani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });
}
