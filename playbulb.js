#!/usr/bin/env node

// jshint esversion: 6, node: true
'use strict';

const { promisify } = require('util');
const commandLineArgs = require('command-line-args');
const noble = require('@abandonware/noble');

const optDefinitions = [
  { name: 'color',   type: String, alias: 'c' },
  { name: 'command', type: String, defaultOption: true }
];

const options = commandLineArgs(optDefinitions);
const COLOR_REGEXP = /^([0-9a-fA-F]{2}){4}$/;

const PLAYBULB_SERVICE_UUIDS = ['ff08'];
const PLAYBULB_CHARACTERISTIC_UUIDS = ['fffc', 'fffb'];
const COLORS = {
  red: Buffer.from('00ff0000', 'hex'),
  green: Buffer.from('0000ff00', 'hex'),
  blue: Buffer.from('000000ff', 'hex'),
  purple: Buffer.from('00330066', 'hex'),
  off: Buffer.from('00000000', 'hex'),
};

let colorOpt = getColorOpt();
let blinkTime = options.blinkTime || 200;

function getColorOpt() {
  let arg = options.color;

  if (COLOR_REGEXP.test(arg)) {
    return new Buffer(arg, 'hex');
  } else if (COLORS.hasOwnProperty(arg)) {
    return COLORS[arg];
  } else {
    console.warn('No color value! Turning off...');
    return COLORS.off;
  }
}

async function run () {
  let timeout = setTimeout(() => {
    console.warn('Timed out finding the Playbulb.');
    process.exit(2);
  }, 2000);

  noble.on('discover', (peripheral) => {
    if (!/PLAYBULB/.test(peripheral.advertisement.localName)) { return; }
    noble.stopScanning();
    clearTimeout(timeout);

    switch (options.command) {
      case 'change':
        getColorCharacteristic(peripheral).then((characteristic) => {
          changeDeviceColor(characteristic, colorOpt).then(() => { process.exit(0); }, (err) => { process.exit(1); });
        }, (err) => {
          console.warn(err);
        });
        break;

      case 'blink':
        getColorCharacteristic(peripheral).then((characteristic) => {
          blinkDevice(characteristic, colorOpt).then(() => { process.exit(0); }, (err) => {  process.exit(1); });
        }, (err) => { console.warn(err); });
        break;

      default:
        console.warn('Usage: playbulb [command] [options] \n command is one of: \n  - change\n  - blink');
        process.exit(1);
    }
  });

  noble.on('stateChange', (state) => {
    if (state === 'poweredOn') {
      noble.startScanning(null, false);
    } else {
      noble.stopScanning();
    }
  });
};

function getColorCharacteristic(peripheral) {
  return new Promise((resolve, reject) => {
    peripheral.connect((err) => {
      if (err) { console.warn('Failed to connect to playbulb!'); reject(err); }

      peripheral.discoverServices(PLAYBULB_SERVICE_UUIDS, (err, services) => {
        if (err) { console.warn('Failed to get services!'); reject(err); }
        let service = services.find(s => s.uuid === PLAYBULB_SERVICE_UUIDS[0]);

        service.discoverCharacteristics(PLAYBULB_CHARACTERISTIC_UUIDS, (err, characteristics) => {
          if (err) { console.warn('Failed to get characteristics!'); reject(err); }
          resolve(characteristics.find(c => c.uuid === PLAYBULB_CHARACTERISTIC_UUIDS[0]));
        });
      });
    });
  });
}

function changeDeviceColor(characteristic, color) {
  return new Promise((resolve, reject) => {
    characteristic.write(color, true, (err) => { if (err) { reject(err); } });

    setTimeout(() => {
      readDeviceColor(characteristic).then((data) => {
        if (data.equals(color)) { resolve(data); }
        else { console.log('Failed to set color'); reject(); }
      }, (err) => {
        console.error(err);
        reject(err);
      });
    }, 100);
  });
}

function readDeviceColor(characteristic) {
  return new Promise((resolve, reject) => {
    characteristic.read((err, data) => {

      if (err) { console.log('failed to read color'); reject(err); }
      resolve(data);
    });
  });
}

function blinkDevice(characteristic, color) {
  let originalColor;
  let returnToOriginal = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        changeDeviceColor(characteristic, originalColor).then(resolve, reject);
      }, blinkTime);
    });
  };

  return new Promise((resolve, reject) => {
    readDeviceColor(characteristic).then((data) => {
      originalColor = data;
      changeDeviceColor(characteristic, color)
        .then(returnToOriginal)
        .then(() => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              changeDeviceColor(characteristic, color).then(resolve, reject);
            }, blinkTime);
          });
        })
        .then(returnToOriginal)
        .then(resolve, reject);
    }, (err) => { reject(err); });
  });
}

run();
