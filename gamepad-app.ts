///////////////////////////
//#######################//
//##                   ##//
//##  gampad-enums.ts  ##//
//##                   ##//
//#######################//
///////////////////////////

enum Joystick {
    None,
    Up,
    UpRight,
    Right,
    DownRight,
    Down,
    DownLeft,
    Left,
    UpLeft,
}

enum Power {
    None,
    Low,
    Half,
    Full,
}

enum Key {
    Up,
    Down,
    Left,
    Right,
}


////////////////////////
//####################//
//##                ##//
//##  gampadapp.ts  ##//
//##                ##//
//####################//
////////////////////////

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
            radio.sendNumber(1000 + POWER * 1000 + ANGLE)
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
        radio.sendNumber(button)
    }

    basic.forever(function () {
        for (let i = Key.Up; i <= Key.Right; i++)
            buttonState(i)
        joystickState()
    })
}
