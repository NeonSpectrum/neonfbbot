const sendMessage = require('./app')
const fs = require('fs')
const moment = require('moment')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const HttpsProxyAgent = require('https-proxy-agent');
const langs = require('./lang');
const help = require('./help');
const owjs = require('overwatch-js');
const SteamID = require('steamid');
const GoogleSearch = require('google-search')
const translate = require('google-translate-api');
const googleSearch = new GoogleSearch({
  key: process.env.GOOGLE_API,
  cx: '010420937032738550228:8287l8l_wec'
})
const GoogleImages = require('google-images')
const googleImages = new GoogleImages('010420937032738550228:8287l8l_wec', process.env.GOOGLE_API)
const ud = require('urban-dictionary')

class Commands {
  constructor(sender) {
    this.sender = sender
    this.sendMessage = (message, image) => {
      sendMessage(this.sender, message, image)
    }
    this.fetchJSON = (url, obj) => {
      return new Promise(async resolve => {
        resolve(await (await fetch(url, obj)).json())
      })
    }
    this.fetchHTML = (url, obj) => {
      return new Promise(async resolve => {
        resolve(await (await fetch(url, obj)).text())
      })
    }
  }
}

Commands.prototype.help = function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (help[args[0]]) {
    sendMessage(`*${args[0]}* - *${help[args[0]].info}*\n\t*Usage:* \`${help[args[0]].usage}\``)
  } else {
    sendMessage("Cannot find command")
  }
}

Commands.prototype.cmds = function() {
  var sender = this.sender,
    sendMessage = this.sendMessage

  var list = Object.keys(help)
  var temp = []
  for (var i = 0; i < list.length; i++) {
    temp.push(`*${list[i]}* - ${help[list[i]] && help[list[i]].info || "N/A"}\n\t*Usage:* \`${help[list[i]] && help[list[i]].usage || "N/A"}\``)
  }
  sendMessage(temp.join("\n"))
}

Commands.prototype.google = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  googleSearch.build({
    q: args.join(" "),
    num: 5
  }, function(err, res) {
    var items = res.items
    var temp = []
    for (var i = 0; i < items.length; i++) {
      temp.push(`${i+1}. *${items[i].title}*\n${items[i].link}`)
    }
    sendMessage(temp.join("\n"))
  });
}

Commands.prototype.image = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  googleImages.search(args.join(" "))
    .then(images => {
      sendMessage(null, images[0].url.split('?')[0])
    });
}

Commands.prototype.translate = function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (!args[0]) return sendMessage("Invalid Paramters. (lang<lang <word> | lang <word>)")

  var word = args.slice(1).join(" ")
  var lang = args[0].split(">")
  var from = lang[1] ? lang[0] : undefined
  var to = lang[1] || lang[0]

  translate(word, {
    from: from,
    to: to
  }).then(res => {
    sendMessage(`From *${langs[res.from.language.iso]}* To *${langs[to]}*\n\n*${word}* => *${res.text}*`)
  }).catch(() => {
    sendMessage("Cannot translate to this language.")
  })
}

Commands.prototype.langlist = function() {
  var sender = this.sender,
    sendMessage = this.sendMessage

  var key = Object.keys(langs)
  var str = []

  for (var i = 0; i < key.length; i++) {
    str.push(`\`${key[i]}\`: ${langs[key[i]]}`)
  }
  sendMessage(str.join("\n"))
}

Commands.prototype.dictionary = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  ud.term(args.join(" "), function(error, entries, tags, sounds) {
    sendMessage(`*${args.join(" ")}*\n\nDefinition:\n*${entries[0].definition.replace(/\r\n/g," ")}*`)
  })
}

Commands.prototype.weather = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (!args[0]) return sendMessage("Please specify a city.")

  var json = await this.fetchJSON(`http://api.openweathermap.org/data/2.5/weather?q=${args.join(" ")}&units=metric&appid=a88701020436549755f42d7e4be71762`)

  if (json.cod != 200) return sendMessage("City not found.")

  sendMessage(`*${json.sys.country} - ${json.name}*\n
*Weather*: ${json.weather[0].main} - ${json.weather[0].description}
*Temperature*: ${json.main.temp}°C
*Wind: Speed*: ${json.wind.speed} m/s Degrees: ${json.wind.deg}°
*Sunrise*: ${moment(new Date(json.sys.sunrise * 1000)).format("MMM D, YYYY h:mm:ss A")}
*Sunset*: ${moment(new Date(json.sys.sunset * 1000)).format("MMM D, YYYY h:mm:ss A")}
*Coordinates*: Longitude: ${json.coord.lon} Latitude: ${json.coord.lat}
*Pressure*: ${json.main.pressure} hpa
*Humidity*: ${json.main.humidity}%`)
}

