/** @module xlog/views/LogGrid **/
define([
    'xdojo/declare',
    'xide/types',
    'xgrid/ListRenderer',
    'xgrid/Grid',
    'xgrid/Defaults',
    'xgrid/Focus',
    'xgrid/KeyboardNavigation',
    'xgrid/Search',
    'xgrid/Layout',
    'dgrid/OnDemandGrid',
    'xide/mixins/EventedMixin',
    'xide/utils',
    'xaction/DefaultActions',
    "xide/widgets/_Widget",
    'xlang/i18'
], function (declare, types, ListRenderer, Grid, Defaults, Focus, KeyboardNavigation, Search, Layout, OnDemandGrid, EventedMixin, utils, DefaultActions, _Widget, i18) {

    /**
     * @class module:xgrid/views/LogGrid
     */
    var GridClass = Grid.createGridClass('xlog.views.LogGrid',
        {
            options: utils.clone(types.DEFAULT_GRID_OPTIONS)
        },
        //features
        {

            SELECTION: true,
            KEYBOARD_SELECTION: true,
            PAGINATION: types.GRID_FEATURES.PAGINATION,
            ACTIONS: types.GRID_FEATURES.ACTIONS,
            CONTEXT_MENU: types.GRID_FEATURES.CONTEXT_MENU,
            TOOLBAR: types.GRID_FEATURES.TOOLBAR,
            FILTER: {
                CLASS: KeyboardNavigation
            },
            SEARCH: {
                CLASS: Search
            },
            WIDGET: {
                CLASS: _Widget
            }
        },
        {
            //base flip
            RENDERER: ListRenderer
        },
        {
            //args
        },
        {
            GRID: OnDemandGrid,
            EDITOR: null,
            LAYOUT: Layout,
            DEFAULTS: Defaults,
            RENDERER: ListRenderer,
            EVENTED: EventedMixin,
            FOCUS: Focus
        }
    );

    var ACTION = types.ACTION;
    return declare("xlog.views.LogView", GridClass, {
        rowsPerPage: 30,
        minRowsPerPage: 100,
        /**
         * Stubs
         */
        delegate: {
            getStore: function () {
            },
            removeStore: function () {
            }
        },
        _columns: {
            "Level": true,
            "Type": false,
            "Message": true,
            "Time": false
        },
        permissions: [
            //ACTION.EDIT,
            ACTION.RELOAD,
            ACTION.DELETE,
            ACTION.LAYOUT,
            ACTION.COLUMNS,
            ACTION.SELECTION,
            ACTION.SAVE,
            ACTION.SEARCH,
            ACTION.TOOLBAR
        ],
        runAction: function (action) {
            var thiz = this;
            if (action.command === 'File/Reload') {
                this.delegate.removeStore(this.storeId);
                this.delegate.getStore(this.storeId).then(function (_store) {
                    thiz.collection = _store;
                    thiz.set('collection', thiz.collection.filter(thiz.getRootFilter()).sort(thiz.getDefaultSort()));
                });

            }
            if (action.command === 'File/Delete') {
                this.delegate.empty(this.storeId);
                this.set('collection', this.collection.filter(this.getRootFilter()).sort(this.getDefaultSort()));
            }
            return this.inherited(arguments);
        },
        getRootFilter: function () {
            return {
                show: true
            };
        },
        postMixInProperties: function () {
            this.columns = this.getColumns();
            return this.inherited(arguments);
        },
        getDefaultSort: function () {
            return [{property: 'time', descending: true}];
        },
        getMessageFormatter: function (message, item) {
            var thiz = this;
            if (item.progressHandler && !item._subscribedToProgress) {
                item.progressHandler._on('progress', function () {
                    thiz.refresh();
                });
                item._subscribedToProgress = true;
            }
            var _isTerminated = item.terminatorMessage !== null && item._isTerminated === true;
            if (!item.terminatorMessage) {
                _isTerminated = true;
            }

            if (!_isTerminated) {
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
                            case 'info': {
                                return '<span class="text-info" style=\"">' + level + '</span>';
                            }
                            case 'error': {
                                return '<span class="text-danger" style=\"">' + level + '</span>';
                            }
                            case 'warn': {
                                return '<span class="text-warning" style=\"">' + level + '</span>';
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
                        return thiz.getMessageFormatter(message, item);
                    }
                },
                Time: {
                    field: "timeStr", // get whole item for use by formatter
                    label: "Time",
                    sortable: true,
                    get: function (object) {
                        //console.log('get',arguments);
                        return object.time;
                    },
                    formatter: function (time, object) {
                        if (!object.timeStr) {
                            if (time === '') {
                                return time;
                            }
                            var dateFormat = i18.translations.dateFormat;
                            if (dateFormat) {
                                var res = i18.formatDate(time);
                                object.timeStr = res.replace('ms', '');
                            }
                        }
                        return object.timeStr;
                    }
                }
            };
            if (!this.showSource) {
                delete columns['Host'];
            }
            return columns;
        },
        set: function (what, value) {
            var thiz = this;
            if (what == 'collection') {
                thiz.addHandle('added', value._on('added', function () {
                    thiz.refresh();
                }));
            }
            return this.inherited(arguments);
        },
        _onMessage: function (evt) {
            if (!this._showing) {
                this._dirty = true;
            } else {
                if (this.isMyLog && this.isMyLog(evt) === false) {
                    return;
                }
                this.refresh();
            }
        },
        onShow: function () {
            if (this._dirty) {
                this.refresh();
                this._dirty = false;
            }
            return this.inherited(arguments);
        },
        startup: function () {
            var permissions = this.permissions;
            this.addActions(DefaultActions.getDefaultActions(permissions, this));
            this.inherited(arguments);
            this.subscribe(types.EVENTS.ON_SERVER_LOG_MESSAGE, this._onMessage);
            this.resize();
        }
    });
});