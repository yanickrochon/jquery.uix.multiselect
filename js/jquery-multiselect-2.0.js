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
 */

(function($) {
    var globalScope = 0;

    var DEF_OPTGROUP = '';
    var PRE_OPTGROUP = 'group-';

    var EVENT_CHANGE = 'multiselectChange';
    var EVENT_SEARCH = 'multiselectSearch';

    // The jQuery.uix namespace will automatically be created if it doesn't exist
    $.widget("uix.multiselect", {
        options: {
            collapsableGroups: true,       // tells whether the option groups can be collapsed or not (default: true)
            defaultGroupName: '',          // the name of the default option group (default: '')
            filterSelected: false,         // when searching, filter selected options also? (default: false)
            locale: 'auto',                // any valid locale, 'auto', or '' for default built-in strings (default: 'auto')
            moveEffect: null,              // 'blind','bounce','clip','drop','explode','fold','highlight','puff','pulsate','shake','slide' (default: null)
            moveEffectOptions: {},         // effect options (see jQuery UI documentation) (default: {})
            moveEffectSpeed: null,         // string ('slow','fast') or number in millisecond (ignored if moveEffect is 'show') (default: null)
            optionRenderer: false,         // a function that will return the item element to be rendered in the list (default: false)
            rtl: false,                    // if set to true, put selected list to the right hand side of the widget (default: false)
            searchField: 'toggle',         // false, true, 'toggle'; set the search field behaviour (default: 'toggle')
            selectionMode: 'click,d&d',    // how options can be selected separated by commas: 'click', "dblclick" and 'd&d' (default: 'dblclick,d&d')
            showDefaultGroupHeader: false, // show the default option group header (default: false)
            showEmptyGroups: false,        // always display option groups even if empty (default: false)
            splitRatio: 0.55,              // % of the left list's width of the widget total width (default 0.55)
            sortable: false,               // if the selected list should be user sortable or not
            sortMethod: null               // null, 'standard', 'natural'; a sort function name (see ItemComparators), or a custom function (default: null)
        },

        _create: function() {
            var that = this;
            var selListHeader, selListContent, avListHeader, avListContent;
            var btnSelectAll, btnDeselectAll;

            this.scope = 'multiselect' + (globalScope++);
            this.optionGroupIndex = 1;
            this._setLocale(this.options.locale);

            this.element.addClass('uix-multiselect-original');
            this._elementWrapper = $('<div></div>').addClass('uix-multiselect ui-widget')
                .css({
                    'width': this.element.outerWidth(),
                    'height': this.element.outerHeight()
                })
                .append(
                    $('<div></div>').addClass('multiselect-selected-list')
                        .append( $('<div></div>').addClass('ui-widget-header ui-corner-t' + (this.options.rtl?'r':'l'))
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
                [this.options.rtl?'prepend':'append'](
                    $('<div></div>').addClass('multiselect-available-list')
                        .append( $('<div></div>').addClass('ui-widget-header ui-corner-t' + (this.options.rtl?'l':'r'))
                            .append( btnSelectAll = $('<button></button>').addClass('uix-control-right')
                                .attr('data-localekey', 'selectAll')
                                .attr('title', this._t('selectAll'))
                                .button({icons:{primary:'ui-icon-arrowthickstop-1-w'}, text:false})
                                .click(function(e) { e.preventDefault(); e.stopPropagation(); that._optionCache.setSelectedAll(true); return false; })
                            )
                            .append( avListHeader = $('<div></div>').addClass('header-text') )

                        )
                        .append( avListContent  = $('<div></div>').addClass('uix-list-container ui-widget-content ui-corner-br') )
                )
                .insertAfter(this.element)
            ;

            this._buttons = {
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

            this._initSearchable();

            this._optionCache = new OptionCache(this);
            this._searchDelayed = new SearchDelayed(this, {delay: 500});

            this._applyListDroppable();

            this._resize();  // just make sure we display the widget right without delay
            this.refresh();
        },

        _initSearchable: function() {
            var isToggle = ('toggle' === this.options.searchField);
            if (isToggle) {
                var that = this;
                this._buttons['search'] = $('<button></button').addClass('uix-control-right')
                    .attr('data-localekey', 'search')
                    .attr('title', this._t('search'))
                    .button({icons:{primary:'ui-icon-search'}, text:false})
                    .click(function(e) {
                        e.preventDefault(); e.stopPropagation();
                        if (that._searchField.is(':visible')) {
                            var b = $(this);
                            that._headers['available'].css('visibility', 'visible').fadeTo('fast', 1.0);
                            that._searchField.hide('slide', {direction: 'right'}, 200, function() { b.removeClass('ui-corner-right ui-state-active').addClass('ui-corner-all'); });
                            that._searchDelayed.cancelLastRequest();
                            that._optionCache.filter('');
                        } else {
                            that._headers['available'].fadeTo('fast', 0.1, function() { $(this).css('visibility', 'hidden'); });
                            $(this).removeClass('ui-corner-all').addClass('ui-corner-right ui-state-active');
                            that._searchField.show('slide', {direction: 'right'}, 200, function() { $(this).focus(); });
                            that._search();
                        }
                        return false;
                    })
                    .insertBefore( this._headers['available'] );
            }
            if (this.options.searchField) {
                if (!isToggle) {
                    this._headers['available'].hide();
                }
                this._searchField = $('<input type="text" />').addClass('uix-search ui-widget-content ui-corner-' + (isToggle ? 'left' : 'all'))[isToggle ? 'hide' : 'show']()
                    .focus(function() { $(this).select(); })
                    .keyup(function() { that._searchDelayed.request(); })
                    .insertBefore( this._headers['available'] );
            }
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
            AsyncFunction(function() {
                this._resize();
                this._optionCache.cleanup();

                var opt, options = this.element[0].childNodes;

                for (var i=0, l1=options.length; i<l1; i++) {
                    opt = options[i];
                    if (opt.nodeType == 1) {
                        if (opt.tagName.toUpperCase() == 'OPTGROUP') {
                            var optGroup = $(opt).data('option-group') || (PRE_OPTGROUP + (this.optionGroupIndex++));
                            var grpOptions = opt.childNodes;

                            this._optionCache.prepareGroup($(opt), optGroup);

                            for (var j=0, l2=grpOptions.length; j<l2; j++) {
                                opt = grpOptions[j];
                                if (opt.nodeType == 1) {
                                    this._optionCache.prepareOption($(opt), optGroup);
                                }
                            }
                        } else {
                            this._optionCache.prepareOption($(opt));  // add to default group
                        }
                    }
                }

                this._optionCache.reIndex();

                if (this._searchField && this._searchField.is(':visible')) {
                    this._search(null, true);
                }

                if (callback) callback();
            }, 10, this);

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

            var _optionCache = this._optionCache;
            var currentScope = this.scope;

            var getElementData = function(d) {
                return _optionCache._elements[d.data('element-index')];
            };

            var initDroppable = function(e, s) {
                e.droppable({
                    accept: function(draggable) {
                        var eData = getElementData(draggable);
                        return eData && (eData.selected != s);  // from different seleciton only
                    },
                    activeClass: 'ui-state-highlight',
                    scope: currentScope,
                    drop: function(evt, ui) {
                        ui.draggable.removeClass('ui-state-disabled');
                        ui.helper.remove();
                        _optionCache.setSelected(getElementData(ui.draggable), s);
                    }
                });
            }

            initDroppable(this._lists['selected'], true);
            initDroppable(this._lists['available'], false);

            if (this.options.sortable) {
                var that = this;
                this._lists['selected'].sortable({
                     appendTo: 'parent',
                     axis: "y",
                     containment: $('.multiselect-selected-list', this._elementWrapper), //"parent",
                     items: '.multiselect-element-wrapper',
                     handle: '.group-element',
                     revert: true,
                     stop: $.proxy(function(evt, ui) {
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
                     }, this)
                 });
            }
        },

        _updateControls: function() {
            var that = this;
            $('.uix-control-left,.uix-control-right', this._elementWrapper).each(function() {
                $(this).attr('title', that._t( $(this).attr('data-localekey') ));
            });
        },

        _updateHeaders: function() {
            var t, info = this._optionCache.getSelectionInfo();

            this._headers['selected']
                .text( t = this._t('itemsSelected', info.selected.total, {count:info.selected.total}) )
                .parent().attr('title',
                    this.options.filterSelected
                    ? this._t('itemsSelected', info.selected.count, {count:info.selected.count}) + ", " +
                      this._t('itemsFiltered', info.selected.filtered, {count:info.selected.filtered})
                    : t
                );
            this._headers['available']
                .text( this._t('itemsAvailable', info.available.total, {count:info.available.total}) )
                .parent().attr('title',
                    this._t('itemsAvailable', info.available.count, {count:info.available.count}) + ", " +
                    this._t('itemsFiltered', info.available.filtered, {count:info.available.filtered}) );
        },

        // call this method whenever the widget resizes
        _resize: function() {
            var leftWidth = this.element.outerWidth() * this.options.splitRatio;
            var rightWidth = this.element.outerWidth() - leftWidth;

            this._elementWrapper.find('.multiselect-' + (this.options.rtl ? 'available' : 'selected') + '-list').width(leftWidth).css('left', 0);
            this._elementWrapper.find('.multiselect-' + (this.options.rtl ? 'selected' : 'available') + '-list').width(rightWidth).css('left', leftWidth);

            if (this._searchField) {
                var isToggle = ('toggle' === this.options.searchField);
                this._searchField.width( this._headers['available'].parent().width() - (isToggle ? 48 : 24) );
                if (!isToggle) {
                    this._headers['available'].parent().height(this._headers['selected'].parent().height() + 1);
                }
            }
            this._lists['selected'].height(this.element.height() - this._headers['selected'].parent().height() - 5);
            this._lists['available'].height(this.element.height() - this._headers['available'].parent().height() - 5);
        },

        /**
         * return false if the event was prevented by an handler, true otherwise
         */
        _triggerUIEvent: function(event, ui) {
            if (typeof event == 'string') {
                event = $.Event(event);
            }

            this.element.trigger(event, ui);

            return !event.isDefaultPrevented();
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

            this.element.removeClass('uix-multiselect-original');
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


    /**
     * setTimeout on steroids!
     */
    var AsyncFunction = function(callback, timeout, self) {
        var args = Array.prototype.slice.call(arguments, 3);
        return setTimeout(function() {
            callback.apply(self || window, args);
        }, timeout);
    };


    var SearchDelayed = function(widget, options) {
        this._widget = widget;
        this._options = options;
        this._lastSearchValue = null;
    };

    SearchDelayed.prototype = {
        request: function() {
            if (this._widget._searchField.val() == this._lastSearchValue) return;  // prevent searching twice same term

            this.cancelLastRequest();

            this._timeout = AsyncFunction(function() {
                this._timeout = null;
                this._lastSearchValue = this._widget._searchField.val();

                this._widget._search();
            }, this._options.delay, this);
        },
        cancelLastRequest: function() {
            if (this._timeout) {
                clearTimeout(this._timeout);
            }
        }
    };

    /**
     * Map of all option groups
     */
    var GroupCache = function(comp) {
        // private members

        var keys = [];
        var items = {};
        var comparator = comp;

        // public methods

        this.clear = function() {
            keys = [];
            items = {};
            return this;
        };

        this.containsKey = function(key) {
            return !!items[key];
        };

        this.get = function(key) {
            return items[key];
        };

        this.put = function(key, val) {
            if (!items[key]) {
                if (comparator) {
                    keys.splice((function() {
                        var low = 0, high = keys.length;
                        var mid = -1, c = 0;
                        while (low < high) {
                            mid = parseInt((low + high)/2);
                            var a = items[keys[mid]].groupElement;
                            var b = val.groupElement;
                            c = comparator(a ? a.attr('label') : DEF_OPTGROUP, b ? b.attr('label') : DEF_OPTGROUP);
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
            return this;
        };

        this.remove = function(key) {
            delete items[key];
            return keys.splice(keys.indexOf(key), 1);
        };

        this.each = function(callback) {
            var args = Array.prototype.slice.call(arguments, 1);
            args.splice(0, 0, null, null);
            for (var i=0, len=keys.length; i<len; i++) {
                args[0] = keys[i];
                args[1] = items[keys[i]];
                callback.apply(args[1], args);
            }
            return this;
        };

    };

    var OptionCache = function(widget) {
        this._widget = widget;
        this._listContainers = {
            'selected': $('<div></div>').appendTo(this._widget._lists['selected']),
            'available': $('<div></div>').appendTo(this._widget._lists['available'])
        };

        this._elements = [];
        this._groups = new GroupCache();

        this._moveEffect = {
            fn: widget.options.moveEffect,
            options: widget.options.moveEffectOptions,
            speed: widget.options.moveEffectSpeed
        };

        this._selectionMode = this._widget.options.selectionMode.indexOf('dblclick') > -1 ? 'dblclick'
                            : this._widget.options.selectionMode.indexOf('click') > -1 ? 'click' : false;

        this.clear();
    };

    OptionCache.Options = {
        batchCount: 200,
        batchDelay: 50
    };

    OptionCache.prototype = {
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

                gDataDst.listElement[(!selected && (gDataDst.count || that._widget.options.showEmptyGroups)) || (gDataDst.count && ((gData.optionGroup != DEF_OPTGROUP) || that._widget.options.showDefaultGroupHeader)) ? 'show' : 'hide']();

                var t = getGroupName() + ' (' + gDataDst.count + ')';
                labelCount.text(t).attr('title', t);
            };

            var e = $('<div></div>')
                .addClass('ui-widget-header ui-priority-secondary group-element')
                .append( $('<button></button>').addClass('uix-control-right')
                    .attr('data-localekey', (selected?'de':'')+'selectAllGroup')
                    .attr('title', this._widget._t((selected?'de':'')+'selectAllGroup'))
                    .button({icons:{primary:'ui-icon-arrowstop-1-'+(selected?'e':'w')}, text:false})
                    .click(function(e) {
                        e.preventDefault(); e.stopPropagation();

                        var gDataDst = getLocalData()[selected?'selected':'available'];

                        if (gData.count > 0) {
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

                            that._widget._triggerUIEvent(EVENT_CHANGE, { optionElements:_transferedOptions, selected:!selected} );
                        }

                        return false;
                    })
                )
                .append(labelCount)
            ;

            var fnToggle;
            if (this._widget.options.collapsableGroups) {
                var h = $('<span></span>').addClass('ui-icon collapse-handle')
                    .attr('data-localekey', 'collapseGroup')
                    .attr('title', this._widget._t('collapseGroup'))
                    .addClass('ui-icon-triangle-1-s')
                    .mousedown(function(e) { e.stopPropagation(); })
                    .click(function(e) { e.preventDefault(); e.stopPropagation(); fnToggle(); return false; })
                    .prependTo(e.addClass('group-element-collapsable'))
                ;

                fnToggle = function() {
                    var gDataDst = getLocalData()[selected?'selected':'available'];
                    gDataDst.collapsed = !gDataDst.collapsed;
                    gDataDst.listContainer.slideToggle();  // animate options?
                    h.removeClass('ui-icon-triangle-1-' + (gDataDst.collapsed ? 's' : 'e'))
                     .addClass('ui-icon-triangle-1-' + (gDataDst.collapsed ? 'e' : 's'));
                };
            }
            return $('<div></div>')
                // create an utility function to update group element count
                .data('fnUpdateCount', fnUpdateCount)
                .data('fnToggle', fnToggle || $.noop)
                .append(e)
            ;
        },

        _createGroupContainerElement: function(grpElement, optGroup, selected) {
            var that = this;
            var e = $('<div></div>');
            var _received_index;

            if (this._widget.options.sortable && selected) {
                e.sortable({
                    tolerance: "pointer",
                    appendTo: this._widget._elementWrapper,
                    connectWith: this._widget._lists['available'].attr('id'),
                    scope: this._widget.scope,
                    helper: 'clone',
                    receive: function(evt, ui) {
                        var e = that._elements[_received_index = ui.item.data('element-index')];

                        e.selected = true;
                        e.optionElement.prop('selected', true);
                        e.listElement.removeClass('ui-state-active');
                    },
                    stop: function(evt, ui) {
                        if (_received_index) {
                            var e = that._elements[_received_index];
                            ui.item.replaceWith(e.listElement.addClass('ui-state-highlight').draggable('disable').removeClass('ui-state-disabled'));
                            that._reorderSelected(e.optionGroup);
                            that._widget._updateHeaders();
                            _received_index = undefined;
                        } else {
                            var e = that._elements[ui.item.data('element-index')];
                            if (e && !e.selected) {
                                that._bufferedMode(true);
                                that._appendToList(e);
                                that._bufferedMode(false);
                            }
                        }
                    },
                    revert: true
                });
            }

            if (this._selectionMode) {
                $(e).on(this._selectionMode, 'div.option-element', function() {
                    var eData = that._elements[$(this).data('element-index')];
                    eData.listElement.removeClass('ui-state-hover');
                    that.setSelected(eData, !selected);
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
                        if (optElement.prop('selected')) $(this).removeClass('ui-state-highlight');
                        $(this).addClass('ui-state-hover');
                    },
                    function() {
                        $(this).removeClass('ui-state-hover');
                        if (optElement.prop('selected')) $(this).addClass('ui-state-highlight');
                    }
                );
            if (optElement.attr('disabled')) {
                e.addClass('ui-state-disabled');
            } else if (this._widget.options.selectionMode.indexOf('d&d') > -1) {
                var that = this;
                e.draggable({
                    addClasses: false,
                    appendTo: this._widget._elementWrapper,
                    scope: this._widget.scope,
                    start: function(evt, ui) {
                        $(this).addClass('ui-state-disabled ui-state-active');
                        ui.helper.width($(this).width()).height($(this).height());
                    },
                    stop: function(evt, ui) {
                        $(this).removeClass('ui-state-disabled ui-state-active');
                    },
                    helper: 'clone',
                    revert: 'invalid',
                    zIndex: 99999
                });

                if (this._widget.options.sortable) {
                    e.draggable('option', 'connectToSortable', this._groups.get(optGroup)['selected'].listContainer);
                }
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
            if (gDataDst.collapsed) {
                gDataDst.listElement.data('fnToggle')(); // animate show?
            } else {
                gDataDst.listContainer.show();
            }

            if (eData.selected && this._widget.options.sortable) {
                gDataDst.listContainer.append(eData.listElement/*.draggable('disable')*/);
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
            } else if (eData.filtered) {
                eData.listElement.hide();
            }
        },

        _reorderSelected: function(optGroup) {
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

        // should call _reIndex after this
        cleanup: function() {
            var p = this._widget.element[0];
            var _groupsRemoved = [];
            this._groups.each(function(g,v) {
                if (v.groupElement && !$.contains(p, v.groupElement[0])) {
                    _groupsRemoved.push(g);
                }
            });
            for (var i=0, eData; i<this._elements.length; i++) {
                eData = this._elements[i];
                if (!$.contains(p, eData.optionElement[0]) || ($.inArray(eData.optionGroup, _groupsRemoved) > -1)) {
                    this._elements.splice(i--, 1)[0].listElement.remove();
                }
            }
            for (var i=0, len=_groupsRemoved.length; i<len; i++) {
                this._groups.remove(_groupsRemoved[i]);
            }

            this.prepareGroup();  // make sure we have the default group still!
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
            if (!this._groups.containsKey(optGroup)) {
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
            if (optElement.data('element-index') === undefined) {
                optGroup = optGroup || DEF_OPTGROUP;
                this._elements.push({
                    index: -1,
                    selected: false,
                    filtered: false,
                    listElement: this._createElement(optElement, optGroup),
                    optionElement: optElement,
                    optionGroup: optGroup
                });
            }
        },

        reIndex: function() {
            // note : even if not sorted, options are added as they appear,
            //        so they should be grouped just fine anyway!
            var comparator = this.getComparator();
            if (comparator) {
                var _groups = this._groups;
                this._elements.sort(function(a, b) {
                    // sort groups
                    var ga = _groups.get(a.optionGroup).groupElement;
                    var gb = _groups.get(b.optionGroup).groupElement;
                    var g = comparator(ga ? ga.attr('label') : DEF_OPTGROUP, gb ? gb.attr('label') : DEF_OPTGROUP);
                    if (g != 0) return g;
                    else        return comparator(a.optionElement.text(), b.optionElement.text());
                });
            }

            this._bufferedMode(true);

            this._groups.each(function(g, v, l, showDefGroupName) {
                if (!(v.groupElement && v.groupElement.data('option-group'))) {
                    if (v.groupElement) {
                        v.groupElement.data('option-group', g);  // for back ref
                    }

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
                }
                v.count = 0;
            }, this._listContainers, this._widget.options.showDefaultGroupHeader);

            for (var i=0, eData, gData, len=this._elements.length; i<len; i++) {
                eData = this._elements[i];
                gData = this._groups.get(eData.optionGroup);

                // update group index and count info
                if (gData.startIndex == -1 || gData.startIndex >= i) {
                    gData.startIndex = i;
                    gData.count = 1;
                } else {
                    gData.count++;
                }

                // save element index for back ref
                eData.listElement.data('element-index', eData.index = i);

                if (eData.optionElement.data('element-index') == undefined || eData.selected != eData.optionElement.prop('selected')) {
                    eData.selected = eData.optionElement.prop('selected');
                    eData.optionElement.data('element-index', i);  // also save for back ref here

                    this._appendToList(eData);
                }
            }

            this._updateGroupElements();
            this._widget._updateHeaders();
            this._groups.each(function(g,v,t) { t._reorderSelected(g); }, this);

            this._bufferedMode(false);

        },

        filter: function(text, silent) {

            if (text && !silent) {
                var ui = { text:text };
                if (this._widget._triggerUIEvent(EVENT_SEARCH, ui )) {
                    text = ui.text;  // update text
                } else {
                    return;
                }
            }

            this._bufferedMode(true);

            var filterSelected = this._widget.options.filterSelected;

            text = (''+text).toLowerCase();
            if (text.length == 0) {
                text = false;
            }

            for (var i=0, eData, len=this._elements.length, filtered; i<len; i++) {
                eData = this._elements[i];
                filtered = !(!text || (eData.optionElement.text().toLowerCase().indexOf(text) > -1));

                if ((!eData.selected || filterSelected) && (eData.filtered != filtered)) {
                    eData.listElement[filtered ? 'hide' : 'show']();
                    eData.filtered = filtered;
                } else if (eData.selected) {
                    eData.filtered = false;
                }
            }

            this._widget._updateHeaders();
            this._bufferedMode(false);

        },

        getSelectionInfo: function() {
            var info = {'selected': {'total': 0, 'count': 0, 'filtered': 0}, 'available': {'total': 0, 'count': 0, 'filtered': 0} };

            for (var i=0, len=this._elements.length; i<len; i++) {
                var eData = this._elements[i];
                info[eData.selected?'selected':'available'][eData.filtered?'filtered':'count']++;
                info[eData.selected?'selected':'available'].total++;
            }

            return info;
        },

        setSelected: function(eData, selected, silent) {
            if (eData.optionElement.attr('disabled') && selected) {
                return;
            }

            eData.optionElement.prop('selected', eData.selected = selected);

            this._appendToList(eData);

            if (!silent) {
                if (this._widget.options.sortable && selected) {
                    this._reorderSelected(eData.optionGroup);
                }
                this._updateGroupElements(this._groups.get(eData.optionGroup));
                this._widget._updateHeaders();
                this._widget._triggerUIEvent(EVENT_CHANGE, { optionElements:[eData.optionElement[0]], selected:selected } );
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

            this._widget._triggerUIEvent(EVENT_CHANGE, { optionElements:_transferedOptions, selected:selected } );
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
            itemsFiltered: '{count} option filtered',
            itemsFiltered_plural: '{count} options filtered',
            //itemsFiltered_plural_two: ...
            //itemsFiltered_plural_few: ...
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
