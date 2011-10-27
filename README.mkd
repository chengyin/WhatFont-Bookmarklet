WhatFont
========

WhatFont is a JavaScript script to detect what font in the stack is being used on any elements of a web page.

Here in the repo is the core component with out wrappers, the wrapped Chrome/Safari extensions are available at [`http://chengyinliu.com/whatfont.html`](http://chengyinliu.com/whatfont.html).

How to Use
----------

`whatfont_core.js` is the core script. It adds `_whatFont()` into the global scope. WhatFont then runs in a closure created by the `_whatFont()` function.

An controller object is returned by `whatFont()` function. The controller will be used to set up the dependencies (jQuery and stylesheet) and initialize WhatFont.

This controller has the following functions:

* `setJQuery(jQ)`

	WhatFont requires jQuery (v1.5.2), if jQuery has already been loaded into the global scope, the script finds it automatically. Otherwise `setJQuery(jQ)` needs to be called to set up jQuery object.

* `setCSSURL(url)`

	WhatFont injects its stylesheet file into the webpage. The script comes with a default URL setting, if you want to change the setting, calling this function.

* `getVer()`

	Return the version of WhatFont.

* `init()`

	Initialize WhatFont and inject to the current `document`.

* `restore()`

	Remove WhatFont from current `document`.


Example
-------                     
	wf = _whatFont();		
	wf.setjQuery(jQuery);		// Setup jQuery
	wf.init();					// Load WhatFont
	wf.restore();				// Remove WhatFont

