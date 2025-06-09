/* eslint-disable func-style */
/* eslint-disable require-jsdoc */
/**
 * root robot extension for scratch
 * created by Raphael Cherney (github.com/raphaelcherney)
 * original file: https://github.com/raphaelcherney/scratch-vm/blob/root/src/extensions/scratch3_root/index.js
 */
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const BLE = require('./ble-llk.js');
const Base64Util = require('../../util/base64-util');
const MathUtil = require('../../util/math-util');
const RateLimiter = require('../../util/rateLimiter.js');
const log = require('../../util/log');
const EventEmitter = require('events');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const iconURI = 'data:image/png;base64,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';

/**
 * Root EventEmitter for passing information from incoming messages
 */
const myEvents = new EventEmitter();

/**
 * A list of Root BLE service UUIDs.
 * @enum {string}
 */
const BLEService = {
    ROOT_ID: '48c5d828-ac2a-442d-97a3-0c9822b04979',
    DEVICE_SERVICE: '0000180a-0000-1000-8000-00805f9b34fb',
    UART_SERVICE: '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
};

/**
 * A list of Root BLE characteristic UUIDs.
 *
 * Characteristics on Root UART_SERVICE:
 * - TX
 * - RX
 * @enum
 */
const BLECharacteristic = {
    TX: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    RX: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
};

/**
 * A time interval to wait (in milliseconds) while a block that sends a BLE message is running.
 * @type {number}
 */
const BLESendInterval = 100;

/**
 * A maximum number of BLE message sends per second, to be enforced by the rate limiter.
 * @type {number}
 */
const BLESendRateMax = 20;

function scaleBetween (unscaledNum, minIn, maxIn, minOut, maxOut) {
    return ((maxOut - minOut) * (unscaledNum - minIn) / (maxIn - minIn)) + minOut;
}

function int32toArray (numberIn) {
    // TODO: assuming little-endian, make sure this is true
    const arrayOut = [
        (numberIn & 0xff000000) >> 24,
        (numberIn & 0x00ff0000) >> 16,
        (numberIn & 0x0000ff00) >> 8,
        (numberIn & 0x000000ff)
    ];
    return arrayOut;
}

function int16toArray (numberIn) {
    // TODO: assuming little-endian, make sure this is true
    const arrayOut = [
        (numberIn & 0x0000ff00) >> 8,
        (numberIn & 0x000000ff)
    ];
    return arrayOut;
}

function strToArray (string) {
    const arrayOut = Array.from(new TextEncoder('utf-8').encode(string));
    return arrayOut;
}

function colorDataToArray (dataIn) {
    const arrayOut = new Array(32);
    for (let i = 0; i < 16; i++) {
        arrayOut[i * 2] = (dataIn[i] & 0xf0) >> 4;
        arrayOut[(i * 2) + 1] = (dataIn[i] & 0x0f);
    }
    return arrayOut;
}

function crc8 (data) {
    let crc = 0x00; // Initialize CRC value
    const polynomial = 0x07; // Define the CRC-8 polynomial
  
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i]; // XOR with current byte
    
        for (let j = 0; j < 8; j++) {
            if (crc & 0x80) { // Check if MSB is set
                crc = (crc << 1) ^ polynomial; // Shift left and XOR with polynomial
            } else {
                crc <<= 1; // Shift left
            }
        }
    }
    return crc & 0xFF; // Mask to 8 bits
}

/**
 * Manage communication with a Root peripheral over a Bluetooth Low Energy client socket.
 */
class Root {

