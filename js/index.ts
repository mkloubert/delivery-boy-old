/// <reference types="jquery" />
/// <reference types="jqueryui" />

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


import * as DeliveryBoy from '../lib/contracts';
import * as Electron from 'electron';


let mainWindow: Electron.BrowserWindow = Electron.remote.getGlobal("sharedObj").window;

const DBOY_CLASS_SELECTED = 'dboy-selected';

/**
 * List of client states.
 */
enum ClientState {
    /**
     * Unknown
     */
    Unknown = 0,

    /**
     * Starting
     */
    Starting = 1,

    /**
     * Running / started
     */
    Running = 2,

    /**
     * Stopping
     */
    Stopping = 3,

    /**
     * Stopped
     */
    Stopped = 4,
}

/**
 * List of menu button IDs.
 */
enum DeliveryBoyMenuButton {
    /**
     * Transfer button
     */
    Transfers,

    /**
     * Search button
     */
    Search,

    /**
     * Settings button
     */
    Settings,
}

/**
 * Handles the app.
 */
class DeliveryBoyApp {
    protected _client: DeliveryBoy.Client;
    /**
     * Stores the selected button in the left menu bar.
     */
    protected _selectedButton = DeliveryBoyMenuButton.Transfers;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {DeliveryBoy.Client} client The underlying client.
     */
    constructor(client: DeliveryBoy.Client) {
        this._client = client;
    }

    /**
     * Gets the underlying client.
     */
    public get client(): DeliveryBoy.Client {
        return this._client;
    }

    /**
     * Initializes the app.
     */
    public init() {
        let me = this;

        this.client.onPropertyChanged((sender: DeliveryBoy.Client, args: DeliveryBoy.PropertyChangedEventArguments) => {
            switch (args.propertyName) {
                case 'state':
                    me.updateStartStopButton();
                    break;
            }
        });

        this.transferButton.click(() => {
            me.selectedButton = DeliveryBoyMenuButton.Transfers;
        });

        this.searchButton.click(() => {
            me.selectedButton = DeliveryBoyMenuButton.Search;
        });

        this.settingsButton.click(() => {
            me.selectedButton = DeliveryBoyMenuButton.Settings;
        });

        this.startStopButton.click(() => {
            me.client.toggle().then(
                (c) => {
                    me.updateStartStopButton();
                    me.reloadDownloadList();
                },
                () => {
                    //TODO
                });
        });

        //TODO: implement
        /*
        this.middleArea.resizable({
            handles: 'e',
            stop: (event, ui) => {
                //TODO
            }
        });
        */
    }

    /**
     * Gets the selector of the icon area of the left menu bar.
     */
    public get menuBarIcons(): JQuery {
        return jQuery('#dboy-content-wrapper .dboy-content .dboy-areas .dboy-left .dboy-menuarea');
    }

    /**
     * Gets the selector of the middle content area.
     */
    public get middleArea(): JQuery {
        return jQuery('#dboy-content-wrapper .dboy-content .dboy-areas .dboy-middle');
    }

    /**
     * Gets the selector of the right content area.
     */
    public get rightArea(): JQuery {
        return jQuery('#dboy-content-wrapper .dboy-content .dboy-areas .dboy-right');
    }

