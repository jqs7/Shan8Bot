package main

import (
	"regexp"
	"strings"
	"time"

	"gopkg.in/telegram-bot-api.v4"
)

func processor(update tgbotapi.Update, bot *tgbotapi.BotAPI) {
	if update.Message.From != nil {
		idLogger(update.Message, bot)
	}
	if update.Message.Command() == "welcome" &&
		fromGroup(update.Message) && isMaster(update.Message) {
		welcome(update.Message, bot)
	}
	if update.Message.Command() == "start" {
		msg, _ := buildMessage(update.Message.From.ID, conf.StartText)
		msg.ParseMode = tgbotapi.ModeMarkdown
		bot.Send(msg)
	}
	if update.Message.Command() == "help" {
		sendMsg(bot, update.Message.From.ID, conf.HelpText)
	}
	if update.Message.Command() == "time" {
		sendMsg(bot, update.Message.From.ID,
			time.Now().Format("2006.01.02 15:04:05"))
	}
	if update.Message.Text == "haochide" {
		msg, _ := buildMessage(update.Message.From.ID, conf.Haochide)
		msg.DisableWebPagePreview = true
		bot.Send(msg)
	}
	if update.Message.NewChatMember != nil {
		newMember(update.Message, bot)
	}
	if update.Message.NewChatTitle != "" && fromGroup(update.Message) {
		titleLogger(update.Message, bot)
	}
	if update.Message.Command() == "titles" && fromGroup(update.Message) {
		titleCommand(update.Message, bot)
	}
	if update.Message.Command() == "settitle" &&
		update.Message.CommandArguments() != "" {
		setTitle(update.Message, bot)
	}
	if regexp.MustCompile("^(嘀|滴|打卡|签到|di)(.*)$").
		MatchString(update.Message.Text) {
		check(update.Message, bot)
	}
	if strings.HasPrefix(update.Message.Text, "🐥") {
		morningCount(update.Message, bot)
	}
	if strings.HasPrefix(update.Message.Text, "🐣") {
		nightCount(update.Message, bot)
	}
	if strings.HasPrefix(update.Message.Text, "🐤") {
		totalCount(update.Message, bot)
	}
	if update.Message.Command() == "mm" {
		morningRank(update.Message, bot)
	}
	if update.Message.Command() == "kk" {
		KRank(update.Message, bot)
	}
	if update.Message.Command() == "kick" &&
		update.Message.ReplyToMessage != nil &&
		isMaster(update.Message) {
		kick(update.Message, bot)
	}
}
