(function (window) {
  var VER         = "1.3",
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
    STYLESHEET_URL = "http://chengyinliu.com/wf.css?ver=1.3",
    STYLE_PRE      = 'com_chengyinliu_wf_',
    PANELS         = [],
    PROMPT_TO;
  
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

  function tip(string, x, y) {
    TIP.querySelector('.' + getClassName('tipinfo')).innerHTML = string;
    TIP.style.display = 'inline-block';
    TIP.style.left = (x + 12) + 'px';
    TIP.style.top = (y + 12) + 'px';
  }

  function hideTip() {
    TIP.style.display = 'none';
  }
  
  function getCSSProperty(elem, prop) {
    var val = window.getComputedStyle(elem, null)
                    .getPropertyValue(prop);
    return (val || '');
  }
  
  function getFontInUse(elem) {
    var cssfontfamily = getCSSProperty(elem, 'font-family');
    return fontInUse(cssfontfamily);
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
    var cn = getCSSProperty(this, 'class') || '', remover;
    // hidePromptOnTip();
    // if (PROMPT_TO) {
    //   window.clearTimeout(PROMPT_TO);
    // }
    // PROMPT_TO = window.setTimeout(showPromptOnTip, 1000);
    // 
    // this.setAttribute('class', cn + ' ' + getClassName('highlighted'));
    

    remover = this.addEventListener('mouseout', function () {
      //this.setAttribute('class', cn);
      //this.setAttribute('class', getCSSProperty(this, 'class').replace(getClassName('highlighted'), ''));
      this.removeEventListener('mouseout', remover, false);
    }, false);
    
    tip(getFontInUse(this), e.pageX, e.pageY);
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
    
    return [createElem('dt', 'family', "Font Stack"), createElem('dd', '', fHTML)];
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
    close.addEventListener('click', function (e) {
      var panel = title.parentNode;
      // delete panel.on_element.wf_panel;
      body.removeChild(panel);
      e.stopPropagation();
    }, false);
      
    return title;
  }
  
  function getPanel(elem) {
    var panelTitle = getPanelTitle(elem),
      panelDetailList = getPanelDetailList(elem),
      panel = createElem('div', ["elem", "panel"], [panelTitle, panelDetailList]);
    
    panel.addEventListener('click', function (e) {
      this.querySelector('dl').style['-webkit-animation'] = "none";
      this.querySelector('.com_chengyinliu_wf_panel_title').style['-webkit-animation'] = "none";
      body.removeChild(this);
      body.appendChild(this);

      e.stopPropagation();
    }, false);
    
    return panel;
  }
  
  function pin(e) {
    var panel, height, cn = getCSSProperty(this, 'class');
    
    hideTip();
    
    panel = getPanel(this);
    panel.style.top = e.pageY + 12 + "px";
    panel.style.left = e.pageX - 13 + 'px';
    body.appendChild(panel);
    
    // this.setAttribute('class', getClassName('highlighted') + cn);
  
    PANELS.push(panel);

    e.stopPropagation();
    e.preventDefault();
  }
  
  function restore(e) {
    var p;
    
    onAllVisibleElementsDo(function (elem) {
      elem.removeEventListener('mousemove', update, false);
      elem.removeEventListener('click', pin, false);
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
      elem.addEventListener('mousemove', update, false);
      elem.addEventListener('click', pin, false);
    });
    
    // hide tip when mouse out <body> tag
    body.addEventListener('mouseout', hideTip, false);
    
    // add tip box to DOM
    body.appendChild(TIP);
    
    // add controller
    body.appendChild(CONTROL);

    // clean up
    exit.addEventListener('mouseup', restore, false);
    body.addEventListener('keydown', shortcut, false);
  }
  
  activate();

}(window));
