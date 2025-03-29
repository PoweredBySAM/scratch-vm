const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const {SamLabsBLE, DeviceTypes, BabyBotIndex, SAMDevice} = require('./device');

class Scratch3SamBot {
    constructor (runtime) {
        this.runtime = runtime;
        this.deviceMap = new Map(); // Store multiple devices
        this.numberOfConnectedDevices = 0;
        this.extensionId = 'sambot';
        this._stopAll = this.stopAll.bind(this);
        this.runtime.on('PROJECT_STOP_ALL', this._stopAll);
        this.runtime.on('PROJECT_RUN_STOP', this._stopAll);
        this.deviceMenu = [];
        this.blocks = [
            {
                opcode: 'connectToDevice',
                blockType: BlockType.COMMAND,
                text: 'Connect a device'
            },
            {
                opcode: 'getBattery',
                blockType: BlockType.REPORTER,
                text: 'Battery percentage, Block [num]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'BabyBotExecCommand',
                blockType: BlockType.COMMAND,
                text: '[num] [command]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    command: {menu: 'babyBotCommand', type: ArgumentType.STRING}
                }
            },
            {
                opcode: 'BabyBotPushCommand',
                blockType: BlockType.COMMAND,
                text: '[num] push [command] to itiner',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    command: {menu: 'babyBotCommand', type: ArgumentType.STRING}
                }
            },
            {
                opcode: 'BabyBotStart',
                blockType: BlockType.COMMAND,
                text: '[num] Start',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'BabyBotStop',
                blockType: BlockType.COMMAND,
                text: '[num] Stop',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'BabyBotClear',
                blockType: BlockType.COMMAND,
                text: '[num] Clear itiner',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'BabyBotWrite',
                blockType: BlockType.COMMAND,
                text: '[num] set motor speed right [r], left [l]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    r: {defaultValue: 0, type: ArgumentType.NUMBER},
                    l: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            }
        ];
        this.DeviceMapping = new Map();
    }


    getInfo () {
        return {
            id: this.extensionId,
            name: 'SAM BabyBot',
            showStatusButton: false,
            color1: '#0FBD8C',
            color2: '#0DA57A',
            blocks: this.blocks,
            menus: {
                deviceMenu: 'getDeviceMenu',
                babyBotCommand: 'getBabyBotCommandMenu'
            }
        };
    }

    updateDeviceMenu () {
        this.deviceMenu = [];
        this.deviceMap.forEach(device => {
            this.deviceMenu.push({text: device.displayName, value: device.id});
        });
        this.runtime.requestBlocksUpdate();
    }

    getDeviceMenu () {
        return this.deviceMenu.length ? this.deviceMenu : [{text: '-', value: '-'}];
    }

    getBabyBotCommandMenu () {
        return [{
            text: 'move Forward',
            value: 'F'
        },
        {
            text: 'move Backward',
            value: 'B'
        },
        {
            text: 'turn Right',
            value: 'R'
        },
        {
            text: 'turn Left',
            value: 'L'
        }];
    }

    /**
     * get the device with the given id
     * @param {string} id the device id
     * @returns {SAMDevice} the device
     */
    getDeviceFromId (id) {
        if (this.DeviceMapping.get(id)) {
            return this.deviceMap.get(this.DeviceMapping.get(id));
        }
        return this.deviceMap.get(id);
    }

    stopAll () {
        this.deviceMap.forEach(this.stopDevice.bind(this));
    }

    stopDevice (device) {
        device.writeActor(new Uint8Array([0, 0, 0]));
    }

    async connectToDevice () {
        const device = new SAMDevice(this.runtime, this.extensionId);
        const connected = await device.connectToDevice(this.deviceMap, {
            filters: [{
                namePrefix: DeviceTypes[BabyBotIndex].advName
            }],
            optionalServices: [SamLabsBLE.battServ, SamLabsBLE.SAMServ]
        });
        if (connected) {
            if (device.device.name !== DeviceTypes[BabyBotIndex].advName) {
                device._ble.disconnect();
                return;
            }
            this.deviceMap.set(device.id, device);
            this.updateDeviceMenu();
        }
    }

    getBattery (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.battery;
    }

    /**
     * send a command to a SamBot
     * @param {SAMDevice} device the device
     * @param {Uint8Array} bytearray the message
     * @returns {void}
     */
    async BabyBotCommand (device, bytearray) {
        if (!device.SAMBotAvailable) {
            return;
        }
        await device.writeBot(bytearray);
    }

    async BabyBotExecCommand (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.BabyBotCommand(block, new Uint8Array([args.command.charCodeAt(0), 'e'.charCodeAt(0), 0]));
    }

    async BabyBotPushCommand (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.BabyBotCommand(block, new Uint8Array([args.command.charCodeAt(0), 's'.charCodeAt(0), 0]));
    }
    async BabyBotStart (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.BabyBotCommand(block, new Uint8Array(['X'.charCodeAt(0), 'e'.charCodeAt(0), 0]));
    }
    async BabyBotStop (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.BabyBotCommand(block, new Uint8Array(['S'.charCodeAt(0), 'e'.charCodeAt(0), 0]));
    }
    async BabyBotClear (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.BabyBotCommand(block, new Uint8Array(['C'.charCodeAt(0), 'e'.charCodeAt(0), 0]));
    }
    async BabyBotWrite (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.SAMBotAvailable) {
            return;
        }
        let Lspeed = Number(args.l);
        if (Lspeed < 0) {
            if (Lspeed < -100) {
                Lspeed = -100;
            }
            Lspeed = ((100 - Math.abs(Lspeed)) * 1.28) + 128;
        } else {
            if (Lspeed > 100) {
                Lspeed = 100;
            }
            Lspeed = Lspeed * 1.27;
        }
        let Rspeed = Number(args.r);
        if (Rspeed < 0) {
            if (Rspeed < -100) {
                Rspeed = -100;
            }
            Rspeed = ((100 - Math.abs(Rspeed)) * 1.28) + 128;
        } else {
            if (Rspeed > 100) {
                Rspeed = 100;
            }
            Rspeed = Rspeed * 1.27;
        }
        await block.writeActor(new Uint8Array([Rspeed, Lspeed, 0]));
    }
}

module.exports = Scratch3SamBot;
