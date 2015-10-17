/** @module xgrid/Base **/
define([
    "xdojo/declare",
    'dojo/dom-class',
    'dojo/dom-attr',
    "dojo/on",
    "dojo/_base/lang",
    "dojo/keys", // keys.END keys.HOME, keys.LEFT_ARROW etc.
    "dijit/_FocusMixin",
    "dijit/Destroyable",
    "dojo/debounce",
    'dojo/dom-construct',
    'xide/types',
    'xide/utils',
    'xgrid/ListRenderer',
    'xgrid/TreeRenderer',
    'xgrid/ThumbRenderer',
    'xide/views/_ActionMixin',
    'xgrid/Grid',
    'xgrid/MultiRenderer',
    'dijit/form/RadioButton',
    'xide/widgets/Ribbon',
    'xide/editor/Registry',
    'xide/action/DefaultActions',
    'xide/bean/Action',
    "xblox/widgets/BlockGridRowEditor",
    'dgrid/Editor',
    'xgrid/Defaults',
    'xgrid/Layout',
    'xgrid/Focus',
    'dgrid/OnDemandGrid',
    'xide/mixins/EventedMixin',
    'xide/factory',
    'dijit/Menu',
    'xgrid/data/Reference',
    'dijit/form/DropDownButton',
    'dijit/MenuItem',
    'xdocker/Docker',
    "xide/views/CIViewMixin",
    'xide/layout/TabContainer',
    "dojo/has!host-browser?xblox/views/BlockEditDialog",
    'xblox/views/BlockGrid',
    'xgrid/DnD',
    'xblox/views/BlocksGridDndSource',
    'xblox/widgets/DojoDndMixin',
    'dijit/registry',
    'dojo/topic',

    'xide/views/CIGroupedSettingsView',
    'xide/widgets/WidgetBase',

    'xide/views/_LayoutMixin',

    'xcf/model/Command',
    'xcf/model/Variable',

    'xide/widgets/ToggleButton',
    'xide/widgets/_ActionValueWidgetMixin',

    'xide/layout/AccordionContainer',
    "dojo/store/Memory",

    "xide/widgets/TemplatedWidgetBase",


    "dijit/form/TextBox",
    "dijit/form/CheckBox",
    'dijit/form/ValidationTextBox',
    'xcf/widgets/CommandSettings',

    'xblox/model/variables/VariableAssignmentBlock',
    'dojo/promise/all',
    "dojo/Deferred",
    "xgrid/KeyboardNavigation",
    "xide/Keyboard",
    "xgrid/Search"

], function (declare, domClass,domAttr,on,lang,keys,_FocusMixin,Destroyable,debounce,domConstruct,types,
             utils, ListRenderer, TreeRenderer, ThumbRenderer,
             _ActionMixin,
             Grid, MultiRenderer, RadioButton, Ribbon, Registry, DefaultActions, Action,BlockGridRowEditor,
             Editor,Defaults, Layout, Focus,
             OnDemandGrid, EventedMixin, factory,Menu,Reference,DropDownButton,
             MenuItem,Docker,CIViewMixin,TabContainer,

             BlockEditDialog,
             BlockGrid,
             Dnd,BlocksGridDndSource,DojoDndMixin,registry,topic,
             CIGroupedSettingsView,
             WidgetBase,_LayoutMixin,Command,Variable,
             ToggleButton,_ActionValueWidgetMixin,AccordionContainer,Memory,
             TemplatedWidgetBase,

             TextBox, CheckBox, ValidationTextBox,
             CommandSettings,
             VariableAssignmentBlock,
             all,Deferred,KeyboardNavigation,
             Keyboard,Search


) {




    var actions = [],
        thiz = this,
        ACTION_TYPE = types.ACTION,
        ACTION_ICON = types.ACTION_ICON,
        grid,
        ribbon,
        CIS,
        widget,
        basicGridInstance;

    function completeGrid(_grid) {

        _grid._on(types.EVENTS.ON_BUILD_BLOCK_INFO_LIST_END, function (evt) {

            var items = evt.items;

            var variables = this.blockScope.getVariables();
            var variableItems = [
                /*{
                 name: 'None',
                 //target: item,
                 iconClass: 'el-icon-compass',
                 proto: VariableAssignmentBlock,
                 item: null,
                 ctrArgs: {
                 variable: null,
                 scope: this.blockScope,
                 value: ''
                 }
                 }*/
            ];

            //console.log('on insert block end',variables);


            _.each(variables,function(variable){
                variableItems.push({
                    name: variable.name,
                    //target: item,
                    iconClass: 'el-icon-compass',
                    proto: VariableAssignmentBlock,
                    item: variable,
                    ctrArgs: {
                        variable: variable.name,
                        scope: this.blockScope,
                        value: ''
                    }
                });
            },this);

            items.push({
                name: 'Set Variable',
                iconClass: 'el-icon-pencil-alt',
                items: variableItems
            });









        });

        _grid._on('onAddActions', function (evt) {

            if(!evt.addAction){
                return;
            }
            var addAction = evt.addAction,
                cmdAction = 'New/Command',
                varAction = 'New/Variable',
                permissions = evt.permissions,
                VISIBILITY = types.ACTION_VISIBILITY,
                thiz = this;

            /*
             addAction('Save', 'File/Save', 'fa-save', ['ctrl s'], 'Home', 'File', 'item|view', null, null,
             {
             addPermission: true,
             onCreate: function (action) {}
             },

             null, null);
             */



            addAction('Command', cmdAction, 'el-icon-plus-sign', ['ctrl n'], 'Home', 'Insert', 'item|view', null, null,
                {
                    addPermission: true,
                    onCreate: function (action) {}
                },

                null, null);

            addAction('Variable', varAction, 'fa-code', ['ctrl n'], 'Home', 'Insert', 'item|view', null, null,
                {
                    addPermission: true,
                    onCreate: function (action) {}
                },

                null, null);


            addAction('Properties', 'Step/Properties', 'fa-gears', ['alt enter'], 'Home', 'Step', 'item|view', null, null,
                {
                    addPermission: true,
                    onCreate: function (action) {
                        action.setVisibility(types.ACTION_VISIBILITY.RIBBON, {
                            widgetClass: declare.classFactory('_Checked', [ToggleButton, _ActionValueWidgetMixin], null, {}, null),
                            widgetArgs: {
                                icon1: 'fa-toggle-on',
                                icon2: 'fa-toggle-off',
                                delegate: thiz,
                                checked: false,
                                iconClass: 'fa-toggle-off'
                            }
                        });
                    }
                }, null, function () {
                    return thiz.getSelection().length == 0;
                });



            var settingsWidget = declare('commandSettings', TemplatedWidgetBase,{
                templateString:'<div></div>',
                _getText: function (url) {
                    var result;
                    var def = dojo.xhrGet({
                        url: url,
                        sync: true,
                        handleAs: 'text',
                        load: function (text) {
                            result = text;
                        }
                    });
                    return '' + result + '';
                },
                startup:function(){

                    this.inherited(arguments);

                    if(!_grid.userData){
                        return;
                    }

                    var settings = utils.getJson(_grid.userData['params']) || {
                            constants: {
                                start: '',
                                end: ''
                            },
                            send: {
                                mode: false,
                                interval: 500,
                                timeout: 500,
                                onReply: ''
                            }
                        };




                    var settingsPane = utils.templatify(
                        null,
                        this._getText(require.toUrl('xcf/widgets/templates/commandSettings.html')),
                        this.domNode,
                        {
                            baseClass: 'settings',
                            style:'width:100%',
                            start: settings.constants.start,
                            end: settings.constants.end,
                            interval: settings.send.interval,
                            timeout: settings.send.timeout,
                            sendMode: settings.send.mode,
                            onReply: settings.send.onReply,
                            settings: settings
                        }, null
                    );

                    return;

                    if (settings.send.mode) {
                        settingsPane.rReply.set('checked', true);
                    } else {
                        settingsPane.rInterval.set('checked', true);
                    }

                    var _onSettingsChanged = function () {
                        //update params field of our ci
                        thiz.userData['params'] = JSON.stringify(settingsPane.settings);
                        //thiz.save();
                        console.log('changd');
                    };



                    //wire events
                    dojo.connect(settingsPane.wStart, "onChange", function (item) {
                        settingsPane.settings.constants.start = item;
                        _onSettingsChanged();
                    });
                    dojo.connect(settingsPane.wEnd, "onChange", function (item) {
                        settingsPane.settings.constants.end = item;
                        _onSettingsChanged();
                    });

                    dojo.connect(settingsPane.wInterval, "onChange", function (item) {
                        settingsPane.settings.send.interval = item;
                        _onSettingsChanged();
                    });
                    dojo.connect(settingsPane.wTimeout, "onChange", function (item) {
                        settingsPane.settings.send.timeout = item;
                        _onSettingsChanged();
                    });

                    dojo.connect(settingsPane.wOnReply, "onChange", function (item) {
                        settingsPane.settings.send.onReply = item;
                        _onSettingsChanged();
                    });

                    dojo.connect(settingsPane.rReply, "onChange", function (item) {
                        settingsPane.settings.send.mode = item;
                        _onSettingsChanged();
                    });
                }
            });


            addAction('Settings', 'File/Settings', 'fa-gears', null, 'Settings', 'Settings', 'item|view', null, null,
                {
                    addPermission: true,
                    onCreate: function (action) {

                        action.setVisibility(types.ACTION_VISIBILITY.MAIN_MENU, null);

                        action.setVisibility(types.ACTION_VISIBILITY.CONTEXT_MENU, null);

                        action.setVisibility(types.ACTION_VISIBILITY.ACTION_TOOLBAR, null);

                        action.setVisibility(types.ACTION_VISIBILITY.RIBBON,{
                            widgetClass:settingsWidget
                        });
                    }
                }, null, function () {
                    return thiz.getSelection().length == 0;
                });



        });

        _grid._on('selectionChanged', function (evt) {
            //console.log('selection ',evt);
            //since we can only add blocks to command and not
            //at root level, disable the 'Block/Insert' root action and
            //its widget //references
            var thiz = this,
                selection = evt.selection,
                item = selection[0],
                blockInsert = thiz.getAction('Block/Insert'),
                blockEnable = thiz.getAction('Step/Enable');

            disable = function (disable) {
                blockInsert.set('disabled', disable);
                setTimeout(function () {
                    blockInsert.getReferences().forEach(function (ref) {
                        ref.set('disabled', disable);
                    });
                }, 100);

            }

            var _disable =item ? false : true;

            disable(_disable);


            if (item) {
                blockEnable.getReferences().forEach(function (ref) {
                    ref.set('checked', item.enabled);
                });
            }else{
                /*
                 var props = _grid.getPropertyStruct();
                 props._lastItem = null;
                 _grid.setPropertyStruct(props);*/
            }
        });

        _grid.startup();

    }


    var propertyStruct = {
        currentCIView:null,
        targetTop:null,
        _lastItem:null
    };

    function createKeyNav(){
        return declare('xide/grid/_GridKeyNavMixin',Destroyable, {
            // summary:
            //		A mixin to allow arrow key and letter key navigation of child or descendant widgets.
            //		It can be used by dijit/_Container based widgets with a flat list of children,
            //		or more complex widgets like dijit/Tree.
            //
            //		To use this mixin, the subclass must:
            //
            //			- Implement  _getNext(), _getFirst(), _getLast(), _onLeftArrow(), _onRightArrow()
            //			  _onDownArrow(), _onUpArrow() methods to handle home/end/left/right/up/down keystrokes.
            //			  Next and previous in this context refer to a linear ordering of the descendants used
            //			  by letter key search.
            //			- Set all descendants' initial tabIndex to "-1"; both initial descendants and any
            //			  descendants added later, by for example addChild()
            //			- Define childSelector to a function or string that identifies focusable descendant widgets
            //
            //		Also, child widgets must implement a focus() method.

            /*=====
             // focusedChild: [protected readonly] Widget
             //		The currently focused child widget, or null if there isn't one
             focusedChild: null,

             // _keyNavCodes: Object
             //		Hash mapping key code (arrow keys and home/end key) to functions to handle those keys.
             //		Usually not used directly, as subclasses can instead override _onLeftArrow() etc.
             _keyNavCodes: {},
             =====*/

            // tabIndex: String
            //		Tab index of the container; same as HTML tabIndex attribute.
            //		Note then when user tabs into the container, focus is immediately
            //		moved to the first item in the container.
            tabIndex: "0",

            // childSelector: [protected abstract] Function||String
            //		Selector (passed to on.selector()) used to identify what to treat as a child widget.   Used to monitor
            //		focus events and set this.focusedChild.   Must be set by implementing class.   If this is a string
            //		(ex: "> *") then the implementing class must require dojo/query.
            childSelector: ".dgrid-row",





            defer: function(fcn, delay){
                // summary:
                //		Wrapper to setTimeout to avoid deferred functions executing
                //		after the originating widget has been destroyed.
                //		Returns an object handle with a remove method (that returns null) (replaces clearTimeout).
                // fcn: function reference
                // delay: Optional number (defaults to 0)
                // tags:
                //		protected.
                var timer = setTimeout(lang.hitch(this,
                        function(){
                            timer = null;
                            if(!this._destroyed){
                                lang.hitch(this, fcn)();
                            }
                        }),
                    delay || 0
                );
                return {
                    remove:	function(){
                        if(timer){
                            clearTimeout(timer);
                            timer = null;
                        }
                        return null; // so this works well: handle = handle.remove();
                    }
                };


            },
            buildRendering:function(){

                this.inherited(arguments);

                // Set tabIndex on this.domNode.  Will be automatic after #7381 is fixed.
                //domAttr.set(this.domNode, "tabIndex", this.tabIndex);


                if(!this._keyNavCodes){
                    var keyCodes = this._keyNavCodes = {};
                    //keyCodes[keys.HOME] = lang.hitch(this, "focusFirstChild");
                    //keyCodes[keys.END] = lang.hitch(this, "focusLastChild");
                    //keyCodes[this.isLeftToRight() ? keys.LEFT_ARROW : keys.RIGHT_ARROW] = lang.hitch(this, "_onLeftArrow");
                    //keyCodes[this.isLeftToRight() ? keys.RIGHT_ARROW : keys.LEFT_ARROW] = lang.hitch(this, "_onRightArrow");
                    keyCodes[keys.UP_ARROW] = lang.hitch(this, "_onUpArrow");
                    keyCodes[keys.DOWN_ARROW] = lang.hitch(this, "_onDownArrow");
                }

                var self = this,
                    childSelector = typeof this.childSelector == "string" ? this.childSelector : lang.hitch(this, "childSelector"),
                    node = this.domNode;



                this.own(
                    on(node, "keypress", lang.hitch(this, "_onContainerKeypress")),
                    on(node, "keydown", lang.hitch(this, "_onContainerKeydown")),
                    //on(node, "focus", lang.hitch(this, "_onContainerFocus")),
                    on(node, on.selector(childSelector, "focusin"), function(evt){
                        //self._onChildFocus(registry.getEnclosingWidget(this), evt);
                    })
                );



            },
            postCreate: function(){
                this.inherited(arguments);
            },

            _onLeftArrow: function(){
                // summary:
                //		Called on left arrow key, or right arrow key if widget is in RTL mode.
                //		Should go back to the previous child in horizontal container widgets like Toolbar.
                // tags:
                //		extension
            },

            _onRightArrow: function(){
                // summary:
                //		Called on right arrow key, or left arrow key if widget is in RTL mode.
                //		Should go to the next child in horizontal container widgets like Toolbar.
                // tags:
                //		extension
            },

            _onUpArrow: function(){
                // summary:
                //		Called on up arrow key. Should go to the previous child in vertical container widgets like Menu.
                // tags:
                //		extension
            },

            _onDownArrow: function(){
                // summary:
                //		Called on down arrow key. Should go to the next child in vertical container widgets like Menu.
                // tags:
                //		extension
            },

            __focus: function(){
                // summary:
                //		Default focus() implementation: focus the first child.
                this.focusFirstChild();
            },

            _getFirstFocusableChild: function(){
                // summary:
                //		Returns first child that can be focused.

                // Leverage _getNextFocusableChild() to skip disabled children
                return this._getNextFocusableChild(null, 1);	// dijit/_WidgetBase
            },

            _getLastFocusableChild: function(){
                // summary:
                //		Returns last child that can be focused.

                // Leverage _getNextFocusableChild() to skip disabled children
                return this._getNextFocusableChild(null, -1);	// dijit/_WidgetBase
            },

            focusFirstChild: function(){
                // summary:
                //		Focus the first focusable child in the container.
                // tags:
                //		protected

                this.focusChild(this._getFirstFocusableChild());
            },

            focusLastChild: function(){
                // summary:
                //		Focus the last focusable child in the container.
                // tags:
                //		protected

                this.focusChild(this._getLastFocusableChild());
            },

            _searchString: "",
            // multiCharSearchDuration: Number
            //		If multiple characters are typed where each keystroke happens within
            //		multiCharSearchDuration of the previous keystroke,
            //		search for nodes matching all the keystrokes.
            //
            //		For example, typing "ab" will search for entries starting with
            //		"ab" unless the delay between "a" and "b" is greater than multiCharSearchDuration.
            multiCharSearchDuration: 1000,

            onKeyboardSearch: function(/*dijit/_WidgetBase*/ item, /*Event*/ evt, /*String*/ searchString, /*Number*/ numMatches){
                // summary:
                //		When a key is pressed that matches a child item,
                //		this method is called so that a widget can take appropriate action is necessary.
                // tags:
                //		protected
                if(item){
                    //this.focusChild(item);
                    this.deselectAll();
                    this.select([this.row(item).data],null,true,{
                        focus:true,
                        delay:10,
                        append:true
                    })
                }

            },

            _keyboardSearchCompare: function(/*dijit/_WidgetBase*/ item, /*String*/ searchString){
                // summary:
                //		Compares the searchString to the widget's text label, returning:
                //
                //			* -1: a high priority match  and stop searching
                //		 	* 0: not a match
                //		 	* 1: a match but keep looking for a higher priority match
                // tags:
                //		private


                var element = item;
                if(item && !item.data){
                    var row= this.row(item);
                    if(row){
                        item['data']=row.data;
                    }
                }






                //var text = item.label || (element.focusNode ? element.focusNode.label : '') || element.innerText || element.textContent || "";
                var text = item ? item.data ? item.data.message : '' : '';
                if(text) {
                    text = text.toLowerCase();
                    //try starts with first:
                    var currentString = text.replace(/^\s+/, '').substr(0, searchString.length).toLowerCase();
                    var res = (!!searchString.length && currentString == searchString) ? -1 : 0; // stop searching after first match by default

                    var contains = text.replace(/^\s+/, '').indexOf(searchString.toLowerCase())!=-1;
                    if(res==0 && searchString.length>1 && contains){
                        return 1;
                    }

                    return res;
                }
            },

            _onContainerKeydown: function(evt){
                // summary:
                //		When a key is pressed, if it's an arrow key etc. then it's handled here.
                // tags:
                //		private

                var func = this._keyNavCodes[evt.keyCode];
                if(func){
                    func(evt, this.focusedChild);
                    evt.stopPropagation();
                    evt.preventDefault();
                    this._searchString = ''; // so a DOWN_ARROW b doesn't search for ab
                }else if(evt.keyCode == keys.SPACE && this._searchTimer && !(evt.ctrlKey || evt.altKey || evt.metaKey)){
                    evt.stopImmediatePropagation(); // stop _HasDropDown from processing the SPACE as well
                    evt.preventDefault(); // stop default actions like page scrolling on SPACE, but also keypress unfortunately
                    on.emit(this.domNode, "keypress", {
                        charCode: keys.SPACE,
                        cancelable: true,
                        bubbles: true
                    });
                }
            },

            _onContainerKeypress: function(evt){

                if(this.editing){
                    return;
                }
                // summary:
                //		When a printable key is pressed, it's handled here, searching by letter.
                // tags:
                //		private

                if(evt.charCode < 32){
                    // Avoid duplicate events on firefox (this is an arrow key that will be handled by keydown handler)
                    return;
                }

                if(evt.ctrlKey || evt.altKey){
                    return;
                }

                var
                    matchedItem = null,
                    searchString,
                    numMatches = 0,
                    search = lang.hitch(this, function(){
                        if(this._searchTimer){
                            this._searchTimer.remove();
                        }
                        this._searchString += keyChar;
                        var allSameLetter = /^(.)\1*$/.test(this._searchString);
                        var searchLen = allSameLetter ? 1 : this._searchString.length;
                        searchString = this._searchString.substr(0, searchLen);
                        // commented out code block to search again if the multichar search fails after a smaller timeout
                        //this._searchTimer = this.defer(function(){ // this is the "failure" timeout
                        //	this._typingSlowly = true; // if the search fails, then treat as a full timeout
                        //	this._searchTimer = this.defer(function(){ // this is the "success" timeout
                        //		this._searchTimer = null;
                        //		this._searchString = '';
                        //	}, this.multiCharSearchDuration >> 1);
                        //}, this.multiCharSearchDuration >> 1);
                        this._searchTimer = this.defer(function(){ // this is the "success" timeout
                            this._searchTimer = null;
                            this._searchString = '';

                        }, this.multiCharSearchDuration);
                        var currentItem = this.focusedChildNode ||this.focusedChild || null;
                        if(searchLen == 1 || !currentItem){
                            currentItem = this._getNextFocusableChild(currentItem, 1); // skip current
                            if(!currentItem){
                                return;
                            } // no items
                        }
                        var stop = currentItem;
                        var idx=0;
                        do{

                            /*idx+=1;
                             if(idx>100){
                             console.error('couldnt locate next');
                             break;
                             }*/
                            //console.error('do key board search ');
                            var rc = this._keyboardSearchCompare(currentItem, searchString);

                            if(!!rc && numMatches++ == 0){
                                matchedItem = currentItem;
                            }
                            if(rc == -1){ // priority match
                                //matchedItem = currentItem;
                                numMatches = -1;
                                break;
                            }
                            currentItem = this._getNextFocusableChild(currentItem, 1);
                        }while(currentItem != stop);
                        // commented out code block to search again if the multichar search fails after a smaller timeout
                        //if(!numMatches && (this._typingSlowly || searchLen == 1)){
                        //	this._searchString = '';
                        //	if(searchLen > 1){
                        //		// if no matches and they're typing slowly, then go back to first letter searching
                        //		search();
                        //	}
                        //}
                    }),
                    keyChar = String.fromCharCode(evt.charCode).toLowerCase();


                evt.preventDefault();
                evt.stopPropagation();
                search();

                // commented out code block to search again if the multichar search fails after a smaller timeout
                //this._typingSlowly = false;
                this.onKeyboardSearch(matchedItem, evt, searchString, numMatches);
            },

            _getNextFocusableChild: function(child, dir){
                //console.error('_getNextFocusableChild');
                // summary:
                //		Returns the next or previous focusable descendant, compared to "child".
                //		Implements and extends _KeyNavMixin._getNextFocusableChild() for a _Container.
                // child: Widget
                //		The current widget
                // dir: Integer
                //		- 1 = after
                //		- -1 = before
                // tags:
                //		abstract extension

                var wrappedValue = child;
                do{

                    if(!child){
                        child = this[dir > 0 ? "_getFirst" : "_getLast"]();
                        if(!child){
                            break;
                        }
                    }else{
                        if(child && child.node){
                            var innerNode = utils.find('.dgrid-cell',child.node,true);
                            if(innerNode){
                                child=innerNode;
                            }
                        }
                        child = this._getNext(child, dir);
                    }
                    if(child != null && child != wrappedValue){
                        return child;	// dijit/_WidgetBase
                    }
                }while(child != wrappedValue);
                // no focusable child found
                return null;	// dijit/_WidgetBase
            },

            _getFirst: function(){
                var innerNode = utils.find('.dgrid-row', this.domNode,true);
                if(innerNode){
                    var innerNode0 = utils.find('.dgrid-cell', innerNode,true);
                    if(innerNode0){
                        return innerNode0;
                    }
                }
                return innerNode;	// dijit/_WidgetBase
            },

            _getLast: function(){

                var innerNode = utils.find('.dgrid-row', this.domNode,false);
                if(innerNode){

                    var innerNode0 = utils.find('.dgrid-cell', innerNode,true);
                    if(innerNode0){
                        return innerNode0;
                    }
                }

                return null;	// dijit/_WidgetBase

                // summary:
                //		Returns the last descendant.
                // tags:
                //		abstract extension

                return null;	// dijit/_WidgetBase
            },
            _getPrev: function(child, dir){
                // summary:
                //		Returns the next descendant, compared to "child".
                // child: Widget
                //		The current widget
                // dir: Integer
                //		- 1 = after
                //		- -1 = before
                // tags:
                //		abstract extension

                //console.error('_get next');
                if(child){
                    //child = child.domNode;
                    var w= this.up(child,1,true);
                    if(w){
                        var data = null;
                        if(w.data){
                            data= w.data;
                        }

                        if(w.element){
                            w= w.element;
                        }

                        var innerNode = utils.find('.dgrid-cell', w,true);
                        if(innerNode){
                            if(!innerNode.data){
                                innerNode['data']=data;
                            }
                            return innerNode;
                        }
                        return w;
                    }
                }
                return null;	// dijit/_WidgetBase
            },
            _getNext: function(child, dir){
                // summary:
                //		Returns the next descendant, compared to "child".
                // child: Widget
                //		The current widget
                // dir: Integer
                //		- 1 = after
                //		- -1 = before
                // tags:
                //		abstract extension

                //console.error('_get next');
                if(child){
                    //child = child.domNode;
                    var w= this.down(child,1,true);
                    if(w){
                        if(w.element){
                            w= w.element;
                        }
                        var innerNode = utils.find('.dgrid-cell', w,true);
                        if(innerNode){
                            return innerNode;
                        }
                        return w;
                    }
                }
                return null;	// dijit/_WidgetBase
            }
        });
    }

    function createLogGridClass(){



        var filterClass = declare('filter',null,{
            showFooter: true,
            buildRendering: function () {

                this.inherited(arguments);
                var grid = this;
                var filterNode = this.filterNode = domConstruct.create('div', {
                    className: 'dgrid-filter'
                }, this.footerNode);
                this.filterStatusNode = domConstruct.create('div', {
                    className: 'dgrid-filter-status'
                }, filterNode);
                var inputNode = this.filterInputNode = domConstruct.create('input', {
                    className: 'dgrid-filter-input',
                    placeholder: 'Filter (regex)...'
                }, filterNode);
                this._filterTextBoxHandle = on(inputNode, 'keydown', debounce(function () {
                    grid.set("collection", grid.collection);
                }, 250));
            },
            destroy: function () {
                this.inherited(arguments);
                if (this._filterTextBoxHandle) {
                    this._filterTextBoxHandle.remove();
                }
            },
            _setCollection: function (collection) {
                this.inherited(arguments);
                var value = this.filterInputNode.value;
                var renderedCollection = this._renderedCollection;
                if (renderedCollection && value) {
                    var rootFilter = new renderedCollection.Filter();
                    var re = new RegExp(value, "i");
                    var columns = this.columns;
                    var matchFilters = [];
                    for (var p in columns) {
                        if (columns.hasOwnProperty(p)) {
                            matchFilters.push(rootFilter.match(columns[p].field, re));
                        }
                    }
                    var combined = rootFilter.or.apply(rootFilter, matchFilters);
                    var filtered = renderedCollection.filter(combined);
                    this._renderedCollection = filtered;
                    this.refresh();
                }
            },
            refresh: function() {
                this.inherited(arguments);
                var value = this.filterInputNode.value;
                if (value) {
                    this.filterStatusNode.innerHTML = this.get('total') + " filtered results";
                }else {
                    this.filterStatusNode.innerHTML = "";
                }
            }


        });


        /**
         * Block grid base class.
         * @class module:xblox/views/Grid
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
                CONTEXT_MENU: types.GRID_FEATURES.CONTEXT_MENU,
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
                /*renderers: renderers,
                 selectedRenderer: TreeRenderer*/
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

        return GridClass;

    }

    function createGridClass(overrides) {

        /*
         FILTER:{
         CLASS:createKeyNav()
         }*/
        var gridClass = declare('driverGrid', BlockGrid,{
            highlightDelay:500,
            propertyStruct : propertyStruct,
            _updateLineMap:function(rows){

                this._lastIndex = 0;
                this._map = {};
                _.each(rows,function(block,i){
                    this._map[block.id]=rows.indexOf(block);
                },this);
            },
            renderQueryResults: function (results, beforeNode, options) {



                // summary:
                //		Renders objects from QueryResults as rows, before the given node.

                options = utils.mixin({ rows: this._rows }, options);
                var self = this;

                return results.then(function (resolvedResults) {

                    if(self.blockGroup ==='basic'){
                        //console.log('results ready',resolvedResults);
                        self._updateLineMap(resolvedResults);
                    }
                    var resolvedRows = self.renderArray(resolvedResults, beforeNode, options);



                    delete self._lastCollection; // used only for non-store List/Grid
                    return resolvedRows;
                });



                /*
                 if(this.blockGroup ==='basic'){
                 console.log('render query results',results);
                 }
                 var _ret = this.inherited(arguments);
                 return _ret;
                 */
            },
            formatOrder:function(value,block){


                if(this.blockGroup ==='basic'){
                    //console.log('format order ',this);
                }




                if(this._map) {
                    if (this._map[block.id]) {
                        return this._map[block.id];
                    }
                }else{
                    console.log('have no map');
                }

                return '0';

            },
            renderArray:function(){
                //console.log('render array ' + this.blockGroup,arguments);

                if(this.blockGroup ==='basic'){

                    //console.log('render _ array ');
                }
                return this.inherited(arguments);
            },
            renderRow:function(){

                var _res = this.inherited(arguments);
                if(this.blockGroup ==='basic'){
                    //   console.log('render row ' + this.blockGroup,this._lastRenderedArray);
                }
                return _res;
            },
            /**
             * Step/Run action
             * @param block {block[]}
             * @returns {boolean}
             */
            execute: function (blocks) {


                console.clear();

                var thiz = this;



                function _clear(element){
                    if(element) {
                        setTimeout(function () {
                            element.removeClass('failedBlock successBlock activeBlock');
                        }, thiz.highlightDelay);
                    }
                }

                function _node(block){
                    if(block) {
                        var row = thiz.row(block);
                        if (row) {
                            var element = row.element;
                            if (element) {
                                return $(element);
                            }
                        }
                    }
                    return null;
                };

                function mark(element,cssClass){

                    if(element) {
                        element.removeClass('failedBlock successBlock activeBlock');
                        element.addClass(cssClass);
                    }
                }

                var dfds = [],
                    EVENTS = types.EVENTS;

                var _runHandle = this._on(EVENTS.ON_RUN_BLOCK,function(evt){
                    mark(_node(evt),'activeBlock');

                });
                var _successHandle = this._on(EVENTS.ON_RUN_BLOCK_SUCCESS,function(evt){
                    //console.log('mark success');
                    mark(_node(evt),'successBlock');
                    _clear(_node(evt));
                });

                var _errHandle = this._on(EVENTS.ON_RUN_BLOCK_FAILED,function(evt){
                    mark(_node(evt),'failedBlock');
                    _clear(_node(evt));

                });




                function run(block) {

                    if (!block || !block.scope) {
                        console.error('have no scope');
                        return;
                    }
                    try {

                        var blockDfd = block.scope.solveBlock(block, {
                            highlight: true,
                            force: true,
                            listener:thiz
                        });

                        dfds.push(blockDfd);

                        /*
                         blockDfd.then(function(result){
                         console.log('did run! : ' + result);
                         });
                         */
                        //console.log('run block result:',result);


                    } catch (e)
                    {
                        console.error(' excecuting block -  ' + block.name + ' failed! : ' + e);
                        console.error(printStackTrace().join('\n\n'));
                    }
                    return true;
                }

                blocks  = _.isArray(blocks) ? blocks : [blocks];


                function _patch(block){


                    block.runFrom=function(_blocks, index, settings)
                    {

                        var thiz = this,
                            blocks = _blocks || this.items,
                            allDfds = [];

                        var onFinishBlock = function (block, results) {
                            block._lastResult = block._lastResult || results;
                            thiz._currentIndex++;
                            thiz.runFrom(blocks, thiz._currentIndex, settings);
                        };

                        var wireBlock = function (block) {
                            block._deferredObject.then(function (results) {
                                console.log('----def block finish');
                                onFinishBlock(block, results);
                            });
                        };

                        if (blocks.length) {

                            for (var n = index; n < blocks.length; n++) {



                                var block = blocks[n];

                                console.log('run child \n'+block.method);

                                _patch(block);

                                if (block.deferred === true) {
                                    block._deferredObject = new Deferred();
                                    this._currentIndex = n;
                                    wireBlock(block);
                                    //this.addToEnd(this._return, block.solve(this.scope, settings));
                                    var blockDfd = block.solve(this.scope, settings);
                                    allDfds.push(blockDfd);
                                    break;
                                } else {
                                    //this.addToEnd(this._return, block.solve(this.scope, settings));

                                    var blockDfd = block.solve(this.scope, settings);
                                    allDfds.push(blockDfd);
                                }

                            }

                        } else {
                            this.onSuccess(this, settings);
                        }

                        return allDfds;
                    };

                    block.solve=function(scope,settings,run,error){

                        this._currentIndex = 0;
                        this._return=[];

                        var _script = '' + this._get('method');
                        var thiz=this,
                            ctx = this.getContext(),
                            items = this[this._getContainer()],

                        //outer,head dfd
                            dfd = new Deferred,

                            listener = settings.listener,

                            isDfd = thiz.deferred;



                        if(listener) {
                            listener._emit(types.EVENTS.ON_RUN_BLOCK, thiz);
                        }

                        function _finish(result){

                            if(listener) {
                                listener._emit(types.EVENTS.ON_RUN_BLOCK_SUCCESS, thiz);
                            }

                            dfd.resolve(result);


                        }

                        function _error(result){
                            dfd.reject(result);
                            if(listener) {
                                listener._emit(types.EVENTS.ON_RUN_BLOCK_FAILED, thiz);
                            }
                        }


                        function _headDone(result){
                            //console.log('_headDone : ',result);
                            //more blocks?
                            if(items.length) {
                                var subDfds = thiz.runFrom(items,0,settings);
                                all(subDfds).then(function(what){
                                    console.log('all solved!',what);
                                    _finish(result);
                                },function(err){

                                    console.error('error in chain',err);
                                    if(listener) {
                                        listener._emit(types.EVENTS.ON_RUN_BLOCK_SUCCESS, thiz);
                                    }
                                    dfd.resolve(err);
                                });

                            }else{
                                if(listener) {
                                    listener._emit(types.EVENTS.ON_RUN_BLOCK_SUCCESS, thiz);
                                }
                                dfd.resolve(result);
                            }
                        }




                        if(_script && _script.length){
                            var runScript = function() {


                                var _function = new Function("{" + _script + "}");
                                var _args = thiz.getArgs() || [];
                                try {

                                    if(isDfd){

                                        ctx.resolve=function(result){
                                            console.log('def block done');
                                            if(thiz._deferredObject) {
                                                thiz._deferredObject.resolve();
                                            }
                                            _headDone(result);
                                        }
                                    }
                                    var _parsed = _function.apply(ctx, _args || {});
                                    thiz._lastResult = _parsed;
                                    if (run) {
                                        run('Expression ' + _script + ' evaluates to ' + _parsed);
                                    }

                                    if(!isDfd) {
                                        _headDone(_parsed);
                                    }

                                    if (_parsed !== 'false' && _parsed !== false) {

                                    } else {
                                        //thiz.onFailed(thiz, settings);
                                        //return [];
                                    }
                                } catch (e) {

                                    e=e ||{};

                                    _error(e);

                                    if (error) {
                                        error('invalid expression : \n' + _script + ': ' + e);
                                    }
                                    //thiz.onFailed(thiz, settings);
                                    //return [];
                                }
                            };

                            if(scope.global){
                                (function() {

                                    window = scope.global;


                                    var _args = thiz.getArgs() || [];
                                    try {
                                        var _parsed = null;
                                        if(!ctx.runExpression) {
                                            var _function = new Function("{" + _script + "}").bind(this);
                                            _parsed = _function.apply(ctx, _args || {});
                                        }else{
                                            _parsed = ctx.runExpression(_script,null,_args);
                                        }

                                        thiz._lastResult = _parsed;

                                        if (run) {
                                            run('Expression ' + _script + ' evaluates to ' + _parsed);
                                        }
                                        if (_parsed !== 'false' && _parsed !== false) {
                                            thiz.onSuccess(thiz, settings);
                                        } else {
                                            thiz.onFailed(thiz, settings);
                                            return [];
                                        }


                                    } catch (e) {

                                        thiz._lastResult = null;
                                        if (error) {
                                            error('invalid expression : \n' + _script + ': ' + e);
                                        }
                                        thiz.onFailed(thiz, settings);
                                        return [];
                                    }

                                }).call(scope.global);

                            }else{
                                runScript();
                            }

                        }else{
                            console.error('have no script');
                        }
                        /*
                         var ret=[], items = this[this._getContainer()];

                         if(items.length) {
                         this.runFrom(items,0,settings);
                         }else{
                         this.onSuccess(this, settings);
                         }

                         this.onDidRun();
                         */

                        return dfd;
                    }

                }

                _.each(blocks,_patch);

                _.each(blocks,run);

                all(dfds).then(function(){
                    console.log('did run all selected blocks!',thiz);
                    _runHandle.remove();
                    _successHandle.remove();
                    _errHandle.remove();
                });



            },
            onCIChanged: function (ci, block, oldValue, newValue, field) {

                console.log('on ci changed', arguments);
                block.set(field, newValue);
            },
            _itemChanged: function (type, item, store) {

                store = store || this.getStore(item);

                var thiz = this;

                function _refreshParent(item, silent) {

                    var parent = item.getParent();
                    if (parent) {
                        var args = {
                            target: parent
                        };
                        if (silent) {
                            this._muteSelectionEvents = true;
                        }
                        store.emit('update', args);
                        if (silent) {
                            this._muteSelectionEvents = false;
                        }
                    } else {
                        thiz.refresh();
                    }
                }

                function select(item) {

                    thiz.select(item, null, true, {
                        focus: true,
                        delay: 20,
                        append: false
                    });
                }

                switch (type) {

                    case 'added':
                    {
                        //_refreshParent(item);
                        //this.deselectAll();
                        this.refresh();
                        select(item);
                        break;
                    }

                    case 'changed':
                    {
                        this.refresh();
                        select(item);
                        break;
                    }


                    case 'moved':
                    {
                        //_refreshParent(item,true);
                        //this.refresh();
                        //select(item);

                        break;
                    }

                    case 'deleted':
                    {

                        var parent = item.getParent();
                        //var _prev = item.getPreviousBlock() || item.getNextBlock() || parent;
                        var _prev = item.next(null, -1) || item.next(null, 1) || parent;
                        if (parent) {
                            var _container = parent.getContainer();
                            if (_container) {
                                _.each(_container, function (child) {
                                    if (child.id == item.id) {
                                        _container.remove(child);
                                    }
                                });
                            }
                        }

                        this.refresh();
                        /*
                         if (_prev) {
                         select(_prev);
                         }
                         */
                        break;
                    }

                }



            },
            _onFocusChanged:function(focused,type){
                this.inherited(arguments);
                if(!focused){
                    this._lastSelection = [];
                }
            },
            showProperties: function (item,force) {


                var block = item || this.getSelection()[0],
                    thiz = this,
                    rightSplitPosition= thiz.getPanelSplitPosition(types.DOCKER.DOCK.RIGHT);




                if(!block || rightSplitPosition==1) {
                    //console.log(' show properties: abort',[block , rightSplitPosition]);
                    return;
                }
                var right = this.getRightPanel();
                var props = this.getPropertyStruct();

                if (item == props._lastItem && force!==true) {
                    console.log('show propertiess : same item');
                    //return;
                }

                this.clearPropertyPanel();
                props = this.getPropertyStruct();


                props._lastItem = item;

                var _title = item.name || item.title;



                var tabContainer = props.targetTop;

                if (!tabContainer) {

                    tabContainer = utils.addWidget(AccordionContainer, {
                        delegate: this,
                        tabStrip: true,
                        tabPosition: "top",
                        attachParent: true,
                        style: "width:100%;height:100%;overflow-x:hidden;",
                        allowSplit: false
                    }, null, right.containerNode, true);

                    props.targetTop = tabContainer;
                }

                if (tabContainer.selectedChildWidget) {
                    props.lastSelectedTopTabTitle = tabContainer.selectedChildWidget.title;
                } else {
                    props.lastSelectedTopTabTitle = 'General';
                }


                _.each(tabContainer.getChildren(), function (tab) {
                    tabContainer.removeChild(tab);
                });

                if (props.currentCIView) {
                    props.currentCIView.empty();
                }

                if (!block.getFields) {
                    console.log('have no fields', block);
                    return;
                }

                var cis = block.getFields();
                for (var i = 0; i < cis.length; i++) {
                    cis[i].vertical = true;
                }

                var ciView = new CIViewMixin({

                    initWithCIS: function (data) {

                        this.empty();

                        data = utils.flattenCIS(data);

                        this.data = data;

                        var thiz = this,
                            groups = _.groupBy(data,function(obj){
                                return obj.group;
                            }),
                            groupOrder = this.options.groupOrder || {};

                        groups = this.toArray(groups);

                        var grouped = _.sortByOrder(groups, function(obj){
                            return groupOrder[obj.name] || 100;
                        });

                        if (grouped != null && grouped.length > 1) {
                            this.renderGroups(grouped);
                        } else {
                            this.widgets = factory.createWidgetsFromArray(data, thiz, null, false);
                            if (this.widgets) {
                                this.attachWidgets(this.widgets);
                            }
                        }

                    },
                    tabContainer: props.targetTop,
                    delegate: this,
                    viewStyle: 'padding:0px;',
                    autoSelectLast: true,
                    item: block,
                    source: this.callee,
                    options: {
                        groupOrder: {
                            'General': 1,
                            'Advanced': 2,
                            'Script':3,
                            'Arguments':4,
                            'Description':5,
                            'Share':6

                        }
                    },
                    cis: cis
                });

                ciView.initWithCIS(cis);


                props.currentCIView = ciView;

                if (block.onFieldsRendered) {
                    block.onFieldsRendered(block, cis);
                }


                ciView._on('valueChanged', function (evt) {
                    //console.log('ci value changed ', evt);
                    thiz.onCIChanged(evt.ci,block,evt.oldValue,evt.newValue,evt.ci.dst);
                });






                var containers = props.targetTop.getChildren();
                var descriptionView = null;
                for (var i = 0; i < containers.length; i++) {

                    // @TODO : why is that not set?
                    containers[i].parentContainer = props.targetTop;

                    // track description container for re-rooting below
                    if (containers[i].title === 'Description') {
                        descriptionView = containers[i];
                    }

                    if (props.targetTop.selectedChildWidget.title !== props.lastSelectedTopTabTitle) {
                        if (containers[i].title === props.lastSelectedTopTabTitle) {
                            props.targetTop.selectChild(containers[i]);
                        }
                    }
                }

                props.targetTop.resize();

                this.setPropertyStruct(props);


                this._docker.resize();
            },
            save:function(){



                var thiz = this,
                    driver = thiz.userData.driver,
                    ctx = thiz.ctx,
                    fileManager = ctx.getFileManager(),
                    scope = thiz.blockScope,
                    instance = scope.instance,
                    originalScope = instance ? instance.blockScope : null,
                    path = driver.path.replace('.meta.json','.xblox'),
                    scopeToSave = originalScope || scope,
                    mount = driver.scope;

                if(originalScope){
                    originalScope.fromScope(scope);
                }

                if (scope) {

                    var all = {
                        blocks: null,
                        variables: null
                    };

                    var blocks = scopeToSave.blocksToJson();
                    try {
                        //test integrity
                        dojo.fromJson(JSON.stringify(blocks));
                    } catch (e) {
                        console.error('invalid data');
                        return;
                    }

                    var _onSaved = function () {};

                    all.blocks = blocks;

                    fileManager.setContent(mount,path,JSON.stringify(all, null, 2),_onSaved);

                    //this.saveContent(JSON.stringify(all, null, 2), this._item, _onSaved);
                }



            },
            runAction: function (action) {

                var thiz = this;
                var sel = this.getSelection();


                console.log('run aciton innner ' + action.command);

                function addItem(_class,group){

                    var cmd = factory.createBlock(_class, {
                        name: "No Title",
                        send: "nada",
                        scope: thiz.blockScope,
                        group: group
                    });

                    thiz.deselectAll();
                    _.each(thiz.grids,function(grid){
                        grid.refresh();
                    });
                    setTimeout(function () {
                        thiz.select([cmd],null,true,{
                            focus:true
                        });
                    }, 200);
                }


                if (action.command == 'New/Command') {
                    addItem(Command,'basic');
                }
                if (action.command == 'New/Variable') {
                    addItem(Variable,'basicVariables');
                }

                if (action.command == 'File/Save') {
                    this.save();
                }

                return this.inherited(arguments);
            },
            startup:function(){


                domClass.add(this.domNode,'blockGrid');


                this.inherited(arguments);
                var thiz = this;

                function _node(evt){
                    var item = evt.callee;
                    if(item) {
                        var row = thiz.row(item);
                        if (row) {
                            var element = row.element;
                            if (element) {
                                return $(element);
                            }
                        }
                    }
                    return null;
                };

                function mark(element,cssClass){

                    if(element) {
                        element.removeClass('failedBlock successBlock activeBlock');
                        element.addClass(cssClass);
                        setTimeout(function () {
                            element.removeClass(cssClass);
                            thiz._isHighLighting = false;
                        }, thiz.highlightDelay);
                    }
                }

            }
        });

        return gridClass;
    }

    function createLogEntry(){

        var logManager = ctx.getLogManager();
        var store = logManager.store;

        /*
         var message={
         message:'test',
         level:'info',
         type:'device',
         details:{},
         terminatorMessage:null
         };
         factory.publish(types.EVENTS.ON_SERVER_LOG_MESSAGE, message);*/

        //logManager.addLoggingMessage()
    }

    function createSearchMixin(){

        var searchClass = declare('xide/widgets/_Search',null,{
            searchBoxHTML:'<div class="widget form-group grid_search right ">\
                <button type="button" action="hide" class="grid_searchbtn_close"></button>\
                <div class="grid_search_form">\
                    <input class="form-control input-transparent grid_search_field" placeholder="Search for" spellcheck="false"></input>\
                    <button type="button input-group-addon" action="findNext" class="grid_searchbtn next"></button>\
                    <button type="button" action="findPrev" class="grid_searchbtn prev"></button>\
                    <button type="button" action="findAll" class="grid_searchbtn" title="Alt-Enter">All</button>\
                </div> \
                <div class="ace_replace_form">\
                    <input class="grid_search_field" placeholder="Replace with" spellcheck="false"/>\
                    <button type="button" action="replaceAndFindNext" class="ace_replacebtn">Replace</button>\
                    <button type="button" action="replaceAll" class="ace_replacebtn">All</button>\
                </div>\
                <div class="grid_search_options">\
                    <span action="toggleRegexpMode" class="ace_button" title="RegExp Search">.*</span>\
                    <span action="toggleCaseSensitive" class="ace_button" title="CaseSensitive Search">Aa</span>\
                    <span action="toggleWholeWords" class="ace_button" title="Whole Word Search">\\b</span>\
                </div>\
            </div>'.replace(/>\s+/g, ">"),
            showSearchBox:function(container){

                var div = domConstruct.create("div");
                div.innerHTML = this.searchBoxHTML;
                this.element = div.firstChild;

                container.appendChild(div);

                this.init();


            },
            highlight : function(re) {

                console.log('highlight');

                /*
                 this.editor.session.highlight(re || this.editor.$search.$options.re);
                 this.editor.renderer.updateBackMarkers()*/
            },
            find : function(skipCurrent, backwards) {

                var searchText = this.searchInput.value;

                //console.log('search for ',searchText);

                /*
                 var range = this.editor.find(this.searchInput.value, {
                 skipCurrent: skipCurrent,
                 backwards: backwards,
                 wrap: true,
                 regExp: this.regExpOption.checked,
                 caseSensitive: this.caseSensitiveOption.checked,
                 wholeWord: this.wholeWordOption.checked
                 });
                 var noMatch = !range && this.searchInput.value;
                 dom.setCssClass(this.searchBox, "ace_nomatch", noMatch);
                 this.editor._emit("findSearchBox", { match: !noMatch });
                 this.highlight();*/
            },
            findNext : function() {
                this.find(true, false);
            },
            findPrev : function() {
                this.find(true, true);
            },
            findAll : function(){
                /*
                 var range = this.editor.findAll(this.searchInput.value, {
                 regExp: this.regExpOption.checked,
                 caseSensitive: this.caseSensitiveOption.checked,
                 wholeWord: this.wholeWordOption.checked
                 });
                 var noMatch = !range && this.searchInput.value;
                 dom.setCssClass(this.searchBox, "ace_nomatch", noMatch);
                 this.editor._emit("findSearchBox", { match: !noMatch });
                 this.highlight();
                 this.hide();
                 */
            },
            replace : function() {
                /*
                 if (!this.editor.getReadOnly())
                 this.editor.replace(this.replaceInput.value);
                 */
            },
            replaceAndFindNext : function() {
                /*
                 if (!this.editor.getReadOnly()) {
                 this.editor.replace(this.replaceInput.value);
                 this.findNext()
                 }*/
            },
            replaceAll : function() {
                /*
                 if (!this.editor.getReadOnly())
                 this.editor.replaceAll(this.replaceInput.value);
                 */
            },
            hide : function() {
                this.element.style.display = "none";
                //this.editor.keyBinding.removeKeyboardHandler(this.$closeSearchBarKb);
                //this.editor.focus();
            },
            show : function(value, isReplace) {
                this.element.style.display = "";
                this.replaceBox.style.display = isReplace ? "" : "none";

                this.isReplace = isReplace;

                if (value)
                    this.searchInput.value = value;
                this.searchInput.focus();
                this.searchInput.select();

                //this.editor.keyBinding.addKeyboardHandler(this.$closeSearchBarKb);
            },

            isFocused : function() {
                var el = document.activeElement;
                return el == this.searchInput || el == this.replaceInput;
            },
            initElements : function(sb) {
                this.searchBox = sb.querySelector(".grid_search_form");
                this.replaceBox = sb.querySelector(".ace_replace_form");
                this.searchOptions = sb.querySelector(".grid_search_options");
                this.regExpOption = sb.querySelector("[action=toggleRegexpMode]");
                this.caseSensitiveOption = sb.querySelector("[action=toggleCaseSensitive]");
                this.wholeWordOption = sb.querySelector("[action=toggleWholeWords]");
                this.searchInput = this.searchBox.querySelector(".grid_search_field");
                this.replaceInput = this.replaceBox.querySelector(".grid_search_field");
            },
            init : function() {

                var sb = this.element;

                this.initElements(sb);

                var _this = this;

                on(sb, "mousedown", function(e) {
                    setTimeout(function(){
                        _this.activeInput.focus();
                    }, 0);
                    event.stopPropagation(e);
                });

                on(sb, "click", function(e) {

                    /*
                     var t = e.target || e.srcElement;
                     var action = t.getAttribute("action");
                     if (action && _this[action]) {
                     _this[action]();
                     }
                     else if (_this.$searchBarKb.commands[action])
                     {
                     _this.$searchBarKb.commands[action].exec(_this);
                     }


                     event.stopPropagation(e);
                     */
                });




                /*
                 event.addCommandKeyListener(sb, function(e, hashId, keyCode) {
                 var keyString = keyUtil.keyCodeToString(keyCode);
                 var command = _this.$searchBarKb.findKeyCommand(hashId, keyString);
                 if (command && command.exec) {
                 command.exec(_this);
                 event.stopEvent(e);
                 }
                 });
                 */

                /*
                 this.$onChange = lang.delayedCall(function() {
                 _this.find(false, false);
                 });*/

                var _lang = {
                    delayedCall : function(fcn, defaultTimeout) {
                        var timer = null;
                        var callback = function() {
                            timer = null;
                            fcn();
                        };

                        var _self = function(timeout) {
                            if (timer == null)
                                timer = setTimeout(callback, timeout || defaultTimeout);
                        };

                        _self.delay = function(timeout) {
                            timer && clearTimeout(timer);
                            timer = setTimeout(callback, timeout || defaultTimeout);
                        };
                        _self.schedule = _self;

                        _self.call = function() {
                            this.cancel();
                            fcn();
                        };

                        _self.cancel = function() {
                            timer && clearTimeout(timer);
                            timer = null;
                        };

                        _self.isPending = function() {
                            return timer;
                        };

                        return _self;
                    }
                }

                this.$onChange = _lang.delayedCall(function() {
                    _this.find(false, false);
                });

                on(this.searchInput, "input", function() {
                    _this.$onChange.schedule(20);
                });
                on(this.searchInput, "focus", function() {
                    _this.activeInput = _this.searchInput;
                    _this.searchInput.value && _this.highlight();
                });
                on(this.replaceInput, "focus", function() {
                    _this.activeInput = _this.replaceInput;
                    _this.searchInput.value && _this.highlight();
                });
            }
        });
        return searchClass;

    }

    function createGridSearchClass(){

        return Search;
        var GridSearch = declare('xgrid/Search',null,{
            showFooter: true,
            _searchText:null,
            _search:null,



            buildRendering: function () {

                this.inherited(arguments);
                var grid = this,
                    node = grid.domNode.parentNode;

                var searchMixin = createSearchMixin();

                var search = new searchMixin({});
                search.find = function(){
                    grid._searchText = this.searchInput.value;
                    console.log('search for2 ',this._searchText);
                    grid.set("collection", grid.collection);
                }

                search.showSearchBox(node);
                search.show('',false);
                search.hide();

                this._search = search;

                on(search.searchInput,'keydown',function(e){
                    if(e.code ==='Escape'){
                        search.hide();
                        grid.focus();
                    }
                });

                //keyboardMappings.push(Keyboard.defaultMapping(keyCombo, handler, keyProfile || types.KEYBOARD_PROFILE.DEFAULT, keyTarget, keyScope));
                var mapping = Keyboard.defaultMapping(['f3','ctrl f'], function(){
                    search.show('',false);
                }, types.KEYBOARD_PROFILE.DEFAULT, grid.domNode, grid,null);
                //keyboardMappings.push(mapping);
                this.registerKeyboardMapping(mapping);




                /*
                 var filterNode = this.filterNode = domConstruct.create('div', {
                 className: 'dgrid-filter'
                 }, this.footerNode);

                 this.filterStatusNode = domConstruct.create('div', {
                 className: 'dgrid-filter-status'
                 }, filterNode);

                 var inputNode = this.filterInputNode = domConstruct.create('input', {
                 className: 'dgrid-filter-input',
                 placeholder: 'Filter (regex)...'
                 }, filterNode);
                 this._filterTextBoxHandle = on(inputNode, 'keydown', debounce(function () {
                 grid.set("collection", grid.collection);
                 }, 250));
                 */
            },
            destroy: function () {
                this.inherited(arguments);
                /*
                 if (this._filterTextBoxHandle) {
                 this._filterTextBoxHandle.remove();
                 }
                 */
            },
            _setCollection: function (collection) {

                this.inherited(arguments);
                var value = this._searchText;
                var renderedCollection = this._renderedCollection;
                console.log('set serch collection',value);
                if (renderedCollection && value) {
                    var rootFilter = new renderedCollection.Filter();
                    var re = new RegExp(value, "i");
                    var columns = this.columns;
                    var matchFilters = [];
                    for (var p in columns) {
                        if (columns.hasOwnProperty(p)) {
                            matchFilters.push(rootFilter.match(columns[p].field, re));
                        }
                    }
                    var combined = rootFilter.or.apply(rootFilter, matchFilters);
                    var filtered = renderedCollection.filter(combined);
                    this._renderedCollection = filtered;
                    this.refresh();
                }
            },
        });

        return GridSearch;

    }

    function addSearch(grid){


        var searchClass = declare('xide/widgets/_Search',null,{
            searchBoxHTML:'<div class="widget form-group grid_search right ">\
                <button type="button" action="hide" class="grid_searchbtn_close"></button>\
                <div class="grid_search_form">\
                    <input class="form-control input-transparent grid_search_field" placeholder="Search for" spellcheck="false"></input>\
                    <button type="button input-group-addon" action="findNext" class="grid_searchbtn next"></button>\
                    <button type="button" action="findPrev" class="grid_searchbtn prev"></button>\
                    <button type="button" action="findAll" class="grid_searchbtn" title="Alt-Enter">All</button>\
                </div> \
                <div class="ace_replace_form">\
                    <input class="grid_search_field" placeholder="Replace with" spellcheck="false"/>\
                    <button type="button" action="replaceAndFindNext" class="ace_replacebtn">Replace</button>\
                    <button type="button" action="replaceAll" class="ace_replacebtn">All</button>\
                </div>\
                <div class="grid_search_options">\
                    <span action="toggleRegexpMode" class="ace_button" title="RegExp Search">.*</span>\
                    <span action="toggleCaseSensitive" class="ace_button" title="CaseSensitive Search">Aa</span>\
                    <span action="toggleWholeWords" class="ace_button" title="Whole Word Search">\\b</span>\
                </div>\
            </div>'.replace(/>\s+/g, ">"),
            showSearchBox:function(container){

                var div = domConstruct.create("div");
                div.innerHTML = this.searchBoxHTML;
                this.element = div.firstChild;

                container.appendChild(div);

                this.init();


            },
            highlight : function(re) {

                console.log('highlight');

                /*
                 this.editor.session.highlight(re || this.editor.$search.$options.re);
                 this.editor.renderer.updateBackMarkers()*/
            },
            find : function(skipCurrent, backwards) {

                var searchText = this.searchInput.value;

                console.log('search for ',searchText);


                /*
                 var range = this.editor.find(this.searchInput.value, {
                 skipCurrent: skipCurrent,
                 backwards: backwards,
                 wrap: true,
                 regExp: this.regExpOption.checked,
                 caseSensitive: this.caseSensitiveOption.checked,
                 wholeWord: this.wholeWordOption.checked
                 });
                 var noMatch = !range && this.searchInput.value;
                 dom.setCssClass(this.searchBox, "ace_nomatch", noMatch);
                 this.editor._emit("findSearchBox", { match: !noMatch });
                 this.highlight();*/
            },
            findNext : function() {
                this.find(true, false);
            },
            findPrev : function() {
                this.find(true, true);
            },
            findAll : function(){
                /*
                 var range = this.editor.findAll(this.searchInput.value, {
                 regExp: this.regExpOption.checked,
                 caseSensitive: this.caseSensitiveOption.checked,
                 wholeWord: this.wholeWordOption.checked
                 });
                 var noMatch = !range && this.searchInput.value;
                 dom.setCssClass(this.searchBox, "ace_nomatch", noMatch);
                 this.editor._emit("findSearchBox", { match: !noMatch });
                 this.highlight();
                 this.hide();
                 */
            },
            replace : function() {
                /*
                 if (!this.editor.getReadOnly())
                 this.editor.replace(this.replaceInput.value);
                 */
            },
            replaceAndFindNext : function() {
                /*
                 if (!this.editor.getReadOnly()) {
                 this.editor.replace(this.replaceInput.value);
                 this.findNext()
                 }*/
            },
            replaceAll : function() {
                /*
                 if (!this.editor.getReadOnly())
                 this.editor.replaceAll(this.replaceInput.value);
                 */
            },
            hide : function() {
                this.element.style.display = "none";
                this.editor.keyBinding.removeKeyboardHandler(this.$closeSearchBarKb);
                this.editor.focus();
            },
            show : function(value, isReplace) {
                this.element.style.display = "";
                this.replaceBox.style.display = isReplace ? "" : "none";

                this.isReplace = isReplace;

                if (value)
                    this.searchInput.value = value;
                this.searchInput.focus();
                this.searchInput.select();

                //this.editor.keyBinding.addKeyboardHandler(this.$closeSearchBarKb);
            },

            isFocused : function() {
                var el = document.activeElement;
                return el == this.searchInput || el == this.replaceInput;
            },
            initElements : function(sb) {
                this.searchBox = sb.querySelector(".grid_search_form");
                this.replaceBox = sb.querySelector(".ace_replace_form");
                this.searchOptions = sb.querySelector(".grid_search_options");
                this.regExpOption = sb.querySelector("[action=toggleRegexpMode]");
                this.caseSensitiveOption = sb.querySelector("[action=toggleCaseSensitive]");
                this.wholeWordOption = sb.querySelector("[action=toggleWholeWords]");
                this.searchInput = this.searchBox.querySelector(".grid_search_field");
                this.replaceInput = this.replaceBox.querySelector(".grid_search_field");
            },
            init : function() {

                var sb = this.element;

                this.initElements(sb);

                var _this = this;

                on(sb, "mousedown", function(e) {
                    setTimeout(function(){
                        _this.activeInput.focus();
                    }, 0);
                    event.stopPropagation(e);
                });

                on(sb, "click", function(e) {

                    /*
                     var t = e.target || e.srcElement;
                     var action = t.getAttribute("action");
                     if (action && _this[action]) {
                     _this[action]();
                     }
                     else if (_this.$searchBarKb.commands[action])
                     {
                     _this.$searchBarKb.commands[action].exec(_this);
                     }


                     event.stopPropagation(e);
                     */
                });




                /*
                 event.addCommandKeyListener(sb, function(e, hashId, keyCode) {
                 var keyString = keyUtil.keyCodeToString(keyCode);
                 var command = _this.$searchBarKb.findKeyCommand(hashId, keyString);
                 if (command && command.exec) {
                 command.exec(_this);
                 event.stopEvent(e);
                 }
                 });
                 */

                /*
                 this.$onChange = lang.delayedCall(function() {
                 _this.find(false, false);
                 });*/

                var _lang = {
                    delayedCall : function(fcn, defaultTimeout) {
                        var timer = null;
                        var callback = function() {
                            timer = null;
                            fcn();
                        };

                        var _self = function(timeout) {
                            if (timer == null)
                                timer = setTimeout(callback, timeout || defaultTimeout);
                        };

                        _self.delay = function(timeout) {
                            timer && clearTimeout(timer);
                            timer = setTimeout(callback, timeout || defaultTimeout);
                        };
                        _self.schedule = _self;

                        _self.call = function() {
                            this.cancel();
                            fcn();
                        };

                        _self.cancel = function() {
                            timer && clearTimeout(timer);
                            timer = null;
                        };

                        _self.isPending = function() {
                            return timer;
                        };

                        return _self;
                    }
                }

                this.$onChange = _lang.delayedCall(function() {
                    _this.find(false, false);
                });

                on(this.searchInput, "input", function() {
                    _this.$onChange.schedule(20);
                });
                on(this.searchInput, "focus", function() {
                    _this.activeInput = _this.searchInput;
                    _this.searchInput.value && _this.highlight();
                });
                on(this.replaceInput, "focus", function() {
                    _this.activeInput = _this.replaceInput;
                    _this.searchInput.value && _this.highlight();
                });
            }
        });

        /*
         var search = new searchClass();
         search.showSearchBox(grid.domNode.parentNode);
         search.show('',false);
         */

    }

    function addLog(tab,driver,device){

        var logManager = ctx.getLogManager();
        var store = logManager.store;

        var logGridClass = createLogGridClass();



        if(device){
            console.log('device : ', device);
        }

        console.log('add log');

        var info = device.info;


        var storeId = info.host + '_' + info.port + '_' + info.protocol;





        logGridClass = declare("xlog.views.LogView", logGridClass, {
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
                ACTION.PREVIEW,
                ACTION.SAVE,
                ACTION.SEARCH
            ],
            getRootFilter:function(){
                return {
                    show:true,
                    host:device.info.host + ':' + device.info.port
                }
            },
            runAction:function(action){

                var thiz = this;
                if(action.command==='File/Reload'){
                    this.delegate.removeStore(this.storeId);
                    this.delegate.getStore(this.storeId).then(function(_store){
                        thiz.collection = _store;
                        thiz.set('collection',thiz.collection.filter(thiz.getRootFilter()).sort(thiz.getDefaultSort()));
                    });

                }
                if(action.command==='File/Delete'){
                    this.delegate.empty(this.storeId);
                    this.set('collection',this.collection.filter(this.getRootFilter()).sort(this.getDefaultSort()));
                }
                return this.inherited(arguments);
            },
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
                    },
                    Details:{
                        field: "details", // get whole item for use by formatter
                        label: "Details",
                        sortable: false,
                        hidden:true
                        /*editor:RowDetailEditor*/
                    }
                };

                if (!this.showSource) {
                    delete columns['Host'];
                }



                return columns;
            },
            startup:function(){

                this.inherited(arguments);

                var thiz = this,
                    permissions = this.permissions;

                if (permissions) {

                    var _defaultActions = DefaultActions.getDefaultActions(permissions, this);
                    //_defaultActions = _defaultActions.concat(this.getBlockActions(permissions));
                    this.addActions(_defaultActions);
                    this.onContainerClick();
                }

                var reloadAction = this.getAction('File/Reload');

                this.collection.on('added',function(){
                    console.log('reload');
                    //thiz.runAction(reloadAction);
                });
            }
        });

        logManager.getStore(storeId).then(function(_store){

            store = _store;

            var gridArgs = {
                ctx:ctx,
                storeId:storeId,
                attachDirect:true,
                delegate:logManager,
                collection: store.filter({
                    show:true,
                    host:device.info.host + ':' + device.info.port
                }).sort([{property: 'time', descending: true}])
            };

            //tab.select();
            var grid = utils.addWidget(logGridClass,gridArgs,null,tab,false,'logGridView');
            grid.startup();
        });


        return;



        // default grid args



        //addSearch(grid);



    }

    function onWidgetCreated(basicTab,condTab,varTab,logTab,driver,device){

        addLog(logTab,driver,device);


        if(basicGridInstance){

            //basicGridInstance.runAction('Step/Run');
            var saveAction = basicGridInstance.getAction('File/Save');
            //basicGridInstance.runAction(saveAction);
        }


        logTab.select();

    }


    function createCommandSettingsWidget(){


        var _class = declare("xcf.widgets.CommandSettings2",CommandSettings, {
            templateString:'<div style="width: inherit;height: 100%;"><div>',
            _docker:null,
            grids:null,
            completeGrid:function(grid){
                grid.userData = this.userData;
                completeGrid(grid);
            },
            getGridClass:function(){
                return createGridClass();
            },
            createWidgets:function(){


                widget = this;

                var docker = this.getDocker(this.domNode),

                    ci = this.userData,

                    driver = ci.driver,

                    device = ci.device,



                //original or device instance
                    scope = device ? device.blockScope : driver.blockScope,


                    store = scope.blockStore,

                    instance = driver.instance,

                    widget = this,

                    grids = [],

                    gridClass = this.getGridClass(),

                    defaultTabArgs = {
                        icon:false,
                        closeable:false,
                        movable:false,
                        moveable:true,
                        tabOrientation:types.DOCKER.TAB.TOP,
                        location:types.DOCKER.DOCK.STACKED
                    },


                // 'Basic' commands tab
                    basicCommandsTab = docker.addTab('DefaultFixed',
                        utils.mixin(defaultTabArgs,{
                            title: 'Basic Commands',
                            h:'90%'
                        })),

                // 'Conditional' commands tab
                    condCommandsTab = docker.addTab('DefaultFixed',
                        utils.mixin(defaultTabArgs,{
                            title: 'Conditional Commands',
                            target:basicCommandsTab,
                            select:false,
                            h:'90%',
                            tabOrientation:types.DOCKER.TAB.TOP
                        }));


                // 'Variables' tab
                var variablesTab = docker.addTab(null,
                    utils.mixin(defaultTabArgs,{
                        title: 'Variables',
                        //target:condCommandsTab,
                        select:false,
                        h:100,
                        tabOrientation:types.DOCKER.TAB.BOTTOM,
                        location:types.DOCKER.TAB.BOTTOM
                    }));


                var logsTab = docker.addTab(null,
                    utils.mixin(defaultTabArgs,{
                        title: 'Log',
                        target:variablesTab,
                        select:false,
                        tabOrientation:types.DOCKER.TAB.BOTTOM,
                        location:types.DOCKER.DOCK.STACKED
                    }));



                // prepare right property panel but leave it closed

                this.getRightPanel(null,1);


                var basicArgs = {
                    _getRight:function(){
                        return widget.__right;
                    },
                    ctx:ctx,
                    blockScope: scope,
                    blockGroup: 'basic',
                    attachDirect:true,
                    collection: store.filter({
                        group: 'basic'
                    }),
                    //dndConstructor: SharedDndGridSource,
                    //dndConstructor:Dnd.GridSource,
                    __right:this.__right,
                    _docker:docker,
                    setPanelSplitPosition:widget.setPanelSplitPosition,
                    getPanelSplitPosition:widget.getPanelSplitPosition
                };


                ////////////////////////////////////////////////////////////////////////////////////////////////////////
                //basic commands

                var basicGrid = utils.addWidget(gridClass,basicArgs,null,basicCommandsTab,false);
                this.completeGrid(basicGrid,'Command');
                grids.push(basicGrid);


                basicGridInstance = basicGrid;



                docker._on(types.DOCKER.EVENT.SPLITTER_POS_CHANGED,function(evt){

                    var position = evt.position,
                        splitter = evt.splitter,
                        right = widget.__right;

                    if(right && splitter == right.getSplitter()){
                        if(position<1){
                            basicGrid.showProperties(grid.getSelection()[0],true);
                        }
                    }
                });

                basicGrid.select([0],null,true,{
                    focus:true
                });





                ////////////////////////////////////////////////////////////////////////////////////////////////////////
                //conditional commands
                var condArgs = {
                    ctx:ctx,
                    _getRight:function(){
                        return widget.__right;
                    },
                    blockScope: scope,
                    blockGroup: 'conditional',
                    attachDirect:true,
                    collection: store.filter({
                        group: 'conditional'
                    }),
                    //dndConstructor: SharedDndGridSource,
                    //dndConstructor:Dnd.GridSource,
                    __right:this.__right,
                    _docker:docker,
                    setPanelSplitPosition:widget.setPanelSplitPosition,
                    getPanelSplitPosition:widget.getPanelSplitPosition
                }

                var condGrid = utils.addWidget(gridClass,condArgs,null,condCommandsTab,false);
                completeGrid(condGrid,'Command');
                grids.push(condGrid);




                ////////////////////////////////////////////////////////////////////////////////////////////////////////
                //variables
                var varArgs= {
                    _getRight:function(){
                        return widget.__right;
                    },
                    ctx:ctx,
                    blockScope: scope,
                    blockGroup: 'basicVariables',
                    attachDirect:true,
                    collection: store.filter({
                        group: 'basicVariables'
                    }),
                    //dndConstructor: SharedDndGridSource,
                    //dndConstructor:Dnd.GridSource,
                    _docker:docker,
                    setPanelSplitPosition:widget.setPanelSplitPosition,
                    getPanelSplitPosition:widget.getPanelSplitPosition,
                    showHeader:true,
                    __right:this.__right,
                    columns:[
                        {
                            label: "Name",
                            field: "name",
                            sortable: true,
                            width:'20%',
                            editorArgs: {
                                required: true,
                                promptMessage: "Enter a unique variable name",
                                //validator: thiz.variableNameValidator,
                                //delegate: thiz.delegate,
                                intermediateChanges: false
                            }
                            //editor: TextBox,
                            //editOn:'click',
                            //_editor: ValidationTextBox
                        },
                        {
                            label: "Initialize",
                            field: "initialize",
                            sortable: false,
                            editor: TextBox,
                            editOn:'click'
                        },
                        {
                            label: "Value",
                            field: "value",
                            sortable: false,
                            editor: TextBox,
                            editOn:'click',
                            editorArgs: {
                                autocomplete:'on',
                                templateString:'<div class="dijit dijitReset dijitInline dijitLeft" id="widget_${id}" role="presentation"'+
                                '><div class="dijitReset dijitInputField dijitInputContainer"'+
                                '><input class="dijitReset dijitInputInner" data-dojo-attach-point="textbox,focusNode" autocomplete="on"'+
                                '${!nameAttrSetting} type="${type}"'+
                                '/></div'+
                                '></div>'
                            }
                        }
                    ]
                };
                var varGrid = utils.addWidget(gridClass,varArgs,null,variablesTab,false);

                completeGrid(varGrid,'Variable');

                grids.push(varGrid);


                domClass.add(varGrid.domNode,'variableSettings');

                varGrid.on("dgrid-datachange", function (evt) {

                    var cell = evt.cell;

                    //normalize data
                    var item = null;
                    if (cell && cell.row && cell.row.data) {
                        item = cell.row.data;
                    }
                    var id = evt.rowId;
                    var oldValue = evt.oldValue;
                    var newValue = evt.value;

                    var data = {
                        item: item,
                        id: id,
                        oldValue: oldValue,
                        newValue: newValue,
                        grid: varGrid,
                        field: cell.column.field
                    };

                    if (item) {
                        item[data.field] = data.newValue;
                    }




                });
                basicCommandsTab.select();

                var _grids = {
                    basic:basicGrid,
                    variables:varGrid,
                    cond:condGrid
                };

                basicGrid.grids=_grids;
                condGrid.grids=_grids;
                varGrid.grids=_grids;

                if(ci.actionTarget){
                    _.each(grids,function(grid){
                        ci.actionTarget.addActionEmitter(grid);
                    });
                }

                this.grids = grids;

                setTimeout(function(){
                    variablesTab.getFrame().showTitlebar(false);
                    variablesTab.getSplitter().pos(0.6);
                    variablesTab.select();
                    logsTab.select();
                    onWidgetCreated(basicCommandsTab,condCommandsTab,variablesTab,logsTab,driver,device);
                },10);


            }
        });



        dojo.setObject('xcf.widgets.CommandSettings2',_class);



        return _class;
    }

    function getFileActions(permissions) {



        var result = [],
            ACTION = types.ACTION,
            ACTION_ICON = types.ACTION_ICON,
            VISIBILITY = types.ACTION_VISIBILITY,
            thiz = this,
            actionStore = thiz.getActionStore();


        return [];

        function addAction(label, command, icon, keycombo, tab, group, filterGroup, onCreate, handler, mixin, shouldShow, shouldDisable) {

            var action = null;
            if (DefaultActions.hasAction(permissions, command)) {

                mixin = mixin || {};

                utils.mixin(mixin, {owner: thiz});

                if (!handler) {

                    handler = function (action) {
                        console.log('log run action', arguments);
                        var who = this;
                        if (who.runAction) {
                            who.runAction.apply(who, [action]);
                        }
                    }
                }
                action = DefaultActions.createAction(label, command, icon, keycombo, tab, group, filterGroup, onCreate, handler, mixin, shouldShow, shouldDisable, thiz.domNode);

                result.push(action);
                return action;

            }
        }

        /*
         var rootAction = 'Block/Insert';
         permissions.push(rootAction);
         addAction('Block', rootAction, 'el-icon-plus-sign', null, 'Home', 'Insert', 'item|view', null, null, {
         dummy: true,
         onCreate: function (action) {
         action.setVisibility(VISIBILITY.CONTEXT_MENU, {
         label: 'Add'
         });

         }
         }, null, null);
         permissions.push('Block/Insert Variable');


         addAction('Variable', 'Block/Insert Variable', 'el-icon-plus-sign', null, 'Home', 'Insert', 'item|view', null, null, {
         }, null, null);
         */

        /*
         permissions.push('Clipboard/Paste/New');
         addAction('New ', 'Clipboard/Paste/New', 'el-icon-plus-sign', null, 'Home', 'Clipboard', 'item|view', null, null, {
         }, null, null);*/


        var newBlockActions = this.getAddActions();
        var addActions = [];
        var levelName = '';


        function addItems(commandPrefix, items) {

            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                levelName = item.name;


                var path = commandPrefix + '/' + levelName;
                var isContainer = !_.isEmpty(item.items);

                permissions.push(path);

                addAction(levelName, path, item.iconClass, null, 'Home', 'Insert', 'item|view', null, null, {}, null, null);


                if (isContainer) {
                    addItems(path, item.items);
                }


            }

        }
        //console.clear();
        //addItems(rootAction, newBlockActions);
        //return result;


        //run
        function canMove(selection, reference, visibility) {
            var selection = thiz.getSelection();
            if (!selection || !selection.length) {
                return true;
            }

            var item = selection[0];
            var canMove = item.canMove(item, this.command === 'Step/Move Up' ? -1 : 1);

            return !canMove;

        }


        function canParent(selection, reference, visibility) {

            var selection = thiz.getSelection();
            if (!selection || !selection.length) {
                return true;
            }

            var item = selection[0];
            if(!item){
                console.warn('bad item',selection);
                return false;
            }

            if(this.command === 'Step/Move Left'){
                return !item.getParent();
            }else{
                return item.getParent();
            }
            /*
             var canMove = item.canMove(item, this.command === 'Step/Move Left' ? -1 : 1);
             return !canMove;*/

            return true;

        }

        function isItem(selection, reference, visibility) {
            var selection = thiz.getSelection();
            if (!selection || !selection.length) {
                return true;
            }
            return false;

        }

        /**
         * run
         */

        addAction('Run', 'Step/Run', 'el-icon-play', ['space'], 'Home', 'Step', 'item', null, null, {
            onCreate: function (action) {
                action.setVisibility(VISIBILITY.RIBBON, {
                    widgetArgs:{
                        label: ' ',
                        style:'font-size:25px!important;'
                    }
                });

            }
        }, null, isItem);
        permissions.push('Step/Run/From here');

        /**
         * run
         */

        addAction('Run from here', 'Step/Run/From here', 'el-icon-play', ['ctrl space'], 'Home', 'Step', 'item', null, null, {

            onCreate: function (action) {

            }
        }, null, isItem);



        /**
         * move
         */

        addAction('Move Up', 'Step/Move Up', 'fa-arrow-up', ['alt up'], 'Home', 'Step', 'item', null, null, {
            onCreate: function (action) {
                action.setVisibility(VISIBILITY.RIBBON, {
                    label: ''
                });
            }
        }, null, canMove);


        addAction('Move Down', 'Step/Move Down', 'fa-arrow-down', ['alt down'], 'Home', 'Step', 'item', null, null, {
            onCreate: function (action) {

                action.setVisibility(VISIBILITY.RIBBON, {
                    label: ''
                });

            }
        }, null, canMove);
        /*


         permissions.push('Step/Edit');
         addAction('Edit', 'Step/Edit', ACTION_ICON.EDIT, ['f4', 'enter'], 'Home', 'Step', 'item', null, null, null, null, isItem);
         */
        ///////////////////////////////////////////////////
        //
        //  Editors
        //
        ///////////////////////////////////////////////////

        permissions.push('Step/Move Left');
        permissions.push('Step/Move Right');

        addAction('Move Left', 'Step/Move Left', 'fa-arrow-left', ['alt left'], 'Home', 'Step', 'item', null, null, {
            onCreate: function (action) {
                action.setVisibility(VISIBILITY.RIBBON, {
                    label: ''
                });
            }
        }, null, canParent);

        addAction('Move Right', 'Step/Move Right', 'fa-arrow-right', ['alt right'], 'Home', 'Step', 'item', null, null, {
            onCreate: function (action) {
                action.setVisibility(VISIBILITY.RIBBON, {
                    label: ''
                });


            }
        }, null, canParent);


        return result;

    }

    function doTests(){

    }


    var createDelegate = function(){
        return {
        }
    }


    function openDriverSettings(driver,device){


        createCommandSettingsWidget();

        var toolbar = ctx.mainView.getToolbar();



        var docker = ctx.mainView.getDocker();
        var parent  = window.driverTab;
        if(parent){
            docker.removePanel(parent);
        }

        var title = 'Marantz Instance';



        var devinfo = null;
        if(device){
            devinfo  = ctx.getDeviceManager().toDeviceControlInfo(device);
        }


        parent = docker.addTab(null, {
            title: (title || driver.name) + '' + (device ? ':' + device.name + ':' + devinfo.host + ':' : ''),
            icon: 'fa-exchange'
        });


        window.driverTab = parent;



        //@Todo:driver, store device temporarly in Commands CI
        var commandsCI = utils.getCIByChainAndName(driver.user, 0, types.DRIVER_PROPERTY.CF_DRIVER_COMMANDS);
        if(commandsCI){
            commandsCI.device = device;
        }


        var view = utils.addWidget(CIGroupedSettingsView, {
            style:"width: inherit;height: 100%;",
            title:  'title',
            cis: driver.user.inputs,
            storeItem: driver,
            delegate: createDelegate(),
            storeDelegate: this,
            iconClass: 'fa-eye',
            closable: true,
            showAllTab: false,
            blockManager: ctx.getBlockManager(),
            options:{
                groupOrder: {
                    'General': 1,
                    'Settings': 2,
                    'Visual':3
                },
                select:'Settings'
            }


        }, null, parent, true);


        docker.resize();
        view.resize();
    }
    /***
     * playground
     */
    var _lastGrid = window._lastGrid;
    var ctx = window.sctx,
        ACTION = types.ACTION,
        root,
        scope,
        blockManager,
        driverManager,
        marantz;



    var _actions = [
        ACTION.RENAME
    ];


    function fixScope(scope){

        return scope;

        /**
         *
         * @param source
         * @param target
         * @param before
         * @param add: comes from 'hover' state
         * @returns {boolean}
         */
        scope.moveTo = function(source,target,before,add){




            console.log('scope::move, add: ' +add,arguments);

            if(!add){
                debugger;
            }
            /**
             * treat first the special case of adding an item
             */
            if(add){

                //remove it from the source parent and re-parent the source
                if(target.canAdd && target.canAdd()){

                    var sourceParent = this.getBlockById(source.parentId);
                    if(sourceParent){
                        sourceParent.removeBlock(source,false);
                    }
                    target.add(source,null,null);
                    return;
                }else{
                    console.error('cant reparent');
                    return false;
                }
            }


            //for root level move
            if(!target.parentId && add==false){

                //console.error('root level move');

                //if source is part of something, we remove it
                var sourceParent = this.getBlockById(source.parentId);
                if(sourceParent && sourceParent.removeBlock){
                    sourceParent.removeBlock(source,false);
                    source.parentId=null;
                    source.group=target.group;
                }

                var itemsToBeMoved=[];
                var groupItems = this.getBlocks({
                    group:target.group
                });

                var rootLevelIndex=[];
                var store = this.getBlockStore();

                var sourceIndex = store.storage.index[source.id];
                var targetIndex = store.storage.index[target.id];
                for(var i = 0; i<groupItems.length;i++){

                    var item = groupItems[i];
                    //keep all root-level items

                    if( groupItems[i].parentId==null && //must be root
                        groupItems[i]!=source// cant be source
                    ){

                        var itemIndex = store.storage.index[item.id];
                        var add = before ? itemIndex >= targetIndex : itemIndex <= targetIndex;
                        if(add){
                            itemsToBeMoved.push(groupItems[i]);
                            rootLevelIndex.push(store.storage.index[groupItems[i].id]);
                        }
                    }
                }

                //remove them the store
                for(var j = 0; j<itemsToBeMoved.length;j++){
                    store.remove(itemsToBeMoved[j].id);
                }

                //remove source
                this.getBlockStore().remove(source.id);

                //if before, put source first
                if(before){
                    this.getBlockStore().putSync(source);
                }

                //now place all back
                for(var j = 0; j<itemsToBeMoved.length;j++){
                    store.put(itemsToBeMoved[j]);
                }

                //if after, place source back
                if(!before){
                    this.getBlockStore().putSync(source);
                }

                return true;

                //we move from root to lower item
            }else if( !source.parentId && target.parentId && add==false){
                source.group = target.group;
                if(target){

                }

                //we move from root to into root item
            }else if( !source.parentId && !target.parentId && add){

                console.error('we are adding an item into root root item');
                if(target.canAdd && target.canAdd()){
                    source.group=null;
                    target.add(source,null,null);
                }
                return true;

                // we move within the same parent
            }else if( source.parentId && target.parentId && add==false && source.parentId === target.parentId){
                console.error('we move within the same parents');
                var parent = this.getBlockById(source.parentId);
                if(!parent){
                    console.error('     couldnt find parent ');
                    return false;
                }

                var maxSteps = 20;
                var items = parent[parent._getContainer(source)];

                var cIndexSource = source.indexOf(items,source);
                var cIndexTarget = source.indexOf(items,target);
                var direction = cIndexSource > cIndexTarget ? -1 : 1;
                var distance = Math.abs(cIndexSource - ( cIndexTarget + (before ==true ? -1 : 1)));
                for(var i = 0 ; i < distance -1;  i++){
                    parent.move(source,direction);
                }
                return true;

                // we move within the different parents
            }else if( source.parentId && target.parentId && add==false && source.parentId !== target.parentId){                console.log('same parent!');

                console.error('we move within the different parents');
                //collect data

                var sourceParent = this.getBlockById(source.parentId);
                if(!sourceParent){
                    console.error('     couldnt find source parent ');
                    return false;
                }

                var targetParent = this.getBlockById(target.parentId);
                if(!targetParent){
                    console.error('     couldnt find target parent ');
                    return false;
                }


                //remove it from the source parent and re-parent the source
                if(sourceParent && sourceParent.removeBlock && targetParent.canAdd && targetParent.canAdd()){
                    sourceParent.removeBlock(source,false);
                    targetParent.add(source,null,null);
                }else{
                    console.error('cant reparent');
                    return false;
                }

                //now proceed as in the case above : same parents
                var items = targetParent[targetParent._getContainer(source)];
                if(items==null){
                    console.error('weird : target parent has no item container');
                }
                var cIndexSource = targetParent.indexOf(items,source);
                var cIndexTarget = targetParent.indexOf(items,target);
                if(!cIndexSource || !cIndexTarget){
                    console.error(' weird : invalid drop processing state, have no valid item indicies');
                    return;
                }
                var direction = cIndexSource > cIndexTarget ? -1 : 1;
                var distance = Math.abs(cIndexSource - ( cIndexTarget + (before ==true ? -1 : 1)));
                for(var i = 0 ; i < distance -1;  i++){
                    targetParent.move(source,direction);
                }
                return true;
            }

            return false;
        };

        return scope;

        var topLevelBlocks = [];
        var blocks = scope.getBlocks({
            parentId:null
        });


        var grouped = _.groupBy(blocks,function(block){
            return block.group;
        });

        function createDummyBlock(id,scope){

            var block = {
                "_containsChildrenIds": [
                    "items"
                ],
                "group": null,
                "id": id,
                "items": [

                ],
                "name": id,
                "method": "----group block ----",
                "args": "",
                "deferred": false,
                "declaredClass": "xblox.model.code.RunScript",
                "enabled": true,
                "serializeMe": false,
                "shareTitle": "",
                "canDelete": true,
                "renderBlockIcon": true,
                "order": 0,
                "additionalProperties": true,
                "_scenario": "update"

            };

            return scope.blockFromJson(block);

        }


        



        for(var group in grouped){

            var groupBlock = createDummyBlock(group,scope);
            var blocks = grouped[group];
            _.each(blocks,function(block){
                groupBlock['items'].push(block);



                if(!block.parentId && block.group /*&& block.id !== group*/) {
                    block.parent = groupBlock;
                    block.parentId = groupBlock.id;
                }
            });
        }

        var root = scope.getBlockById('root');
        //console.dir(root.getParent());
        return scope;
    }


    function createScope() {

        var data = {
            "blocks": [
                {
                    "_containsChildrenIds": [
                        "items"
                    ],
                    "group": "click",
                    "id": "root",
                    "items": [
                        "sub0",
                        "sub1"
                    ],
                    "description": "Runs an expression.<br/>\n\n<b>Behaviour</b>\n\n<pre>\n\n    //to abort execution (child blocks), return something negative as -1 or false.\n    return false;\n\n</pre>",
                    "name": "Root - 1",
                    "method": "console.log('asd',this);",
                    "args": "",
                    "deferred": false,
                    "declaredClass": "xblox.model.code.RunScript",
                    "enabled": true,
                    "serializeMe": true,
                    "shareTitle": "",
                    "canDelete": true,
                    "renderBlockIcon": true,
                    "order": 0,
                    "additionalProperties": true,
                    "_scenario": "update"
                },

                {
                    "group": "click4",
                    "id": "root4",
                    "description": "Runs an expression.<br/>\n\n<b>Behaviour</b>\n\n<pre>\n\n    //to abort execution (child blocks), return something negative as -1 or false.\n    return false;\n\n</pre>",
                    "name": "Root - 4",
                    "method": "console.log(this);",
                    "args": "",
                    "deferred": false,
                    "declaredClass": "xblox.model.code.RunScript",
                    "enabled": true,
                    "serializeMe": true,
                    "shareTitle": "",
                    "canDelete": true,
                    "renderBlockIcon": true,
                    "order": 0

                },
                {
                    "group": "click",
                    "id": "root2",
                    "description": "Runs an expression.<br/>\n\n<b>Behaviour</b>\n\n<pre>\n\n    //to abort execution (child blocks), return something negative as -1 or false.\n    return false;\n\n</pre>",
                    "name": "Root - 2",
                    "method": "console.log(this);",
                    "args": "",
                    "deferred": false,
                    "declaredClass": "xblox.model.code.RunScript",
                    "enabled": true,
                    "serializeMe": true,
                    "shareTitle": "",
                    "canDelete": true,
                    "renderBlockIcon": true,
                    "order": 0

                },

                {
                    "group": "click",
                    "id": "root3",
                    "description": "Runs an expression.<br/>\n\n<b>Behaviour</b>\n\n<pre>\n\n    //to abort execution (child blocks), return something negative as -1 or false.\n    return false;\n\n</pre>",
                    "name": "Root - 3",
                    "method": "console.log(this);",
                    "args": "",
                    "deferred": false,
                    "declaredClass": "xblox.model.code.RunScript",
                    "enabled": true,
                    "serializeMe": true,
                    "shareTitle": "",
                    "canDelete": true,
                    "renderBlockIcon": true,
                    "order": 0

                },


                {
                    "_containsChildrenIds": [],
                    "parentId": "root",
                    "id": "sub0",
                    "name": "On Event",
                    "event": "",
                    "reference": "",
                    "declaredClass": "xblox.model.events.OnEvent",
                    "_didRegisterSubscribers": false,
                    "enabled": true,
                    "serializeMe": true,
                    "shareTitle": "",
                    "description": "No Description",
                    "canDelete": true,
                    "renderBlockIcon": true,
                    "order": 0,
                    "additionalProperties": true,
                    "_scenario": "update"
                },
                {
                    "_containsChildrenIds": [],
                    "parentId": "root",
                    "id": "sub1",
                    "name": "On Event2",
                    "event": "",
                    "reference": "",
                    "declaredClass": "xblox.model.events.OnEvent",
                    "_didRegisterSubscribers": false,
                    "enabled": true,
                    "serializeMe": true,
                    "shareTitle": "",
                    "description": "No Description",
                    "canDelete": true,
                    "renderBlockIcon": true,
                    "order": 0,
                    "additionalProperties": true,
                    "_scenario": "update"
                }
            ],
            "variables": []
        };

        return fixScope(blockManager.toScope(data));
    }



    if (ctx) {

        blockManager = ctx.getBlockManager();
        driverManager = ctx.getDriverManager();
        marantz  = driverManager.getItemById("235eb680-cb87-11e3-9c1a-0800200c9a66");

        var marantz = driverManager.store.getSync("Marantz/My Marantz.meta.json_instances_instance_Marantz/Marantz.20.meta.json");

        var driver = marantz.driver;
        var device = marantz.device;

        var toolbar = ctx.mainView.getToolbar();



        var docker = ctx.mainView.getDocker();
        var parent  = window.driverTab;
        if(parent){
            docker.removePanel(parent);
        }

        var title = 'Marantz Instance';



        var devinfo = null;
        if(device){
            devinfo  = ctx.getDeviceManager().toDeviceControlInfo(device);
        }


        parent = docker.addTab(null, {
            title: (title || driver.name) + '' + (device ? ':' + device.name + ':' + devinfo.host + ':' : ''),
            icon: 'fa-exchange'
        });


        window.driverTab = parent;


        addLog(parent,driver,device);



        //openDriverSettings(driver,device);


        return createCommandSettingsWidget();
    }


    return Grid;

});