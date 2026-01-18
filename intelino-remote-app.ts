//////////////////////////////////
//##############################//
//##                          ##//
//##  intelino-remote-app.ts  ##//
//##                          ##//
//##############################//
//////////////////////////////////

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
                    radio.sendNumber(key + 12)
                else
                if (button == Buttons.Down)
                    radio.sendNumber(key + 24)
                while (keyPressed()) { basic.pause(1) }
            }
        }
        if (!alt)
            radio.sendNumber(button)
    }

    if (key = keyPressed()) {
        radio.sendNumber(key)
    }

    while (keyPressed() || buttonPressed()) { basic.pause(1) }
})
