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
 * An implementation of a file library.
 */
export class FileLibrary extends dboy_objects.CommonEventObjectBase implements dboy_contracts.FileLibrary {
    /**
     * Stores the underlying client.
     */
    protected readonly _CLIENT: dboy_contracts.Client;
    /**
     * Stores the underlying collections.
     */
    protected _collections: dboy_contracts.FileLibraryCollection[];
    protected readonly _WORK_DIR: string;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.Client} client The underlying client.
     * @param {string} workDir The (working) directory.
     */
    constructor(client: dboy_contracts.Client,
                workDir: string) {
        super();

        this._CLIENT = client;
        this._WORK_DIR = workDir;
    }

    /* @inheritdoc */
    public get client(): dboy_contracts.Client {
        return this._CLIENT;
    }

    /* @inheritdoc */
    public collections<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.FileLibraryCollection[], T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            let completed = (err?: any) => {
                if (err) {
                    reject(<dboy_contracts.ErrorContext<T>>{
                        category: 'filelibrary.collections',
                        error: err,
                        tag: tag,
                    });
                }
                else {
                    let copyOfCollections = me._collections.map(x => x);

                    resolve(<dboy_contracts.PromiseResult<dboy_contracts.FileLibraryCollection[], T>>{
                        result: copyOfCollections,
                        tag: tag,
                    });
                }
            };

            try {
                if (!me._collections) {
                    let processNextFolder: () => void;

                    let foldersLeft = me.client.config.folders.shares.map(x => x);
                    let collections: FileLibraryCollection[] = [];

                    processNextFolder = () => {
                        if (foldersLeft.length < 1) {
                            me._collections = collections;
                            completed();

                            return;
                        }

                        let folderPath = foldersLeft.pop();
                        if (!Path.isAbsolute(folderPath)) {
                            folderPath = Path.join(me._WORK_DIR, folderPath);
                        }

                        let addIfDirectory = () => {
                            FS.lstat(folderPath, (err, stats) => {
                                if (!err) {
                                    if (stats.isDirectory()) {
                                        collections.push(new FileLibraryCollection(me, folderPath));
                                    }
                                }

                                processNextFolder();
                            });
                        };

                        let getRealPath = () => {
                            FS.realpath(folderPath, (err, resolvedPath) => {
                                if (err) {
                                    processNextFolder();
                                }
                                else {
                                    folderPath = resolvedPath;

                                    addIfDirectory();
                                }
                            });
                        };

                        let checkIfPathExists = () => {
                            FS.exists(folderPath, (exists) => {
                                if (exists) {
                                    getRealPath();
                                }
                                else {
                                    FS.mkdir(folderPath, (err) => {
                                        if (err) {
                                            processNextFolder();
                                        }
                                        else {
                                            getRealPath();
                                        }
                                    });
                                }
                            });
                        };

                        checkIfPathExists();
                    };

                    processNextFolder();
                }
                else {
                    completed();
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }
}

/**
 * An implementation of a file library.
 */
export class FileLibraryCollection extends dboy_objects.CommonEventObjectBase implements dboy_contracts.FileLibraryCollection {
    /**
     * Stores the underlying directory.
     */
    protected readonly _DIR: string;
    /**
     * Stores the underlying library.
     */
    protected readonly _LIBRARY: dboy_contracts.FileLibrary;
    /**
     * Stores the underlying items.
     */
    protected _items: dboy_contracts.FileLibraryCollectionItem[];

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.FileLibrary} lib The underlying library.
     * @param {string} dir The directory.
     */
    constructor(lib: dboy_contracts.FileLibrary,
                dir: string) {
        super();

        this._LIBRARY = lib;
        this._DIR = dir;
    }

    /**
     * Gets the underlying directory.
     */
    public get directory(): string {
        return this._DIR;
    }
    
    /* @inheritdoc */
    public items<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.FileLibraryCollectionItem[], T>> {
        let me = this;
        
        return new Promise((resolve, reject) => {
            let completed = (err?: any) => {
                if (err) {
                    reject(<dboy_contracts.ErrorContext<T>>{
                        category: 'filelibrary.collections',
                        error: err,
                        tag: tag,
                    });
                }
                else {
                    let copyOfItems = me._items.map(x => x);

                    resolve(<dboy_contracts.PromiseResult<dboy_contracts.FileLibraryCollectionItem[], T>>{
                        result: copyOfItems,
                        tag: tag,
                    });
                }
            };

            try {
                if (!me._items) {
                    me._items = [];

                    let scanDir: (dir?: string) => void;
                    scanDir = function(dir?: string) {
                        let isRoot = arguments.length < 1;
                        if (isRoot) {
                            dir = me._DIR;
                        }

                        FS.readdir(dir, (err, files) => {
                            if (!err) {
                                files.map(x => Path.join(dir, x)).forEach((x) => {
                                    try {
                                        x = FS.realpathSync(x);
                                        let stats = FS.lstatSync(x);

                                        if (stats.isFile()) {
                                            me._items
                                              .push(new FileLibraryCollectionItem(me, x));
                                        }
                                    }
                                    catch (e) {
                                        // ignore
                                    }
                                });
                            }

                            completed();
                        });
                    };

                    scanDir();
                }
                else {
                    completed();
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /* @inheritdoc */
    public get library(): dboy_contracts.FileLibrary {
        return this._LIBRARY;
    }
}

/**
 * An implementation of a file library.
 */
export class FileLibraryCollectionItem extends dboy_objects.CommonEventObjectBase implements dboy_contracts.FileLibraryCollectionItem {
    /**
     * Stores the underlying collection.
     */
    protected readonly _COLLECTION: dboy_contracts.FileLibraryCollection;
    /**
     * Stores the path to the underlying file.
     */
    protected readonly _FILE: string;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.FileLibraryCollection} coll The underlying collection.
     * @param {string} file The path to the underlying file.
     */
    constructor(coll: dboy_contracts.FileLibraryCollection,
                file: string) {
        super();

        this._COLLECTION = coll;
        this._FILE = file;
    }

    /* @inheritdoc */
    public get collection(): dboy_contracts.FileLibraryCollection {
        return this._COLLECTION;
    }

    /**
     * Gets the path to the underlying file.
     */
    public get file(): string {
        return this._FILE;
    }

    /* @inheritdoc */
    public get name(): string {
        return Path.basename(this.file);
    }
}
