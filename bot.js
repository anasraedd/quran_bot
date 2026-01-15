import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

const state = {};

// start
bot.start((ctx) => {
  state[ctx.from.id] = { step: "TYPE" };
  ctx.reply("اختر نوع الإنجاز:\n1️⃣ حفظ\n2️⃣ مراجعة");
});

// استقبال الرسائل
bot.on("text", (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text.trim();

  if (!state[id]) return;

  // اختيار النوع
  if (state[id].step === "TYPE") {
    if (text === "1") state[id].type = "حفظ";
    else if (text === "2") state[id].type = "مراجعة";
    else return ctx.reply("اكتب 1 أو 2 فقط");

    state
