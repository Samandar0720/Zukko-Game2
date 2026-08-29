import { DB } from './db.js';
import { questionsData } from './data.js';

export function registerAllGames(bot) {
  registerSuperlatives(bot);
  registerTwoTruthsOneLie(bot);
  registerAliasGuess(bot);
  registerQuiz(bot);
  registerFibbage(bot);
  registerStoryChain(bot);
  registerWordle(bot);
  registerMinesweeper(bot);
  registerNumberGuess(bot);
  registerTicTacToe(bot);
  registerRpsDuel(bot);
  registerSpyfall(bot);
  registerCrocodile(bot);
  // New Games
  registerMath(bot);
  registerFlagQuiz(bot);
  registerAnagram(bot);
  registerSpeedClick(bot);
  registerDiceBattle(bot);
  registerDartsBattle(bot);
  registerMathDuel(bot);
  registerBombGame(bot);
}

// 1. Superlatives
function registerSuperlatives(bot) {
  bot.command(['superlatives', 'super', 'ovoz'], async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('⚠️ Ushbu o\'yinni guruhda o\'ynash tavsiya etiladi!');
    }
    const chatId = ctx.chat.id;
    const questions = questionsData.superlatives;
    const question = questions[Math.floor(Math.random() * questions.length)];
    const botInfo = await bot.telegram.getMe();

    DB.setGame(chatId, {
      gameType: 'superlatives',
      question,
      chatId,
      votes: {}
    });

    const messageText = `🏆 **Eng ko'p ovoz (Superlatives)**\n\n❓ **Savol:** ${question}\n\n` +
      `👇 Ovoz berish uchun bot shaxsiysiga (DM) o'ting va nomzodni tanlang!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📥 Ovoz berish (DM)', url: `https://t.me/${botInfo.username}?start=super_${chatId}` }],
        [{ text: '📊 Natijalarni chiqarish', callback_data: `super_result_${chatId}` }]
      ]
    };
    await ctx.reply(messageText, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.action(/^super_result_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'superlatives') return ctx.answerCbQuery('⚠️ O\'yin topilmadi.');

    const totalVotes = Object.keys(game.votes).length;
    if (totalVotes === 0) return ctx.answerCbQuery('⚠️ Hali hech kim ovoz bermadi!');

    const tally = {};
    for (const voterId in game.votes) {
      const { votedId, votedName } = game.votes[voterId];
      tally[votedId] = tally[votedId] || { name: votedName, count: 0 };
      tally[votedId].count += 1;
    }

    const sorted = Object.values(tally).sort((a, b) => b.count - a.count);
    let resultText = `🏆 **"Eng ko'p ovoz" Natijalari!**\n\n❓ **Savol:** ${game.question}\n\n👥 Jami ovozlar: ${totalVotes}\n\n`;

    sorted.forEach((item, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
      resultText += `${medal} **${item.name}**: ${item.count} ta ovoz\n`;
    });

    if (sorted.length > 0) {
      resultText += `\n🎉 Tabriklaymiz, guruh qaroriga ko'ra **${sorted[0].name}** g'olib bo'ldi! (+10 ball)`;
    }

    DB.clearGame(chatId);
    await ctx.answerCbQuery('Natijalar e\'lon qilindi!');
    await ctx.reply(resultText, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text || '';
    if (ctx.chat.type === 'private' && text.startsWith('/start super_')) {
      const targetChatId = text.replace('/start super_', '').trim();
      const game = DB.getGame(targetChatId);
      if (!game || game.gameType !== 'superlatives') return ctx.reply('⚠️ O\'yin topilmadi.');
      ctx.session = ctx.session || {};
      ctx.session.votingSuperChatId = targetChatId;
      return ctx.reply(`🏆 **"Eng ko'p ovoz" o'yini**\n❓ Savol: ${game.question}\n\nNomzod ismini yozing:`);
    }

    if (ctx.chat.type === 'private' && ctx.session && ctx.session.votingSuperChatId) {
      const targetChatId = ctx.session.votingSuperChatId;
      const game = DB.getGame(targetChatId);
      if (game && game.gameType === 'superlatives') {
        game.votes[ctx.from.id] = { votedId: text.trim().toLowerCase(), votedName: text.trim() };
        delete ctx.session.votingSuperChatId;
        return ctx.reply(`✅ Siz **${text.trim()}** uchun ovoz berdingiz!`);
      }
    }
    return next();
  });
}

// 2. Two Truths One Lie
function registerTwoTruthsOneLie(bot) {
  bot.command(['truthlie', '2chin1yolgon', 'yolgon'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Ushbu o\'yinni guruhda boshlang!');
    const chatId = ctx.chat.id;
    const botInfo = await bot.telegram.getMe();

    DB.setGame(chatId, {
      gameType: 'twoTruthsOneLie',
      chatId,
      state: 'WAITING_FOR_FACTS',
      author: null,
      facts: [],
      lieIndex: -1,
      votes: {}
    });

    const text = `🤥 **Ikki chin, bitta yolg'on**\n\nDM orqali faktlaringizni yuboring:\n\` /myfacts Chin1 | Chin2 | Yolg'on \``;
    const keyboard = {
      inline_keyboard: [[{ text: '📥 DM orqali fakt yuborish', url: `https://t.me/${botInfo.username}?start=truthlie_${chatId}` }]]
    };
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.command('myfacts', async (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply('⚠️ Faktlarni DM da yuboring!');
    const targetChatId = ctx.session?.truthlieChatId;
    if (!targetChatId) return ctx.reply('⚠️ O\'yin topilmadi.');

    const game = DB.getGame(targetChatId);
    if (!game || game.gameType !== 'twoTruthsOneLie' || game.state !== 'WAITING_FOR_FACTS') return ctx.reply('⚠️ Yopilgan.');

    const text = ctx.message.text.replace('/myfacts', '').trim();
    const parts = text.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) return ctx.reply('⚠️ 3 ta faktni `|` bilan ajrating!');

    const items = [
      { text: parts[0], isLie: false },
      { text: parts[1], isLie: false },
      { text: parts[2], isLie: true }
    ].sort(() => Math.random() - 0.5);

    game.facts = items;
    game.lieIndex = items.findIndex(item => item.isLie);
    game.author = ctx.from;
    game.state = 'VOTING';

    await ctx.reply('✅ Faktlar qabul qilindi!');
    delete ctx.session.truthlieChatId;

    let groupText = `🤥 **Ikki chin, bitta yolg'on**\n👤 Muallif: **${ctx.from.first_name}**\n\nQaysi biri **YOLG'ON**?\n\n` +
      `1️⃣ ${items[0].text}\n2️⃣ ${items[1].text}\n3️⃣ ${items[2].text}\n`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "1️⃣", callback_data: `tl_vote_${targetChatId}_0` },
          { text: "2️⃣", callback_data: `tl_vote_${targetChatId}_1` },
          { text: "3️⃣", callback_data: `tl_vote_${targetChatId}_2` }
        ],
        [{ text: "🏁 Natijalar", callback_data: `tl_finish_${targetChatId}` }]
      ]
    };
    await bot.telegram.sendMessage(targetChatId, groupText, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text || '';
    if (ctx.chat.type === 'private' && text.startsWith('/start truthlie_')) {
      const targetChatId = text.replace('/start truthlie_', '').trim();
      ctx.session = ctx.session || {};
      ctx.session.truthlieChatId = targetChatId;
      return ctx.reply('Faktlaringizni yuboring: `/myfacts Chin1 | Chin2 | Yolg\'on`', { parse_mode: 'Markdown' });
    }
    return next();
  });

  bot.action(/^tl_vote_(-?\d+)_(\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const optionIndex = parseInt(ctx.match[2], 10);
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'twoTruthsOneLie' || game.state !== 'VOTING') return ctx.answerCbQuery('⚠️ Tugagan.');
    if (game.author && game.author.id === ctx.from.id) return ctx.answerCbQuery('⚠️ O\'zingizga ovoz bera olmaysiz!', { show_alert: true });

    game.votes[ctx.from.id] = { user: ctx.from, choice: optionIndex };
    await ctx.answerCbQuery(`✅ ${optionIndex + 1}-variantga ovoz berdingiz!`);
  });

  bot.action(/^tl_finish_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'twoTruthsOneLie' || game.state !== 'VOTING') return ctx.answerCbQuery('⚠️ Tugagan.');

    const totalVotes = Object.keys(game.votes).length;
    if (totalVotes === 0) return ctx.answerCbQuery('⚠️ Ovoz yo\'q!');

    let winners = [];
    let correctCount = 0;
    for (const vId in game.votes) {
      const v = game.votes[vId];
      if (v.choice === game.lieIndex) {
        correctCount++;
        DB.addPoints(v.user, 10);
        winners.push(v.user.first_name);
      }
    }

    const fooledCount = totalVotes - correctCount;
    if (fooledCount > 0 && game.author) DB.addPoints(game.author, fooledCount * 5);

    let summary = `🤥 **Natijalar:**\n👤 Muallif: **${game.author ? game.author.first_name : 'Noma\'lum'}**\n❌ **Yolg'on:** ${game.facts[game.lieIndex].text}\n\nTopganlar: ${winners.join(', ') || 'Hech kim'}`;
    DB.clearGame(chatId);
    await ctx.answerCbQuery('Yakunlandi!');
    await ctx.reply(summary, { parse_mode: 'Markdown' });
  });
}

