"use strict";

const tg = require('node-telegram-bot-api');
const redis = require('redis');
const conf = require('../config.json');

// init bot api
const bot = new tg(conf.botAPI, {polling: true});
// init redis
const r = redis.createClient();
r.auth(conf.redisPass);
// date formatter
Date.prototype.formattedTime = function () {
  const zeroFormat = (d)=> {
    return ("0" + d).substr(-2);
  };
  const month = zeroFormat(this.getMonth() + 1);
  const day = zeroFormat(this.getDate());
  const hours = zeroFormat(this.getHours());
  const minutes = zeroFormat(this.getMinutes());
  const seconds = zeroFormat(this.getSeconds());
  return `${this.getFullYear()}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

// check-in
bot.onText(/^(滴|打卡|签到|di)(.*)/, (msg, _)=> {
  const date = new Date(msg.date * 1000);
  // 6:00 ~ 9:00
  if (date.getHours() >= 6 && date.getHours() < 9) {
    const key = `Shan8Bot:morning:${msg.from.id}`;
    r.hget(key, "last", (err, obj)=> {
      if (obj !== null) {
        const last = new Date(obj * 1000);
        if (date.getFullYear() === last.getFullYear()
          && date.getMonth() === last.getMonth()
          && date.getDay() === last.getDay()) {
          bot.sendMessage(msg.from.id, `早安卡已获取\n时间为 ${last.formattedTime()}`);
          return
        }
      }
      r.hset(key, "last", msg.date, redis.print);
      r.hincrby(key, `${date.getFullYear()}:${date.getMonth()}`, 1, (err, reply)=> {
        redis.print(err, reply);
        bot.sendMessage(msg.from.id, `早上好! \n您已顺利的打卡成功。 \n时间为 ${date.formattedTime()} \n
        这是您本月的第 ${reply} 次晨间打卡。 \n今天又是美好的一天！ \n祝您生活愉快一切顺利。 `);
      });
    });
    // 22:00 ~ 24:00
  } else if (date.getHours() >= 22 && date.getHours() < 24) {
    const key = `Shan8Bot:night:${msg.from.id}`;
    r.hget(key, "last", (err, obj)=> {
      if (obj !== null) {
        const last = new Date(obj * 1000);
        if (date.getFullYear() === last.getFullYear()
          && date.getMonth() === last.getMonth()
          && date.getDay() === last.getDay()) {
          bot.sendMessage(msg.from.id, `晚安卡已获取\n时间为 ${last.formattedTime()}`);
          return
        }
      }
      r.hset(key, "last", msg.date, redis.print);
      r.hincrby(key, `${date.getFullYear()}:${date.getMonth()}`, 1, (err, reply)=> {
        redis.print(err, reply);
        bot.sendMessage(msg.from.id, `Bingbo!!! \n您已顺利的打卡成功。 \n时间为 ${date.formattedTime()} \n
            这是您本月的第 ${reply} 次夜间打卡。 \n打卡了一定要睡觉喔。 \n祝您做个美梦。 \n晚安。`);
      });
    });
    // 00:00 ~ 06:00
  } else if (date.getHours() >= 0 && date.getHours() < 6) {
    bot.sendMessage(msg.from.id, "已错过打卡时间，下次打卡时间为 6:00 ~ 9:00");
    // 9:00 ~ 22:00
  } else {
    bot.sendMessage(msg.from.id, "已错过打卡时间，下次打卡时间为 22:00 ~ 24:00");
  }
});