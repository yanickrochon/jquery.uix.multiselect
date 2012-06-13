/*
 * jQuery UI Multiselect 2.0
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
 */

(function($) {
	// The jQuery.uix namespace will automatically be created if it doesn't exist
	$.widget("uix.multiselect", {
		options: {
			locale: '',                // any valid locale (default: '') 
			splitRatio: 0.55,          // % of the left list's width of the widget total width
			sortMethod: 'standard',    // null, 'standard' or 'natural'
			moveEffect: null,          // 'blind','bounce','clip','drop','explode','fold','highlight','puff','pulsate','shake','slide'
			moveEffectOptions: {},		// effect options (see jQuery UI documentation)
			moveEffectSpeed: null      // string ('slow','fast') or number in millisecond (ignored if moveEffect is 'show')
		},

		_create: function() {
			var that = this;
			var selListHeader, selListContent, avListHeader, avListContent;
			var btnSearch, btnSelectAll, btnDeselectAll;

			this.element.hide();
			this._elementWrapper = $('<div></div>').addClass('uix-multiselect ui-widget')
				.css({
					'width': this.element.outerWidth(),
					'height': this.element.outerHeight()
				})
				.append(
					$('<div></div>').addClass('multiselect-selected-list')
						.append( $('<div></div>').addClass('ui-widget-header ui-corner-tl')
							.append( btnDeselectAll = $('<button></button>').addClass('multiselect-ui-control').attr('title', this._t('deselectAll'))
								.button({icons:{primary:'ui-icon-arrowthickstop-1-e'}, text:false})
								.click(function() { that._optionCache.setSelectedAll(false); })
							)
							.append( selListHeader = $('<div></div>').addClass('header-text') )
						)
						.append( selListContent = $('<div></div>').addClass('ui-widget-content ui-corner-bl') )
				)
				.append(
					$('<div></div>').addClass('multiselect-available-list')
						.append( $('<div></div>').addClass('ui-widget-header ui-corner-tr')//.text('Available items')
							.append( btnSelectAll = $('<button></button>').addClass('multiselect-ui-control').attr('title', this._t('selectAll'))
								.button({icons:{primary:'ui-icon-arrowthickstop-1-w'}, text:false}) 
								.click(function() { that._optionCache.setSelectedAll(true); })
							)
							.append( btnSearch = $('<button></button').addClass('multiselect-ui-control').attr('title', this._t('search'))
								.button({icons:{primary:'ui-icon-search'}, text:false})
								.click(function() {
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
								})
							)
							.append( this._searchField = $('<input type="text" />').addClass('multiselect-ui-search ui-widget-content ui-corner-left').hide() 
								.focus(function() { $(this).select(); })
								.keyup(function() { that._searchDelayed.request(); })
								//
							)
							.append( avListHeader = $('<div></div>').addClass('header-text') )

						)
						.append( avListContent  = $('<div></div>').addClass('ui-widget-content ui-corner-br') )
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

				for (var i=0, len=options.length; i<len; i++) {
					if (options[i].nodeType == 1) {
						that._optionCache.add($(options[i]));
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
		 * @param text   string			(optional) update the search field with this value
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
				if (!$.uix.multiselect.i18n[locale]) {
					locale = '';
				}
				this.options.locale = locale;

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

		_applyListDroppable: function() {
			var that = this;

			this._lists['selected'].droppable({
				accept: function(draggable) {
					return !draggable.data('selected');  // not selected only
				},
				activeClass: 'ui-state-highlight',
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
				drop: function(evt, ui) {
					var index = that._optionCache.indexOf(ui.draggable.data('option-value'));

					ui.draggable.removeClass('ui-state-disabled');
					ui.helper.remove();						

					that._optionCache.setSelected(index, false);
				}
			});
		},

		_updateControls: function() {
			this._buttons.search.attr('title', this._t('search'));
			this._buttons.selectAll.attr('title', this._t('selectAll'));
			this._buttons.deselectAll.attr('title', this._t('deselectAll'));		
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




	var ItemComparators = {
		/**
		 * Naive general implementation
		 */
		standard: function(a, b) {
			var at = a.optionElement.text();
			var bt = b.optionElement.text();
			if (at > bt) return 1;
			if (at < bt) return -1;
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
			    x = i(a.optionElement.text()).replace(sre, '') || '',
			    y = i(b.optionElement.text()).replace(sre, '') || '',
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

		_createElement: function(optElement) {
			return $('<div></div>').text(optElement.text()).addClass('ui-state-default multiselect-item-available')
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
				)
				.draggable({
					appendTo: "body",
					start: function(evt, ui) {
						$(this).addClass('ui-state-disabled');
					},
					stop: function(evt, ui) {
						$(this).removeClass('ui-state-disabled');
					},
					helper: function() {
						var e = $(this);
						return $('<div></div>').addClass('multiselect-dragged-element ui-widget ui-widget-content ui-state-active ui-corner-all')
							.text(e.text())
							.width(e.width())
							.height(e.height())
							[0];
					},
					revert: 'invalid',
					zIndex: 99999
				})
			;
		},

		_appendToList: function(index, eData) {
			var insertIndex = index - 1;
			var selected = !!eData.optionElement.attr('selected');

			while (insertIndex >= 0 && 
					 (!!this._elements[insertIndex].optionElement.attr('selected') != selected && this._elements[insertIndex].listElement)) 
			{
				insertIndex--;
			}

			if (!eData.listElement) {
				eData.listElement = this._createElement(eData.optionElement);
			}

			eData.listElement[(selected?'add':'remove')+'Class']('ui-state-highlight').data('selected', selected).hide();  // setup draggable

			if (insertIndex < 0) {
				//this._widget._lists[selected?'selected':'available'].prepend(eData.listElement);
				this._listContainers[selected?'selected':'available'].prepend(eData.listElement);
			} else {
				eData.listElement.insertAfter(this._elements[insertIndex].listElement);
			}

			if (selected || !eData.filtered) {
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
			this._listContainers.selected.empty();
			this._listContainers.available.empty();
		},

		add: function(optElement) {
			var eData = {
				filtered: false,
				listElement: null,
				optionElement: optElement
			};

			this._elements.push(eData);
		},

		reIndex: function() {
			if (this._widget.options.sortMethod) {
				this._elements.sort(ItemComparators[this._widget.options.sortMethod]);
			}

			this._bufferedMode(true);

			for (var i=0, len=this._elements.length; i<len; i++) {
				if (!this._elements[i].listElement) {
					this._appendToList(i, this._elements[i]);
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

			for (var i=0; i<count; i++) {
				var eData = this._elements[i];
				var filtered = !(!text || (eData.optionElement.text().toLowerCase().indexOf(text) > -1));

				if (!eData.listElement.data('selected') && eData.filtered != filtered) {
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

			this._widget.element.trigger('change', this._createEventUI({ itemIndex:-1, selected:selected }) );
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
			selectAll: 'Select all',
			deselectAll: 'Deselect all',
			search: 'Search options',
		}
	};

})(jQuery);
