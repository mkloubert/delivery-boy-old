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


export const CLIENT_STATE_UNKNOWN = 0;
export const CLIENT_STATE_STARTING = 1;
export const CLIENT_STATE_RUNNING = 2;
export const CLIENT_STATE_STOPPING = 3;
export const CLIENT_STATE_STOPPED = 4;

/**
 * Describes a client.
 */
export interface Client extends NotifyPropertyChanged {
    /**
     * Requests the download list.
     * 
     * @param {T} [tag] An optional object / value for the invocation.
     * 
     * @return {PromiseLike<PromiseResult<DownloadList, T>>} The promise.
     */
    requestDownloadList<T>(tag?: T): PromiseLike<PromiseResult<DownloadList, T>>;

    /**
     * Starts the client.
     * 
     * @param {T} [tag] An optional object / value for the invocation.
     * 
     * @return {PromiseLike<PromiseResult<Client, T>>} The promise.
     */
    start<T>(tag?: T): PromiseLike<PromiseResult<Client, T>>;

    /**
     * Stops the client.
     * 
     * @param {T} [tag] An optional object / value for the invocation.
     * 
     * @return {PromiseLike<PromiseResult<Client, T>>} The promise.
     */
    stop<T>(tag?: T): PromiseLike<PromiseResult<Client, T>>;

    /**
     * Toggles the state of the client.
     * 
     * @param {T} [tag] An optional object / value for the invocation.
     * 
     * @return {PromiseLike<PromiseResult<Client, T>>} The promise.
     */
    toggle<T>(tag?: T): PromiseLike<PromiseResult<Client, T>>;

    /**
     * Gets the current client state.
     */
    state: number;
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
 * An object that can be disposed.
 */
export interface Disposable {
    /**
     * Disposed the object.
     * 
     * @param {T} [tag] An optional object / value for the invocation.
     * 
     * @return {PromiseLike<PromiseResult<Disposable, T>>} The promise.
     */
    dispose<T>(tag?: T): PromiseLike<PromiseResult<Disposable, T>>;

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
     * Gets the list of downloads.
     */
    downloads: DownloadItem[];
}

/**
 * Descibes an error context.
 */
export interface ErrorContext<T> {
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
     * The underlying object.
     */
    object?: any;

    /**
     * The message.
     */
    message?: string;

    /**
     * The tag object.
     */
    tag?: T;
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
     * @param {string} eventName The name of the event.
     * @param {EventHandler} handler The handler to register.
     * 
     * @chainable
     */
    on(eventName: string, handler: EventHandler): EventObject;
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
 * Describes a promise result.
 */
export interface PromiseResult<TResult, TTag> {
    /**
     * The result object.
     */
    result: TResult;

    /**
     * The optional submitted object.
     */
    tag?: TTag;
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
 * Descibes a general event handler.
 */
export declare type EventHandler = (sender: any, args: EventArguments) => void;
/**
 * Descibes a property changed event handler.
 */
export declare type PropertyChangedEventHandler = (sender: any, args: PropertyChangedEventArguments) => void;
