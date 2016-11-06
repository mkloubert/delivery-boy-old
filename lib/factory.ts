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

declare const Promise: PromiseConstructorLike;

abstract class RaisePropertyChangedBase implements dboy_contracts.Disposable, dboy_contracts.NotifyPropertyChanged {
    protected _isDisposed = false;
    protected _propertyChangedEventHandlers: dboy_contracts.PropertyChangedEventHandler[] = [];

    /* @inheritdoc */
    public dispose<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.Disposable, T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            try {
                me.disposeInner(true,
                                resolve, reject);
            }
            catch (e) {
                reject(<dboy_contracts.ErrorContext<T>>{
                    category: 'dispose',
                    code: 1,
                    error: e,
                    object: me,
                    tag: tag,
                });
            }
        });
    }

    private disposeInner<T>(disposing: boolean,
                            resolve: (value?: RaisePropertyChangedBase | PromiseLike<RaisePropertyChangedBase>) => void,
                            reject: (reason?: any) => void,
                            tag?: T) {
        if (disposing && this.isDisposed) {
            return;
        }

        this.disposing(resolve, reject, tag,
                       disposing);

        if (disposing) {
            this._isDisposed = true;
            this.raisePropertyChanged('isDisposed');
        }
    }

    protected disposing<T>(resolve: (value?: RaisePropertyChangedBase | PromiseLike<RaisePropertyChangedBase>) => void,
                           reject: (reason?: any) => void,
                           tag: T,
                           disposing: boolean) {

        // dummy by default
    }

    /* @inheritdoc */
    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /* @inheritdoc */
    public on(eventName: string, handler: dboy_contracts.EventHandler): RaisePropertyChangedBase {
        switch (eventName.toLowerCase().trim()) {
            case 'propertychanged':
                let propertyChangedHandler: dboy_contracts.PropertyChangedEventHandler;
                if (handler) {
                    propertyChangedHandler = (sender, e) => {
                        handler(sender, e);
                    };
                }

                return this.onPropertyChanged(propertyChangedHandler);
                // propertychanged
        }

        throw `Unknown event '${eventName}'`;
    }

    /* @inheritdoc */
    public onPropertyChanged(cb: dboy_contracts.PropertyChangedEventHandler): RaisePropertyChangedBase {
        if (cb) {
            this._propertyChangedEventHandlers.push(cb);
        }

        return this;
    }

    /* @inheritdoc */
    public raisePropertyChanged(propertyName: string) {
        for (let i = 0; i < this._propertyChangedEventHandlers.length; i++) {
            let cb = this._propertyChangedEventHandlers[i];

            cb(this, {
                propertyName: propertyName,
            });
        }
    }
}

/**
 * A client instance.
 */
class ClientImpl extends RaisePropertyChangedBase implements dboy_contracts.Client {
    protected _downloads: DownloadListImpl;
    protected _state = dboy_contracts.CLIENT_STATE_STOPPED;

