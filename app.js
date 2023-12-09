"use strict";

require("dotenv").config();
const { PubSub } = require("@google-cloud/pubsub");
const ViberBot = require("viber-bot").Bot;
const BotEvents = require("viber-bot").Events;

const TextMessage = require("viber-bot").Message.Text;
const UrlMessage = require("viber-bot").Message.Url;
const KeyboardMessage = require("viber-bot").Message.Keyboard;

const ngrok = require("./get_public_url");

const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://mongouser:lgfQJqQpyTjnUTul@cluster0.b7ksl1g.mongodb.net/?retryWrites=true&w=majority");

const StateMachine = mongoose.model(
  "StateMachines",
  { userBotId: String, phoneNumber: String, state: String, fullName: String, age: String, isVeteran: String },
);

const bot = new ViberBot({
  authToken: process.env.ACCESS_TOKEN,
  name: "E-Ветеран Бот",
  avatar: "https://developers.viber.com/docs/img/stickers/40122.png",
});

const projectId = "veteran-bot-407514";
const pubsub = new PubSub({ projectId });
const userStartedTopic = pubsub.topic("events.user_started");

bot.onConversationStarted((userProfile, isSubscribed, context, onFinish) => {
    const keyboard = {
      Type: "keyboard",
      ButtonsGroupRows: 1,
      BgColor: "#ffffff",
      Buttons: [
        {
          ActionType: "reply",
          ActionBody: "action_start",
          Text: "Розпочати",
        },
      ],
    };
    onFinish(
      new KeyboardMessage(keyboard),
    );
  },
);

const getKeyboard = () => ({
  Type: "keyboard",
  ButtonsGroupRows: 1,
  BgColor: "#ffffff",
  Buttons: [
    {
      ActionType: "reply",
      ActionBody: "search",
      Text: "Шукати",
    },
  ],
  DefaultHeight: true,
});

const isVeteranKeyboard = () => ({
  Type: "keyboard",
  ButtonsGroupRows: 1,
  BgColor: "#ffffff",
  Buttons: [
    {
      ActionType: "reply",
      ActionBody: "action_is_veteran_yes",
      Text: "Так",
    },
    {
      ActionType: "reply",
      ActionBody: "action_is_veteran_no",
      Text: "Ні",
    },
  ],
  DefaultHeight: true,
});

class SM {
  userBotId = null;
  phoneNumber = null;
  state = null;
  fullName = null;
  age = null;
  isVeteran = null;

  constructor({ userBotId, phoneNumber, state, fullName, age, isVeteran }) {
    this.userBotId = userBotId;
    this.phoneNumber = phoneNumber;
    this.state = state;
    this.fullName = fullName;
    this.age = age;
    this.isVeteran = isVeteran;
  }

  get() {
    return {
      userBotId: this.userBotId,
      phoneNumber: this.phoneNumber,
      state: this.state,
      fullName: this.fullName,
      age: this.age,
      isVeteran: this.isVeteran,
    };
  }
}

bot.on(BotEvents.MESSAGE_RECEIVED, async (message, response) => {
  switch (message.text) {
    case "action_start":
      StateMachine.findOne({ userBotId: response.userProfile.id }).then((data) => {
        if (!data) {
          const stateMachine = new SM({
            userBotId: response.userProfile.id,
            state: "waitingForInputPhone",
          });

          const repo = StateMachine({ ...stateMachine.get() });

          repo.save();
          response.send([ new TextMessage("Введіть свій номер телефону") ]);
        }
      });
      break;
    default:
      const stateMachine = await StateMachine.findOne({ userBotId: response.userProfile.id });
      switch (stateMachine.state) {
        case "waitingForInputPhone":
          stateMachine.state = "waitingForInputFullName";
          if (!(/\+380\d{9}/.test(message.text))) {
            response.send([ new TextMessage("Номер повинен починатись з +380") ]);
            return;
          }
          stateMachine.phoneNumber = message.text;
          await StateMachine.findOneAndUpdate(
            { userBotId: response.userProfile.id },
            { ...stateMachine },
          );
          response.send([ new TextMessage("Тепер введіть своє повне ім'я") ]);
          break;
        case "waitingForInputFullName":
          stateMachine.state = "waitingForInputIsVeteran";
          stateMachine.fullName = message.text;

          await StateMachine.findOneAndUpdate(
            { userBotId: response.userProfile.id },
            { ...stateMachine },
          );

          response.send([ new TextMessage("Ви ветеран?", isVeteranKeyboard()) ]);
          break;
        case "waitingForInputIsVeteran":
          stateMachine.state = "WaitingForInputAge";

          switch (message.text) {
            case "action_is_veteran_yes":
              stateMachine.isVeteran = true;
              break;
            case "action_is_veteran_no":
              stateMachine.isVeteran = false;
              break;
          }

          await StateMachine.findOneAndUpdate(
            { userBotId: response.userProfile.id },
            { ...stateMachine },
          );

          response.send([ new TextMessage("Тепер введіть свій вік") ]);
          break;
        case "WaitingForInputAge":
          stateMachine.state = "WaitingForInputRegion";

          if (parseInt(message.text)) {
            stateMachine.age = parseInt(message.text);
          } else {
            response.send([ new TextMessage("Вік повинен бути додатнім числом дебик") ]);
            return;
          }

          await StateMachine.findOneAndUpdate(
            { userBotId: response.userProfile.id },
            { ...stateMachine },
          );

          response.send([ new TextMessage("Вкажіть ваш регіон") ]);
          break;
        case "WaitingForInputRegion":
          stateMachine.state = "WaitingForInput";
          stateMachine.region = message.text;

          await StateMachine.findOneAndUpdate(
            { userBotId: response.userProfile.id },
            { ...stateMachine },
          );

          response.send([ new TextMessage("Вітаю, регійстрацію завершено, тепер можете написати мені свої питання") ]);
          break;
      }
      break;
  }

  if (message.text === "search") {
    response.send(new TextMessage("Please enter your search query:", getKeyboard()));
  }

  if (message.text === "test") {
    response.send(new TextMessage("Please enter your search query:", getKeyboard()));
  }
});

bot.getBotProfile().then(response => console.log(`Bot Named: ${response.name}`));

// Server
if (process.env.NOW_URL || process.env.HEROKU_URL) {
  const http = require("http");
  const port = process.env.PORT || 5000;

  http.createServer(bot.middleware()).listen(port, () => bot.setWebhook(process.env.NOW_URL || process.env.HEROKU_URL));
} else {
  return ngrok.getPublicUrl().then(publicUrl => {
    const http = require("http");
    const port = process.env.PORT || 5000;

    console.log("publicUrl => ", publicUrl);

    http.createServer(bot.middleware()).listen(port, () => bot.setWebhook(publicUrl));

  }).catch(error => {
    console.log("Can not connect to ngrok server. Is it running?");
    console.error(error);
    process.exit(1);
  });
}