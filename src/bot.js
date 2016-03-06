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

function isSameDate(date, last) {
    if (date.getFullYear() === last.getFullYear()
        && date.getMonth() === last.getMonth()
        && date.getDate() === last.getDate()) {
        return true;
    }
    return false;
}

// check-in
bot.onText(/^(嘀|滴|打卡|签到|di)(.*)/, (msg) => {
    const date = new Date(msg.date * 1000);
    const hour = date.getHours();
    switch (true) {
        case (hour >= 0 && hour < 6):
            bot.sendMessage(msg.from.id, "已错过打卡时间，下次打卡时间为 6:00 ~ 9:00");
            break;
        case (hour >= 6 && hour < 9): {
            const key = `Shan8Bot:morning:${msg.from.id}`;
            async.waterfall([(next) => {
                r.hget(key, "last", next);
            }, (obj, next) => {
                const last = new Date(obj * 1000);
                if (obj != null && isSameDate(date, last)) {
                    bot.sendMessage(msg.from.id, `早安卡已获取\n时间为 ${last.formattedTime() }`);
                } else next(null, null)
            }, (obj, next) => {
                r.hset(key, "last", msg.date);
                r.hincrby(key, `${date.getFullYear() }:${date.getMonth() }`, 1, next);
            }, (obj, next) => {
                bot.sendMessage(msg.from.id, `早呀早呀 (ฅ'ω'ฅ)​\n这是你这个月第 ${obj} 次打卡哟。\n今天又是美好的一天！`);
            }]);
            break;
        }
        case (hour >= 9 && hour < 21): {
            bot.sendMessage(msg.from.id, "已错过打卡时间，下次打卡时间为 22:00 ~ 24:00");
            break;
        }
        case (hour >= 21 && hour < 22): {
            bot.sendMessage(msg.from.id, `呵呵。那么早乱打什么卡。滚。`);
            break;
        }
        case (hour >= 22 && hour < 24): {
            const key = `Shan8Bot:night:${msg.from.id}`;
            async.waterfall([(next) => {
                r.hget(key, "last", next);
            }, (obj, next) => {
                const last = new Date(obj * 1000);
                if (obj != null && isSameDate(date, last)) {
                    bot.sendMessage(msg.from.id, `晚安卡已获取\n时间为 ${last.formattedTime() }`);
                } else next(null, null)
            }, (obj, next) => {
                switch (hour) {
                    case 22:
                        const randKey = `Shan8Bot:night:rand:${msg.from.id}:${date.getMonth() }-${date.getDate() }`
                        async.waterfall([(next) => {
                            r.incrby(randKey, 1, next);
                            r.expire(randKey, 60 * 60 * 3);
                        }, (obj, next) => {
                            const randTimes = Math.ceil(Math.random() * 8 + 2);
                            if (obj === 1) {
                                bot.sendMessage(msg.from.id, `那么早打什么卡！\n` +
                                    `打了又不睡，搞笑咧。睡什么睡，插秧！哈哈哈哈哈。`);
                            } else if (obj >= randTimes) {
                                r.hset(key, "last", msg.date);
                                r.hincrby(key, `${date.getFullYear() }:${date.getMonth() }`, 1, (err, reply) => {
                                    bot.sendMessage(msg.from.id, `真的要睡啦 ଘ(੭ˊ꒳​ˋ)੭✧\n那晚安哦。\n` +
                                        `这是你这个月晚上第 ${reply} 次打卡。\n弯弯弯。\n`);
                                });
                            } else {
                                const randTexts = [`都叫你现在先别睡啦还有那么多秧苗子要插呢。\n` +
                                    `让我们沐浴在月光下开心的插秧子吧\n( •̀ᄇ• ́)ﻭ✧`, "🙄", "😚",
                                    "☺️", "😊", "😐", "😒", "😃", "💅🏻", "👙", "🙉", "🙈", "💋",
                                    "🖖🏻", "👍🏻", "👰🏼", "🐳", "🌙", "✨", "⭐️", "💥", "🍺",
                                    "🍔", "🧀", "🍳", "🌶", "🍓", "🍉", "🍌", "🍋", "🍎", "🍊",
                                    "🍐", "👾", "🍩", "🍪", "🍬", "💊", "💉", "🎉", "🎈", "🎊",
                                    "⚠️", "〰", "💭", "😶", "👻", "不吃点宵夜吗？", "(=ﾟωﾟ)=",
                                    "(・∀・)", "(ゝ∀･)", "(〃∀〃)", "( ﾟ∀。)", "(`ヮ´ )",
                                    "| ω・´)", "(｢・ω・)｢", "⊂彡☆))∀`)", "(ﾟДﾟ≡ﾟДﾟ)", "( ` ・´)"]
                                bot.sendMessage(msg.from.id, randTexts[Math.floor(Math.random() * randTexts.length)]);
                            }
                        }]);
                        break;
                    case 23:
                        r.hset(key, "last", msg.date);
                        r.hincrby(key, `${date.getFullYear() }:${date.getMonth() }`, 1, (err, reply) => {
                            bot.sendMessage(msg.from.id, `哦，晚安。`)
                        });
                        break;
                }
            }]);
            break;
        }
        default: {
            bot.sendMessage(msg.from.id, `(=ﾟωﾟ)=`);
            break;
        }
    }
});

