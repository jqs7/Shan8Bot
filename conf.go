package main

var conf struct {
	Debug     bool
	BotAPI    string
	RedisPass string

	StartText    string
	HelpText     string
	Haochide     string
	WelcomeText  string
	MorningTexts []string
	NightTexts   []string
	NormalTexts  []string
	KPositive    []string
	KNegative    []string

	Masters []string
}
