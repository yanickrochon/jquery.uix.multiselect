/*
 * jQuery UIx Multiselect 2.0beta
 *
 * Authors:
 *  Yanick Rochon (yanick.rochon[at]gmail[dot]com)
 *
 * Licensed under the MIT (MIT-LICENSE.txt) license.
 *
 * http://mind2soft.com/labs/jquery/multiselect/
 *
 *
 * Depends:
 * jQuery UI 1.8+
 *
 *
 */

(function($) {
    var globalScope = 0;

    // The jQuery.uix namespace will automatically be created if it doesn't exist
    $.widget("uix.multiselect", {
        options: {
            collapsibleGroups: true,       // tells whether the option groups can be collapsed or not (default: true)
            defaultGroupName: '',          // the name of the default option group (default: '')
            locale: 'auto',                // any valid locale, 'auto', or '' for default built-in strings (default: 'auto')
            moveEffect: null,              // 'blind','bounce','clip','drop','explode','fold','highlight','puff','pulsate','shake','slide' (default: null)
            moveEffectOptions: {},         // effect options (see jQuery UI documentation) (default: {})
            moveEffectSpeed: null,         // string ('slow','fast') or number in millisecond (ignored if moveEffect is 'show') (default: null)
            optionRenderer: false,         // a function that will return the item element to be rendered in the list (default: false)
            selectionMode: 'click,d&d',    // how options can be selected separated by commas: 'click', "dblclick" and 'd&d' (default: 'dblclick,d&d')
            showDefaultGroupHeader: false, // show the default option group header (default: false)
            showEmptyGroups: false,        // always display option groups even if empty (default: false)
            splitRatio: 0.55,              // % of the left list's width of the widget total width (default 0.55)
            sortable: false,               // if the selected list should be user sortable or not
            sortMethod: null               // null, 'standard', 'natural'; a sort function name (see ItemComparators) (default: 'standard')
        },

        _create: function() {
            var that = this;
            var selListHeader, selListContent, avListHeader, avListContent;
            var btnSearch, btnSelectAll, btnDeselectAll;

            this.scope = 'multiselect' + (globalScope++);
            this._setLocale(this.options.locale);

            this.element.hide();
            this._elementWrapper = $('<div></div>').addClass('uix-multiselect ui-widget')
                .css({
                    'width': this.element.outerWidth(),
                    'height': this.element.outerHeight()
                })
                .append(
                    $('<div></div>').addClass('multiselect-selected-list')
                        .append( $('<div></div>').addClass('ui-widget-header ui-corner-tl')
                            .append( btnDeselectAll = $('<button></button>').addClass('uix-control-right')
                                .attr('data-localekey', 'deselectAll')
                                .attr('title', this._t('deselectAll'))
                                .button({icons:{primary:'ui-icon-arrowthickstop-1-e'}, text:false})
                                .click(function(e) { e.preventDefault(); e.stopPropagation(); that._optionCache.setSelectedAll(false); return false; })
                            )
                            .append( selListHeader = $('<div></div>').addClass('header-text') )
                        )
                        .append( selListContent = $('<div></div>').addClass('uix-list-container ui-widget-content ui-corner-bl') )
                )
                .append(
                    $('<div></div>').addClass('multiselect-available-list')
                        .append( $('<div></div>').addClass('ui-widget-header ui-corner-tr')//.text('Available items')
                            .append( btnSelectAll = $('<button></button>').addClass('uix-control-right')
                                .attr('data-localekey', 'selectAll')
                                .attr('title', this._t('selectAll'))
                                .button({icons:{primary:'ui-icon-arrowthickstop-1-w'}, text:false})
                                .click(function(e) { e.preventDefault(); e.stopPropagation(); that._optionCache.setSelectedAll(true); return false; })
                            )
                            .append( btnSearch = $('<button></button').addClass('uix-control-right')
                                .attr('data-localekey', 'search')
                                .attr('title', this._t('search'))
                                .button({icons:{primary:'ui-icon-search'}, text:false})
                                .click(function(e) {
                                    e.preventDefault(); e.stopPropagation();
                                    if (that._searchField.is(':visible')) {
                                        var b = $(this);
                                        avListHeader.css('visibility', 'visible').fadeTo('fast', 1.0);
                                        that._searchField.hide('slide', {direction: 'right'}, 200, function() { b.removeClass('ui-corner-right ui-state-active').addClass('ui-corner-all'); });
                                        that._searchDelayed.cancelLastRequest();
                                        that._optionCache.filter('');
                                    } else {
                                        avListHeader.fadeTo('fast', 0.1, function() { $(this).css('visibility', 'hidden'); });
                                        $(this).removeClass('ui-corner-all').addClass('ui-corner-right ui-state-active');
                                        that._searchField.show('slide', {direction: 'right'}, 200, function() { $(this).focus(); });
                                        that._search();
                                    }
                                    return false;
                                })
                            )
                            .append( this._searchField = $('<input type="text" />').addClass('uix-search ui-widget-content ui-corner-left').hide()
                                .focus(function() { $(this).select(); })
                                .keyup(function() { that._searchDelayed.request(); })
                                //
                            )
                            .append( avListHeader = $('<div></div>').addClass('header-text') )

                        )
                        .append( avListContent  = $('<div></div>').addClass('uix-list-container ui-widget-content ui-corner-br') )
                )
                .insertAfter(this.element)
            ;

            this._buttons = {
                'search': btnSearch,
                'selectAll': btnSelectAll,
                'deselectAll': btnDeselectAll
            };
            this._headers = {
                'selected': selListHeader,
                'available': avListHeader
            };
            this._lists = {
                'selected': selListContent.attr('id', this.scope+'_selListContent'),
                'available': avListContent.attr('id', this.scope+'_avListContent')
            };

            this._applyListDroppable();

            this._optionCache = new OptionCache(this);
            this._searchDelayed = new SearchDelayed(this, {delay: 500});

            this.refresh();
        },

        /**
         * ***************************************
         *   PUBLIC
         * ***************************************
         */

        /**
         * Refresh all the lists from the underlaying element. This method is executed
         * asynchronously from the call, therefore it returns immediately. However, the
         * method accepts a callback parameter which will be executed when the refresh is
         * complete.
         *
         * @param callback   function    a callback function called when the refresh is complete
         */
        refresh: function(callback) {
            var that = this;

            setTimeout(function() {
                that._resize();
                that._optionCache.clear();

                var options = that.element[0].childNodes;
                var opt, optGroupIndex = 1;

                for (var i=0, l1=options.length; i<l1; i++) {
                    opt = options[i];
                    if (opt.nodeType == 1) {
                        if (opt.tagName.toUpperCase() == 'OPTGROUP') {
                            var optGroup = PRE_OPTGROUP + (optGroupIndex++);
                            var grpOptions = opt.childNodes;

                            that._optionCache.prepareGroup($(opt), optGroup);

                            for (var j=0, l2=grpOptions.length; j<l2; j++) {
                                opt = grpOptions[j];
                                if (opt.nodeType == 1) {
                                    that._optionCache.prepareOption($(opt), optGroup);
                                }
                            }
                        } else {
                            that._optionCache.prepareOption($(opt));  // add to default group
                        }
                    }
                }

                that._optionCache.reIndex();

                if (that._searchField.is(':visible')) {
                    that._search(null, true);
                }

                if (callback) callback();
            }, 10);

        },

        /**
         * Search the list of available items and filter them. If the parameter 'text' is
         * undefined, the actual value from the search field is used. If 'text' is specified,
         * the search field is updated.
         *
         * @param options string|object    (optional) the search options
         */
        search: function(options) {
            if (typeof options != 'object') {
                options = {showInput: true, text: options};
            }

            if ((options.toggleInput != false) && !this._searchField.is(':visible')) {
                this._buttons.search.trigger('click');
            }

            this._search(options.text, !!options.silent);
        },

        /**
         * Dynamically change the locale for the widget. If the specified locale is not
         * found, the default locale will be used. If locale is undefined, the current locale
         * will be returned
         */
        locale: function(locale) {

            if (locale == undefined) {
                return this.options.locale;
            } else {
                this._setLocale(locale);

                this._updateControls();
                this._updateHeaders();
            }
        },

        /**
         * ***************************************
         *   PRIVATE
         * ***************************************
         */

        _t: function(key, plural, data) {
            return _({locale:this.options.locale, key:key, plural:plural, data:data});
        },

        _search: function(text, silent) {
            if (this._searchField.is(':visible')) {
                if (text) {
                    this._searchField.val(text);
                } else {
                    text = this._searchField.val();
                }
            } else {
                text = (""+text);
            }

            this._optionCache.filter(text, silent);
        },

        _setLocale: function(locale) {
            if (locale == 'auto') {
                locale = navigator.userLanguage ||
                         navigator.language ||
                         navigator.browserLanguage ||
                         navigator.systemLanguage ||
                         '';
            }
            if (!$.uix.multiselect.i18n[locale]) {
                locale = '';   // revert to default is not supported auto locale
            }
            this.options.locale = locale;
        },

        _applyListDroppable: function() {
            if (this.options.selectionMode.indexOf('d&d') == -1) return;

            var that = this;

            var getElementData = function(d) {
                return that._optionCache._elements[d.data('element-index')];
            };

            this._lists['selected'].droppable({
                accept: function(draggable) {
                    return !getElementData(draggable).selected;  // not selected only
                },
                activeClass: 'ui-state-highlight',
                scope: this.scope,
                drop: function(evt, ui) {
                    ui.draggable.removeClass('ui-state-disabled');
                    ui.helper.remove();

                    that._optionCache.setSelected(getElementData(ui.draggable), true);
                }
            });

            if (this.options.sortable) {
                this._lists['selected'].sortable({
                    appendTo: 'parent',
                    axis: "y",
                    containment: $('.multiselect-selected-list', this._elementWrapper), //"parent",
                    items: '.multiselect-element-wrapper',
                    handle: '.group-element',
                    revert: true,
                    stop: function(evt, ui) {
                        var prevGroup;
                        $('.multiselect-element-wrapper', that._lists['selected']).each(function() {
                            var currGroup = that._optionCache._groups.get($(this).data('option-group'));
                            if (!prevGroup) {
                                that.element.append(currGroup.groupElement);
                            } else {
                                currGroup.groupElement.insertAfter(prevGroup.groupElement);
                            }
                            prevGroup = currGroup;
                        });
                    }
                });
            }

            this._lists['available'].droppable({
                accept: function(draggable) {
                    return getElementData(draggable).selected;  // selected only
                },
                activeClass: 'ui-state-highlight',
                scope: this.scope,
                drop: function(evt, ui) {
                    ui.draggable.removeClass('ui-state-disabled');
                    ui.helper.remove();

                    that._optionCache.setSelected(getElementData(ui.draggable), false);
                }
            });
        },

        _updateControls: function() {
            var that = this;
            $('.uix-control-left,.uix-control-right', this._elementWrapper).each(function() {
                $(this).attr('title', that._t( $(this).attr('data-localekey') ));
            });
        },

        _updateHeaders: function() {
            var info = this._optionCache.getSelectionInfo();

            this._headers['selected'].text( this._t('itemsSelected', info.selected, {count:info.selected}) );
            this._headers['available'].text( this._t('itemsAvailable', info.available, {count:info.available}) );
            //this._headers['available'].attr('title',  this._t(...., info.filtered, {count:info.filtered}) );

        },

        // call this method whenever the widget resizes
        _resize: function() {
            var separatorWidth = this.element.outerWidth() * this.options.splitRatio;

            this._elementWrapper.find('.multiselect-selected-list').width(separatorWidth);
            this._elementWrapper.find('.multiselect-available-list').css('margin-left', separatorWidth);

            this._searchField.width( this._headers['available'].parent().width() - 48 );
            this._lists['selected'].height(this.element.height() - this._headers['selected'].parent().height());
            this._lists['available'].height(this.element.height() - this._headers['available'].parent().height());

        },

        _setOption: function(key, value) {
            // Use the _setOption method to respond to changes to options
            switch(key) {
            }
            $.Widget.prototype._setOption.apply(this,arguments)
        },
        destroy: function() {
            // Use the destroy method to reverse everything your plugin has applied
            $.Widget.prototype.destroy.call(this);

            this._optionCache.clear();
            this._lists['selected'].remove();
            this._lists['available'].remove();
            this._elementWrapper.remove();

            delete this._optionCache;
            delete this._lists;
            delete this._elementWrapper;

            this.element.show();
        }
    });



    /**
     * Comparator registry.
     *
     * function(a, b, g)   where a is compared to b and g is true if they are groups
     */
    var ItemComparators = {
        /**
         * Naive general implementation
         */
        standard: function(a, b) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        },
        /*
         * Natural Sort algorithm for Javascript - Version 0.7 - Released under MIT license
         * Author: Jim Palmer (based on chunking idea from Dave Koelle)
         */
        natural: function naturalSort(a, b) {
            var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi,
                sre = /(^[ ]*|[ ]*$)/g,
                dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
                hre = /^0x[0-9a-f]+$/i,
                ore = /^0/,
                i = function(s) { return naturalSort.insensitive && (''+s).toLowerCase() || ''+s },
                // convert all to strings strip whitespace
                x = i(a).replace(sre, '') || '',
                y = i(b).replace(sre, '') || '',
                // chunk/tokenize
                xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
                yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
                // numeric, hex or date detection
                xD = parseInt(x.match(hre)) || (xN.length != 1 && x.match(dre) && Date.parse(x)),
                yD = parseInt(y.match(hre)) || xD && y.match(dre) && Date.parse(y) || null,
                oFxNcL, oFyNcL;
            // first try and sort Hex codes or Dates
            if (yD)
                if ( xD < yD ) return -1;
                else if ( xD > yD ) return 1;
            // natural sorting through split numeric strings and default strings
            for(var cLoc=0, numS=Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
                // find floats not starting with '0', string or 0 if not defined (Clint Priest)
                oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
                oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
                // handle numeric vs string comparison - number < string - (Kyle Adams)
                if (isNaN(oFxNcL) !== isNaN(oFyNcL)) { return (isNaN(oFxNcL)) ? 1 : -1; }
                // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
                else if (typeof oFxNcL !== typeof oFyNcL) {
                    oFxNcL += '';
                    oFyNcL += '';
                }
                if (oFxNcL < oFyNcL) return -1;
                if (oFxNcL > oFyNcL) return 1;
            }
            return 0;
        }
    };




    var SearchDelayed = function(widget, options) {
        this._widget = widget;
        this._options = options;
        this._lastSearchValue = null;
    };

    SearchDelayed.prototype = {
        request: function() {
            if (this._widget._searchField.val() == this._lastSearchValue) return;  // prevent searching twice same term

            var that = this;

            this.cancelLastRequest();

            this._timeout = setTimeout(function() {
                that._timeout = null;
                that._lastSearchValue = that._widget._searchField.val();

                that._widget._search();
            }, this._options.delay);
        },
        cancelLastRequest: function() {
            if (this._timeout) {
                clearTimeout(this._timeout);
            }
        }
    };


    var SortedMap = function(comp) {
        // private members

        var keys = [];
        var items = {};
        var comparator = comp;

        // public methods

        this.clear = function(comp) {
            keys = [];
            items = {};
            comparator = comp;
        };

        this.containsKey = function(key) {
            return items[key] ? true : false;
        };

        this.get = function(key) {
            return items[key];
        };

        /**
         * @Unused
        this.containsValue = function(val) {
            var found = false;
            $.each(items, function(k, v) {
                if (v == val) found = true;
            });
            return found;
        };
        */

        this.put = function(key, val) {
            if (!items[key]) {
                if (comparator) {
                    keys.splice((function() {
                        var low = 0, high = keys.length;
                        var mid = -1, c = 0;
                        while (low < high)   {
                            mid = parseInt((low + high)/2);
                            c = comparator(keys[mid], val);
                            if (c < 0)   {
                                low = mid + 1;
                            } else if (c > 0) {
                                high = mid;
                            } else {
                                return mid;
                            }
                        }
                        return low;
                    })(), 0, key);
                } else {
                    keys.push(key);
                }
            }

            items[key] = val;
        };

        this.each = function(callback) {
            var args = Array.prototype.slice.call(arguments, 1);
            args.splice(0, 0, null, null);
            for (var i=0, len=keys.length; i<len; i++) {
                args[0] = keys[i];
                args[1] = items[keys[i]];
                callback.apply(args[1], args);
            }
        };

        /**
         * @Unused
        this.first = function() {
            return keys[0];
        };
        */

        /**
         * @Unused
        this.last = function() {
            return keys[keys.length - 1];
        };
        */

        /**
         * Return the next key for the given one
         * @param key string
         * @return string
         */
        /**
         * @Unused
        this.next = function(key) {
            var index = keys.indexOf(key);

            if (index > keys.length - 2) return undefined;
            else return keys[index + 1];
        };
        */

        /**
         * Return the previous key for the given one
         * @param key string
         * @return string
         */
        /**
         * @Unused
        this.previous = function(key) {
            var index = keys.indexOf(key);

            if (index < 1) return undefined;
            else return keys[index - 1];
        };
        */

        /**
         * @Unused
        this.size = function() {
            return keys.length;
        };
        */
    };


    var DEF_OPTGROUP = '';
    var PRE_OPTGROUP = 'group-';

    var OptionCache = function(widget) {
        this._widget = widget;
        this._listContainers = {
            'selected': $('<div></div>').appendTo(this._widget._lists['selected']),
            'available': $('<div></div>').appendTo(this._widget._lists['available'])
        };

        this._elements = [];
        this._groups = new SortedMap(this.getComparator());

        this._moveEffect = {
            fn: widget.options.moveEffect,
            options: widget.options.moveEffectOptions,
            speed: widget.options.moveEffectSpeed
        };

        this._selectionMode = this._widget.options.selectionMode.indexOf('dblclick') > -1 ? 'dblclick'
                            : this._widget.options.selectionMode.indexOf('click') > -1 ? 'click' : false;
    };

    OptionCache.Options = {
        batchCount: 200,
        batchDelay: 50
    };

    OptionCache.prototype = {
        _createEventUI: function(data) {
            var that = this;

            return $.extend({
                optionCache: {
                    get: function(index) { return that.get(index).optionElement; },
                    size: function() { return that.size(); }
                }
            }, data);
        },

        _createDragHelper: function(e, optGroup) {
            return $('<div></div>')
                .addClass('dragged'+(optGroup==DEF_OPTGROUP?'':'-grouped')+'-element ui-widget ui-widget-content ui-state-active ui-corner-all')
                .data('option-group', optGroup)
                .append(e.clone())
                .width(e.outerWidth())
                .height(e.outerHeight())
                [0];
        },

        _createGroupElement: function(grpElement, optGroup, selected) {
            var that = this;
            var gData;

            var getLocalData = function() {
                if (!gData) gData = that._groups.get(optGroup);
                return gData;
            };

            var getGroupName = function() {
                return grpElement ? grpElement.attr('label') : that._widget.options.defaultGroupName;
            };

            var labelCount = $('<span></span>').addClass('label')
                .text(getGroupName() + ' (0)')
                .attr('title', getGroupName() + ' (0)');

            var fnUpdateCount = function() {
                var gDataDst = getLocalData()[selected?'selected':'available'];

                if (gDataDst.count == 0 && selected) {
                    gDataDst.listElement.hide();
                }

                var t = getGroupName() + ' (' + gDataDst.count + ')';
                labelCount.text(t).attr('title', t);
            };

            return $('<div></div>')
                // create an utility function to update group element count
                .data('fnUpdateCount', fnUpdateCount)
                .append($('<div></div>')
                    .addClass('ui-widget-header ui-priority-secondary group-element')
                    .append( $('<button></button>').addClass('uix-control-right')
                        .attr('data-localekey', (selected?'de':'')+'selectAllGroup')
                        .attr('title', this._widget._t((selected?'de':'')+'selectAllGroup'))
                        .button({icons:{primary:'ui-icon-arrowstop-1-'+(selected?'e':'w')}, text:false})
                        .click(function(e) {
                            e.preventDefault(); e.stopPropagation();

                            var gData = getLocalData();

                            if (gData[selected?'selected':'available'].count > 0) {
                                var _transferedOptions = [];

                                that._bufferedMode(true);
                                for (var i=gData.startIndex, len=gData.startIndex+gData.count, eData; i<len; i++) {
                                    eData = that._elements[i];
                                    if (!eData.filtered && !eData.selected != selected) {
                                        that.setSelected(eData, !selected, true);
                                        _transferedOptions.push(eData.optionElement[0]);
                                    }
                                }

                                that._updateGroupElements(gData);
                                that._widget._updateHeaders();

                                that._bufferedMode(false);

                                that._widget.element.trigger('change', that._createEventUI({ optionElements:_transferedOptions, selected:!selected}) );
                            }

                            return false;
                        })
                    )
                    .append(labelCount)
                )
            ;
        },

        _createGroupContainerElement: function(grpElement, optGroup, selected) {
            var that = this;
            var e = $('<div></div>');

            if (this._widget.options.sortable && selected) {
                e.sortable({
                    tolerance: "pointer",
                    appendTo: this._widget._elementWrapper,
                    connectWith: this._widget._lists['available'].attr('id'),
                    scope: this._widget.scope,
                    helper: function(evt) {
                        return that._createDragHelper($(evt.srcElement), optGroup);
                    },
                    beforeStop: function(evt, ui) {
                        var e = that._elements[ui.item.data('element-index')];
                        // FIX : this event occurs AFTER the element was deselcted, thus the sortable performs a "cancel" operation...
                        //       we need to reset the element back with buffered mode so it is silent!
                        if (!e.selected) {
                            that._bufferedMode(true);
                            that.setSelected(e, false, true);
                            that._bufferedMode(false);
                        }
                    },
                    stop: function(evt, ui) {
                        that._reorderSelected(optGroup);
                    },
                    revert: true
                });
            }

            return e;
        },

        _createElement: function(optElement, optGroup) {
            var o = this._widget.options.optionRenderer
                  ? this._widget.options.optionRenderer(optElement, optGroup)
                  : $('<div></div>').text(optElement.text());
            var e = $('<div></div>').append(o).addClass('ui-state-default option-element')
                .attr("unselectable", "on")  // disable text selection on this element (IE, Opera)
                .data('element-index', -1)
                .hover(
                    function() {
                        if (optElement.attr('selected')) $(this).removeClass('ui-state-highlight');
                        $(this).addClass('ui-state-hover');
                    },
                    function() {
                        $(this).removeClass('ui-state-hover');
                        if (optElement.attr('selected')) $(this).addClass('ui-state-highlight');
                    }
                );
            if (optElement.attr('disabled')) {
                e.addClass('ui-state-disabled');
            } else if (this._widget.options.selectionMode.indexOf('d&d') > -1) {
                var that = this;
                e.draggable({
                    appendTo: "body",
                    scope: this._widget.scope,
                    start: function(evt, ui) {
                        $(this).addClass('ui-state-disabled ui-state-active');
                    },
                    stop: function(evt, ui) {
                        $(this).removeClass('ui-state-disabled ui-state-active');
                    },
                    helper: function() {
                        return that._createDragHelper($(this).children(':last'), optGroup);
                    },
                    revert: 'invalid',
                    zIndex: 99999
                });
            }
            if (optGroup) {
                e.addClass('grouped-option').prepend($('<span></span>').addClass('ui-icon ui-icon-bullet'));
            }
            return e;
        },

        _isOptionCollapsed: function(eData) {
            return this._groups.get(eData.optionGroup)[eData.selected?'selected':'available'].collapsed;
        },

        _updateGroupElements: function(gData) {
            if (gData) {
                gData['selected'].count = 0;
                gData['available'].count = 0;
                for (var i=gData.startIndex, len=gData.startIndex+gData.count; i<len; i++) {
                    gData[this._elements[i].selected?'selected':'available'].count++;
                }
                gData['selected'].listElement.data('fnUpdateCount')();
                gData['available'].listElement.data('fnUpdateCount')();
            } else {
                this._groups.each(function(k,gData,that) {
                    that._updateGroupElements(gData);
                }, this);
            }
        },

        _appendToList: function(eData) {
            var that = this;
            var gData = this._groups.get(eData.optionGroup);

            var gDataDst = gData[eData.selected?'selected':'available'];

            if ((eData.optionGroup != this._widget.options.defaultGroupName) || this._widget.options.showDefaultGroupHeader) {
                gDataDst.listElement.show();
            }
            gDataDst.listContainer.show(); // animate show?

            if (eData.selected && this._widget.options.sortable) {
                gDataDst.listContainer.append(eData.listElement);
            } else {
                var insertIndex = eData.index - 1;
                while ((insertIndex >= gData.startIndex) &&
                       (this._elements[insertIndex].selected != eData.selected)) {
                    insertIndex--;
                }

                if (insertIndex < gData.startIndex) {
                    gDataDst.listContainer.prepend(eData.listElement);
                } else {
                    var prev = this._elements[insertIndex].listElement;
                    // FIX : if previous element is animated, get it's animated parent as reference
                    if (prev.parent().hasClass('ui-effects-wrapper')) {
                        prev = prev.parent();
                    }
                    eData.listElement.insertAfter(prev);
                }
            }
            eData.listElement[(eData.selected?'add':'remove')+'Class']('ui-state-highlight');

            if (eData.listElement.is(":ui-draggable")) {
                eData.listElement
                    .draggable('option', 'disabled', this._widget.options.sortable && eData.selected)
                    .removeClass('ui-state-disabled')
                ;
            }

            if ((eData.selected || !eData.filtered) && !this._isOptionCollapsed(eData) && this._moveEffect && this._moveEffect.fn) {
                eData.listElement.hide().show(this._moveEffect.fn, this._moveEffect.options, this._moveEffect.speed);
            }
        },

        _reorderSelected: function(optGroup) {
            // FIXME : selected elements order are not preserved if elements can be sorted!
            var e = this._elements;
            var g = this._groups.get(optGroup);
            var container = g.groupElement ? g.groupElement : this._widget.element;
            var prevElement;
            $('.option-element', g['selected'].listContainer).each(function() {
                var currElement = e[$(this).data('element-index')].optionElement;
                if (!prevElement) {
                    container.prepend(currElement);
                } else {
                    currElement.insertAfter(prevElement);
                }
                prevElement = currElement;
            });
        },

        _bufferedMode: function(enabled) {
            if (enabled) {
                this._oldMoveEffect = this._moveEffect; this._moveEffect = null;

                // backup lists' scroll position before going into buffered mode
                this._widget._lists['selected'].data('scrollTop', this._widget._lists['selected'].scrollTop());
                this._widget._lists['available'].data('scrollTop', this._widget._lists['available'].scrollTop());

                this._listContainers['selected'].detach();
                this._listContainers['available'].detach();
            } else {
                // restore scroll position (if available)
                this._widget._lists['selected'].append(this._listContainers['selected'])
                        .scrollTop( this._widget._lists['selected'].data('scrollTop') || 0 );
                this._widget._lists['available'].append(this._listContainers['available'])
                        .scrollTop( this._widget._lists['available'].data('scrollTop') || 0 );

                this._moveEffect = this._oldMoveEffect;

                delete this._oldMoveEffect;
            }

        },


        clear: function() {
            this._elements = [];
            this._groups.clear(this.getComparator());
            this._listContainers['selected'].empty();
            this._listContainers['available'].empty();

            this.prepareGroup();  // reset default group
        },

        getComparator: function() {
            return this._widget.options.sortMethod
                 ? typeof this._widget.options.sortMethod == 'function'
                   ? this._widget.options.sortMethod
                   : ItemComparators[this._widget.options.sortMethod]
                 : null;
        },

        // prepare option group to be rendered (should call reIndex after this!)
        prepareGroup: function(grpElement, optGroup) {
            optGroup = optGroup || DEF_OPTGROUP;
            if (!this._groups.containsKey[optGroup]) {
                //var groupLabel = grpElement ? grpElement.attr('label') : this._widget.options.defaultGroupName;
                this._groups.put(optGroup, {
                    startIndex: -1,
                    count: 0,
                    'selected': {
                        collapsed: false,
                        count: 0,
                        listElement: this._createGroupElement(grpElement, optGroup, true),
                        listContainer: this._createGroupContainerElement(grpElement, optGroup, true)
                    },
                    'available': {
                        collapsed: false,
                        count: 0,
                        listElement: this._createGroupElement(grpElement, optGroup, false),
                        listContainer: this._createGroupContainerElement(grpElement, optGroup, false)
                    },
                    groupElement: grpElement,
                    optionGroup: optGroup     // for back ref
                });
            }
        },

        // prepare option element to be rendered (must call reIndex after this!)
        // If optGroup is defined, prepareGroup(optGroup) should have been called already
        prepareOption: function(optElement, optGroup) {
            optGroup = optGroup || DEF_OPTGROUP;
            this._elements.push({
                index: -1,
                selected: !!optElement.attr('selected'),
                filtered: false,
                listElement: this._createElement(optElement, optGroup),
                optionElement: optElement,
                optionGroup: optGroup
            });
        },

        reIndex: function() {
            // note : even if not sorted, options are added as they appear,
            //        so they should be grouped just fine anyway!
            var comparator = this.getComparator();
            if (comparator) {
                this._elements.sort(function(a, b) {
                    if (a.optionGroup || b.optionGroup) {
                        // sort groups
                        var g = comparator(a.optionGroup, b.optionGroup);
                        if (g != 0) return g;
                    }
                    return comparator(a.optionElement.text(), b.optionElement.text());
                });
            }

            this._bufferedMode(true);

            this._groups.each(function(g, v, l, showDefGroupName) {
                var wrapper_selected = $('<div></div>').addClass('multiselect-element-wrapper').data('option-group', g);
                var wrapper_available = $('<div></div>').addClass('multiselect-element-wrapper').data('option-group', g);
                wrapper_selected.append(v.selected.listElement.hide());
                if (g != DEF_OPTGROUP || (g == DEF_OPTGROUP && showDefGroupName)) {
                    wrapper_available.append(v['available'].listElement.show());
                }
                wrapper_selected.append(v['selected'].listContainer);
                wrapper_available.append(v['available'].listContainer);

                l['selected'].append(wrapper_selected);
                l['available'].append(wrapper_available);
            }, this._listContainers, this._widget.options.showDefaultGroupHeader);

            for (var i=0, eData, gData, len=this._elements.length; i<len; i++) {
                eData = this._elements[i];
                gData = this._groups.get(eData.optionGroup);

                // update group index and count info
                if (gData.startIndex == -1 || gData.startIndex > i) {
                    gData.startIndex = i;
                    gData.count = 1;
                } else {
                    gData.count++;
                }

                // save element index for back ref
                eData.listElement.data('element-index', eData.index = i);

                this._appendToList(eData);
            }

            this._updateGroupElements();
            this._widget._updateHeaders();

            this._bufferedMode(false);

        },

        size: function() {
            return this._elements.length;
        },

        filter: function(text, silent) {

            this._bufferedMode(true);

            var count = this._elements.length;

            text = (''+text).toLowerCase();
            if (text.length == 0) {
                text = false;
            }

            for (var i=0, eData, filtered; i<count; i++) {
                eData = this._elements[i];
                filtered = !(!text || (eData.optionElement.text().toLowerCase().indexOf(text) > -1));

                if (!eData.selected && (eData.filtered != filtered) && !this._isOptionCollapsed(eData)) {
                    eData.listElement[filtered ? 'hide' : 'show']();
                }

                eData.filtered = filtered;
            }

            this._widget._updateHeaders();
            this._bufferedMode(false);

            if (text && !silent) {
                this._widget.element.trigger('multiselectsearch', this._createEventUI({ text:text }) );
            }
        },

        getSelectionInfo: function() {
            var info = { selected: 0, available: 0, filtered: 0 };

            for (var i=0, len=this._elements.length; i<len; i++) {
                var eData = this._elements[i];

                if (eData.selected) {
                    info.selected++;
                } else if (eData.filtered) {
                    info.filtered++;
                } else {
                    info.available++;
                }
            }

            return info;
        },

        setSelected: function(eData, selected, silent) {
            if (eData.optionElement.attr('disabled') && selected) {
                return;
            }

            eData.selected = selected;
            if (selected) {
                eData.optionElement.attr('selected', true);
            } else {
                eData.optionElement.removeAttr('selected');
            }

            this._appendToList(eData);

            if (!silent) {
                if (this._widget.options.sortable && selected) {
                    this._reorderSelected(eData.optionGroup);
                }
                this._updateGroupElements(this._groups.get(eData.optionGroup));
                this._widget._updateHeaders();
                this._widget.element.trigger('change', this._createEventUI({ optionElements:[eData.optionElement[0]], selected:selected }) );
            }
        },

        // utility function to select all options
        setSelectedAll: function(selected) {
            var _transferedOptions = [];
            var _modifiedGroups = {};

            this._bufferedMode(true);

            for (var i=0, eData, len=this._elements.length; i<len; i++) {
                eData = this._elements[i];
                if (!((eData.selected == selected) || (eData.optionElement.attr('disabled') || (selected && (eData.filtered || eData.selected))))) {
                    this.setSelected(eData, selected, true);
                    _transferedOptions.push(eData.optionElement[0]);
                    _modifiedGroups[eData.optionGroup] = true;
                }
            }

            if (this._widget.options.sortable && selected) {
                var that = this;
                $.each(_modifiedGroups, function(g) {  that._reorderSelected(g); });
            }

            this._updateGroupElements();
            this._widget._updateHeaders();
            this._bufferedMode(false);

            this._widget.element.trigger('change', this._createEventUI({ optionElements:_transferedOptions, selected:selected }) );
        }

    };

    /**
     * Expects paramter p to be
     *
     *   locale        (string) the locale to use (default = '')
     *   key           (string) the locale string key
     *   plural        (int)    the plural value to use
     *   data          (object) the data object to use as variables
     *
     */
    function _(p) {
        var locale = $.uix.multiselect.i18n[p.locale] ? p.locale : '';
        var i18n = $.uix.multiselect.i18n[locale];
        var plural = p.plural || 0;
        var data = p.data || {};
        var t;

        if (plural == 2 && i18n[p.key+'_plural_two']) {
            t = i18n[p.key+'_plural_two'];
        } else if ((plural == 2 || plural == 3) && i18n[p.key+'_plural_few']) {
            t = i18n[p.key+'_plural_few']
        } else if (plural > 1 && i18n[p.key+'_plural']) {
            t = i18n[p.key+'_plural'];
        } else {
            t = i18n[p.key] || '';
        }

        for (var v in data) {
            t = t.replace(new RegExp('{'+v+'}', 'g'), data[v]);
        }

        return t;
    };

    /**
     * Default translation
     */
    $.uix.multiselect.i18n = {
        '': {
            itemsSelected: '{count} selected option',          // 0, 1
            itemsSelected_plural: '{count} selected options',  // n
            //itemsSelected_plural_two: ...                    // 2
            //itemsSelected_plural_few: ...                    // 3, 4
            itemsAvailable: '{count} available option',
            itemsAvailable_plural: '{count} available options',
            //itemsAvailable_plural_two: ...
            //itemsAvailable_plural_few: ...
            selectAll: 'Select All',
            deselectAll: 'Deselect All',
            search: 'Search Options',
            collapseGroup: 'Collapse Group',
            expandGroup: 'Expand Group',
            selectAllGroup: 'Select All Group',
            deselectAllGroup: 'Deselect All Group'
        }
    };

})(jQuery);
