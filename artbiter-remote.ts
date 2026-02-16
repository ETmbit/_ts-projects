/*
File:      github.com/ETmbit/_ts_projects/arbiter-remote.ts
Copyright: ETmbit, 2026

License:
This file is part of the ETmbit extensions for MakeCode for micro:bit.
It is free software and you may distribute it under the terms of the
GNU General Public License (version 3 or later) as published by the
Free Software Foundation. The full license text you find at
https://www.gnu.org/licenses.

Disclaimer:
ETmbit extensions are distributed without any warranty.

Dependencies:
ETmbit/general, ETmbit/match
*/

////////////////
//  INCLUDE   //
//  radio.ts  //
////////////////

/*
Use ETsend for sending messages between ETmbit modules.
The messages are parsed in the ETmbit/general module.
*/

function ETsend(id: string, msg: string) {
    // messages end with a '~'
    // messages are sent in chunks
    // mbit radio buffer size is only 19 bytes
    //
    // chunk format:
    // -------------
    // char 0..1 :   id
    // char 2..18 :  msg chunk 

    switch (id.length) {
        case 0: id = "ET"; break
        case 1: id += "#"; break
        case 2: break
        default: id = id.substr(0, 2)
    }
    let chunk: string
    do {
        chunk = msg.substr(0, 17)
        msg = msg.substr(17)
        if (chunk.length < 17)
            chunk += '~'
        radio.sendString(id + chunk)
        basic.pause(1)
    } while (msg.length > 0)
}

///////////////////
//  END INCLUDE  //
///////////////////

let ETtimerEvent = false  // count down timer finished, thus raise an event
let ETtimerAbort = false  // abort count down timer
let ETtimerDelay = 0      // count down timer remaining time
let ETgameOverTime = 0    // game over timer
let ETpauseTime = 0       // pause timer

let ETgameTime = 5        // total game time in minutes
let ETtime = 0            // remaining game time in minutes
let ETgameOn = false      // the game is going on
let ETgamePaused = false  // the game is paused

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
    if (ETgamePaused)
        basic.showString("P")
    else
        if (ETgameOn)
            basic.showNumber(ETtime)
        else
            basic.showString("A")
}

function init() {
    ETmatchMsg = MatchMessage.Reset

    ETtimerEvent = false
    ETtimerAbort = false
    ETtimerDelay = 0
    ETgameOverTime = 0
    ETpauseTime = 0

    ETtime = 0
    ETgameOn = false
    ETgamePaused = false

    ETpointsGreen = 0
    ETpointsBlue = 0

    ETplayer = ETarbiter

    showHandler()
}
init()

pointHandler = () => {
    whistle()
    ETmatchMsg = MatchMessage.Stop
    ETsend("MA", MatchMessage.Stop.toString())
    ETgamePaused = true
    showHandler()
}

control.runInParallel(function () {
    while (true) {
        if (ETtimerDelay) {
            ETtimerAbort = false
            while (ETtimerDelay && !ETtimerAbort) {
                basic.pause(800) // + 200 msec for basic.showNumber makes 1 sec
                ETtimerDelay -= 1
                if (ETtimerDelay)
                    basic.showNumber(ETtimerDelay)
            }
            showHandler()
            ETtimerDelay = 0
            if (!ETtimerAbort) {
                ETtimerEvent = true
            }
        }
        else
            basic.pause(1)
    }
})

basic.forever(function () {
    if (ETtimerEvent) {
        // obstruction
        ETmatchMsg = MatchMessage.Stop
        whistle()
        ETsend("MA", MatchMessage.Stop.toString())
        ETtimerEvent = false
        ETgamePaused = true
        showHandler()
    }

    if (ETgameOn && !ETpauseTime) {
        let tm = Math.floor((ETgameOverTime - control.millis()) / 60000) + 1
        if (tm != ETtime) {
            ETtime = tm
            showHandler()
        }
        if (!ETtime) {
            // game over
            ETmatchMsg = MatchMessage.Stop
            whistle(3)
            ETsend("MA", MatchMessage.GameOver.toString())
            ETgameOn = false
            ETgamePaused = true
            showHandler()
        }
    }

    if (!(pins.digitalReadPin(PIN_START_PLAY))) {
        // start playing
        ETmatchMsg = MatchMessage.Play
        if (ETpauseTime) {
            ETgameOverTime += (control.millis() - ETpauseTime)
            ETpauseTime = 0
        }
        whistle()
        ETsend("MA", MatchMessage.Play.toString())
        ETgamePaused = false
        if (!ETgameOn) {
            ETgameOn = true
            ETtime = ETgameTime
            ETgameOverTime = control.millis() + ETtime * 60000
        }
        showHandler() // + debounce
    }
    else
        if (!(pins.digitalReadPin(PIN_STOP_PLAY))) {
            ETtimerAbort = true
            if (ETgamePaused) {
                // reset playing
                init()
                ETsend("MA", MatchMessage.Reset.toString())
            }
            else {
                // pause playing
                ETmatchMsg = MatchMessage.Stop
                ETpauseTime = control.millis()
                whistle()
                ETsend("MA", MatchMessage.Stop.toString())
                ETgamePaused = true
            }
            showHandler() // + debounce
        }

    if (!ETgameOn) return

    if (!(pins.digitalReadPin(PIN_START_COUNTER))) {
        // start obstruction count down
        if (ETgameOn && !ETgamePaused)
            ETtimerDelay = 10 // seconds
        basic.pause(500) // debounce
    }
    else
        if (!(pins.digitalReadPin(PIN_STOP_COUNTER))) {
            // abort obstruction count down
            ETtimerAbort = true
            basic.pause(500) // debounce
        }
        else
            if (!(pins.digitalReadPin(PIN_DISQ_GREEN))) {
                // disqualify Green
                ETmatchMsg = MatchMessage.DisqualGreen
                whistle()
                ETsend("MA", MatchMessage.DisqualGreen.toString())
                ETgamePaused = true
                showHandler() // + debounce
            }
            else
                if (!(pins.digitalReadPin(PIN_DISQ_BLUE))) {
                    // disqualify blue
                    ETmatchMsg = MatchMessage.DisqualBlue
                    whistle()
                    ETsend("MA", MatchMessage.DisqualBlue.toString())
                    ETgamePaused = true
                    showHandler() // + debounce
                }
                else
                    if (!(pins.digitalReadPin(PIN_DISA_GREEN))) {
                        // disallow Green
                        ETmatchMsg = MatchMessage.DisallowGreen
                        if (ETpointsGreen > 0) ETpointsGreen -= 1
                        ETsend("MA", MatchMessage.DisallowGreen.toString())
                        basic.pause(500) // debounce
                    }
                    else
                        if (!(pins.digitalReadPin(PIN_DISA_BLUE))) {
                            // disallow blue
                            ETmatchMsg = MatchMessage.DisallowBlue
                            if (ETpointsBlue > 0) ETpointsBlue -= 1
                            ETsend("MA", MatchMessage.DisallowBlue.toString())
                            basic.pause(500) // debounce
                        }
})

function goalHandler(msg: string) {
    let val = +msg
    if (val == MatchMessage.PointGreen || val == MatchMessage.PointBlue)
        whistle()
}
General.registerMessageHandler("MA", goalHandler)