    /**
     * Reloads the download list.
     */
    protected reloadDownloadList() {
        let me = this;

        let itemList = me.middleArea.find('.dboy-transfer .dboy-items');
        itemList.html('<p>Loading list...</p>');

        let toHumanReadableSize = (size: number, noUnit: boolean = false): string => {
            const SIZE_UNITS: string[] = [
                '',
                'KB',  // Kilo
                'MB',  // Mega
                'GB',  // Giga
                'TB',  // Tera
                'PB',  // Peta
                'EB',  // Exa
            ];

            let x = Math.floor(Math.log(Math.abs(size)) / 
                               Math.log(1000));

            let unitIndex = x;
            if (unitIndex >= SIZE_UNITS.length) {
                unitIndex = SIZE_UNITS.length - 1;
            }

            let hrSize = size / Math.pow(1000, x);

            let str = '' + hrSize.toFixed(2);
            if (!noUnit) {
                str += ' ' + SIZE_UNITS[unitIndex];
            }

            return str.trim();
        };

        this.client.requestDownloadList().then(
            (promRes) => {
                let list = promRes.result;
                itemList.html('');

                if (list.downloads.length > 0) {
                    let createOnPropertyChangedCallback = (item: JQuery, dl: DeliveryBoy.DownloadItem): (sender: any, args: DeliveryBoy.PropertyChangedEventArguments) => void => {
                        return (sender: DeliveryBoy.DownloadItem, args: DeliveryBoy.PropertyChangedEventArguments) => {
                            let progressBar = item.find('.dboy-progress .dboy-progress-bar');
                            let downloaded = item.find('.dboy-file .dboy-downloaded');
                            let sourceCount = item.find('.dboy-file .dboy-sources .dboy-value');

                            // downloaded

                            switch (args.propertyName) {
                                case 'sources':
                                    sourceCount.text(sender.sources);
                                    break;

                                case 'totalBytesReceived':
                                    let progress = 1;
                                    if (sender.size > 0) {
                                        progress = sender.totalBytesReceived / sender.size;
                                    }

                                    let downloadedStr = toHumanReadableSize(sender.totalBytesReceived) + ' / ' +
                                                        toHumanReadableSize(sender.size);

                                    progressBar.animate({
                                        width: Math.ceil(progress * 100.0) + '%',
                                    }, 500);
                                    downloaded.text(downloadedStr);
                                    break;
                            }
                        };
                    };

                    for (let i = 0; i < list.downloads.length; i++) {
                        let dl = list.downloads[i];

                        let item = $('<div class="dboy-item"></div>');

                        let file = $('<div class="dboy-file"></div>');
                        {
                            // file name
                            let fileName = $('<div class="dboy-name"></div>');
                            fileName.attr('title', dl.fileName);
                            fileName.text(dl.fileName);
                            fileName.appendTo(file);

                            // downloaded data
                            let downloaded = $('<div class="dboy-downloaded"></div>');
                            downloaded.text(toHumanReadableSize(dl.size));
                            downloaded.appendTo(file);

                            // sources
                            let sources = $('<div class="dboy-sources"><i class="fa fa-wifi dboy-icon" aria-hidden="true"></i><span class="dboy-value"></span></div>');
                            sources.find('span').text(dl.sources);
                            sources.appendTo(file);
                        }
                        file.appendTo(item);

                        let progress = $('<div class="dboy-progress"></div>');
                        {
                            let progressBar = $('<div class="dboy-progress-bar"></div>');
                            progressBar.css('width', '0%');

                            progressBar.appendTo(progress);
                        }
                        progress.appendTo(item);

                        item.appendTo(itemList);

                        dl.onPropertyChanged(createOnPropertyChangedCallback(item, dl));
                    }
                }
                else {
                    itemList.html('<p>No downloads available</p>');
                }
            },
            (err) => {
                //TODO

                itemList.text('ERROR: ' + err.error);
            });
    }

    /**
     * Runs the app.
     */
    public run() {
        let me = this;

        this.updateViewByIcon();
        this.updateStartStopButton();

        this.startStopButton
            .click();
    }

    /**
     * Gets the selector of the "SEARCH area" inside the middle content area.
     */
    public get searchArea(): JQuery {
        return this.rightArea
                   .find('.dboy-search');
    }

    /**
     * Gets the selector of the "SETTINGS area" inside the middle content area.
     */
    public get searchSettingsArea(): JQuery {
        return this.middleArea
                   .find('.dboy-search');
    }

    /**
     * Gets the selector of the SEARCH button inside the left menu bar area.
     */
    public get searchButton(): JQuery {
        return this.menuBarIcons.find('.dboy-search-btn');
    }

    /**
     * Gets or sets the selected button in the left menu bar area.
     */
    public get selectedButton(): DeliveryBoyMenuButton {
        return this._selectedButton;
    }
    public set selectedButton(newValue: DeliveryBoyMenuButton) {
        this._selectedButton = newValue;

        this.updateViewByIcon();
    }

