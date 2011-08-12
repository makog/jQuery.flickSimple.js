/**
 * jQuery.flickSimple v1.1.1
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
		snap: 'element',
		ratio: 5,
		duration: 600,
		lock: false,
		onChange: null,
		onResize: null,
		onAnimationEnd: null,
		onClick: null,
	
		elmWidth: 0,
		page: 1,
		pageWidth: 0,
		pageLength: 0,
		android: false,
		webkit: true,
		touchable: true,
		anc: null,
		
		startX: null,
		preX: 0,
		currentX: 0,
		flickX: 0,
		nextX: 0,
		// debug: null,

		setup: function( obj, param ) {
			var o = this;
		//	o.debug = $('#debug');
			o.elm = obj;
			o.elm.css( { overflow: 'hidden' } );
			o.target = param.target || o.elm.find('ul');
			
			o.android = param.android === void 0
				? navigator.userAgent.indexOf('Android') != -1
				: param.android;
			o.webkit = typeof( WebKitTransitionEvent ) !== "undefined";
			o.touchable = typeof( ontouchstart ) !== "undefined";

			if ( param.snap  !== void 0 )    o.snap = param.snap;
			if ( param.ratio !== void 0 )    o.ratio = param.ratio;
			if ( param.duration !== void 0 ) o.duration = param.duration;
			if ( param.lock !== void 0 )     o.lock = param.lock;

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

			if ( o.android || ! o.webkit ) {
				o.target.css({ position:'relative' });
			} else {
				o.target.css({
					position:'relative',
					webkitTransition:'none',
					webkitTransform:'translate3d(0,0,0)'
				});
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

			o.target.bind( 'webkitTransitionEnd', function(e) {
				if ( $.isFunction( o.onAnimationEnd ) ) {
					o.onAnimationEnd(e);
				}
			} );
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
			var pos = (pagenum -1) * this.pageWidth;
			return this.move( -pos );
		},
		
		// 指定されたX座標に移動
		move: function( pos ) {
			if ( pos > 0 ) {
				pos = 0;
			} else if ( pos < -this.elmWidth ) {
				pos = -this.elmWidth;
			}
			if ( this.android || ! this.webkit ) {
				this.target.animate( { left: pos + 'px' } );
			} else {
				this.target.css( {
					webkitTransition:"-webkit-transform 0.3s ease-in",
					webkitTransform:"translate3d("+pos+"px,0,0)"
				} );
			}
			return this.update( pos );
		},
		
		// 表示が変更されたら、各エレメントの大きさを計算し直す
		updateSize: function() {
			var o = this;
			var ori = typeof( window.orientation ) !== 'undefined'
				? ( window.orientation === 0 ? 'portrait' : 'landscape' )
				: ( window.innerWidth < window.innerHeight ? 'portrait' : 'landscape' );
			var lis = o.target.find('li');
	
			o.elm.removeClass('landscape portrait').addClass( ori );
			// うまく反映されない場合があるので、エレメント自体にclassを振る
			o.target.removeClass('landscape portrait').addClass( ori );
			lis.removeClass('landscape portrait').addClass( ori );
	
			var targw = o.target.width();
			var elmw = o.elm.width();
			o.elmWidth = targw - elmw;
	
			if ( o.snap == 'element' ) {
				o.pageWidth = elmw;
			} else if ( o.snap == 'first' ) {
				o.pageWidth = $(lis.get(0)).width();
			} else if ( o.snap == 'smallest' ) {
				var smaller = 0;
				lis.each( function() {
					var w = $(this).width();
					if ( smaller > w || smaller == 0 ) {
						smaller = w;
					}
				} );
				o.pageWidth = smaller;
			} else if ( ! isNaN(o.snap) ) {
				o.pageWidth = o.snap;
			} else {
				o.pageWidth = 0;
			}
			o.pageLength = Math.ceil( targw / o.pageWidth );
	
			if ( $.isFunction(o.onResize) ) {
				o.onResize();
			}
	
			o.goTo( o.page );
			return o;
		},

		touchstart: function(e) {
			var o = this;
			var te = o.touchable ? event.changedTouches[0] : e;
			o.startX = te.clientX;
			var anc = e.target.tagName === 'A'
				? $(e.target)
				: $(e.target).closest('a');
			if ( anc.length > 0 ) {
				o.anc = anc;
			}
	
			// 長押し対応
			setTimeout( function() {
				if ( o.anc ) {
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
			if ( o.android || o.lock ) {
				e.preventDefault();
			}
			o.anc = null;
			if ( o.startX === null ) { return; }
			var te = o.touchable ? e.originalEvent.touches[0] : e;
			var nowX = te.clientX;
			o.nextX = (o.currentX || 0) + ( nowX - o.startX );
			if ( o.android || ! o.webkit ) {
				o.target.css( { left: o.nextX + 'px' } );
			} else {
				o.target.css( {
					webkitTransition:"none",
					webkitTransform:"translate3d("+o.nextX+"px,0,0)"
				} );
			}
			o.flickX = o.preX - nowX;
			o.preX = nowX;
		},
	
		touchend: function(e) {
			var o = this;
			if ( o.startX === null ) { return; }
			o.startX = null;
			if ( o.anc ) {
				if ( $.isFunction( o.onClick ) ) {
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
				return false;
			}

			var npos = o.nextX + (o.flickX * -o.ratio);
			if ( o.pageWidth ) {
				var thr = npos % o.pageWidth;
				if ( thr < -o.pageWidth / 2 ) {
					npos -= thr + o.pageWidth;
				} else {
					npos -= thr;
				}
			}
			if ( npos > 0 ) {
				npos = 0;
			} else if ( npos < -o.elmWidth ) {
				npos = -o.elmWidth;
			}
			
			if ( o.android || ! o.webkit ) {
				o.target.animate( { left: npos + 'px' }, o.duration,
					function (x, t, b, c, d) { return -c *(t/=d)*(t-2) + b; } );
			} else {
				o.target.css( {
					webkitTransition:"-webkit-transform "
						+ (o.duration / 1000) + "s ease-out",
					webkitTransform:"translate3d("+npos+"px,0,0)"
				} );
			}
			o.update( npos );
		},
		
		update: function( pos ) {
			var o = this;
			if ( o.pageWidth ) {
				o.page = Math.ceil( (pos * -1) / o.pageWidth ) +1;
			}
			if ( o.currentX !== pos ) {
				o.currentX = pos;
				if ( $.isFunction( o.onChange ) ) {
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
				if ( link && link != 'javascript:;' ) {
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