// 3. Alias
function registerAliasGuess(bot) {
  bot.command(['alias', 'taxmin'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Guruhda boshlang!');
    const chatId = ctx.chat.id;
    const words = questionsData.alias;
    const word = words[Math.floor(Math.random() * words.length)];

    DB.setGame(chatId, {
      gameType: 'alias',
      chatId,
      word,
      explainer: null,
      state: 'WAITING_FOR_EXPLAINER',
      timer: null
    });

    const keyboard = { inline_keyboard: [[{ text: '🎭 Men tushuntiraman!', callback_data: `alias_claim_${chatId}` }]] };
    await ctx.reply(`🎭 **Taxmin qil (Alias)**\n\n👇 Tushuntiruvchi bo'lish uchun bosing:`, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.action(/^alias_claim_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'alias' || game.state !== 'WAITING_FOR_EXPLAINER') return ctx.answerCbQuery('⚠️ Topilmadi.');

    game.explainer = ctx.from;
    game.state = 'PLAYING';

    try {
      await bot.telegram.sendMessage(ctx.from.id, `🤫 **Yashirin so'zingiz:** \`${game.word}\``, { parse_mode: 'Markdown' });
    } catch (e) {
      return ctx.answerCbQuery('⚠️ DM ga yozib bo\'lmadi! Avval botga /start bosing.', { show_alert: true });
    }

    game.timer = setTimeout(async () => {
      const active = DB.getGame(chatId);
      if (active && active.gameType === 'alias' && active.state === 'PLAYING') {
        DB.clearGame(chatId);
        await bot.telegram.sendMessage(chatId, `⌛ **Vaqt tugadi!** Yashirin so'z **${active.word}** edi.`);
      }
    }, 60000);

    await ctx.answerCbQuery('So\'z DM ga yuborildi!');
    await ctx.editMessageText(`🎭 **Alias - O'yin Ketmoqda!**\n🗣 Tushuntiruvchi: **${ctx.from.first_name}**`, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.chat.type === 'private') return next();
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (game && game.gameType === 'alias' && game.state === 'PLAYING') {
      const text = ctx.message.text.trim().toLowerCase();
      const target = game.word.toLowerCase();
      if (game.explainer && game.explainer.id === ctx.from.id) return next();

      if (text === target || text.includes(target)) {
        clearTimeout(game.timer);
        DB.addPoints(ctx.from, 10);
        if (game.explainer) DB.addPoints(game.explainer, 5);
        DB.clearGame(chatId);
        await ctx.reply(`🎉 **TO'G'RI!** Yashirin so'z: **${game.word}**\nTopdi: **${ctx.from.first_name}** (+10 ball)`, { parse_mode: 'Markdown' });
      }
    }
    return next();
  });
}

// 4. Quiz
function registerQuiz(bot) {
  bot.command(['quiz', 'bilagon', 'viktorina'], async (ctx) => {
    const chatId = ctx.chat.id;
    const categories = [...new Set(questionsData.quiz.map(q => q.category)), '🎲 Aralash'];
    const buttons = categories.map((cat, idx) => [{ text: cat, callback_data: `quiz_start_${chatId}_${idx}` }]);

    await ctx.reply(`🧠 **Viktorina**\n\nKategoriyani tanlang:`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^quiz_start_(-?\d+)_(\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const catIdx = parseInt(ctx.match[2], 10);
    const categories = [...new Set(questionsData.quiz.map(q => q.category)), '🎲 Aralash'];
    const chosenCat = categories[catIdx];

    let filtered = questionsData.quiz;
    if (chosenCat !== '🎲 Aralash') filtered = filtered.filter(q => q.category === chosenCat);
    const questionCount = DB.getSetting('quizQuestionCount');
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, questionCount);

    DB.setGame(chatId, {
      gameType: 'quiz',
      chatId,
      questions: shuffled,
      currentIndex: 0,
      roundScores: {},
      answeredUsers: new Set(),
      timer: null
    });

    await ctx.answerCbQuery();
    sendNextQuizQuestion(bot, chatId);
  });

  bot.action(/^quiz_ans_(-?\d+)_(\d+)_(\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const qIndex = parseInt(ctx.match[2], 10);
    const optIdx = parseInt(ctx.match[3], 10);
    const game = DB.getGame(chatId);

    if (!game || game.gameType !== 'quiz' || game.currentIndex !== qIndex) return ctx.answerCbQuery('⚠️ Savol muddati tugagan.');
    const userKey = `${qIndex}_${ctx.from.id}`;
    if (game.answeredUsers.has(userKey)) return ctx.answerCbQuery('⚠️ Javob bergansiz!', { show_alert: true });

    game.answeredUsers.add(userKey);
    const q = game.questions[qIndex];

    if (optIdx === q.answer) {
      const correctPoints = DB.getSetting('quizCorrectPoints');
      DB.addPoints(ctx.from, correctPoints);
      await ctx.answerCbQuery(`🎉 To'g'ri! +${correctPoints} ball`);
    } else {
      await ctx.answerCbQuery(`❌ Noto'g'ri! To'g'ri: ${q.options[q.answer]}`);
    }
  });

  bot.action(/^quiz_next_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (game && game.gameType === 'quiz') {
      clearTimeout(game.timer);
      game.currentIndex += 1;
      await ctx.answerCbQuery();
      sendNextQuizQuestion(bot, chatId);
    }
  });
}

function sendNextQuizQuestion(bot, chatId) {
  const game = DB.getGame(chatId);
  if (!game) return;
  if (game.currentIndex >= game.questions.length) {
    DB.clearGame(chatId);
    return bot.telegram.sendMessage(chatId, `🏆 **Viktorina yakunlandi!**`, { parse_mode: 'Markdown' });
  }

  const qIndex = game.currentIndex;
  const q = game.questions[qIndex];
  const optionButtons = q.options.map((opt, idx) => [{ text: `${idx + 1}. ${opt}`, callback_data: `quiz_ans_${chatId}_${qIndex}_${idx}` }]);
  optionButtons.push([{ text: 'Keyingi ➡️', callback_data: `quiz_next_${chatId}` }]);

  bot.telegram.sendMessage(chatId, `🧠 **Viktorina (${qIndex + 1}/${game.questions.length})**\n📂 ${q.category}\n\n❓ ${q.question}`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: optionButtons }
  });

  game.timer = setTimeout(() => {
    const active = DB.getGame(chatId);
    if (active && active.gameType === 'quiz' && active.currentIndex === qIndex) {
      active.currentIndex += 1;
      sendNextQuizQuestion(bot, chatId);
    }
  }, 20000);
}

