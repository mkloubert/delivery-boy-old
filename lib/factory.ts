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
import * as Events from 'events';

declare const Promise: PromiseConstructorLike;

abstract class CommonEventObjectBase implements dboy_contracts.Disposable, dboy_contracts.NotifyPropertyChanged {
    protected readonly _EVENTS = new Events.EventEmitter();
    protected _isDisposed = false;

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
                            resolve: (value?: {} | PromiseLike<{}>) => void, reject: (reason?: any) => void,
                            tag?: T) {
        let me = this;

        if (disposing && this.isDisposed) {
            return;
        }

        let resolveInvoked = false;
        let rejectInvoked = true;

        let resolveWrapper = () => {
            if (resolveInvoked || rejectInvoked) {
                return;
            }

            resolveInvoked = true;

            if (disposing) {
                me._isDisposed = true;
                
                me.raisePropertyChanged('isDisposed');
                me.raiseEvent(dboy_contracts.EVENT_NAME_DISPOSED);
            }

            resolve(<dboy_contracts.PromiseResult<CommonEventObjectBase, T>>{
                result: this,
                tag: tag,
            });
        };

        let rejectWrapper = (err: any) => {
            if (rejectInvoked || resolveInvoked) {
                return;
            }

            rejectInvoked = true;
            reject(<dboy_contracts.ErrorContext<T>>{
                category: 'dispose',
                code: 1,
                error: err,
                object: this,
                tag: tag,
            });
        };

        if (disposing) {
            this.raiseEvent(dboy_contracts.EVENT_NAME_DISPOSING);
        }

        try {
            this.disposing(resolveWrapper, rejectWrapper,
                           tag,
                           disposing);
        }
        catch (e) {
            rejectWrapper(e);
        }
    }

    /**
     * The logic for the 'dispose()' method.
     * 
     * @param {Function} resolve The 'succeeded' callback.
     * @param {Function} reject The 'error' callback.
     * @param {T} tag The optional value for the callbacks.
     * @param {boolean} disposing 'dispose' method was called or not.
     */
    protected disposing<T>(resolve: () => void, reject: (reason: any) => void,
                           tag: T,
                           disposing: boolean) {

        // dummy by default
    }

    /* @inheritdoc */
    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /* @inheritdoc */
    public on(eventName: string | symbol, handler: dboy_contracts.EventHandler): CommonEventObjectBase {
        let me = this;

        if (handler) {
            this._EVENTS.on(eventName, (args: dboy_contracts.EventArguments) => {
                handler(me, args);
            });
        }

        return me;
    }

    /* @inheritdoc */
    public once(eventName: string | symbol, handler: dboy_contracts.EventHandler): CommonEventObjectBase {
        let me = this;

        if (handler) {
            this._EVENTS.once(eventName, (args: dboy_contracts.EventArguments) => {
                handler(me, args);
            });
        }

        return me;
    }

    /* @inheritdoc */
    public onPropertyChanged(handler: dboy_contracts.PropertyChangedEventHandler): CommonEventObjectBase {
        return this.on(dboy_contracts.EVENT_NAME_PROPERTY_CHANGED,
                       handler);
    }

    /**
     * Raises an event.
     * 
     * @param {string | symbol} eventName The event to raise.
     * @param [dboy_contracts.EventArguments] [args] The optional arguments for the event.
     * 
     * @return {boolean} Event was raised or not.
     */
    public raiseEvent(eventName: string | symbol, args?: dboy_contracts.EventArguments): boolean {
        if (arguments.length < 2) {
            args = {};
        }

        return this._EVENTS
                   .emit(eventName, args);
    }

    /**
     * Raises the 'property changed' event.
     * 
     * @param {string} propertyName The name of the property.
     * 
     * @return {boolean} Event was raised or not.
     */
    public raisePropertyChanged(propertyName: string): boolean {
        return this.raiseEvent(dboy_contracts.EVENT_NAME_PROPERTY_CHANGED,
                               {
                                   propertyName: propertyName,
                               });
    }
}

/**
 * A client instance.
 */
class ClientImpl extends CommonEventObjectBase implements dboy_contracts.Client {
    protected _downloads: DownloadListImpl;
    protected _state = dboy_contracts.CLIENT_STATE_STOPPED;

