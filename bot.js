const { Telegraf, Markup } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const OWNER_ID = Number(process.env.OWNER_ID)
const { Telegraf, Markup } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const OWNER_ID = Number(process.env.OWNER_ID)

/* ================== التخزين ================== */
const sessions = {}
const achievements = {}
const waitingForInput = {}
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

/* ================== أدوات ================== */
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
      studentName: null
    }
  }

  ctx.reply(
    'اختر نوع الإنجاز:',
    Markup.inlineKeyboard([
      [Markup.button.callback('📗 حفظ جديد', 'type_save')],
      [Markup.button.callback('🔁 مراجعة قريبة', 'type_near')],
      [Markup.button.callback('🔂 مراجعة بعيدة', 'type_far')],
      [Markup.button.callback('👨‍🏫 تعليم', 'type_teach')]
    ])
  )
})

/* ================== نوع الإنجاز ================== */
bot.action(/type_(.+)/, ctx => {
  const session = sessions[ctx.from.id]
  if (!session) return

  const map = {
    save: '📗 حفظ جديد',
    near: '🔁 مراجعة قريبة',
    far: '🔂 مراجعة بعيدة',
    teach: '👨‍🏫 تعليم'
  }

  session.data.type = map[ctx.match[1]]

  if (ctx.match[1] === 'teach') {
    session.step = 'teach_details'
    return ctx.reply('✍️ اكتب تفاصيل التعليم:')
  }

  session.step = 'surah'
  ctx.reply('📖 اختر السورة:', surahKeyboard())
})

/* ================== السورة ================== */
bot.action(/surah_(.+)/, ctx => {
  const session = sessions[ctx.from.id]
  if (!session) return

  session.data.surah = ctx.match[1]
  session.step = 'from'
  ctx.reply('🔢 من آية رقم:')
})

/* ================== النصوص ================== */
bot.on('text', ctx => {
  const uid = ctx.from.id

  /* إدخال اسم الطالب من المعلّم */
  if (waitingForInput[uid]?.startsWith('name_')) {
    const id = waitingForInput[uid].replace('name_', '')
    achievements[id].studentName = ctx.message.text
    waitingForInput[uid] = `note_${id}`

    return ctx.reply(
      'هل لديك ملاحظات؟',
      Markup.inlineKeyboard([
        [Markup.button.callback('✍️ نعم', `note_yes_${id}`)],
        [Markup.button.callback('❌ لا يوجد', `note_no_${id}`)]
      ])
    )
  }

  /* تفاصيل التعليم */
  const session = sessions[uid]
  if (!session) return

  if (session.step === 'teach_details') {
    session.data.details = ctx.message.text
    saveAchievement(session.data)
    delete sessions[uid]
    return ctx.reply('🌸 تم تسجيل الإنجاز، بانتظار تقييم المعلّم')
  }

  if (session.step === 'from') {
    session.data.from = ctx.message.text
    session.step = 'to'
    return ctx.reply('🔢 إلى آية رقم:')
  }

  if (session.step === 'to') {
    session.data.to = ctx.message.text
    saveAchievement(session.data)
    delete sessions[uid]
    return ctx.reply('🌸 تم تسجيل الإنجاز، بانتظار تقييم المعلّم')
  }
})

/* ================== حفظ وإرسال ================== */
function saveAchievement(data) {
  const id = achievementId++
  achievements[id] = { id, ...data }

  let msg = `📥 *إنجاز جديد*\n📌 ${data.type}\n`

  if (data.type === '👨‍🏫 تعليم') {
    msg += `\n📝 *تفاصيل التعليم:*\n${data.details}`
  } else {
    msg += `
📖 السورة: ${data.surah}
🔢 من: ${data.from}
🔢 إلى: ${data.to}`
  }

  bot.telegram.sendMessage(
    OWNER_ID,
    msg,
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
  await ctx.answerCbQuery()
  const id = ctx.match[1]

  ctx.editMessageReplyMarkup(
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
  const [, id, stars] = ctx.match
  achievements[id].rating = Number(stars)
  waitingForInput[ctx.from.id] = `name_${id}`
  ctx.reply('✍️ اكتب اسم الطالب:')
})

bot.action(/note_yes_(\d+)/, ctx => {
  waitingForInput[ctx.from.id] = `note_${ctx.match[1]}`
  ctx.reply('✍️ اكتب الملاحظة:')
})

bot.action(/note_no_(\d+)/, ctx => {
  achievements[ctx.match[1]].notes = 'لا يوجد'
  sendToStudent(ctx.match[1], ctx)
})

bot.on('text', ctx => {
  const key = waitingForInput[ctx.from.id]
  if (key?.startsWith('note_')) {
    const id = key.replace('note_', '')
    achievements[id].notes = ctx.message.text
    delete waitingForInput[ctx.from.id]
    sendToStudent(id, ctx)
  }
})

/* ================== إرسال للطالب ================== */
function sendToStudent(id, ctx) {
  const a = achievements[id]
  const stars = '⭐'.repeat(a.rating)

  let card = `🏅 *بطاقة إنجاز*\n\n👤 ${a.studentName}\n📌 ${a.type}\n`

  if (a.type === '👨‍🏫 تعليم') {
    card += `\n📝 ${a.details}`
  } else {
    card += `
📖 ${a.surah}
🔢 من: ${a.from}
🔢 إلى: ${a.to}`
  }

  card += `\n\n⭐ *التقييم:* ${stars}\n📝 *ملاحظات المعلم:*\n${a.notes}`

  bot.telegram.sendMessage(a.studentId, card, { parse_mode: 'Markdown' })
  ctx.reply('✅ تم إرسال التقييم للطالب')
}

bot.launch()
console.log('Bot running...')