// 5. Fibbage
function registerFibbage(bot) {
  bot.command(['fibbage', 'soxtajavob', 'fib'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Guruhda o\'ynang!');
    const chatId = ctx.chat.id;
    const fibList = questionsData.fibbage;
    const item = fibList[Math.floor(Math.random() * fibList.length)];
    const botInfo = await bot.telegram.getMe();

    DB.setGame(chatId, {
      gameType: 'fibbage',
      chatId,
      question: item.question,
      realAnswer: item.realAnswer,
      state: 'COLLECTING_FAKES',
      fakeAnswers: {},
      shuffledOptions: [],
      votes: {}
    });

    const keyboard = {
      inline_keyboard: [
        [{ text: '📥 DM da soxta javob yuborish', url: `https://t.me/${botInfo.username}?start=fibbage_${chatId}` }],
        [{ text: '🗳 Ovoz berishni boshlash', callback_data: `fib_start_vote_${chatId}` }]
      ]
    };
    await ctx.reply(`🎣 **Soxta javob (Fibbage)**\n❓ Savol: ${item.question}\n\nDM formati: \`/fib [Soxta javob]\``, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.command('fib', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const targetChatId = ctx.session?.fibbageChatId;
    if (!targetChatId) return ctx.reply('⚠️ O\'yin topilmadi.');

    const game = DB.getGame(targetChatId);
    if (!game || game.gameType !== 'fibbage') return ctx.reply('⚠️ Yopilgan.');

    const fakeText = ctx.message.text.replace('/fib', '').trim();
    if (!fakeText) return ctx.reply('⚠️ Soxta javob yozing!');

    game.fakeAnswers[ctx.from.id] = { user: ctx.from, text: fakeText };
    delete ctx.session.fibbageChatId;
    return ctx.reply(`✅ Soxta javobingiz qabul qilindi!`);
  });

  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text || '';
    if (ctx.chat.type === 'private' && text.startsWith('/start fibbage_')) {
      const targetChatId = text.replace('/start fibbage_', '').trim();
      ctx.session = ctx.session || {};
      ctx.session.fibbageChatId = targetChatId;
      return ctx.reply('Soxta javobingizni yuboring: `/fib Javobingiz`', { parse_mode: 'Markdown' });
    }
    return next();
  });

  bot.action(/^fib_start_vote_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'fibbage') return ctx.answerCbQuery('⚠️ Topilmadi.');

    const options = [{ text: game.realAnswer, isReal: true, author: null }];
    for (const userId in game.fakeAnswers) {
      options.push({ text: game.fakeAnswers[userId].text, isReal: false, author: game.fakeAnswers[userId].user });
    }
    options.sort(() => Math.random() - 0.5);

    game.shuffledOptions = options;
    game.state = 'VOTING';

    const buttons = options.map((opt, idx) => [{ text: `${String.fromCharCode(65 + idx)}) ${opt.text}`, callback_data: `fib_vote_${chatId}_${idx}` }]);
    buttons.push([{ text: '🏁 Natijalar', callback_data: `fib_finish_${chatId}` }]);

    await ctx.answerCbQuery();
    await ctx.editMessageText(`🎣 **Fibbage — Ovoz Berish!**\n❓ Savol: ${game.question}`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^fib_vote_(-?\d+)_(\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const optIdx = parseInt(ctx.match[2], 10);
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'fibbage') return ctx.answerCbQuery('⚠️ Tugagan.');

    const chosen = game.shuffledOptions[optIdx];
    if (chosen.author && chosen.author.id === ctx.from.id) return ctx.answerCbQuery('⚠️ O\'zingizga ovoz bera olmaysiz!', { show_alert: true });

    game.votes[ctx.from.id] = { voter: ctx.from, choiceIdx: optIdx };
    await ctx.answerCbQuery(`✅ Ovoz berdingiz!`);
  });

  bot.action(/^fib_finish_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'fibbage') return ctx.answerCbQuery('⚠️ Tugagan.');

    let text = `🎣 **Fibbage Natijalari!**\n✅ Haqiqiy javob: \`${game.realAnswer}\`\n`;
    DB.clearGame(chatId);
    await ctx.answerCbQuery();
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });
}

// 6. Story Chain
function registerStoryChain(bot) {
  bot.command(['story', 'hikoya'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Guruhda o\'ynang!');
    const chatId = ctx.chat.id;
    DB.setGame(chatId, { gameType: 'storyChain', chatId, sentences: [], contributors: new Set() });
    await ctx.reply(`📖 **Hikoya zanjiri boshlandi!** Chatga gap yozing.\nTugatish: /endstory`, { parse_mode: 'Markdown' });
  });

  bot.command(['endstory', 'tamom'], async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'storyChain') return ctx.reply('⚠️ Faol hikoya yo\'q.');

    let fullStory = `📖 **Guruh Hikoyasi:**\n\n`;
    game.sentences.forEach((s, idx) => {
      fullStory += `${idx + 1}. ${s.text} _(${s.user.first_name})_\n`;
    });
    DB.clearGame(chatId);
    await ctx.reply(fullStory, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.chat.type === 'private') return next();
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (game && game.gameType === 'storyChain') {
      const text = ctx.message.text.trim();
      if (!text.startsWith('/')) {
        game.sentences.push({ user: ctx.from, text });
        await ctx.reply(`✍️ **${ctx.from.first_name}** gap qo'shdi! (${game.sentences.length}-gap)`);
      }
    }
    return next();
  });
}

