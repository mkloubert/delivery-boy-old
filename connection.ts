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

import * as crypto from 'crypto';
import * as db_contracts from './contracts';
import * as db_messages from './messages';
import * as events from 'events';
import * as simpleSocket from 'node-simple-socket';
import * as simpleSocketHelpers from 'node-simple-socket/helpers';


/**
 * A connection.
 */
export class Connection extends events.EventEmitter implements db_contracts.IConnection {
    /**
     * Stores the client.
     */
    protected _client: db_contracts.IClient;
    /**
     * Stores if handshake has been made or not.
     */
    protected _handskakeMade = false;
    /**
     * Stores the socket.
     */
    protected _socket: simpleSocket.SimpleSocket;
    /**
     * Stores the type.
     */
    protected _type: db_contracts.ConnectionType;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {db_contracts.ConnectionType} type The type. 
     * @param {db_contracts.IClient} client The client.
     * @param {simpleSocket.SimpleSocket} socket The socket.
     */
    constructor(type: db_contracts.ConnectionType,
                client: db_contracts.IClient,
                socket: simpleSocket.SimpleSocket) {
        super();

        this._type = type;
        this._client = client;
        this._socket = socket;
    }

    /** @inheritdoc */
    public get client(): db_contracts.IClient {
        return this._client;
    }

    /**
     * Makes a CLIENT handshake.
     * 
     * @return {PromiseLike<boolean>} The promise.
     */
    protected makeClientHandshake(): PromiseLike<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                me.socket.read().then((data) => {
                    try {
                        data = extractRandomBuffer(data);

                        if (data) {
                            let msg: db_messages.IHelloMessage = JSON.parse(data.toString('utf8'));

                            completed(null,
                                      msg && 2 === msg.type);
                        }
                        else {
                            completed(null, false);
                        }
                    }
                    catch (e) {
                        completed(e);
                    }
                }, (err) => {
                    completed(err);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Makes a handshake if needed.
     * 
     * @return {PromiseLike<boolean|null>} The promise.
     */
    protected makeHandskakeIfNeeded(): PromiseLike<boolean | null> {
        let me = this;

        return new Promise<boolean | null>((resolve, reject) => {
            if (me._handskakeMade) {
                resolve(false);
            }
            else {
                let type = me.type;

                try {
                    if (type == db_contracts.ConnectionType.Server) {
                        // SERVER handshake

                        me.makeServerHandshake().then((handshakeMade) => {
                            me._handskakeMade = handshakeMade;

                            resolve(handshakeMade ? true : null);
                        }, (err) => {
                            reject(err);
                        });
                    }
                    else if (type == db_contracts.ConnectionType.Client) {
                        // CLIENT handshake
                        
                        me.makeClientHandshake().then((handshakeMade) => {
                            me._handskakeMade = handshakeMade;

                            resolve(handshakeMade ? true : null);
                        }, (err) => {
                            reject(err);
                        });
                    }
                    else {
                        reject(new Error(`Unknown connection type ${type}`));
                    }
                }
                catch (e) {
                    reject(e);
                }
            }
        });
    }

    /**
     * Makes a SERVER handshake.
     * 
     * @return {PromiseLike<boolean>} The promise.
     */
    protected makeServerHandshake(): PromiseLike<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let helloMsg: db_messages.IHelloMessage = {
                    type: 2,
                };

                createRandomBuffer().then((randBuff) => {
                    let dataToSend = Buffer.concat([
                        randBuff,
                        new Buffer(JSON.stringify(helloMsg), 'utf8'),
                    ]);

                    me.socket.write(dataToSend).then((sendData) => {
                        completed(null,
                                  sendData && sendData.length === dataToSend.length);
                    }, (err) => {
                        completed(err);
                    });
                }, (err) => {
                    completed(err);
                });                    
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Reads a message.
     * 
     * @return {PromiseLike<TMsg>} The promise.
     */
    public readMessage<TMsg extends db_messages.IMessage>(): PromiseLike<TMsg> {
        let me = this;
        
        return new Promise<TMsg>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                me.makeHandskakeIfNeeded().then((handshakeMade) => {
                    if (null === handshakeMade) {
                        let tellForNoHandshake = () => {
                            completed(new Error('Handshake failed!'));
                        };

                        // no handshake => no connection
                        me.socket.end().then(() => {
                            tellForNoHandshake();
                        }, (err) => {
                            tellForNoHandshake();
                        });
                    }
                    else {
                        me.socket.read().then((data) => {
                            try {
                                data = extractRandomBuffer(data);
                                if (data) {
                                    completed(null,
                                              JSON.parse(data.toString('utf8')));
                                }
                                else {
                                    completed(null, <any>data);
                                }
                            }
                            catch (e) {
                                completed(e);
                            }
                        }, (err) => {
                            completed(err);
                        });

                        me.socket.readJSON<TMsg>().then((msg) => {
                            completed(null, msg);
                        }, (err) => {
                            completed(err);
                        });
                    }
                }, (err) => {
                    completed(err);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Sends a message.
     * 
     * @param {TMsg} msg The message to send.
     * 
     * @return {PromiseLike<Buffer>} The promise.
     */
    public sendMessage<TMsg extends db_messages.IMessage>(msg: TMsg): PromiseLike<Buffer> {
        let me = this;

        return new Promise<Buffer>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                if (simpleSocketHelpers.isNullOrUndefined(msg)) {
                    completed(null, <any>msg);
                    return;
                }

                me.makeHandskakeIfNeeded().then((handshakeMade) => {
                    try {
                        if (null === handshakeMade) {
                            let tellForNoHandshake = () => {
                                completed(new Error('Handshake failed!'));
                            };

                            // no handshake => no connection
                            me.socket.end().then(() => {
                                tellForNoHandshake();
                            }, (err) => {
                                tellForNoHandshake();
                            });
                        }
                        else {
                            createRandomBuffer().then((randBuff) => {
                                try {
                                    let dataToSend = Buffer.concat([
                                        randBuff,
                                        new Buffer(JSON.stringify(msg), 'utf8'),
                                    ]);

                                    me.socket.write(dataToSend).then((buffer) => {
                                        completed(null, buffer);
                                    }, (err) => {
                                        completed(err);
                                    });
                                }
                                catch (e) {
                                    completed(e);
                                }
                            }, (err) => {
                                completed(err);
                            });
                        }
                    }
                    catch (e) {
                        completed(e);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /** @inheritdoc */
    public get socket(): simpleSocket.SimpleSocket {
        return this._socket;
    }

    /** @inheritdoc */
    public get type(): db_contracts.ConnectionType {
        return this._type;
    }
}


function createRandomBuffer(): PromiseLike<Buffer> {
    let length = Math.floor(Math.random() * 256);
    if (length < 1) {
        length = 0;
    }
    else if (length > 255) {
        length = 255;
    }

    let buff = Buffer.alloc(1 + length);
    buff.writeUInt8(length, 0);

    return new Promise<Buffer>((resolve, reject) => {
        if (length < 1) {
            resolve(buff);
            return;
        }

        crypto.randomBytes(length, (err, randBuff) => {
            try {
                if (err) {
                    reject(err);
                }
                else {
                    randBuff.copy(buff, 1);

                    resolve(buff);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    });
}

function extractRandomBuffer(buff: Buffer): Buffer {
    let realBuffer = buff;
    if (buff) {
        let length = buff.readUInt8(0);

        if (length > 0) {
            realBuffer = Buffer.alloc(length);

            buff.copy(realBuffer, 0,
                      1 + length);
        }
        else {
            realBuffer = Buffer.alloc(0);
        }
    }

    return realBuffer;
}
