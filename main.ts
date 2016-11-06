/// <reference types="electron" />
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


import * as Electron from 'electron';
// Module to control application life.
const app = Electron.app;
// Delivery Boy library
import * as dboy_factory from './lib/factory';

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow;

function createMenu(win: Electron.BrowserWindow) {
  let menu = Electron.Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          click: () => {
            app.exit(0);
          },
          label: 'Exit'
        }
      ],
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'DevTools',
          click: () => {
            win.webContents.toggleDevTools();
          }
        }
      ]
    }
  ]);

  return menu;
}

function createWindow () {
  // Create the browser window.
  mainWindow = new Electron.BrowserWindow({width: 800, height: 600});

  let menu = createMenu(mainWindow);

  mainWindow.setTitle('Delivery Boy');
  mainWindow.setMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

(<any>global).sharedObj = {
  client: dboy_factory.createClient(),
  window: mainWindow,
};
