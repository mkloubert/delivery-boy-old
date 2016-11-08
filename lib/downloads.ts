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
import * as FS from 'fs';
import * as Path from 'path';

declare const Promise: PromiseConstructorLike;

/**
 * Implementation of a download list.
 */
export class DownloadList extends dboy_objects.CommonEventObjectBase implements dboy_contracts.DownloadList {
    protected readonly _CLIENT: dboy_contracts.Client;
    protected readonly _DIR: string;
    protected _items: dboy_contracts.DownloadItem[];

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.Client} client The underlying client.
     * @param {string} dir The (working) directory.
     */
    constructor(client: dboy_contracts.Client, dir: string) {
        super();

        this._CLIENT = client;
        this._DIR = dir;
    }

    /* @inheritdoc */
    public addByLink(link: string,
                     callback?: (err?: any, newItem?: dboy_contracts.DownloadItem) => void): void {
        
        let me = this;

        let newItem: dboy_contracts.DownloadItem;
        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                callback(null, newItem);
            }
        };
        
        try {
            link = ('' + link).trim();

            let REGEX = /^(dboy:\/\/)(\s*)(\|)(\s*)(file)(\s*)(\|)([^\|]+)(\|)(\s*)([0-9]+)(\s*)(\|)(\s*)([0-9a-f]{64})(\s*)(\|)(\s*)(\/?)$/i;
            if (REGEX.test(link)) {
                let match = REGEX.exec(link);

                let fileName = match[8];
                if (fileName) {
                    fileName = decodeURIComponent(('' + match[8]).trim());
                }

                if (!fileName) {
                    fileName = 'file.dat';
                }

                let hash = match[15].toLowerCase().trim();
                let fileSize = parseInt(match[11].trim());

                let tempFile = Path.join(me._DIR, `${hash}_${fileSize}.dbtmp`);
                let metaFile = Path.join(me._DIR, `${hash}_${fileSize}.dbmeta`);

                let closeFile = (fd: number, err?: any, next?: () => void) => {
                    FS.close(fd, () => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            if (next) {
                                next();
                            }
                            else {
                                completed();
                            }
                        }
                    });
                };

                let createNewMetaFile = () => {
                    FS.open(metaFile, 'w', (err, fd) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        let meta = {
                            name: fileName,
                            chunks: new Array<any>(),
                        };

                        let partCount = Math.ceil(fileSize / 9728000.0);
                        for (let i = 0; i < partCount; i++) {
                            meta.chunks.push({
                                index: i,
                                completed: 0,
                            });
                        }

                        FS.write(fd, JSON.stringify(meta, null, 2), 0, 'utf8', (err) => {
                            if (!err) {
                                newItem = new DownloadItem(me,
                                                            tempFile, metaFile);

                                me._items
                                    .push(newItem);
                            }

                            closeFile(fd, err);
                        });
                    });
                };

                let createNewTempFile = () => {
                    FS.open(tempFile, 'w', (err, fd) => {
                        if (err) {
                            completed(err);
                            return;
                        }

                        let remainingBytes = fileSize;

                        let writeNext: () => void;
                        writeNext = () => {
                            if (remainingBytes < 1) {
                                closeFile(fd, null, createNewMetaFile);
                                return;
                            }

                            let bytesToWrite = Math.min(81920, remainingBytes);
                            let buffer = Buffer.alloc(bytesToWrite, 0);

                            FS.write(fd, buffer, 0, buffer.length, (err, written) => {
                                if (err) {
                                    closeFile(fd, err);
                                    return;
                                }

                                remainingBytes -= written;
                                writeNext();
                            });
                        };

                        writeNext();
                    });
                };

                let checkIfFileExists = () => {
                    for (let i = 0; me._items.length; i++) {
                        let item = <DownloadItem>me._items[i];
                        if (tempFile == item.tempFile) {
                            newItem = item;
                            completed();
                            break;
                        }
                    }
                    
                    if (!newItem) {
                        createNewTempFile();
                    }
                };

                checkIfFileExists();
            }
            else {
                let err = new Error('Invalid link format!');

                completed(err);
            }
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public get client(): dboy_contracts.Client {
        return this._CLIENT;
    }

    /* @inheritdoc */
    protected disposing(resolve: () => void, reject: (reason: any) => void,
                        disposing: boolean) {
    }

    /* @inheritdoc */
    public items(callback: (err?: any, newItem?: dboy_contracts.DownloadItem[]) => void): void {
        let me = this;

        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                let copyOfItems = me._items.map(x => x);

                callback(null, copyOfItems);
            }
        };

        try {
            let REGEX = /^([0-9|a-f]{64})(_)([0-9]+)(\.)(dbtmp)$/i;

            if (!me._items) {
                FS.readdir(me._DIR, (err, files) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    me._items = [];

                    let tempFiles = files.filter(x => REGEX.test(x));
                    for (let i = 0; i < tempFiles.length; i++) {
                        try {
                            let fileName = tempFiles[i];
                            let match = REGEX.exec(fileName);

                            let metaFile = Path.join(me._DIR, match[1] + match[2] + match[3] + '.dbmeta');
                            if (FS.existsSync(metaFile)) {
                                let newItem = new DownloadItem(me, 
                                                                Path.join(me._DIR, __filename), metaFile);
                                
                                me._items
                                    .push(newItem);
                            }
                        }
                        catch (e) {
                            // ignore
                        }
                    }

                    completed();
                });
            }
            else {
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
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
    protected _meta: any;
    /**
     * Stores the path to the underlying meta file.
     */
    protected readonly _META_FILE: string;
    public _size: number;  //TODO: make invisible
    public _sources: number;  //TODO: make invisible
    /**
     * Stores the path to the underlying temp file.
     */
    protected readonly _TEMP_FILE: string;
    public _totalBytesReceived: number;  //TODO: make invisible

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.DownloadList} list The underlying list.
     * @param {string} tmpFile The path of the underlying temp file.
     * @param {string} metaFile The path of the underlying meta file.
     */
    constructor(list: dboy_contracts.DownloadList,
               tmpFile: string, metaFile: string) {
        super();

        this._TEMP_FILE = tmpFile;
        this._META_FILE = metaFile;

        this._meta = JSON.parse(FS.readFileSync(this._META_FILE, 'utf8'));
        
        this._fileName = ('' + this._meta.name).trim();
        if (!this._fileName) {
            this._fileName = 'file.dat';
        }

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

    /**
     * Gets the path of the underlying meta file.
     */
    public get metaFile(): string {
        return this._META_FILE;
    }

    /* @inheritdoc */
    public get size(): number {
        return this._size;
    }

    /* @inheritdoc */
    public get sources(): number {
        return this._sources;
    }

    /**
     * Gets the path of the underlying temp file.
     */
    public get tempFile(): string {
        return this._TEMP_FILE;
    }

    /* @inheritdoc */
    public get totalBytesReceived(): number {
        return this._totalBytesReceived;
    }
}
