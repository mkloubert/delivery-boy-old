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

import * as db_connection from './connection';
import * as db_contracts from './contracts';
import * as events from 'events';
import * as net from 'net';
import * as simpleSocket from 'node-simple-socket';
import * as simpleSocketHelpers from 'node-simple-socket/helpers';


/**
 * The default TCP port.
 */
export const DEFAULT_PORT = 221286;


/**
 * A client.
 */
export class DeliveryBoy extends events.EventEmitter implements db_contracts.IClient {
    /**
     * The underyling server instance.
     */
    protected _server: net.Server;

    /**
     * Connects to a remote client.
     * 
     * @param string host The host IP / address. 
     * @param number [port] The TCP port.
     * 
     * @return {PromiseLike<db_contracts.IConnection>} The connection.
     */
    public connect(host: string, port?: number): PromiseLike<db_contracts.IConnection> {
        let me = this;

        host = simpleSocketHelpers.normalizeString(host);
        if (!host) {
            host = 'localhost';
        }

        port = parseInt(simpleSocketHelpers.toStringSafe(port).trim());
        if (isNaN(port)) {
            port = DEFAULT_PORT;
        }
        
        return new Promise<db_contracts.IConnection>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                simpleSocket.connect(port, host).then((newConnection) => {
                    try {
                        let emitEvent = (accepted: boolean) => {
                            accepted = simpleSocketHelpers.toBooleanSafe(accepted, true);

                            try {
                                if (accepted) {
                                    let conn = new db_connection.Connection(db_contracts.ConnectionType.Client,
                                                                            me, newConnection);

                                    me.emit('connect.connected',
                                            conn);
                                }
                                else {
                                    // not accepted
                                    newConnection.end().then(() => {
                                        me.emit('connect.reject',
                                                null, newConnection);
                                    }, (err) => {
                                        me.emit('connect.reject',
                                                err, newConnection);
                                    });
                                }
                            }
                            catch (e) {
                                me.emit('error.listen', e, 3);
                            }
                        };

                        validateConnection(me.remoteValidator, newConnection, db_contracts.ConnectionType.Client).then((connectionAccepted) => {
                            emitEvent(connectionAccepted);
                        }, (err) => {
                            me.emit('error.connect', err, 1);
                        });
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
     * The port to use.
     */
    public port = DEFAULT_PORT;

    /**
     * Gets or sets the function that validates a new remote connection.
     */
    public remoteValidator: db_contracts.ConnectionValidator;

    /**
     * Gets the underlying / running server instance.
     */
    public get server(): net.Server {
        return this._server;
    }

    /**
     * Starts the client.
     * 
     * @return {PromiseLike<boolean>} The promise.
     */
    public start(): PromiseLike<boolean> {
        let me = this;
        
        return new Promise<boolean>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                if (me._server) {
                    completed(null, false);
                    return;
                }

                let port = parseInt(simpleSocketHelpers.toStringSafe(me.port).trim());
                if (isNaN(port)) {
                    port = DEFAULT_PORT;
                }

                simpleSocket.listen(port, (err, newConnection) => {
                    try {
                        if (err) {
                            me.emit('error.listen', err, 2);
                        }
                        else {
                            let emitEvent = (accepted: boolean) => {
                                accepted = simpleSocketHelpers.toBooleanSafe(accepted, true);

                                try {
                                    if (accepted) {
                                        let conn = new db_connection.Connection(db_contracts.ConnectionType.Server,
                                                                                me, newConnection);

                                        me.emit('listen.accepted',
                                                conn);
                                    }
                                    else {
                                        // not accepted
                                        newConnection.end().then(() => {
                                            me.emit('listen.reject', 
                                                    null, newConnection);
                                        }, (e) => {
                                            me.emit('listen.reject',
                                                    err, newConnection);
                                        });
                                    }
                                }
                                catch (e) {
                                    me.emit('error.listen', e, 3);
                                }
                            };

                            validateConnection(me.remoteValidator, newConnection, db_contracts.ConnectionType.Server).then((connectionAccepted) => {
                                emitEvent(connectionAccepted);
                            }, (err) => {
                                me.emit('error.listen', err, 2);
                            });       
                        }
                    }
                    catch (e) {
                        me.emit('error.listen', e, 1);
                    }
                }).then((server) => {
                    me._server = server;

                    completed(null, true);
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
     * Stops the client.
     * 
     * @return {PromiseLike<boolean>} The promise.
     */
    public stop(): PromiseLike<boolean> {
        let me = this;
        
        return new Promise<boolean>((resolve, reject) => {
            let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let oldServer = me._server;
                if (!oldServer) {
                    completed(null, false);
                    return;
                }

                oldServer.close((err: any) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        me._server = null;

                        completed(null, true);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
}


function validateConnection(validator: db_contracts.ConnectionValidator,
                            socket: simpleSocket.SimpleSocket, type: db_contracts.ConnectionType): PromiseLike<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let completed = simpleSocketHelpers.createSimplePromiseCompletedAction(resolve, reject);

        try {
            if (validator) {
                let validatorResult = validator(socket, db_contracts.ConnectionType.Server);
                if (simpleSocketHelpers.isNullOrUndefined(validatorResult)) {
                    completed(null, true);
                }
                else {
                    if ('object' === typeof validatorResult) {
                        validatorResult.then((connectionAccepted) => {
                            completed(null, connectionAccepted);
                        }, (err) => {
                            completed(err);
                        });
                    }
                    else {
                        completed(null, <boolean>validatorResult);
                    }
                }
            }
            else {
                completed(null, true);
            }
        }
        catch (e) {
            completed(e);
        }
    });
}