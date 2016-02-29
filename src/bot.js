"use strict";

const Bot = require('node-telegram-bot-api');
const async = require('async');
const redis = require('redis');
const conf = require('../config.json');

// init bot api
const bot = new Bot(conf.botAPI, { polling: true });

// init redis
const r = redis.createClient();
r.auth(conf.redisPass);

// date formatter
Date.prototype.formattedTime = function () {
    const zeroFormat = (d) => {
        return ("0" + d).substr(-2);
    };
    const month = zeroFormat(this.getMonth() + 1);
    const day = zeroFormat(this.getDate());
    const hours = zeroFormat(this.getHours());
    const minutes = zeroFormat(this.getMinutes());
    const seconds = zeroFormat(this.getSeconds());
    return `${this.getFullYear() }.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

// check if msg is from a group
function isGroup(msg) {
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        return true;
    }
    return false;
}

// check msg is from master
function isMaster(msg) {
    if (conf.masters.indexOf(msg.from.username) > -1) {
        return true;
    }
    return false;
}

// check-in
bot.onText(/^(滴|打卡|签到|di)(.*)/, (msg, _) => {
    const date = new Date(msg.date * 1000);
    // 6:00 ~ 9:00
    if (date.getHours() >= 6 && date.getHours() < 9) {
        const key = `Shan8Bot:morning:${msg.from.id}`;
        r.hget(key, "last", (err, obj) => {
            if (obj != null) {
                const last = new Date(obj * 1000);
                if (date.getFullYear() === last.getFullYear()
                    && date.getMonth() === last.getMonth()
                    && date.getDay() === last.getDay()) {
                    bot.sendMessage(msg.from.id, `早安卡已获取\n时间为 ${last.formattedTime() }`);
                    return
                }
            }
            r.hset(key, "last", msg.date, redis.print);
            r.hincrby(key, `${date.getFullYear() }:${date.getMonth() }`, 1, (err, reply) => {
                redis.print(err, reply);
                bot.sendMessage(msg.from.id,
                    `早上好! \n您已顺利的打卡成功。 \n时间为 ${date.formattedTime() } \n` +
                    `这是您本月的第 ${reply} 次晨间打卡。 \n今天又是美好的一天！ \n祝您生活愉快一切顺利。 `);
            });
        });
        // 22:00 ~ 24:00
    } else if (date.getHours() >= 22 && date.getHours() < 24) {
        const key = `Shan8Bot:night:${msg.from.id}`;
        r.hget(key, "last", (err, obj) => {
            if (obj != null) {
                const last = new Date(obj * 1000);
                if (date.getFullYear() === last.getFullYear()
                    && date.getMonth() === last.getMonth()
                    && date.getDay() === last.getDay()) {
                    bot.sendMessage(msg.from.id, `晚安卡已获取\n时间为 ${last.formattedTime() }`);
                    return
                }
            }
            r.hset(key, "last", msg.date, redis.print);
            r.hincrby(key, `${date.getFullYear() }:${date.getMonth() }`, 1, (err, reply) => {
                redis.print(err, reply);
                bot.sendMessage(msg.from.id,
                    `Bingbo!!! \n您已顺利的打卡成功。 \n时间为 ${date.formattedTime() } \n` +
                    `这是您本月的第 ${reply} 次夜间打卡。 \n打卡了一定要睡觉喔。 \n祝您做个美梦。 \n晚安。`);
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

// chat title logger
bot.on('new_chat_title', (msg) => {
    if (isGroup(msg)) {
        const newTitle = msg.new_chat_title;
        const date = new Date(msg.date * 1000);
        const key = `Shan8Bot:ChatTitle:${msg.chat.id}`;
        const field = `${date.getFullYear() }:${date.getMonth() }:${date.getDate() }`;
        async.waterfall([(next) => {
            r.hget(key, field, next);
        }, (obj, next) => {
            let titles = JSON.parse(obj);
            if (titles)
                titles.push(newTitle);
            else
                titles = [newTitle];
            next(null, JSON.stringify(titles));
        }, (titles, next) => {
            r.hset(key, field, titles, next);
        }], (err, _) => {
            if (err) console.log(err);
        });
    }
});

// titles bot command
bot.onText(new RegExp(`^/titles(@${conf.botName})?( (.*))?$`), (msg, data) => {
    let date;
    let field;
    const key = `Shan8Bot:ChatTitle:${msg.chat.id}`;
    if (data[3]) {
        date = new Date(data[3]);
        field = `${date.getFullYear() }:${date.getMonth() }:${date.getDate() }`;
    } else {
        date = new Date(msg.date * 1000);
        field = `${date.getFullYear() }:${date.getMonth() }:${date.getDate() }`;
    }
    const resultDate = `${date.getFullYear() }年${date.getMonth() + 1}月${date.getDate() }日`;
    async.waterfall([(next) => {
        r.hget(key, field, next);
    }, (obj, next) => {
        if (obj) {
            const titles = JSON.parse(obj);
            next(null, `${resultDate} 群名记录：\n${titles.join('\n') }`);
        } else {
            next(null, `${resultDate} 并没有记录 (*ﾟーﾟ)`);
        }
    }], (err, result) => {
        if (err)
            console.log(err);
        else
            bot.sendMessage(msg.from.id, result);
    });
});

// start command
bot.onText(/^\/start$/, (msg) => {
    bot.sendMessage(msg.from.id, conf.startText);
});

// new member join in the chat
bot.on('new_chat_participant', (msg) => {
    const key = `Shan8Bot:welcome:${msg.chat.id}`
    r.get(key, (err, obj) => {
        if (obj) {
            const newUser = msg.new_chat_participant;
            const name = newUser.last_name ? newUser.first_name + ' ' + newUser.last_name : newUser.first_name;
            const username = newUser.username ? '@' + newUser.username : name;
            const welcomeText = conf.welcomeText.replace('$username', username);
            bot.sendMessage(msg.chat.id, welcomeText);
        }
    })

});

// toggle new member welcome
bot.onText(/\/welcome/, (msg) => {
    if (isGroup(msg) && isMaster(msg)) {
        const key = `Shan8Bot:welcome:${msg.chat.id}`

        async.waterfall([(next) => {
            r.get(key, next);
        }, (obj, next) => {
            if (obj)
                r.del(key, (err, obj) => { next(err, 'disabled') });
            else
                r.set(key, true, (err, obj) => { next(err, 'enabled') });
        }], (err, result) => {
            if (err)
                console.log(err);
            else
                bot.sendMessage(msg.chat.id, `welcome ${result}`);
        });
    }
});

console.log('bot start up!');