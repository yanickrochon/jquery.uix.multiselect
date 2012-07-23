/*
 * jQuery UIx Multiselect 2.0beta
 *
 * Authors:
 *  Yanick Rochon (yanick.rochon[at]gmail[dot]com)
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
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
            collapsibleGroups: true,   // tells whether the option groups can be collapsed or not (default: true)
            locale: 'auto',            // any valid locale, 'auto', or '' for default built-in strings (default: 'auto') 
            moveEffect: null,          // 'blind','bounce','clip','drop','explode','fold','highlight','puff','pulsate','shake','slide' (default: null)
            moveEffectOptions: {},     // effect options (see jQuery UI documentation) (default: {})
            moveEffectSpeed: null,     // string ('slow','fast') or number in millisecond (ignored if moveEffect is 'show') (default: null)
            optionRenderer: false,     // a function that will return the item element to be rendered in the list (default: false)
            splitRatio: 0.55,          // % of the left list's width of the widget total width (default 0.55)
            sortMethod: 'standard'     // null, 'standard', 'natural'; a sort function name (see ItemComparators) (default: 'standard')
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
                                        that.search();
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
                search: btnSearch,
                selectAll: btnSelectAll,
                deselectAll: btnDeselectAll
            };
            this._headers = {
                selected: selListHeader,
                available: avListHeader
            };
            this._lists = {
                selected: selListContent,
                available: avListContent
            };

            this._resize();
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
                that._optionCache.clear();

                var options = that.element[0].childNodes;
                var opt;

                for (var i=0, l1=options.length; i<l1; i++) {
                    opt = options[i];
                    if (opt.nodeType == 1) {
                        if (opt.tagName.toUpperCase() == 'OPTGROUP') {
                            var optGroup = $(opt).attr('label');
                            var grpOptions = opt.childNodes;
                            for (var j=0, l2=grpOptions.length; j<l2; j++) {
                                opt = grpOptions[j];
                                if (opt.nodeType == 1) {
                                    that._optionCache.prepare($(opt), optGroup);
                                }
                            }
                        } else {
                            that._optionCache.prepare($(opt));
                        }
                    }
                }

                that._optionCache.reIndex();

                if (that._searchField.is(':visible')) {
                    that.search(null, true);
                }

                if (callback) callback();
            }, 10);

        },

        /**
         * Search the list of available items and filter them. If the parameter 'text' is
         * undefined, the actual value from the search field is used. If 'text' is specified,
         * the search field is updated.
         *
         * @param text   string         (optional) update the search field with this value
         * @param silent boolean      (optional) tells whether to trigger a search (false) event or not (true) (default will trigger)
         */
        search: function(text, silent) {
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

        _setLocale: function(locale) {
            if (locale == 'auto') {
                locale = navigator.userLanguage || 
                         navigator.language || 
                         navigator.browserLanguage || 
                         navigator.systemLanguage || 
                         '';
            }
            if (!$.uix.multiselect.i18n[locale]) {
                locale = '';
            }
            this.options.locale = locale;
        },

        _applyListDroppable: function() {
            var that = this;

            this._lists['selected'].droppable({
                accept: function(draggable) {
                    return !draggable.data('selected');  // not selected only
                },
                activeClass: 'ui-state-highlight',
                scope: this.scope,
                drop: function(evt, ui) {
                    var index = that._optionCache.indexOf(ui.draggable.data('option-value'));
                    
                    ui.draggable.removeClass('ui-state-disabled');
                    ui.helper.remove();

                    that._optionCache.setSelected(index, true);
                }
            });

            this._lists['available'].droppable({
                accept: function(draggable) {
                    return draggable.data('selected');  // selected only
                },
                activeClass: 'ui-state-highlight',
                scope: this.scope,
                drop: function(evt, ui) {
                    var index = that._optionCache.indexOf(ui.draggable.data('option-value'));

                    ui.draggable.removeClass('ui-state-disabled');
                    ui.helper.remove();                     

                    that._optionCache.setSelected(index, false);
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

            this._headers.selected.text( this._t('itemsSelected', info.selected, {count:info.selected}) );
            this._headers.available.text( this._t('itemsAvailable', info.available, {count:info.available}) );
            //this._headers.available.attr('title',  this._t(...., info.filtered, {count:info.filtered}) );

        },

        // call this method whenever the widget resizes
        _resize: function() {
            var separatorWidth = this.element.outerWidth() * this.options.splitRatio;

            this._elementWrapper.find('.multiselect-selected-list').width(separatorWidth);
            this._elementWrapper.find('.multiselect-available-list').css('margin-left', separatorWidth);

            this._searchField.width( this._headers.available.parent().width() - 48 );
            this._lists.selected.height(this.element.height() - this._headers.selected.parent().height());
            this._lists.available.height(this.element.height() - this._headers.available.parent().height());

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
        standard: function(a, b, g) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        },
        /*
         * Natural Sort algorithm for Javascript - Version 0.7 - Released under MIT license
         * Author: Jim Palmer (based on chunking idea from Dave Koelle)
         */
        natural: function naturalSort(a, b, g) {
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

                that._widget.search();
            }, this._options.delay);
        },
        cancelLastRequest: function() {
            if (this._timeout) {
                clearTimeout(this._timeout);
            }
        }
    };



    var OptionCache = function(widget) {
        this._widget = widget;
        this._listContainers = {
            selected: $('<div></div>').appendTo(this._widget._lists['selected']),
            available: $('<div></div>').appendTo(this._widget._lists['available'])
        };
        this._elements = [];
        this._groups = {};
        this._moveEffect = {
            fn: widget.options.moveEffect,
            options: widget.options.moveEffectOptions,
            speed: widget.options.moveEffectSpeed
        };
    };

    OptionCache.Options = {
        batchCount: 200,
        batchDelay: 50
    };

    OptionCache.prototype = {
        _createEventUI: function(data) {
            return $.extend({
                optionCache: this
            }, data);
        },

        _createElement: function(optElement, optGroup) {
            var o = this._widget.options.optionRenderer 
                  ? this._widget.options.optionRenderer(optElement, optGroup)
                  : $('<div></div>').text(optElement.text());
            var e = $('<div></div>').append(o).addClass('ui-state-default option-element')
                .data('option-value', optElement.attr('value'))
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
            } else {
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
                        var e = $(this).children(':last');
                        return $('<div></div>')
                            .addClass('dragged'+(optGroup?'-grouped':'')+'-element ui-widget ui-widget-content ui-state-active ui-corner-all')
                            .append(e.clone())
                            .width(e.outerWidth())
                            .height(e.outerHeight())
                            [0];
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
        
        _isOptionCollapsed: function(eData, selected) {
            return eData.optionGroup && this._groups[eData.optionGroup].collapsed[selected?0:1];
        },
        
        _countGroupElements: function(gData) {
            var count = [0, 0];  // selected, available
            for (var i=gData.startIndex, len=gData.startIndex+gData.count; i<len; i++) {
                count[this._elements[i].optionElement.attr('selected')?0:1]++;
            }
            return count;
        },
        
        _updateGroupElements: function(index, groupName, selected) {
            var that = this;
            var gData = this._groups[groupName];
            var addKey = (selected ? 'selected' : 'available') + 'Info';
            var remKey = (selected ? 'available' : 'selected') + 'Info';
            
            var count = this._countGroupElements(gData);
            
            if (!gData[addKey]) {
                gData[addKey] = {
                    element: $('<div></div>')
                        .addClass('ui-widget-header ui-priority-secondary group-element')
                        .append( $('<button></button>').addClass('uix-control-right')
                            .attr('data-localekey', (selected?'de':'')+'selectAllGroup')
                            .attr('title', this._widget._t((selected?'de':'')+'selectAllGroup'))
                            .button({icons:{primary:'ui-icon-arrowstop-1-'+(selected?'e':'w')}, text:false})
                            .click(function(e) {
                                e.preventDefault(); e.stopPropagation(); 
                                that._bufferedMode(false);
                                for (var i=gData.startIndex, len=gData.startIndex+gData.count; i<len; i++) {
                                    if (!that._elements[i].filtered) {
                                        that.setSelected(i, !selected, true);
                                    }
                                }
                                count = that._countGroupElements(gData);
                                that._widget._updateHeaders();
                                gData[addKey].element.children(':last').text(groupName + ' (' + count[selected?0:1] + ')');
                                that._bufferedMode(false);
                                that._widget.element.trigger('change', this._createEventUI({ itemIndex:[gData.startIndex,gData.startIndex+gData.count], selected:!selected}) );
                                return false;
                            })
                        )
                        .append($('<span></span>').addClass('label')
                            .text(groupName + ' (' + count[selected?0:1] + ')')
                            .attr('title', groupName + ' (' + count[selected?0:1] + ')')),
                    optIndex: index
                };
                if (this._widget.options.collapsibleGroups) {
                    gData[addKey].element
                        .prepend( $('<button></button>').addClass('uix-control-left')
                            .attr('data-localekey', 'collapseGroup')
                            .attr('title', this._widget._t('collapseGroup'))
                            .button({icons:{primary:'ui-icon-plus'}, text:false})
                            .click(function(e) { 
                                e.preventDefault(); e.stopPropagation(); 
                                var e, c = !gData.collapsed[selected?0:1];
                                gData.collapsed[selected?0:1] = c;
                                $(this).button('option', 'icons', {primary:'ui-icon-' + (c ? 'minus' : 'plus')});
                                for (var i=gData.startIndex, len=gData.startIndex+gData.count; i<len; i++) {
                                    e = that._elements[i];
                                    if (!!e.optionElement.attr('selected') == selected) {
                                        e.listElement[c || e.filtered ? 'hide' : 'show']();
                                    }
                                }
                                return false;
                            })
                        );
                }
                gData[addKey].element.insertBefore(this._elements[index].listElement);
            } else {
                // update group name and count
                gData[addKey].element.children(':last')
                    .text(groupName + ' (' + count[selected?0:1] + ')')
                    .attr('title', groupName + ' (' + count[selected?0:1] + ')');
                if (gData[addKey].optIndex > index) {
                    gData[addKey].optIndex = index;
                    gData[addKey].element.insertBefore(this._elements[index].listElement);
                } else if (gData[addKey].optIndex == index) {
                    var shouldBeVisible = false;
                    // try to find if we still have something to keep the group element attached
                    for (var i=gData[addKey].optIndex+1, len=this._elements.length; i<len; i++) {
                        if (this._elements[i].optionGroup != groupName) {
                            break;
                        } else if (!!this._elements[i].optionElement.attr('selected') == selected) {
                            gData[addKey].optIndex = i;
                            shouldBeVisible = true;
                            break;
                        }
                    }
                    if (!shouldBeVisible) {
                        gData[addKey].element.remove();
                        gData[addKey] = null;
                    }
                }
            }
            if (gData[remKey]) {
                gData[remKey].element.children(':last')
                    .text(groupName + ' (' + count[!selected?0:1] + ')')
                    .attr('title', groupName + ' (' + count[!selected?0:1] + ')');
                if (gData[remKey].optIndex == index) {
                    var shouldBeVisible = false;
                    //alert( gData[remKey].optIndex );
                    // try to find if we still have something to keep the group element attached
                    for (var i=gData[remKey].optIndex+1, len=this._elements.length; i<len; i++) {
                        if (this._elements[i].optionGroup != groupName) {
                            //alert( "Different group at " + i + " with " + this._elements[i].optionGroup + " != " + groupName);
                            break;
                        } else if (!this._elements[i].optionElement.attr('selected') == selected) {
                            //alert( "Found next element at " + i );
                            gData[remKey].optIndex = i;
                            shouldBeVisible = true;
                            break;
                        }
                    }
                    if (!shouldBeVisible) {
                        gData[remKey].element.remove();
                        gData[remKey] = null;
                    }
                }
            }
        },

        _appendToList: function(index, eData) {
            var insertIndex = index - 1;
            var selected = !!eData.optionElement.attr('selected');

            while ((insertIndex >= 0) && 
                   (!!this._elements[insertIndex].optionElement.attr('selected') != selected) && 
                   (this._elements[insertIndex].listElement)) 
            {
                insertIndex--;
            }

            if (!eData.listElement) {
                eData.listElement = this._createElement(eData.optionElement, eData.optionGroup);
            }

            eData.listElement[(selected?'add':'remove')+'Class']('ui-state-highlight').data('selected', selected).hide();  // setup draggable

            if (insertIndex < 0) {
                //this._widget._lists[selected?'selected':'available'].prepend(eData.listElement);
                this._listContainers[selected?'selected':'available'].prepend(eData.listElement);
            } else {
                eData.listElement.insertAfter(this._elements[insertIndex].listElement);
            }

            if (eData.optionGroup) {
                this._updateGroupElements(index, eData.optionGroup, selected);
            }

            if ((selected || !eData.filtered) && !this._isOptionCollapsed(eData, selected)) {
                if (this._moveEffect && this._moveEffect.fn) {
                    eData.listElement.show(this._moveEffect.fn, this._moveEffect.options, this._moveEffect.speed);
                } else {
                    eData.listElement.show();
                }
            }
        },

        _bufferedMode: function(enabled) {
            if (enabled) {
                this._oldMoveEffect = this._moveEffect; this._moveEffect = null;

                this._listContainers.selected.detach();
                this._listContainers.available.detach();
            } else {
                this._widget._lists.selected.append(this._listContainers.selected);
                this._widget._lists.available.append(this._listContainers.available);

                this._moveEffect = this._oldMoveEffect;

                delete this._oldMoveEffect;
            }

        },

        
        clear: function() {
            clearTimeout(this._procTimeout);
            this._procTimeout = null;                   

            this._visibleCount = 0;
            this._elements = [];
            this._groups = {};
            this._listContainers.selected.empty();
            this._listContainers.available.empty();
        },

        // prepare option element to be rendered (must call reIndex after this!)
        prepare: function(optElement, optGroup) {
            var eData = {
                filtered: false,
                listElement: null,
                optionElement: optElement,
                optionGroup: optGroup
            };

            this._elements.push(eData);
        },

        reIndex: function() {
            // note : even if not sorted, options are added as they appear, 
            //        so they should be grouped just fine anyway!
            if (this._widget.options.sortMethod) {
                var comparator = typeof this._widget.options.sortMethod == 'function' 
                               ? this._widget.options.sortMethod 
                               : ItemComparators[this._widget.options.sortMethod];
                this._elements.sort(function(a, b) {
                    if (a.optionGroup || b.optionGroup) {
                        // sort groups
                        var g = comparator(a.optionGroup, b.optionGroup, true);
                        if (g != 0) return g;
                    }
                    return comparator(a.optionElement.text(), b.optionElement.text());
                });
            }

            this._bufferedMode(true);

            for (var i=0, e, len=this._elements.length; i<len; i++) {
                e = this._elements[i];
                if (e.optionGroup) {
                    if (!this._groups[e.optionGroup]) {
                        this._groups[e.optionGroup] = {startIndex:i, count:0, collapsed:[false, false], selectedInfo:null, availableInfo:null};
                    } else if (this._groups[e.optionGroup].startIndex > i) {
                        this._groups[e.optionGroup].startIndex = i;
                    }
                    this._groups[e.optionGroup].count++;
                }
                if (!e.listElement) {
                    this._appendToList(i, e);
                }
            } 

            this._widget._updateHeaders();

            this._bufferedMode(false);

        },

        size: function() {
            return this._elements.length;
        },

        indexOf: function(value) {
            var index = -1;
            $.each(this._elements, function(i, eData) {
                if (eData.optionElement.attr('value') == value) {
                    index = i;
                    return false;
                }
            });
            return index;
        },

        filter: function(text, silent) {

            this._bufferedMode(true);

            var count = this._elements.length;

            text = (''+text).toLowerCase();
            if (text.length == 0) {
                text = false;
            }

            var eData, filtered, selected;
            for (var i=0; i<count; i++) {
                eData = this._elements[i];
                filtered = !(!text || (eData.optionElement.text().toLowerCase().indexOf(text) > -1));
                selected = eData.listElement.data('selected');

                if (!selected && (eData.filtered != filtered) && !this._isOptionCollapsed(eData, selected)) {
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

        get: function(index) {
            if (index < 0 || index >= this._elements.length) {
                throw "Index out of bound";
            }

            return this._elements[index];
        },

        getSelectionInfo: function() {
            var info = { selected: 0, available: 0, filtered: 0 };

            for (var i=0, len=this._elements.length; i<len; i++) {
                var eData = this._elements[i];
                if (eData.listElement.data('selected')) {
                    info.selected++;
                } else if (eData.filtered) {
                    info.filtered++;
                } else {
                    info.available++;
                }
            }

            return info;
        },

        setSelected: function(index, selected, silent) {
            var eData = this.get(index);

            if (eData.optionElement.attr('disabled') && selected) {
                return;
            }
            
            if (selected) {
                eData.optionElement.attr('selected', true);
            } else {
                eData.optionElement.removeAttr('selected');
            }

            this._appendToList(index, eData);

            if (!silent) {
                this._widget._updateHeaders();
                this._widget.element.trigger('change', this._createEventUI({ itemIndex:index, selected:selected }) );
            }
        },

        // utility function to select all options
        setSelectedAll: function(selected) {

            this._bufferedMode(true);

            for (var i=0, len=this._elements.length; i<len; i++) {
                var eData = this._elements[i];
                if (!selected || !(eData.filtered || eData.listElement.data('selected'))) {
                    this.setSelected(i, selected, true);
                }
            } 

            this._widget._updateHeaders();
            this._bufferedMode(false);

            this._widget.element.trigger('change', this._createEventUI({ itemIndex:[0,this._elements.length], selected:selected }) );
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
