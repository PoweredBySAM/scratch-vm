const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Target = require('../../engine/target');
require('regenerator-runtime/runtime');

const SamLabsBLE = {
    battServ: '0000180f-0000-1000-8000-00805f9b34fb',
    batteryLevelCharacteristic: '00002a19-0000-1000-8000-00805f9b34fb',
    SAMServ: '3b989460-975f-11e4-a9fb-0002a5d5c51b',
    SensorCharacteristic: '4c592e60-980c-11e4-959a-0002a5d5c51b',
    ActorCharacteristic: '84fc1520-980c-11e4-8bed-0002a5d5c51b',
    StatusLedCharacteristic: '5baab0a0-980c-11e4-b5e9-0002a5d5c51b'
}

const DeviceTypes = [
    {
        name: 'undefined',
        advName: '',
    },
    {
        name: 'BabyBot',
        advName: 'SAM BabyBot',
    },
    {
        name: 'slider',
        advName: 'SAM Potentiometer',
    },
    {
        name: 'light sensor',
        advName: 'SAM LDR',
    },
    {
        name: 'button',
        advName: 'SAM Button',
    },
    {
        name: 'proximity',
        advName: 'SAM IR Sensor',
    },
    {
        name: 'heat',
        advName: 'SAM Temperature',
    },
    {
        name: 'tilt',
        advName: 'SAM Tilt',
    },
    {
        name: 'pressure',
        advName: 'SAM Pressure',
    },
    {
        name: 'RGB led',
        advName: 'SAM RGB Led',
    },
    {
        name: 'DC motor',
        advName: 'SAM DC Motor',
    },
    {
        name: 'servo',
        advName: 'SAM Servo Motor',
    }
]

class SAMDevice {
    constructor() {
        this.id = '';
        this.deviceType = DeviceTypes[0];
        this.displayName = DeviceTypes[0].name + ' 1';
        this.sameDevices = 1;
    }
};