// 7. Wordle
function registerWordle(bot) {
  bot.command(['wordle', 'soztop'], async (ctx) => {
    const chatId = ctx.chat.id;
    const words = questionsData.wordle;
    const targetWord = words[Math.floor(Math.random() * words.length)].toUpperCase();

    DB.setGame(chatId, { gameType: 'wordle', chatId, targetWord, attempts: [], maxAttempts: 6, isFinished: false });
    await ctx.reply(`🔤 **Uzbek Wordle**\n\n${targetWord.length} ta harfli so'zni toping! (6 imkoniyat)\n🟩 To'g'ri | 🟨 Boshqa joyda | ⬛ Yo'q`, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'wordle' || game.isFinished) return next();

    const text = ctx.message.text.trim().toUpperCase();
    if (text.startsWith('/')) return next();
    if (text.length !== game.targetWord.length) return ctx.reply(`⚠️ Aynan ${game.targetWord.length} ta harf yozing!`);

    const targetArr = game.targetWord.split('');
    const guessArr = text.split('');
    const feedback = new Array(game.targetWord.length).fill('⬛');
    const used = new Array(game.targetWord.length).fill(false);

    for (let i = 0; i < game.targetWord.length; i++) {
      if (guessArr[i] === targetArr[i]) {
        feedback[i] = '🟩';
        used[i] = true;
      }
    }
    for (let i = 0; i < game.targetWord.length; i++) {
      if (feedback[i] !== '🟩') {
        const found = targetArr.findIndex((char, idx) => char === guessArr[i] && !used[idx]);
        if (found !== -1) {
          feedback[i] = '🟨';
          used[found] = true;
        }
      }
    }

    game.attempts.push(`${guessArr.join(' ')}\n${feedback.join(' ')}`);

    if (text === game.targetWord) {
      game.isFinished = true;
      DB.addPoints(ctx.from, 20);
      DB.clearGame(chatId);
      return ctx.reply(`🎉 **TO'G'RI JAVOB: ${game.targetWord}!** (+20 ball)`, { parse_mode: 'Markdown' });
    }

    if (game.attempts.length >= game.maxAttempts) {
      game.isFinished = true;
      DB.clearGame(chatId);
      return ctx.reply(`💀 **Tugadi!** So'z: **${game.targetWord}** edi.`, { parse_mode: 'Markdown' });
    }

    await ctx.reply(`🔤 **Wordle (${game.attempts.length}/${game.maxAttempts}):**\n\n${game.attempts.join('\n\n')}`, { parse_mode: 'Markdown' });
  });
}

// 8. Minesweeper
function registerMinesweeper(bot) {
  bot.command(['mines', 'minamaydoni'], async (ctx) => {
    const chatId = ctx.chat.id;
    const gridRows = 4, gridCols = 4;
    const totalMines = DB.getSetting('minesCount');
    const mineIndices = new Set();
    while (mineIndices.size < totalMines) mineIndices.add(Math.floor(Math.random() * 16));

    const grid = [];
    for (let r = 0; r < gridRows; r++) {
      const row = [];
      for (let c = 0; c < gridCols; c++) {
        row.push({ isMine: mineIndices.has(r * 4 + c), revealed: false });
      }
      grid.push(row);
    }

    const totalSafe = 16 - totalMines;
    DB.setGame(chatId, { gameType: 'minesweeper', chatId, grid, score: 0, safeRevealed: 0, totalSafe, isFinished: false, player: ctx.from });
    const keyboard = buildMinesKeyboard(chatId, grid, false);
    await ctx.reply(`💣 **Mina Maydoni (16 katak, ${totalMines} mina)**\n\nKatakni tanlang:`, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.action(/^mines_click_(-?\d+)_(\d+)_(\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const r = parseInt(ctx.match[2], 10), c = parseInt(ctx.match[3], 10);
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'minesweeper' || game.isFinished) return ctx.answerCbQuery('⚠️ Tugagan.');
    if (ctx.from.id !== game.player.id) return ctx.answerCbQuery('⚠️ Sizning o\'yiningiz emas!', { show_alert: true });

    const cell = game.grid[r][c];
    if (cell.revealed) return ctx.answerCbQuery('⚠️ Ochilgan katak!');
    cell.revealed = true;

    if (cell.isMine) {
      game.isFinished = true;
      DB.clearGame(chatId);
      await ctx.answerCbQuery('💥 BUMM!', { show_alert: true });
      return ctx.editMessageText(`💥 **PORTLASH! Minaga tushdingiz!** 💣`, { parse_mode: 'Markdown', reply_markup: buildMinesKeyboard(chatId, game.grid, true) });
    }

    const revealPoints = DB.getSetting('minesRevealPoints');
    game.safeRevealed++;
    game.score += revealPoints;

    if (game.safeRevealed === game.totalSafe) {
      const winBonus = DB.getSetting('minesWinBonus');
      game.isFinished = true;
      DB.addPoints(game.player, game.score + winBonus);
      DB.clearGame(chatId);
      return ctx.editMessageText(`🏆 **G'OLIBIYAT! Barcha kataklar ochildi!** (+${game.score + winBonus} ball)`, { parse_mode: 'Markdown', reply_markup: buildMinesKeyboard(chatId, game.grid, true) });
    }

    await ctx.answerCbQuery(`💎 +${revealPoints} ball!`);
    return ctx.editMessageText(`💣 **Mina Maydoni**\n💎 Ochildi: ${game.safeRevealed}/${game.totalSafe}\n💰 Ball: +${game.score}`, { parse_mode: 'Markdown', reply_markup: buildMinesKeyboard(chatId, game.grid, false) });
  });

  bot.action(/^mines_cashout_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'minesweeper' || game.isFinished) return ctx.answerCbQuery('⚠️ Tugagan.');
    game.isFinished = true;
    DB.addPoints(game.player, game.score);
    DB.clearGame(chatId);
    await ctx.answerCbQuery(`💰 +${game.score} ball!`);
    return ctx.editMessageText(`💰 **OCHKO SAQLANDI!** +${game.score} ball`, { parse_mode: 'Markdown' });
  });
}

function buildMinesKeyboard(chatId, grid, revealAll = false) {
  const inline_keyboard = [];
  for (let r = 0; r < grid.length; r++) {
    const rowBtns = [];
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      const btnText = revealAll ? (cell.isMine ? '💣' : '💎') : (cell.revealed ? '💎' : '❓');
      rowBtns.push({ text: btnText, callback_data: `mines_click_${chatId}_${r}_${c}` });
    }
    inline_keyboard.push(rowBtns);
  }
  if (!revealAll) inline_keyboard.push([{ text: '💰 Ochkolarni olish', callback_data: `mines_cashout_${chatId}` }]);
  return { inline_keyboard };
}

// 9. Number Guess
function registerNumberGuess(bot) {
  bot.command(['sontop', 'number'], async (ctx) => {
    const chatId = ctx.chat.id;
    const secret = Math.floor(Math.random() * 100) + 1;
    DB.setGame(chatId, { gameType: 'numberGuess', chatId, secret, attempts: 0, isFinished: false });
    await ctx.reply(`🔢 **Son Topish (1 - 100)**\n\nTaxminingizni yozing:`, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'numberGuess' || game.isFinished) return next();
    if (!/^\d+$/.test(ctx.message.text.trim())) return next();

    const guess = parseInt(ctx.message.text.trim(), 10);
    game.attempts++;

    if (guess === game.secret) {
      game.isFinished = true;
      const pts = Math.max(5, 25 - game.attempts * 2);
      DB.addPoints(ctx.from, pts);
      DB.clearGame(chatId);
      return ctx.reply(`🎉 **TO'G'RI! Son: ${game.secret}**\n📊 Urinishlar: ${game.attempts}\n🏆 +${pts} ball!`, { parse_mode: 'Markdown' });
    }

    const hint = guess < game.secret ? '📈 **KATTAROQ!**' : '📉 **KICHIKROQ!**';
    await ctx.reply(`🔢 **Son Topish (${game.attempts}-urinish):**\n${hint}`, { parse_mode: 'Markdown' });
  });
}

