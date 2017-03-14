playbulb.js
=======

A small node.js script to change the color of your MiPow Playbulb Sphere, based
on data from https://github.com/Phhere/Playbulb. YMMV.

I've only tested this on MacOS... you may need to do some work to get this to
work on Linux or Windows... see the
[noble](https://github.com/sandeepmistry/noble) documentation to get BLE working
on your system.

## Installation

- clone this repo
- `npm install`
- (optional) add playbulb.js to you PATH

## Usage

### Change bulb color

```shell
playbulb.js change -c [color]
```

Color Values:
- red
- green
- blue
- purple
- off

You may also provide your own hex-based WRGB color, e.g. `00FF00FF` is purple
(WWRRGGBB).

### Blink the bulb

```shell
playbulb.js blink -c [color]
```

This will blink the bulb twice with the specified color and then return it to
the original color. Color options are the same as the `change` command.

## TODO

- Support for different options in the `blink` command (speed, number of blinks)
- Convert 3 & 6-digit hex codes to WRGB hex
- Support for other playbulb effects