    /* @inheritdoc */
    public requestDownloadList<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.DownloadList, T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            try {
                let list = new DownloadListImpl(me);

                let initMock = (dl: DownloadItemImpl) => {
                    let timeout: NodeJS.Timer = null;
                    let shutdown = () => {
                        let t = timeout;
                        timeout = null;

                        if (null !== t) {
                            clearTimeout(t);
                        }
                    };

                    dl.onPropertyChanged((sender, e) => {
                        switch (e.propertyName) {
                            case 'isDisposed':
                                shutdown();
                                break;
                        }
                    });

                    timeout = setInterval(() => {
                        if (null === timeout) {
                            return;
                        }

                        if (dl.isDisposed) {
                            shutdown();
                            return;
                        }

                        let lastBytesReceived = dl.totalBytesReceived;
                        let lastSources = dl.sources;

                        let newSources = lastSources + Math.ceil(20 * Math.random()) - 10;
                        if (newSources < 0) {
                            newSources = 0;
                        }
                        
                        let newBytesReceived = lastBytesReceived + 81920;
                        if (newBytesReceived > dl.size) {
                            newBytesReceived = dl.size;
                        }

                        if (newBytesReceived == dl.size) {
                            shutdown();
                        }
                        
                        if (newBytesReceived != lastBytesReceived) {
                            dl._totalBytesReceived = newBytesReceived;

                            dl.raisePropertyChanged('totalBytesReceived');
                        }
                        if (newSources != lastSources) {
                            dl._sources = newSources;

                            dl.raisePropertyChanged('sources');
                        }
                    }, 1000);
                };

                let newDownloadItem: DownloadItemImpl;

                newDownloadItem = new DownloadItemImpl(list);
                newDownloadItem._totalBytesReceived = 0;
                newDownloadItem._fileName = 'Tears go by.mp3';
                newDownloadItem._size = 1987654;
                newDownloadItem._sources = 1000;
                list.downloads.push(newDownloadItem);

                newDownloadItem = new DownloadItemImpl(list);
                newDownloadItem._totalBytesReceived = 0;
                newDownloadItem._fileName = 'PB_DE_062016_0001.jpg';
                newDownloadItem._size = 234567;
                newDownloadItem._sources = 54;
                list.downloads.push(newDownloadItem);

                newDownloadItem = new DownloadItemImpl(list);
                newDownloadItem._totalBytesReceived = 0;
                newDownloadItem._fileName = 'TWD - S0701.mp4';
                newDownloadItem._size = 345678901;
                newDownloadItem._sources = 666;
                list.downloads.push(newDownloadItem);

                for (let i = 0; i < list.downloads.length; i++) {
                    initMock(<DownloadItemImpl>list.downloads[i]);
                }
                
                resolve(<dboy_contracts.PromiseResult<dboy_contracts.DownloadList, T>>{
                    result: list,
                    tag: tag,
                });
            }
            catch (e) {
                reject(<dboy_contracts.ErrorContext<T>>{
                    category: 'client.requestDownloadList',
                    code: 1,
                    error: e,
                    message: '' + e,
                    object: me,
                    tag: tag,
                });
            }
        });
    }

    /* @inheritdoc */
    public start<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.Client, T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            me._state = dboy_contracts.CLIENT_STATE_STARTING;
            me.raisePropertyChanged('state');

            setTimeout(() => {
                try {
                    me._state = dboy_contracts.CLIENT_STATE_RUNNING;
                    me.raisePropertyChanged('state');

                    resolve(<dboy_contracts.PromiseResult<dboy_contracts.Client, T>>{
                        result: me,
                        tag: tag,
                    });
                }
                catch (e) {
                    reject(<dboy_contracts.ErrorContext<T>>{
                        category: 'client.start',
                        code: 1,
                        error: e,
                        message: '' + e,
                        object: me,
                        tag: tag,
                    });
                }
            }, 2000);
        });
    }

    /* @inheritdoc */
    public get state(): number {
        return this._state;
    }

    /* @inheritdoc */
    public stop<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.Client, T>> {
        let me = this;
        
        return new Promise((resolve, reject) => {
            me._state = dboy_contracts.CLIENT_STATE_STOPPING;
            me.raisePropertyChanged('state');

            setTimeout(() => {
                try {
                    let dl = me._downloads;
                    if (dl) {

                    }

                    me._state = dboy_contracts.CLIENT_STATE_STOPPED;
                    me.raisePropertyChanged('state');

                    resolve(<dboy_contracts.PromiseResult<dboy_contracts.Client, T>>{
                        result: me,
                        tag: tag,
                    });
                }
                catch (e) {
                    reject(<dboy_contracts.ErrorContext<T>>{
                        category: 'client.stop',
                        code: 1,
                        error: e,
                        message: '' + e,
                        object: me,
                        tag: tag,
                    });
                }
            }, 2000);
        });
    }

    /* @inheritdoc */
    public toggle<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.Client, T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            let rejectWrapper = (err: dboy_contracts.ErrorContext<T>) => {
                err.category = 'client.toggle';
                err.object = me;

                reject(err);
            };

            let currentState = me.state;
            switch (currentState) {
                case 2:
                    // running
                    me.stop(tag)
                      .then(resolve, rejectWrapper);
                    break;

                case 4:
                    // stopped
                    me.start(tag)
                      .then(resolve, rejectWrapper);
                    break;

                default:
                    let err = new Error(`Cannot toggle client state from ${currentState}!`);

                    rejectWrapper(<dboy_contracts.ErrorContext<T>>{
                        code: 1,
                        error: err,
                        message: '' + err,
                        tag: tag,
                    });
                    break;
            }
        });
    }
}

class DownloadListImpl extends RaisePropertyChangedBase implements dboy_contracts.DownloadList {
    protected _client: ClientImpl;
    protected _downloads: DownloadItemImpl[] = [];

    constructor(client: ClientImpl) {
        super();

        this._client = client;
    }

    /* @inheritdoc */
    public get client(): ClientImpl {
        return this._client;
    }

    /* @inheritdoc */
    protected disposing<T>(resolve: (value?: RaisePropertyChangedBase | PromiseLike<RaisePropertyChangedBase>) => void,
                           reject: (reason?: any) => void,
                           tag: T,
                           disposing: boolean) {
        
        let me = this;
        let remainingItems = this._downloads.length;

        let errors: dboy_contracts.ErrorContext<T>[] = [];
        let completed = () => {
            if (errors.length > 0) {
                reject(<dboy_contracts.ErrorContext<T>>{
                    category: 'downloadlist.dispose',
                    code: 1,
                    error: errors,
                    message: errors.map((x) => '' + x).join('\n'),
                    object: me,
                    tag: tag,
                });
            }
            else {
                resolve(me);
            }
        };

        let i = 0;
        let disposeNext: () => void;
        let countDown = () => {
            --remainingItems;
            disposeNext();
        };

        disposeNext = function(): void {
            if (remainingItems < 1) {
                completed();
                return;
            }

            let dl = me._downloads[i];
            if (!dl) {
                completed();
                return;
            }

            dl.dispose(tag).then(
                () => {
                    countDown();

                    me._downloads
                      .splice(i, 1);
                },
                (e) => {
                    errors.push(e);
                    ++i;

                    countDown();
                });
        };

        disposeNext();
    }

    /* @inheritdoc */
    public get downloads(): DownloadItemImpl[] {
        return this._downloads;
    }
}

class DownloadItemImpl extends RaisePropertyChangedBase implements dboy_contracts.DownloadItem {
    public _fileName: string;  //TODO: make invisible
    protected _list: DownloadListImpl;
    public _size: number;  //TODO: make invisible
    public _sources: number;  //TODO: make invisible
    public _totalBytesReceived: number;  //TODO: make invisible

    constructor(list: DownloadListImpl) {
        super();

        this._list = list;
    }

    /* @inheritdoc */
    public get fileName(): string {
        return this._fileName;
    }

    public get list(): DownloadListImpl {
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


/**
 * Creates a new client instance.
 */
export function createClient(): dboy_contracts.Client {
    return new ClientImpl();
}