// 10. Tic-Tac-Toe (X-O)
function registerTicTacToe(bot) {
  bot.command(['xo', 'tictactoe'], async (ctx) => {
    const chatId = ctx.chat.id;
    DB.setGame(chatId, {
      gameType: 'ticTacToe',
      chatId,
      state: 'WAITING_FOR_PLAYER',
      playerX: ctx.from,
      playerO: null,
      currentTurn: 'X',
      board: [['','',''],['','',''],['','','']],
      isFinished: false
    });

    const keyboard = { inline_keyboard: [[{ text: '⚔️ Duelni qabul qilish! (⭕)', callback_data: `xo_join_${chatId}` }]] };
    await ctx.reply(`❌⭕ **X-O Dueli**\n👤 Da'vogar: **${ctx.from.first_name}** (❌)`, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.action(/^xo_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'ticTacToe' || game.state !== 'WAITING_FOR_PLAYER') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (ctx.from.id === game.playerX.id) return ctx.answerCbQuery('⚠️ O\'zingiz bilan o\'ynay olmaysiz!', { show_alert: true });

    game.playerO = ctx.from;
    game.state = 'PLAYING';
    await ctx.answerCbQuery('Duel boshlandi!');
    await ctx.editMessageText(`❌⭕ **X-O Dueli Ketmoqda!**\n❌ **${game.playerX.first_name}** vs ⭕ **${game.playerO.first_name}**\n\nNavbat: **${game.playerX.first_name}** (❌)`, { parse_mode: 'Markdown', reply_markup: buildXOBoard(chatId, game.board) });
  });

  bot.action(/^xo_move_(-?\d+)_(\d+)_(\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const r = parseInt(ctx.match[2], 10), c = parseInt(ctx.match[3], 10);
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'ticTacToe' || game.state !== 'PLAYING' || game.isFinished) return ctx.answerCbQuery('⚠️ Tugagan.');

    const turnUser = game.currentTurn === 'X' ? game.playerX : game.playerO;
    if (ctx.from.id !== turnUser.id) return ctx.answerCbQuery(`⚠️ Navbatingiz emas!`, { show_alert: true });
    if (game.board[r][c] !== '') return ctx.answerCbQuery('⚠️ Katak band!');

    game.board[r][c] = game.currentTurn;
    const win = checkWinXO(game.board);

    if (win) {
      game.isFinished = true;
      const winnerUser = win === 'X' ? game.playerX : game.playerO;
      DB.addPoints(winnerUser, 15);
      DB.clearGame(chatId);
      await ctx.answerCbQuery();
      return ctx.editMessageText(`🎉 **G'OLIB: ${winnerUser.first_name}!** (+15 ball)`, { parse_mode: 'Markdown', reply_markup: buildXOBoard(chatId, game.board, true) });
    }

    if (game.board.every(row => row.every(cell => cell !== ''))) {
      game.isFinished = true;
      DB.clearGame(chatId);
      await ctx.answerCbQuery();
      return ctx.editMessageText(`🤝 **DURANG!**`, { parse_mode: 'Markdown', reply_markup: buildXOBoard(chatId, game.board, true) });
    }

    game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
    const nextUser = game.currentTurn === 'X' ? game.playerX : game.playerO;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`❌⭕ **X-O Dueli**\nNavbat: **${nextUser.first_name}** (${game.currentTurn === 'X' ? '❌' : '⭕'})`, { parse_mode: 'Markdown', reply_markup: buildXOBoard(chatId, game.board) });
  });
}

function buildXOBoard(chatId, board, finished = false) {
  const inline_keyboard = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      const sym = board[r][c] === 'X' ? '❌' : board[r][c] === 'O' ? '⭕' : ' ';
      row.push({ text: sym, callback_data: finished ? 'xo_noop' : `xo_move_${chatId}_${r}_${c}` });
    }
    inline_keyboard.push(row);
  }
  return { inline_keyboard };
}

function checkWinXO(b) {
  for (let i = 0; i < 3; i++) {
    if (b[i][0] && b[i][0] === b[i][1] && b[i][1] === b[i][2]) return b[i][0];
    if (b[0][i] && b[0][i] === b[1][i] && b[1][i] === b[2][i]) return b[0][i];
  }
  if (b[0][0] && b[0][0] === b[1][1] && b[1][1] === b[2][2]) return b[0][0];
  if (b[0][2] && b[0][2] === b[1][1] && b[1][1] === b[2][0]) return b[0][2];
  return null;
}

// 11. Rock Paper Scissors
function registerRpsDuel(bot) {
  bot.command(['rps', 'toshqaychi'], async (ctx) => {
    const chatId = ctx.chat.id;
    DB.setGame(chatId, { gameType: 'rpsDuel', chatId, state: 'WAITING_FOR_PLAYER', player1: ctx.from, player2: null, choices: {} });
    await ctx.reply(`✂️🪨📄 **Tosh-Qaychi-Qog'oz Dueli**\nDa'vogar: **${ctx.from.first_name}**`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⚔️ Duelni qabul qilish!', callback_data: `rps_join_${chatId}` }]] }
    });
  });

  bot.action(/^rps_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'rpsDuel' || game.state !== 'WAITING_FOR_PLAYER') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (ctx.from.id === game.player1.id) return ctx.answerCbQuery('⚠️ O\'zingiz bilan duel qila olmaysiz!', { show_alert: true });

    game.player2 = ctx.from;
    game.state = 'CHOOSING';
    await ctx.answerCbQuery('Boshlandi!');
    await ctx.editMessageText(`✂️🪨📄 **Tosh-Qaychi-Qog'oz!**\nTanlang:`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🪨 Tosh', callback_data: `rps_choice_${chatId}_rock` },
          { text: '✂️ Qaychi', callback_data: `rps_choice_${chatId}_scissors` },
          { text: '📄 Qog\'oz', callback_data: `rps_choice_${chatId}_paper` }
        ]]
      }
    });
  });

  bot.action(/^rps_choice_(-?\d+)_(rock|paper|scissors)$/, async (ctx) => {
    const chatId = ctx.match[1], choice = ctx.match[2];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'rpsDuel' || game.state !== 'CHOOSING') return ctx.answerCbQuery('⚠️ Tugagan.');

    if (ctx.from.id !== game.player1.id && ctx.from.id !== game.player2.id) return ctx.answerCbQuery('⚠️ Siz qatnashchi emassiz!', { show_alert: true });
    if (game.choices[ctx.from.id]) return ctx.answerCbQuery('⚠️ Tanlab bo\'lgansiz!', { show_alert: true });

    game.choices[ctx.from.id] = choice;
    await ctx.answerCbQuery(`✅ Tanlandi!`);

    if (game.choices[game.player1.id] && game.choices[game.player2.id]) {
      const c1 = game.choices[game.player1.id], c2 = game.choices[game.player2.id];
      let msg = `✂️🪨📄 **Natija:**\n${game.player1.first_name}: ${c1}\n${game.player2.first_name}: ${c2}\n\n`;

      if (c1 === c2) msg += `🤝 **DURANG!**`;
      else if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'scissors' && c2 === 'paper') || (c1 === 'paper' && c2 === 'rock')) {
        DB.addPoints(game.player1, 10);
        msg += `🎉 **G'OLIB: ${game.player1.first_name}!** (+10 ball)`;
      } else {
        DB.addPoints(game.player2, 10);
        msg += `🎉 **G'OLIB: ${game.player2.first_name}!** (+10 ball)`;
      }
      DB.clearGame(chatId);
      await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
    }
  });
}