Commands.prototype.randomjoke = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  var name = args[0] || "Chuck Norris"

  var json = await this.fetchJSON(`http://api.icndb.com/jokes/random?escape=javascript`)

  var msg = json.value.joke.replace("Chuck Norris", name).replace(`${name}' `, name[name.length - 1] != "s" ? `${name}'s ` : undefined)

  sendMessage(msg)
}

Commands.prototype.lol = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (args[0] != "summoner" && args[0] != "champion") return sendMessage("Invalid Parameters. (summoner <user> | champion <name>)")

  if (args[0] == "summoner") {
    var name = args.slice(1).join(" ")
    var c = cheerio.load(await this.fetchHTML(`http://ph.op.gg/summoner/userName=${name}`))

    var mostPlayed = [],
      recentlyPlayed = []

    c(".MostChampionContent").find(".ChampionName").each(function() {
      mostPlayed.push(c(this).attr("title"))
    })
    c("table.SummonersMostGameTable").find(".SummonerName>a").each(function() {
      recentlyPlayed.push(c(this).html())
    })

    var data = {
      icon: `http:${c(".ProfileIcon>img.ProfileImage").attr("src")}`,
      name: c(".Profile>.Information>.Name").text(),
      rank: {
        title: c(".TierRankInfo>.TierRank>.tierRank").text() || "N/A",
        icon: `http:${c(".Medal>img.Image").attr("src")}` || "N/A",
        info: {
          points: c(".TierRankInfo>.TierInfo>.LeaguePoints").text() || "N/A",
          win: c(".TierRankInfo>.TierInfo>.WinLose>.wins").text() || "N/A",
          lose: c(".TierRankInfo>.TierInfo>.WinLose>.losses").text() || "N/A",
          ratio: c(".TierRankInfo>.TierInfo>.WinLose>.winratio").text() || "N/A"
        }
      },
      mostPlayed: mostPlayed,
      recentlyPlayed: recentlyPlayed
    }

    if (data.name) {
      var msg = []

      msg.push(`*Name*: ${data.name}`)
      msg.push(`*Rank*: ${data.rank.title}`)

      if (data.rank.title != "Unranked") {
        msg.push(`*Points*: ${data.rank.info.points.trim()}`)
        msg.push(`*Stats*: ${data.rank.info.win} / ${data.rank.info.lose} (${data.rank.info.ratio})`)
      }

      if (data.mostPlayed.length > 0)
        msg.push(`*Most Played Champions (Ranked)*: ${data.mostPlayed.join(", ")}`)

      if (data.recentlyPlayed.length > 0)
        msg.push(`*Recently Played with*: ${data.recentlyPlayed.join(", ")}`)

      sendMessage(msg.join("\n"))
    } else {
      sendMessage("Summoner name not found.")
    }
  } else if (args[0] == "champion") {
    var c = cheerio.load(await this.fetchHTML(`https://www.leaguespy.net/league-of-legends/champion/${args[1]}/stats`))

    var strongAgainst = [
        c(".champ__counters").eq(0).find(".champ__counters__radials__big>a>span").text(),
        c(".champ__counters").eq(0).find(".champ__counters__radials__small>a>span").text()
      ],
      weakAgainst = [
        c(".champ__counters").eq(1).find(".champ__counters__radials__big>a>span").text(),
        c(".champ__counters").eq(1).find(".champ__counters__radials__small>a>span").text()
      ],
      skillBuild = [],
      itemBuild = {
        startingItems: [],
        boots: [],
        coreItems: [],
        luxuryItems: []
      }

    c(".ls-table").eq(0).find(".ls-table__row").each(function() {
      strongAgainst.push(c(this).find("a").text().trim())
    })
    c(".ls-table").eq(1).find(".ls-table__row").each(function() {
      weakAgainst.push(c(this).find("a").text().trim())
    })
    c(".skill-block").find(".skill-grid__column").each(function() {
      c(this).find("span").each(function(i) {
        if (c(this).hasClass("active")) {
          var skill = ""
          switch (i) {
            case 0:
              skill = "q"
              break
            case 1:
              skill = "w"
              break
            case 2:
              skill = "e"
              break
            case 3:
              skill = "r"
              break
          }
          skillBuild.push(skill)
        }
      })
    })
    c(".champ-block").find(".item-block").eq(0).find(".item-block__top>.item-block__items>span").each(function() {
      itemBuild.startingItems.push(c(this).find("span").text())
    })
    c(".champ-block").find(".item-block").eq(1).find(".item-block__top>.item-block__items>span").each(function() {
      itemBuild.boots.push(c(this).find("span").text())
    })
    c(".champ-block").find(".item-block").eq(2).find(".item-block__top>.item-block__items>span").each(function() {
      itemBuild.coreItems.push(c(this).find("span").text())
    })
    c(".champ-block").find(".item-block").eq(3).find(".item-block__top>.item-block__items>span").each(function() {
      itemBuild.luxuryItems.push(c(this).find("span").text())
    })
    var data = {
      icon: c(".champ__header__left__radial").find(".inset>img").attr("src"),
      name: c(".champ__header__left__main>h2").text(),
      role: c(".stat-source>.stat-source__btn").eq(0).find("a").text().split(" ")[0],
      roleIcon: `https://www.leaguespy.net${c(".champ__header__left__radial>.overlay>img").attr("src")}`,
      winRate: c(".champ__header__left__main>.stats-bar").eq(0).find(".bar-div>span").text(),
      banRate: c(".champ__header__left__main>.stats-bar").eq(1).find(".bar-div>span").text(),
      weakAgainst: weakAgainst,
      strongAgainst: strongAgainst,
      skillBuild: skillBuild,
      itemBuild: itemBuild
    }
    if (data.name) {
      var msg = []
      msg.push(`*Name*: ${data.name}`)
      msg.push(`*Role*: ${data.role}`)
      msg.push(`*Win Rate*: ${data.winRate}`)
      msg.push(`*Ban Rate*: ${data.banRate}`)
      msg.push(`*Weak Against*: ${data.weakAgainst.join(" ")}`)
      msg.push(`*Strong Against*: ${data.strongAgainst.join(" ")}`)
      msg.push(`*Skill Build*: ${data.skillBuild.join(" > ")}`)
      msg.push(`*Item Build*:\n*Starting Items*: ${data.itemBuild.startingItems.join(", ")}\n*Boots*: ${data.itemBuild.boots.join(", ")}\n*Core Items*: ${data.itemBuild.coreItems.join(", ")}\n*Luxury Items*: ${data.itemBuild.luxuryItems.join(", ")}`)

      sendMessage(msg.join("\n"))
    } else {
      sendMessage("Champion not found")
    }
  }
}

