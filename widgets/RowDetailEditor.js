define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom-construct",
        'dijit/_Widget',
        'xide/widgets/TemplatedWidgetBase',
        'xide/widgets/ToolTipMixin',
        'xide/mixins/EventedMixin',
        'xide/mixins/ReloadMixin'
    ],
    function (declare, lang,domConstruct,_Widget, TemplatedWidgetBase, ToolTipMixin, EventedMixin, ReloadMixin) {
        return declare("xlog.widgets.RowDetailEditor", [_Widget, TemplatedWidgetBase, EventedMixin, ReloadMixin, ToolTipMixin],
            {
                _didRenderBlock: false,
                containerNode: null,
                debug: true,
                highlightDelay: 1200,
                _isHighLighting: false,
                data:null,
                getRootId: function () {
                    return this.id;
                },
                getTooltipNode: function () {
                    return this.containerNode;
                },
                templateString: "<div data-dojo-attach-point='root' class='' style=''>" +
                        "<div data-dojo-attach-point='containerNode'>no set</div>" +
                "</div>",
                _createJSONEditor: function (data) {
                    var pdiv = dojo.doc.createElement('div');
                    this.containerNode.appendChild(pdiv);
                    var options = {
                        mode: 'view',
                        search: false,
                        change: false
                    };
                    this.editor = new JSONEditor(pdiv, options);
                    this.editor.set(data);
                },
                renderObject: function (block) {
                    if (!this.containerNode) {
                        return;
                    }
                    dojo.empty(this.containerNode);
                    this._createJSONEditor(block);
                },
                renderString: function (string) {
                    if (!this.containerNode) {
                        return;
                    }

                    dojo.empty(this.containerNode);
                    var pdiv = dojo.doc.createElement('span', {
                        innerHTML: string
                    });
                    this.containerNode.appendChild(pdiv);

                },
                onReloaded: function () {
                    this._didRenderBlock = false;
                    if (this.containerNode) {
                        dojo.empty(this.containerNode);
                    }
                    this.renderBlock(this.object);
                },
                startup: function () {
                    this.inherited(arguments);

                    var thiz = this;


                    try {
                        if (!this._didRenderBlock) {

                            if (this.object && this.object.details) {


                                var details = this.object.details;
                                if (lang.isObject(details)) {

                                    var cache = [];
                                    var _serialized = JSON.stringify(details, function (key, value) {
                                        if (typeof value === 'function' || typeof value === 'undefined') {
                                            return;
                                        }
                                        if (key === '_events' ||
                                            key === '_inherited' ||
                                            key === 'scope' ||
                                            key === 'store' ||
                                            key === '__inherited' ||
                                            key === 'delegate' ||
                                            key === 'owner' ||
                                            key === 'domNode' ||
                                            key === 'containerNode' ||
                                            key[0] === '_'
                                        ) {
                                            return;
                                        }
                                        if (value == null) {
                                            return;
                                        }
                                        if (value['declaredClass'] != null) {
                                            return;
                                        }
                                        var _type = typeof value;
                                        if (typeof value === 'object' && value !== null) {
                                            if (cache.indexOf(value) !== -1) {
                                                // Circular reference found, discard key
                                                return;
                                            }
                                            // Store value in our collection
                                            cache.push(value);
                                        }
                                        return value;
                                    });
                                    cache = null;
                                    if (_serialized) {
                                        details = dojo.fromJson(_serialized);
                                    }
                                    if (lang.isArray(details) && details.length === 0) {
                                        return '';
                                    }

                                    this.data = details;
                                    var _handle = null,
                                        container = this.containerNode;

                                    dojo.empty(container);

                                    var opener  = domConstruct.create('span',{
                                        className:"fa fa-expand ui-button"
                                    });
                                    container.appendChild(opener);

                                    var _collapse = function() {
                                        setTimeout(function () {
                                            thiz.renderObject(details);
                                            _handle.remove();
                                        }, 100);
                                    };
                                    _handle = this.on('click',_collapse);

                                } else if (lang.isString) {
                                    this.renderString(this.object.details);
                                }
                            } else {
                               // console.error('have no object!!!');
                            }
                        }
                        this._didRenderBlock = true;
                    } catch (e) {
                        console.error('log detail failed! ' + e);
                    }
                }
            });
    });