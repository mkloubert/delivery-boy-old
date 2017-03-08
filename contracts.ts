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

import * as db_messages from './messages';
import * as simpleSocket from 'node-simple-socket';


/**
 * List of connection types.
 */
export enum ConnectionType {
    /**
     * The connection works as server connected with a client.
     */
    Server = 1,
    /**
     * Works as client connected with a remote host / server
     */
    Client = 2,
}

/**
 * Validates a connection.
 * 
 * @param {simpleSocket.SimpleSocket} remote The connection to validate.
 * @param {ConnectionType} type The connection type.
 * 
 * @return {ConnectionValidatorResult} The result.
 */
export type ConnectionValidator = (remote: simpleSocket.SimpleSocket,
                                   type: ConnectionType) => ConnectionValidatorResult;

/**
 * The result of a connection validator.
 */
export type ConnectionValidatorResult = PromiseLike<boolean> | boolean | void;

/**
 * A client.
 */
export interface IClient extends NodeJS.EventEmitter {
}

/**
 * A connection.
 */
export interface IConnection extends NodeJS.EventEmitter {
    /**
     * Gets the client.
     */
    readonly client: IClient;
    /**
     * Reads a message.
     * 
     * @return {PromiseLike<TMsg>} The promise.
     */
    readMessage<TMsg extends db_messages.IMessage>(): PromiseLike<TMsg>;
    /**
     * Sends a message.
     * 
     * @param {TMsg} msg The message to send.
     * 
     * @return {PromiseLike<Buffer>} The promise.
     */
    sendMessage<TMsg extends db_messages.IMessage>(msg: TMsg): PromiseLike<Buffer>;
    /**
     * Gets the socket.
     */
    readonly socket: simpleSocket.SimpleSocket;
    /**
     * Gets the type of the connection.
     */
    readonly type: ConnectionType;
}
