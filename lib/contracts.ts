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


/**
 * 'Unknown' client state
 */
export const CLIENT_STATE_UNKNOWN = 0;
/**
 * 'Starting' client state
 */
export const CLIENT_STATE_STARTING = 1;
/**
 * 'Running' client state
 */
export const CLIENT_STATE_RUNNING = 2;
/**
 * 'Stopping' client state
 */
export const CLIENT_STATE_STOPPING = 3;
/**
 * 'Stopped' client state
 */
export const CLIENT_STATE_STOPPED = 4;

/**
 * 'Connected' event
 */
export const EVENT_NAME_CONNECTED = 'connected';
/**
 * 'Connecting' event
 */
export const EVENT_NAME_CONNECTING = 'connecting';
/**
 * 'Disposed' event
 */
export const EVENT_NAME_DISPOSED = 'disposed';
/**
 * 'Disposing' event
 */
export const EVENT_NAME_DISPOSING = 'disposing';
/**
 * 'Download list initialized' event
 */
export const EVENT_NAME_DOWNLOAD_LIST_INITIALIZED = 'downloadlistinitialized';
/**
 * 'Property changed' event
 */
export const EVENT_NAME_PROPERTY_CHANGED = 'propertychanged';

/**
 * Describes a client.
 */
export interface Client extends NotifyPropertyChanged {
    /**
     * Gets the underlying configuration.
     */
    config: ClientConfig;

    /**
     * Connects to a remote client.
     * 
     * @param {string} host The host name / address.
     * @param {number} port The TCP port.
     * @param {Function} callback The result callback.
     */
    connectTo(host: string, port: number,
              callback: (err: any, conn?: ClientConnection) => void): void;

    /**
     * Requests the download list.
     * 
     * @param {Function} [callback] The result callback.
     */
    downloads(callback: (err: any, list?: DownloadList) => void): void;

    /**
     * Requests the file list.
     * 
     * @param {Function} [callback] The result callback.
     */
    library(callback: (err: any, lib?: FileLibrary) => void): void;

    /**
     * Registers a handler for a 'connected' event.
     * 
     * @param {ClientConnectionEstablishedEventHandler} handler The handler to register.
     * 
     * @chainable
     */
    onConnected(handler: ClientConnectionEstablishedEventHandler): Client;

    /**
     * Registers a handler for a 'connecting' event.
     * 
     * @param {ClientConnectionEstablishedEventHandler} handler The handler to register.
     * 
     * @chainable
     */
    onConnecting(handler: ClientConnectingEventHandler): Client;

    /**
     * Starts the client.
     * 
     * @param {Function} [callback] The result callback.
     */
    start(callback?: (err: any) => void): void;

    /**
     * Stops the client.
     * 
     * @param {Function} [callback] The result callback.
     */
    stop(callback?: (err: any) => void): void;

    /**
     * Toggles the state of the client.
     * 
     * @param {Function} [callback] The result callback.
     */
    toggle(callback?: (err: any) => void): void;

    /**
     * Invokes a logic for the case when the client reached 'running' or 'stopped'
     * state.
     * 
     * @param {Function} [callback] The result callback.
     */
    whenRunningOrStopped(callback: (err: any) => void): void;

    /**
     * Gets the current client state.
     */
    state: number;
}

/**
 * Arguments for an event when a remote machine tries to connect.
 */
export interface ClientConnectingEventArguments extends EventArguments {
    /**
     * Gets or sets if connection should be closed or not.
     */
    close: boolean;

    /**
     * Gets the underlying connection.
     */
    connection: Connection;
}

/**
 * Arguments for an event when a client connection has been established.
 */
export interface ClientConnectionEstablishedEventArguments extends EventArguments {
    /**
     * Gets the new connection.
     */
    connection: ClientConnection;
}

/**
 * A client connection.
 */
export interface ClientConnection {
    /**
     * Closes the connection.
     * 
     * @param {Function} [callback] The result callback.
     */
    close(callback?: (err: any) => void): void;

    /**
     * Gets the underlying "raw" connection.
     */
    connection: Connection;

    /**
     * Reads a message.
     * 
     * @param {Function} [callback] The result callback.
     */
    read<T>(callback: (err: any, data?: T) => void): void;

    /**
     * Writes a message.
     * 
     * @param {T} data The message to write.
     * @param {Function} [callback] The result callback.
     */
    write<T>(data: T, callback?: (err: any) => void): void;
}

/**
 * Desceibes config data for a client.
 */
export interface ClientConfig {
    /**
     * Folders
     */
    folders?: {
        /**
         * List of share folders.
         */
        shares?: string[],

        /**
         * Temp folder.
         */
        temp?: string;
    },

    /**
     * The port a client a should listen on.
     */
    port?: number;
}

/**
 * A child object of a client.
 */
export interface ClientObject {
    /**
     * Gets the underlying client.
     */
    client: Client;
}

/**
 * Describes a "raw" connection.
 */
export interface Connection {
    /**
     * Closes the connection.
     * 
     * @param {Function} [callback] The result callback.
     */
    close(callback?: (err: any) => void): void;