Commands.prototype.overwatch = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (!args[0] || args[0].indexOf("#") == -1) return sendMessage("Please specify a name with tag")

  try {
    var user = await owjs.search(args[0])
    var data = await owjs.getAll("pc", "career", user[0].urlName)
    var main = data.competitive.global.masteringHeroe
    var timePlayed = data.quickplay.global.time_played / 1000 / 3600

    var msg = []
    msg.push(`*Name*: ${user[0].name}`)
    msg.push(`*Level*: ${data.profile.level}`)
    msg.push(`*Tier*: ${data.profile.tier}`)
    msg.push(`*Rank*: ${data.profile.level} (${data.profile.rank})`)
    msg.push(`*Main Hero*: ${main.toUpperCase()} W: ${data.competitive.heroes[main].games_won} L: ${data.competitive.heroes[main].games_lost} (${data.competitive.heroes[main].win_percentage}%)`)
    msg.push(`*Medals*: ${data.competitive.global.medals}`)
    msg.push(`*Time Played*: ${timePlayed} ${timePlayed == 1 ? "hour" : "hours"}`)

    sendMessage(msg.join("\n"))
  } catch (err) {
    sendMessage("User not found.")
  }
}

Commands.prototype.dota2 = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (!args[0]) return sendMessage("Please specify an Steam ID.")

  var sid
  try {
    sid = new SteamID(args[0])
  } catch (err) {
    return msg.edit($.embed("User not found.")).catch(() => {})
  }

  var c = cheerio.load(await this.fetchHTML(`https://www.dotabuff.com/players/${sid.accountid}`))

  if (c(".intro.intro-smaller").text().indexOf("private") > -1) return sendMessage("This user's profile is private.")

  var mostPlayed = [],
    record = c(".header-content-secondary>dl").eq(3).find(".game-record").text().split("-")

  c(".heroes-overview>.r-row").each(function(i) {
    if (i < 5) {
      mostPlayed.push(c(this).find(".r-none-mobile>a").text())
    }
  })
  var data = {
    name: c(".image-container-bigavatar>a>img").attr("alt"),
    icon: c(".image-container-bigavatar>a>img").attr("src"),
    lastMatch: c(".header-content-secondary>dl").eq(0).find("dd>time").text() || "N/A",
    soloMMR: c(".header-content-secondary>dl").eq(1).find("dd").text().split(" ")[0] || "N/A",
    partyMMR: c(".header-content-secondary>dl").eq(2).find("dd").text().split(" ")[0] || "N/A",
    record: record[0] ? record : "N/A",
    winRate: c(".header-content-secondary>dl").eq(4).find("dd").text() || "N/A",
    mostPlayed: mostPlayed[0] ? mostPlayed : "N/A"
  }
  if (data.name && data.lastMatch != "N/A") {
    var msg = []
    msg.push(`*Name*: ${data.name}`)
    msg.push(`*Solo MMR*: ${data.soloMMR}`)
    msg.push(`*Party MMR*: ${data.partyMMR}`)
    msg.push(`*Record*: ${typeof data.record == "object" ? `Win: ${data.record[0]}\nLose: ${data.record[1]}\nAbandon: ${data.record[2]}` : data.record}`)
    msg.push(`*Win Rate*: ${data.winRate}`)
    msg.push(`*Most Played Hero*: ${typeof data.mostPlayed == "object" ? data.mostPlayed.join(", ") : data.mostPlayed}`)
    sendMessage(msg.join("\n"))
  } else {
    sendMessage("User not found.")
  }
}

