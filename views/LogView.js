define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom-class",
        'xide/views/BeanView',
        "dgrid/OnDemandGrid",
        "dgrid/Selection",
        "dgrid/Keyboard",
        "dgrid/Editor",
        "xide/views/GridView",
        "dgrid/extensions/ColumnHider",
        "dgrid/extensions/ColumnResizer",
        "dgrid/extensions/ColumnReorder",
        'xide/types',
        'xide/utils',
        'xide/widgets/FlagsWidget',
        'xlog/widgets/RowDetailEditor',
        'xide/bean/Action',
        'xide/mixins/EventedMixin'
    ],
    function (declare, lang, domClass, BeanView, OnDemandGrid, Selection, Keyboard, Editor, GridView, ColumnHider, ColumnResizer, ColumnReorder, types, utils, FlagsWidget, RowDetailEditor,Action,EventedMixin) {


        var  ProgressHandler = declare(null,[EventedMixin],{
            bytesLoaded:null,
            percentValue:null,
            item:null,
            constructor:function(item){
                this.item = item;
            },
            _onProgressFailed : function (data) {

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


            },
            _onProgress : function (data) {

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
        });



        var logview = declare('xlog/views/LogView', [BeanView, GridView],{
                delegate: null,
                store: null,
                flagWidget: null,
                cssClass: "layoutContainer normalizedGridView logGridView",
                beanType: 'XLOG',
                sourceLabel: 'Host',
                sourceField: 'host',
                showSource: true,
                _eventKeys: {},
                getRootFilter:function(){},
                reload: function (store) {
                    this.refresh(store);
                },
                formatDateSimple: function (data, format) {
                    var momentUnix = moment.unix(data);
                    return momentUnix.format("MMMM Do, h:mm:ss a");
                },
                _createPendingEvent: function (message, item, terminatorMessage, id) {

                    var _handle = null,
                        _progressHandle = null,
                        _progressFailedHandle = null,
                        thiz = this,
                        _id = id;

                    item._isInProgress = true;

                    var _onEnd = function (evt) {

                        if (!item._isTerminated && _handle) {
                            item.message = item.oriMessage + ' : Done';
                            //turn into error!
                            if (evt && evt.failed === true) {
                                item.level = 'error';
                                item.message = item.oriMessage + ' : Failed';
                            }
                            item._isTerminated = true;
                            _handle.remove();
                            _handle = null;
                            thiz.grid.refresh();
                            if (_progressHandle != null) {
                                _progressHandle.remove();
                            }
                        }
                    };
                    _handle = thiz.subscribe(terminatorMessage,_onEnd,thiz)[0];

                    if (item.showProgress && item.progressMessage) {

                        function ProgressHandler() {
                            this.bytesLoaded = null;
                            this.percentValue = null;
                            this.item = null;
                            /**
                             *
                             */
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

                                thiz.grid.refresh();

                                _progressFailedHandle.remove();
                                _progressFailedHandle = null;


                            };
                            /**
                             *
                             */
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
                                        thiz.grid.refresh();
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
                                        thiz.grid.refresh();
                                    }

                                } catch (e) {
                                    console.error('crash in log progress ' + e);
                                }
                            }
                        }

                        var progressObject = new ProgressHandler();
                        progressObject.item = item;
                        _progressHandle = dojo.subscribe(item.progressMessage, lang.hitch(progressObject, progressObject._onProgress));
                        if (item.progressFailedMessage) {
                            _progressFailedHandle = dojo.subscribe(item.progressFailedMessage, lang.hitch(progressObject, progressObject._onProgressFailed));
                        }
                    }

                },
                getMessageFormatter: function (message, item) {
                    var _isTerminated = item.terminatorMessage != null && !item._isTerminated;

                    if (_isTerminated) {
                        if (item.oriMessage == null) {
                            item.oriMessage = '' + item.message;
                        }
                        this._createPendingEvent(message, item, item.terminatorMessage, item.time);
                        return '<span class=\"fa-spinner fa-spin\" style=\"margin-right: 4px\"></span>' + message;
                    }
                    return message;
                },
                getColumns: function () {
                    var thiz = this;
                    var columns = {
                        Level: {
                            field: "level", // get whole item for use by formatter
                            label: "Level",
                            sortable: true,
                            formatter: function (level) {

                                switch (level) {
                                    case 'info':
                                    {
                                        return '<span style=\"color:gray\">' + level + '</span>';
                                    }
                                    case 'error':
                                    {
                                        return '<span style=\"color:red\">' + level + '</span>';
                                    }
                                    case 'warning':
                                    {
                                        return '<span style=\"color:orange\">' + level + '</span>';
                                    }
                                }
                                return level;
                            }

                        },
                        Type: {
                            field: "type", // get whole item for use by formatter
                            label: "Type",
                            sortable: true
                        },
                        Host: {
                            field: "host", // get whole item for use by formatter
                            label: "Host",
                            sortable: true
                        },
                        Message: {
                            field: "message", // get whole item for use by formatter
                            label: "Message",
                            sortable: true,
                            formatter: function (message, item) {
                                return thiz.getMessageFormatter(message, item)
                            },
                            formatter2: function (status) {
                                var tpl = '<div style=\"color:${color}\">' + utils.capitalize(status) + '</div>';
                                return utils.substituteString(tpl, {
                                    color: status == 'offline' ? 'red' : 'green'
                                });
                            }
                        },
                        Time: {
                            field: "time", // get whole item for use by formatter
                            label: "Time",
                            sortable: true,
                            formatter: function (time) {
                                return thiz.formatDateSimple(time / 1000);
                            }
                        },
                        Details:{
                            field: "details", // get whole item for use by formatter
                            label: "Details",
                            sortable: false,
                            editor:RowDetailEditor
                        }
                    };

                    if (!this.showSource) {
                        delete columns['Host'];
                    }
                    return columns;
                },
                getDefaultSort:function(){
                    return [{property: 'time', descending: true}];
                },
                createWidgets: function (store) {

                    var grid = new (declare([OnDemandGrid,Editor,Selection, Keyboard, ColumnHider, ColumnResizer, ColumnReorder]))({
                        collection: store,
                        columns: this.getColumns(),
                        cellNavigation: false,
                        deselectOnRefresh: false,
                        rowsPerPage: 20
                    }, this.containerNode);

                    this.grid = grid;

                    this.onGridCreated(grid);

                    var hider = utils.find('.dgrid-hider-menu', this.domNode, false);

                    domClass.add(hider[0], 'ui-widget-content');

                    grid.set('collection',store.sort(this.getDefaultSort()));

                },
                onItemClick: function (item) {

                    if (!item) {
                        this.publish(types.EVENTS.ON_VIEW_SHOW, {
                            view: this
                        });
                    }
                },
                startup: function () {
                    this.inherited(arguments);
                    if (this.store) {
                        this.createWidgets(this.store);
                    }


                },
                //////////////////////////////////////////////////////////////
                //
                //  Bean impl.
                //
                //////////////////////////////////////////////////////////////
                hasItemActions: function () {
                    return true;
                },
                getItem: function () {
                    return this.selectedItem;
                },
                clear: function () {

                },
                isLevelEnabled: function (level) {

                    if (this.flagWidget) {

                        for (var i = 0; i < this.flagWidget.checkboxes.length; i++) {

                            var obj = this.flagWidget.checkboxes[i];

                            if (obj.value === level) {
                                return obj.get('checked');
                            }
                        }
                    } else {
                        return true;
                    }

                    return false;
                },
                update: function (store) {
                    this.onLevelChanged(store);
                },
                onShow:function(){
                    this.inherited(arguments);

                    this.resize();

                    if (this.onResize) {
                        this.onResize();
                    }
                    if(this.silent!==false) {
                        this.publish(types.EVENTS.ON_VIEW_SHOW, {
                            view: this
                        });
                        this.silent=false;
                    }

                    this.onLevelChanged();
                },
                _didSetStore:false,
                onLevelChanged: function (store) {



                    var logItems = this.store.fetchSync();

                    for (var i = 0; i < logItems.length; i++) {
                        var item = logItems[i];
                        item.show = this.isLevelEnabled(item.level)
                    }

                    if (store) {
                        this.store = store;
                    }

                    if(store && (!this._didSetStore || this.store!=store)){
                        this._didSetStore = true;
                        //this.grid.set('collection',store);
                        this.grid.set('collection',store.sort(this.getDefaultSort()));
                    }

                    if(!this.isVisible()){
                        return;
                    }

                    this.grid.refresh();
                    /*
                    this.grid.set("collection", this.store, {
                        show: true
                    });
                    */
                },
                /**
                 * @returns {xide.widgets.FlagsWidget}
                 */
                createLevelWidget: function () {

                    var thiz = this;
                    var flags = [
                        {
                            value: 'info',
                            label: 'Info'
                        },
                        {
                            value: 'warning',
                            label: 'Warning'
                        },
                        {
                            value: 'error',
                            label: 'Error'
                        }
                    ];
                    var flagsWidget = utils.addWidget(FlagsWidget, {
                        value: 8,
                        data: flags,
                        lineBreak: false,
                        title: '',
                        single: false,
                        flagClass: 'flagItem',
                        style: 'display:inline-block;width:auto;',
                        _onFlagChange: function () {
                            return thiz.onLevelChanged();
                        },
                        isChecked: function (val, itemVal) {
                            return true;
                        },
                        setValue: function (value) {
                            thiz.flags = value;
                        },
                        getValue: function () {
                            return 8;
                        }
                    }, thiz, dojo.doc.createElement('div'), true, 'ui-widget-content');
                    flagsWidget.startup();
                    this.flagWidget = flagsWidget;
                    return flagsWidget;
                },
                /**
                 * @returns {xide.widgets.FlagsWidget}
                 */
                createFilterWidget: function () {

                },
                /**
                 * MainView callback when any log item has been selected
                 * @returns {Array}
                 */
                getItemActions: function () {


                    var thiz = this.delegate;
                    var self = this;
                    var actions = [];

                    actions.push (Action.create('Clear', 'el-icon-remove-sign', 'View/Clear', false, null, types.ITEM_TYPE.LOG, 'logAction', null,true,
                        function () {
                            thiz.clear(self);
                        },null).setVisibility(types.ACTION_VISIBILITY.ACTION_TOOLBAR,{label:''}));

                    actions.push (Action.create('Clear', 'el-icon-refresh', 'View/Reload', false, null, types.ITEM_TYPE.LOG, 'logAction', null,true,
                        function () {
                            thiz.reload(self);
                        },null).setVisibility(types.ACTION_VISIBILITY.ACTION_TOOLBAR,{label:''}));

                    return actions;

                    var flagsWidget = this.createLevelWidget();
                    actions.push(flagsWidget);
                    return actions;
                }

            });

        return logview;
    });