// 12. Spyfall (Josus)
function registerSpyfall(bot) {
  bot.command(['spy', 'josus'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Guruhda 3+ kishi bilan o\'ynang!');
    const chatId = ctx.chat.id;
    DB.setGame(chatId, { gameType: 'spyfall', chatId, state: 'LOBBY', players: [ctx.from], location: null, spyId: null });

    const keyboard = {
      inline_keyboard: [
        [{ text: '➕ Qo\'shilish', callback_data: `spy_join_${chatId}` }],
        [{ text: '▶️ Boshlash', callback_data: `spy_start_${chatId}` }]
      ]
    };
    await ctx.reply(`🕵️‍♂️ **Josus (Spyfall)**\n\nQatnashchilar: 1. ${ctx.from.first_name}`, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.action(/^spy_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'spyfall' || game.state !== 'LOBBY') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (game.players.some(p => p.id === ctx.from.id)) return ctx.answerCbQuery('⚠️ Qo\'shilgansiz!', { show_alert: true });

    game.players.push(ctx.from);
    await ctx.answerCbQuery('✅ Qo\'shildingiz!');
    const plist = game.players.map((p, i) => `${i + 1}. ${p.first_name}`).join('\n');
    await ctx.editMessageText(`🕵️‍♂️ **Josus (Spyfall)**\n\nQatnashchilar (${game.players.length}):\n${plist}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Qo\'shilish', callback_data: `spy_join_${chatId}` }],
          [{ text: '▶️ Boshlash', callback_data: `spy_start_${chatId}` }]
        ]
      }
    });
  });

  bot.action(/^spy_start_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'spyfall' || game.state !== 'LOBBY') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (game.players.length < 3) return ctx.answerCbQuery('⚠️ Kamida 3 kishi kerak!', { show_alert: true });

    const locs = questionsData.spyfallLocations;
    const chosenLoc = locs[Math.floor(Math.random() * locs.length)];
    const spyIdx = Math.floor(Math.random() * game.players.length);
    const spyUser = game.players[spyIdx];

    game.location = chosenLoc;
    game.spyId = spyUser.id;
    game.state = 'PLAYING';
    await ctx.answerCbQuery('O\'yin boshlandi!');

    for (const p of game.players) {
      try {
        if (p.id === spyUser.id) {
          await bot.telegram.sendMessage(p.id, `🕵️‍♂️ **Siz JOSUSSIZ!** Joyni bilmaysiz, toping!`, { parse_mode: 'Markdown' });
        } else {
          await bot.telegram.sendMessage(p.id, `📍 **Yashirin joy:** **${chosenLoc}**`, { parse_mode: 'Markdown' });
        }
      } catch (e) {}
    }
    await ctx.editMessageText(`🕵️‍♂️ **JOSUS O'YINI BOSHLANDI!**\nDM larni tekshiring.\nTugatish: /endspy`, { parse_mode: 'Markdown' });
  });

  bot.command(['endspy'], async (ctx) => {
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'spyfall' || game.state !== 'PLAYING') return ctx.reply('⚠️ Faol o\'yin yo\'q.');

    const spyUser = game.players.find(p => p.id === game.spyId);
    DB.clearGame(chatId);
    await ctx.reply(`🕵️‍♂️ **JOSUS FOSH QILINDI!**\n📍 Joy: **${game.location}**\n🕵️‍♂️ Josus: **${spyUser ? spyUser.first_name : 'Noma\'lum'}**`, { parse_mode: 'Markdown' });
  });
}

// 13. Crocodile
function registerCrocodile(bot) {
  bot.command(['croc', 'timsah'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Guruhda o\'ynang!');
    const chatId = ctx.chat.id;
    const items = questionsData.crocodile;
    const secretItem = items[Math.floor(Math.random() * items.length)];

    DB.setGame(chatId, { gameType: 'crocodile', chatId, word: secretItem, actor: null, state: 'WAITING_FOR_ACTOR' });
    await ctx.reply(`🐊 **Timsah (Crocodile)**\n\n👇 Timsah bo'lish uchun bosing:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🐊 Men Timsah bo\'laman!', callback_data: `croc_claim_${chatId}` }]] }
    });
  });

  bot.action(/^croc_claim_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'crocodile' || game.state !== 'WAITING_FOR_ACTOR') return ctx.answerCbQuery('⚠️ Topilmadi.');

    game.actor = ctx.from;
    game.state = 'PLAYING';

    try {
      await bot.telegram.sendMessage(ctx.from.id, `🤫 **Yashirin ibora:** \`${game.word}\` (Faqat emojilar bilan ta'riflang!)`, { parse_mode: 'Markdown' });
    } catch (e) {
      return ctx.answerCbQuery('⚠️ DM ga yozib bo\'lmadi! Avval botga /start bosing.', { show_alert: true });
    }

    await ctx.answerCbQuery('Ibora DM ga yuborildi!');
    await ctx.editMessageText(`🐊 **Timsah — O'yin Ketmoqda!**\n🗣 Aktyor: **${ctx.from.first_name}**`, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.chat.type === 'private') return next();
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (game && game.gameType === 'crocodile' && game.state === 'PLAYING') {
      const userText = ctx.message.text.trim().toLowerCase();
      const targetWord = game.word.toLowerCase();
      if (game.actor && game.actor.id === ctx.from.id) return next();

      if (userText === targetWord || (targetWord.includes(userText) && userText.length > 3)) {
        DB.addPoints(ctx.from, 10);
        if (game.actor) DB.addPoints(game.actor, 5);
        DB.clearGame(chatId);
        await ctx.reply(`🎉 **TO'G'RI! Ibora: ${game.word}**\nTopdi: **${ctx.from.first_name}** (+10 ball)`, { parse_mode: 'Markdown' });
      }
    }
    return next();
  });
}

