define([
    'dcl/dcl',
    "xdojo/declare",
    "xide/manager/ServerActionBase",
    "xide/manager/BeanManager",
    'xide/encoding/MD5',
    'xide/types',
    'xide/utils',
    "dojo/cookie",
    "dojo/json",
    "dojo/Deferred",
    "xide/data/Memory",
    'xide/mixins/EventedMixin'
], function (dcl, declare, ServerActionBase, BeanManager, MD5, types, utils, cookie, json, Deferred, Memory, EventedMixin) {
    var debug = false;
    var LogView = false;
    var _ProgressHandler = declare([EventedMixin], {
        bytesLoaded: null,
        percentValue: null,
        item: null,
        delegate: null,
        _onEnd: null,
        _onHandle: null,
        serviceClass: 'XIDE_Log_Service',
        constructor: function (item) {
            this.item = item;
            this.subscribe(item.progressMessage, this._onProgress);
            this.subscribe(item.progressFailedMessage, this._onProgressFailed);
        },
        _onProgressFailed: function (data) {
            this.item.level = 'error';
            this.item.message = this.item.oriMessage + ' : Failed';
            this.item._isTerminated = true;
            //gee, can't we do better ?
            if (data && data.item && data.item.error && this.item.details) {
                this.item.details['error'] = data.item.error;
            }
        },
        _onFinish: function () {
            if (this._onHandle) {
                this._onHandle.remove();
            }
        },
        _onProgress: function (data) {
            try {
                var computableEvent = data.progress;
                var percentage = null;
                if (percentage == null) {
                    percentage = Math.round((computableEvent.loaded * 100) / computableEvent.total);
                    this.bytesLoaded = computableEvent.loaded;
                }

                if (this.percentValue != percentage) {
                    var _newMessage = '' + this.item.oriMessage;
                    _newMessage += ' : ' + percentage + '%';
                    this.item.message = '' + _newMessage;
                }

                this.percentValue = percentage;
                this._emit('progress');
                if (this.percentValue >= 100) {
                    this.item.message = this.item.oriMessage + ' : Done';
                    this._emit('finish');
                    this._onFinish();
                    this.destroy();
                }
            } catch (e) {
                console.error('crash in log progress ' + e);
            }
        }
    });
    return dcl([ServerActionBase, BeanManager], {
        declaredClass: "xcf.manager.LogManager",
        serviceClass: 'XIDE_Log_Service',
        cookiePrefix: 'logging',
        singleton: true,
        serviceView: null,
        clients: null,
        beanNamespace: 'logging',
        views: null,
        stores: {},
        removeStore: function (id) {
            var store = this.stores[id];
            if (store) {
                store.destroy && store.destroy();
                delete this.stores[id];
            }
        },
        getViewId: function (item) {
            var data = {
                info: item.info
            };
            return this.beanNamespace + MD5(JSON.stringify(data), 1);
        },
        loadPreferences: function () {
            var _cookie = this.cookiePrefix + '_debug_settings';
            var settings = cookie(_cookie);
            settings = settings ? json.parse(settings) : {};
            return settings;
        },
        savePreferences: function (settings) {
            var _cookie = this.cookiePrefix + '_debug_settings';
            cookie(_cookie, json.stringify(settings));
        },
        empty: function (which) {
            this.clear(which);
            var store = this.getStore(which);
            if (store.then) {
                store.then(function (_store) {
                    _store.setData([]);
                });
            }
        },
        clear: function (which) {
            return this.runDeferred(null, 'clearAbs', [which || '']).then(function (data) {
            });
        },
        getViewTarget: function () {
            var mainView = this.ctx.getApplication().mainView;
            return mainView.getNewAlternateTarget();
        },
        getStore: function (which) {
            if (!which) {
                return this.store;
            }
            var dfd = new Deferred();
            if (this.stores[which]) {
                dfd.resolve(this.stores[which]);
                return dfd;
            }
            var thiz = this;
            this.runDeferred(null, 'lsAbs', [which || '']).then(function (data) {
                if (_.isString(data)) {
                    data = utils.getJson(data);
                }
                var store = thiz.initStore(data);
                thiz.stores[which] = store;
                dfd.resolve(store);
            });
            return dfd;
        },
        /***
         * Common function that this instance is in a valid state
         * @returns {boolean}
         */
        isValid: function () {
            return this.store != null;
        },
        _buildLoggingMessage: function (msg) {
            if (!msg.time) {
                debug && console.error('logging message has no time!', msg);
            }
            var item = {
                id: utils.createUUID(),
                level: msg.level,
                message: msg.message,
                host: '',
                data: msg.data || {},
                time: msg.time || new Date().getTime(),
                type: '',
                show: true,
                showDevice: true
            };
            if (msg.type) {
                item.type = msg.type;
            }
            if (msg.device && msg.device.host) {
                item.host = msg.device.host + ':' + msg.device.port;
            }
            if (msg.deviceMessage) {
                item.message = item.message + ':' + msg.deviceMessage;
            }
            item.ori = msg;
            return item;
        },
        /***
         * Init our store
         * @param data
         * @returns {dstore/Memory}
         */
        initStore: function (data) {
            var sdata = {
                identifier: "time",
                label: "level",
                items: [],
                sort: 'time'
            };
            if (data.length == 0) {
                data = [];
            }
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                sdata.items.push(this._buildLoggingMessage(item));
            }
            var storeClass = declare('LogStore', [Memory], {});
            return new storeClass({
                idProperty: 'time',
                data: sdata,
                id: utils.createUUID()
            });
        },
        createLoggingView: function (store, where, silent) {
            var parent = where || this.getViewTarget();
            return utils.addWidget(LogView, {
                delegate: this,
                store: store,
                title: 'Log',
                closable: true,
                style: 'padding:0px',
                silent: silent
            }, this, parent, true);
        },
        updateViews: function (store, message) {
            for (var i = 0; i < this.views.length; i++) {
                var view = this.views[i];
                view.update(store, message);
            }
        },
        refreshViews: function () {
            for (var i = 0; i < this.views.length; i++) {
                var view = this.views[i];
                view.grid.refresh();
            }
        },
        addLogView: function (view) {
            this.views.push(view);
        },
        openLogView: function (target, silent) {
            if (!this.isValid()) {
                this.initStore([]);
            }
            var logView = this.createLoggingView(this.store, target, silent);
            this.views.push(logView);
            return logView;
        },
        _createPendingEvent: function (message, item, terminatorMessage, id) {
            var _handle = null,
                thiz = this;
            item._isInProgress = true;
            function _onEnd(evt) {
                if (!item._isTerminated && _handle) {
                    item.message = item.oriMessage + ' : Done';
                    if (evt && evt.failed === true) {
                        item.level = 'error';
                        item.message = item.oriMessage + ' : Failed';
                    }
                    item._isTerminated = true;
                    _handle.remove();
                    _handle = null;
                    thiz.refreshViews();
                    if (item.progressHandler) {
                        item.progressHandler.destroy();
                    }
                }
            }
            _handle = thiz.subscribe(terminatorMessage, _onEnd, thiz)[0];
            if (item.showProgress && item.progressMessage) {
                if (!item.progressHandler) {
                    var progressObject = new _ProgressHandler(item, this);
                    progressObject._onEnd = _onEnd;
                    progressObject._onEndHandle = _handle;
                    item.progressHandler = progressObject;
                }
            }
        },
        addLoggingMessage: function (msg) {
            if (msg && msg.data) {
                var storeId = msg.data.logId;
                if (!storeId && msg.data && msg.data.device) {
                    var device = msg.data.device;
                    storeId = device.host + '_' + device.port + '_' + device.protocol;
                }
            }
            var item = {
                id: utils.createUUID(),
                level: msg.level,
                message: msg.message,
                host: msg.host || '',
                data: msg.data || {},
                time: msg.time || new Date().getTime(),
                type: msg.type || '',
                show: true,
                showDevice: true,
                terminatorItem: msg.item,
                terminatorMessage: msg.terminatorMessage,
                showProgress: msg.showProgress,
                progressMessage: msg.progressMessage,
                progressFailedMessage: msg.progressFailedMessage,
                details: msg.details
            };

            if (msg.data) {
                if (msg.data.type) {
                    item.type = msg.data.type;
                }

                if (msg.data.device && msg.data.device.host) {
                    item.host = msg.data.device.host + ':' + msg.data.device.port;
                }
                if (msg.data.deviceMessage) {
                    item.message = item.message + ':' + msg.data.deviceMessage;
                }
            }

            try {
                var _isTerminated = item.terminatorMessage != null && !item._isTerminated;
                if (_isTerminated) {
                    if (item.oriMessage == null) {
                        item.oriMessage = '' + item.message;
                    }
                    this._createPendingEvent(item.oriMessage, item, item.terminatorMessage, item.time);
                }
                var store = this.getStore(storeId);
                if (!store) {
                    return;
                }
                if (store.then) {
                    store.then(function (_store) {
                        store = _store;
                        item = _store.putSync(item);
                        _store._emit('added', {
                            item: item,
                            store: store
                        });
                    });
                } else {
                    item = store.putSync(item);
                    store._emit('added', {
                        item: item,
                        store: store
                    });
                }

            } catch (e) {
                console.error('adding log message to store failed ' + e);
            }
        },
        onServerLogMessage: function (evt) {
            debug && console.log('on server log message ', evt);
            if (evt.data && evt.data.time) {
                evt.time = evt.data.time;
            }
            this.addLoggingMessage(evt);
            if (evt.write === true) {
                this.publish(types.EVENTS.ON_CLIENT_LOG_MESSAGE, {
                    message: evt.message,
                    data: evt.data,
                    details: evt.details,
                    level: evt.level,
                    type: evt.type,
                    time: evt.data.time || evt.time
                });
            }
        },
        /////////////////////////////////////////////////////////////////////////////////////
        //
        //  Main entries, called by the context
        //
        /////////////////////////////////////////////////////////////////////////////////////
        init: function () {
            this.subscribe([
                types.EVENTS.ON_SERVER_LOG_MESSAGE
            ]);
            this.views = [];
            this.stores = {};
        },
        /////////////////////////////////////////////////////////////////////////////////////
        //
        //  UX Callbacks
        //
        /////////////////////////////////////////////////////////////////////////////////////
        onStoreReloaded: function () {
            for (var i = 0; i < this.views.length; i++) {
                var view = this.views[i];
                view.reload(this.store);
                view.update();
            }
        },
        reload: function () {
            var thiz = this;
            this.currentItem = null;
            this.ls(function (data) {
                thiz.onStoreReloaded(data);
            });
        },
        /////////////////////////////////////////////////////////////////////////////////////
        //
        //  Server methods
        //
        /////////////////////////////////////////////////////////////////////////////////////
        /***
         * ls is enumerating all drivers in a given scope
         * @param readyCB{function}
         * @param which {string}
         * @param errorCB {function}
         * @returns {*}
         */
        ls: function (readyCB, which, cb) {
            var thiz = this;
            var _cb = cb || function (data) {
                    debug && console.warn('logging manager : ls:: got data', data);
                    //keep a copy
                    thiz.rawData = data;
                    if (_.isString(data)) {
                        data = utils.getJson(data);
                    }
                    thiz.store = thiz.initStore(data);
                    if (readyCB) {
                        readyCB(data);
                    }
                };
            return this.callMethodEx(null, 'lsAbs', [which || ''], _cb, true);
        }
    });
});
