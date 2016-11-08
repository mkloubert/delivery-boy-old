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

import * as dboy_contracts from './contracts';
import * as Net from 'net';

/**
 * Does a forced line break.
 * 
 * @param {string} str The input string.
 * @param {number} maxLen The maximum length of a line.
 * @param {string} nl The string that represents a new line.
 * 
 * @return {string} The output string.
 */
export function lineBreak(str: string, maxLen: number, nl = "\n"): string {
    let res = '';
    let i = 0;
    while (i + maxLen < str.length) {
        res += str.substring(i, i + maxLen) + nl;
        i += maxLen;
    }

    return res + str.substring(i, str.length);
};

/**
 * Creates a random buffer.
 * 
 * @param {number} size The size of the result string.
 * 
 * @return {Buffer} The random buffer.
 */
export function randomBuffer(size: number): Buffer {
    let result = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
        result.writeUInt8(Math.floor(Math.random() * 256),
                          i);
    }

    return result;
}

/**
 * Reads a number of bytes from a socket.
 * 
 * @param {Net.Socket} socket The socket.
 * @param {Number} bytesToRead The amount of bytes to read.
 * @param {Function} callback The result callback.
 */
export function readSocket(socket: Net.Socket, bytesToRead: number,
                           callback: (err: any, buffer?: Buffer) => void): void {

    try {
        let buff: Buffer = socket.read(bytesToRead);
        if (null === buff) {
            socket.once('readable', function() {
                readSocket(socket, bytesToRead, (err, buffer) => {
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

/**
 * Runs a task in background.
 * 
 * @param {Function} func The function to invoke.
 * @param {any} {arg} An optional argument for the function.
 * 
 * @return {any} The result of the function.
 */
export function runInBackground<TResult, T>(func: (arg?: T) => TResult, arg?: T): Promise<TResult> {
    return new Promise((resolve, reject) => {
        //TODO: wrap with a background worker library
        
        try {
            let result = func(arg);

            resolve(result);
        }
        catch (e) {
            reject(e);
        }
    });
}
