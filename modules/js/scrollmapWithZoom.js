/* Scrollmap: a scrollable map */

define([
    "dojo","dojo/_base/declare"
],
function (dojo, declare) {
    return declare("scrollmapWithZoom",null, {
        constructor: function(){
            this.container_div = null;
            this.scrollable_div = null;
            this.surface_div = null;
            this.onsurface_div = null;
            this.isdragging = false;
            this.board_x = 0;
            this.board_y = 0;
			this.zoom = 1;
            this.bEnableScrolling = true;
            this.zoomWheelDelta = 0.001;
            this.bEnableZooming = false;
            this.bScrollDeltaAlignWithZoom = true;
            this.scrollDelta = false;
            this.pointers= [];
        },
        create: function( container_div, scrollable_div, surface_div, onsurface_div )
        {
            this.container_div = container_div;
            this.scrollable_div = scrollable_div;
            this.surface_div = surface_div;
            this.onsurface_div = onsurface_div;
            dojo.connect( this.surface_div, 'onpointerdown', this, 'onPointerDown');
            dojo.connect( this.surface_div, 'onwheel', this, 'onWheel');
                                                     
            this.scrollto( 0, 0 );
			this.setMapZoom(this.zoom);
        },
        /**
         * Utilites for working with multiple pointer events
         */
        findEventIndex: function(event) {
            let i = this.pointers.length
            while (i--) {
                if (this.pointers[i].pointerId === event.pointerId) {
                    return i
                }
            }
            return -1
        },
        addPointer: function(event) {
            i = this.findEventIndex(event)
            // Update if already present
            if (i > -1) {
                this.pointers.splice(i, 1)
            }
            this.pointers.push(event)
        },
        removePointer: function(event) {
            const i = this.findEventIndex(event)
            if (i > -1) {
                this.pointers.splice(i, 1)
            }
        },
		startDragging: function(ev) {
            if( !this.bEnableScrolling )
                return;
        
            this.isdragging = true;
            this.pointer_startX = ev.pageX;
            this.pointer_startY = ev.pageY;
		},
		onPointerDown: function(ev) {
            if( !this.bEnableScrolling && !this.bEnableZooming )
                return;
			ev.preventDefault();
            ev.stopPropagation();
            if (this.pointers.length == 0) {
                this.onpointermove_handler = dojo.connect(document, "onpointermove", this, "onPointerMove");
                this.onpointerup_handler = dojo.connect(document, "onpointerup", this, "onPointerUp");
                this.onpointercancel_handler = dojo.connect(document, "onpointercancel", this, "onPointerUp");
                this.startDragging(ev);
            } else
                this.isdragging = false;
            this.addPointer(ev);
		},
		onPointerMove: function(ev) {			
			ev.preventDefault();
            ev.stopPropagation();
            this.addPointer(ev);

			// If one pointer is move, drag the map
			if (this.pointers.length === 1) {

				if (this.isdragging){
                    this.scroll(ev.pageX-this.pointer_startX, ev.pageY-this.pointer_startY, 0, 0)
				}
				this.startDragging(ev);
			}
			// If two pointers are move, check for pinch gestures
			else if (this.pointers.length === 2) {
                if( !this.bEnableZooming )
                    return;

				this.isdragging = 0;

				// Calculate the distance between the two pointers
				const curDiff = Math.abs(this.pointers[0].clientX - this.pointers[1].clientX);
		
				if (this.prevDiff > 0) {
					// console.log("pinch gesture");
					if (curDiff > this.prevDiff) { // distance has increased
					newZoom = this.zoom + 0.02;
					this.setMapZoom(newZoom);
					}
					if (curDiff < this.prevDiff) {// distance has decreased
					newZoom = this.zoom - 0.02;
					this.setMapZoom(newZoom);
					}
				}
			
				// Cache the distance for the next move event
				this.prevDiff = curDiff;
			}
			dojo.stopEvent(ev);
		},
		onPointerUp: function(ev) {
			ev.preventDefault();
            
            this.removePointer(ev);
			// If no pointer left, stop drag or zoom the map
			if (this.pointers.length === 0) {
				this.isdragging = 0;
				dojo.disconnect(this.onpointermove_handler);
				dojo.disconnect(this.onpointerup_handler);
				dojo.disconnect(this.onpointercancel_handler);
			}

			// If the number of pointers down is less than two then reset diff tracker
			if (this.pointers.length < 2) {
				this.prevDiff = -1;
			}
			dojo.stopEvent(ev);
		},
		onWheel: function(evt) {
            if( !this.bEnableZooming )
                return;
			evt.preventDefault();
			this.changeMapZoom(evt.deltaY * -this.zoomWheelDelta);
		},
      
        scroll: function( dx, dy, duration, delay )
        {
            if (typeof duration == 'undefined') {
                duration = 350; // Default duration
            }
            if (typeof delay == 'undefined') {
                delay = 0; // Default delay
            }

            this.scrollto( toint(this.board_x)+dx, toint(this.board_y)+dy, duration, delay );
        },
        
        // Scroll the board to make it centered on given position
        scrollto: function( x, y, duration, delay )
        {
            if (typeof duration == 'undefined') {
                duration = 350; // Default duration
            }
            if (typeof delay == 'undefined') {
                delay = 0; // Default delay
            }
        
            var width = dojo.style( this.container_div, "width" );
            var height = dojo.style( this.container_div, "height" );
   
            var board_x = x + width/2;         
            var board_y = y + height/2; 

            this.board_x = x;
            this.board_y = y;
            
            if ((duration==0) && (delay==0)){
                dojo.style( this.scrollable_div, "left", board_x+"px" );
                dojo.style( this.onsurface_div, "left", board_x+"px" );
                dojo.style( this.scrollable_div, "top", board_y+"px" );
                dojo.style( this.onsurface_div, "top", board_y+"px" );
                // dojo.style( dojo.body(), "backgroundPosition", x+"px "+y+"px" );
                return;
            }

            var anim = dojo.fx.combine([
                    dojo.fx.slideTo( {  node: this.scrollable_div,
                                        top: board_y,
                                        left: board_x,
                                        unit: "px",
                                        duration: duration,
                                        delay: delay } ),
                    dojo.fx.slideTo( {  node: this.onsurface_div,
                                        top: board_y,
                                        left: board_x,
                                        unit: "px",
                                        duration: duration,
                                        delay: delay } )
            ]);

            anim.play();         
        },

        // Scroll map in order to center everything
        // By default, take all elements in movable_scrollmap
        //  you can also specify (optional) a custom CSS query to get all concerned DOM elements
        scrollToCenter: function( custom_css_query )
        {
            // Get all elements inside and get their max x/y/w/h
            var max_x=0;
            var max_y=0;
            var min_x=0;
            var min_y=0;
            
            var css_query = '#'+this.scrollable_div.id+" > *";
            if( typeof custom_css_query != 'undefined' )
            {
                css_query = custom_css_query;
            }

            dojo.query( css_query ).forEach( dojo.hitch( this, function( node ) {
                max_x = Math.max( max_x, dojo.style( node, 'left' ) + dojo.style( node, 'width' ) );            
                min_x = Math.min( min_x, dojo.style( node, 'left' ) );            

                max_y = Math.max( max_y, dojo.style( node, 'top' ) + dojo.style( node, 'height' ) );            
                min_y = Math.min( min_y, dojo.style( node, 'top' ) );            
            } ) );
            this.scrollto( -( min_x+max_x )/2, -( min_y+max_y ) /2 );
        },
        
        getMapCenter: function( custom_css_query )
        {
            // Get all elements inside and get their max x/y/w/h
            var max_x=0;
            var max_y=0;
            var min_x=0;
            var min_y=0;
            
            var css_query = '#'+this.scrollable_div.id+" > *";
            if( typeof custom_css_query != 'undefined' )
            {
                css_query = custom_css_query;
            }

            dojo.query( css_query ).forEach( dojo.hitch( this, function( node ) {
                max_x = Math.max( max_x, dojo.style( node, 'left' ) + dojo.style( node, 'width' ) );            
                min_x = Math.min( min_x, dojo.style( node, 'left' ) );            

                max_y = Math.max( max_y, dojo.style( node, 'top' ) + dojo.style( node, 'height' ) );            
                min_y = Math.min( min_y, dojo.style( node, 'top' ) );            

//                alert( node.id );
//                alert( min_x+','+min_y+' => '+max_x+','+max_y );
            } ) );

            return {
                x: ( min_x+max_x ) /2,
                y: ( min_y+max_y ) /2
            };
        },

		changeMapZoom: function (diff) {
			newZoom = this.zoom + diff;
			this.setMapZoom(newZoom);
		},

        setMapZoom: function (zoom) {
			this.zoom = Math.min(Math.max(zoom, 0.2), 2)
            if ( this.bScrollDeltaAlignWithZoom )
                this.scrollDeltaAlignWithZoom=this.scrollDelta*zoom;
            else
                this.scrollDeltaAlignWithZoom=this.scrollDelta;
			this.setScale('map_scrollable', this.zoom);
			this.setScale('map_scrollable_oversurface', this.zoom);
			this.setScale('jungle_display', this.zoom);
		},
    
		setScale: function ( elemId , scale ) {
			dojo.style( $(elemId) , 'transform' , 'scale(' +scale + ')' );
		},

        //////////////////////////////////////////////////
        //// Scroll with buttons

        // Optional: setup on screen arrows to scroll the board
        setupOnScreenArrows: function( scrollDelta )
        {
            this.scrollDelta = scrollDelta;
            if (this.bScrollDeltaAlignWithZoom)
                this.scrollDeltaAlignWithZoom = scrollDelta*this.zoom;
            else
                this.scrollDeltaAlignWithZoom = scrollDelta;

            // Old controls - for compatibility
            if( $('movetop') )
            {
                dojo.connect( $('movetop'), 'onclick', this, 'onMoveTop' );
            }
            if( $('moveleft' ) )
            {
                dojo.connect( $('moveleft'), 'onclick', this, 'onMoveLeft' );
            }
            if( $('moveright' ) )
            {
                dojo.connect( $('moveright'), 'onclick', this, 'onMoveRight' );
            }
            if( $('movedown' ) )
            {
                dojo.connect( $('movedown'), 'onclick', this, 'onMoveDown' );
            }
            
            // New controls
            dojo.query( '#'+this.container_div.id+' .movetop' ).connect( 'onclick', this, 'onMoveTop' ).style( 'cursor', 'pointer' );
            dojo.query( '#'+this.container_div.id+' .movedown' ).connect( 'onclick', this, 'onMoveDown' ).style( 'cursor', 'pointer' );
            dojo.query( '#'+this.container_div.id+' .moveleft' ).connect( 'onclick', this, 'onMoveLeft' ).style( 'cursor', 'pointer' );
            dojo.query( '#'+this.container_div.id+' .moveright' ).connect( 'onclick', this, 'onMoveRight' ).style( 'cursor', 'pointer' );
            
        },

        onMoveTop : function( evt )
        {
            console.log( "onMoveTop" );        
            evt.preventDefault();
            this.scroll( 0, this.scrollDeltaAlignWithZoom );
        },
        onMoveLeft : function( evt )
        {
            console.log( "onMoveLeft" );        
            evt.preventDefault();
            this.scroll( this.scrollDeltaAlignWithZoom, 0 );
        },
        onMoveRight : function( evt )
        {
            console.log( "onMoveRight" );        
            evt.preventDefault();
            this.scroll( -this.scrollDeltaAlignWithZoom, 0 );
        },
        onMoveDown : function( evt )
        {
            console.log( "onMoveDown" );        
            evt.preventDefault();
            this.scroll( 0, -this.scrollDeltaAlignWithZoom );
        },
        
        isVisible: function( x, y )
        {
            var width = dojo.style( this.container_div, "width" );
            var height = dojo.style( this.container_div, "height" );

            if( x >= ( -this.board_x - width/2 )  && x <= ( -this.board_x+width/2 ) )
            {
                if( y >= ( -this.board_y - height/2 ) && y < ( -this.board_y + height/2 ) )
                {
                    return true;                
                }
            }
   
            return false;
        },
        
        ///////////////////////////////////////////////////
        ///// Enable / disable scrolling
        enableScrolling: function()
        {
            if( ! this.bEnableScrolling )
            {   
                this.bEnableScrolling = true;

                dojo.query( '#'+this.container_div.id+' .movetop' ).style( 'display', 'block' );
                dojo.query( '#'+this.container_div.id+' .moveleft' ).style( 'display', 'block' );
                dojo.query( '#'+this.container_div.id+' .moveright' ).style( 'display', 'block' );
                dojo.query( '#'+this.container_div.id+' .movedown' ).style( 'display', 'block' );

            }
        },
        disableScrolling: function()
        {
            if( this.bEnableScrolling )
            {   
                this.bEnableScrolling = false;
                
                // hide arrows

                dojo.query( '#'+this.container_div.id+' .movetop' ).style( 'display', 'none' );
                dojo.query( '#'+this.container_div.id+' .moveleft' ).style( 'display', 'none' );
                dojo.query( '#'+this.container_div.id+' .moveright' ).style( 'display', 'none' );
                dojo.query( '#'+this.container_div.id+' .movedown' ).style( 'display', 'none' );

            }
        
        },

        //////////////////////////////////////////////////
        //// Zoom with buttons
        setupOnScreenZoomButtons: function( zoomDelta )
        {
            this.zoomDelta = zoomDelta;

            // Old controls - for compatibility
            if( $('zoomin') )
            {
                dojo.connect( $('zoomin'), 'onclick', this, 'onZoomIn' );
            }
            if( $('zoomout' ) )
            {
                dojo.connect( $('zoomout'), 'onclick', this, 'onZoomOut' );
            }
            
            // New controls
            dojo.query( '#'+this.container_div.id+' .zoomin' ).connect( 'onclick', this, 'onZoomIn' ).style( 'cursor', 'pointer' );
            dojo.query( '#'+this.container_div.id+' .zoomout' ).connect( 'onclick', this, 'onZoomOut' ).style( 'cursor', 'pointer' );
            
        },
		onZoomIn: function (evt) {
			evt.preventDefault();
			this.changeMapZoom(this.zoomDelta);
		},
		onZoomOut: function (evt) {
			evt.preventDefault();
			this.changeMapZoom(-this.zoomDelta);
		},
    });        
});