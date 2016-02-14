tg = require 'node-telegram-bot-api'
redis = require 'redis'
conf = require './config.json'

# init bot api
bot = new tg conf.botAPI, {polling: true}
# init redis
r = redis.createClient()
r.auth conf.redisPass

# date formatter
Date.prototype.formattedTime = ->
  zeroFormat = (d) ->
    ("0" + d).substr(-2)
  month = zeroFormat @getMonth()
  day = zeroFormat @getDay()
  hours = zeroFormat @getHours()
  minutes = zeroFormat @getMinutes()
  seconds = zeroFormat @getSeconds()
  "#{@getFullYear()}.#{month}.#{day} #{hours}:#{minutes}:#{seconds}"

# auto rule sender
bot.on 'new_chat_participant', (msg) ->
  if msg.chat.type == 'group' || msg.chat.type == 'supergroup'
    key = "Shan8Bot:group:#{msg.chat.id}"
    r.hget key, "auto", (err, obj)->
      redis.print err, obj
      if obj?
        r.hget key, "rule", (err, obj)->
          redis.print err, obj
          if obj?
            console.log("send #{msg.new_chat_participant.id} #{obj}")
            bot.sendMessage(msg.new_chat_participant.id, obj)
  console.dir(msg)

# set rule
bot.onText RegExp("^/setrule(@#{conf.botName})? (.+)"), (msg, rule) ->
  if msg.chat.type == 'group' || msg.chat.type == 'supergroup'
    key = "Shan8Bot:group:#{msg.chat.id}"
    r.hset key, "rule", rule[2], (err, obj)->
      redis.print err, obj
      bot.sendMessage msg.chat.id, "new rule get"

# remove rule
bot.onText RegExp("^/rmrule(@#{conf.botName})?$"), (msg, _) ->
  if msg.chat.type == 'group' || msg.chat.type == 'supergroup'
    key = "Shan8Bot:group:#{msg.chat.id}"
    r.hdel key, "rule", (err, obj)->
      redis.print err, obj
      bot.sendMessage msg.chat.id, "remove success"
    console.log(msg)

# show rule
bot.onText RegExp("^/rule(@#{conf.botName})?$"), (msg, _) ->
  if msg.chat.type == 'group' || msg.chat.type == 'supergroup'
    key = "Shan8Bot:group:#{msg.chat.id}"
    r.hget key, "rule", (err, obj)->
      redis.print err, obj
      if !obj?
        bot.sendMessage msg.from.id, "并没有规则 (*ﾟーﾟ)"
        return
      bot.sendMessage msg.from.id, obj
      console.log(msg)

# auto rule
bot.onText RegExp("^/autorule(@#{conf.botName})?$"), (msg, _)->
  if msg.chat.type == 'group' || msg.chat.type == 'supergroup'
    key = "Shan8Bot:group:#{msg.chat.id}"
    r.hget key, "auto", (err, obj)->
      redis.print err, obj
      if obj?
        r.hdel key, "auto", (err, obj)->
          redis.print err, obj
          bot.sendMessage msg.chat.id, "auto rule disabled"
      else
        r.hset key, "auto", true, (err, obj)->
          redis.print err, obj
          bot.sendMessage msg.chat.id, "auto rule enabled"
    console.log(msg)

# check-in
bot.onText /^滴|打卡|签到|di(.*)/, (msg, _) ->
  date = new Date msg.date * 1000
  # 6:00 ~ 9:00
  if date.getHours() >= 6 && date.getHours() < 9
    key = "Shan8Bot:morning:#{msg.from.id}"
    console.log(key)
    console.log(msg.from.username)
    r.hget key, "last", (err, obj)->
      if obj?
        last = new Date obj * 1000
        if date.getFullYear() == last.getFullYear()\
          && date.getMonth() == last.getMonth()\
          && date.getDay() == last.getDay()
            console.log(last)
            bot.sendMessage msg.from.id, "早安卡已获取\n\
               时间为 #{last.formattedTime()}"
            return
      r.hset key,
        "last", msg.date, redis.print
      r.hincrby key,
        "#{date.getFullYear()}:#{date.getMonth()}", 1,
        (err, reply)->
          redis.print err, reply
          morning = "早上好! \n您已顺利的打卡成功。 \n时间为 #{date.formattedTime()} \n\
        这是您本月的第 #{reply} 次晨间打卡。 \n今天又是美好的一天！ \n祝您生活愉快一切顺利。 "
          bot.sendMessage(msg.from.id, morning)
  # 22:00 ~ 24:00
  else if date.getHours() >= 22 && date.getHours() < 24
    key = "Shan8Bot:night:#{msg.from.id}"
    console.log(key)
    console.log(msg.from.username)
    r.hget key, "last", (err, obj)->
      if obj?
        last = new Date obj * 1000
        if date.getFullYear() == last.getFullYear()\
          && date.getMonth() == last.getMonth()\
          && date.getDay() == last.getDay()
            console.log(last)
            bot.sendMessage(msg.from.id, "晚安卡已获取\n\
               时间为 #{last.formattedTime()}")
            return
      r.hset key,
        "last", msg.date, redis.print
      r.hincrby key,
        "#{date.getFullYear()}:#{date.getMonth()}", 1,
        (err, reply)->
          redis.print err, reply
          night = "Bingbo!!! \n您已顺利的打卡成功。 \n时间为 #{date.formattedTime()} \n\
            本月第 #{reply} 次夜间打卡。 \n打卡了一定要睡觉喔。 \n祝您做个美梦。 \n晚安。"
          bot.sendMessage(msg.from.id, night)
  # 00:00 ~ 06:00
  else if date.getHours() >= 0 && date.getHours() < 6
    bot.sendMessage msg.from.id, "已错过打卡时间，下次打卡时间为 6:00 ~ 9:00"
    return
  # 9:00 ~ 22:00
  else if date.getHours() >= 9 && date.getHours() < 22
    bot.sendMessage msg.from.id, "已错过打卡时间，下次打卡时间为 22:00 ~ 24:00"
  return
