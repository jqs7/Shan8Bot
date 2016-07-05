package main

import (
	"log"
	"math/rand"
	"time"

	"github.com/carlescere/scheduler"
	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
	"gopkg.in/redis.v3"
)

var r *redis.Client

func init() {
	viper.SetConfigName("conf")
	viper.AddConfigPath(".")
	viper.WatchConfig()
	viper.ReadInConfig()
	viper.Unmarshal(&conf)
	viper.OnConfigChange(func(e fsnotify.Event) {
		if err := viper.Unmarshal(&conf); err != nil {
			log.Println(err.Error())
		} else {
			log.Println("config auto reload!")
		}
	})

	r = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: conf.RedisPass,
	})

	scheduler.Every().Day().At("00:00").Run(func() {
		if time.Now().Day() == 1 {
			length := r.ZCard("Shan8Bot:K").Val()
			if length < 25 {
				return
			}
			i := rand.Int63n(length-25) + 25
			for _, v := range r.ZRangeWithScores("Shan8Bot:K", i, i).Val() {
				log.Println("add 100K for ", v.Member)
				r.ZIncrBy("Shan8Bot:K", 100, v.Member.(string))
			}
		}
	})
}
