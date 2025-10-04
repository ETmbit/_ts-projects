////////////////////////////
//########################//
//##                    ##//
//##  match-arbiter.ts  ##//
//##                    ##//
//########################//
////////////////////////////

let TimerEvent = false  // count down timer finished, thus raise an event
let TimerAbort = false  // abort count down timer
let TimerDelay = 0      // count down timer remaining time
let GameOverTime = 0    // game over timer
let PauseTime = 0       // pause timer

let GAMETIME = 5        // total game time in minutes
let TIME = 0            // remaining game time in minutes
let GAMEON = false      // the game is going on
let PAUSED = false      // the game is paused

pins.setPull(DigitalPin.P5, PinPullMode.PullUp)
pins.setPull(DigitalPin.P8, PinPullMode.PullUp)
pins.setPull(DigitalPin.P9, PinPullMode.PullUp)
pins.setPull(DigitalPin.P11, PinPullMode.PullUp)
pins.setPull(DigitalPin.P12, PinPullMode.PullUp)
pins.setPull(DigitalPin.P13, PinPullMode.PullUp)
pins.setPull(DigitalPin.P14, PinPullMode.PullUp)
pins.setPull(DigitalPin.P15, PinPullMode.PullUp)

const PIN_START_PLAY = DigitalPin.P5
const PIN_STOP_PLAY = DigitalPin.P8
const PIN_START_COUNTER = DigitalPin.P15
const PIN_STOP_COUNTER = DigitalPin.P9
const PIN_DISQ_GREEN = DigitalPin.P11
const PIN_DISQ_BLUE = DigitalPin.P14
const PIN_DISA_GREEN = DigitalPin.P12
const PIN_DISA_BLUE = DigitalPin.P13

function whistle(cnt: number = 1) {
    while (cnt) {
        for (let i = 0; i < 30; i++) {
            music.ringTone(3000)
            basic.pause(8)
            music.stopAllSounds()
            basic.pause(8)
        }
        basic.pause(250)
        cnt--
    }
}

showHandler = () => {
    if (PAUSED)
        basic.showString("P")
    else
        if (GAMEON)
            basic.showNumber(TIME)
        else
            basic.showString("A")
}

function init() {
    MATCH = MatchMessage.Reset

    TimerEvent = false
    TimerAbort = false
    TimerDelay = 0
    GameOverTime = 0
    PauseTime = 0

    TIME = 0
    GAMEON = false
    PAUSED = false

    POINTSGREEN = 0
    POINTSBLUE = 0

    PLAYER = ARBITER

    showHandler()
}
init()

pointHandler = () => {
    whistle()
    MATCH = MatchMessage.Stop
    radio.sendNumber(MatchMessage.Stop)
    PAUSED = true
    showHandler()
}

control.runInParallel(function () {
    while (true) {
        if (TimerDelay) {
            TimerAbort = false
            while (TimerDelay && !TimerAbort) {
                basic.pause(800) // + 200 msec for basic.showNumber makes 1 sec
                TimerDelay -= 1
                if (TimerDelay)
                    basic.showNumber(TimerDelay)
            }
            showHandler()
            TimerDelay = 0
            if (!TimerAbort) {
                TimerEvent = true
            }
        }
        else
            basic.pause(1)
    }
})

basic.forever(function () {
    if (TimerEvent) {
        // obstruction
        MATCH = MatchMessage.Stop
        whistle()
        radio.sendNumber(MatchMessage.Stop)
        TimerEvent = false
        PAUSED = true
        showHandler()
    }

    if (GAMEON && !PauseTime) {
        let tm = Math.floor((GameOverTime - control.millis()) / 60000) + 1
        if (tm != TIME) {
            TIME = tm
            showHandler()
        }
        if (!TIME) {
            // game over
            MATCH = MatchMessage.Stop
            whistle(3)
            radio.sendNumber(MatchMessage.GameOver)
            GAMEON = false
            PAUSED = true
            showHandler()
        }
    }

    if (!(pins.digitalReadPin(PIN_START_PLAY))) {
        // start playing
        MATCH = MatchMessage.Play
        if (PauseTime) {
            GameOverTime += (control.millis() - PauseTime)
            PauseTime = 0
        }
        whistle()
        radio.sendNumber(MatchMessage.Play)
        PAUSED = false
        if (!GAMEON) {
            GAMEON = true
            TIME =  GAMETIME
            GameOverTime = control.millis() + TIME * 60000
        }
        showHandler() // + debounce
    }
    else
        if (!(pins.digitalReadPin(PIN_STOP_PLAY))) {
            TimerAbort = true
            if (PAUSED) {
                // reset playing
                init()
                radio.sendNumber(MatchMessage.Reset)
            }
            else {
                // pause playing
                MATCH = MatchMessage.Stop
                PauseTime = control.millis()
                whistle()
                radio.sendNumber(MatchMessage.Stop)
                PAUSED = true
            }
            showHandler() // + debounce
        }

    if (!GAMEON) return

    if (!(pins.digitalReadPin(PIN_START_COUNTER))) {
        // start obstruction count down
        if (GAMEON && !PAUSED)
            TimerDelay = 10 // seconds
        basic.pause(500) // debounce
    }
    else
        if (!(pins.digitalReadPin(PIN_STOP_COUNTER))) {
            // abort obstruction count down
            TimerAbort = true
            basic.pause(500) // debounce
        }
        else
            if (!(pins.digitalReadPin(PIN_DISQ_GREEN))) {
                // disqualify Green
                MATCH = MatchMessage.DisqualGreen
                whistle()
                radio.sendNumber(MatchMessage.DisqualGreen)
                PAUSED = true
                showHandler() // + debounce
            }
            else
                if (!(pins.digitalReadPin(PIN_DISQ_BLUE))) {
                    // disqualify blue
                    MATCH = MatchMessage.DisqualBlue
                    whistle()
                    radio.sendNumber(MatchMessage.DisqualBlue)
                    PAUSED = true
                    showHandler() // + debounce
                }
                else
                    if (!(pins.digitalReadPin(PIN_DISA_GREEN))) {
                        // disallow Green
                        MATCH = MatchMessage.DisallowGreen
                        if (POINTSGREEN > 0) POINTSGREEN -= 1
                        radio.sendNumber(MatchMessage.DisallowGreen)
                        basic.pause(500) // debounce
                    }
                    else
                        if (!(pins.digitalReadPin(PIN_DISA_BLUE))) {
                            // disallow blue
                            MATCH = MatchMessage.DisallowBlue
                            if (POINTSBLUE > 0) POINTSBLUE -= 1
                            radio.sendNumber(MatchMessage.DisallowBlue)
                            basic.pause(500) // debounce
                        }
})
