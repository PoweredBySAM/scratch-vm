// ble-web.js
// Copied from the microbit-more project:
// https://github.com/microbit-more/mbit-more-v2
//
// Copyright (c) 2021 Koji Yokokawa
//
// This file contains portions of code from the above project and is
// redistributed under the terms of the MIT License.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const log = require('../../util/log');

const uint8ArrayToBase64 = array => window.btoa(String.fromCharCode(...array));
const base64ToUint8Array = base64 => {
    const raw = window.atob(base64);
    return Uint8Array.from(Array.prototype.map.call(raw, x => x.charCodeAt(0)));
};

class WebBLE {

    /**
     * A BLE peripheral object.  It handles connecting, over Web Bluetooth API, to
     * BLE peripherals, and reading and writing data to them.
     * @param {Runtime} runtime - the Runtime for sending/receiving GUI update events.
     * @param {string} extensionId - the id of the extension using this object.
     * @param {object} peripheralOptions - the list of options for peripheral discovery.
     * @param {object} connectCallback - a callback for connection.
     * @param {object} resetCallback - a callback for resetting extension state.
     */
    constructor (runtime, extensionId, peripheralOptions, connectCallback, resetCallback = null) {
        /**
         * Remote device which have been connected.
         * @type {BluetoothDevice}
         */
        this._device = null;

        /**
         * Remote GATT server
         * @type {BluetoothRemoteGATTServer}
         */
        this._server = null;

        this._connectCallback = connectCallback;
        this._disconnected = true;
        this._characteristicDidChangeCallback = null;
        this._resetCallback = resetCallback;
        this._extensionId = extensionId;
        this._peripheralOptions = peripheralOptions;
        this._runtime = runtime;

        this.requestPeripheral();
    }

    /**
     * Request connection to the peripheral.
     * Request user to choose a device, and then connect it automatically.
     */
    requestPeripheral () {
        if (this._server) {
            this.disconnect();
        }
        navigator.bluetooth.requestDevice(this._peripheralOptions)
            .then(device => {
                this._device = device;
                log.debug(`device=${this._device.name}`);
                this._runtime.connectPeripheral(this._extensionId, this._device.id);
            })
            .catch(e => {
                this._handleRequestError(e);
            });
    }

    /**
     * Try connecting to the GATT server of the device, and then call the connect
     * callback when connection is successful.
     */
    connectPeripheral (/* id */) {
        if (!this._device) {
            throw new Error('device is not chosen');
        }
        this._device.gatt.connect()
            .then(gattServer => {
                log.debug(`GATTServer is connected`);
                this._server = gattServer;
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
                this._disconnected = false;
                this._connectCallback();
                this._device.addEventListener('gattserverdisconnected',
                    event => {
                        this.onDisconnected(event);
                    });
            });
    }

    /**
     * Disconnect from the device and clean up.
     * Then emit the connection state by the runtime.
     */
    disconnect () {
        if (!this._server) return;
        this._server.disconnect();
        this._disconnected = true;
        this._server = null;
        this._device = null;
        this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
    }

    /**
     * @return {bool} whether the peripheral is connected.
     */
    isConnected () {
        if (!this._server) return false;
        return this._server.connected;
    }

    /**
     * Start receiving notifications from the specified ble service.
     * @param {number} serviceId - the ble service to read.
     * @param {number} characteristicId - the ble characteristic to get notifications from.
     * @param {object} onCharacteristicChanged - callback for characteristic change notifications
     *  like function(base64message).
     * @return {Promise} - a promise from the remote startNotifications request.
     */
    startNotifications (serviceId, characteristicId, onCharacteristicChanged = null) {
        return this._server.getPrimaryService(serviceId)
            .then(service => service.getCharacteristic(characteristicId))
            .then(characteristic => {
                characteristic.addEventListener('characteristicvaluechanged',
                    event => {
                        const dataView = event.target.value;
                        onCharacteristicChanged(uint8ArrayToBase64(new Uint8Array(dataView.buffer)));
                    });
                characteristic.startNotifications();
            });
    }

    /**
     * Read from the specified ble service.
     * @param {number} serviceId - the ble service to read.
     * @param {number} characteristicId - the ble characteristic to read.
     * @param {boolean} optStartNotifications - whether to start receiving characteristic change notifications.
     * @param {object} onCharacteristicChanged - callback for characteristic change notifications
     *  like function(base64message).
     * @return {Promise} - a promise from the remote read request which resolve {message: base64string}.
     */
    read (serviceId, characteristicId, optStartNotifications = false, onCharacteristicChanged = null) {
        return this._server.getPrimaryService(serviceId)
            .then(service => service.getCharacteristic(characteristicId))
            .then(characteristic => {
                if (optStartNotifications) {
                    this.startNotifications(serviceId, characteristicId, onCharacteristicChanged);
                }
                return characteristic.readValue();
            })
            .then(dataView => ({
                message: uint8ArrayToBase64(new Uint8Array(dataView.buffer))
            }));
    }

    /**
     * Write data to the specified ble service.
     * @param {number} serviceId - the ble service to write.
     * @param {number} characteristicId - the ble characteristic to write.
     * @param {string} message - the message to send.
     * @param {string} encoding - the message encoding type.
     * @param {boolean} withResponse - if true, resolve after peripheral's response.
     * @return {Promise} - a promise from the remote send request.
     */
    // eslint-disable-next-line no-unused-vars
    write (serviceId, characteristicId, message, encoding = null, withResponse = null) {
        const value = encoding === 'base64' ? base64ToUint8Array(message) : message;
        return this._server.getPrimaryService(serviceId)
            .then(service => service.getCharacteristic(characteristicId))
            .then(characteristic => {
                if (withResponse && characteristic.writeValueWithResponse) {
                    return characteristic.writeValueWithResponse(value);
                }
                if (characteristic.writeValueWithoutResponse) {
                    return characteristic.writeValueWithoutResponse(value);
                }
                return characteristic.writeValue(value);
            });
    }

    /**
     * Handle an error resulting from losing connection to a peripheral.
     *
     * This could be due to:
     * - battery depletion
     * - going out of bluetooth range
     * - being powered down
     *
     * Disconnect the device, and if the extension using this object has a
     * reset callback, call it. Finally, emit an error to the runtime.
     */
    handleDisconnectError (/* e */) {
        // log.error(`BLE error: ${JSON.stringify(e)}`);

        if (this._disconnected) return;

        this.disconnect();

        if (this._resetCallback) {
            this._resetCallback();
        }

        this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTION_LOST_ERROR, {
            message: `Scratch lost connection to`,
            extensionId: this._extensionId
        });
    }

    _handleRequestError (/* e */) {
        // log.error(`BLE error: ${JSON.stringify(e)}`);

        this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
            message: `Scratch lost connection to`,
            extensionId: this._extensionId
        });
    }

    /**
     * Called when disconnected by the device.
     */
    onDisconnected (/* event */) {
        this.handleDisconnectError(new Error('device disconnected'));
    }
}

module.exports = WebBLE;
