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

import * as Net from 'net';
import * as dboy_contracts from './contracts';
import * as dboy_objects from './objects';

/**
 * A socket connect.
 */
export class SocketConnection extends dboy_objects.CommonEventObjectBase implements dboy_contracts.Connection {
    /**
     * Stores the underlying socket.
     */
    protected readonly _SOCKET: Net.Socket;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {Net.Socket} socket The underlying socket.
     */
    constructor(socket: Net.Socket) {
        super();

        this._SOCKET = socket;

        let me = this;
        me._SOCKET.once('end', () => {
            me.raiseEvent(dboy_contracts.EVENT_NAME_CLOSED);
        });
    }

    /* @inheritdoc */
    public close(callback?: (err: any) => void): void {
        let err: any;
        
        try {
            this._SOCKET.destroy();
        }
        catch (e) {
            err = e;
        }

        if (callback) {
            callback(err);
        }
    }

    /* @inheritdoc */
    public onClosed(handler: dboy_contracts.EventHandler): SocketConnection {
        return <SocketConnection>this.on(dboy_contracts.EVENT_NAME_CLOSED,
                                         handler);
    }

    /* @inheritdoc */
    public read(bytesToRead: number, callback: (err: any, buffer?: Buffer) => void): void {
        let me = this;

        try {
            let buff: Buffer = me._SOCKET.read(bytesToRead);
            if (null === buff) {
                me._SOCKET.once('readable', function() {
                    me.read(bytesToRead, (err, buffer) => {
                        callback(err, buffer);
                    });
                });
            }
            else {
                callback(null, buff);
            }
        }
        catch (e) {
            callback(e);
        }
    }

    /* @inheritdoc */
    public write(buffer: Buffer, callback?: (err: any) => void): void {
        this._SOCKET.write(buffer, (err: any) => {
            if (callback) {
                callback(err);
            }
        });
    }
}
