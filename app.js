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
  "State_Machines",
  { userBotId: String, phoneNumber: String, state: String, fullName: String, age: Number, type: String },
);

const Users = mongoose.model(
  "Users",
  { userBotId: String, phoneNumber: String, state: String, fullName: String, age: Number, type: String },
);

const bot = new ViberBot({
  authToken: process.env.ACCESS_TOKEN,
  name: "E-Ветеран Бот",
  avatar: "https://developers.viber.com/docs/img/stickers/40122.png",
});

const projectId = "veteran-bot-407514";
const pubsub = new PubSub({ projectId });
const userCreatedTopic = pubsub.topic("events.user_created");

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
  ButtonsGroupColumns: 2,
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
  BgColor: "#ffffff",
  Buttons: [
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_is_veteran",
      Text: "Я ветеран",
      TextSize: "regular",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_is_family_member",
      Text: "Я член сім'ї",
      TextSize: "regular",
    },
  ],
  DefaultHeight: true,
});

const proceedWithExistingAccountKeyboard = () => ({
  Type: "keyboard",
  BgColor: "#ffffff",
  Buttons: [
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "use_new_account",
      Text: "Оновити дані",
      TextSize: "regular",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "use_existing_account",
      Text: "Продовжити з існуючим",
      TextSize: "regular",
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
  region = null;
  type = null;

  constructor({ userBotId, phoneNumber, state, fullName, age, region, type }) {
    this.userBotId = userBotId;
    this.phoneNumber = phoneNumber;
    this.state = state;
    this.fullName = fullName;
    this.age = age;
    this.region = region;
    this.type = type;
  }

  get() {
    return {
      userBotId: this.userBotId,
      phoneNumber: this.phoneNumber,
      state: this.state,
      fullName: this.fullName,
      age: this.age,
      region: this.region,
      type: this.type,
    };
  }
}

bot.on(BotEvents.MESSAGE_RECEIVED, async (message, response) => {
  switch (message.text) {
    case "action_start":
      StateMachine.findOne({ userBotId: response.userProfile.id }).then(async (data) => {
        if (!data) {
          const stateMachine = new SM({
            userBotId: response.userProfile.id,
            state: "WaitingForInputPhone",
          });

          const repo = StateMachine({...stateMachine.get()});

          repo.save();
          response.send([new TextMessage("Введіть свій номер телефону")]);
        } else {
          const stateMachine = new SM({
            userBotId: response.userProfile.id,
            state: "waitingForAccountAction",
          });
          await StateMachine.findOneAndUpdate(
              {userBotId: response.userProfile.id},
              {...stateMachine},
          );
          response.send([new TextMessage("Акаунт з цими даними вже існує", proceedWithExistingAccountKeyboard())]);
        }
      });
      break;
    default:
      const stateMachine = await StateMachine.findOne({ userBotId: response.userProfile.id });
      switch (stateMachine.state) {
        case "waitingForAccountAction":
          if(message.text === "use_new_account"){
            const stateMachine = new SM({
              userBotId: response.userProfile.id,
              state: "WaitingForInputPhone",
            });
            await StateMachine.findOneAndUpdate(
                {userBotId: response.userProfile.id},
                {...stateMachine},
            );
            response.send([ new TextMessage("Оновимо Ваші персональні дані!") ]);
            response.send([ new TextMessage("Введіть свій номер телефону") ]);
            break;
          }
          if(message.text === "use_existing_account"){
            const stateMachine = new SM({
              userBotId: response.userProfile.id,
              state: "WaitingForInput",
            });
            await StateMachine.findOneAndUpdate(
                { userBotId: response.userProfile.id },
                { ...stateMachine },
            );
            response.send([ new TextMessage("Вітаємо у Вашому акаунті!", getKeyboard()) ]);
            break;
          }

        case "WaitingForInputPhone":
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

          response.send([ new TextMessage("Хто Ви?", isVeteranKeyboard()) ]);
          break;
        case "waitingForInputIsVeteran":
          stateMachine.state = "WaitingForInputAge";

          switch (message.text) {
            case "action_is_veteran":
              stateMachine.type = "Veteran";
              break;
            case "action_is_family_member":
              stateMachine.type = "FamilyMember";
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

          if (parseInt(message.text) && parseInt(message.text) < 120) {
            stateMachine.age = parseInt(message.text);
          } else {
            response.send([ new TextMessage("Введіть правильний вік") ]);
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
          const users = Users(
            {
              userBotId: stateMachine.userBotId,
              phoneNumber: stateMachine.phoneNumber,
              state: stateMachine.state,
              fullName: stateMachine.fullName,
              age: stateMachine.age,
              region: stateMachine.region,
              type: stateMachine.type,
            },
          );

          Users.findOne({ userBotId: response.userProfile.id }).then(async (data) => {
            if (!data) {
              users.save();
            } else{
              await Users.findOneAndUpdate(
                  { userBotId: stateMachine.userBotId },
                  {
                    userBotId: stateMachine.userBotId,
                    phoneNumber: stateMachine.phoneNumber,
                    state: stateMachine.state,
                    fullName: stateMachine.fullName,
                    age: stateMachine.age,
                    region: stateMachine.region,
                    type: stateMachine.type,},
                  { ...stateMachine },
              );
            }
          })

          userCreatedTopic.publishMessage({
            json: {
              "botType": "Viber",
              "botUserId": response.userProfile.id,
              "nickname": response.userProfile.name,
              "phoneNumber": stateMachine.phoneNumber,
              "fullName": stateMachine.fullName,
              "age": stateMachine.age,
              "region": stateMachine.region,
              "type": stateMachine.type,
              "registrationDate": (new Date()),
            },
          });
          response.send([ new TextMessage("Вітаю, регійстрацію завершено, тепер Ви можете написати мені свої запитання") ]);
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