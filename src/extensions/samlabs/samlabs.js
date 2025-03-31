const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
// const Target = require('../../engine/target');
const {SamLabsBLE, SAMDevice} = require('./device');

// eslint-disable-next-line no-unused-vars
class LEDArg {
    num = '';
    red = 0;
    green = 0;
    blue = 0;
}

class Scratch3SamLabs {
    constructor (runtime) {
        this.runtime = runtime;
        this.deviceMap = new Map(); // Store multiple devices
        this.numberOfConnectedDevices = 0;
        this.extensionId = 'samlabs';
        this._stopAll = this.stopAll.bind(this);
        this.runtime.on('PROJECT_STOP_ALL', this._stopAll);
        this.runtime.on('PROJECT_RUN_STOP', this._stopAll);
        this.deviceMenu = [];
        this.BabyBotdeviceMenu = [];
        this.blocks = [
            {
                opcode: 'connectToDevice',
                blockType: BlockType.COMMAND,
                text: 'Connect a device'
            },
            {
                opcode: 'setLEDColor',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] Status Led Color: R[red], G[green], B[blue]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    red: {defaultValue: 0, type: ArgumentType.NUMBER},
                    green: {defaultValue: 0, type: ArgumentType.NUMBER},
                    blue: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'setLEDRGBColor',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] RGB Led Color: R[red], G[green], B[blue]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    red: {defaultValue: 0, type: ArgumentType.NUMBER},
                    green: {defaultValue: 0, type: ArgumentType.NUMBER},
                    blue: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'setBlockMotorSpeed',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] motor speed [val]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    val: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'setBlockServo',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] Servo angle [val]°',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    val: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'getSensorValue',
                blockType: BlockType.REPORTER,
                text: 'Sensor value, Block [num]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'getBattery',
                blockType: BlockType.REPORTER,
                text: 'Battery percentage, Block [num]',
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            }
        ];

        // this.colors = [
        //     '#FF00FF', '#00FFFF', '#FFFF00', '#808000',
        //     '#FF0000', '#00FF00', '#0000FF'
        // ];
        // this.deviceAssetAvailable = false;
        // this.runtime.on('PROJECT_LOADED', this.onProjectLoad.bind(this));
        this.DeviceMapping = new Map();
        // this.createDeviceListAsset();
    }

    // static get DeviceListAssetId () {
    //     return '_SAMLabs_devicelist';
    // }

    // storeDeviceListToAsset () {
    //     this.createDeviceListAsset();
    // }

    // loadDeviceListFromAsset () {
    //     const asset = this.runtime.storage.get('_SAMLabs_devicelist', this.runtime.storage.DataFormat.JSON);
    //     if (!asset) {
    //         this.deviceAssetAvailable = false;
    //         return;
    //     }
    //     this.deviceAssetAvailable = true;
    //     const string = new TextDecoder().decode(asset.data);
    //     const devices = JSON.parse(string);
    //     this.deviceList = new Map(Object.entries(devices.deviceList));
    //     this.DeviceMapping = new Map(Object.entries(devices.mapping));
    // }

    // createDeviceListAsset () {
    //     const encoder = new TextEncoder();
    //     const encodedData = encoder.encode(JSON.stringify({
    //         deviceList: Object.fromEntries(this.deviceList),
    //         mapping: Object.fromEntries(this.DeviceMapping)
    //     }));
    //     console.log('storing data:', encodedData);
    //     this.runtime.storage.builtinHelper._store(
    //         this.runtime.storage.AssetType.Sprite,
    //         this.runtime.storage.DataFormat.JSON,
    //         encodedData, '_SAMLabs_devicelist');
    //     this.loadDeviceListFromAsset();
    //     if (this.deviceAssetAvailable) {
    //         return;
    //     }
    //     const asset = new this.runtime.storage.Asset(
    //         this.runtime.storage.AssetType.Sprite,
    //         '_SAMLabs_devicelist',
    //         this.runtime.storage.DataFormat.JSON,
    //         encodedData,
    //         false
    //     );
    //     // Create a new sprite (target)
    //     const newTarget = new Target(this.runtime);

    //     // Replace the entire sprite data with JSON
    //     newTarget.sprite = {
    //         costumes: [
    //             {
    //                 asset: asset
    //             }
    //         ],
    //         sounds: []
    //     };

    //     // Add the target to the runtime (makes it a real sprite)
    //     this.runtime.targets.push(newTarget);
        
    //     console.log('Added new sprite:', newTarget);
    //     this.deviceAssetAvailable = true;
    // }

    // onProjectLoad () {
    //     this.loadDeviceListFromAsset();
    //     if (!this.deviceAssetAvailable) {
    //        this.createDeviceListAsset();
    //     }
    // }

    // hexToRgb (hex) {
    //     hex = hex.replace(/^#/, ''); // Remove "#" if present
    //     if (hex.length === 3) {
    //         // Convert short hex (e.g. #F00) to full hex (#FF0000)
    //         hex = hex.split('').map(c => c + c)
    //             .join('');
    //     }
    //     const r = parseInt(hex.substring(0, 2), 16);
    //     const g = parseInt(hex.substring(2, 4), 16);
    //     const b = parseInt(hex.substring(4, 6), 16);
    //     return {r, g, b};
    // }


    getInfo () {
        return {
            id: this.extensionId,
            name: 'SAM Labs',
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
        this.BabyBotdeviceMenu = [];
        this.deviceMap.forEach(device => {
            this.deviceMenu.push({text: device.displayName, value: device.id});
        });
        // this.runtime.requestBlocksUpdate(); - messes up the create variable button
    }

    getDeviceMenu () {
        return this.deviceMenu.length ? this.deviceMenu : [{text: '-', value: '-'}];
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

    addBlock (newBlock) {
        this.blocks.push(newBlock);
        this.runtime._refreshExtensions(); // Force a refresh of the extension
    }

    stopAll () {
        this.deviceMap.forEach(this.stopDevice.bind(this));
    }

    stopDevice (device) {
        device.writeActor(new Uint8Array([0, 0, 0]), false);
    }

    async connectToDevice () {
        const device = new SAMDevice(this.runtime, this.extensionId);
        const connected = await device.connectToDevice(this.deviceMap, {
            filters: [{
                namePrefix: 'SAM'
            }],
            optionalServices: [SamLabsBLE.battServ, SamLabsBLE.SAMServ]
        });
        if (connected) {
            this.deviceMap.set(device.id, device);
            this.updateDeviceMenu();
        }
    }

    /**
     * set the status led color
     * @param {LEDArg} args color
     * @returns {void}
     */
    async setLEDColor (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.setBlockLedColor(block, {r: args.red, g: args.green, b: args.blue});
    }

    /**
     * set a blocks status led color
     * @param {SAMDevice} block the device
     * @param {Uint8Array} color color in RGB format
     */
    async setBlockLedColor (block, color) {
        const message = new Uint8Array([
            color.r,
            color.g,
            color.b
        ]);
        await block.writeStatusLed(message);
    }

    /**
     * set the RGB (actor) led color
     * @param {LEDArg} args color
     * @returns {void}
     */
    async setLEDRGBColor (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }

        const message = new Uint8Array([
            args.red,
            args.green,
            args.blue
        ]);
        await block.writeActor(message);
    }

    async setBlockMotorSpeed (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }
        let speed = Number(args.val);
        if (speed < 0) {
            if (speed < -100) {
                speed = -100;
            }
            speed = (Math.abs(speed) * 1.27) + 128;
        } else {
            if (speed > 100) {
                speed = 100;
            }
            speed = speed * 1.27;
        }
        const message = new Uint8Array([speed, 0, 0]);
        await block.writeActor(message);
    }

    async setBlockServo (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }
        const angle = Number(args.val);
        const message = new Uint8Array([angle, 0, 0]);
        await block.writeActor(message);
    }

    getSensorValue (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.value;
    }

    getBattery (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.battery;
    }
}

module.exports = Scratch3SamLabs;
