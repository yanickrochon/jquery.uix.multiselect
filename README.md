jQuery Multiselect
==================
Version 2.0beta

Introduction
------------

This widget is a complete rewrite of the [previous version](https://github.com/michael/multiselect). Why a new rewrite? Because the original widget's attempt was to create a all-in-one-out-of-the-box-multi-featured SELECT replacement and thus failed to be compliant with the DOMElement's behavior and limitations. Notably, it failed to :

* update the option items when modifying the SELECT element directly
* didn't support disabled items
* didn't support item groups
* etc.

Also, it quickly became slow when loading a few hundred items and some branches had [drag](https://github.com/michael/multiselect/issues/91) [and](https://github.com/michael/multiselect/issues/124) [drop](https://github.com/michael/multiselect/issues/8) issues.

**Note :** This widget is still under development and all it's features has *not* been fully tested yet!

Requirements
------------

* jQuery 1.7.2+
* jQuery UI 1.8+

Usage
-----

**Note :** Even though it is a complete rewrite of the widget, I kept the `multiselect` widget name (but it is declared as `uix.multiselect` instead of [`ui.multiselect`](http://ajpiano.com/widgetfactory/#slide22)).

    $('selector').multiselect();

To programmatically select/deselect, add/modify/remove items, you may access and modify the DOMElement directly, then call the `refresh` widget method to update it.

    $('selector').append("<option value='item1'>My Item 1</option>")
                 .multiselect('refresh');

    // manually filter available options
    //   This will only render visible the available items containing 'My Item' (case insensitive)
    $('selector').multiselect('search', 'my item');

    $('selector').multiselect('destroy');  // restore original element


TODO
----

* <del>add disabled items support</del>
* <del>(de)select all group options</del>
* <del>add (collapsible) grouped items support</del>
* <del>selection mode : (drag, click, dblclick, etc.)</del>
* add custom item rendering support *(untested)*
* show empty groups
* sortable on selected items
* test in all browsers *(not fully tested)*
* code cleanup
* etc.
