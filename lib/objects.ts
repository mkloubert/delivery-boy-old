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
import * as Events from 'events';

declare const Promise: PromiseConstructorLike;

/**
 * A basic object that can handle events.
 */
export abstract class CommonEventObjectBase implements dboy_contracts.Disposable, dboy_contracts.NotifyPropertyChanged {
    /**
     * The underlying event emitter.
     */
    protected readonly _EVENTS = new Events.EventEmitter();
    /**
     * Stores the value for the 'isDisposed' property.
     */
    protected _isDisposed = false;

    /* @inheritdoc */
    public dispose<T>(tag?: T): PromiseLike<dboy_contracts.PromiseResult<dboy_contracts.Disposable, T>> {
        let me = this;

        return new Promise((resolve, reject) => {
            try {
                me.disposeInner(true,
                                resolve, reject);
            }
            catch (e) {
                reject(<dboy_contracts.ErrorContext<T>>{
                    category: 'dispose',
                    code: 1,
                    error: e,
                    object: me,
                    tag: tag,
                });
            }
        });
    }

    private disposeInner<T>(disposing: boolean,
                            resolve: (value?: {} | PromiseLike<{}>) => void, reject: (reason?: any) => void,
                            tag?: T) {
        let me = this;

        if (disposing && this.isDisposed) {
            return;
        }

        let resolveInvoked = false;
        let rejectInvoked = true;

        let resolveWrapper = () => {
            if (resolveInvoked || rejectInvoked) {
                return;
            }

            resolveInvoked = true;

            if (disposing) {
                me._isDisposed = true;
                
                me.raisePropertyChanged('isDisposed');
                me.raiseEvent(dboy_contracts.EVENT_NAME_DISPOSED);
            }

            resolve(<dboy_contracts.PromiseResult<CommonEventObjectBase, T>>{
                result: this,
                tag: tag,
            });
        };

        let rejectWrapper = (err: any) => {
            if (rejectInvoked || resolveInvoked) {
                return;
            }

            rejectInvoked = true;
            reject(<dboy_contracts.ErrorContext<T>>{
                category: 'dispose',
                code: 1,
                error: err,
                object: this,
                tag: tag,
            });
        };

        if (disposing) {
            this.raiseEvent(dboy_contracts.EVENT_NAME_DISPOSING);
        }

        try {
            this.disposing(resolveWrapper, rejectWrapper,
                           tag,
                           disposing);
        }
        catch (e) {
            rejectWrapper(e);
        }
    }

    /**
     * The logic for the 'dispose()' method.
     * 
     * @param {Function} resolve The 'succeeded' callback.
     * @param {Function} reject The 'error' callback.
     * @param {T} tag The optional value for the callbacks.
     * @param {boolean} disposing 'dispose' method was called or not.
     */
    protected disposing<T>(resolve: () => void, reject: (reason: any) => void,
                           tag: T,
                           disposing: boolean) {

        // dummy by default
    }

    /* @inheritdoc */
    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /* @inheritdoc */
    public on(eventName: string | symbol, handler: dboy_contracts.EventHandler): CommonEventObjectBase {
        let me = this;

        if (handler) {
            this._EVENTS.on(eventName, (args: dboy_contracts.EventArguments) => {
                handler(me, args);
            });
        }

        return me;
    }

    /* @inheritdoc */
    public once(eventName: string | symbol, handler: dboy_contracts.EventHandler): CommonEventObjectBase {
        let me = this;

        if (handler) {
            this._EVENTS.once(eventName, (args: dboy_contracts.EventArguments) => {
                handler(me, args);
            });
        }

        return me;
    }

    /* @inheritdoc */
    public onPropertyChanged(handler: dboy_contracts.PropertyChangedEventHandler): CommonEventObjectBase {
        return this.on(dboy_contracts.EVENT_NAME_PROPERTY_CHANGED,
                       handler);
    }

    /**
     * Raises an event.
     * 
     * @param {string | symbol} eventName The event to raise.
     * @param [dboy_contracts.EventArguments] [args] The optional arguments for the event.
     * 
     * @return {boolean} Event was raised or not.
     */
    public raiseEvent(eventName: string | symbol, args?: dboy_contracts.EventArguments): boolean {
        if (arguments.length < 2) {
            args = {};
        }

        return this._EVENTS
                   .emit(eventName, args);
    }

    /**
     * Raises the 'property changed' event.
     * 
     * @param {string} propertyName The name of the property.
     * 
     * @return {boolean} Event was raised or not.
     */
    public raisePropertyChanged(propertyName: string): boolean {
        return this.raiseEvent(dboy_contracts.EVENT_NAME_PROPERTY_CHANGED,
                               {
                                   propertyName: propertyName,
                               });
    }
}
