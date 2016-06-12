import 'babel-polyfill';
import {IDBVersionChangeEvent as shimIDBVersionChangeEvent} from './Event.js';
import {IDBCursor as shimIDBCursor, IDBCursorWithValue as shimIDBCursorWithValue} from './IDBCursor.js';
import {IDBRequest as shimIDBRequest, IDBOpenDBRequest as shimIDBOpenDBRequest} from './IDBRequest.js';
import {IDBFactory as shimIDBFactory, shimIndexedDB} from './IDBFactory.js';
import shimIDBKeyRange from './IDBKeyRange.js';
import shimIDBObjectStore from './IDBObjectStore.js';
import shimIDBIndex from './IDBIndex.js';
import shimIDBTransaction from './IDBTransaction.js';
import shimIDBDatabase from './IDBDatabase.js';
import polyfill from './polyfill.js';
import CFG from './cfg.js';

const glob = typeof global !== 'undefined' ? global : window;
glob._babelPolyfill = false; // http://stackoverflow.com/questions/31282702/conflicting-use-of-babel-register

let IDB;

function shim (name, value) {
    try {
        // Try setting the property. This will fail if the property is read-only.
        IDB[name] = value;
    } catch (e) {
        console.log(e);
    }
    if (IDB[name] !== value && Object.defineProperty) {
        // Setting a read-only property failed, so try re-defining the property
        try {
            Object.defineProperty(IDB, name, {
                value: value
            });
        } catch (e) {
            // With `indexedDB`, PhantomJS 2.2.1 fails here and below but
            //  not above, while Chrome is reverse (and Firefox doesn't
            //  get here since no WebSQL to use for shimming)
        }

        if (IDB[name] !== value) {
            typeof console !== 'undefined' && console.warn && console.warn('Unable to shim ' + name);
        }
    }
}

function shimAll (idb) {
    IDB = idb || window;
    shim('shimIndexedDB', shimIndexedDB);
    if (IDB.shimIndexedDB) {
        IDB.shimIndexedDB.__useShim = function () {
            if (typeof CFG.win.openDatabase !== 'undefined') {
                // Polyfill ALL of IndexedDB, using WebSQL
                shim('indexedDB', shimIndexedDB);
                shim('IDBFactory', shimIDBFactory);
                shim('IDBDatabase', shimIDBDatabase);
                shim('IDBObjectStore', shimIDBObjectStore);
                shim('IDBIndex', shimIDBIndex);
                shim('IDBTransaction', shimIDBTransaction);
                shim('IDBCursor', shimIDBCursor);
                shim('IDBCursorWithValue', shimIDBCursorWithValue);
                shim('IDBKeyRange', shimIDBKeyRange);
                shim('IDBRequest', shimIDBRequest);
                shim('IDBOpenDBRequest', shimIDBOpenDBRequest);
                shim('IDBVersionChangeEvent', shimIDBVersionChangeEvent);
            } else if (typeof IDB.indexedDB === 'object') {
                // Polyfill the missing IndexedDB features (no need for IDBEnvironment, the window containing indexedDB itself))
                polyfill(shimIDBCursor, shimIDBCursorWithValue, shimIDBDatabase, shimIDBFactory, shimIDBIndex, shimIDBKeyRange, shimIDBObjectStore, shimIDBRequest, shimIDBTransaction);
            }
        };

        IDB.shimIndexedDB.__debug = function (val) {
            CFG.DEBUG = val;
        };
    }

    // Workaround to prevent an error in Firefox
    if (!('indexedDB' in IDB)) {
        IDB.indexedDB = IDB.indexedDB || IDB.webkitIndexedDB || IDB.mozIndexedDB || IDB.oIndexedDB || IDB.msIndexedDB;
    }

    // Detect browsers with known IndexedDb issues (e.g. Android pre-4.4)
    let poorIndexedDbSupport = false;
    if (typeof navigator !== 'undefined' && (
        navigator.userAgent.match(/Android 2/) || navigator.userAgent.match(/Android 3/) || navigator.userAgent.match(/Android 4\.[0-3]/))
    ) {
        /* Chrome is an exception. It supports IndexedDb */
        if (!navigator.userAgent.match(/Chrome/)) {
            poorIndexedDbSupport = true;
        }
    }

    if ((typeof IDB.indexedDB === 'undefined' || !IDB.indexedDB || poorIndexedDbSupport) && typeof CFG.win.openDatabase !== 'undefined') {
        IDB.shimIndexedDB.__useShim();
    } else {
        IDB.IDBDatabase = IDB.IDBDatabase || IDB.webkitIDBDatabase;
        IDB.IDBTransaction = IDB.IDBTransaction || IDB.webkitIDBTransaction || {};
        IDB.IDBCursor = IDB.IDBCursor || IDB.webkitIDBCursor;
        IDB.IDBKeyRange = IDB.IDBKeyRange || IDB.webkitIDBKeyRange;
    }
}

export default shimAll;
