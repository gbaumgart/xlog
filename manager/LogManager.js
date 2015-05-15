define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "xide/manager/ServerActionBase",
        "xide/manager/BeanManager",
        'dojox/encoding/digests/MD5',
        'xide/types',
        'xide/utils',
        "dojo/cookie",
        "dojo/json",
        "xide/data/Memory",
        'xlog/views/LogView',
        'xide/mixins/ReloadMixin',
        'xide/mixins/EventedMixin'
    ],
    function (declare, lang, ServerActionBase, BeanManager, MD5, types, utils, cookie, json, Memory, LogView, ReloadMixin, EventedMixin) {


        var _ProgressHandler = declare([EventedMixin], {
            bytesLoaded: null,
            percentValue: null,
            item: null,
            delegate:null,
            _onEnd:null,
            _onHandle:null,

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
            _onFinish:function(){
                if(this._onHandle){
                    this._onHandle.remove();
                }
            },
            destroy:function(){

                this._destroyHandles();
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
                        //this.item._isTerminated = true;
                        this._emit('finish');
                        //this._destroyHandles();
                        this._onFinish();
                        this.destroy();
                    }

                } catch (e) {
                    console.error('crash in log progress ' + e);
                }
            }
        });


        return declare("xide.manager.LogManager", [ServerActionBase, BeanManager, ReloadMixin],
            {

                serviceClass: 'XIDE_Log_Service',
                cookiePrefix: 'logging',
                singleton: true,
                serviceView: null,
                clients: null,
                beanNamespace: 'logging',
                views: null,
                getViewId: function (item) {
                    var data = {
                        info: item.info
                    };
                    return this.beanNamespace + MD5(JSON.stringify(data), 1);
                },
                /////////////////////////////////////////////////////////////////////////////////////
                //
                //  Public API
                //
                /////////////////////////////////////////////////////////////////////////////////////

                /////////////////////////////////////////////////////////////////////////////////////
                //
                //  Storage & Persistence
                //
                /////////////////////////////////////////////////////////////////////////////////////
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
                clear: function () {

                    /*
                     this.store.setData({
                     identifier: "id",
                     label: "level",
                     items: []
                     });

                     for (var i = 0; i < this.views.length; i++) {
                     this.views[i].grid.set('collection', this.store.sort(this.views[i].getDefaultSort()));
                     }*/

                    this.runDeferred(null, 'clear', ['unset']).then(function (data) {

                    });

                },
                getViewTarget: function () {
                    var mainView = this.ctx.getApplication().mainView;
                    return mainView.getNewAlternateTarget();
                },
                getStore: function () {
                    return this.store;
                },
                /***
                 * Common function that this instance is in a valid state
                 * @returns {boolean}
                 */
                isValid: function () {
                    return this.store != null;
                },
                _buildLoggingMessage: function (msg) {
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
                        item.message = item.message + ':' + msg.deviceMessage
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
                        identifier: "id",
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
                    try {
                        this.store = new Memory({
                            idProperty: 'id',
                            data: sdata
                        });
                    } catch (e) {
                        console.error('log creation failed: ', e);
                    }

                    return this.store;
                },
                /////////////////////////////////////////////////////////////////////////////////////
                //
                //  UX factory and utils
                // @TODO : move it to somewhere else
                //
                /////////////////////////////////////////////////////////////////////////////////////
                /***
                 *
                 * @param store
                 * @param where
                 */
                createLoggingView: function (store, where, silent) {

                    var parent = where || this.getViewTarget();

                    try {
                        return utils.addWidget(LogView, {
                            delegate: this,
                            store: store,
                            title: 'Log',
                            closable: true,
                            style: 'padding:0px',
                            silent: silent
                        }, this, parent, true);
                    } catch (e) {
                        console.error(e);
                    }

                },
                updateViews: function (store, message) {

                    for (var i = 0; i < this.views.length; i++) {
                        var view = this.views[i];
                        view.update(store, message);
                    }
                },
                refreshViews: function (store, message) {

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

                    console.log('pending event ' + message + ' = ' + terminatorMessage + ' id',item);

                    function _onEnd(evt) {

                        console.log('_on end', arguments);

                        if (!item._isTerminated && _handle) {

                            item.message = item.oriMessage + ' : Done';
                            //turn into error!
                            if (evt && evt.failed === true) {
                                item.level = 'error';
                                item.message = item.oriMessage + ' : Failed';
                            }
                            //console.log('is terminated!');
                            item._isTerminated = true;
                            _handle.remove();
                            _handle = null;
                            //thiz.grid.refresh();
                            thiz.refreshViews();

                            var _e = item;
                            if (item.progressHandler) {
                                item.progressHandler.destroy();
                            }
                        }
                    }

                    _handle = thiz.subscribe(terminatorMessage, _onEnd, thiz)[0];


                    if (item.showProgress && item.progressMessage) {
                        /*
                         function ProgressHandler() {
                         this.bytesLoaded = null;
                         this.percentValue = null;
                         this.item = null;
                         this._onProgressFailed = function (data) {

                         this.item.level = 'error';
                         this.item.message = item.oriMessage + ' : Failed';
                         this.item._isTerminated = true;

                         //gee, can't we do better ?
                         if(data && data.item && data.item.error && this.item.details){
                         this.item.details['error'] = data.item.error;
                         }


                         if (_handle) {
                         _handle.remove();
                         _handle = null;
                         }

                         if (_progressHandle != null) {
                         _progressHandle.remove();
                         _progressHandle = null;
                         }

                         //thiz.grid.refresh();

                         _progressFailedHandle.remove();
                         _progressFailedHandle = null;


                         };
                         this._onProgress = function (data) {

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
                         //thiz.grid.refresh();
                         }
                         this.percentValue = percentage;

                         if (this.percentValue >= 100) {
                         this.item.message = this.item.oriMessage + ' : Done';
                         _progressHandle.remove();
                         _progressHandle = null;
                         if (_handle) {
                         _handle.remove();
                         _handle = null;
                         }
                         this.item._isTerminated = true;
                         //thiz.grid.refresh();
                         }

                         } catch (e) {
                         console.error('crash in log progress ' + e);
                         }
                         }
                         }
                         */
                        if(!item.progressHandler) {
                            var progressObject = new _ProgressHandler(item,this);
                            progressObject._onEnd = _onEnd;
                            progressObject._onEndHandle = _handle;
                            //progressObject.item = item;
                            item.progressHandler = progressObject;

                        }

                        //_progressHandle = dojo.subscribe(item.progressMessage, lang.hitch(progressObject, progressObject._onProgress));

                        /*
                         if (item.progressFailedMessage) {
                         _progressFailedHandle = dojo.subscribe(item.progressFailedMessage, lang.hitch(progressObject, progressObject._onProgressFailed));
                         }
                         */
                    }

                },
                addLoggingMessage: function (msg) {

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
                            item.message = item.message + ':' + msg.data.deviceMessage
                        }
                    }
                    if (!this.isValid()) {
                        this.initStore([]);
                    }
                    try {

                        var _isTerminated = item.terminatorMessage != null && !item._isTerminated;
                        if (_isTerminated) {
                            if (item.oriMessage == null) {
                                item.oriMessage = '' + item.message;
                            }

                            this._createPendingEvent(item.oriMessage, item, item.terminatorMessage, item.time);
                            //return '<span class=\"fa-spinner fa-spin\" style=\"margin-right: 4px\"></span>' + message;
                        }

                        this.getStore().put(item);
                    } catch (e) {
                        console.error('adding log message to store failed ' + e);
                    }
                    try {
                        this.updateViews(this.getStore(), msg);
                    } catch (e) {
                        console.error('', e);
                    }
                },
                onServerLogMessage: function (evt) {
                    this.addLoggingMessage(evt);
                    this.updateViews();
                },
                onMainViewReady: function () {

                },
                /////////////////////////////////////////////////////////////////////////////////////
                //
                //  Main entries, called by the context
                //
                /////////////////////////////////////////////////////////////////////////////////////
                init: function () {

                    this.inherited(arguments);

                    this.subscribe([
                        types.EVENTS.ON_MAIN_MENU_OPEN,
                        types.EVENTS.ON_MAIN_VIEW_READY,
                        types.EVENTS.ON_SERVER_LOG_MESSAGE
                    ]);
                    this.views = [];
                },
                /////////////////////////////////////////////////////////////////////////////////////
                //
                //  UX Callbacks
                //
                /////////////////////////////////////////////////////////////////////////////////////
                onStoreReloaded: function (rawData) {

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
                onMainMenuOpen: function (evt) {

                    var menu = evt['menu'];
                    //add 'Services' to MainMenu->Views
                    if (!menu['logMenuItem'] &&
                        menu['name'] == types.MAIN_MENU_KEYS.VIEWS) {
                        menu['logMenuItem'] = new dijit.MenuItem({
                            label: "Log",
                            onClick: lang.hitch(this, 'openLogView')
                        });
                        menu.addChild(menu['logMenuItem']);
                    }
                },
                /////////////////////////////////////////////////////////////////////////////////////
                //
                //  Server methods
                //
                /////////////////////////////////////////////////////////////////////////////////////
                /***
                 * ls is enumerating all drivers in a given scope
                 * @param scope{string}
                 * @param readyCB{function}
                 * @param errorCB{function}
                 * @returns {*}
                 */
                ls: function (readyCB, errorCB) {

                    var thiz = this;

                    var _cb = function (data) {
                        //keep a copy
                        thiz.rawData = data;
                        if (lang.isString(data)) {
                            data = utils.getJson(data);
                        }
                        thiz.initStore(data);
                        if (readyCB) {
                            readyCB(data);
                        }

                    };
                    return this.callMethodEx(null, 'ls', ['unset'], _cb, true);
                }
            });
    });
