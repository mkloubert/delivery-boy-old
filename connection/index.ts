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

import * as db_contracts from '../contracts';
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

    /** @inheritdoc */
    public get socket(): simpleSocket.SimpleSocket {
        return this._socket;
    }

    /** @inheritdoc */
    public get type(): db_contracts.ConnectionType {
        return this._type;
    }
}