// 14. Speed Math Challenge (Solo)
function registerMath(bot) {
  bot.command(['math', 'matematika'], async (ctx) => {
    const chatId = ctx.chat.id;
    const num1 = Math.floor(Math.random() * 40) + 10;
    const num2 = Math.floor(Math.random() * 30) + 5;
    const op = Math.random() > 0.5 ? '+' : '*';
    const answer = op === '+' ? num1 + num2 : num1 * num2;

    const fake1 = answer + Math.floor(Math.random() * 5) + 1;
    const fake2 = answer - Math.floor(Math.random() * 5) - 1;
    const fake3 = answer + 10;

    const options = [answer, fake1, fake2, fake3].sort(() => Math.random() - 0.5);
    const buttons = options.map(opt => [{ text: `${opt}`, callback_data: `math_ans_${chatId}_${opt === answer}` }]);

    DB.setGame(chatId, { gameType: 'math', chatId, answer, isFinished: false });
    await ctx.reply(`🧠 **Tezkor Matematika**\n\n❓ **${num1} ${op} ${num2} = ?**`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  });

  bot.action(/^math_ans_(-?\d+)_(true|false)$/, async (ctx) => {
    const isCorrect = ctx.match[2] === 'true';
    if (isCorrect) {
      DB.addPoints(ctx.from, 10);
      await ctx.answerCbQuery('🎉 To\'g\'ri javob! +10 ball');
      await ctx.editMessageText(`🎉 **BARAKALLA! TO'G'RI JAVOB!** (+10 ball)`, { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCbQuery('❌ Noto\'g\'ri javob!');
      await ctx.editMessageText(`❌ **NOTO'G'RI JAVOB!** Yana bir bor urinib ko'ring: /math`, { parse_mode: 'Markdown' });
    }
  });
}

// 15. Flag Quiz (Solo)
function registerFlagQuiz(bot) {
  bot.command(['flag', 'bayroq'], async (ctx) => {
    const chatId = ctx.chat.id;
    const flags = questionsData.flags || [];
    const item = flags[Math.floor(Math.random() * flags.length)];

    const buttons = item.options.map((opt, idx) => [{
      text: opt,
      callback_data: `flag_ans_${chatId}_${idx === item.answer}`
    }]);

    await ctx.reply(`🏎️ **Bayroqni Top**\n\nUshbu bayroq qaysi davlatniki?\n\n#️⃣ ${item.flag}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  });

  bot.action(/^flag_ans_(-?\d+)_(true|false)$/, async (ctx) => {
    const isCorrect = ctx.match[2] === 'true';
    if (isCorrect) {
      const flagPoints = DB.getSetting('flagPoints');
      DB.addPoints(ctx.from, flagPoints);
      await ctx.answerCbQuery(`🎉 To'g'ri javob! +${flagPoints} ball`);
      await ctx.editMessageText(`🎉 **TO'G'RI! Qoyil-maqom bilimdon!** (+${flagPoints} ball)`, { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCbQuery('❌ Noto\'g\'ri javob!');
      await ctx.editMessageText(`❌ **NOTO'G'RI JAVOB!** Qayta o'ynash uchun /flag yuboring.`, { parse_mode: 'Markdown' });
    }
  });
}

// 16. Anagram (Solo)
function registerAnagram(bot) {
  bot.command(['anagram', 'harfshahmat'], async (ctx) => {
    const chatId = ctx.chat.id;
    const anagrams = questionsData.anagrams || [];
    const item = anagrams[Math.floor(Math.random() * anagrams.length)];

    DB.setGame(chatId, { gameType: 'anagram', chatId, targetWord: item.word, isFinished: false });
    await ctx.reply(`🧩 **Harf Shahmat (Anagramma)**\n\nQuyidagi harflardan to'g'ri so'z tuzing:\n\n👉 \`${item.scrambled}\`\n\n✍️ Javobingizni chatga yozing!`, { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'anagram' || game.isFinished) return next();

    const text = ctx.message.text.trim().toUpperCase();
    if (text === game.targetWord) {
      const anagramPoints = DB.getSetting('anagramPoints');
      game.isFinished = true;
      DB.addPoints(ctx.from, anagramPoints);
      DB.clearGame(chatId);
      return ctx.reply(`🎉 **TO'G'RI! Yashirin so'z: ${game.targetWord}!** (+${anagramPoints} ball)`, { parse_mode: 'Markdown' });
    }
    return next();
  });
}

// 17. Speed Clicker (Solo)
function registerSpeedClick(bot) {
  bot.command(['click', 'chaqqonlik'], async (ctx) => {
    const chatId = ctx.chat.id;
    const msg = await ctx.reply(`🔴 **Tayyorlaning... Hozir belgi beriladi!**\nTugma paydo bo'lishi bilan TEZDA BOSING!`, { parse_mode: 'Markdown' });

    const delay = Math.floor(Math.random() * 3000) + 2000;
    setTimeout(async () => {
      const startTime = Date.now();
      try {
        await bot.telegram.editMessageText(chatId, msg.message_id, null, `🟢 **HOZIR BOSING! TEZROQ!**`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '⚡ BOSING! ⚡', callback_data: `click_press_${chatId}_${startTime}` }]] }
        });
      } catch (e) {}
    }, delay);
  });

  bot.action(/^click_press_(-?\d+)_(\d+)$/, async (ctx) => {
    const startTime = parseInt(ctx.match[2], 10);
    const reactionTime = Date.now() - startTime;
    let points = reactionTime < 300 ? 20 : reactionTime < 500 ? 15 : 10;

    DB.addPoints(ctx.from, points);
    await ctx.answerCbQuery(`⚡ Tezlik: ${reactionTime}ms! (+${points} ball)`);
    await ctx.editMessageText(`⚡ **DAHSHAT REAKSIYA!**\n\n⏱ Tezlik: **${reactionTime} ms**\n🏆 Qozonilgan ball: **+${points} ball**`, { parse_mode: 'Markdown' });
  });
}

// 18. Dice Battle (2-Player Duel)
function registerDiceBattle(bot) {
  bot.command(['dice', 'zar'], async (ctx) => {
    const chatId = ctx.chat.id;
    DB.setGame(chatId, { gameType: 'diceBattle', chatId, state: 'WAITING', player1: ctx.from, player2: null });

    await ctx.reply(`🎲 **Zar Tashlash Dueli (1v1)**\n👤 Da'vogar: **${ctx.from.first_name}**`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⚔️ Duelni qabul qilish!', callback_data: `dice_join_${chatId}` }]] }
    });
  });

  bot.action(/^dice_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'diceBattle' || game.state !== 'WAITING') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (ctx.from.id === game.player1.id) return ctx.answerCbQuery('⚠️ O\'zingiz bilan duel qilmaysiz!', { show_alert: true });

    game.player2 = ctx.from;
    game.state = 'PLAYING';

    await ctx.answerCbQuery('🎲 Zarlar tashlanmoqda!');
    await ctx.reply(`🎲 **${game.player1.first_name}** zarni tashlamoqda...`);
    const d1 = await bot.telegram.sendDice(chatId);
    
    await ctx.reply(`🎲 **${game.player2.first_name}** zarni tashlamoqda...`);
    const d2 = await bot.telegram.sendDice(chatId);

    setTimeout(async () => {
      const v1 = d1.dice.value;
      const v2 = d2.dice.value;
      let res = `🎲 **Natijalar:**\n👤 ${game.player1.first_name}: **${v1}**\n👤 ${game.player2.first_name}: **${v2}**\n\n`;

      if (v1 > v2) {
        DB.addPoints(game.player1, 15);
        res += `🎉 **G'OLIB: ${game.player1.first_name}!** (+15 ball)`;
      } else if (v2 > v1) {
        DB.addPoints(game.player2, 15);
        res += `🎉 **G'OLIB: ${game.player2.first_name}!** (+15 ball)`;
      } else {
        res += `🤝 **DURANG!** Ikkala zarda ham bir xil achko!`;
      }
      DB.clearGame(chatId);
      await bot.telegram.sendMessage(chatId, res, { parse_mode: 'Markdown' });
    }, 4000);
  });
}

// 19. Darts Battle (2-Player Duel)
function registerDartsBattle(bot) {
  bot.command(['darts', 'nishon'], async (ctx) => {
    const chatId = ctx.chat.id;
    DB.setGame(chatId, { gameType: 'dartsBattle', chatId, state: 'WAITING', player1: ctx.from, player2: null });

    await ctx.reply(`🎯 **Nishon Urish Dueli (Darts 1v1)**\n👤 Da'vogar: **${ctx.from.first_name}**`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⚔️ Duelni qabul qilish!', callback_data: `darts_join_${chatId}` }]] }
    });
  });

  bot.action(/^darts_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'dartsBattle' || game.state !== 'WAITING') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (ctx.from.id === game.player1.id) return ctx.answerCbQuery('⚠️ O\'zingiz bilan o\'ynay olmaysiz!', { show_alert: true });

    game.player2 = ctx.from;
    game.state = 'PLAYING';

    await ctx.answerCbQuery('🎯 Nishonga otilmoqda!');
    await ctx.reply(`🎯 **${game.player1.first_name}** nishonga otmoqda...`);
    const d1 = await bot.telegram.sendDice(chatId, { emoji: '🎯' });

    await ctx.reply(`🎯 **${game.player2.first_name}** nishonga otmoqda...`);
    const d2 = await bot.telegram.sendDice(chatId, { emoji: '🎯' });

    setTimeout(async () => {
      const v1 = d1.dice.value;
      const v2 = d2.dice.value;
      let res = `🎯 **Natijalar:**\n👤 ${game.player1.first_name}: **${v1} ball**\n👤 ${game.player2.first_name}: **${v2} ball**\n\n`;

      if (v1 > v2) {
        DB.addPoints(game.player1, 15);
        res += `🎉 **G'OLIB: ${game.player1.first_name}!** (+15 ball)`;
      } else if (v2 > v1) {
        DB.addPoints(game.player2, 15);
        res += `🎉 **G'OLIB: ${game.player2.first_name}!** (+15 ball)`;
      } else {
        res += `🤝 **DURANG!** Aniq zarba!`;
      }
      DB.clearGame(chatId);
      await bot.telegram.sendMessage(chatId, res, { parse_mode: 'Markdown' });
    }, 4000);
  });
}