    /* @inheritdoc */
    public downloads<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.DownloadList, T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            let completed = (err?: any) => {
                if (err) {
                    reject(<dboy_contracts.ErrorContext<T>>{
                        category: 'client.requestdownloadlist',
                        code: 1,
                        error: err,
                        message: '' + err,
                        object: me,
                        tag: tag,
                    });
                }
                else {
                    resolve(<dboy_contracts.PromiseResult<dboy_contracts.DownloadList, T>>{
                        result: me._downloads,
                        tag: tag,
                    });
                }
            };

            try {
                if (!me._downloads) {
                    // not initialized yet
                    let list = new DownloadListImpl(me);

                    me.once(dboy_contracts.EVENT_NAME_DOWNLOAD_LIST_INITIALIZED, (args: dboy_contracts.DownloadInitializedEventArguments) => {
                        if (args.error) {
                            completed(args.error);
                        }
                        else {
                            completed();
                        }
                    });

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

                    me._downloads = list;

                    me.raiseEvent(dboy_contracts.EVENT_NAME_DOWNLOAD_LIST_INITIALIZED,
                                  {
                                      list: list,
                                  });
                }

                completed();
            }
            catch (e) {
                me.raiseEvent(dboy_contracts.EVENT_NAME_DOWNLOAD_LIST_INITIALIZED,
                              {
                                  error: e,
                              });

                completed(e);
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
                err.tag = tag;

                reject(err);
            };

            let currentState = me.state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_RUNNING:
                    me.stop(tag)
                      .then(resolve, rejectWrapper);
                    break;

                case dboy_contracts.CLIENT_STATE_STOPPED:
                    me.start(tag)
                      .then(resolve, rejectWrapper);
                    break;

                default:
                    let err = new Error(`Cannot toggle client state from ${currentState}!`);

                    rejectWrapper(<dboy_contracts.ErrorContext<T>>{
                        code: 1,
                        error: err,
                        message: '' + err,
                    });
                    break;
            }
        });
    }

    /* @inheritdoc */
    public whenRunningOrStopped<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.Client, T>> {
        let me = this;
        
        return new Promise((resolve, reject) => {
            let rejectWrapper = (err: dboy_contracts.ErrorContext<T>) => {
                err.category = 'client.whenrunningorstopped';
                err.object = me;

                reject(err);
            };

            try {
                let currentState = me.state;
                switch (currentState) {
                    case dboy_contracts.CLIENT_STATE_RUNNING:
                    case dboy_contracts.CLIENT_STATE_STOPPED:
                        resolve(<dboy_contracts.PromiseResult<dboy_contracts.Client, T>>{
                            result: me,
                            tag: tag,
                        });
                        break;

                    case dboy_contracts.CLIENT_STATE_STARTING:
                    case dboy_contracts.CLIENT_STATE_STOPPING:
                        me.whenRunningOrStopped()
                          .then((result) => {
                                    resolve(result);
                                },
                                (err) => {
                                    reject(err);
                                });
                        break;

                    default:
                        let err = new Error('Client is in unknown state: ' + currentState);

                        rejectWrapper(<dboy_contracts.ErrorContext<T>>{
                            code: 2,
                            error: err,
                            message: '' + err,
                            tag: tag,
                        });
                        break;
                }
            }
            catch (e) {
                rejectWrapper(<dboy_contracts.ErrorContext<T>>{
                    code: 1,
                    error: e,
                    message: '' + e,
                    tag: tag,
                });
            }
        });
    }
}

class DownloadListImpl extends CommonEventObjectBase implements dboy_contracts.DownloadList {
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
    protected disposing<T>(resolve: () => void, reject: (reason: any) => void,
                           tag: T,
                           disposing: boolean) {
        
        let me = this;
        let remainingItems = this._downloads.length;

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

            let dl = me._downloads[i];
            if (!dl) {
                completed();
                return;
            }

            dl.dispose(tag).then(
                () => {
                    me._downloads
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
    public get downloads(): DownloadItemImpl[] {
        return this._downloads;
    }
}

class DownloadItemImpl extends CommonEventObjectBase implements dboy_contracts.DownloadItem {
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

    /* @inheritdoc */
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
