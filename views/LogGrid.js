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
    'dgrid/OnDemandGrid',
    'xide/mixins/EventedMixin',
    'xide/utils'

], function (declare,types,
             ListRenderer, Grid, Defaults, Focus,KeyboardNavigation,Search,
             OnDemandGrid, EventedMixin,utils) {


    /**
     * @class module:xgrid/views/LogGrid
     */
    var GridClass = Grid.createGridClass('log',
        {
            options: utils.clone(types.DEFAULT_GRID_OPTIONS)
        },
        //features
        {

            SELECTION: true,
            KEYBOARD_SELECTION: true,
            PAGINATION: types.GRID_FEATURES.PAGINATION,
            ACTIONS: types.GRID_FEATURES.ACTIONS,
            //CONTEXT_MENU: types.GRID_FEATURES.CONTEXT_MENU,
            TOOLBAR: types.GRID_FEATURES.TOOLBAR,
            FILTER:{
                CLASS:KeyboardNavigation
            },
            SEARCH:{
                CLASS:Search
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
            LAYOUT: null,
            DEFAULTS: Defaults,
            RENDERER: ListRenderer,
            EVENTED: EventedMixin,
            FOCUS: Focus
        }
    );

    return declare("xlog.views.LogView", GridClass, {

        postMixInProperties: function () {
            this.columns = this.getColumns();
            return this.inherited(arguments);
        },
        formatDateSimple: function (data, format) {

            var momentUnix = moment.unix(data);
            return momentUnix.format("MMMM Do, h:mm:ss a");
        },
        getDefaultSort:function(){
            return [{property: 'time', descending: true}];
        },
        getMessageFormatter: function (message, item) {
            var thiz = this;
            if(item.progressHandler && !item._subscribedToProgress){
                item.progressHandler._on('progress',function(_message){
                    thiz.refresh();
                });
                item._subscribedToProgress = true;
            }

            var _isTerminated = item.terminatorMessage !==null && item._isTerminated===true;
            if(!item.terminatorMessage){
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
                            case 'info':
                            {
                                return '<span class="text-info" style=\"">' + level + '</span>';
                            }
                            case 'error':
                            {
                                return '<span class="text-danger" style=\"">' + level + '</span>';
                            }
                            case 'warning':
                            {
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
                        return thiz.getMessageFormatter(message, item)
                    }
                },
                Time: {
                    field: "time", // get whole item for use by formatter
                    label: "Time",
                    sortable: true,
                    formatter: function (time) {
                        return thiz.formatDateSimple(time / 1000);
                    }
                }/*,
                 Details:{
                 field: "details", // get whole item for use by formatter
                 label: "Details",
                 sortable: false,
                 editor:RowDetailEditor
                 }*/
            };


            if (!this.showSource) {
                delete columns['Host'];
            }
            return columns;
        }
    });
});