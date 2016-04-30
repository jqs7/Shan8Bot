package main

import (
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"gopkg.in/telegram-bot-api.v4"
)

func check(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	rand.Seed(time.Now().UnixNano())
	switch {
	case timeBetween(msg.Time(), 6, 0, 8, 0):
		key := fmt.Sprintf("Shan8Bot:morning:%d", msg.From.ID)
		timeLast := strToTime(r.HGet(key, "last").Val())
		if isSameDate(timeLast, msg.Time()) {
			i := rand.Intn(20) + 1
			addK(bot, msg.From, -i)
			sendMsg(bot, msg.From.ID, "打卡一次就够了  ∑(°口°๑)\n"+
				conf.KNegative[rand.Intn(len(conf.KNegative))], i)
		} else {
			max := 25 - ((msg.Time().Hour()-6)*60+msg.Time().Minute())/5
			randK := rand.Intn(max) + 1

			r.HSet(key, "last", timeToStr(msg.Time()))
			r.HIncrBy(key, msg.Time().Format("2006:01"), 1).Val()
			addK(bot, msg.From, randK)
			r.RPush("Shan8Bot:morning:list:"+msg.Time().Format("2006:01:02"),
				strconv.Itoa(msg.From.ID))

			sendMsg(bot, msg.From.ID,
				conf.MorningTexts[rand.Intn(len(conf.MorningTexts))]+"\n"+
					conf.KPositive[rand.Intn(len(conf.KPositive))], randK)
		}
	case timeBetween(msg.Time(), 21, 30, 23, 30):
		key := fmt.Sprintf("Shan8Bot:night:%d", msg.From.ID)
		timeLast := strToTime(r.HGet(key, "last").Val())
		if isSameDate(timeLast, msg.Time()) {
			i := rand.Intn(20) + 1
			addK(bot, msg.From, -i)
			sendMsg(bot, msg.From.ID, "打卡一次就够了  ∑(°口°๑)\n"+
				conf.KNegative[rand.Intn(len(conf.KNegative))], i)
		} else {
			max := 25 - ((msg.Time().Hour()-21)*60+msg.Time().Minute()-30)/5
			randK := rand.Intn(max) + 1

			r.HSet(key, "last", timeToStr(msg.Time()))
			r.HIncrBy(key, msg.Time().Format("2006:01"), 1).Val()
			addK(bot, msg.From, randK)

			sendMsg(bot, msg.From.ID,
				conf.NightTexts[rand.Intn(len(conf.NightTexts))]+"\n"+
					conf.KPositive[rand.Intn(len(conf.KPositive))], randK)
		}
	default:
		randK := 0
		for {
			randK = 2 - rand.Intn(23)
			if randK != 0 {
				break
			}
		}
		addK(bot, msg.From, randK)
		var KText string
		if randK < 0 {
			KText = fmt.Sprintf(conf.KNegative[rand.Intn(len(conf.KNegative))], -randK)
		} else {
			KText = fmt.Sprintf(conf.KPositive[rand.Intn(len(conf.KPositive))], randK)
		}
		sendMsg(bot, msg.From.ID,
			conf.NormalTexts[rand.Intn(len(conf.NormalTexts))]+"\n"+KText)
	}
}

func morningRank(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	key := fmt.Sprintf("Shan8Bot:morning:list:%s", msg.Time().Format("2006:01:02"))
	listLen := r.LLen(key).Val()
	if listLen > 10 {
		listLen = 10
	}
	if listLen == 0 {
		sendMsg(bot, msg.From.ID, "今天还木有人打卡呢 ( ﾟ∀ﾟ)")
		return
	}
	result := "今日早起排行榜：\n"
	ranks := r.LRange(key, 0, listLen-1).Val()
	for i, v := range ranks {
		username := r.HGet("Shan8Bot:idToUsername", v).Val()
		if username == "" {
			username = v
		}
		if i == 0 {
			result += fmt.Sprintf("%d. %s  ☀\n", i+1, username)
		} else {
			result += fmt.Sprintf("%d. %s \n", i+1, username)
		}
	}
	sendMsg(bot, msg.From.ID, result)
}

func KRank(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	result := "氪拉排行榜\n"
	for i, v := range r.ZRevRangeWithScores("Shan8Bot:K", 0, 9).Val() {
		username := r.HGet("Shan8Bot:idToUsername", v.Member.(string)).Val()
		if username == "" {
			username = v.Member.(string)
		}
		switch i {
		case 0:
			result += fmt.Sprintf("%d. %s [ %0.f 氪拉 ] 🎀\n", i+1, username, v.Score)
		case 1:
			result += fmt.Sprintf("%d. %s [ %0.f 氪拉 ] 🔥\n", i+1, username, v.Score)
		default:
			result += fmt.Sprintf("%d. %s [ %0.f 氪拉 ]\n", i+1, username, v.Score)
		}
	}
	sendMsg(bot, msg.From.ID, result)
}

func morningCount(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	mKey := fmt.Sprintf("Shan8Bot:morning:%d", msg.From.ID)
	count, _ := r.HGet(mKey, msg.Time().Format("2006:01")).Int64()
	last := r.HGet(mKey, "last").Val()
	sendMsg(bot, msg.From.ID, "本月早上一共打卡 %d 次。\n最后一次打卡时间: %s",
		count, strToTime(last).Format("2006.01.02 15:04:05"))
}

func nightCount(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	nKey := fmt.Sprintf("Shan8Bot:night:%d", msg.From.ID)
	count := r.HGet(nKey, msg.Time().Format("2006:01")).Val()
	last := r.HGet(nKey, "last").Val()
	sendMsg(bot, msg.From.ID, "本月晚上一共打卡 %s 次。\n最后一次打卡时间: %s",
		count, strToTime(last).Format("2006.01.02 15:04:05"))
}

func totalCount(msg *tgbotapi.Message, bot *tgbotapi.BotAPI) {
	mKey := fmt.Sprintf("Shan8Bot:morning:%d", msg.From.ID)
	nKey := fmt.Sprintf("Shan8Bot:night:%d", msg.From.ID)
	KKey := "Shan8Bot:K"
	mCount, _ := r.HGet(mKey, msg.Time().Format("2006:01")).Int64()
	nCount, _ := r.HGet(nKey, msg.Time().Format("2006:01")).Int64()
	k := r.ZScore(KKey, strconv.Itoa(msg.From.ID)).Val()
	rank := r.ZRevRank(KKey, strconv.Itoa(msg.From.ID)).Val()
	sendMsg(bot, msg.From.ID, "ヽ(*･ᗜ･)ﾉ\n"+
		"早上打卡 %d 次 \n"+
		"晚上打卡 %d 次\n"+
		"这个月一共打卡 %d 次。\n"+
		"氪拉余额： %d 排名： %d", mCount, nCount, mCount+nCount, int(k), rank+1)
}
