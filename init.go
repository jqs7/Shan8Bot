package main

import (
	"log"
	"math/rand"
	"time"

	"github.com/BurntSushi/toml"
	"github.com/carlescere/scheduler"

	"gopkg.in/fsnotify.v1"
	"gopkg.in/redis.v3"
)

var r *redis.Client

func init() {
	confName := "conf.toml"
	confWatcher(confName)
	loadConf(confName)

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

func confWatcher(confName string) {
	watcher, err := fsnotify.NewWatcher()
	exitIfErr(err)
	go func() {
		for {
			select {
			case event := <-watcher.Events:
				if event.Op == fsnotify.Write {
					loadConf(confName)
				}
			case err := <-watcher.Errors:
				if err != nil {
					log.Println("error:", err)
				}
			}
		}
	}()
	err = watcher.Add(confName)
	exitIfErr(err)
}

func loadConf(confName string) {
	_, err := toml.DecodeFile(confName, &conf)
	exitIfErr(err)
}
