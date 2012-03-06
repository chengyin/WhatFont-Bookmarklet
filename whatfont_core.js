function _whatFont() {
	var $, css, fd, tip, panel, toolbar, ctrl, fs, VER, _wf;
	
	VER = "1.6.1";
	
	/* css */	 
	css = {
		STYLE_PRE: '__whatfont_',
		CSS_URL: "http://chengyinliu.com/wf.css?ver=" + VER,
		LINK: null,
		
		init: function () {
			//Insert the stylesheet
			if (css.CSS_URL) {
				css.LINK = $("<link>").attr({
					'rel' : 'stylesheet',
					'href': css.CSS_URL
				}).appendTo("head");
			}
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
		FILLSTYLE: 'rgb(0,0,0)',								// canvas fill style 
		HEIGHT: 50,															// canvas height in px		
		SIZE: 40,																// font size to draw in px
		TEXTBASELINE: 'top',										// canvas text baseline
		WIDTH: 600,															// canvas width in px 
		HISTORY: {},														// cache
		
		init: function () {
			fd.CANVAS_SUPPORT = !!($("<canvas>")[0].getContext);
																							// detect canvas support for IE8-
		},
		
		restore: function () {
			
		},

		mkTextPixelArray: function (cssfont) {
			// draw the alphabet on canvas using cssfontfamily
			var canvas			 = $('<canvas>')[0],
				ctx						 = canvas.getContext('2d');
		
			canvas.width		 = fd.WIDTH;
			canvas.height		 = fd.HEIGHT;

			ctx.fillStyle		 = fd.FILLSTYLE;
			ctx.textBaseline = fd.TEXTBASELINE;
			ctx.font				 = cssfont.style + ' ' + cssfont.variant + ' ' + cssfont.weight + ' ' + fd.SIZE + 'px ' + cssfont.family;
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
			var fonts	 = cssfont.family.split(','),
					a0		 = fd.mkTextPixelArray(cssfont.family),
					i = 0, len;

			for (len = fonts.length; i < len; i += 1) {
				var a1 = fd.mkTextPixelArray(fonts[i]);
				if (fd.sameArray(a0, a1) && 
					fd.sameArray(fd.mkTextPixelArray({
																style		: cssfont.style, 
																variant : cssfont.variant, 
																weight	: cssfont.weight, 
																size		: cssfont.size,
																family	: fonts[i] + ',serif'}),
														fd.mkTextPixelArray({
																style		: cssfont.style,
																variant : cssfont.variant,
																weight	: cssfont.weight,
																size		: cssfont.size,
																family	: fonts[i] + ',sans-serif'}))) {
					// rendered fonts match, and font really is installed
					return $.trim(fonts[i]);
				}
			}
		
			return "(default font)";
		},
	
		firstFont: function (cssfontfamily) {
			// Simple util to get the first font 
			var rs = $.trim(cssfontfamily.split(',')[0]);
			return rs;
		},
	
		detect: function (elem) {
			// Main function for detecting on an DOM element
			var cssfont = {
				family : $(elem).css('font-family'),
				style	 : $(elem).css('font-style'),
				variant: $(elem).css('font-variant'),
				weight : $(elem).css('font-weight'),
				size	 : $(elem).css('font-size')
			};

			return (fd.HISTORY[cssfont.family] = 
				fd.HISTORY[cssfont.family] ||
					fd.CANVAS_SUPPORT ? fd.fontInUse(cssfont) : fd.firstFont(cssfont.family));
		},
	
		weight: function (elem) {
			return $(elem).css('font-weight');
		},
		
		style: function (elem) {
			return $(elem).css('font-style');
		},
		
		variant: function (elem) {
			var weight = { 'bold': 'Bold' }[fd.weight(elem)] || fd.weight(elem),
				style = { 'italic': 'Italic', 'oblique': 'Oblique' }[fd.style(elem)] || fd.style(elem),
				variant;
				
			if (weight === 'normal' && style === 'normal') {
				variant = 'Regular';
			} else if (weight === 'normal') {
				variant = style;
			} else if (style === 'normal') {
				variant = weight;
			} else {
				variant = weight + ' ' + style;
			}
			
			return variant;
		},
		
		getFontStyle: function (elem) {
			return {
				'font-family': $(elem).css('font-family'),
				'font-style' : $(elem).css('font-style'),
				'font-weight': $(elem).css('font-weight')
			};
		}
	};

	/* Font services */
	fs = {
		CSS_NAME_TO_SLUG: {},				// Translate CSS font name to slug
		FONT_DATA: {},							// Font data for different services 
		SERVICES: {},								// Raw data from font services
		
		init: function () {
			fs.typekit();
			fs.google();
			fs.fontdeck();
		},
		
		typekit: function () {
			/* Code for typekit, based on 
				 https://github.com/typekit/typekit-api-examples/blob/master/bookmarklet/bookmarklet.js
			*/
			function findKitId() {
				// Find Typekit ID
				var kitId = null;
				$('script').each(function(index){
					var m = this.src.match(/use\.typekit\.com\/(.+)\.js/);
					if (m) {
						kitId = m[1];
						return false;
					}
				});
				return kitId;
			}
			
			var kitId = findKitId();
			if (kitId) {
				// Get Font data
				$.getJSON("https://typekit.com/api/v1/json/kits/" + kitId + "/published?callback=?", function (data) {
					if(!data.errors) {
						fs.SERVICES.typekit = data.kit;
						$.each(data.kit.families, function(i, family) {
							$.each(family.css_names, function (i, css) {
								fs.CSS_NAME_TO_SLUG[css.toLowerCase()] = family.slug;
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
			}
		},
		
		google: function () {
			// Google Font API
			$("link").each(function (i, l) {
				var url = $(l).attr("href"), fstr;
				if (url.indexOf("fonts.googleapis.com/css?") >= 0) {
					fstr = url.match(/\?family=([^&]*)/)[1].split('|');			// Font names
					$.each(fstr, function (i, s) {
						var str = s.split(":")[0],
							fontName = str.replace(/\+/g, ' '),
							slug = fontName.replace(/ /g, '-').toLowerCase();
							
						fs.CSS_NAME_TO_SLUG[fontName] = slug;
						fs.FONT_DATA[slug] = fs.FONT_DATA[slug] || 
							{
								name: fontName,
								services: {}
							};
							
						fs.FONT_DATA[slug].services.Google = {
							url: 'http://www.google.com/webfonts/family?family=' + str
						};
					});
				}
			}); 
		},
		
		fontdeck: function () {
			// Fontdeck fonts
			$("link").each(function (i, l) {
				var url = $(l).attr("href"), projectId, domain;
				if (url.indexOf("fontdeck.com") >= 0) {
					projectId = url.match(/^.*\/(\d+)\.css$/)[1];
					domain = location.hostname;
					$.getJSON("http://fontdeck.com/api/v1/project-info?project=" + projectId + "&domain=" + domain + "&callback=?", function (data) {
						if(!data.errors) {
							$.each(data.provides, function (i, font) {
								var fontName = font.name,
									slug = fontName.replace(/ /g, '-').toLowerCase(),
									searchTerm = fontName.split(' ')[0],
									fontUrl = data.provides.url || 'http://fontdeck.com/search?q=' + searchTerm;
								
								fs.CSS_NAME_TO_SLUG[fontName] = slug;
								fs.FONT_DATA[slug] = fs.FONT_DATA[slug] || 
								{
									name: fontName,
									services: {}
								};
								
								fs.FONT_DATA[slug].services.Fontdeck = {
									url: fontUrl
								};
							});
						}
					});
				}
			});
		},
		
		getFontDataByCSSName: function (cssName) {
			var name = cssName.replace(/^"|'/, '').replace(/"|'$/, ''),		// No quotes
				slug = fs.CSS_NAME_TO_SLUG[name];
			return ((slug && fs.FONT_DATA[slug]) ? fs.FONT_DATA[slug] : null);
		},
		
		getFontNameByCSSName: function (cssName) {
			var name = cssName.replace(/^"|'/, '').replace(/"|'$/, ''),		// No quotes
				slug = fs.CSS_NAME_TO_SLUG[name];
			return ((slug && fs.FONT_DATA[slug]) ? fs.FONT_DATA[slug].name : null); 
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
			if (this.tagName === 'IMG') {
				tip.updateTextPos(fd.detect(this) + " (May be incorrect on images)", e);
			} else if (this.tagName === 'EMBED') {
				tip.updateTextPos(fd.detect(this) + " (May be incorrect on Flash)", e);
			} else {
				tip.updateTextPos(fd.detect(this), e);		// Update the content of the tip
			}
		
			e.stopPropagation();
		}
	};
	
	/* Panel */
	panel = { 
		PANELS: [],
		FONT_SERVICE_ICON: {},
		
		init_tmpl: function() {
			panel.tmpl = (function () {
				var tmpl = $(
						'<div class="elem panel">' +
							'<div class="panel_title">' +
								'<span class="title_text"></span>' +
								'<a class="close_button" title="Close">&times;</a>' +
							'</div>' +

							'<div class="panel_content">' + 
								'<ul class="panel_properties">' +
									'<li>' +
										'<dl class="font_family">' +
											'<dt class="panel_label">Font Family</dt>' +
											'<dd class="panel_value"></dd>' +
										'</dl>' +
									'</li>' +

									'<li>' +
										'<div class="size_line_height clearfix">' +
											'<dl class="size section">' + 
												'<dt class="panel_label">Font Size</dt>' + 
												'<dd class="panel_value"></dd>' +
											'</dl>' +
											'<dl class="line_height">' + 
												'<dt class="panel_label">Line Height</dt>' +
												'<dd class="panel_value"></dd>' +
											'</dl>' +
										'</div>' +
									'</li>' +

									'<li class="panel_no_border_bottom">' +
										'<dl class="type_info clearfix">' +
										  '<dt class="panel_label"></dt>' +
										  '<dd class="type_preview">' +
											  "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz" +
										  '</dd>' +
										'</dl>' +
										
										'<div class="font_services panel_label" style="display:none;">' +
										'Font Served by ' +
										'</div>' +
									'</li>' +
								'</ul>' +
								
								'<div class="panel_tools clearfix">' + 
								  '<div class="panel_tools_left">' + 
								    '<div class="color_info">' +
								      '<a title="Click to change color format" class="color_info_sample">&nbsp;</a>' +
								      '<span class="color_info_value"></span>' +
								    '</div>' +
								  '</div>' + 
								  '<div class="panel_tools_right">' +
                    '<a href="https://twitter.com/share" class="tweet_icon" target="_blank">Tweet</a>' + 
                  '</div>' +
                '</div>' +
							'</div>' +
						'</div>'
					);
					
				return (function () {
					return tmpl.clone();
				});
			} ());
		},
		
		init: function () {
			$("body :visible").click(panel.pin);
			
			panel.init_tmpl();
			
			panel.FONT_SERVICE_ICON.Typekit = $("<span>").addClass("service_icon service_icon_typekit").text('Typekit');
			panel.FONT_SERVICE_ICON.Google = $("<span>").addClass("service_icon service_icon_google").text('Google Web Fonts');
			panel.FONT_SERVICE_ICON.Fontdeck = $("<span>").addClass("service_icon service_icon_fontdeck").text('Fontdeck');
		},
		
		restore: function () {
			$("body :visible").unbind("click", panel.pin);
			
			$.each(panel.PANELS, function (i, p) {
				$(p).remove();
			});
		},
		
		convertClassName: function (newPanel) {
			newPanel.find('*').add(newPanel).each(function (i, elem) {
				var className = $(elem).attr('class');
				
				className = (className === "" ? "basic" : (className + " basic"));
				
				if (className) {
					className = className.split(' ');
					$(elem).attr('class', css.getClassName(className));
				}
			});
			
			return newPanel;
		},
		
		typePreview: function (elem, newPanel) {
			var canv = $(newPanel).find('.type_preview');
			
			canv.css(fd.getFontStyle(elem));
			
			return newPanel;
		},

		fontService: function (elem, newPanel) {
			// Font Service section
			var fiu = fd.detect(elem), fontData = fs.getFontDataByCSSName(fiu), fontServices, fontName;
			fontServices = $("<ul>").addClass('font_service');

			if (fontData) {
				$.each(fontData.services, function (name, srv) {
					$("<li>").append(
						$("<a>")
							.append($(panel.FONT_SERVICE_ICON[name]).clone())
							.attr("href", srv.url)
							.attr("target", "_blank")
					).appendTo(fontServices);
				});

				$(newPanel).find(".font_services").append(fontServices).show();
			} else {
				$(newPanel).find(".font_services").hide();
			}

			return newPanel;
		},	
		
		fontFam: function (elem, newPanel) {
			// Font Family section
			var fontStack = $(elem).css('font-family').replace(/;/, '').split(/,\s*/),
				fontInUse = fd.detect(elem), 
				fontInUseFound = false, 
				font, fHTML;
		
			ff = $(elem).css('font-family');
			fiu = fd.detect(elem);		// cssName Font in use
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
		
		sizeLineHeight: function (elem, newPanel) {
			var size = $(elem).css('font-size'),
				lh = $(elem).css('line-height');
				
			$(newPanel).find(".size>dd").text(size);
			$(newPanel).find(".line_height>dd").text(lh);
				
			return newPanel;
		},
		
		color: function (elem, newPanel) {
		  var rgb_color = $(elem).css("color"), 
		    sample =  $(newPanel).find(".color_info_sample"),
		    value = $(newPanel).find(".color_info_value"),
		    re, match, r, g, b;
		  
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
		  
		  sample.css("background-color", rgb_color).click((function (colors, color_type, value) {
		    return function (e) {
		      color_type = (color_type + 1) % colors.length;
		      value.text(colors[color_type]);
		      
		      e.preventDefault();
		      return false;
		    };
		  } (colors, color_type, value))).click();
		},
		
		tweet: function (elem, newPanel) {
		  var tweet_icon =  $(newPanel).find(".tweet_icon"),
		    url = tweet_icon.attr("href"),
		    cssName = fd.detect(elem),
				typeName = fs.getFontNameByCSSName(cssName) || cssName;
		  
		  url += '?text=' + encodeURIComponent('I like this typography design with ' + typeName + '.') + '&via=What_Font';
		  tweet_icon.attr("href", url);
		},
		
		panelContent: function (elem, newPanel) {
			$(['typePreview', 'fontService', 'fontFam', 'sizeLineHeight', 'color', 'tweet']).each(function (i, prop) {
				panel[prop](elem, newPanel);
			});
		},
	
		panelTitle: function (elem, newPanel) {
			// Panel title
			var cssName = fd.detect(elem),
				typeName = fs.getFontNameByCSSName(cssName) || cssName,
				title_text = typeName + ' - ' + fd.variant(elem);
				
			$(newPanel).find(".title_text").html(title_text).css(fd.getFontStyle(elem));
			
			(function(newPanel) {
				$(newPanel).find(".close_button").click(function (e) {
					$(newPanel).remove();
					
					e.stopPropagation();
					return false;
				});
			}(newPanel));
					
			return newPanel;
		},
	
		get: function (elem) {
			// Create panel
			var p = panel.tmpl();
			
			panel.panelTitle(elem, p);
			panel.panelContent(elem, p);
			panel.convertClassName(p);
		
			$(p).click(function (e) {
				$(this).find('*').css('-webkit-animation', 'none');
				$(this).detach();
				$(this).appendTo('body');
			});
		
			return p;
		},
		
		pin: function (e) {
			// Add a panel according to event e
			// (Event handler)
			var p;
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
			$("body :visible").unbind('mousemove', ctrl.updateTip);
			$("body :visible").unbind('click', ctrl.pinPanel);
		
			fd.restore();
			toolbar.restore();
			tip.restore();
			panel.restore();
			css.restore();
			
			$("body").unbind("keydown", ctrl.shortcut);
			
			_WHATFONT = false;
		},
	
		init: function () {
			var loaded;
			if (!$ && jQuery) {
				$ = jQuery;
			}
			
			loaded = (typeof _WHATFONT !== 'undefined') && _WHATFONT;
			
			if (loaded || !$) {
				return false;
			}
			
			_WHATFONT = true;
			
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
				
				if ( typeof attr !== 'undefined' ) {
					e.attr(attr);	
				} 
				
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
	
	_wf = {
		setJQuery: function (jQ) {
			$ = jQ;
		},
		setCSSURL: function (url) {
			css.CSS_URL = url;
		},
		getVer: function () {
			return VER;
		},
		init: function () {
			ctrl.init();
		},
		restore: function () {
			ctrl.restore();
		}
	};
	
	return _wf;
}
