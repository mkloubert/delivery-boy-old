/// <reference types="node" />

// delivery-boy (https://github.com/mkloubert/delivery-boy)
// Copyright (C) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import * as Crypto from 'crypto';
import * as dboy_contracts from '../contracts';
import * as dboy_downloads from '../downloads';
import * as dboy_helpers from '../helpers';
import * as dboy_libraries from '../libraries';
import * as dboy_objects from '../objects';
import * as dboy_sockets from '../sockets';
import * as dboy_workflows_general from './workflows/general';
import * as FS from 'fs';
import * as Net from 'net';
let NodeRSA = require('node-rsa');
import * as Path from 'path';

const CRYPTO_ALGO = 'aes-256-ctr';
const JSON_ENCODING = 'utf8';
const MAX_MSG_LENGTH = 16777215;

/**
 * A client instance.
 */
export class Client extends dboy_objects.CommonEventObjectBase implements dboy_contracts.Client {
    /**
     * Stores the current configuration.
     */
    protected _config: dboy_contracts.ClientConfig;
    /**
     * Stores the current download list.
     */
    protected _downloads: dboy_contracts.DownloadList;
    /**
     * Stores the current library.
     */
    protected _library: dboy_contracts.FileLibrary;
    /**
     * The RSA key for encryption.
     */
    protected _key: any;
    /**
     * Stores the current server.
     */
    protected _server: Net.Server;
    /**
     * Stores the current state.
     */
    protected _state = dboy_contracts.CLIENT_STATE_STOPPED;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.ClientConfig} [cfg] The configuration to use.
     */
    constructor(cfg?: dboy_contracts.ClientConfig) {
        super();

        this.updateConfig(cfg);
    }

    /* @inheritdoc */
    public get config(): dboy_contracts.ClientConfig {
        return this._config;
    }

    /* @inheritdoc */
    public connectTo(host: string, port: number,
                     callback: (err: any, conn?: dboy_contracts.ClientConnection) => void): void {
        let me = this;

        let socket: Net.Socket;
        let conn: dboy_contracts.ClientConnection;
        let completed = (err?: any) => {
            if (err) {
                try {
                    socket.destroy();
                }
                catch (e) { /* ignore */ };

                callback(err);
            }
            else {
                callback(null, conn);
            }
        };

        try {
            socket = Net.createConnection(port, host, () => {
                // data length of RSA key
                dboy_helpers.readSocket(socket, 4, (err, buff) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    if (4 != buff.length) {
                        completed(new Error("Invalid buffer size for data length: " + buff.length));
                        return;
                    }

                    let dataLength = buff.readUInt32LE(0);
                    if (dataLength < 1 || dataLength > MAX_MSG_LENGTH) {
                        completed(new Error("Invalid data length: " + dataLength));
                        return;
                    }

                    dboy_helpers.readSocket(socket, dataLength, (err, buff) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        if (dataLength != buff.length) {
                            completed(new Error(`Invalid buffer size for data: ${buff.length}/${dataLength}`));
                            return;
                        }

                        try {
                            let base64key = buff.toString('base64');

                            let tempKey = '-----BEGIN RSA PUBLIC KEY-----\n' + 
                                          dboy_helpers.lineBreak(base64key, 64) + 
                                          '\n-----END RSA PUBLIC KEY-----';

                            let key = new NodeRSA();
                            key.importKey(tempKey);

                            let pwd = dboy_helpers.randomBuffer(me._config.security.passwords.size);
                            let encryptedPwd = key.encrypt(pwd);
                            
                            let encryptedPwdLength = Buffer.alloc(4);
                            encryptedPwdLength.writeUInt32LE(encryptedPwd.length, 0);

                            // send data length of crypted password
                            socket.write(encryptedPwdLength, (err: any) => {
                                if (err) {
                                    completed(err);
                                    return;
                                }

                                // now the crypted password itself
                                socket.write(encryptedPwd, (err: any) => {
                                    if (err) {
                                        completed(err);
                                        return;
                                    }

                                    let socketConn = new dboy_sockets.SocketConnection(socket);
                                    conn = new CryptedClientConnection(socketConn, pwd);

                                    // wait for "OK"
                                    conn.read<dboy_contracts.Message>((err, data) => {
                                        if (err) {
                                            completed(new Error("Socket error: " + err));
                                            return;
                                        }

                                        switch (data.type) {
                                            case 0:
                                                completed();
                                                break;

                                            default:
                                                completed(new Error(`Unknown result type '${data.type}'!`));
                                                break;
                                        }
                                    });
                                });
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                });
            });

            socket.on('error', (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public downloads(callback: (err: any, list?: dboy_contracts.DownloadList) => void): void {
        let me = this;

        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                callback(null, me._downloads);
            }
        };

        try {
            let tempDir = me.config.folders.temp;
            if (!Path.isAbsolute(tempDir)) {
                tempDir = Path.join(process.cwd(), tempDir);
            }

            let checkIfDirectory = () => {
                FS.lstat(tempDir, (err, stats) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    if (stats.isDirectory()) {
                        me._downloads = new dboy_downloads.DownloadList(me, tempDir);
                        completed();
                    }
                    else {
                        let err = new Error(`'${tempDir}' is NO directory!`);
                        completed(err);
                    }
                });
            };

            let getRealPath = () => {
                FS.realpath(tempDir, (err, resolvedPath) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    tempDir = resolvedPath;
                    checkIfDirectory();
                });
            }

            let createNewList = () => {
                FS.exists(tempDir, (exists) => {
                    if (!exists) {
                        FS.mkdir(tempDir, (err) => {
                            if (err) {
                                completed(err);
                                return;
                            }

                            getRealPath();
                        });
                    }
                    else {
                        getRealPath();
                    }
                });
            }

            if (!me._downloads) {
                createNewList();
            }
            else {
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    }

    /**
     * Exports RSA key as raw buffer.
     * 
     * @return {Buffer} RSA key as raw buffer.
     */
    protected exportRawKey(): Buffer {
        let key = this._key;
        if (!key) {
            return;
        }

        let format = 'pkcs1';

        let pkcs1: string = key.exportKey('pkcs1-public');

        let pkcs1_parts: string[] = pkcs1.split('\n');
        pkcs1_parts.splice(0, 1);
        pkcs1_parts.splice(pkcs1_parts.length - 1, 1);

        return new Buffer(pkcs1_parts.join(''), 'base64');
    }

    /**
     * Handles a new connection.
     * 
     * @param {Net.Socket} remoteSocket The remote socket.
     */
    protected handleNewConnection(remoteSocket: Net.Socket): void {
        if (!remoteSocket) {
            return;
        }

        let me = this;
        let conn = new dboy_sockets.SocketConnection(remoteSocket);

        let closeSocket = () => {
            conn.close();
        };

        // check if something wants to close the connection
        let connectingEventArgs: dboy_contracts.ClientConnectingEventArguments = {
            close: false,
            connection: conn,
        };
        me.raiseEvent(dboy_contracts.EVENT_NAME_CONNECTING, connectingEventArgs);

        if (connectingEventArgs.close) {
            closeSocket();
            return;
        }

        let key = this._key;
        let rawKey = this.exportRawKey();
        if (!key || !rawKey) {
            closeSocket();
            return;
        }

        let dataLength = Buffer.alloc(4);
        dataLength.writeUInt32LE(rawKey.length, 0);

        // send length of public RSA key
        conn.write(dataLength, (err: any) => {
            if (err) {
                closeSocket();
                return;
            }

            // send raw RSA key
            conn.write(rawKey, (err: any) => {
                if (err) {
                    closeSocket();
                    return;
                }

                // read data length of crypted password
                conn.read(4, (err, buff) => {
                    if (err) {
                        closeSocket();
                        return;
                    }

                    if (4 != buff.length) {
                        closeSocket();
                        return;
                    }

                    let dataLength = buff.readUInt32LE(0);
                    if (dataLength < 1 || dataLength > MAX_MSG_LENGTH) {
                        closeSocket();
                        return;
                    }

                    // read crypted password
                    conn.read(dataLength, (err, buff) => {
                        if (err) {
                            closeSocket();
                            return;
                        }

                        if (dataLength != buff.length) {
                            closeSocket();
                            return;
                        }

                        try {
                            let pwd = key.decrypt(buff);

                            let clientConn = new CryptedClientConnection(conn, pwd);
                            dboy_workflows_general.sendOK(clientConn, (err) => {
                                if (err) {
                                    closeSocket();
                                    return;
                                }

                                me.raiseEvent(dboy_contracts.EVENT_NAME_CONNECTED, <dboy_contracts.ClientConnectionEstablishedEventArguments>{
                                    connection: clientConn,
                                });
                            });
                        }
                        catch (e) {
                            closeSocket();
                        }
                    });
                });
            });
        });
    }

    /* @inheritdoc */
    public library(callback: (err: any, lib?: dboy_contracts.FileLibrary) => void): void {
        let me = this;
        
        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                callback(null, me._library);
            }
        };

        try {
            if (!me._library) {
                me._library = new dboy_libraries.FileLibrary(me,
                                                             process.cwd());
            }

            completed();
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public onConnected(handler: dboy_contracts.ClientConnectionEstablishedEventHandler): Client {
        return <Client>this.on(dboy_contracts.EVENT_NAME_CONNECTED,
                               handler);
    }

    /* @inheritdoc */
    public onConnecting(handler: dboy_contracts.ClientConnectingEventHandler): Client {
        return <Client>this.on(dboy_contracts.EVENT_NAME_CONNECTING,
                               handler);
    }

    /* @inheritdoc */
    public start(callback?: (err: any) => void): void {
        let me = this;

        let completed = (err?: any) => {
            if (callback) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null);
                }
            }
        };
        
        try {
            let currentState = this._state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_STARTING:
                case dboy_contracts.CLIENT_STATE_STOPPING:
                    this.start(callback);
                    break;

                case dboy_contracts.CLIENT_STATE_RUNNING:
                    completed();
                    break;

                case dboy_contracts.CLIENT_STATE_STOPPED:
                    this._state = dboy_contracts.CLIENT_STATE_STARTING;
                    this.raisePropertyChanged('state');

                    let newServer: Net.Server;
                    newServer = Net.createServer((socket) => {
                        me.handleNewConnection(socket);
                    });
                    newServer.on('error', (err) => {
                        me._state = dboy_contracts.CLIENT_STATE_STOPPED;
                        me.raisePropertyChanged('state');

                        completed(err);
                    });
                    newServer.listen(me._config.port, async () => {
                        try {
                            let newKey = await dboy_helpers.runInBackground(() => {
                                let key = new NodeRSA();
                                key.generateKeyPair(me._config.security.rsa.keySize);

                                return key;
                            });

                            me._key = newKey;
                            me._server = newServer;

                            me._state = dboy_contracts.CLIENT_STATE_RUNNING;
                            me.raisePropertyChanged('state');

                            completed();
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                    break;

                default:
                    completed(new Error(`Cannot start while in following state: ${currentState}`));
                    break;
            }
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public get state(): number {
        return this._state;
    }

    /* @inheritdoc */
    public stop(callback?: (err: any) => void): void {
        let me = this;

        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                callback(null);
            }
        };
        
        try {
            let currentState = me.state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_STARTING:
                case dboy_contracts.CLIENT_STATE_STOPPING:
                    me.stop(callback);
                    break;

                case dboy_contracts.CLIENT_STATE_RUNNING:
                    me._state = dboy_contracts.CLIENT_STATE_STOPPING;
                    me.raisePropertyChanged('state');

                    let oldServer = me._server;
                    if (oldServer) {
                        oldServer.close((err: any) => {
                            let newState: number;
                            if (!err) {
                                me._server = null;
                                me._key = null;

                                newState = dboy_contracts.CLIENT_STATE_STOPPED;
                            }
                            else {
                                newState = dboy_contracts.CLIENT_STATE_RUNNING;
                            }

                            me._state = newState;
                            me.raisePropertyChanged('state');

                            completed(err);
                        });
                    }
                    else {
                        completed();
                    }
                    break;

                case dboy_contracts.CLIENT_STATE_STOPPED:
                    completed(null);
                    break;

                default:
                    completed(new Error(`Cannot stop while in following state: ${currentState}`));
                    break;
            }
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public toggle(callback?: (err: any) => void): void {
        try {
            let currentState = this.state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_RUNNING:
                    this.stop(callback);
                    break;

                case dboy_contracts.CLIENT_STATE_STOPPED:
                    this.start(callback);
                    break;

                default:
                    this.invokeCallback(callback,
                                        new Error(`Cannot toggle client state from ${currentState}!`));
                    break;
            }
        }
        catch (e) {
            this.invokeCallback(callback, e);
        }
    }

    /**
     * Updates configuration.
     * 
     * @param {dboy_contracts.ClientConfig} [cfg] The configuration to update.
     */
    protected updateConfig(cfg?: dboy_contracts.ClientConfig) {
        // use a copy of 'originalCfg'
        let newCfg = {
            folders: {
                shares: <string[]>[],
                temp: './temp'
            },
            port: 23979,
            security: {
                passwords: {
                    size: 48,
                },
                rsa: {
                    keySize: 2048,
                },
            }
        };

        if (!cfg) {
            cfg = {};
        }

        if (cfg) {
            if (cfg.folders) {
                if (cfg.folders.temp) {
                    newCfg.folders.temp = cfg.folders.temp;
                }

                if (cfg.folders.shares) {
                    newCfg.folders.shares = 
                        cfg.folders.shares
                                   .map(x => x ? ('' + x).trim() : '')
                                   .filter(x => x ? true : false);
                }
            }

            if (cfg.security) {
                if (cfg.security.passwords) {
                    if (cfg.security.passwords.size) {
                        newCfg.security.passwords.size =
                            parseInt(('' + cfg.security.passwords.size).trim());
                    }
                }

                if (cfg.security.rsa) {
                    if (cfg.security.rsa.keySize) {
                        newCfg.security.rsa.keySize =
                            parseInt(('' + cfg.security.rsa.keySize).trim());
                    }
                }
            }
        }

        // remove duplicate elements
        newCfg.folders.shares =
            newCfg.folders.shares
                          .filter((x, pos) => newCfg.folders.shares.indexOf(x) == pos);

        if (newCfg.folders.shares.length < 1) {
            newCfg.folders.shares.push('./shares');  // default share folder
        }

        if (cfg.port) {
            newCfg.port = parseInt(('' + cfg.port).trim());
        }

        this._config = newCfg;
    }

    /* @inheritdoc */
    public whenRunningOrStopped(callback: (err: any) => void): void {
        try {
            let currentState = this.state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_RUNNING:
                case dboy_contracts.CLIENT_STATE_STOPPED:
                    this.invokeCallback(callback);
                    break;

                case dboy_contracts.CLIENT_STATE_STARTING:
                case dboy_contracts.CLIENT_STATE_STOPPING:
                    this.whenRunningOrStopped(callback);
                    break;

                default:
                    this.invokeCallback(callback,
                                        new Error('Client is in invalid state: ' + currentState));
                    break;
            }

            this.invokeCallback(callback);
        }
        catch (e) {
            this.invokeCallback(callback, e);
        }
    }
}

/**
 * A crypted client connection.
 */
export class CryptedClientConnection extends dboy_objects.CommonEventObjectBase implements dboy_contracts.ClientConnection {
    /**
     * Stores the underlying "raw" connection.
     */
    protected readonly _CONN: dboy_contracts.Connection;
    /**
     * Stores the password.
     */
    protected readonly _PWD: Buffer;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.Connection} conn The underlying "raw" connection.
     * @param {Buffer} pwd The password.
     */
    constructor(conn: dboy_contracts.Connection, pwd: Buffer) {
        super();

        this._CONN = conn;
        this._PWD = pwd;

        let me = this;
        this._CONN.once(dboy_contracts.EVENT_NAME_CLOSED, (args: dboy_contracts.EventArguments) => {
            me.raiseEvent(dboy_contracts.EVENT_NAME_CLOSED, args);
        });
    }

    /* @inheritdoc */
    public close(callback?: (err: any) => void): void {
        this._CONN
            .close(callback);
    }

    /* @inheritdoc */
    public get connection(): dboy_contracts.Connection {
        return this._CONN;
    }

    /* @inheritdoc */
    public onClosed(handler: dboy_contracts.EventHandler): CryptedClientConnection {
        return <CryptedClientConnection>this.on(dboy_contracts.EVENT_NAME_CLOSED,
                                                handler);
    }

    /* @inheritdoc */
    public read<T>(callback: (err: any, data?: T) => void): void {
        let me = this;

        let data: T;
        let completed = (err?: any) => {
            if (err) {
                me._CONN.close(() => {
                    callback(err);
                });
            }
            else {
                callback(null, data);
            }
        };

        this._CONN.read(4, (err, buffer) => {
            if (err) {
                completed(err);
                return;
            }

            if (4 != buffer.length) {
                completed(new Error('Invalid size for data length: ' + buffer.length));
                return;
            }

            let dataLength = buffer.readUInt32LE(0);
            if (dataLength > MAX_MSG_LENGTH) {
                completed(new Error('Invalid data length value: ' + dataLength));
                return;
            }

            me._CONN.read(dataLength, (err, buffer) => {
                if (err) {
                    completed(err);
                    return;
                }

                if (dataLength != buffer.length) {
                    completed(new Error(`Invalid size of buffer length: ${buffer.length}/${dataLength}`));
                    return;
                }

                try {
                    // decrypt data
                    let decipher = Crypto.createDecipher(CRYPTO_ALGO, me._PWD);

                    let decryptedBuffer = Buffer.concat([
                        decipher.update(buffer),
                        decipher.final(),
                    ]);

                    if (decryptedBuffer.length < 1) {
                        data = null;
                    }
                    else {
                        data = <T>JSON.parse(decryptedBuffer.toString(JSON_ENCODING));
                    }

                    completed();
                }
                catch (e) {
                    completed(e);
                }
            });
        });
    }

    /* @inheritdoc */
    public write<T>(data: T, callback?: (err: any) => void): void {
        let me = this;

        let completed = (err?: any) => {
            if (callback) {
                if (err) {
                    me._CONN.close(() => {
                        callback(err);
                    });
                }
                else {
                    callback(null);
                }
            }
        };

        try {
            let json: string = '';
            if (data) {
                json = JSON.stringify(data);
            }

            let buffer = new Buffer(json, JSON_ENCODING);

            // encrypt data
            let cipher = Crypto.createCipher(CRYPTO_ALGO, me._PWD);

            // merge data to one buffer
            let cryptedBuffer = Buffer.concat([
                cipher.update(buffer),
                cipher.final()
            ]);

            // data length of crypted buffer
            let dataLength = Buffer.alloc(4);
            dataLength.writeUInt32LE(cryptedBuffer.length, 0);

            // first send data length
            me._CONN.write(dataLength, (err) => {
                if (err) {
                    completed(err);
                    return;
                }

                // now the crypted data
                me._CONN.write(cryptedBuffer, (err) => {
                    completed(err);
                });
            });
        }
        catch (e) {
            completed(e);
        }
    }
}
