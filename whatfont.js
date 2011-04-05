;(function(window){
  var document      = window.document;
  var body          = body = document.querySelector('body');
  var ALPHABET      = 'abcdefghijklmnopqrstuvwxyz';  // alphabet to draw on canvas
  var WIDTH         = 600;          // canvas width in px
  var HEIGHT        = 50;           // canvas height in px
  var SIZE          = 40;           // font size to draw in px
  var FILLSTYLE     = 'rgb(0,0,0)'; // canvas fill style
  var TEXTBASELINE  = 'top';        // canvas text baseline
  var BASE_STYLE    = 'background:rgba(0,0,0,.8);border:1px solid #000;border-radius:5px;color:#fff;font:14px sans-serif;padding:.5em;position:absolute;text-shadow:#000 1px 1px 2px;z-index:99999;';
  var TIP           = document.createElement('div');
  var CONTROL       = document.createElement('div');
  TIP.style.cssText = BASE_STYLE + "display:none;";
  CONTROL.style.cssText = BASE_STYLE + "top:10px;right:10px;";
  CONTROL.appendChild(document.createTextNode("Exit WhatFont"));

  function mkTextPixelArray(cssfontfamily) {
    // draw the alphabet on canvas using cssfontfamily
    var canvas       = document.createElement('canvas');
    canvas.width     = WIDTH;
    canvas.height    = HEIGHT;
    var ctx          = canvas.getContext('2d');
    ctx.fillStyle    = FILLSTYLE;
    ctx.textBaseline = TEXTBASELINE;
    ctx.font         = SIZE + 'px ' + cssfontfamily;
    ctx.fillText(ALPHABET, 0, 0);
    return ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  }

  function sameArray(a1, a2) {
    // compare if two pixel arrays are identical
    var len = WIDTH * HEIGHT * 4; // each pixel is 4 bytes (RGBA)
    for(var i=0; i<len; i++) if (a1[i] != a2[i]) return false;
    return true;
  }

  function fontInUse(cssfontfamily) {
    // try each font in cssfontfamily list to see which one is used
    var fonts  = cssfontfamily.split(',');
    var a0     = mkTextPixelArray(cssfontfamily);

    for (var i = 0; i<fonts.length; i++) {
      var a1 = mkTextPixelArray(fonts[i]);
      if (sameArray(a0, a1)) return fonts[i];
    }
    return '(fallback)';  // no match; use fallback font
  }

  function tip(string, x, y) {
    TIP.innerHTML     = string;
    TIP.style.display = 'inline-block';
    TIP.style.left    = (x+10)+'px';
    TIP.style.top     = (y+10)+'px';
  }

  function hideTip() {
    TIP.style.display = 'none';
  }

  function update(e) {
    var cssfontfamily = window.getComputedStyle(this, null)
                              .getPropertyValue('font-family');
    tip(fontInUse(cssfontfamily), e.pageX, e.pageY);
    e.stopPropagation();
  }

  function onAllVisibleElementsDo(func) {
    var elements = document.querySelectorAll('body *');
    for (var i in elements) {
      if (1 == elements[i].nodeType &&
          'none' != elements[i].style.display) {  // visible elements only
        elements[i].addEventListener('mousemove', update, false);
      }
    }
  }

  function activate() {
    var restore;

    // add tip box to DOM
    body.appendChild(TIP);
    
    // detect font upon mouse movement on visible elements
    onAllVisibleElementsDo(function (elem) { 
      elem.addEventListener('mousemove', update, false);
    });
    
    // hide tip when mouse out <body> tag
    body.addEventListener('mouseout', hideTip, false);
    
    // add controller
    body.appendChild(CONTROL);

    // clean up
    restore = function (e) {
      onAllVisibleElementsDo(function (elem) {
        elem.removeEventListener('mousemove', update, false);
      });
      body.removeChild(TIP);
      body.removeChild(CONTROL);
    } 
    
    CONTROL.addEventListener('mouseup', restore, false);
  }

  activate();

})(window);