    constructor (runtime, extensionId) {

        /**
         * The Scratch 3.0 runtime used to trigger the green flag button.
         * @type {Runtime}
         * @private
         */
        this._runtime = runtime;
        this._runtime.on('PROJECT_STOP_ALL', this.stopAll.bind(this));

        /**
         * The id of the extension this peripheral belongs to.
         */
        this._extensionId = extensionId;

        /**
         * The Bluetooth connection socket for reading/writing peripheral data.
         * @type {BLE}
         * @private
         */
        this._ble = null;
        this._runtime.registerPeripheralExtension(extensionId, this);

        /**
         * A rate limiter utility, to help limit the rate at which we send BLE messages
         * over the socket to Scratch Link to a maximum number of sends per second.
         * @type {RateLimiter}
         * @private
         */
        this._rateLimiter = new RateLimiter(BLESendRateMax);

        // Bind callbacks
        this._onConnect = this._onConnect.bind(this);
        this._onMessage = this._onMessage.bind(this);

        // Most recently received sensor data
        this._bumperState = {
            left: false,
            right: false
        };
        this._touchState = {
            frontLeft: false,
            frontRight: false,
            rearRight: false,
            rearLeft: false
        };
        this._colorData = new Array(32).fill(0);
        this._colorSums = new Array(16).fill(0);
        this.packetID = 0;
    }

    /**
     * Called by the runtime when user wants to scan for a Root peripheral.
     */
    scan () {
        this._ble = new BLE(this._runtime, this._extensionId, {
            filters: [{
                services: [BLEService.ROOT_ID]
            }],
            optionalServices: [BLEService.UART_SERVICE]
        }, this._onConnect);
    }

    /**
     * Called by the runtime when user wants to connect to a certain Root peripheral.
     * @param {number} id - the id of the peripheral to connect to.
     */
    connect (id) {
        this._ble.connectPeripheral(id);
    }

    /**
     * Disconnects from the current BLE socket.
     */
    disconnect () {
        this._ble.disconnect();
    }

    /**
     * Called by the runtime to detect whether the Root peripheral is connected.
     * @return {boolean} - the connected state.
     */
    isConnected () {
        let connected = false;
        if (this._ble) {
            connected = this._ble.isConnected();
        }
        return connected;
    }

    /**
     * Generate and send a Root packet.
     * @param  {number} deviceID - the internal device to send a command to.
     * @param  {number} commandID - the command to be completed by the device.
     * @param  {array}  payload - additional data associated with packet.
     * @returns {Promise} a promise result of the write operation
     */
    sendPacket (deviceID, commandID, payload = Array(16).fill(0)) {
        const packetID = this.packetID;
        this.packetID++;
        if (this.packetID >= 256) {
            this.packetID = 0;
        }
        let packet = [deviceID, commandID, packetID];
        const checksum = crc8(packet.concat(payload));

        packet = packet.concat(payload).concat([checksum]);

        log.info('Sending Packet:');
        log.info(packet);
        return this.send(packet);
    }

    /**
     * Write a message to the Root peripheral BLE socket.
     * @param {Array} message - the message to write.
     * @param {boolean} [useLimiter=true] - if true, use the rate limiter
     * @return {Promise} a promise result of the write operation
     */
    send (message, useLimiter = true) {
        if (!this.isConnected()) return Promise.resolve();

        if (useLimiter) {
            if (!this._rateLimiter.okayToSend()) return Promise.resolve();
        }

        return this._ble.write(
            BLEService.UART_SERVICE,
            BLECharacteristic.TX,
            Base64Util.uint8ArrayToBase64(message),
            'base64'
        );
    }

    /**
     * Starts reading data from peripheral after BLE has connected.
     * @private
     */
    _onConnect () {
        this._ble.startNotifications(
            BLEService.UART_SERVICE,
            BLECharacteristic.RX,
            this._onMessage
        );
    }

