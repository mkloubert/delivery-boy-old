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
import * as dboy_downloads from './downloads';
import * as dboy_objects from './objects';

declare const Promise: PromiseConstructorLike;

/**
 * A client instance.
 */
export class Client extends dboy_objects.CommonEventObjectBase implements dboy_contracts.Client {
    protected _downloads: dboy_contracts.DownloadList;
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
                    let list = new dboy_downloads.DownloadList(me);

                    me.once(dboy_contracts.EVENT_NAME_DOWNLOAD_LIST_INITIALIZED, (args: dboy_contracts.DownloadInitializedEventArguments) => {
                        if (args.error) {
                            completed(args.error);
                        }
                        else {
                            completed();
                        }
                    });

                    let initMock = (dl: dboy_downloads.DownloadItem) => {
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

                    let newDownloadItem: dboy_downloads.DownloadItem;

                    newDownloadItem = new dboy_downloads.DownloadItem(list);
                    newDownloadItem._totalBytesReceived = 0;
                    newDownloadItem._fileName = 'Tears go by.mp3';
                    newDownloadItem._size = 1987654;
                    newDownloadItem._sources = 1000;
                    list._ITEMS.push(newDownloadItem);

                    newDownloadItem = new dboy_downloads.DownloadItem(list);
                    newDownloadItem._totalBytesReceived = 0;
                    newDownloadItem._fileName = 'PB_DE_062016_0001.jpg';
                    newDownloadItem._size = 234567;
                    newDownloadItem._sources = 54;
                    list._ITEMS.push(newDownloadItem);

                    newDownloadItem = new dboy_downloads.DownloadItem(list);
                    newDownloadItem._totalBytesReceived = 0;
                    newDownloadItem._fileName = 'TWD - S0701.mp4';
                    newDownloadItem._size = 345678901;
                    newDownloadItem._sources = 666;
                    list._ITEMS.push(newDownloadItem);

                    for (let i = 0; i < list._ITEMS.length; i++) {
                        initMock(<dboy_downloads.DownloadItem>list._ITEMS[i]);
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
