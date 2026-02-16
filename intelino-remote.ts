/*
File:      github.com/ETmbit/_ts_projects/intelino-remote.ts
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
ETmbit/general
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

enum Keys { None, K1, K2, K3, K4, K5, K6, K7, K8, K9, K10, K11, K12 }
enum Buttons { None = 0, Up = 98, Down = 99, Both = 100}

pins.digitalWritePin(DigitalPin.P0, 0)
pins.digitalWritePin(DigitalPin.P1, 0)
pins.digitalWritePin(DigitalPin.P2, 0)
pins.digitalWritePin(DigitalPin.P8, 0)
pins.digitalWritePin(DigitalPin.P9, 0)
pins.digitalWritePin(DigitalPin.P13, 0)
pins.digitalWritePin(DigitalPin.P14, 0)
pins.digitalWritePin(DigitalPin.P15, 0)
pins.digitalWritePin(DigitalPin.P16, 0)

function keyFromColumn(column: number): Keys {
    let row = -1
    pins.digitalWritePin(DigitalPin.P0, 1)
    pins.digitalWritePin(DigitalPin.P1, 1)
    pins.digitalWritePin(DigitalPin.P2, 1)
    if (pins.digitalReadPin(DigitalPin.P13)) row = 3
    if (pins.digitalReadPin(DigitalPin.P14)) row = 2
    if (pins.digitalReadPin(DigitalPin.P15)) row = 1
    if (pins.digitalReadPin(DigitalPin.P16)) row = 0
    if (row < 0) return Keys.None
    return row * 3 + column +1
}

function keyPressed(): Keys {
    pins.digitalWritePin(DigitalPin.P13, 1)
    pins.digitalWritePin(DigitalPin.P14, 1)
    pins.digitalWritePin(DigitalPin.P15, 1)
    pins.digitalWritePin(DigitalPin.P16, 1)
    if (pins.digitalReadPin(DigitalPin.P0)) return keyFromColumn(2)
    if (pins.digitalReadPin(DigitalPin.P1)) return keyFromColumn(1)
    if (pins.digitalReadPin(DigitalPin.P2)) return keyFromColumn(0)
    return Keys.None
}

function buttonPressed(): Buttons {
    let up = pins.digitalReadPin(DigitalPin.P8)
    let down = pins.digitalReadPin(DigitalPin.P9)
    if (up && down) return Buttons.Both
    if (up) return Buttons.Up
    if (down) return Buttons.Down
    return Buttons.None
}

basic.forever(function() {
    let key: Keys
    let button: Buttons
    let alt = false

    if (button = buttonPressed()) {
        while (buttonPressed()) {
            if (key = keyPressed()) {
                alt = true
                if (button == Buttons.Up)
                    ETsend("IR", (key + 12).toString())
                else
                if (button == Buttons.Down)
                    ETsend("IR", (key + 24).toString())
                while (keyPressed()) { basic.pause(1) }
            }
        }
        if (!alt)
            ETsend("IR", (button).toString())
    }

    if (key = keyPressed()) {
        ETsend("IR", (key).toString())
    }

    while (keyPressed() || buttonPressed()) { basic.pause(1) }
})
