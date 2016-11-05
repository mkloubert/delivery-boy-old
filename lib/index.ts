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


declare const Promise: PromiseConstructorLike;
/**
 * Descibes a property changed event handler.
 */
export declare type PropertyChangedEventHandler = (sender: any, args: PropertyChangedEventArguments) => void;

/**
 * Describes a download item.
 */
export interface DownloadItem extends NotifyPropertyChanged {
    /**
     * Gets the short name of the file.
     */
    fileName: string;

    /**
     * Gets the size of the file in bytes.
     */
    size: number;

    /**
     * Gets the number of sources.
     */
    sources: number;

    /**
     * Gets the number of total bytes received.
     */
    totalBytesReceived: number;
}

/**
 * Describes a download list.
 */
export interface DownloadList {
    /**
     * Gets the list of downloads.
     */
    downloads: DownloadItem[];
}

/**
 * Descibes an error context.
 */
export interface ErrorContext {
    /**
     * The category.
     */
    category?: string;

    /**
     * The error code.
     */
    code?: number;

    /**
     * The error object.
     */
    error: any;

    /**
     * The message.
     */
    message?: string;
}

/**
 * Arguments for a NotifyPropertyChanged event.
 */
export interface PropertyChangedEventArguments {
    /**
     * Gets the underlying property name.
     */
    propertyName: string;
}

/**
 * Describes an object that 
 */
export interface NotifyPropertyChanged {
    onPropertyChanged(callback: PropertyChangedEventHandler): void;
}

abstract class RaisePropertyChangedBase implements NotifyPropertyChanged {
    protected _propertyChangedEventHandlers: PropertyChangedEventHandler[] = [];

    /* @inheritdoc */
    public onPropertyChanged(cb: PropertyChangedEventHandler) {
        if (cb) {
            this._propertyChangedEventHandlers.push(cb);
        }
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
export class Client {
    /**
     * Requests the download list.
     */
    public requestDownloadList(): PromiseLike<DownloadList> {
        return new Promise((resolve, reject) => {
            try {
                let list = new DownloadListImpl();

                let initPropertyChanged = (dl: DownloadItemImpl) => {
                    let timeout: NodeJS.Timer;
                    timeout = setInterval(() => {
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
                            clearTimeout(timeout);
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

                newDownloadItem = new DownloadItemImpl();
                newDownloadItem._totalBytesReceived = 0;
                newDownloadItem._fileName = 'Tears go by.mp3';
                newDownloadItem._size = 1987654;
                newDownloadItem._sources = 1000;
                list.downloads.push(newDownloadItem);

                newDownloadItem = new DownloadItemImpl();
                newDownloadItem._totalBytesReceived = 0;
                newDownloadItem._fileName = 'PB_DE_062016_0001.jpg';
                newDownloadItem._size = 234567;
                newDownloadItem._sources = 54;
                list.downloads.push(newDownloadItem);

                newDownloadItem = new DownloadItemImpl();
                newDownloadItem._totalBytesReceived = 0;
                newDownloadItem._fileName = 'TWD - S0701.mp4';
                newDownloadItem._size = 345678901;
                newDownloadItem._sources = 666;
                list.downloads.push(newDownloadItem);

                for (let i = 0; i < list.downloads.length; i++) {
                    initPropertyChanged(<DownloadItemImpl>list.downloads[i]);
                }
                
                resolve(list);
            }
            catch (e) {
                reject(<ErrorContext>{
                    category: 'client.requestDownloadList',
                    code: 1,
                    error: e,
                    message: '' + e,
                });
            }
        });
    }

    /**
     * Starts the client.
     * 
     * @return {PromiseLike<Client>} The promise.
     */
    public start(): PromiseLike<Client> {
        let me = this;

        return new Promise((resolve, reject) => {
            try {
                resolve(me);
            }
            catch (e) {
                reject(<ErrorContext>{
                    category: 'client.start',
                    code: 1,
                    error: e,
                    message: '' + e,
                });
            }
        });
    }

    public test() {
        
    }
}

class DownloadItemImpl extends RaisePropertyChangedBase implements DownloadItem {
    public _fileName: string;  //TODO: make invisible
    public _size: number;  //TODO: make invisible
    public _sources: number;  //TODO: make invisible
    public _totalBytesReceived: number;  //TODO: make invisible

    /* @inheritdoc */
    public get fileName(): string {
        return this._fileName;
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

class DownloadListImpl implements DownloadList {
    protected _downloads: DownloadItem[] = [];

    /* @inheritdoc */
    public get downloads(): DownloadItem[] {
        return this._downloads;
    }
}
