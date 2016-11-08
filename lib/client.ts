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
import * as dboy_libraries from './libraries';
import * as dboy_objects from './objects';
import * as FS from 'fs';
import * as Path from 'path';

declare const Promise: PromiseConstructorLike;

/**
 * A client instance.
 */
export class Client extends dboy_objects.CommonEventObjectBase implements dboy_contracts.Client {
    protected _config: dboy_contracts.ClientConfig;
    protected _downloads: dboy_contracts.DownloadList;
    protected _library: dboy_contracts.FileLibrary;
    protected _state = dboy_contracts.CLIENT_STATE_STOPPED;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {dboy_contracts.ClientConfig} [cfg] The configuration to use.
     */
    constructor(cfg?: dboy_contracts.ClientConfig) {
        super();

        this.updateConfig(cfg);
    }

    /* @inheritdoc */
    public get config(): dboy_contracts.ClientConfig {
        return this._config;
    }

    /* @inheritdoc */
    public downloads(callback: (err?: any, list?: dboy_contracts.DownloadList) => void): void {
        let me = this;

        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                callback(null, me._downloads);
            }
        };

        try {
            let tempDir = me.config.folders.temp;
            if (!Path.isAbsolute(tempDir)) {
                tempDir = Path.join(process.cwd(), tempDir);
            }

            let checkIfDirectory = () => {
                FS.lstat(tempDir, (err, stats) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    if (stats.isDirectory()) {
                        me._downloads = new dboy_downloads.DownloadList(me, tempDir);
                        completed();
                    }
                    else {
                        let err = new Error(`'${tempDir}' is NO directory!`);
                        completed(err);
                    }
                });
            };

            let getRealPath = () => {
                FS.realpath(tempDir, (err, resolvedPath) => {
                    if (err) {
                        completed(err);
                        return;
                    }

                    tempDir = resolvedPath;
                    checkIfDirectory();
                });
            }

            let createNewList = () => {
                FS.exists(tempDir, (exists) => {
                    if (!exists) {
                        FS.mkdir(tempDir, (err) => {
                            if (err) {
                                completed(err);
                                return;
                            }

                            getRealPath();
                        });
                    }
                    else {
                        getRealPath();
                    }
                });
            }

            if (!me._downloads) {
                createNewList();
            }
            else {
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public library(callback: (err?: any, lib?: dboy_contracts.FileLibrary) => void): void {
        let me = this;
        
        let completed = (err?: any) => {
            if (err) {
                callback(err);
            }
            else {
                callback(null, me._library);
            }
        };

        try {
            if (!me._library) {
                me._library = new dboy_libraries.FileLibrary(me,
                                                             process.cwd());
            }

            completed();
        }
        catch (e) {
            completed(e);
        }
    }

    /* @inheritdoc */
    public start(callback?: (err?: any) => void): void {
        try {
            this._state = dboy_contracts.CLIENT_STATE_STARTING;
            this.raisePropertyChanged('state');

            this._state = dboy_contracts.CLIENT_STATE_RUNNING;
            this.raisePropertyChanged('state');

            this.invokeCallback(callback);
        }
        catch (e) {
            this.invokeCallback(callback, e);
        }
    }

    /* @inheritdoc */
    public get state(): number {
        return this._state;
    }

    /* @inheritdoc */
    public stop(callback?: (err?: any) => void): void {
        try {
            this._state = dboy_contracts.CLIENT_STATE_STOPPING;
            this.raisePropertyChanged('state');

            this._state = dboy_contracts.CLIENT_STATE_STOPPED;
            this.raisePropertyChanged('state');

            this.invokeCallback(callback);
        }
        catch (e) {
            this.invokeCallback(callback, e);
        }
    }

    /* @inheritdoc */
    public toggle(callback?: (err?: any) => void): void {
        try {
            let currentState = this.state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_RUNNING:
                    this.stop(callback);
                    break;

                case dboy_contracts.CLIENT_STATE_STOPPED:
                    this.start(callback);
                    break;

                default:
                    this.invokeCallback(callback,
                                        new Error(`Cannot toggle client state from ${currentState}!`));
                    break;
            }
        }
        catch (e) {
            this.invokeCallback(callback, e);
        }
    }

    /**
     * Updates configuration.
     * 
     * @param {dboy_contracts.ClientConfig} [cfg] The configuration to update.
     */
    protected updateConfig(cfg?: dboy_contracts.ClientConfig) {
        if (!cfg) {
            cfg = {};
        }

        if (!cfg.folders) {
            cfg.folders = {};
        }

        if (!cfg.folders.shares) {
            cfg.folders.shares = [];
        }

        cfg.folders.shares = 
            cfg.folders.shares
                       .map(x => x ? ('' + x).trim() : '')
                       .filter(x => x ? true : false);

        // remove duplicate elements
        cfg.folders.shares =
            cfg.folders.shares
                       .filter((x, pos) => cfg.folders.shares.indexOf(x) == pos);

        if (cfg.folders.shares.length < 1) {
            cfg.folders.shares.push('./shares');
        }

        if (!cfg.folders.temp) {
            cfg.folders.temp = './temp';
        }

        this._config = cfg;
    }

    /* @inheritdoc */
    public whenRunningOrStopped(callback: (err?: any) => void): void {
        try {
            let currentState = this.state;
            switch (currentState) {
                case dboy_contracts.CLIENT_STATE_RUNNING:
                case dboy_contracts.CLIENT_STATE_STOPPED:
                    this.invokeCallback(callback);
                    break;

                case dboy_contracts.CLIENT_STATE_STARTING:
                case dboy_contracts.CLIENT_STATE_STOPPING:
                    this.whenRunningOrStopped(callback);
                    break;

                default:
                    this.invokeCallback(callback,
                                        new Error('Client is in invalid state: ' + currentState));
                    break;
            }

            this.invokeCallback(callback);
        }
        catch (e) {
            this.invokeCallback(callback, e);
        }
    }
}