class Scratch3SamLabs {
    constructor(runtime) {
        this.runtime = runtime;
        this.deviceMap = new Map(); // Store multiple devices
        this.numberOfConnectedDevices = 0;
        this.extensionId = 'samlabsExtension';
        this.runtime.on('PROJECT_STOP_ALL', this.stopAll.bind(this));
        this.runtime.on('PROJECT_RUN_STOP', this.stopAll.bind(this));
        this.deviceMenu = [];
        this.BabyBotdeviceMenu = [];
        this.blocks = [
            {
                opcode: 'connectToDevice',
                blockType: BlockType.COMMAND,
                text: 'Connect a device',
            },
            {
                opcode: 'setLEDColor',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] Status Led Color: R[red], G[green], B[blue]',
                terminal: false,
                arguments: {
                    num: { menu: 'deviceMenu', type: ArgumentType.NUMBER },
                    red: { defaultValue: 0, type: ArgumentType.NUMBER },
                    green: { defaultValue: 0, type: ArgumentType.NUMBER },
                    blue: { defaultValue: 0, type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'setLEDRGBColor',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] RGB Led Color: R[red], G[green], B[blue]',
                terminal: false,
                arguments: {
                    num: { menu: 'deviceMenu', type: ArgumentType.NUMBER },
                    red: { defaultValue: 0, type: ArgumentType.NUMBER },
                    green: { defaultValue: 0, type: ArgumentType.NUMBER },
                    blue: { defaultValue: 0, type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'setBlockMotorSpeed',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] motor speed [val]',
                terminal: false,
                arguments: {
                    num: { menu: 'deviceMenu', type: ArgumentType.NUMBER },
                    val: { defaultValue: 0, type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'setBlockServo',
                blockType: BlockType.COMMAND,
                text: 'Set Block [num] Servo angle [val]°',
                terminal: false,
                arguments: {
                    num: { menu: 'deviceMenu', type: ArgumentType.NUMBER },
                    val: { defaultValue: 0, type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'getSensorValue',
                blockType: BlockType.REPORTER,
                text: 'Sensor value, Block [num]',
                terminal: false,
                arguments: {
                    num: { menu: 'deviceMenu', type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'getBattery',
                blockType: BlockType.REPORTER,
                text: 'Battery percentage, Block [num]',
                terminal: false,
                arguments: {
                    num: { menu: 'deviceMenu', type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'BabyBotExecCommand',
                blockType: BlockType.COMMAND,
                text: '[num] [command]',
                terminal: false,
                arguments: {
                    num: { menu: 'babyBotDeviceMenu', type: ArgumentType.NUMBER },
                    command: { menu: 'babyBotCommand', type: ArgumentType.STRING }
                }
            },
            {
                opcode: 'BabyBotPushCommand',
                blockType: BlockType.COMMAND,
                text: '[num] push [command] to itiner',
                terminal: false,
                arguments: {
                    num: { menu: 'babyBotDeviceMenu', type: ArgumentType.NUMBER },
                    command: { menu: 'babyBotCommand', type: ArgumentType.STRING }
                }
            },
            {
                opcode: 'BabyBotStart',
                blockType: BlockType.COMMAND,
                text: '[num] Start',
                terminal: false,
                arguments: {
                    num: { menu: 'babyBotDeviceMenu', type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'BabyBotStop',
                blockType: BlockType.COMMAND,
                text: '[num] Stop',
                terminal: false,
                arguments: {
                    num: { menu: 'babyBotDeviceMenu', type: ArgumentType.NUMBER }
                }
            },
            {
                opcode: 'BabyBotClear',
                blockType: BlockType.COMMAND,
                text: '[num] Clear itiner',
                terminal: false,
                arguments: {
                    num: { menu: 'babyBotDeviceMenu', type: ArgumentType.NUMBER }
                }
            }
        ];

        this.colors = [
            "#FF00FF", "#00FFFF", "#FFFF00", "#808000",
            "#FF0000", "#00FF00", "#0000FF"
        ];
        this.deviceAssetAvailable = false;
        this.runtime.on('PROJECT_LOADED', this.onProjectLoad.bind(this));
        this.DeviceMapping = new Map();
        this.deviceList = new Map();
        //this.createDeviceListAsset();
    }

    static get DeviceListAssetId () {
        return '_SAMLabs_devicelist'
    }

    storeDeviceListToAsset() {
        this.createDeviceListAsset();
    }

    loadDeviceListFromAsset() {
        const asset = this.runtime.storage.get('_SAMLabs_devicelist', this.runtime.storage.DataFormat.JSON);
        if (!asset)
        {
            this.deviceAssetAvailable = false;
            return undefined;
        }
        this.deviceAssetAvailable = true;
        var string = new TextDecoder().decode(asset.data);
        const devices = JSON.parse(string);
        this.deviceList = new Map(Object.entries(devices.deviceList));
        this.DeviceMapping = new Map(Object.entries(devices.mapping));
    }

    createDeviceListAsset() {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify({
            deviceList: Object.fromEntries(this.deviceList),
            mapping: Object.fromEntries(this.DeviceMapping)
        }));
        console.log("storing data:", encodedData);
        this.runtime.storage.builtinHelper._store(this.runtime.storage.AssetType.Sprite, this.runtime.storage.DataFormat.JSON, encodedData, '_SAMLabs_devicelist');
        this.loadDeviceListFromAsset();
        if (this.deviceAssetAvailable)
        {
            return;
        }
        const asset = new this.runtime.storage.Asset(
            this.runtime.storage.AssetType.Sprite,
            '_SAMLabs_devicelist',
            this.runtime.storage.DataFormat.JSON,
            encodedData,
            false
        );
        // Create a new sprite (target)
        const newTarget = new Target(this.runtime);

        // Replace the entire sprite data with JSON
        newTarget.sprite = {
            costumes: [
                {
                    asset: asset
                }
            ],
            sounds: []
        };

        // Add the target to the runtime (makes it a real sprite)
        this.runtime.targets.push(newTarget);
        
        console.log('Added new sprite:', newTarget);
        this.deviceAssetAvailable = true;
    }

    onProjectLoad() {
        this.loadDeviceListFromAsset();
        if (!this.deviceAssetAvailable) {
            this.createJsonAsset();
        }
    }

    hexToRgb(hex) {
        hex = hex.replace(/^#/, ""); // Remove "#" if present
        if (hex.length === 3) {
            // Convert short hex (e.g. #F00) to full hex (#FF0000)
            hex = hex.split("").map(c => c + c).join("");
        }
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b };
    }


    getInfo() {
        return {
            id: this.extensionId,
            name: 'SAM Labs',
            showStatusButton: false,
            color1: '#0FBD8C',
            color2: '#0DA57A',
            blocks: this.blocks,
            menus: {
                deviceMenu: 'getDeviceMenu',
                babyBotDeviceMenu: 'getBabyBotDeviceMenu',
                babyBotCommand: 'getBabyBotCommandMenu'
            }
        };
    }

    updateDeviceMenu() {
        this.deviceMenu = [];
        this.BabyBotdeviceMenu = [];
        this.deviceList.forEach(device => {
            if (!device.SAMBotAvailable) {
                this.deviceMenu.push({ text: device.displayName, value: device.id });
            }
            else {
                this.BabyBotdeviceMenu.push({ text: device.displayName, value: device.id });
            }
        });
    }

    getDeviceMenu() {
        return this.deviceMenu.length ? this.deviceMenu : [{ text: 'No connected Blocks', value: '-1' }];
    }

    getBabyBotDeviceMenu() {
        return this.BabyBotdeviceMenu.length ? this.BabyBotdeviceMenu : [{ text: 'No connected devices', value: '-1' }];
    }

    getBabyBotCommandMenu() {
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

    getDeviceFromId(id) {
        if (this.DeviceMapping.get(id))
        {
            return this.deviceMap.get(this.DeviceMapping.get(id));
        }
        return this.deviceMap.get(id);
    }

    addBlock(newBlock) {
        this.blocks.push(newBlock);
        this.runtime._refreshExtensions(); // Force a refresh of the extension
    }

    stopAll() {
        this.deviceMap.forEach(this.stopDevice.bind(this));
    }

    stopDevice(device) {
        this.setLEDRGBColor({ id: device.id, red: 0, green: 0, blue: 0 });
    }

    async connectToDevice() {
        try {
            // Request a Bluetooth device with the specified filter
            const device = await navigator.bluetooth.requestDevice({
                filters: [{
                    namePrefix: 'SAM', // Filter by device name starting with 'SAM'
                }],
                optionalServices: [
                    SamLabsBLE.battServ,
                    SamLabsBLE.SAMServ
                ]
            });

            console.log('Device found:', device);

            device.addEventListener('gattserverdisconnected', () => this.onDisconnected(device));

            // Connect to the GATT server
            const server = await device.gatt.connect();

            await this.setupGATTDevice(server, device);
            //this.storeDeviceListToAsset();
            this.runtime.emit('TOOLBOX_EXTENSIONS_NEED_UPDATE');
        } catch (error) {
            console.log('Error:', error);
        }
    }

    async setupGATTDevice(server, device) {
        const num = this.numberOfConnectedDevices;
        this.numberOfConnectedDevices++;
        // Get the Battery Service
        const battServ = await server.getPrimaryService(SamLabsBLE.battServ);

        // Get the Battery Level Characteristic
        const batteryLevelCharacteristic = await battServ.getCharacteristic(SamLabsBLE.batteryLevelCharacteristic);

        const SAMServ = await server.getPrimaryService(SamLabsBLE.SAMServ);

        var SAMSensorCharacteristic = null;
        var SensorAvailable = true;

        try {
            SAMSensorCharacteristic = await SAMServ.getCharacteristic(SamLabsBLE.SensorCharacteristic);
        } catch (error) {
            console.log('Sensor characteristic not found');
            SensorAvailable = false;
        }
        var SAMActorCharacteristic = null;
        var ActorAvailable = true;

        try {
            SAMActorCharacteristic = await SAMServ.getCharacteristic(SamLabsBLE.ActorCharacteristic);
        } catch (error) {
            console.log('Actor characteristic not found');
            ActorAvailable = false;
        }
        var SAMBotCharacteristic = null;
        var SAMBotAvailable = true;

        try {
            SAMBotCharacteristic = await SAMServ.getCharacteristic(SamLabsBLE.SAMBotCommandCharacteristic);
        } catch (error) {
            SAMBotAvailable = false;
        }

        const SAMStatusLEDCharacteristic = await SAMServ.getCharacteristic(SamLabsBLE.StatusLedCharacteristic);

        var sameDevices = 1;
        this.deviceMap.forEach(value => {
            if (value.device.name == device.name) {
                sameDevices++;
            }
        });
        var typeId = 0;
        for (typeId = 0; typeId < DeviceTypes.length; typeId++)
        {
            if (DeviceTypes[typeId].advName == device.name)
            {
                break;
            }
        }
        if (typeId == DeviceTypes.length)
        {
            typeId = 0;
        }
        let displayName = DeviceTypes[typeId].name + ' ' + sameDevices;
        let deviceListItem = new SAMDevice;
        deviceListItem.displayName = displayName;
        deviceListItem.id = device.id;
        deviceListItem.deviceType = DeviceTypes[typeId];
        deviceListItem.sameDevices = sameDevices;
        this.deviceList.set(device.id, deviceListItem);
        let block = {
            id: device.id,
            device: device,
            typeId: typeId,
            battReadNotifyCharacteristic: batteryLevelCharacteristic,
            SAMSensorCharacteristic: SAMSensorCharacteristic,
            SensorAvailable: SensorAvailable,
            ActorAvailable: ActorAvailable,
            SAMBotAvailable: SAMBotAvailable,
            SAMBotCharacteristic: SAMBotCharacteristic,
            SAMActorCharacteristic: SAMActorCharacteristic,
            SAMStatusLEDCharacteristic: SAMStatusLEDCharacteristic,
            value: 0,
            battery: 0
        };

        this.deviceMap.set(device.id, block);
        this.updateDeviceMenu();
        this.setBlockLedColor(block, this.hexToRgb(this.colors[num]));

        if (SensorAvailable) {
            await SAMSensorCharacteristic.startNotifications();
            SAMSensorCharacteristic.addEventListener('characteristicvaluechanged', this.handleSensorNotifications.bind(this, device.id));
        }

        await batteryLevelCharacteristic.startNotifications();
        batteryLevelCharacteristic.addEventListener('characteristicvaluechanged', this.handleBattChange.bind(this, device.id));


        console.log(`Connected to ${device.name || 'Unknown Device'}, id ${device.id}`);
    }

    onDisconnected(event) {
    }

    handleSensorNotifications(id, event) {
        const value = event.target.value;
        let device = this.deviceMap.get(id);
        device.value = value.getUint8(0);
    }

    handleBattChange(id, event) {
        const value = event.target.value;
        let device = this.deviceMap.get(id);
        device.battery = value.getUint8(0);
    }

    async setLEDColor(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.setBlockLedColor(block, { r: args.red, g: args.green, b: args.blue });
    }

    async setBlockLedColor(block, color) {
        let message = new Uint8Array([
            color.r,
            color.g,
            color.b
        ]);
        await block.SAMStatusLEDCharacteristic.writeValue(message);
    }

    async setLEDRGBColor(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }

        let message = new Uint8Array([
            args.red,
            args.green,
            args.blue
        ]);
        await block.SAMActorCharacteristic.writeValue(message);
    }

    async setBlockMotorSpeed(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }
        let speed = Number(args.val)
        if (speed < 0) {
            if (speed < -100) {
                speed = -100;
            }
            speed = Math.abs(speed) * 1.27 + 128
        }
        else {
            if (speed > 100) {
                speed = 100;
            }
            speed = speed * 1.27
        }
        let message = new Uint8Array([speed]);
        await block.SAMActorCharacteristic.writeValue(message);
    }

    async setBlockServo(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }
        let speed = Number(args.val)
        let message = new Uint8Array([speed]);
        await block.SAMActorCharacteristic.writeValue(message);
    }

    getSensorValue(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.value;
    }

    getBattery(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.battery;
    }

    async BabyBotCommand(block, bytearray) {
        await block.SAMBotCharacteristic.writeValue(bytearray);
    }

    BabyBotExecCommand(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        BabyBotCommand(block, new Uint8Array(['e', args.command, 0]));
    }

    BabyBotPushCommand(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        BabyBotCommand(block, new Uint8Array(['s', args.command, 0]));
    }
    BabyBotStart(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        BabyBotCommand(block, new Uint8Array(['e', 'X', 0]));
    }
    BabyBotStop(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        BabyBotCommand(block, new Uint8Array(['e', 'S', 0]));
    }
    BabyBotClear(args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        BabyBotCommand(block, new Uint8Array(['e', 'C', 0]));
    }
}

module.exports = Scratch3SamLabs;