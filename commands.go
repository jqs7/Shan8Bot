package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"gopkg.in/telegram-bot-api.v4"
)

func idLogger(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	r.HSet("Shan8Bot:idToUsername",
		strconv.Itoa(msg.From.ID), userName(msg.From))
	r.HSet("Shan8Bot:usernameToID",
		userName(msg.From), strconv.Itoa(msg.From.ID))
}

func setTitle(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	if r.ZScore("Shan8Bot:K", strconv.Itoa(msg.From.ID)).Val() < 20 {
		sendMsg(bot, msg.From.ID, "真可惜，氪拉值不够呢~ (｡･ω･)ﾉ")
		return
	}

	if err := r.ZIncrBy("Shan8Bot:K", -20,
		strconv.Itoa(msg.From.ID)).Err(); err != nil {

		sendMsg(bot, msg.From.ID, "氪拉扣除失败, 请稍后重试")
		return
	}

	sendMsgToMasters(bot, "%s (id: %d) \n请求将群名设置为:\n %s",
		userName(msg.From), msg.From.ID, msg.CommandArguments())

	replys := []string{"您使用了改群名的功能，我吃掉了 20 氪拉。",
		"Magic!!!\n群名并没有改然而你还是没有了 20 氪拉。\n有延迟，有延迟！！！"}
	sendMsg(bot, msg.From.ID, replys[rand.Intn(len(replys))])
}

func titleCommand(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	var date time.Time
	if msg.CommandArguments() != "" {
		var err error
		date, err = time.Parse("20060102", msg.CommandArguments())
		if err != nil {
			sendMsg(bot, msg.From.ID, "日期格式输入有误")
			return
		}
	} else {
		date = msg.Time()
	}
	key := fmt.Sprintf("Shan8Bot:ChatTitle:%d", msg.Chat.ID)
	field := date.Format("2006:01:02")
	resultDate := date.Format("2006年1月2日")
	titles := []string{}
	titlesJSON := []byte(r.HGet(key, field).Val())
	json.Unmarshal(titlesJSON, &titles)
	if len(titles) == 0 {
		sendMsg(bot, msg.Chat.ID, resultDate+" 并没有记录 (*ﾟーﾟ)")
	} else {
		sendMsg(bot, msg.Chat.ID, "%s 群名记录：\n%s",
			resultDate, strings.Join(titles, "\n"))
	}
}

func kick(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	_, err := bot.KickChatMember(tgbotapi.ChatMemberConfig{ChatID: msg.Chat.ID,
		UserID: msg.ReplyToMessage.From.ID})
	if err != nil {
		sendMsg(bot, msg.Chat.ID, err.Error())
	}
}

func titleLogger(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	key := fmt.Sprintf("Shan8Bot:ChatTitle:%d", msg.Chat.ID)
	field := msg.Time().Format("2006:01:02")
	titles := []string{}
	titlesJSON := []byte(r.HGet(key, field).Val())
	json.Unmarshal(titlesJSON, &titles)
	titles = append(titles, msg.NewChatTitle)
	titlesJSON, err := json.Marshal(titles)
	if err != nil {
		log.Println(err)
		return
	}
	r.HSet(key, field, string(titlesJSON))
}

func newMember(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	key := fmt.Sprintf("Shan8Bot:welcome:%d", msg.Chat.ID)
	val := r.Get(key).Val()
	if val != "" {
		username := userName(msg.NewChatMember)
		sendMsg(bot, msg.Chat.ID, conf.WelcomeText, username)
	}
}

func welcome(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	key := fmt.Sprintf("Shan8Bot:welcome:%d", msg.Chat.ID)
	val := r.Get(key).Val()
	if val != "" {
		if err := r.Del(key).Err(); err != nil {
			sendMsg(bot, msg.Chat.ID, "command failed...")
			return
		}
		sendMsg(bot, msg.Chat.ID, "welcome disabled")
	} else {
		if err := r.Set(key, true, -1).Err(); err != nil {
			sendMsg(bot, msg.Chat.ID, "command failed...")
			return
		}
		sendMsg(bot, msg.Chat.ID, "welcome enabled")
	}
}