    /**
     * Process the sensor data from the incoming BLE characteristic.
     * @param {object} base64 - the incoming BLE data.
     * @private
     */
    _onMessage (base64) {
        const data = Base64Util.base64ToUint8Array(base64);
        const device = data[0];
        const command = data[1];

        log.info('Receiving Packet:');
        log.info(data);

        if (device === 0 && command === 4) {
            // Nose press (stops running project)
            this._runtime.stopAll();
        } else if (device === 12 && command === 0) {
            // New Bumper data
            if (data[7] & 0x80) {
                this._bumperState.left = true;
            } else {
                this._bumperState.left = false;
            }
            if (data[7] & 0x40) {
                this._bumperState.right = true;
            } else {
                this._bumperState.right = false;
            }
        } else if (device === 17 && command === 0) {
            // New touch data
            if (data[7] & 0x80) {
                this._touchState.frontLeft = true;
            } else {
                this._touchState.frontLeft = false;
            }
            if (data[7] & 0x40) {
                this._touchState.frontRight = true;
            } else {
                this._touchState.frontRight = false;
            }
            if (data[7] & 0x20) {
                this._touchState.rearRight = true;
            } else {
                this._touchState.rearRight = false;
            }
            if (data[7] & 0x10) {
                this._touchState.rearLeft = true;
            } else {
                this._touchState.rearLeft = false;
            }
        } else if (device === 4 && command === 2) {
            // New color sensor data
            const colorData = data.slice(3, 19);
            this._colorData = colorDataToArray(colorData);

            this._colorSums = new Array(16).fill(0); // Clear previous sum
            for (let i = 0; i < 32; i++) {
                const detectedColor = this._colorData[i];
                this._colorSums[detectedColor]++;
            }

            log.info(this._colorSums);
        } else if (device === 2 && command === 0) {
            // Marker actuator finished response
            myEvents.emit('markerFinished');
        } else if (device === 1 && command === 8) {
            // Drive distance finished response
            myEvents.emit('motorFinished');
        } else if (device === 1 && command === 12) {
            // Rotate angle finished response
            myEvents.emit('motorFinished');
        } else if (device === 5 && command === 0) {
            // Play tone finished response
            myEvents.emit('soundFinished');
        } else if (device === 5 && command === 4) {
            // Say phrase finished response
            myEvents.emit('soundFinished');
        }
    }

    stopAll () {
        if (!this.isConnected()) return;
        this.sendPacket(0, 3); // Stop and reset robot command
    }
}

/**
 * Scratch 3.0 blocks to interact with a Root peripheral.
 */
