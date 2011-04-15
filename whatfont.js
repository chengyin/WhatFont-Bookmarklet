(function (window) {
  var VER         = "1.3.1",
  document      = window.document,
  body          = document.querySelector('body'),
  // Settings for font detector
  ALPHABET      = 'abcdefghijklmnopqrstuvwxyz',  // alphabet to draw on canvas
  WIDTH         = 600,          // canvas width in px
  HEIGHT        = 50,           // canvas height in px
  SIZE          = 40,           // font size to draw in px
  FILLSTYLE     = 'rgb(0,0,0)', // canvas fill style
  TEXTBASELINE  = 'top',        // canvas text baseline
  // DOM elements
  TIP, 
  EXIT,
  CONTROL,
  STYLESHEET_URL = "whatfont.css?ver=" + VER,
  STYLE_PRE      = 'com_chengyinliu_wf_',
  PANELS         = [],
  PROMPT_TO,
  CANVAS_SUPPORT = !!(document.createElement("canvas").getContext),
  fontServices = {},
  callbackFunc = {};
  
  function getClassName(name) {
    var className = "", n;
    
    // Multiple names
    name = typeof name === 'string' ? [name] : name;
    
    for (n = 0; n < name.length; n += 1) {
      className += STYLE_PRE + name[n] + ' ';
    }
    
    return className;
  }
  
  function createElem(tag, className, content, attr) {
    var e = document.createElement(tag), c;
    className = className || [];
    content = content || '';
    
    if (typeof className === 'string') {
      className = [className];
    }
    
    className.push('basic');
    
    if (className !== undefined) {
      e.setAttribute('class', getClassName(className));
    }
    
    if (typeof content === 'string') {
      e.innerHTML = content;
    } else if (content.constructor === Array) {
      for (c = 0; c < content.length; c += 1) {
        e.appendChild(content[c]);
      }
    } else {
      e.appendChild(content);
    }
    
    if (typeof attr === 'object') {
      for (c in attr) {
        if (attr.hasOwnProperty(c)) {
          e.setAttribute(c, attr[c]);
        }
      }
    }
    
    return e;
  }
  
  function setEventPosOffset(elem, e, offsetX, offsetY) {
    var x, y;
    x = offsetX + e.pageX;
    y = offsetY + e.pageY;
    
    elem.style.left = x + 'px';
    elem.style.top = y + 'px';
  }
  
  // Fix Event for IE8-
  // written by Dean Edwards, 2005
  // with input from Tino Zijdel, Matthias Miller, Diego Perini

  // http://dean.edwards.name/weblog/2005/10/add-event/

  function addEvent(element, type, handler) {
    if (element.addEventListener) {
      element.addEventListener(type, handler, false);
    } else {
      // assign each event handler a unique ID
      if (!handler.$$guid) handler.$$guid = addEvent.guid++;
      // create a hash table of event types for the element
      if (!element.events) element.events = {};
      // create a hash table of event handlers for each element/event pair
      var handlers = element.events[type];
      if (!handlers) {
        handlers = element.events[type] = {};
        // store the existing event handler (if there is one)
        if (element["on" + type]) {
          handlers[0] = element["on" + type];
        }
      }
      // store the event handler in the hash table
      handlers[handler.$$guid] = handler;
      // assign a global event handler to do all the work
      element["on" + type] = handleEvent;
    }
  };
  // a counter used to create unique IDs
  addEvent.guid = 1;

  function removeEvent(element, type, handler) {
    if (element.removeEventListener) {
      element.removeEventListener(type, handler, false);
    } else {
      // delete the event handler from the hash table
      if (element.events && element.events[type]) {
        delete element.events[type][handler.$$guid];
      }
    }
  };

  function handleEvent(event) {
    var returnValue = true;
    // grab the event object (IE uses a global event object)
    event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
    // get a reference to the hash table of event handlers
    var handlers = this.events[event.type];
    // execute each event handler
    for (var i in handlers) {
      this.$$handleEvent = handlers[i];
      if (this.$$handleEvent(event) === false) {
        returnValue = false;
      }
    }
    return returnValue;
  };

  function fixEvent(event) {
    var e = document.documentElement;
    
    // add W3C standard event methods
    event.preventDefault = fixEvent.preventDefault;
    event.stopPropagation = fixEvent.stopPropagation;
    
    // add pageX/page Y

    event.pageX = event.clientX + (e.scrollLeft || body.scrollLeft);
    event.pageY = event.clientY + (e.scrollTop || body.scrollTop);
    
    return event;
  };
  fixEvent.preventDefault = function() {
    this.returnValue = false;
  };
  fixEvent.stopPropagation = function() {
    this.cancelBubble = true;
  };
  // End of Fix Event for IE8-
  
  function mkTextPixelArray(cssfontfamily) {
    // draw the alphabet on canvas using cssfontfamily
    var canvas       = document.createElement('canvas'),
      ctx            = canvas.getContext('2d');
      
    canvas.width     = WIDTH;
    canvas.height    = HEIGHT;

    ctx.fillStyle    = FILLSTYLE;
    ctx.textBaseline = TEXTBASELINE;
    ctx.font         = SIZE + 'px ' + cssfontfamily;
    ctx.fillText(ALPHABET, 0, 0);
    return ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  }

  function sameArray(a1, a2) {
    // compare if two pixel arrays are identical
    var len = WIDTH * HEIGHT * 4, i; // each pixel is 4 bytes (RGBA)
    for (i = 0; i < len; i += 1) {
      if (a1[i] !== a2[i]) {
        return false;
      }
    }
    
    return true;
  }

  function fontInUse(cssfontfamily) {
    // try each font in cssfontfamily list to see which one is used
    var fonts  = cssfontfamily.split(','),
      a0       = mkTextPixelArray(cssfontfamily),
      i, 
      a1;

    for (i = 0; i < fonts.length; i += 1) {
      a1 = mkTextPixelArray(fonts[i]);
      if (sameArray(a0, a1)) {
        return fonts[i].replace(/^\s*/, "").replace(/\s*$/, "");
      }
    }
    
    return '(fallback)';  // no match; use fallback font
  }
  
  function firstFont(cssfontfamily) {
    return cssfontfamily.split(',')[0].replace(/^\s*/, "").replace(/\s*$/, "");
  }

  function tip(string, x, y) {
    TIP.querySelector('.' + getClassName('tipinfo')).innerHTML = string;
    TIP.style.display = 'inline-block';
  }

  function hideTip() {
    TIP.style.display = 'none';
  }
  
  function getCSSProperty(elem, prop) {
    var val;
    if (window.getComputedStyle) {
      val = window.getComputedStyle(elem, null).getPropertyValue(prop);
    } else if (elem.currentStyle) {
      val = elem.currentStyle[prop];
    }
    
    return (val || '');
  }
  
  function getFontInUse(elem) {
    var cssfontfamily = getCSSProperty(elem, 'font-family');
    if (CANVAS_SUPPORT) {
      return fontInUse(cssfontfamily);
    } else {
      return firstFont(cssfontfamily);
    }
  }
  
  // function showPromptOnTip() {
  //   TIP.querySelector('.' + getClassName('tipprompt')).style.display = 'block';
  // }
  // 
  // function hidePromptOnTip() {
  //   TIP.querySelector('.' + getClassName('tipprompt')).style.display = 'none';
  // }
  // 
  
  function update(e) {
    var cn = getCSSProperty(this, 'class') || '', remover, x, y;
    // hidePromptOnTip();
    // if (PROMPT_TO) {
    //   window.clearTimeout(PROMPT_TO);
    // }
    // PROMPT_TO = window.setTimeout(showPromptOnTip, 1000);
    // 
    // this.setAttribute('class', cn + ' ' + getClassName('highlighted'));
    

    // remover = this.addEventListener('mouseout', function () {
      //this.setAttribute('class', cn);
      //this.setAttribute('class', getCSSProperty(this, 'class').replace(getClassName('highlighted'), ''));
    //   this.removeEventListener('mouseout', remover, false);
    // }, false);
    
    tip(getFontInUse(this));
    setEventPosOffset(TIP, e, 12, 12);
    e.stopPropagation();
  }

  function onAllVisibleElementsDo(func) {
    var elements = document.querySelectorAll('body *'), e;
    for (e = 0; e < elements.length; e += 1) {
      if (elements[e].nodeType && 1 === elements[e].nodeType &&
          'none' !== elements[e].style.display) {  // visible elements only
        func(elements[e]);
      }
    }
  }
  
  function getPanelFontFamily(elem) {
    var ff, fiu, font, fHTML;
    
    ff = getCSSProperty(elem, 'font-family').split(',');
    fiu = getFontInUse(elem);
    for (font = 0; font < ff.length; font += 1) {
      ff[font] = ff[font].replace(/^\s*/, "").replace(/\s*$/, "").replace(/;$/, "");
    }
    
    for (font = 0; font < ff.length; font += 1) {
      if (ff[font] !== fiu) {
        ff[font] = "<span class='" + getClassName("fniu") + "'>" + ff[font] + "</span>";
      } else {
        ff[font] = "<span class='" + getClassName("fiu") + "'>" + ff[font] + "</span>";
        break;
      }
    }
    
    fHTML = ff.join(", ") + ";";
    
    return [createElem('dt', 'family', "Font Family"), createElem('dd', '', fHTML)];
  }
  
  function getPanelFontStyleWeight(elem) {
    var style = getCSSProperty(elem, 'font-style'),
      weight = getCSSProperty(elem, 'font-weight'),
      sdl = createElem('dl', 'style', 
        [createElem('dt', 'style', 'Style'), createElem('dd', 'style', style)]),
      wdl = createElem('dl', 'weight', 
        [createElem('dt', 'weight', 'Weight'), createElem('dd', 'weight', weight)]);
        
    return [createElem('dl', 'style_weight', [sdl, wdl])];
  }
  
  function getPanelSizeLineHeight(elem) {
    var size = getCSSProperty(elem, 'font-size'),
      lh = getCSSProperty(elem, 'line-height'),
      sdl = createElem('dl', 'size', 
        [createElem('dt', 'size', 'Font Size'), createElem('dd', 'size', size)]),
      lhdl = createElem('dl', 'lh', 
        [createElem('dt', 'lh', 'Line Height'), createElem('dd', 'lh', lh)]);
        
    return [createElem('dl', 'size_lh', [sdl, lhdl])];
  }
  
  function getPanelDetailList(elem) {
    var ff = getPanelFontFamily(elem),
      fsw = getPanelFontStyleWeight(elem),
      fslh = getPanelSizeLineHeight(elem),
      dl = createElem('dl', '', ff.concat(fsw).concat(fslh));
      
    return dl;
  }
  
  function getPanelTitle(elem) {
    var text = createElem('div', '', ''),
      close = createElem('div', 'close_button', '&times;'),
      title = createElem('div', 'panel_title', [text, close]);
    
    close.setAttribute('title', 'Close');
    addEvent(close, 'click', function (e) {
      var panel = title.parentNode;
      // delete panel.on_element.wf_panel;
      body.removeChild(panel);
      e.stopPropagation();
    });
      
    return title;
  }
  
  function getPanel(elem) {
    var panelTitle = getPanelTitle(elem),
      panelDetailList = getPanelDetailList(elem),
      panel = createElem('div', ["elem", "panel"], [panelTitle, panelDetailList]);
    
    addEvent(panel, 'click', function (e) {
      this.querySelector('dl').style['-webkit-animation'] = "none";
      this.querySelector('.com_chengyinliu_wf_panel_title').style['-webkit-animation'] = "none";
      body.removeChild(this);
      body.appendChild(this);

      e.stopPropagation();
    });
    
    return panel;
  }
  
  function pin(e) {
    var panel, height, cn = getCSSProperty(this, 'class'), x, y;
    
    hideTip();
    
    panel = getPanel(this);
    
    setEventPosOffset(panel, e, -13, 12);
    
    body.appendChild(panel);
    
    // this.setAttribute('class', getClassName('highlighted') + cn);
  
    PANELS.push(panel);

    e.stopPropagation();
    e.preventDefault();
  }
  
  function restore(e) {
    var p;
    
    onAllVisibleElementsDo(function (elem) {
      removeEvent(elem, 'mousemove', update);
      removeEvent(elem, 'click', pin);
    });
    
    body.removeChild(TIP);
    body.removeChild(CONTROL);
    for (p = 0; p < PANELS.length; p += 1) {
      if (PANELS[p].parentNode === body) {
        body.removeChild(PANELS[p]);
      }
      delete PANELS[p];
    }
  }
  
  function shortcut(e) {
    var key = e.keyCode;
    
    if (key === 27) {
      restore();
      e.stopPropagation();
    }
  }
  
  function activate() {
    // add stylesheet
    var link = document.createElement("link"), exit, help;
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("href", STYLESHEET_URL);
        document.querySelector("head").appendChild(link);
    
    // TIP = createElem('div', ["elem", "tip"], [createElem('div', ['tipinfo']), createElem('div', ['tipprompt'], 'Click to see details')]);
    TIP = createElem('div', ["tip"], [createElem('div', ["elem", 'tipinfo'])]);
    exit = createElem('div', "exit", "Exit WhatFont");
    help = createElem('div', "help", "<strong>Hover</strong> to identify<br /><strong>Click</strong> to pin a detail panel");
    CONTROL = createElem('div', ["elem", "control"], [exit, help]);
    
    // detect font upon mouse movement on visible elements
    // click to pin
    onAllVisibleElementsDo(function (elem) { 
      addEvent(elem, 'mousemove', update);
      addEvent(elem, 'click', pin);
    });
    
    // hide tip when mouse out <body> tag
    addEvent(body, 'mouseout', hideTip);
    
    // add tip box to DOM
    body.appendChild(TIP);
    
    // add controller
    body.appendChild(CONTROL);

    // clean up
    addEvent(exit, 'mouseup', restore);
    addEvent(body, 'keydown', shortcut);
  }
  
  activate();

}(window));