    /**
     * Gets the selector of the "SETTINGS area" in the right content area.
     */
    public get settingsArea(): JQuery {
        return this.rightArea
                   .find('.dboy-settings');
    }

    /**
     * Gets the selector of the "SETTINGS area" in the middle content area.
     */
    public get settingsCategoryArea(): JQuery {
        return this.middleArea
                   .find('.dboy-settings');
    }

    /**
     * Gets the selector of the SETTINGS button in inside the left menu bar area.
     */
    public get settingsButton(): JQuery {
        return this.menuBarIcons
                   .find('.dboy-settings-btn');
    }

    /**
     * Gets the selector of the START/STOP button in inside the left menu bar area.
     */
    public get startStopButton(): JQuery {
        return this.menuBarIcons
                   .find('.dboy-startstop-btn');
    }

    /**
     * Gets the selector of the 'transfer' button in the left menu bar. 
     */
    public get transferButton(): JQuery {
        return this.menuBarIcons
                   .find('.dboy-transfer-btn');
    }

    /**
     * Gets the content area of the "TRANSFER area" inside the right area.
     */
    public get transferArea(): JQuery {
        return this.rightArea
                   .find('.dboy-transfer');
    }

    /**
     * Updates the Start/Stop button.
     */
    protected updateStartStopButton() {
        let newIcon: JQuery;

        switch (this.client.state) {
            case ClientState.Running:
                newIcon = $('<i class="fa fa-stop" aria-hidden="true"></i>');
                break;

            case ClientState.Stopped:
                newIcon = $('<i class="fa fa-play" aria-hidden="true"></i>');
                break;

            default:
                newIcon = $('<i class="fa fa-clock-o" aria-hidden="true"></i>');
                break;
        }

        this.startStopButton.html('');
        if (newIcon) {
            newIcon.appendTo(this.startStopButton);
        }
    }

    /**
     * Updates the view based on the selected button icon.
     */
    protected updateViewByIcon() {
        let isMiddleAreaVisible = false;
        this.middleArea
            .css('display', 'none');
        
        let isRightAreaVisible = false;
        this.rightArea
            .css('display', 'none');

        let middleRows = this.middleArea
                             .find('.dboy-row');
        let rightRows = this.rightArea
                            .find('.dboy-row');

        this.menuBarIcons
            .find('.dboy-icon')
            .removeClass(DBOY_CLASS_SELECTED);

        middleRows.css('display', 'table-row');
        rightRows.css('display', 'table-row');

        switch (this._selectedButton) {
            // transfers
            case DeliveryBoyMenuButton.Transfers:
                isMiddleAreaVisible = true;
                isRightAreaVisible = true;

                this.transferButton
                    .addClass(DBOY_CLASS_SELECTED);

                middleRows.not('.dboy-transfer')
                          .css('display', 'none');
                rightRows.not('.dboy-transfer')
                         .css('display', 'none');
                break;

            // search
            case DeliveryBoyMenuButton.Search:
                isMiddleAreaVisible = true;
                isRightAreaVisible = true;

                this.searchButton
                    .addClass(DBOY_CLASS_SELECTED);

                middleRows.not('.dboy-search')
                          .css('display', 'none');
                rightRows.not('.dboy-search')
                         .css('display', 'none');  
                break;

            // settings
            case DeliveryBoyMenuButton.Settings:
                isMiddleAreaVisible = true;
                isRightAreaVisible = true;

                this.settingsButton
                    .addClass(DBOY_CLASS_SELECTED);
                
                middleRows.not('.dboy-settings')
                          .css('display', 'none');
                rightRows.not('.dboy-settings')
                         .css('display', 'none');
                break;
        }

        if (isMiddleAreaVisible) {
            this.middleArea
                .css('display', 'table-cell');
        }

        if (isRightAreaVisible) {
            this.rightArea
                .css('display', 'table-cell');
        }
    }
}

// create app instance
let $DBoy = new DeliveryBoyApp(Electron.remote.getGlobal("sharedObj").client);
