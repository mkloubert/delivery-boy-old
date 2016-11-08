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

import * as dboy_factory from '../lib/factory';


let client = dboy_factory.createClient({
    port: 5979,
});

client.start((err) => {
    if (err) {
        console.log('START ERROR: ' + err.stack);
    }
    else {
        client.connectTo('127.0.0.1', 23979, (err, conn) => {
            if (err) {
                console.log('CONNECTION ERROR: ' + err.stack);
            }
            else {
                console.log('Connected');
            }
        });
    }
});
