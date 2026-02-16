/*
File:      github.com/ETmbit/_ts_projects/gamepad-remote.ts
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

///////////////////////
//  INCLUDE          //
//  gampad-enums.ts  //
///////////////////////

enum Joystick {
    //% block="none"
    //% block.loc.nl="geen"
    None,
    //% block="up"
    //% block.loc.nl="omhoog"
    Up,
    //% block="right up"
    //% block.loc.nl="rechts omhoog"
    UpRight,
    //% block="right"
    //% block.loc.nl="rechts"
    Right,
    //% block="right down"
    //% block.loc.nl="rechts omlaag"
    DownRight,
    //% block="down"
    //% block.loc.nl="omlaag"
    Down,
    //% block="left down"
    //% block.loc.nl="links omlaag"
    DownLeft,
    //% block="left"
    //% block.loc.nl="links"
    Left,
    //% block="left up"
    //% block.loc.nl="links omhoog"
    UpLeft,
}

enum Power {
    //% block="without power"
    //% block.loc.nl="zonder kracht"
    None,
    //% block="Low power"
    //% block.loc.nl="weinig kracht"
    Low,
    //% block="Half power"
    //% block.loc.nl="halve kracht"
    Half,
    //% block="Full power"
    //% block.loc.nl="volle kracht"
    Full,
}

enum Key {
    //% block="up"
    //% block.loc.nl="omhoog"
    Up, //P12
    //% block="down"
    //% block.loc.nl="omlaag"
    Down, //P15 
    //% block="left"
    //% block.loc.nl="links"
    Left, //P13
    //% block="right"
    //% block.loc.nl="rechts"
    Right, //P14
}

/////////////////
// END INCLUDE //
/////////////////

pins.digitalWritePin(DigitalPin.P0, 0)
pins.setPull(DigitalPin.P12, PinPullMode.PullUp)    // up
pins.setPull(DigitalPin.P15, PinPullMode.PullUp)    // down
pins.setPull(DigitalPin.P13, PinPullMode.PullUp)    // left
pins.setPull(DigitalPin.P14, PinPullMode.PullUp)    // right
pins.digitalWritePin(DigitalPin.P16, 1)

namespace GamepadApp {

    const BUTTONMAX = 4

    let PRESSED = [1, 1, 1, 1]
    let POWER = 0
    let ANGLE = 0

    function joystickState() {

        let angle: number
        let power: number
        let y: number
        let x: number

        // left-right
        x = 0 - pins.analogReadPin(AnalogPin.P1) + 511
        // bottom-up
        y = pins.analogReadPin(AnalogPin.P2) - 511

        power = Math.sqrt(x * x + y * y)

        if (x != 0)
            angle = (0 - Math.atan(y / x)) * 180 / Math.PI + (x > 0 ? 90 : 270)
        else
            angle = (y > 0 ? 0 : 180)
        angle = Math.round(angle / 5) * 5

        if (angle > 338) angle = Joystick.Up
        else
            if (angle > 293) angle = Joystick.UpLeft
            else
                if (angle > 248) angle = Joystick.Left
                else
                    if (angle > 203) angle = Joystick.DownLeft
                    else
                        if (angle > 158) angle = Joystick.Down
                        else
                            if (angle > 113) angle = Joystick.DownRight
                            else
                                if (angle > 68) angle = Joystick.Right
                                else
                                    if (angle > 23) angle = Joystick.UpRight
                                    else angle = Joystick.Up

        if (power > 350) power = Power.Full
        else
            if (power > 200) power = Power.Half
            else
                if (power > 50) power = Power.Low
                else {
                    power = 0
                    angle = Joystick.None
                }

        if (angle != ANGLE || power != POWER) {
            ANGLE = angle
            POWER = power
            ETsend("GP", (1000 + POWER * 1000 + ANGLE).toString())
        }
    }

    function buttonState(button: Key) {
        let newstate: number
        switch (button) {
            case Key.Up:
                newstate = pins.digitalReadPin(DigitalPin.P13)
                break
            case Key.Down:
                newstate = pins.digitalReadPin(DigitalPin.P14)
                break
            case Key.Left:
                newstate = pins.digitalReadPin(DigitalPin.P12)
                break
            case Key.Right:
                newstate = pins.digitalReadPin(DigitalPin.P15)
                break
        }
        if (PRESSED[button] == newstate)
            return
        PRESSED[button] = newstate
        if (newstate)
            button += BUTTONMAX
        ETsend("GP", button.toString())
    }

    basic.forever(function () {
        for (let i = Key.Up; i <= Key.Right; i++)
            buttonState(i)
        joystickState()
    })
}
