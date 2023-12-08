'use strict';

require('dotenv').config();
const { PubSub } = require("@google-cloud/pubsub");
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;

const TextMessage = require('viber-bot').Message.Text;
const UrlMessage = require('viber-bot').Message.Url;
const KeyboardMessage = require('viber-bot').Message.Keyboard;

const ngrok = require('./get_public_url');

const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://mongouser:lgfQJqQpyTjnUTul@cluster0.b7ksl1g.mongodb.net/?retryWrites=true&w=majority');

const StateMachine = mongoose.model('StateMachines', { name: String, id: String, userState: String });

const bot = new ViberBot({
  authToken: process.env.ACCESS_TOKEN,
  name: "E-Ветеран Бот",
  avatar: "https://developers.viber.com/docs/img/stickers/40122.png"
});

const projectId = "veteran-bot-407514";
const pubsub = new PubSub({ projectId });
const userStartedTopic = pubsub.topic("events.user_started");

bot.onConversationStarted((userProfile, isSubscribed, context, onFinish) =>{
      const keyboard = {
        Type: 'keyboard',
        ButtonsGroupRows: 1,
        BgColor: "#FFFFFF",
        Buttons: [
          {
            ActionType: 'reply',
            ActionBody: 'start',
            Text: 'Розпочати',
          },
        ],
      };
      onFinish(
          new KeyboardMessage(keyboard)
      )
    }
);

const getKeyboard = () => ({
  Type: 'keyboard',
  ButtonsGroupRows: 1,
  BgColor: "#FFFFFF",
  Buttons: [
    {
      ActionType: 'reply',
      ActionBody: 'search',
      Text: 'Шукати',
    },
  ],
  DefaultHeight: true,
})

bot.on(BotEvents.MESSAGE_RECEIVED, async (message, response) => {
  if(message.text === "start"){
    response.send(new KeyboardMessage(getKeyboard()))

    await topic.publishMessage({json: {
      "botType": "Viber",
      "botUserId": response.userProfile.id,
      "country": response.userProfile.country,
      "nickname": response.userProfile.name
    }});

    const stateMachine = StateMachine( {
      name: response.userProfile.name,
      id: response.userProfile.id,
      userState: "WaitingForResponseAfterStartButton"
    });

    await stateMachine.save();

    // const [subscription] = await topic.createSubscription("events.user_started");
    //
    // // Receive callbacks for new messages on the subscription
    // subscription.on('message', message => {
    //   console.log('Received message:', message.data.toString());
    //   process.exit(0);
    // });
  }

  if (message.text === 'search') {
    response.send(new TextMessage('Please enter your search query:', getKeyboard()));
  }

  if (message.text === 'test') {
    response.send(new TextMessage('Please enter your search query:', getKeyboard()));
  }
});

bot.getBotProfile().then(response => console.log(`Bot Named: ${response.name}`));

// Server
if (process.env.NOW_URL || process.env.HEROKU_URL) {
  const http = require('http');
  const port = process.env.PORT || 5000;

  http.createServer(bot.middleware()).listen(port, () => bot.setWebhook(process.env.NOW_URL || process.env.HEROKU_URL));
} else {
  return ngrok.getPublicUrl().then(publicUrl => {
    const http = require('http');
    const port = process.env.PORT || 5000;

    console.log('publicUrl => ', publicUrl);

    http.createServer(bot.middleware()).listen(port, () => bot.setWebhook(publicUrl));

  }).catch(error => {
    console.log('Can not connect to ngrok server. Is it running?');
    console.error(error);
    process.exit(1);
  });
}