/**
 * jQuery.flickSimple v1.2.2
 *
 * Copyright (c) 2011 Makog. http://d.hatena.ne.jp/makog/
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */
(function($){

	$.flickSimple = function( obj, param ) {
		this.setup( $(obj), param );
	};

	$.extend( $.flickSimple.prototype, {
		elm: null,
		target: null,
		disabled: false,
		snap: 'element',
		ratio: 5,
		duration: 600,
		lock: false,
		onChange: null,
		onResize: null,
		onAnimationEnd: null,
		onClick: null,
		vertical: false,
		horizontal: true,
		paginate: 'x',

		elmWidth: 0,
		elmHeight: 0,
		page: 1,
		pageWidth: 0,
		pageHeight: 0,
		pageLength: 0,

		android: false,
		touchable: ( typeof ontouchstart !== 'undefined' ),
		vender: (function() {
			var props = [
				[ '-webkit-transition', '-webkit-transition', '-webkit-transform', 'webkitTransitionEnd' ],
				[ 'MozTransition',      '-moz-transition',    '-moz-transform',    'transitionend' ],
				[ 'OTransition',        '-o-transition',      '-o-transform',      'oTransitionEnd' ],
				[ '-ms-transition',     '-ms-transition',     '-ms-transform',     'msTransitionEnd' ],
				[ 'transition',         'transition',         'transform',         'transitionEnd' ]
			];
			var div = document.createElement('div');
			var vender = {};
			for( var i=0,len=props.length; i<len; i++ ) {
				if ( div.style[props[i][0]] !== void 0 ) {
					vender.transition    = props[i][1];
					vender.transform     = props[i][2];
					vender.transitionend = props[i][3];
					break;
				}
			}
			return vender;
		})(),
		useCSSAnim: true,
		use3d: true,

		anc: null,
		touchhold: false,
		startX: null,
		startY: null,
		preX: 0,
		preY: 0,
		currentX: 0,
		currentY: 0,
		flickX: 0,
		flickY: 0,
		nextX: 0,
		nextY: 0,
		// debug: null,

		setup: function( obj, param ) {
			var o = this;
		//	o.debug = $('#debug');
			o.elm = obj;
			o.elm.css( { overflow: 'hidden' } );
			o.target = param.target || $(o.elm.children().get(0));
			
			var ua = navigator.userAgent.toLowerCase();
			o.android = param.android === void 0
				? ua.indexOf('android') !== -1
				: param.android;

			o.useCSSAnim = o.vender.transition && o.vender.transform;
			o.use3d = ( typeof WebKitCSSMatrix !== 'undefined'
				&& ( ua.indexOf('chrome') !== -1 || ! o.android ) );

			if ( param.disabled  !== void 0 )  o.disabled = param.disabled;
			if ( param.snap  !== void 0 )      o.snap = param.snap;
			if ( param.ratio !== void 0 )      o.ratio = param.ratio;
			if ( param.duration !== void 0 )   o.duration = param.duration;
			if ( param.lock !== void 0 )       o.lock = param.lock;
			if ( param.vertical !== void 0 )   o.vertical = param.vertical;
			if ( param.horizontal !== void 0)  o.horizontal = param.horizontal;
			if ( param.paginate !== void 0 )   o.paginate = param.paginate;

			if ( param.vender !== void 0 )     o.vender = param.vender;
			if ( param.useCSSAnim !== void 0 ) o.useCSSAnim = param.useCSSAnim;

			o.onChange       = param.onChange;
			o.onResize       = param.onResize;
			o.onAnimationEnd = param.onAnimationEnd;
			o.onClick        = param.onClick;
			
			if ( typeof window.onorientationchange === 'object' && ! o.android  ) {
				$(window).bind( 'orientationchange', function(){ o.updateSize(); } );
			} else {
				$(window).bind( 'resize', function(){ o.updateSize(); } );
			}
			o.init();

			if ( ! o.useCSSAnim ) {
				o.target.css({ position:'relative' });
			} else {
				var css = {};
				css['position'] = 'relative';
				css[o.vender.transition] = 'none';
				css[o.vender.transform] = o.use3d ? 'translate3d(0,0,0)' : 'translate(0,0)';
				o.target.css(css);
			}
			o.updateSize();
			
			if ( o.touchable ) {
				o.elm.bind( 'touchstart', function(e){ o.touchstart(e) } )
					.bind( 'touchmove', function(e){ o.touchmove(e) } )
					.bind( 'touchend', function(e){ o.touchend(e) } );
			} else {
				o.elm.bind( 'mousedown', function(e){ o.touchstart(e) } );
				$('body').bind( 'mouseup', function(e){ o.touchend(e) } )
					.bind( 'mousemove', function(e){ o.touchmove(e) } );
			}

			if ( o.vender.transitionend ) {
				o.target.bind( o.vender.transitionend, function(e) {
					if ( o.onAnimationEnd ) {
						o.onAnimationEnd(e);
					}
				} );
			}
			return o;
		},
		
		// 次のページへ移動
		nextPage: function( num ) {
			return this.goTo( this.page + (num || 1) );
		},
		
		// 前のページへ移動
		prevPage: function( num ) {
			return this.goTo( this.page - (num || 1) );
		},
		
		// 指定されたページへ移動
		goTo: function( pagenum ) {
			if ( pagenum > this.pageLength ) {
				pagenum = this.pageLength;
			}
			pagenum--;
			
			var pageX, pageY, rownum;
			if ( this.paginate === 'y' ) {
				rownum = Math.ceil( this.elmHeight / this.pageHeight ) +1;
				pageX = Math.floor( pagenum / rownum );
				pageY = pagenum % rownum;
			} else {
				rownum = Math.ceil( this.elmWidth / this.pageWidth ) +1;
				pageY = Math.floor( pagenum / rownum );
				pageX = pagenum % rownum;
			}
			var posX = pageX * this.pageWidth;
			var posY = pageY * this.pageHeight;
			return this.move( -posX, -posY );
		},
		
		// 指定されたX座標に移動
		move: function( posX, posY ) {
			var o = this;
			if ( ! o.horizontal || posX >= 0 ) {
				posX = 0;
			} else if ( posX < -o.elmWidth ) {
				posX = -o.elmWidth;
			}
			if ( ! o.vertical || posY >= 0 ) {
				posY = 0;
			} else if ( posY < -o.elmHeight ) {
				posY = -o.elmHeight;
			}

			if ( ! o.useCSSAnim ) {
				o.target.animate( { left: posX + 'px', top: posY + 'px' },
					function (e) {
						if ( o.onAnimationEnd ) {
							o.onAnimationEnd(e);
						}
					} );
			} else {
				var css = {};
				css[o.vender.transition] = o.vender.transform + ' 0.3s ease-in';
				css[o.vender.transform] = o.use3d
					? 'translate3d(' + posX + 'px,' + posY + 'px,0)'
					: 'translate(' + posX + 'px,' + posY + 'px)';
				o.target.css(css);
			}
			o.nextX = posX;
			o.nextY = posY;
			return o.update( posX, posY );
		},
		
		// 表示が変更されたら、各エレメントの大きさを計算し直す
		updateSize: function() {
			var o = this;
			var ori = typeof( window.orientation ) !== 'undefined'
				? ( window.orientation === 0 ? 'portrait' : 'landscape' )
				: ( window.innerWidth < window.innerHeight ? 'portrait' : 'landscape' );
			// var lis = o.target.find('li');
			var lis = o.target.children();
	
			o.elm.removeClass('landscape portrait').addClass( ori );
			// うまく反映されない場合があるので、エレメント自体にclassを振る
			o.target.removeClass('landscape portrait').addClass( ori );
			lis.removeClass('landscape portrait').addClass( ori );
	
			var targw = o.target.width();
			var targh = o.target.height();
			var elmw = o.elm.width();
			var elmh = o.elm.height();
			o.elmWidth = targw - elmw;
			o.elmHeight = targh - elmh;

			o.pageWidth = 0;
			o.pageHeight = 0;
			o.pageLength = 0;
			if ( o.snap ) {
				if ( o.snap === 'element' ) {
					o.pageWidth = elmw;
					o.pageHeight = elmh;
				} else if ( o.snap === 'first' ) {
					o.pageWidth = $(lis.get(0)).width();
					o.pageHeight = $(lis.get(0)).height();
				} else if ( o.snap === 'smallest' ) {
					var smaller = 0;
					lis.each( function() {
						var w = $(this).width();
						if ( smaller > w || smaller == 0 ) {
							smaller = w;
						}
					} );
					o.pageWidth = smaller;
					
					smaller = 0;
					lis.each( function() {
						var h = $(this).height();
						if ( smaller > h || smaller == 0 ) {
							smaller = h;
						}
					} );
					o.pageHeight = smaller;
		
				} else if ( typeof o.snap === 'object' ) {
					o.pageWidth = o.snap[0];
					o.pageHeight = o.snap[1];
				} else if ( ! isNaN(o.snap) ) {
					o.pageWidth = o.snap;
					o.pageHeight = o.snap;
				}
				
				o.pageLength = Math.ceil( targw / o.pageWidth );
				if ( targh > o.pageHeight ) {
					o.pageLength *= Math.ceil( targh / o.pageHeight );
				}
			}
	
			if ( o.onResize ) {
				o.onResize();
			}
			if ( o.snap ) {
				o.goTo( o.page );
			}
			return o;
		},

		touchstart: function(e) {
			var o = this;
			var te = o.touchable ? e.originalEvent.touches[0] : e;
			if ( o.disabled ) { return; }
			o.startX = te.clientX;
			o.startY = te.clientY;
			o.touchhold = false;
			var anc = e.target.tagName === 'A'
				? $(e.target)
				: $(e.target).closest('a');
			if ( anc.length > 0 ) {
				o.anc = anc;
			}
	
			// 長押し対応
			setTimeout( function() {
				if ( o.anc ) {
					// o.startX = null;
					o.touchhold = true;
					var anc = o.anc;
					var link = $.data(anc.get(0), 'flickSimple.link' );
					if ( link ) {
						anc.attr('href', link);
						setTimeout( function() {
							anc && anc.attr('href', 'javascript:;');
						}, 200 );
					}
					
				}
			}, 600 );
		},
		
		touchmove: function(e) {
			var o = this;
			if ( o.disabled ) { return; }
			if ( o.android || o.lock ) {
				e.preventDefault();
			}
			if ( o.startX === null || o.startY === null ) {
				o.anc = null;
				return;
			}
			var te = o.touchable ? e.originalEvent.touches[0] : e;
			var nowX = te.clientX;
			var nowY = te.clientY;
			if ( Math.abs( o.startX - nowX ) > 16 || Math.abs( o.startY - te.clientY ) > 16 ) {
				o.anc = null;
			}
			o.nextX = o.horizontal ? (o.currentX || 0) + ( nowX - o.startX ) : 0;
			o.nextY = o.vertical ? (o.currentY || 0) + ( nowY - o.startY ) : 0;
			if ( ! o.useCSSAnim ) {
				o.target.css( { left: o.nextX + 'px', top: o.nextY + 'px' } );
			} else {
				var css = {};
				css[o.vender.transition] = 'none';
				css[o.vender.transform] = o.use3d
					? 'translate3d(' + o.nextX + 'px,' + o.nextY + 'px,0)'
					: 'translate(' + o.nextX + 'px,' + o.nextY + 'px)';
				o.target.css( css );
			}
			o.flickX = o.preX - nowX;
			o.flickY = o.preY - nowY;
			o.preX = nowX;
			o.preY = nowY;
		},
	
		touchend: function(e) {
			var o = this;
			if ( o.disabled || o.startX === null || o.startY === null ) { return; }
			o.startX = null;
			o.startY = null;
			if ( o.anc && ! o.touchhold ) {
				if ( o.onClick ) {
					o.onClick( o.anc );
				}
				var ancr = o.anc.get(0);
				var link = $.data(ancr, 'flickSimple.link' );
				var targ = $.data(ancr, 'flickSimple.target' );
				if ( link ) {
					if ( targ && targ !== '_self' ) {
						if ( targ === '_blank' ) {
							targ = '';
						}
						window.open( link, targ );
					} else {
						location.href = link;
					}
				}
				e.preventDefault();
			}
			o.touchhold = false;

			var nposX = o.nextX + (o.flickX * -o.ratio);
			var nposY = o.nextY + (o.flickY * -o.ratio);
			if ( o.pageWidth ) {
				var thrX = nposX % o.pageWidth;
				if ( thrX < -o.pageWidth / 2 ) {
					nposX -= thrX + o.pageWidth;
				} else {
					nposX -= thrX;
				}
				var thrY = nposY % o.pageHeight;
				if ( thrY < -o.pageHeight / 2 ) {
					nposY -= thrY + o.pageHeight;
				} else {
					nposY -= thrY;
				}
			}
			if ( ! o.horizontal || nposX >= 0 ) {
				nposX = 0;
			} else if ( nposX < -o.elmWidth ) {
				nposX = -o.elmWidth;
			}
			if ( ! o.vertical || nposY >= 0 ) {
				nposY = 0;
			} else if ( nposY < -o.elmHeight ) {
				nposY = -o.elmHeight;
			}
		
			
			if ( ! o.useCSSAnim ) {
				o.target.animate( { left: nposX + 'px', top: nposY + 'px' }, o.duration,
					function (x, t, b, c, d) {
						if ( o.onAnimationEnd ) {
							o.onAnimationEnd(e);
						}
						return -c *(t/=d)*(t-2) + b;
					} );
			} else {
				var css = {};
				css[o.vender.transition] = o.vender.transform
					+ ' ' + (o.duration / 1000) + "s ease-out";
				css[o.vender.transform] = o.use3d
					? 'translate3d(' + nposX + 'px,' + nposY + 'px,0)'
					: 'translate(' + nposX + 'px,' + nposY + 'px)';
				o.target.css( css );				
			}
			o.update( nposX, nposY );
		},
		
		update: function( posX, posY ) {
			var o = this;
			if ( o.pageWidth || o.pageHeight ) {
				var rownum;
				if ( o.paginate === 'y' ) {
					rownum = Math.ceil( this.elmHeight / this.pageHeight ) +1;
					o.page = Math.ceil( -posY / o.pageHeight )
						+ ( Math.ceil( -posX / o.pageWidth ) * rownum) +1;
				} else {
					rownum = Math.ceil( this.elmWidth / this.pageWidth ) +1;
					o.page = Math.ceil( -posX / o.pageWidth )
						+ (Math.ceil( -posY / o.pageHeight ) * rownum) +1;
				}
			}
			if ( o.currentX !== posX || o.currentY !== posY ) {
				o.currentX = posX;
				o.currentY = posY;
				if ( o.onChange ) {
					o.onChange();
				}
			}
			return o;
		},
		
		no_mousedown: function(e) {
			e.preventDefault();
		},
		
		// 初期化（内容に変更があった場合には、呼び出すこと）
		init: function() {
			var o = this;
			o.target.find('a').each( function() {
				var obj = $(this);
				var link = obj.attr('href');
				var targ = obj.attr('target');
				if ( link && link !== 'javascript:;' ) {
					$.data(this, 'flickSimple.link', link );
				}
				$.data(this, 'flickSimple.target', targ || '' );
				obj.attr('href', 'javascript:;').removeAttr('target');
				if ( ! o.touchable ) {
					obj.unbind( 'mousedown', o.no_mousedown )
						.bind( 'mousedown', o.no_mousedown );
				}
			} );
			
			// 画像のドラッグをさせない
			if ( ! o.touchable ) {
				o.target.find('img')
					.unbind( 'mousedown', o.no_mousedown )
					.bind( 'mousedown', o.no_mousedown );
			}
			return o;
		}
	} );

	$.fn.flickSimple = function( param ) {
		var res = this;
		if ( typeof param === "string" ) { // 引数が文字列の場合
			var args = Array.prototype.slice.call(arguments, 1);
			this.each( function() {
				var instance = $.data(this, 'flickSimple');
				var val;
				if ( instance ) {
					if ( $.isFunction(instance[param]) ) {
						val = instance[param].apply(instance, args);
					} else {
						if ( args.length > 0 ) {
							instance[param] = args[1];
						}
						val = instance[param];
					}
				}
				if ( val !== instance ) {
					res = val
				}
			});
		} else {
			this.each( function() {
				var instance = $.data(this, 'flickSimple');
				if (! instance) {
					$.data(this, 'flickSimple', new $.flickSimple( this, param || {} ) );
				} else {
					res = instance;
				}
			} );
		}
		return res;
	};

})(jQuery);
