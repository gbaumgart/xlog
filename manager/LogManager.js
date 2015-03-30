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
        'xide/mixins/ReloadMixin'
    ],
    function (declare, lang, ServerActionBase, BeanManager, MD5, types, utils, cookie, json, Memory, LogView, ReloadMixin) {
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

                    this.store.setData({
                        identifier: "id",
                        label: "level",
                        items: []
                    });

                    for (var i = 0; i < this.views.length; i++) {
                        this.views[i].grid.set('collection', this.store.sort(this.views[i].getDefaultSort()));
                    }

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
                    if(data.length==0){
                        data = [];
                    }

                    for (var i = 0; i < data.length; i++) {
                        var item = data[i];
                        sdata.items.push(this._buildLoggingMessage(item));
                    }
                    try {
                        this.store = new Memory({
                            idProperty:'id',
                            data: sdata
                        });
                    }catch(e){
                        console.error('log creation failed: ',e);
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
                            style:'padding:0px',
                            silent:silent
                        }, this, parent, true);
                    } catch (e) {
                        console.error(e);
                    }

                },
                updateViews: function (store,message) {

                    for (var i = 0; i < this.views.length; i++) {
                        var view = this.views[i];
                        view.update(store,message);
                    }
                },
                addLogView:function(view){
                    this.views.push(view);
                },
                openLogView: function (target,silent) {

                    if (!this.isValid()) {
                        this.initStore([]);
                    }
                    var logView = this.createLoggingView(this.store,target,silent);
                    this.views.push(logView);
                    return logView;
                },
                addLoggingMessage: function (msg) {

                    var item = {
                        id: utils.createUUID(),
                        level: msg.level,
                        message: msg.message,
                        host: msg.host||'',
                        data: msg.data || {},
                        time: msg.time || new Date().getTime(),
                        type: msg.type||'',
                        show: true,
                        showDevice: true,
                        terminatorItem: msg.item,
                        terminatorMessage: msg.terminatorMessage,
                        showProgress:msg.showProgress,
                        progressMessage:msg.progressMessage,
                        progressFailedMessage:msg.progressFailedMessage,
                        details:msg.details
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
                        this.getStore().put(item);
                    }catch(e){
                        console.error('adding log message to store failed ' + e);
                    }
                    this.updateViews(this.getStore(),msg);
                },
                onServerLogMessage: function (evt) {
                    this.addLoggingMessage(evt);
                    this.updateViews();
                },
                onMainViewReady:function(){

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
                        if(lang.isString(data)){
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
