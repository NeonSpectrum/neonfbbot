require('dotenv').config()
const fs = require('fs')
const https = require('https')
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const request = require('request')
const langs = require('./lang')
const app = express()
const translate = require('google-translate-api');
const token = process.env.TOKEN

var Command

app.set('port', process.env.PORT)

app.use(bodyParser.urlencoded({
  extended: false
}))

app.use(bodyParser.json())

app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === 'neonspectrum') {
    res.send(req.query['hub.challenge'])
  }
  res.send('Error!, wrong token.')
})
app.post('/webhook/', function(req, res) {
  let messaging_events = req.body.entry[0].messaging
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    let sender = event.sender.id

    if (event.message && event.message.text) {
      let text = event.message.text
      processCommand(sender, text)
    }
  }
  res.sendStatus(200)
})

https.createServer({
  ca: fs.readFileSync('./key/ca_bundle.crt'),
  key: fs.readFileSync('./key/private.key'),
  cert: fs.readFileSync('./key/certificate.crt')
}, app).listen(app.get('port'), function() {
  Command = require('./commands')
  console.log("Https Server started at port " + app.get('port'))
})

async function processCommand(sender, text) {
  var arr = text.split(" ")
  var cmd = arr[0]
  var args = arr.slice(1)

  var command = new Command(sender)
  if (getAllFuncs(command).indexOf(cmd) > -1) {
    command[cmd](args)
  } else {
    var json = await (await fetch(`https://program-o.com/v3/chat.php?say=${text}`)).json();
    sendMessage(sender, json.conversation.say.bot);
  }
}

var sendMessage = (sender, text, image) => {
  fetch(`https://graph.facebook.com/v3.0/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient: {
        id: sender
      },
      message: {
        text: text,
        attachment: image ? {
          "type": "image",
          "payload": {
            "url": image,
            "is_reusable": true,
          }
        } : null
      },
    })
  })
}

function getAllFuncs(obj) {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).filter((x) => x != "constructor" && !x.startsWith("_"))
}

module.exports = sendMessage