Commands.prototype.csgo = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (!args[0]) return sendMessage("Please specify an Steam ID.")

  var c = cheerio.load(await this.fetchHTML(`https://csgo-stats.com/search/${args[0]}`))

  var data = {
    name: c(".steam-name>a").text(),
    icon: c(".avatar>img").attr("src"),
    rank: c("span.rank-name").text(),
    rankIcon: `https://csgo-stats.com${c(".rank>img").attr("src")}`,
    kills: c(".main-stats").eq(0).find(".main-stats-row-top").find(".main-stats-data-row").eq(1).find(".main-stats-data-row-data").text(),
    timePlayed: c(".main-stats").eq(0).find(".main-stats-row").find(".main-stats-data-row").eq(1).find(".main-stats-data-row-data").text(),
    winRate: c(".main-stats").eq(0).find(".main-stats-row-bot").find(".main-stats-data-row").eq(1).find(".main-stats-data-row-data").text(),
    accuracy: c(".main-stats").eq(1).find(".main-stats-row-top").find(".main-stats-data-row-alt").eq(1).find(".main-stats-data-row-data").text(),
    headshot: c(".main-stats").eq(1).find(".main-stats-row").find(".main-stats-data-row-alt").eq(1).find(".main-stats-data-row-data").text(),
    mvp: c(".main-stats").eq(1).find(".main-stats-row-bot").find(".main-stats-data-row-alt").eq(1).find(".main-stats-data-row-data").text(),
    favoriteWeapon: c(".fav-weapon-pretty-name>span").eq(0).text(),
    favoriteMap: c(".fav-weapon-pretty-name>span").eq(1).text()
  }
  if (data.name) {
    var msg = []
    msg.push(`*Name*: ${data.name}`)
    msg.push(`*Rank*: ${data.rank}`)
    msg.push(`*Kills*: ${data.kills}`)
    msg.push(`*Win Rate*: ${data.winRate}`)
    msg.push(`*MVP*: ${data.mvp}`)
    msg.push(`*Accuracy*: ${data.accuracy}`)
    msg.push(`*Headshot*: ${data.headshot}`)
    msg.push(`*Favorite Weapon*: ${data.favoriteWeapon}`)
    msg.push(`*Favorite Map*: ${data.favoriteMap}`)
    msg.push(`*Time Played*: ${data.timePlayed}`)
    sendMessage(msg.join("\n"))
  } else {
    sendMessage("User not found.")
  }
}

Commands.prototype.lyrics = async function(args) {
  var sender = this.sender,
    sendMessage = this.sendMessage

  if (!args[0]) return sendMessage("Please specify a song")

  var html = await this.fetchHTML("https://search.azlyrics.com/search.php?q=" + args.join(" ").replace(/\s/g, "+"))

  var c = cheerio.load(html)
  var lyrics = {}

  c("td.visitedlyr a").each(function() {
    if (c(this).attr("href").indexOf("/lyrics/") > -1) {
      lyrics = {
        title: c(this).text(),
        url: c(this).attr("href")
      }
      return false
    }
  })

  if (lyrics.url) {
    sendMessage(`Lyrics found!\n\n*${lyrics.title}*\n${lyrics.url}`)
  } else {
    sendMessage("Lyrics not found.")
  }
}

module.exports = Commands