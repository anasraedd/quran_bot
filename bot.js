const { Telegraf, Markup } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const OWNER_ID = Number(process.env.OWNER_ID)

/* ================== التخزين ================== */
const sessions = {}
const achievements = {}
const waitingForNote = {}
let achievementId = 1

/* ================== السور ================== */
const surahs = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف",
  "الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر",
  "النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون",
  "النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص",
  "الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية",
  "الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور",
  "النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر",
  "الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق",
  "التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن",
  "المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ",
  "النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق",
  "البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس",
  "الليل","الضحى","الشرح","التين","العلق","القدر","البينة",
  "الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة",
  "الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
]

function surahKeyboard() {
  const rows = []
  for (let i = 0; i < surahs.length; i += 3) {
    rows.push(
      surahs.slice(i, i + 3).map(s =>
        Markup.button.callback(s, `surah_${s}`)
      )
    )
  }
  return Markup.inlineKeyboard(rows)
}

/* ================== start ================== */
bot.start(ctx => {
  ctx.reply(
    'مرحبًا بك 🌿',
    Markup.keyboard([['➕ إضافة إنجاز']]).resize()
  )
})

/* ================== إضافة إنجاز ================== */
bot.hears('➕ إضافة إنجاز', ctx => {
  sessions[ctx.from.id] = {
    step: 'type',
    data: {
      studentId: ctx.from.id,
      studentName: ctx.from.first_name
    }
  }

ctx.reply(
  'اختر نوع الإنجاز:',
  Markup.inlineKeyboard([
    [Markup.button.callback('📗 حفظ جديد', '📗 حفظ جديد')],
    [Markup.button.callback('🔁 مراجعة قريبة', '🔁 مراجعة قريبة')],
    [Markup.button.callback('🔂 مراجعة بعيدة', '🔂 مراجعة بعيدة')],
    [Markup.button.callback('👨‍🏫 تعليم', '👨‍🏫 تعليم')]
  ])
)

})

/* ================== callback ================== */
bot.on('callback_query', ctx => {
  const data = ctx.callbackQuery.data
  const session = sessions[ctx.from.id]
  if (!session) return

  // نوع الإنجاز
  if (['📗 حفظ جديد','🔁 مراجعة قريبة','🔂 مراجعة بعيدة','👨‍🏫 تعليم'].includes(data)) {
    session.data.type = data

    if (data === '👨‍🏫 تعليم') {
      session.step = 'teaching_details'
      return ctx.reply('✍️ اكتب تفاصيل التعليم:')
    }

    session.step = 'surah'
    return ctx.reply('📖 اختر السورة:', surahKeyboard())
  }

  // السورة
  if (data.startsWith('surah_')) {
    session.data.surah = data.replace('surah_', '')
    session.step = 'from'
    return ctx.reply('🔢 من آية رقم:')
  }
})

/* ================== text ================== */
bot.on('text', ctx => {
  const session = sessions[ctx.from.id]

  // ملاحظة المعلم
  if (waitingForNote[ctx.from.id]) {
    const id = waitingForNote[ctx.from.id]
    achievements[id].notes = ctx.message.text
    delete waitingForNote[ctx.from.id]
    return askSend(ctx, id)
  }

  if (!session) return

  switch (session.step) {
    case 'from':
      session.data.from = ctx.message.text
      session.step = 'to'
      return ctx.reply('🔢 إلى آية رقم:')

    case 'to':
      session.data.to = ctx.message.text
      saveAchievement(ctx, session.data)
      delete sessions[ctx.from.id]
      return ctx.reply('🌸 بوركت جهودك، انتظر تقييم المعلم')

    case 'teaching_details':
      session.data.details = ctx.message.text
      saveAchievement(ctx, session.data)
      delete sessions[ctx.from.id]
      return ctx.reply('🌸 بوركت جهودك، انتظر تقييم المعلم')
  }
})

/* ================== حفظ + إرسال للمعلم ================== */
function saveAchievement(ctx, data) {
  const id = achievementId++
  achievements[id] = { id, ...data }

  let message = `📥 *إنجاز جديد*\n👤 ${data.studentName}\n📌 ${data.type}\n`

  if (data.type === '👨‍🏫 تعليم') {
    message += `\n📝 *تفاصيل التعليم:*\n${data.details}`
  } else {
    message += `
📖 السورة: ${data.surah}
🔢 من: ${data.from}
🔢 إلى: ${data.to}`
  }

  bot.telegram.sendMessage(
    OWNER_ID,
    message,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⭐ قيّم الإنجاز', `rate_${id}`)]
      ])
    }
  )
}

/* ================== التقييم ================== */
bot.action(/rate_(\d+)/, async ctx => {
  await ctx.answerCbQuery() // 👈 مهم جدًا
  const id = ctx.match[1]

  await ctx.editMessageReplyMarkup(
    Markup.inlineKeyboard([
      [Markup.button.callback('⭐⭐⭐⭐⭐ ممتاز', `star_${id}_5`)],
      [Markup.button.callback('⭐⭐⭐⭐ جيد جدًا', `star_${id}_4`)],
      [Markup.button.callback('⭐⭐⭐ جيد', `star_${id}_3`)],
      [Markup.button.callback('⭐⭐ مقبول', `star_${id}_2`)],
      [Markup.button.callback('⭐ يحتاج تحسين', `star_${id}_1`)]
    ])
  )
})


bot.action(/star_(\d+)_(\d)/, ctx => {
  const [ , id, stars ] = ctx.match
  achievements[id].rating = Number(stars)

  ctx.reply(
    'هل لديك ملاحظات؟',
    Markup.inlineKeyboard([
      [Markup.button.callback('✍️ نعم', `note_yes_${id}`)],
      [Markup.button.callback('❌ لا يوجد', `note_no_${id}`)]
    ])
  )
})

bot.action(/note_yes_(\d+)/, ctx => {
  waitingForNote[ctx.from.id] = ctx.match[1]
  ctx.reply('✍️ اكتب الملاحظة:')
})

bot.action(/note_no_(\d+)/, ctx => {
  achievements[ctx.match[1]].notes = 'لا يوجد'
  askSend(ctx, ctx.match[1])
})

function askSend(ctx, id) {
  ctx.reply(
    '📤 إرسال التقييم للطالب؟',
    Markup.inlineKeyboard([
      [Markup.button.callback('إرسال للطالب', `send_${id}`)]
    ])
  )
}

/* ================== بطاقة الطالب ================== */
bot.action(/send_(\d+)/, ctx => {
  const a = achievements[ctx.match[1]]
  const stars = '⭐'.repeat(a.rating)

  let card = `🏅 *بطاقة إنجاز*\n\n👤 ${a.studentName}\n📌 ${a.type}\n`

  if (a.type === '👨‍🏫 تعليم') {
    card += `\n📝 *تفاصيل التعليم:*\n${a.details}`
  } else {
    card += `
📖 السورة: ${a.surah}
🔢 من: ${a.from}
🔢 إلى: ${a.to}`
  }

  card += `\n\n⭐ *التقييم:* ${stars}\n📝 *ملاحظات المعلم:*\n${a.notes}`

  bot.telegram.sendMessage(a.studentId, card, { parse_mode: 'Markdown' })
  ctx.reply('✅ تم الإرسال')
})

bot.launch()
console.log('Bot running...')



