/*jslint browser: true, regexp: true, white: true, newcap: false, nomen: true, plusplus: true, vars: true */
/*global window, jQuery, $ */

function _whatFont() {
    // Base Settings
    // -----------------------
    var VER = "2.0",

        SCREENSHOT_WIDTH = 480,
        SCREENSHOT_HEIGHT = 320,

        $, h2c, apiURL, css, toolbar, panel, ctrl, fs, _wf, TestCanvas, TypeInfo, Tip, tip, defaultFont, typeInfoCache = [];


    // Test Canvas
    // -----------------------
    // Draw text (or by default alphabet) to the canvas and enable comparing between two canvas

    TestCanvas = function(typeInfo, text, canvas_options) {
        canvas_options = canvas_options || {};
        this.data = [];

        if (!TestCanvas.isSupported) {
            return;
        }

        this.typeInfo = typeInfo;
        this.text = text || 'abcdefghijklmnopqrstuvwxyz';
        this.canvas_options = $.extend(this.canvas_options, canvas_options);

        this.canvas = $('<canvas>')[0];
        this.draw();
    };

    TestCanvas.isSupported = !! document.createElement("canvas").getContext;

    TestCanvas.prototype = {
        canvas_options: {
            fillStyle: 'rgb(0,0,0)',
            height: 50,
            size: '40px',
            textBaseline: 'top',
            width: 600
        },

        getFontOption: function() {
            return this.typeInfo.style + ' ' + this.typeInfo.weight + ' ' + this.canvas_options.size + ' ' + this.typeInfo.fonts;
        },

        draw: function() {
            // draw the alphabet on canvas
            var ctx = this.canvas.getContext('2d');

            $.each(this.canvas_options, function(opt, val) {
                ctx[opt] = val;
            });

            ctx.font = this.getFontOption();
            ctx.fillText(this.text, 0, 0);

            return (this.data = ctx.getImageData(0, 0, this.canvas_options.width, this.canvas_options.height).data);
        },

        isEqual: function(otherCanvas) {
            // compare if two pixel arrays are identical
            var len = this.canvas_options.width * this.canvas_options.height * 4,
                i, data1 = this.data,
                data2 = otherCanvas.data; // each pixel is 4 bytes (RGBA)
            for (i = 0; i < len; i += 1) {
                if (data1[i] !== data2[i]) {
                    return false;
                }
            }

            return true;
        }
    };


    // Type Info
    // -----------------------
    // A class generates typography info from a DOM object

    TypeInfo = function(element) {
        this.element = $(element);
        this.detect();
    };

    TypeInfo.roundFloatWithPxUnit = function(original) {
        var number = Math.round(parseFloat(original));

        if (isNaN(number)) {
            return '(unknown)';
        } else {
            return Math.round(parseFloat(original)) + 'px';
        }
    }

    TypeInfo.prototype = {
        detect: function() {
            this.detectBasicCSS();

            this.variant = this.getVariant();
            this.stack = this.fonts.split(/,\s*/);

            this.testCanvas = new TestCanvas(this);
            this.current = this.getCurrentFont();
        },

        detectBasicCSS: function() {
            this.fonts = this.element.css('font-family');
            this.weight = this.element.css('font-weight');
            this.style = this.element.css('font-style');
            this.size = TypeInfo.roundFloatWithPxUnit(this.element.css('font-size'));
            this.lineHeight = TypeInfo.roundFloatWithPxUnit(this.element.css('line-height'));
            this.color = this.element.css('color');
        },

        getFullCSS: function() {
            var props = ['font-family', 'font-weight', 'font-style'],
                css = {},
                p;

            for (p = 0; p < props.length; p++) {
                css[props[p]] = this.element.css(props[p]);
            }

            return css;
        },

        getVariant: function() {
            if (this.weight === 'normal' && this.style === 'normal') {
                return 'regular';
            }
            if (this.weight === 'normal') {
                return this.style;
            }
            if (this.style === 'normal') {
                return this.weight;
            }

            return this.weight + ' ' + this.style;
        },

        getCurrentFont: function() {
            // To find out which font is being used,
            // we go throught the the whole stack.
            //
            // For each font F, first we test if it exist
            // by create two canvas, one with F and sans-serif
            // the other with F and serif. By comparing
            // the result, we know F exist if we get the
            // same result from both canvas.
            //
            // If the F exist, then we compare the result of F
            // to the result of the original font stack.
            //
            var stack = this.stack.slice(0),
                f, typeInfoSerif, typeInfoSansSerif, canvasSerif, canvasSansSerif, typeInfoDefault, canvasDefault;

            for (f = 0; f < this.stack.length; f++) {
                typeInfoSerif = $.extend({}, this, {
                    fonts: stack[f] + ' ,serif',
                    stack: [stack[f], 'serif']
                });

                typeInfoSansSerif = $.extend({}, this, {
                    fonts: stack[f] + ', sans-serif',
                    stack: [stack[f], 'sans-serif']
                });

                canvasSerif = new TestCanvas(typeInfoSerif);
                canvasSansSerif = new TestCanvas(typeInfoSansSerif);

                if (canvasSerif.isEqual(canvasSansSerif) && this.testCanvas.isEqual(canvasSerif)) {
                    // Found F
                    return stack[f];
                }
            }

            // Cannot find any perfect matching font, so we
            // have to guess.
            //
            // Two possiblities: 1. the browser fallback to
            // the default sans-serif or serif. It's impossible
            // to know what is the actual font, but we can guess
            // whether it is sans-serif or serif.
            //
            // 2. We can't find the font due to subsetting
            // (eg H&FJ webfont). In this case, we compare the
            // default font to the original result, if it doesn't
            // match, we blindly guess it is the first font in
            // the font stack is being used.
            //
            if (defaultFont) {
                typeInfoDefault = $.extend({}, this, {
                    fonts: defaultFont,
                    stack: [defaultFont]
                });

                canvasDefault = new TestCanvas(typeInfoDefault);

                // make sure it is not because of sub setting
                if (this.testCanvas.isEqual(canvasDefault)) {
                    return defaultFont;
                }
            }

            return stack[0]; // Can't detected, guess
        },

        saveDesignToServer: function(cb) {
            var that = this;

            $.getJSON(apiURL + '/designs/create?callback=?', {
                font: this.current,
                style: this.style,
                weight: this.weight,
                image_base64: this.screenshot,
                url: document.location.toString()
            }, function(data) {
                if (data.url) {
                    that.designURL = data.url;
                }
                if (cb) {
                    cb();
                }
            });
        }
    };


    // CSS Related
    // -----------------------

    css = {
        STYLE_PRE: '__whatfont_',

        CSS_URL: "https://chengyinliu.com/wf.css?ver=" + VER,

        init: function() {
            //Insert the stylesheet
            if (css.CSS_URL) {
                css.$el = $("<link>").attr({
                    'rel': 'stylesheet',
                    'href': css.CSS_URL
                }).appendTo("head");
            }
        },

        restore: function() {
            //Remove stylesheet
            if (css.$el) {
                css.$el.remove();
            }
        },

        getClassName: function(name) {
            // Generate class name with prefix
            // Multiple names for class="class1 class2"
            name = (typeof name === 'string') ? [name] : name;
            return css.STYLE_PRE + name.join(" " + css.STYLE_PRE);
        }
    };


    // Font Services
    // -----------------------

    fs = {
        getSlugWithCSSName: {},
        // Translate CSS font name to slug

        fontData: {},
        // Font data for different services

        services: {},
        // Raw data from font services

        init: function() {
            fs.typekit();
            fs.google();
            fs.fontdeck();
        },

        typekit: function() {
            // Code for typekit, based on
            // https://github.com/typekit/typekit-api-examples/blob/master/bookmarklet/bookmarklet.js
            var kitId;

            // Find kitId
            $('script').each(function(index) {
                var m = this.src.match(/use\.typekit\.(com|net)\/(.+)\.js/);
                if (m) {
                    kitId = m[2];
                    return false;
                }
            });

            if (kitId) {
                // Get Font data
                $.getJSON("https://typekit.com/api/v1/json/kits/" + kitId + "/published?callback=?", function(data) {
                    if (!data.errors) {
                        fs.services.typekit = data.kit;
                        $.each(data.kit.families, function(i, family) {
                            $.each(family.css_names, function(i, css) {
                                fs.getSlugWithCSSName[css.toLowerCase()] = family.slug;
                            });

                            fs.fontData[family.slug] = fs.fontData[family.slug] || {
                                name: family.name,
                                services: {}
                            };

                            fs.fontData[family.slug].services.Typekit = {
                                id: family.id,
                                url: 'http://typekit.com/fonts/' + family.slug
                            };
                        });
                    }
                });
            }
        },

        google: function() {
            // Google Font API
            $("link").each(function(i, l) {
                var url = $(l).attr("href"),
                    fstr;
                if (url.indexOf("fonts.googleapis.com/css?") >= 0) {
                    fstr = url.match(/\?family=([^&]*)/)[1].split('|'); // Font names
                    $.each(fstr, function(i, s) {
                        var str = s.split(":")[0],
                            fontName = str.replace(/\+/g, ' '),
                            slug = fontName.replace(/ /g, '-').toLowerCase();

                        fs.getSlugWithCSSName[fontName] = slug;
                        fs.fontData[slug] = fs.fontData[slug] || {
                            name: fontName,
                            services: {}
                        };

                        fs.fontData[slug].services.Google = {
                            url: 'http://www.google.com/webfonts/family?family=' + str
                        };
                    });
                }
            });
        },

        fontdeck: function() {
            // Fontdeck fonts
            var projectIds = [],
                domain = location.hostname;

            $("link").each(function(i, l) {
                // when loaded directly with stylesheet
                var url = $(l).attr("href");
                if (url.indexOf("fontdeck.com") >= 0) {
                    var pId = url.match(/^.*\/(\d+)\.css$/);
                    if (pId) {
                        projectIds.push(pId[1]);
                    }
                }
            });

            $("script").each(function(i, l) {
                // when loaded with Google font loader
                var url = $(l).attr("src");
                if (typeof url !== 'undefined' && url.indexOf("fontdeck.com") >= 0) {
                    var pId = url.match(/^.*\/(\d+)\.js$/);
                    if (pId) {
                        projectIds.push(pId[1]);
                    }
                }
            });

            $.each(projectIds, function(i, projectId) {
                $.getJSON("http://fontdeck.com/api/v1/project-info?project=" + projectId + "&domain=" + domain + "&callback=?", function(data) {
                    if (typeof data !== 'undefined' && typeof data.provides !== 'undefined') {
                        $.each(data.provides, function(i, font) {
                            var fontName = font.name,
                                slug = fontName.replace(/ /g, '-').toLowerCase(),
                                searchTerm = fontName.split(' ')[0],
                                fontURL = font.url || 'http://fontdeck.com/search?q=' + searchTerm;

                            fs.getSlugWithCSSName[fontName] = slug;
                            fs.fontData[slug] = fs.fontData[slug] || {
                                name: fontName,
                                services: {}
                            };

                            fs.fontData[slug].services.Fontdeck = {
                                url: fontURL
                            };
                        });
                    }
                });
            });
        },

        getFontDataByCSSName: function(cssName) {
            var name = cssName.replace(/^"|'/, '').replace(/"|'$/, ''),
                // No quotes
                slug = fs.getSlugWithCSSName[name];
            return ((slug && fs.fontData[slug]) ? fs.fontData[slug] : null);
        },

        getFontNameByCSSName: function(cssName) {
            var name = cssName.replace(/^"|'/, '').replace(/"|'$/, ''),
                // No quotes
                slug = fs.getSlugWithCSSName[name];
            return ((slug && fs.fontData[slug]) ? fs.fontData[slug].name : null);
        }
    };



    // Tooltip
    // -----------------------

    Tip = function() {
        this.currentCacheId = -1;
        this.el = $.wfElem('div', ['tip', 'elem'], '');
        this.$el = $(this.el);

        this.init();
    };

    Tip.prototype = {
        init: function() {
            var that = this;

            this.$el.appendTo('body');

            // TODO use delegation on body so dynamic elements are supported
            $('body :visible').on('mousemove.wf', function(e) {
                that.update($(this), e);
                that.show();

                e.stopPropagation();
            });

            $('body').on('mouseout.wf', function(e) {
                that.hide();
            });
        },

        hide: function() {
            this.$el.hide();
        },

        show: function() {
            this.$el.show();
        },

        update: function(newElement, event) {
            var cacheId = newElement.data('wfCacheId');

            this.updatePosition(event.pageY, event.pageX);

            if (this.element === newElement) {
                return;
            }

            if (!cacheId) {
                cacheId = typeInfoCache.length;
                typeInfoCache.push(undefined);
            }

            this.element = newElement;
            this.element.data('wfCacheId', cacheId);

            typeInfoCache[cacheId] = this.typeInfo = typeInfoCache[cacheId] || new TypeInfo(newElement);

            this.updateText(this.typeInfo.current);
        },

        updatePosition: function(top, left) {
            this.$el.css({
                top: top + 12,
                left: left + 12
            });
        },

        updateText: function(text) {
            this.$el.text(text).css('display', 'inline-block');
        },

        remove: function() {
            this.$el.remove();
            $('body :visible').off('mousemove.wf');
            $('body').off('mouseout.wf');
        }
    };


    /* Panel */
    panel = {
        fontServiceIcons: {},

        init_tmpl: function() {
            panel.tmpl = (function() {
                var tmpl = $('<div class="elem panel">' + '<div class="panel_title">' + '<span class="title_text"></span>' + '<a class="close_button" title="Close">&times;</a>' + '</div>' +

                '<div class="panel_content">' + '<ul class="panel_properties">' + '<li>' + '<dl class="font_family">' + '<dt class="panel_label">Font Family</dt>' + '<dd class="panel_value"></dd>' + '</dl>' + '</li>' +

                '<li>' + '<div class="size_line_height clearfix">' + '<dl class="size section">' + '<dt class="panel_label">Font Size</dt>' + '<dd class="panel_value"></dd>' + '</dl>' + '<dl class="line_height">' + '<dt class="panel_label">Line Height</dt>' + '<dd class="panel_value"></dd>' + '</dl>' + '</div>' + '</li>' +

                '<li class="panel_no_border_bottom">' + '<dl class="type_info clearfix">' + '<dt class="panel_label"></dt>' + '<dd class="type_preview">' + "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz" + '</dd>' + '</dl>' +

                '<div class="font_services panel_label" style="display:none;">' + 'Font Served by ' + '</div>' + '</li>' + '</ul>' +

                '<div class="panel_tools clearfix">' + '<div class="panel_tools_left">' + '<div class="color_info">' + '<a title="Click to change color format" class="color_info_sample">&nbsp;</a>' + '<span class="color_info_value"></span>' + '</div>' + '</div>' + '<div class="panel_tools_right">' + '<a href="https://twitter.com/share" class="tweet_icon" target="_blank">Tweet</a>' + '</div>' + '</div>' + '</div>' + '</div>');

                return (function() {
                    return tmpl.clone();
                });
            }());
        },

        init: function() {
            $("body :visible").on("click.wf", panel.pin);

            panel.init_tmpl();

            panel.panels = $([]);

            panel.fontServiceIcons.Typekit = $("<span>").addClass("service_icon service_icon_typekit").text('Typekit');
            panel.fontServiceIcons.Google = $("<span>").addClass("service_icon service_icon_google").text('Google Web Fonts');
            panel.fontServiceIcons.Fontdeck = $("<span>").addClass("service_icon service_icon_fontdeck").text('Fontdeck');
        },

        restore: function() {
            $("body :visible").unbind("click.wf", panel.pin);

            panel.panels.remove();
        },

        convertClassName: function(newPanel) {
            newPanel.find('*').add(newPanel).each(function(i, elem) {
                var className = $(elem).attr('class');

                className = (className === "" ? "basic" : (className + " basic"));

                if (className) {
                    className = className.split(' ');
                    $(elem).attr('class', css.getClassName(className));
                }
            });

            return newPanel;
        },

        typePreview: function(typeInfo, newPanel) {
            var canv = $(newPanel).find('.type_preview');

            canv.css(typeInfo.getFullCSS());

            return newPanel;
        },

        fontService: function(typeInfo, newPanel) {
            // Font Service section
            var fiu = typeInfo.current,
                fontData = fs.getFontDataByCSSName(fiu),
                fontServices, fontName;

            fontServices = $("<ul>").addClass('font_service');

            if (fontData) {
                $.each(fontData.services, function(name, srv) {
                    $("<li>").append(
                    $("<a>").append($(panel.fontServiceIcons[name]).clone()).attr("href", srv.url).attr("target", "_blank")).appendTo(fontServices);
                });

                $(newPanel).find(".font_services").append(fontServices).show();
            } else {
                $(newPanel).find(".font_services").hide();
            }

            return newPanel;
        },

        fontFam: function(typeInfo, newPanel) {
            // Font Family section
            var fontStack = typeInfo.fonts.replace(/;/, '').split(/,\s*/),
                fontInUse = typeInfo.current,
                fontInUseFound = false,
                font, fHTML, ff, fiu, fiuFound;

            ff = typeInfo.fonts;
            fiu = typeInfo.current; // cssName Font in use
            ff = ff.replace(/;/, '').split(/,\s*/);
            fiuFound = false;

            // Font stack
            for (font = 0; font < fontStack.length; font += 1) {
                if (fontStack[font] !== fontInUse) {
                    fontStack[font] = "<span class='" + "fniu" + "'>" + fontStack[font] + "</span>";
                } else {
                    fontStack[font] = "<span class='" + "fiu" + "'>" + fontStack[font] + "</span>";
                    fontInUseFound = true;
                    break;
                }
            }

            fHTML = fontStack.join(", ") + ";";
            if (!fontInUseFound) {
                fHTML += " <span class='" + ".fiu" + "'>" + fontInUse + "</span>";
            }

            fHTML = "<div class=" + css.getClassName('fontfamily_list') + ">" + fHTML + "</div>";

            $(newPanel).find(".font_family>dd").html(fHTML);

            return newPanel;
        },

        sizeLineHeight: function(typeInfo, newPanel) {
            var size = typeInfo.size,
                lh = typeInfo.lineHeight;

            $(newPanel).find(".size>dd").text(size);
            $(newPanel).find(".line_height>dd").text(lh);

            return newPanel;
        },

        color: function(typeInfo, newPanel) {
            var rgb_color = typeInfo.color,
                sample = $(newPanel).find(".color_info_sample"),
                value = $(newPanel).find(".color_info_value"),
                re, match, r, g, b, hex_color, colors, color_type;

            if (rgb_color.indexOf('rgba') !== -1) {
                // don't display rgba color (not accurate)
                $(newPanel).find(".color_info").hide();
                return;
            }

            re = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
            match = rgb_color.match(re);
            r = parseInt(match[1], 10).toString(16);
            g = parseInt(match[2], 10).toString(16);
            b = parseInt(match[3], 10).toString(16);
            r = (r.length === 1) ? '0' + r : r;
            g = (g.length === 1) ? '0' + g : g;
            b = (b.length === 1) ? '0' + b : b;
            hex_color = '#' + r + g + b;
            colors = [rgb_color, hex_color];
            color_type = 0;

            sample.css("background-color", rgb_color).click((function(colors, color_type, value) {
                return function(e) {
                    color_type = (color_type + 1) % colors.length;
                    value.text(colors[color_type]);

                    e.preventDefault();
                    return false;
                };
            }(colors, color_type, value))).click();
        },

        tweet: function(typeInfo, newPanel) {
            var tweet_icon = $(newPanel).find(".tweet_icon"),
                cssName = typeInfo.current,
                typeName = fs.getFontNameByCSSName(cssName) || cssName;

            tweet_icon.click(function() {
                var url = tweet_icon.attr("href");
                panel.takeScreenshot(newPanel.e, newPanel, function() {
                    url += '?text=' + encodeURIComponent('I like this typography design with ' + typeName + '.') + '&url=' + encodeURIComponent(typeInfo.designURL || window.location.href) + '&via=What_Font';
                    window.open(url, '', 'height=430,width=550');
                });

                return false;
            });
        },

        panelContent: function(typeInfo, newPanel) {
            $(['typePreview', 'fontService', 'fontFam', 'sizeLineHeight', 'color', 'tweet']).each(function(i, prop) {
                panel[prop](typeInfo, newPanel);
            });
        },

        panelTitle: function(typeInfo, newPanel) {
            // Panel title
            var cssName = typeInfo.current,
                typeName = fs.getFontNameByCSSName(cssName) || cssName,
                title_text = typeName + ' - ' + typeInfo.variant;

            $(newPanel).find(".title_text").html(title_text).css(typeInfo.getFullCSS());

            (function(newPanel) {
                $(newPanel).find(".close_button").click(function(e) {
                    $(newPanel).remove();

                    e.stopPropagation();
                    return false;
                });
            }(newPanel));

            return newPanel;
        },

        get: function(elem) {
            // Create panel
            var p = panel.tmpl(),
                typeInfo = new TypeInfo(elem);

            panel.panelTitle(typeInfo, p);
            panel.panelContent(typeInfo, p);
            panel.convertClassName(p);
            p.typeInfo = typeInfo;

            $(p).click(function(e) {
                $(this).find('*').css('-webkit-animation', 'none');
                $(this).detach();
                $(this).appendTo('html');
            });

            return p;
        },

        takeScreenshot: function(e, p, cb) {
            if (p.typeInfo.designURL) {
                cb(e, p);
                return;
            }

            var centerX = e.pageX,
                centerY = e.pageY;

            screenshot.takeScreenshotAroundPoint(function(data) {
                if (data) {
                    p.screenshot = data;
                    p.typeInfo.screenshot = data;
                    p.typeInfo.saveDesignToServer(function() {
                        cb(e, p);
                    });
                } else {
                    cb(e, p);
                }

            }, centerX, centerY, SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT);
        },

        showPanel: function(e, p) {
            //setEventPosOffset(panel, e, -13, 12);
            $(p).css({
                'top': e.pageY + 12,
                'left': e.pageX - 13
            }).appendTo("html");

            panel.panels = panel.panels.add(p);
        },

        pin: function(e) {
            // Add a panel according to event e
            // (Event handler)
            var p;

            tip.hide();

            p = panel.get(this);
            p.e = e;
            panel.showPanel(e, p);

            e.stopPropagation();
            e.preventDefault();
        },

        hideAll: function() {
            $(panel.panels).hide();
        },

        showAll: function() {
            $(panel.panels).find('*').css('-webkit-animation', 'none');
            $(panel.panels).show();
        }
    };

    /* Toolbar */
    toolbar = {
        TOOLBAR: null,

        init: function() {
            var exit = $.wfElem('div', "exit", "Exit WhatFont"),
                help = $.wfElem('div', "help", "<strong>Hover</strong> to identify<br /><strong>Click</strong> to pin a detail panel");

            toolbar.TOOLBAR = $("<div>").addClass(css.getClassName(["elem", "control"])).append(exit).appendTo('body');

            $(exit).click(function() {
                ctrl.restore();
            });
        },

        restore: function() {
            $(toolbar.TOOLBAR).remove();
        }
    };


    function getDefaultFont() {
        var random = $('<p>').css('font-family', 'S0m3F0n7'),
            serif = $('<p>').css('font-family', 'serif'),
            sansSerif = $('<p>').css('font-family', 'sans-serif'),
            testCanvasRandom = new TestCanvas(new TypeInfo(random)),
            testCanvasSerif = new TestCanvas(new TypeInfo(serif)),
            testCanvasSansSerif = new TestCanvas(new TypeInfo(sansSerif));

        if (testCanvasRandom.isEqual(testCanvasSerif)) {
            defaultFont = 'serif';
        } else {
            defaultFont = 'sans-serif';
        }
    }

    /* Controller */
    ctrl = {
        shortcut: function(e) {
            var key = e.keyCode || e.which;

            if (key === 27) {
                ctrl.restore();
                e.stopPropagation();
            }
        },

        restore: function(e) {
            $("body :visible").unbind('mousemove', ctrl.updateTip);
            $("body :visible").unbind('click', ctrl.pinPanel);

            toolbar.restore();
            tip.remove();
            panel.restore();
            css.restore();

            $("body").unbind("keydown", ctrl.shortcut);
            $(window).unbind('resize.whatfont');

            window._WHATFONT = false;
        },

        init: function(options) {
            options = options || {};

            var loaded;

            if (!$ && jQuery) {
                $ = jQuery;
            }

            loaded = (typeof window._WHATFONT !== 'undefined') && window._WHATFONT;

            if (loaded || !$) {
                return false;
            }

            window._WHATFONT = true;

            $.wfElem = function(tag, className, content, attr) {
                // Shortcut for generating DOM element
                var e = $("<" + tag + ">"),
                    c;
                className = className || [];
                content = content || '';

                className = (typeof className === 'string') ? [className] : className;
                className.push('basic');

                e.addClass(css.getClassName(className));

                if (typeof content === 'string') {
                    e.html(content);
                } else if (content.constructor === Array) {
                    $.map(content, function(n, i) {
                        return e.append(n);
                    });
                } else {
                    e.append(content);
                }

                if (typeof attr !== 'undefined') {
                    e.attr(attr);
                }

                return e[0];
            };

            getDefaultFont();

            if (!options.isDisablingUI) {
                css.init();
                tip = new Tip();
                panel.init();
                toolbar.init();
                $("body").keydown(ctrl.shortcut);
            }

            fs.init();

            screenshot.fullScreenshot = null;
            $(window).bind('resize.whatfont', function() {
                screenshot.fullScreenshot = null;
            });
        }
    };


    // Screenshot
    // ----------

    var screenshot = {
        captureAll: true,

        format: 'image/jpeg',

        quality: 0.7,

        capturer: function(cb, options) {
            options = options || {};

            var scrollTopPos, scrollLeftPos;

            scrollTopPos = $(window).scrollTop();
            scrollLeftPos = $(window).scrollLeft();

            if (TestCanvas.isSupported && h2c) {
                try {
                    $(window).scrollTop(0);
                    $(window).scrollLeft(0);
                    h2c([document.body], {
                        onrendered: function(canvas) {
                            $(window).scrollTop(scrollTopPos);
                            $(window).scrollLeft(scrollLeftPos);
                            screenshot.fullScreenshot = canvas;
                            cb(canvas.toDataURL(options.format || screenshot.format, options.quality || screenshot.quality));
                        },
                        proxy: undefined
                    });
                } catch (e) {
                    $(window).scrollTop(scrollTopPos);
                    $(window).scrollLeft(scrollLeftPos);
                    cb();
                }
            } else {
                cb();
                $(window).scrollTop(scrollTopPos);
                $(window).scrollLeft(scrollLeftPos);
            }
        },

        dataURLToCanvas: function(dataURL, cb) {
            try {
                var canvas = $('<canvas>')[0],
                    ctx = canvas.getContext('2d'),
                    img = new Image();

                img.onload = function() {
                    ctx.height = img.height;
                    ctx.width = img.width;
                    ctx.drawImage(img, 0, 0);
                    cb(canvas);
                };

                img.src = dataURL;
            } catch(e) {
                cb(null);
            }
        },

        takeFullScreenshot: function(cb) {
            if (screenshot.fullScreenshot) {
                return cb(screenshot.fullScreenshot);
            } else {
                screenshot.capturer(function(dataURL) {
                    screenshot.fullScreenshot = dataURL;
                    cb(dataURL);
                }, {
                    quality: screenshot.quality,
                    format: screenshot.format
                });
            }
        },

        takePartialScreenshot: function(cb) {
            panel.hideAll();

            window.setTimeout(function() {
                screenshot.capturer(function(dataURL) {
                    panel.showAll();
                    cb(dataURL);
                });
            }, 0);
        },

        takeCroppedScreenshot: function(cb, x1, y1, x2, y2, options) {
            var capturer, scrollTop, width, height;

            capturer = screenshot.captureAll ? screenshot.takeFullScreenshot : screenshot.takePartialScreenshot;

            if (x1 !== undefined) {
                width = x2 - x1;
                height = y2 - y1;
            }

            options = options || {};

            capturer(function(dataURL) {
                var image;

                if (!dataURL) {
                    return cb();
                }

                if (x1 === undefined) {
                    cb(dataURL);
                } else {
                    image = new Image();
                    image.src = dataURL;

                    image.onload = function() {
                        var croppedCanvas, ctx, newDataURL;

                        croppedCanvas = $('<canvas>')[0];

                        croppedCanvas.width = width;
                        croppedCanvas.height = height;

                        ctx = croppedCanvas.getContext('2d');

                        //draw background / rect on entire canvas
                        ctx.fillStyle = 'rgba(255,255,255,1)';
                        ctx.fillRect(0, 0, width, height);

                        ctx.drawImage(image, x1, y1, width, height, 0, 0, width, height);

                        newDataURL = croppedCanvas.toDataURL(options.format || screenshot.format, options.quality || screenshot.quality);

                        cb(newDataURL);
                    };
                }

                return true;
            }, options);
        },

        takeScreenshotAroundPoint: function(cb, centerX, centerY, width, height, options) {
            var x1 = centerX - width / 2,
                x2 = x1 + width,
                y1 = centerY - height/ 2,
                y2 = y1 + height,
                scrollTop, scrollLeft;

            if (!screenshot.captureAll) {
                scrollTop = $(window).scrollTop();
                scrollLeft = $(window).scrollLeft();
                x1 -= scrollLeft;
                x2 -= scrollLeft;
                y1 -= scrollTop;
                y2 -= scrollTop;
            }

            if (x1 < 0) {
                x2 -= x1;
                x1 = 0;
            }

            if (y1 < 0) {
                y2 -= y1;
                y1 = 0;
            }

            screenshot.takeCroppedScreenshot(cb, x1, y1, x2, y2, options);
        }
    };

    _wf = {
        setJQuery: function(jQ) {
            $ = jQ;
        },
        setHTML2Canvas: function(html2canvas) {
            h2c = html2canvas;
        },
        setScreenshot: function(options) {
            screenshot = $.extend(screenshot, options);
        },
        setAPIURL: function(url) {
            apiURL = url;
        },
        setCSSURL: function(url) {
            css.CSS_URL = url;
        },
        getVer: function() {
            return VER;
        },
        init: ctrl.init,
        restore: ctrl.restore,
        getTypeInfoForSelectedText: function() {
            if (!window || !window.getSelection) { return null; }

            var selection = window.getSelection(),
                element;

            if (selection.toString().length === 0) { return null; }

            element = selection.anchorNode.parentElement;

            return new TypeInfo(element);
        },
        getFontServiceInfo: function(typeInfo) {
            var fiu = typeInfo.current,
                fontData = fs.getFontDataByCSSName(fiu);

            return fontData;
        }

    };

    return _wf;
}