    /**
     * Reads data from the connection.
     * 
     * @param {number} bytesToRead The number of bytes to read.
     * @param {Function} callback The result callback.
     */
    read(bytesToRead: number, callback: (err: any, buffer?: Buffer) => void): void;

    /**
     * Writes data to the connection.
     * 
     * @param {Buffer} buffer The data to write.
     * @param {Function} [callback] The result callback.
     */
    write(buffer: Buffer, callback?: (err: any) => void): void;
}

/**
 * An object that can be disposed.
 */
export interface Disposable {
    /**
     * Disposes the object.
     * 
     * @param {Function} [callback] The result callback.
     */
    dispose(callback?: (err: any) => void): void;

    /**
     * Gets if the object has already bee disposed or not.
     */
    isDisposed: boolean;
}

/**
 * Describes a download item.
 */
export interface DownloadItem extends Disposable, NotifyPropertyChanged {
    /**
     * Gets the short name of the file.
     */
    fileName: string;

    /**
     * Gets the size of the file in bytes.
     */
    size: number;

    /**
     * Gets the underlying list.
     */
    list: DownloadList;

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
export interface DownloadList extends ClientObject, Disposable {
    /**
     * Adds a new download by link.
     * 
     * @param {string} link The link.
     * @param {Function} [callback] The result callback.
     */
    addByLink(link: string,
              callback?: (err: any, newItem?: DownloadItem) => void): void;

    /**
     * Gets the list of download items.
     * 
     * @param {Function} callback The result callback.
     */
    items(callback: (err: any, newItem?: DownloadItem[]) => void): void;
}

/**
 * Arguments for a 'Download list initialized' event.
 */
export interface DownloadInitializedEventArguments extends EventArguments {
    /**
     * The error (if occurred).
     */
    error?: any;

    /**
     * The list (if succeeded).
     */
    list?: DownloadList;
}

/**
 * Describes the arguments for an event.
 */
export interface EventArguments {
}

/**
 * Describes an object that raises events.
 */
export interface EventObject {
    /**
     * Registers for an event.
     * 
     * @param {string | symbol} eventName The name of the event.
     * @param {EventHandler} handler The handler to register.
     * 
     * @chainable
     */
    on(eventName: string | symbol, handler: EventHandler): EventObject;

    /**
     * Registers for an event (once).
     * 
     * @param {string} eventName The name of the event.
     * @param {EventHandler} handler The handler to register.
     * 
     * @chainable
     */
    once(eventName: string | symbol, handler: EventHandler): EventObject;
}

/**
 * Describes a library of files.
 */
export interface FileLibrary extends ClientObject {
    /**
     * Requests all collections of that library.
     * 
     * @param {Function} callback The result callback.
     */
    collections(callback: (err: any, items?: FileLibraryCollection[]) => void): void;
}

/**
 * Describes collection inside a file library.
 */
export interface FileLibraryCollection {
    /**
     * Requests all items of that collection.
     * 
     * @param {Function} callback The result callback.
     */
    items(callback: (err: any, items?: FileLibraryCollectionItem[]) => void): void;

    /**
     * Gets the underlying library.
     */
    library: FileLibrary;
}

/**
 * Describes an item of a collection inside a file library.
 */
export interface FileLibraryCollectionItem extends Hashable, Linkable {
    /**
     * Gets the underlying collection.
     */
    collection: FileLibraryCollection;

    /**
     * Gets the name of the item.
     */
    name: string;
}

/**
 * Describes a hash.
 */
export interface Hash {
    /**
     * List of chunks.
     */
    chunks?: {
        /**
         * The hash. of the chunk.
         */
        hash: string;

        /**
         * The size of the chunk.
         */
        size: number;
    }[];

    /**
     * The full hash.
     */
    hash: string;
}

/**
 * Describes an object that can be hashed.
 */
export interface Hashable {
    /**
     * Computes a hash.
     * 
     * @param {Function} callback The result callback.
     */
    hash(callback: (err: any, hash?: Hash) => void): void;
}

/**
 * Describes an object that can have a link.
 */
export interface Linkable {
    /**
     * Requests the URI of the object.
     */
    url(callback: (err: any, url?: string) => void): void;
}

/**
 * Describes a message.
 */
export interface Message {
    /**
     * Type of the message.
     */
    type: number;
}

/**
 * Describes an object that notifies on property change.
 */
export interface NotifyPropertyChanged extends EventObject {
    /**
     * Registers a handler for a property changed event.
     * 
     * @param {PropertyChangedEventHandler} handler The handler to register.
     * 
     * @chainable
     */
    onPropertyChanged(handler: PropertyChangedEventHandler): NotifyPropertyChanged;
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
 * Describes a 'client connection established' event handler.
 */
export type ClientConnectionEstablishedEventHandler = (sender: any, args: ClientConnectionEstablishedEventArguments) => void;
/**
 * Describes a 'client connecting' event handler.
 */
export type ClientConnectingEventHandler = (sender: any, args: ClientConnectingEventArguments) => void;
/**
 * Describes a general event handler.
 */
export declare type EventHandler = (sender: any, args: EventArguments) => void;
/**
 * Describes a property changed event handler.
 */
export declare type PropertyChangedEventHandler = (sender: any, args: PropertyChangedEventArguments) => void;