class Scratch3RootBlocks {

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return 'root';
    }

    /**
     * Construct a set of Root blocks.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // Create a new Root peripheral instance
        this._peripheral = new Root(this.runtime, Scratch3RootBlocks.EXTENSION_ID);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: Scratch3RootBlocks.EXTENSION_ID,
            name: 'Root',
            blockIconURI: iconURI,
            showStatusButton: true,
            blocks: [
                {
                    opcode: 'driveDistance',
                    text: formatMessage({
                        id: 'root.driveDistance',
                        default: 'move [DISTANCE] cm',
                        description: 'drive forward or reverse'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        DISTANCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 16
                        }
                    }
                },
                {
                    opcode: 'rotateAngle',
                    text: formatMessage({
                        id: 'root.rotateDistance',
                        default: 'turn [ANGLE] deg',
                        description: 'turn in place a given angle'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: 'setSpeeds',
                    text: formatMessage({
                        id: 'root.setSpeeds',
                        default: 'set wheel speeds: left [LEFT] right [RIGHT] cm/s',
                        description: 'set the left and right wheel speeds'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LEFT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        },
                        RIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                '---',
                {
                    opcode: 'setMarker',
                    text: formatMessage({
                        id: 'root.setMarker',
                        default: 'set [MARKER]',
                        description: 'set the marker or eraser position'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MARKER: {
                            type: ArgumentType.STRING,
                            menu: 'MARKER_MENU',
                            defaultValue: 'marker down'
                        }
                    }
                },
                '---',
                {
                    opcode: 'setLightsRGB',
                    text: formatMessage({
                        id: 'root.setLightsRGB',
                        default: 'set lights: red [RED] green [GREEN] blue [BLUE] %',
                        description: 'set the LED RGB values'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        RED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        GREEN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        BLUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                '---',
                {
                    opcode: 'playNote',
                    text: formatMessage({
                        id: 'root.playNote',
                        default: 'play tone [FREQUENCY] Hz for [DURATION] s',
                        description: 'play a certain note for some time'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        FREQUENCY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 440
                        },
                        DURATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.5
                        }
                    }
                },
                {
                    opcode: 'sayText',
                    text: formatMessage({
                        id: 'root.sayText',
                        default: 'say [TEXT]',
                        description: 'say the text in Root language'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                default: 'Hello!'
                            })
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenBumper',
                    text: formatMessage({
                        id: 'root.whenBumper',
                        default: 'when [BUMPER] bumper pressed',
                        description: 'when the selected bumper is pressed'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        BUMPER: {
                            type: ArgumentType.STRING,
                            menu: 'BUMPER_MENU',
                            defaultValue: 'any'
                        }
                    }
                },
                {
                    opcode: 'isBumper',
                    text: formatMessage({
                        id: 'root.isBumper',
                        default: '[BUMPER] bumper pressed?',
                        description: 'is the selected bumper is pressed?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        BUMPER: {
                            type: ArgumentType.STRING,
                            menu: 'BUMPER_MENU',
                            defaultValue: 'any'
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenTouch',
                    text: formatMessage({
                        id: 'root.whenTouch',
                        default: 'when [TOUCH] top touched',
                        description: 'when the selected area on top of Root is touched'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        TOUCH: {
                            type: ArgumentType.STRING,
                            menu: 'TOUCH_MENU',
                            defaultValue: 'any'
                        }
                    }
                },
                {
                    opcode: 'isTouch',
                    text: formatMessage({
                        id: 'root.isTouch',
                        default: '[TOUCH] top touched?',
                        description: 'is the selected top touch area is pressed?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        TOUCH: {
                            type: ArgumentType.STRING,
                            menu: 'TOUCH_MENU',
                            defaultValue: 'any'
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenColor',
                    text: formatMessage({
                        id: 'root.whenColor',
                        default: 'when [COLOR] color scanned',
                        description: 'when color sensor detects a specific color on its 32 sensors'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        COLOR: {
                            type: ArgumentType.STRING,
                            menu: 'COLOR_MENU',
                            defaultValue: 'black'
                        }
                    }
                },
                {
                    opcode: 'isColor',
                    text: formatMessage({
                        id: 'root.isColor',
                        default: '[COLOR] color scanned on sensor [SENSOR]?',
                        description: 'does the selected sensor (0-31) see the specified color?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        COLOR: {
                            type: ArgumentType.STRING,
                            menu: 'COLOR_MENU',
                            defaultValue: 'black'
                        },
                        SENSOR: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                }
            ],
            menus: {
                BUMPER_MENU: [
                    'any',
                    'left',
                    'right'
                ],
                TOUCH_MENU: [
                    'any',
                    'front-left',
                    'front-right',
                    'back-left',
                    'back-right'
                ],
                LIGHT_MENU: [
                    'bright',
                    'left',
                    'right',
                    'dark'
                ],
                COLOR_MENU: [
                    'black',
                    'red',
                    'green',
                    'blue'
                ],
                MARKER_MENU: [
                    'marker down',
                    'marker up',
                    'eraser down'
                ]
            }
        };
    }

    whenBumper (args) {
        switch (args.BUMPER) {
        case 'any':
            return this._peripheral._bumperState.left || this._peripheral._bumperState.right;
        case 'left':
            return this._peripheral._bumperState.left;
        case 'right':
            return this._peripheral._bumperState.right;
        default:
            log.warn(`Unknown comparison operator in whenBumper: ${args.BUMPER}`);
            return false;
        }
    }

    isBumper (args) {
        switch (args.BUMPER) {
        case 'any':
            return this._peripheral._bumperState.left || this._peripheral._bumperState.right;
        case 'left':
            return this._peripheral._bumperState.left;
        case 'right':
            return this._peripheral._bumperState.right;
        default:
            log.warn(`Unknown comparison operator in isBumperPressed: ${args.BUMPER}`);
            return false;
        }
    }

    whenTouch (args) {
        switch (args.TOUCH) {
        case 'any':
            return this._peripheral._touchState.frontLeft ||
                    this._peripheral._touchState.frontRight ||
                    this._peripheral._touchState.rearLeft ||
                    this._peripheral._touchState.rearRight;
        case 'front-left':
            return this._peripheral._touchState.frontLeft;
        case 'front-right':
            return this._peripheral._touchState.frontRight;
        case 'back-left':
            return this._peripheral._touchState.rearLeft;
        case 'back-right':
            return this._peripheral._touchState.rearRight;
        default:
            log.warn(`Unknown comparison operator in whenBumper: ${args.TOUCH}`);
            return false;
        }
    }

    isTouch (args) {
        switch (args.TOUCH) {
        case 'any':
            return this._peripheral._touchState.frontLeft ||
                    this._peripheral._touchState.frontRight ||
                    this._peripheral._touchState.rearLeft ||
                    this._peripheral._touchState.rearRight;
        case 'front-left':
            return this._peripheral._touchState.frontLeft;
        case 'front-right':
            return this._peripheral._touchState.frontRight;
        case 'back-left':
            return this._peripheral._touchState.rearLeft;
        case 'back-right':
            return this._peripheral._touchState.rearRight;
        default:
            log.warn(`Unknown comparison operator in whenBumper: ${args.TOUCH}`);
            return false;
        }
    }

    whenLight (args) {
        switch (args.LIGHT) {
        case 'bright':
            return false;
        case 'left':
            return false;
        case 'right':
            return false;
        case 'dark':
            return false;
        default:
            log.warn(`Unknown comparison operator in whenLight: ${args.LIGHT}`);
            return false;
        }
    }

    whenColor (args) {
        const minSum = 4;

        switch (args.COLOR) {
        case 'black':
            if (this._peripheral._colorSums[1] > minSum) {
                return true;
            }
            return false;
            
        case 'red':
            if (this._peripheral._colorSums[2] > minSum) {
                return true;
            }
            return false;
            
        case 'green':
            if (this._peripheral._colorSums[3] > minSum) {
                return true;
            }
            return false;
            
        case 'blue':
            if (this._peripheral._colorSums[4] > minSum) {
                return true;
            }
            return false;
            
        default:
            log.warn(`Unknown comparison operator in whenColor: ${args.COLOR}`);
            return false;
        }
    }

    isColor (args) {
        const sensorID = Cast.toNumber(args.SENSOR);

        if (sensorID >= 32 || sensorID < 0) {
            return false;
        }

        switch (args.COLOR) {
        case 'black':
            return (this._peripheral._colorData[sensorID] === 1);
        case 'red':
            return (this._peripheral._colorData[sensorID] === 2);
        case 'green':
            return (this._peripheral._colorData[sensorID] === 3);
        case 'blue':
            return (this._peripheral._colorData[sensorID] === 4);
        default:
            log.warn(`Unknown comparison operator in isColor: ${args.COLOR}`);
            return false;
        }
    }

    /**
     * Make Root play a tone
     * @param {object} args - the block's arguments.
     * @property {number} FREQUENCY - the tone to play.
     * @property {number} DURATION - the duration of the tone, in seconds.
     * @return {Promise} - a promise which will resolve at the end of the duration.
     */
    playNote (args) {
        const frequency = MathUtil.clamp(Cast.toNumber(args.FREQUENCY), 20, 10000);
        const duration = MathUtil.clamp(Cast.toNumber(args.DURATION) * 1000, 0, 65535);

        const deviceID = 5;
        const commandID = 0;
        let payload = int32toArray(frequency);
        payload = payload.concat(int16toArray(duration));
        payload = payload.concat(new Array(10).fill(0));

        this._peripheral.sendPacket(deviceID, commandID, payload);

        const timeout = duration + 500;

        const soundPromise = new Promise((resolve, reject) => {
            myEvents.on('soundFinished', () => {
                resolve();
            });
            setTimeout(() => {
                reject(Error('Sound Timeout'));
            }, timeout);
        });

        return soundPromise;
    }

    sayText (args) {
        const text = String(args.TEXT);

        if (text.length === 0) return;

        const deviceID = 5;
        const commandID = 4;
        let payload = strToArray(text);

        if (payload.length > 16) {
            payload = payload.slice(0, 16);
        } else {
            const missingZeros = 16 - payload.length;
            payload = payload.concat(new Array(missingZeros).fill(0));
        }

        this._peripheral.sendPacket(deviceID, commandID, payload);

        const timeout = 5000;

        const soundPromise = new Promise((resolve, reject) => {
            myEvents.on('soundFinished', () => {
                resolve();
            });
            setTimeout(() => {
                reject(Error('Sound Timeout'));
            }, timeout);
        });

        return soundPromise;
    }

    driveDistance (args) {
        const distance = Cast.toNumber(args.DISTANCE); // in cm

        const deviceID = 1;
        const commandID = 8;
        let payload = int32toArray(distance * 10);
        payload = payload.concat(new Array(12).fill(0));

        this._peripheral.sendPacket(deviceID, commandID, payload);

        const timeout = (distance * 100) + 5000;

        const drivePromise = new Promise((resolve, reject) => {
            myEvents.on('motorFinished', () => {
                resolve();
            });
            setTimeout(() => {
                reject(Error('Motor Timeout'));
            }, timeout);
        });

        return drivePromise;
    }

    rotateAngle (args) {
        const angle = Cast.toNumber(args.ANGLE); // in deg

        const deviceID = 1;
        const commandID = 12;
        let payload = int32toArray(angle * 10);
        payload = payload.concat(new Array(12).fill(0));

        this._peripheral.sendPacket(deviceID, commandID, payload);

        const timeout = (angle * 15) + 5000;

        const drivePromise = new Promise((resolve, reject) => {
            myEvents.on('motorFinished', () => {
                resolve();
            });
            setTimeout(() => {
                reject(Error('Motor Timeout'));
            }, timeout);
        });

        return drivePromise;
    }

    setMarker (args) {
        const deviceID = 2;
        const commandID = 0;
        const payload = new Array(16).fill(0);

        switch (args.MARKER) {
        case 'marker down':
            payload[0] = 0x01;
            break;
        case 'marker up':
            payload[0] = 0x00;
            break;
        case 'eraser down':
            payload[0] = 0x02;
            break;
        default:
            log.warn(`Unknown comparison operator in whenLight: ${args.MARKER}`);
            return;
        }

        this._peripheral.sendPacket(deviceID, commandID, payload);

        const timeout = 5000;

        const markerPromise = new Promise((resolve, reject) => {
            myEvents.on('markerFinished', () => {
                resolve();
            });
            setTimeout(() => {
                reject(Error('Marker Timeout'));
            }, timeout);
        });

        return markerPromise;
    }

    setLightsRGB (args) {
        const maxVal = 100;
        const minVal = 0;
        const red = Math.min(maxVal, Math.max(minVal, Cast.toNumber(args.RED)));
        const green = Math.min(maxVal, Math.max(minVal, Cast.toNumber(args.GREEN)));
        const blue = Math.min(maxVal, Math.max(minVal, Cast.toNumber(args.BLUE)));

        const deviceID = 3;
        const commandID = 2;
        const payload = Array(16).fill(0);
        payload[0] = 1; // on (no animation)
        payload[1] = scaleBetween(red, minVal, maxVal, 0, 255);
        payload[2] = scaleBetween(green, minVal, maxVal, 0, 255);
        payload[3] = scaleBetween(blue, minVal, maxVal, 0, 255);

        this._peripheral.sendPacket(deviceID, commandID, payload);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, BLESendInterval);
        });
    }

    setLightsColor (args) {
        const rgb = Cast.toRgbColorObject(args.COLOR);

        const deviceID = 3;
        const commandID = 2;
        const payload = Array(16).fill(0);
        payload[0] = 1; // on (no animation)
        payload[1] = MathUtil.clamp(rgb.r, 0, 255);
        payload[2] = MathUtil.clamp(rgb.g, 0, 255);
        payload[3] = MathUtil.clamp(rgb.b, 0, 255);

        this._peripheral.sendPacket(deviceID, commandID, payload);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, BLESendInterval);
        });
    }

    setSpeeds (args) {
        const left = MathUtil.clamp(Cast.toNumber(args.LEFT * 10), -100, 100);
        const right = MathUtil.clamp(Cast.toNumber(args.RIGHT * 10), -100, 100);

        const deviceID = 1;
        const commandID = 4;
        let payload = int32toArray(left);
        payload = payload.concat(int32toArray(right));
        payload = payload.concat(new Array(8).fill(0));

        this._peripheral.sendPacket(deviceID, commandID, payload);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, BLESendInterval);
        });
    }
}

module.exports = Scratch3RootBlocks;