// 20. Math Duel (2-Player Speed Race)
function registerMathDuel(bot) {
  bot.command(['mathduel', 'misolduel'], async (ctx) => {
    const chatId = ctx.chat.id;
    DB.setGame(chatId, { gameType: 'mathDuel', chatId, state: 'WAITING', player1: ctx.from, player2: null });

    await ctx.reply(`🧠 **Matematik Misol Dueli (1v1 Tezlik Poygasi)**\n👤 Da'vogar: **${ctx.from.first_name}**`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⚔️ Duelni qabul qilish!', callback_data: `mduel_join_${chatId}` }]] }
    });
  });

  bot.action(/^mduel_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'mathDuel' || game.state !== 'WAITING') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (ctx.from.id === game.player1.id) return ctx.answerCbQuery('⚠️ O\'zingiz bilan o\'ynay olmaysiz!', { show_alert: true });

    game.player2 = ctx.from;
    game.state = 'PLAYING';

    const a = Math.floor(Math.random() * 20) + 10;
    const b = Math.floor(Math.random() * 15) + 5;
    const ans = a * b;

    const fake1 = ans + 10;
    const fake2 = ans - 5;
    const opts = [ans, fake1, fake2].sort(() => Math.random() - 0.5);

    const buttons = opts.map(o => [{ text: `${o}`, callback_data: `mduel_ans_${chatId}_${o === ans}` }]);

    await ctx.answerCbQuery('Misol berildi!');
    await ctx.editMessageText(`🧠 **KIM BIRINCHI TOPADI?**\n\n❓ **${a} * ${b} = ?**\n\n👤 **${game.player1.first_name}** vs 👤 **${game.player2.first_name}**`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  });

  bot.action(/^mduel_ans_(-?\d+)_(true|false)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const isCorrect = ctx.match[2] === 'true';
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'mathDuel' || game.state !== 'PLAYING') return ctx.answerCbQuery('⚠️ Tugagan.');

    if (ctx.from.id !== game.player1.id && ctx.from.id !== game.player2.id) return ctx.answerCbQuery('⚠️ Siz duel qatnashchisi emassiz!', { show_alert: true });

    if (isCorrect) {
      DB.addPoints(ctx.from, 20);
      DB.clearGame(chatId);
      await ctx.answerCbQuery('🎉 Birinchi topdingiz!');
      await ctx.editMessageText(`🎉 **DUEL G'OLIBI: ${ctx.from.first_name}!** Misolni birinchi topdi (+20 ball)`, { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCbQuery('❌ Noto\'g\'ri javob!', { show_alert: true });
    }
  });
}

// 21. Hot Potato Bomb Game (3+ Party Game)
function registerBombGame(bot) {
  bot.command(['bomb', 'bomba'], async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('⚠️ Guruhda 3+ kishi bilan o\'ynang!');
    const chatId = ctx.chat.id;

    DB.setGame(chatId, { gameType: 'bomb', chatId, state: 'LOBBY', players: [ctx.from], currentHolderIdx: 0, timer: null });

    const keyboard = {
      inline_keyboard: [
        [{ text: '💣 Qo\'shilish', callback_data: `bomb_join_${chatId}` }],
        [{ text: '▶️ Bombani tayyorlash (Start)', callback_data: `bomb_start_${chatId}` }]
      ]
    };
    await ctx.reply(`💣 **Portlovchi Bomba (Hot Potato)**\n\nIshtirokchilar:\n1. ${ctx.from.first_name}`, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.action(/^bomb_join_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'bomb' || game.state !== 'LOBBY') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (game.players.some(p => p.id === ctx.from.id)) return ctx.answerCbQuery('⚠️ Qo\'shilgansiz!', { show_alert: true });

    game.players.push(ctx.from);
    await ctx.answerCbQuery('✅ Qo\'shildingiz!');
    const plist = game.players.map((p, i) => `${i + 1}. ${p.first_name}`).join('\n');
    await ctx.editMessageText(`💣 **Portlovchi Bomba**\n\nIshtirokchilar (${game.players.length}):\n${plist}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💣 Qo\'shilish', callback_data: `bomb_join_${chatId}` }],
          [{ text: '▶️ Bombani tayyorlash (Start)', callback_data: `bomb_start_${chatId}` }]
        ]
      }
    });
  });

  bot.action(/^bomb_start_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'bomb' || game.state !== 'LOBBY') return ctx.answerCbQuery('⚠️ Topilmadi.');
    if (game.players.length < 2) return ctx.answerCbQuery('⚠️ Kamida 2 ta o\'yinchi kerak!', { show_alert: true });

    game.state = 'PLAYING';
    game.currentHolderIdx = 0;
    const bombTime = Math.floor(Math.random() * 20000) + 15000;

    await ctx.answerCbQuery('💣 Bomba yoqildi!');

    const currentHolder = game.players[game.currentHolderIdx];
    await ctx.editMessageText(`💣 **BOMBA YOQILDI VA CHIRTILLAMOQDA!** 🧨\n\n🔥 Bomba hozir: **${currentHolder.first_name}** qo'lida!\n\nTezda tugmani bosib bombani boshqaga uzating!`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '💣 Bombani boshqaga uzatish!', callback_data: `bomb_pass_${chatId}` }]] }
    });

    game.timer = setTimeout(async () => {
      const active = DB.getGame(chatId);
      if (active && active.gameType === 'bomb' && active.state === 'PLAYING') {
        const loser = active.players[active.currentHolderIdx];
        DB.clearGame(chatId);
        await bot.telegram.sendMessage(chatId, `💥 **BUMMMM! BOMBA PORTLADI!** 💣💥\n\n💀 **${loser.first_name}** bombani o'z vaqtida uzata olmadi va mag'lub bo'ldi!`, { parse_mode: 'Markdown' });
      }
    }, bombTime);
  });

  bot.action(/^bomb_pass_(-?\d+)$/, async (ctx) => {
    const chatId = ctx.match[1];
    const game = DB.getGame(chatId);
    if (!game || game.gameType !== 'bomb' || game.state !== 'PLAYING') return ctx.answerCbQuery('⚠️ O\'yin yakunlangan.');

    const currentHolder = game.players[game.currentHolderIdx];
    if (ctx.from.id !== currentHolder.id) return ctx.answerCbQuery('⚠️ Bomba sizda emas! Hozir u ' + currentHolder.first_name + ' da!', { show_alert: true });

    game.currentHolderIdx = (game.currentHolderIdx + 1) % game.players.length;
    const nextHolder = game.players[game.currentHolderIdx];

    await ctx.answerCbQuery('🔥 Uzatildi!');
    await ctx.editMessageText(`💣 **BOMBA O'TDI!** 🧨\n\n🔥 Bomba hozir: **${nextHolder.first_name}** qo'lida!\n\nTezroq uzating!`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '💣 Bombani boshqaga uzatish!', callback_data: `bomb_pass_${chatId}` }]] }
    });
  });
}
