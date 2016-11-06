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
import * as dboy_objects from './objects';

declare const Promise: PromiseConstructorLike;

/**
 * Implementation of a download list.
 */
export class DownloadList extends dboy_objects.CommonEventObjectBase implements dboy_contracts.DownloadList {
    protected readonly _CLIENT: dboy_contracts.Client;
    public readonly _ITEMS: dboy_contracts.DownloadItem[] = [];  //TODO

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.Client} client The underlying client.
     */
    constructor(client: dboy_contracts.Client) {
        super();

        this._CLIENT = client;
    }

    /* @inheritdoc */
    public get client(): dboy_contracts.Client {
        return this._CLIENT;
    }

    /* @inheritdoc */
    protected disposing<T>(resolve: () => void, reject: (reason: any) => void,
                           tag: T,
                           disposing: boolean) {
        
        let me = this;
        let remainingItems = this._ITEMS.length;

        let errors: dboy_contracts.ErrorContext<T>[] = [];
        let completed = () => {
            if (errors.length > 0) {
                let err = new Error(errors.map(x => `[] ` + x)
                                          .join('\n\n'));

                reject(err);
            }
            else {
                resolve();
            }
        };

        let i = 0;
        let disposeNext: () => void;
        disposeNext = function(): void {
            if (remainingItems < 1) {
                completed();
                return;
            }

            --remainingItems;

            let dl = me._ITEMS[i];
            if (!dl) {
                completed();
                return;
            }

            dl.dispose(tag).then(
                () => {
                    me._ITEMS
                      .splice(i, 1);

                    disposeNext();
                },
                (e) => {
                    errors.push(e);
                    ++i;

                    disposeNext();
                });
        };

        disposeNext();
    }

    /* @inheritdoc */
    public items<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.DownloadItem[], T>> {
        let me = this;
        
        return new Promise((resolve, reject) => {
            try {
                resolve(<dboy_contracts.PromiseResult<dboy_contracts.DownloadItem[], T>> {
                    result: me._ITEMS,
                    tag: tag,
                });
            }
            catch (e) {
                reject(<dboy_contracts.ErrorContext<T>>{
                    category: 'items',
                    code: 1,
                    error: e,
                    message: '' + e,
                    tag: tag,
                });
            }
        });
    }
}

/**
 * Implementation of a download lst item.
 */
export class DownloadItem extends dboy_objects.CommonEventObjectBase implements dboy_contracts.DownloadItem {
    public _fileName: string;  //TODO: make invisible
    /**
     * Stores the underlying list.
     */
    protected _list: dboy_contracts.DownloadList;
    public _size: number;  //TODO: make invisible
    public _sources: number;  //TODO: make invisible
    public _totalBytesReceived: number;  //TODO: make invisible

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.DownloadList} list The underlying list.
     */
    constructor(list: dboy_contracts.DownloadList) {
        super();

        this._list = list;
    }

    /* @inheritdoc */
    public get fileName(): string {
        return this._fileName;
    }

    /* @inheritdoc */
    public get list(): dboy_contracts.DownloadList {
        return this._list;
    }

    /* @inheritdoc */
    public get size(): number {
        return this._size;
    }

    /* @inheritdoc */
    public get sources(): number {
        return this._sources;
    }

    /* @inheritdoc */
    public get totalBytesReceived(): number {
        return this._totalBytesReceived;
    }
}