// morning count
bot.onText(/^🐥/, (msg) => {
    const date = new Date(msg.date * 1000);
    const mKey = `Shan8Bot:morning:${msg.from.id}`;
    async.waterfall([(next) => {
        r.hget(mKey, `${date.getFullYear() }:${date.getMonth() }`, next);
    }, (obj, next) => {
        let mCount;
        if (!obj) mCount = 0
        else mCount = obj
        r.hget(mKey, "last", (err, obj) => { next(err, mCount, obj); });
    }, (mCount, obj, next) => {
        let resultMsg = `本月早上一共打卡 ${mCount} 次。\n`;
        if (obj) {
            const last = new Date(obj * 1000);
            resultMsg += `最后一次打卡时间: ${last.formattedTime() }`
        }
        next(null, resultMsg);
    }, (resultMsg, next) => {
        bot.sendMessage(msg.from.id, resultMsg);
    }]);
});

// night count
bot.onText(/^🐣/, (msg) => {
    const date = new Date(msg.date * 1000);
    const nKey = `Shan8Bot:night:${msg.from.id}`;
    async.waterfall([(next) => {
        r.hget(nKey, `${date.getFullYear() }:${date.getMonth() }`, next);
    }, (obj, next) => {
        let nCount;
        if (!obj) nCount = 0
        else nCount = obj
        r.hget(nKey, "last", (err, obj) => { next(err, nCount, obj); });
    }, (nCount, obj, next) => {
        let resultMsg = `本月晚上一共打卡 ${nCount} 次。\n`;
        if (obj) {
            const last = new Date(obj * 1000);
            resultMsg += `最后一次打卡时间: ${last.formattedTime() }`
        }
        next(null, resultMsg);
    }, (resultMsg, next) => {
        bot.sendMessage(msg.from.id, resultMsg);
    }]);
});

// total count
bot.onText(/^🐤/, (msg) => {
    const date = new Date(msg.date * 1000);
    const mKey = `Shan8Bot:morning:${msg.from.id}`;
    const nKey = `Shan8Bot:night:${msg.from.id}`;
    async.waterfall([(next) => {
        r.hget(mKey, `${date.getFullYear() }:${date.getMonth() }`, next);
    }, (obj, next) => {
        let mCount;
        if (!obj) mCount = 0
        else mCount = obj
        r.hget(nKey, `${date.getFullYear() }:${date.getMonth() }`, (err, obj) => { next(err, mCount, obj); });
    }, (mCount, obj, next) => {
        let nCount;
        if (!obj) nCount = 0
        else nCount = obj
        next(null, mCount, nCount);
    }, (mCount, nCount, next) => {
        bot.sendMessage(msg.from.id, `ヽ(*･ᗜ･)ﾉ早上打卡 ${mCount} 次 \n晚上打卡 ${nCount} 次ヽ(･ᗜ･* )ﾉ\n` +
            `这个月你居然一共打卡 ${parseInt(mCount) + parseInt(nCount) } 次哎哟喂我的天了噜。`);
    }])
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
            if (titles) titles.push(newTitle);
            else titles = [newTitle];
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
        if (err) console.log(err);
        else bot.sendMessage(msg.from.id, result);
    });
});

// start command
bot.onText(/^\/start$/, (msg) => {
    bot.sendMessage(msg.from.id, conf.startText);
});

// new member join in the chat
bot.on('new_chat_participant', (msg) => {
    const key = `Shan8Bot:welcome:${msg.chat.id}`
    async.waterfall([(next) => {
        r.get(key, next);
    }, (obj, next) => {
        const newUser = msg.new_chat_participant;
        const name = newUser.last_name ? newUser.first_name + ' ' + newUser.last_name : newUser.first_name;
        const username = newUser.username ? '@' + newUser.username : name;
        next(null, conf.welcomeText.replace('$username', username));
    }], (err, result) => {
        if (err) console.log(err);
        else bot.sendMessage(msg.chat.id, result);
    });
});

// toggle new member welcome
bot.onText(/\/welcome/, (msg) => {
    if (isGroup(msg) && isMaster(msg)) {
        const key = `Shan8Bot:welcome:${msg.chat.id}`
        async.waterfall([(next) => {
            r.get(key, next);
        }, (obj, next) => {
            if (obj) r.del(key, (err, obj) => { next(err, 'disabled') });
            else r.set(key, true, (err, obj) => { next(err, 'enabled') });
        }], (err, result) => {
            if (err) console.log(err);
            else bot.sendMessage(msg.chat.id, `welcome ${result}`);
        });
    }
});

console.log('bot start up!');