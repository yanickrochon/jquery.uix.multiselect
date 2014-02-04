jQuery UIx Multiselect
==================
Version 2.0

![Preview](http://mind2soft.com/labs/jquery/multiselect/preview.png)

Introduction
------------

This widget is a complete rewrite of the [previous version](https://github.com/michael/multiselect). Why a new rewrite? Because the original widget's attempt was to create a all-in-one-out-of-the-box-multi-featured SELECT replacement and thus failed to be compliant with the DOMElement's behavior and limitations. Notably, it failed to :

* update the option items when modifying the SELECT element directly
* didn't support disabled items
* didn't support item groups
* etc.

Also, it quickly became slow when loading a few hundred items and some branches had [drag](https://github.com/michael/multiselect/issues/91) [and](https://github.com/michael/multiselect/issues/124) [drop](https://github.com/michael/multiselect/issues/8) issues.

Release notes
-------------

This widget is stable enough to be used in staging environments. However it is *still* under development, in testing phase, as some features may require more feedbacks yet! (Mainly browser compatiblity.) At this point, expect minor bug fixes within 72 hours, and there will be no more features planned at this point.

The compressed (minified) version is created using the [YUI Compressor](http://refresh-sf.com/yui/).

Requirements
------------

* jQuery 1.8+
* jQuery UI 1.9+

Features
--------

* Support for disabled options
* Support for option groups
* Option group collapsable
* Draggable drop and/or sortable enabled
* Mouse selection mode (click, dblclick)
* Support for predefined or custom sort functions
* Searchable
* List layout and select direction (horizontal or vertical)
* Custom item renderer


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

See [wiki documentation](https://github.com/yanickrochon/jquery.uix.multiselect/wiki) for more information.


TODO
----

* <del>add custom item rendering support</del> *(needs more tests)*
* HTML5 ARIA attributes
* Make all options as mutable as possible after initialization.
* Test in all major browsers *(not fully tested)*
* Mobile support
* Code cleanup
* etc.


Limitations
-----------

* When setting `sortable` option to `true`, options can only be reordered within their own groups. That is, an option cannot be
  reordered between two options of a different group. As this widget's purpose is not to extend the original element's behaviour
  beyound user interaction and presentation, this limitation shall not be lifted for the time being.
* This widget was designed for modern browsers usage. It is working fine in IE7+, Firefox and Chrome. Note that it
  *will not work* in quirks mode. There will be little to no support for [non standards compliant browsers](http://www.ie6countdown.com/).
