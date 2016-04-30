package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"gopkg.in/telegram-bot-api.v4"
)

func fromGroup(msg *tgbotapi.Message) bool {
	if msg.Chat.IsGroup() || msg.Chat.IsSuperGroup() {
		return true
	}
	return false
}

func isMaster(msg *tgbotapi.Message) bool {
	for _, master := range conf.Masters {
		if msg.From.UserName == master {
			return true
		}
	}
	return false
}

func userName(user *tgbotapi.User) string {
	var name string
	var username string
	if user.LastName != "" {
		name = user.FirstName + " " + user.LastName
	} else {
		name = user.FirstName
	}
	if user.UserName != "" {
		username = "@" + user.UserName
	} else {
		username = name
	}
	return username
}

func sendMsg(bot *tgbotapi.BotAPI, id interface{},
	format string, a ...interface{}) error {

	msg, err := buildMessage(id, format, a...)
	if err != nil {
		return err
	}
	_, err = bot.Send(msg)
	return err
}

func sendMsgToMasters(bot *tgbotapi.BotAPI, format string, a ...interface{}) {
	for _, name := range conf.Masters {
		id, err := r.HGet("Shan8Bot:usernameToID", "@"+name).Int64()
		if err == nil {
			sendMsg(bot, id, format, a...)
		}
	}
}

func addK(bot *tgbotapi.BotAPI, user *tgbotapi.User, i int) {
	val := r.ZIncrBy("Shan8Bot:K", float64(i), strconv.Itoa(user.ID)).Val()

	if val >= 1000 && val <= 1500 {
		if int(val)%100 == 0 {
			addK(bot, user, 10)
			sendMsg(bot, user.ID, "恭喜你攒了 %d 氪拉了，于是意外的发现树上挂着 10 氪拉呢。", int(val))
		}
		if int(val)%500 == 0 {
			addK(bot, user, 25)
			sendMsg(bot, user.ID, "恭喜你攒了 %d 氪拉了，于是意外的发现地上躺着 25 氪拉呢。", int(val))
		}
	}

	if val >= 2000 && val <= 4500 {
		if int(val)%100 == 0 {
			addK(bot, user, 25)
			sendMsg(bot, user.ID, "恭喜你攒了 %d 氪拉了，于是意外的发现树上挂着 25 氪拉呢。", int(val))
		}
		if int(val)%500 == 0 {
			addK(bot, user, 50)
			sendMsg(bot, user.ID, "恭喜你攒了 %d 氪拉了，于是意外的发现地上躺着 50 氪拉呢。", int(val))
		}
	}

	if val >= 5000 && val <= 10000 {
		if int(val)%100 == 0 {
			addK(bot, user, 50)
			sendMsg(bot, user.ID, "恭喜你攒了 %d 氪拉了，于是意外的发现树上挂着 50 氪拉呢。", int(val))
		}
		if int(val)%500 == 0 {
			addK(bot, user, 75)
			sendMsg(bot, user.ID, "恭喜你攒了 %d 氪拉了，于是意外的发现地上躺着 75 氪拉呢。", int(val))
		}
	}

	if val == 1234 {
		addK(bot, user, -30)
		sendMsg(bot, user.ID, "你现在的总氪拉值为 %d，于是触发了某个神奇的 bug 被吃掉了 30 氪拉呢。",
			int(val))
	}

	if val == 2333 {
		addK(bot, user, 33)
		sendMsg(bot, user.ID, "2333！\n你刚刚得到了 33 氪拉诶 (੭*ˊ꒳​ˋ)੭♡", int(val))
	}

	if val == 3838 {
		addK(bot, user, 38)
		sendMsg(bot, user.ID, "3838！\n你刚刚得到了 38 氪拉诶 (੭*ˊ꒳​ˋ)੭♡", int(val))
	}

	if val == 4444 {
		addK(bot, user, -22)
		sendMsg(bot, user.ID, "你现在的总氪拉值为 %d，于是触发了某个神奇的 bug 被吃掉了 22 氪拉呢。",
			int(val))
	}
}

func buildMessage(id interface{}, format string,
	a ...interface{}) (tgbotapi.MessageConfig, error) {

	var id64 int64
	switch id := id.(type) {
	case int:
		id64 = int64(id)
	case int64:
		id64 = id
	case string:
		var err error
		id64, err = strconv.ParseInt(id, 10, 64)
		if err != nil {
			return tgbotapi.MessageConfig{}, err
		}
	}
	return tgbotapi.NewMessage(id64, fmt.Sprintf(format, a...)), nil
}

func isSameDate(t1, t2 time.Time) bool {
	y1, m1, d1 := t1.Date()
	y2, m2, d2 := t2.Date()
	if y1 == y2 && m1 == m2 && d1 == d2 {
		return true
	}
	return false
}

func timeToStr(t time.Time) string {
	s, _ := json.Marshal(t)
	return string(s)
}

func strToTime(s string) (t time.Time) {
	json.Unmarshal([]byte(s), &t)
	return
}

func exitIfErr(err error) {
	if err != nil {
		log.Fatalln(err)
		os.Exit(1)
	}
}

func timeAfter(t time.Time, h, m int) bool {
	switch {
	case t.Hour() > h:
		return true
	case t.Hour() == h:
		if t.Minute() > m {
			return true
		} else {
			return false
		}
	default:
		return false
	}
}

func timeBetween(t time.Time, h1, m1, h2, m2 int) bool {
	return timeAfter(t, h1, m1) && !timeAfter(t, h2, m2)
}
