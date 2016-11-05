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


import * as DeliveryBoy from '../lib/index';
import * as Electron from 'electron';

let client: DeliveryBoy.Client = Electron.remote.getGlobal("sharedObj").client;
let mainWindow: Electron.BrowserWindow = Electron.remote.getGlobal("sharedObj").window;

const DBOY_CLASS_SELECTED = 'dboy-selected';

/**
 * List of menu button IDs.
 */
enum DeliveryBoyMenuButton {
    /**
     * Download button
     */
    Downloads,

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
    /**
     * Stores the selected button in the left menu bar.
     */
    protected _selectedButton = DeliveryBoyMenuButton.Downloads;

    /**
     * Gets the selector of the 'download' button in the left menu bar. 
     */
    public get downloadsButton(): JQuery {
        return this.menuBarIcons
                   .find('.dboy-downloads-btn');
    }

    /**
     * Gets the content area of the "DOWNLOAD area" inside the right area.
     */
    public get downUploadArea(): JQuery {
        return this.rightArea
                   .find('.dboy-down-upload');
    }

    /**
     * Initializes the app.
     */
    public init() {
        let me = this;

        this.downloadsButton.click(() => {
            me.selectedButton = DeliveryBoyMenuButton.Downloads;
        });

        this.searchButton.click(() => {
            me.selectedButton = DeliveryBoyMenuButton.Search;
        });

        this.settingsButton.click(() => {
            me.selectedButton = DeliveryBoyMenuButton.Settings;
        });

        this.middleArea.resizable({
            handles: 'e',
            stop: (event, ui) => {
                //TODO
            }
        });
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
     * Runs the app.
     */
    public run() {
        this.updateViewByIcon();
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
     * Updates the view based on the selected button icon.
     */
    protected updateViewByIcon() {
        let isMiddleAreaVisible = false;

        let middleRows = this.middleArea
                             .find('.dboy-row');
        let rightRows = this.rightArea
                            .find('.dboy-row');

        this.menuBarIcons
            .find('.dboy-icon')
            .removeClass(DBOY_CLASS_SELECTED);

        middleRows.css('display', 'table-row');
        rightRows.css('display', 'table-row');

        let showRow = (selector: JQuery) => {
            selector.css('display', 'table-row');
        };

        switch (this._selectedButton) {
            case DeliveryBoyMenuButton.Downloads:
                this.downloadsButton
                    .addClass(DBOY_CLASS_SELECTED);

                rightRows.not('.dboy-downloads')
                         .css('display', 'none');
                break;

            case DeliveryBoyMenuButton.Search:
                isMiddleAreaVisible = true;

                this.searchButton
                    .addClass(DBOY_CLASS_SELECTED);

                rightRows.not('.dboy-search')
                         .css('display', 'none');  
                middleRows.not('.dboy-search')
                          .css('display', 'none');
                break;

            case DeliveryBoyMenuButton.Settings:
                isMiddleAreaVisible = true;

                this.settingsButton
                    .addClass(DBOY_CLASS_SELECTED);

                rightRows.not('.dboy-settings')
                         .css('display', 'none');  
                middleRows.not('.dboy-settings')
                          .css('display', 'none');
                break;
        }

        if (isMiddleAreaVisible) {
            this.middleArea
                .css('display', 'table-cell');
        }
        else {
            this.middleArea
                .css('display', 'none');
        }
    }
}

// create app instance
let $DBoy = new DeliveryBoyApp();
