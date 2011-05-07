(function (window) {
  var $, css, fd, tip, panel, toolbar, ctrl, fs, VER;
  
  VER = "1.4b";
  
  /* css */  
  css = {
    STYLE_PRE: 'com_chengyinliu_wf_',
    CSS_URL: "http://chengyinliu.com/wf.css?ver=" + VER,
    LINK: null,
    
    init: function () {
      //Insert the stylesheet
      css.LINK = $("<link>").attr({
        'rel' : 'stylesheet',
        'href': css.CSS_URL
      }).appendTo("head");
    },
  
    restore: function () {
      //Remove stylesheet
      $(css.LINK).remove();
    },
  
    getClassName: function (name) {
      // Generate class name with prefix
      // Multiple names
      name = (typeof name === 'string') ? [name] : name;
      return css.STYLE_PRE + name.join(" " + css.STYLE_PRE);
    }
  };
  
  /* fontDetector */
  fd = {
    ALPHABET: 'abcdefghijklmnopqrstuvwxyz', // alphabet to draw on canvas
    FILLSTYLE: 'rgb(0,0,0)',                // canvas fill style 
    HEIGHT: 50,                             // canvas height in px    
    SIZE: 40,                               // font size to draw in px
    TEXTBASELINE: 'top',                    // canvas text baseline
    WIDTH: 600,                             // canvas width in px 
    HISTORY: {},                            // cache
    
    init: function () {
      fd.CANVAS_SUPPORT = !!($("<canvas>")[0].getContext);
                                              // detect canvas support for IE8-
    },
    
    restore: function () {
      
    },

    mkTextPixelArray: function (cssfont) {
      // draw the alphabet on canvas using cssfontfamily
      var canvas       = $('<canvas>')[0],
        ctx            = canvas.getContext('2d');
    
      canvas.width     = fd.WIDTH;
      canvas.height    = fd.HEIGHT;

      ctx.fillStyle    = fd.FILLSTYLE;
      ctx.textBaseline = fd.TEXTBASELINE;
      ctx.font         = cssfont.style + ' ' + cssfont.variant + ' ' + cssfont.weight + ' ' + fd.SIZE + 'px ' + cssfont.family;
      ctx.fillText(fd.ALPHABET, 0, 0);
      return ctx.getImageData(0, 0, fd.WIDTH, fd.HEIGHT).data;
    },
  
    sameArray: function (a1, a2) {
      // compare if two pixel arrays are identical
      var len = fd.WIDTH * fd.HEIGHT * 4, i; // each pixel is 4 bytes (RGBA)
      for (i = 0; i < len; i += 1) {
        if (a1[i] !== a2[i]) {
          return false;
        }
      }
    
      return true;
    },
  
    fontInUse: function (cssfont) {
      // try each font in cssfontfamily list to see which one is used
      var fonts  = cssfont.family.split(','),
          a0     = fd.mkTextPixelArray(cssfont.family);

      for (var i = 0, len = fonts.length; i < len; i += 1) {
        var a1 = fd.mkTextPixelArray(fonts[i]);
        if (fd.sameArray(a0, a1)
            && fd.sameArray(fd.mkTextPixelArray({
                                style   : cssfont.style, 
                                variant : cssfont.variant, 
                                weight  : cssfont.weight, 
                                size    : cssfont.size,
                                family  : fonts[i] + ',serif'}),
                            fd.mkTextPixelArray({
                                style   : cssfont.style,
                                variant : cssfont.variant,
                                weight  : cssfont.weight,
                                size    : cssfont.size,
                                family  : fonts[i] + ',sans-serif'}))) {
          // rendered fonts match, and font really is installed
          return $.trim(fonts[i]);
        }
      }
    
      return "(default font)";
    },
  
    firstFont: function (cssfontfamily) {
      var rs = $.trim(cssfontfamily.split(',')[0]);
      return rs;
    },
  
    detect: function (elem) {
      var cssfont = {
        family : $(elem).css('font-family'),
        style  : $(elem).css('font-style'),
        variant: $(elem).css('font-variant'),
        weight : $(elem).css('font-weight'),
        size   : $(elem).css('font-size')
      };

      return fd.HISTORY[cssfont.family] = 
        fd.HISTORY[cssfont.family] ||
        fd.CANVAS_SUPPORT ? fd.fontInUse(cssfont) : fd.firstFont(cssfont.family);
    }
  };

  /* Font services */
  fs = {
    CSS_NAME_TO_SLUG: {},
    FONT_DATA: {},
    SERVICES: {},
    
    init: function () {
      fs.typekit();
    },
    
    typekit: function () {
      /* Code for typekit, based on 
         https://github.com/typekit/typekit-api-examples/blob/master/bookmarklet/bookmarklet.js
      */
      
      function findKitId(){
        var kitId = null;
        $('script').each(function(index){
          var m = this.src.match(/use\.typekit\.com\/(.+)\.js/);
          if (m) {
            kitId = m[1];
            return false
          }
        });
        return kitId;
      }
      
      var kitId = findKitId();
      if(kitId){
        $.getJSON("https://typekit.com/api/v1/json/kits/" + kitId + "/published?callback=?", function(data){
          if(!data.errors) {
            fs.SERVICES.typekit = data.kit;
            $.each(data.kit.families, function(i, family) {
              $.each(family.css_names, function (i, css) {
                fs.CSS_NAME_TO_SLUG[css] = family.slug;
              });
              
              fs.FONT_DATA[family.slug] = fs.FONT_DATA[family.slug] || 
                { 
                  name: family.name,
                  services: {}
                };
                
              fs.FONT_DATA[family.slug].services.Typekit = {
                id: family.id,
                url: 'http://typekit.com/fonts/' + family.slug
              };
            });
          }
        });
      };
    },
    
    google: function () {
      $("link").each(function (i, l) {
        var url = $(l).attr("href");
        if (url.indexOf("fonts.googleapis.com/css?") >== 0) {
          /\?family=(([a-zA-Z+]*)(\:[a-z0-9]+)?(|)?)+/
        }
      }); 
    },
    
    getFontDataByCSSName: function (cssName) {
      var slug = fs.CSS_NAME_TO_SLUG[cssName];
      return (slug && fs.FONT_DATA[slug] ? fs.FONT_DATA[slug] : null);
    }
  };
  
  /* tip */
  tip = { 
    TIP: null,
  
    init: function () {
      //Insert Tip
      tip.TIP = $.createElem('div', ["tip", "elem"], '');
      $(tip.TIP).appendTo("body");
      
      //Listen to the mouse move
      $("body *:visible").mousemove(tip.update);
      // $("body").mousemove(tip.update);
      $("body").mouseout(tip.hide);
    },
  
    restore: function () {
      $(tip.TIP).remove();
      $("body :visible").unbind("mousemove", tip.update);
      $("body").unbind("mousemove", tip.update);
      $("body").unbind("mouseout", tip.hide);
    },

    hide: function () {
      $(tip.TIP).hide();
    },
  
    updateText: function (str) {
      $(tip.TIP).text(str).css('display', 'inline-block');
    },
  
    updatePos: function (pos_e) {
      $(tip.TIP).css({top: pos_e.pageY + 12, left: pos_e.pageX + 12});
    },
  
    updateTextPos: function (text, pos_e) {
      tip.updateText(text);
      tip.updatePos(pos_e);
    },
    
    update: function (e) {
      var ff = $(this).css("font-family"), x, y;
    
      if (this.tagName === 'IMG') {
        tip.updateTextPos(fd.detect(this) + " (May be incorrect on images)", e);
      } else if (this.tagName === 'EMBED') {
        tip.updateTextPos(fd.detect(this) + " (May be incorrect on Flash)", e);
      } else {
        tip.updateTextPos(fd.detect(this), e);    // Update the content of the tip
      }
    
      e.stopPropagation();
    }
  };
  
  /* Panel */
  panel = { 
    PANELS: [],
    
    init: function () {
      $("body :visible").click(panel.pin);
    },
    
    restore: function () {
      $("body :visible").unbind("click", panel.pin);
      
      $.each(panel.PANELS, function (i, p) {
        $(p).remove();
      });
    },
    
    fontFamily: function (elem) {
      var ff, fiu, fiuFound, font, fHTML;
    
      ff = $(elem).css('font-family');
      fiu = fd.detect(elem);
      ff = ff.replace(/;/, '').split(/,\s*/);
      fiuFound = false;
      
      for (font = 0; font < ff.length; font += 1) {
        if (ff[font] !== fiu) {
          ff[font] = "<span class='" + css.getClassName("fniu") + "'>" + ff[font] + "</span>";
        } else {
          ff[font] = "<span class='" + css.getClassName("fiu") + "'>" + ff[font] + "</span>";
          fiuFound = true;
          break;
        }
      }
    
      fHTML = ff.join(", ") + ";";
      if (!fiuFound) {
        fHTML += " <span class='" + css.getClassName("fiu") + "'>" + fiu + "</span>";
      }
      
      fHTML = "<div class=" + css.getClassName('fontfamily_list') + ">" + fHTML + "</div>"
    
      return [$.createElem('dt', 'family', "Font Family"), $.createElem('dd', '', fHTML)];
    },
    
    fontService: function (elem) {
      var fiu = fd.detect(elem), fontData = fs.getFontDataByCSSName(fiu), fontServices = '';
      if (fontData) {
        $.each(fontData.services, function (name, srv) {
          fontServices += '<div><span style="font-family:' + fiu + '">' + fontData.name + '</span> available at <a href="' + srv.url + '" target="_blank">' + name + "</a> &raquo;</div>";
        });
        
        return [$.createElem('dt', 'font_service', "Font Services"),
          $.createElem('dd', 'font_service', fontServices)];
      } else {
        return null;
      }
    },
    
    fontStyleWeight: function (elem) {
      var style = $(elem).css('font-style'),
        weight = $(elem).css('font-weight'),
        sdl = $.createElem('dl', 'style', 
          [$.createElem('dt', 'style', 'Style'), $.createElem('dd', 'style', style)]),
        wdl = $.createElem('dl', 'weight', 
          [$.createElem('dt', 'weight', 'Weight'), $.createElem('dd', 'weight', weight)]);
        
      return [$.createElem('dl', 'style_weight', [sdl, wdl])];
    },
  
    sizeLineHeight: function (elem) {
      var size = $(elem).css('font-size'),
        lh = $(elem).css('line-height'),
        sdl = $.createElem('dl', 'size', 
          [$.createElem('dt', 'size', 'Font Size'), $.createElem('dd', 'size', size)]),
        lhdl = $.createElem('dl', 'lh', 
          [$.createElem('dt', 'lh', 'Line Height'), $.createElem('dd', 'lh', lh)]);
        
      return [$.createElem('dl', 'size_lh', [sdl, lhdl])];
    },

    extern: function (elem) {
      var wtfform, wtflink, tools = [], disclaimer;
    
      // Use WhatTheFont service for IMG
      if (elem.tagName === 'IMG' && elem.src) {
        // Build a form for WhatTheFont services
        wtfform = $("<form>")
          .attr({
            action: "http://new.myfonts.com/WhatTheFont/upload.php?utm_source=whatfont&utm_medium=whatfont&utm_campaign=whatfont",
            method: "POST",
            target: "_blank"
          })
          .html('<input type="hidden" name="MAX_FILE_SIZE" value="2000000"><input size="37" name="upload_url" type="text" value="' + elem.src + '">')
          .css("display", "none")[0];
      
        wtflink = $.createElem('a', 'wtf_link', 'MyFonts WhatTheFont for images &raquo;');

        $(wtflink).click(function (e) {
          wtfform.submit();
        });      

        tools = tools.concat([
          $.createElem('dt', 'wtf', ['External Services']),
          $.createElem('dd', 'wtf', [wtfform, wtflink])
        ]);
      }
    
      return tools.length ? $.createElem('dl', 'external', tools) : null;    
    },
  
    detailList: function (elem) {
      var ff = panel.fontFamily(elem),
        fsrv = panel.fontService(elem),
        fsw = panel.fontStyleWeight(elem),
        fslh = panel.sizeLineHeight(elem),
        ext = panel.extern(elem),
        dl = $.createElem('dl', '', ff.concat(fsrv).concat(fsw).concat(fslh).concat(ext));
      
      return dl;
    },
  
    title: function (elem) {
      var text = $.createElem('div', '', ''),
        close = $.createElem('div', 'close_button', '&times;'),
        title = $.createElem('div', 'panel_title', [text, close]);
    
      $(close)
        .attr("title", "Close")
        .click(function (e) {
          $(title).parent().remove();
          e.stopPropagation();
        });
          
      return title;
    },
  
    get: function (elem) {
      var panelTitle = panel.title(elem),
        panelDetailList = panel.detailList(elem),
        p = $.createElem('div', ["elem", "panel"], [panelTitle, panelDetailList]);
    
      $(p).click(function (e) {
        $(this).find('dl').css('-webkit-animation', 'none');
        $(this).find('.com_chengyinliu_wf_panel_title').css('-webkit-animation', 'none');
        $(this).detach();
        $(this).appendTo('body');
        e.stopPropagation();
      });
    
      return p;
    },
    
    pin: function (e) {
      var p, height, x, y;
      tip.hide();
      
      p = panel.get(this);
      //setEventPosOffset(panel, e, -13, 12);
      
      $(p).css({
        'top': e.pageY + 12,
        'left': e.pageX - 13
      }).appendTo("body");

      panel.PANELS.push(p);

      e.stopPropagation();
      e.preventDefault();
    }
  };
  
  /* Toolbar */
  toolbar = {
    TOOLBAR: null,
    
    init: function () {
      var exit = $.createElem('div', "exit", "Exit WhatFont"),
        help = $.createElem('div', "help", "<strong>Hover</strong> to identify<br /><strong>Click</strong> to pin a detail panel");
        
      toolbar.TOOLBAR = $("<div>")
        .addClass(css.getClassName(["elem", "control"]))
        .append(exit)
        .append(help)
        .appendTo('body');      
      
      $(exit).click(function () {
        ctrl.restore();
      });
    },
    
    restore: function () {
      $(toolbar.TOOLBAR).remove();
    }
  };
  
  /* Controller */
  ctrl = {
    shortcut: function (e) {
      var key = e.keyCode || e.which;
    
      if (key === 27) {
        ctrl.restore();
        e.stopPropagation();
      }
    },
    
    restore: function (e) {
      var p;
    
      $("body :visible").unbind('mousemove', ctrl.updateTip);
      $("body :visible").unbind('click', ctrl.pinPanel);
    
      fd.restore();
      toolbar.restore();
      tip.restore();
      panel.restore();
      css.restore();
      
      $("body").unbind("keydown", ctrl.shortcut);
    },
  
    init: function () {
      $.createElem = function (tag, className, content, attr) {
        // Shortcut for generating DOM element
        var e = $("<" + tag + ">"), c;
        className = className || [];
        content = content || '';

        className = (typeof className === 'string') ? [className] : className;
        className.push('basic');
        
        e.addClass(css.getClassName(className));
        
        if (typeof content === 'string') {
          e.html(content);
        } else if (content.constructor === Array) {
          $.map(content, function (n, i) {
            return e.append(n);
          });
        } else {
          e.append(content);
        }
        
        e.attr(attr);

        return e[0];
      };
      
      css.init();
      fd.init();
      tip.init();
      panel.init();
      toolbar.init();
      fs.init();
      
      $("body").keydown(ctrl.shortcut);
    }
  };
  
  function loadJQuery(callback) {
    var s;
    if (typeof jQuery === 'undefined') {
      s = window.document.createElement('script');
      s.src = 'https://ajax.googleapis.com/ajax/libs/jquery/1.5.2/jquery.min.js';      
      s.onload = function () {
        jQuery.noConflict();
        $ = jQuery;
        callback();
      };
      
      window.document.getElementsByTagName('head')[0].appendChild(s);
    } else {
      $ = jQuery;
      callback();
    }
  }
  
  loadJQuery(ctrl.init);
}(window));
