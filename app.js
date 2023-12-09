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
const questionSentTopic = pubsub.topic("events.user_message_sent");

const startKeyboard = () => ({
  Type: "keyboard",
  ButtonsGroupRows: 1,
  BgColor: "#000000",
  Buttons: [
    {
      ActionType: "reply",
      ActionBody: "action_start",
      Text: "Розпочати",
      BgColor: "#ffffff",
    },
  ],
});

bot.onConversationStarted((userProfile, isSubscribed, context, onFinish) => {
    onFinish(
      new KeyboardMessage(startKeyboard()),
    );
  },
);

const getKeyboard = () => ({
  Type: "keyboard",
  BgColor: "#000000",
  Buttons: [
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_info_psycho_rehabilitation",
      Text: "Психологічна реабілітація",
      BgColor: "#ffffff",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_info_adaptation",
      Text: "Соціальна та професійна адаптації",
      BgColor: "#ffffff",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_info_compensation",
      Text: "Відшкодування вартості проїзду",
      BgColor: "#ffffff",
    },

    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_info_family_support",
      Text: "Призначення одноразової грошової допомоги сім'ї, батькам загиблого (померлого)",
      BgColor: "#ffffff",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_info_health",
      Text: "Встановлення факту ушкодження здоров'я в АТО/ООС",
      BgColor: "#ffffff",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_info_new_document",
      Text: "Видача нового посвідчення ветеранам війни",
      BgColor: "#ffffff",
    },
    {
      Columns: 6,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_custom_request",
      Text: "Звернутись до адміністратора з власним питанням",
      BgColor: "#ffffff",
    },
    {
      Columns: 6,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_start",
      Text: "Мій акаунт",
      BgColor: "#ffffff",
    },
  ],
  DefaultHeight: true,
});

const isVeteranKeyboard = () => ({
  Type: "keyboard",
  BgColor: "#000000",
  Buttons: [
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_is_veteran",
      Text: "Я ветеран",
      TextSize: "regular",
      BgColor: "#ffffff",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "action_is_family_member",
      Text: "Я член сім'ї",
      TextSize: "regular",
      BgColor: "#ffffff",
    },
  ],
  DefaultHeight: true,
});

const proceedWithExistingAccountKeyboard = () => ({
  Type: "keyboard",
  BgColor: "#000000",
  Buttons: [
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "use_new_account",
      Text: "Оновити дані",
      TextSize: "regular",
      BgColor: "#ffffff",
    },
    {
      Columns: 3,
      Rows: 1,
      ActionType: "reply",
      ActionBody: "use_existing_account",
      Text: "Назад",
      TextSize: "regular",
      BgColor: "#ffffff",
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
  switch (message.text){
    case "action_start":
      StateMachine.findOne({ userBotId: response.userProfile.id }).then(async (data) => {
        if (!data) {
          response.send([new TextMessage("Вітаю! Це EVeteran, Ваш супутник у шляху реабілітації. Моя мета - надати вам підтримку та корисну інформацію. Я готовий допомагати з питаннями щодо лікування, медичних закладів, а також забезпечити психологічну та правову підтримку. Не соромтеся питати, і ми разом зможемо подолати будь-які труднощі!", startKeyboard())])
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
          response.send([ new TextMessage("Вітаю, регійстрацію завершено, тепер Ви можете написати мені свої запитання", getKeyboard()) ]);
          break;

        case "WaitingForInput":{
          if(message.text === "action_info_psycho_rehabilitation"){
            response.send(
                [ new UrlMessage("https://guide.diia.gov.ua/view/psykholohichna-reabilitatsiia-postrazhdalykh-uchasnykiv-revoliutsii-hidnosti-uchasnykiv-antyterorystychnoi-operatsii-ta-osib-iak-ba1cfac5-db7c-4add-a2c4-0e82caa6d348",
                    getKeyboard()) ]
            );
          }

          if(message.text === "action_info_adaptation"){
                response.send(
                    [ new UrlMessage("https://guide.diia.gov.ua/view/vydacha-napravlennia-dlia-otrymannia-posluh-z-sotsialnoi-ta-profesiinoi-adaptatsii-5694af89-2e17-4d6d-b030-1effcf59ae77",
                        getKeyboard()) ]
                );
          }
          if(message.text === "action_info_compensation"){
            response.send(
                [ new UrlMessage("https://guide.diia.gov.ua/view/pryiniattia-rishennia-pro-vyplatu-hroshovoi-kompensatsii-vartosti-proizdu-postrazhdalykh-uchasnykiv-revoliutsii-hidnosti-veteran-a8fac003-b0f3-4059-a817-4bf60224aba7",
                    getKeyboard()) ]
            );
          }
          if(message.text === "action_info_family_support"){
            response.send(
                [ new UrlMessage("https://guide.diia.gov.ua/view/pryznachennia-odnorazovoi-hroshovoi-dopomohy-chlenam-simi-batkam-ta-utrymantsiam-volontera-zahybloho-pomerloho-vnaslidok-poranen-72d00da5-5d09-409e-bbcf-e08e556f4348",
                    getKeyboard()) ]
            );
          }
          if(message.text === "action_info_health"){
            response.send(
                [ new UrlMessage("https://guide.diia.gov.ua/view/vstanovlennia-faktu-oderzhannia-ushkodzhen-zdorovia-vid-boieprypasiv-na-terytorii-provedennia-antyterorystychnoi-operatsii-zdiis-6196768b-a503-467a-96a6-4f56bcc2ab8e",
                    getKeyboard()) ]
            );
          }
          if(message.text === "action_info_new_document"){
            response.send(
                [ new UrlMessage("https://guide.diia.gov.ua/view/vydacha-novoho-posvidchennia-uchasnykam-boiovykh-dii-osobam-z-invalidnistiu-vnaslidok-viiny-uchasnykam-viiny-chlenam-simi-zahybl-7b1c5940-62c0-48ae-b6bb-4776cd7a28f5",
                    getKeyboard()) ]
            );
          }
          if(message.text === "action_custom_request"){
            stateMachine.state = "waitingForInputCustomRequest";
            await StateMachine.findOneAndUpdate(
                { userBotId: response.userProfile.id },
                { ...stateMachine },
            );

            response.send([ new TextMessage("Напишіть нам своє запитання, наші адміністратори надішлють Вам відповідь у чаті або зателефонують Вам", getKeyboard()) ]);
          }
          break;
        }
        case "waitingForInputCustomRequest":{
          stateMachine.state = "WaitingForInput";

          if(message.text !== "action_custom_request"){
            questionSentTopic.publishMessage({
              json: {
                "botType": "Viber",
                "BotMessageId": message.token,
                "phoneNumber": stateMachine.phoneNumber,
                "fullName": stateMachine.fullName,
                "isQuestion": true,
                "text": message.text,
                "Timestamp": (new Date()),
              },
            }
            )
          }


          await StateMachine.findOneAndUpdate(
              { userBotId: response.userProfile.id },
              { ...stateMachine },
          );

          response.send([ new TextMessage("Дякуємо за повідомлення! Наші фахівці незабаром Вам напишуть або зателефонують", getKeyboard()) ]);
        }
      }
      break;
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