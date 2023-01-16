/* Scrollmap: a scrollable map */

define([
    "dojo", "dojo/_base/declare"
],
    function (dojo, declare) {
        return declare("ebg.scrollmapWithZoom", null, {
            constructor: function () {
                this.container_div = null;
                this.scrollable_div = null;
                this.surface_div = null;
                this.onsurface_div = null;
                this.board_x = 0;
                this.board_y = 0;
                this.zoom = 1;
                this._prevZoom = 1;
                this.bEnableScrolling = true;
                this.zoomPinchDelta = 0.005;
                this.zoomWheelDelta = 0.001;
                this.bEnableZooming = false;
                this.zoomChangeHandler = null;
                this.bScrollDeltaAlignWithZoom = true;
                this.scrollDelta = 0;
                this._scrollDeltaAlignWithZoom = 0;
                this._pointers = [];
                this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
            },
            create: function (container_div, scrollable_div, surface_div, onsurface_div) {
                this.container_div = container_div;
                this.scrollable_div = scrollable_div;
                this.surface_div = surface_div;
                this.onsurface_div = onsurface_div;
                dojo.connect(this.surface_div, 'onpointerdown', this, 'onPointerDown');
                dojo.connect(this.container_div, 'onwheel', this, 'onWheel');

                this.scrollto(0, 0);
                this.setMapZoom(this.zoom);
                this.resizeObserver.observe(this.container_div);
            },
            onResize: function (entries) {
                this.scrollto(this.board_x,this.board_y, 0, 0);
                //console.log("onResize");
            },
            _findPointerIndex: function (event) {
                let i = this._pointers.length
                while (i--) {
                    if (this._pointers[i].pointerId === event.pointerId) {
                        return i
                    }
                }
                return -1
            },
            _addPointer: function (event) {
                const i = this._findPointerIndex(event)
                // Update if already present
                if (i > -1) {
                    const prevEv=this._pointers[i];
                    this._pointers.splice(i, 1, event);
                    return prevEv; 
                } else
                    this._pointers.push(event)
            },
            _removePointer: function (event) {
                const i = this._findPointerIndex(event)
                if (i > -1) {
                    this._pointers.splice(i, 1)
                }
            },
            _getPointerPrevEvent: function (event) {
                const i = this._findPointerIndex(event)
                if (i > -1) {
                    return this._pointers[i]
                }
            },
            _getXYCoord: function (ev, ev2) {
                const width = dojo.style(this.container_div, "width");
                const height = dojo.style(this.container_div, "height");
                const containerRect=this.container_div.getBoundingClientRect();
                var clientX=ev.clientX;
                var clientY=ev.clientY;
                if (typeof ev2 !== 'undefined'){
                    clientX=(clientX+ev2.clientX)/2;
                    clientY=(clientY+ev2.clientY)/2;
                }

                const x=clientX-containerRect.x-width/2;
                const y=clientY-containerRect.y-height/2;
                return [x, y];
            },
            onPointerDown: function (ev) {
                if (!this.bEnableScrolling && !this.bEnableZooming)
                    return;
                if (this._pointers.length == 0) {
                    this.onpointermove_handler = dojo.connect(document, "onpointermove", this, "onPointerMove");
                    this.onpointerup_handler = dojo.connect(document, "onpointerup", this, "onPointerUp");
                    this.onpointercancel_handler = dojo.connect(document, "onpointercancel", this, "onPointerUp");
                } 
                this._addPointer(ev);
            },
            onPointerMove: function (ev) {
                ev.preventDefault();
                const prevEv =  this._addPointer(ev);

                // If one pointer is move, drag the map
                if (this._pointers.length === 1) {
                    if (!this.bEnableScrolling)
                        return;
                    if ((typeof prevEv !== 'undefined')) {
                        const [x,y] = this._getXYCoord(ev);
                        const [xPrev,yPrev] = this._getXYCoord(prevEv);
                        this.scroll(x  - xPrev , y - yPrev, 0, 0)
                    }
                }
                // If two _pointers are move, check for pinch gestures
                else if (this._pointers.length === 2) {
                    if (!this.bEnableZooming)
                        return;

                    // Calculate the distance between the two _pointers
                    const ev1 = this._pointers[0];
                    const ev2 = this._pointers[1];
                    const curDist = Math.sqrt(
                        Math.pow(Math.abs(ev2.clientX - ev1.clientX), 2) +
                        Math.pow(Math.abs(ev2.clientY - ev1.clientY), 2)
                    );
                    const [x,y] = this._getXYCoord(ev1, ev2);
                    if (this._prevDist > 0.0) {
                        const diff = curDist - this._prevDist;
                        // newZoom = this.zoom * (1 + this.zoomPinchDelta * diff);
                        const newZoom = this.zoom * (curDist / this._prevDist);
                        this.setMapZoom(newZoom, x, y);
                        this.scroll(x  - this._xPrev , y - this._yPrev, 0, 0)
                    }

                    // Cache the distance for the next move event
                    this._prevDist = curDist;
                    this._xPrev = x;
                    this._yPrev = y;
                }
                dojo.stopEvent(ev);
            },
            onPointerUp: function (ev) {
                this._removePointer(ev);
                // If no pointer left, stop drag or zoom the map
                if (this._pointers.length === 0) {
                    dojo.disconnect(this.onpointermove_handler);
                    dojo.disconnect(this.onpointerup_handler);
                    dojo.disconnect(this.onpointercancel_handler);
                }

                // If the number of _pointers down is less than two then reset diff tracker
                if (this._pointers.length < 2) {
                    this._prevDist = -1;
                }
            },
            onWheel: function (evt) {
                if (!this.bEnableZooming)
                    return;
                evt.preventDefault();
                const [x,y]=this._getXYCoord(evt);
                this.changeMapZoom(evt.deltaY * -this.zoomWheelDelta, x, y);
            },

            scroll: function (dx, dy, duration, delay) {
                if (typeof duration == 'undefined') {
                    duration = 350; // Default duration
                }
                if (typeof delay == 'undefined') {
                    delay = 0; // Default delay
                }
                //console.log(dx+' '+dy);
                this.scrollto(this.board_x + dx, this.board_y + dy, duration, delay);
            },

            // Scroll the board to make it centered on given position
            scrollto: function (x, y, duration, delay) {
                if (typeof duration == 'undefined') {
                    duration = 350; // Default duration
                }
                if (typeof delay == 'undefined') {
                    delay = 0; // Default delay
                }

                const width = dojo.style(this.container_div, "width");
                const height = dojo.style(this.container_div, "height");

                const board_x = toint(x + width / 2);
                const board_y = toint(y + height / 2);

                this.board_x = x;
                this.board_y = y;

                if ((duration == 0) && (delay == 0)) {
                    dojo.style(this.scrollable_div, "left", board_x + "px");
                    dojo.style(this.onsurface_div, "left", board_x + "px");
                    dojo.style(this.scrollable_div, "top", board_y + "px");
                    dojo.style(this.onsurface_div, "top", board_y + "px");
                    // dojo.style( dojo.body(), "backgroundPosition", board_x+"px "+board_y+"px" );
                    return;
                }

                var anim = dojo.fx.combine([
                    dojo.fx.slideTo({
                        node: this.scrollable_div,
                        top: board_y,
                        left: board_x,
                        unit: "px",
                        duration: duration,
                        delay: delay
                    }),
                    dojo.fx.slideTo({
                        node: this.onsurface_div,
                        top: board_y,
                        left: board_x,
                        unit: "px",
                        duration: duration,
                        delay: delay
                    })
                ]);

                anim.play();
            },

            // Scroll map in order to center everything
            // By default, take all elements in movable_scrollmap
            //  you can also specify (optional) a custom CSS query to get all concerned DOM elements
            scrollToCenter: function (custom_css_query) {
                const center = this.getMapCenter(custom_css_query);
                this.scrollto(-center.x, -center.y);
            },

            getMapCenter: function (custom_css_query) {
                // Get all elements inside and get their max x/y/w/h
                var max_x = 0;
                var max_y = 0;
                var min_x = 0;
                var min_y = 0;

                var css_query = '#' + this.scrollable_div.id + " > *";
                if (typeof custom_css_query != 'undefined') {
                    css_query = custom_css_query;
                }

                dojo.query(css_query).forEach(dojo.hitch(this, function (node) {
                    max_x = Math.max(max_x, dojo.style(node, 'left') + dojo.style(node, 'width'));
                    min_x = Math.min(min_x, dojo.style(node, 'left'));

                    max_y = Math.max(max_y, dojo.style(node, 'top') + dojo.style(node, 'height'));
                    min_y = Math.min(min_y, dojo.style(node, 'top'));

                    //                alert( node.id );
                    //                alert( min_x+','+min_y+' => '+max_x+','+max_y );
                }));

                return {
                    x: (min_x + max_x) / 2,
                    y: (min_y + max_y) / 2
                };
            },

            changeMapZoom: function (diff, x=0, y=0) {
                const newZoom = this.zoom + diff;
                this.setMapZoom(newZoom,x,y);
            },

            setMapZoom: function (zoom, x=0, y=0) {
                this.zoom = Math.min(Math.max(zoom, 0.2), 2);
                if (this.bScrollDeltaAlignWithZoom)
                    this._scrollDeltaAlignWithZoom = this.scrollDelta * zoom;
                else
                    this._scrollDeltaAlignWithZoom = this.scrollDelta;
                this.setScale(this.scrollable_div, this.zoom);
                this.setScale(this.onsurface_div, this.zoom);
                if (this.zoomChangeHandler)
                    this.zoomChangeHandler(this.zoom);
                const zoomDelta = this.zoom/this._prevZoom;
                //console.log(x+' '+ y+' '+ zoomDelta+' '+ this.zoom);
                this.scrollto((this.board_x*zoomDelta) +x*(1-zoomDelta) , (this.board_y*zoomDelta)+y*(1-zoomDelta), 0, 0);
                this._prevZoom = this.zoom;
            },

            setScale: function (elemId, scale) {
                dojo.style($(elemId), 'transform', 'scale(' + scale + ')');
            },

            //////////////////////////////////////////////////
            //// Scroll with buttons

            // Optional: setup on screen arrows to scroll the board
            setupOnScreenArrows: function (scrollDelta, bScrollDeltaAlignWithZoom=true) {
                this.scrollDelta = scrollDelta;
                this.bScrollDeltaAlignWithZoom = bScrollDeltaAlignWithZoom;
                if (this.bScrollDeltaAlignWithZoom)
                    this._scrollDeltaAlignWithZoom = scrollDelta * this.zoom;
                else
                    this._scrollDeltaAlignWithZoom = scrollDelta;

                // Old controls - for compatibility
                if ($('movetop')) {
                    dojo.connect($('movetop'), 'onclick', this, 'onMoveTop');
                }
                if ($('moveleft')) {
                    dojo.connect($('moveleft'), 'onclick', this, 'onMoveLeft');
                }
                if ($('moveright')) {
                    dojo.connect($('moveright'), 'onclick', this, 'onMoveRight');
                }
                if ($('movedown')) {
                    dojo.connect($('movedown'), 'onclick', this, 'onMoveDown');
                }

                // New controls
                dojo.query('#' + this.container_div.id + ' .movetop').connect('onclick', this, 'onMoveTop').style('cursor', 'pointer');
                dojo.query('#' + this.container_div.id + ' .movedown').connect('onclick', this, 'onMoveDown').style('cursor', 'pointer');
                dojo.query('#' + this.container_div.id + ' .moveleft').connect('onclick', this, 'onMoveLeft').style('cursor', 'pointer');
                dojo.query('#' + this.container_div.id + ' .moveright').connect('onclick', this, 'onMoveRight').style('cursor', 'pointer');

            },

            onMoveTop: function (evt) {
                console.log("onMoveTop");
                evt.preventDefault();
                this.scroll(0, this._scrollDeltaAlignWithZoom);
            },
            onMoveLeft: function (evt) {
                console.log("onMoveLeft");
                evt.preventDefault();
                this.scroll(this._scrollDeltaAlignWithZoom, 0);
            },
            onMoveRight: function (evt) {
                console.log("onMoveRight");
                evt.preventDefault();
                this.scroll(-this._scrollDeltaAlignWithZoom, 0);
            },
            onMoveDown: function (evt) {
                console.log("onMoveDown");
                evt.preventDefault();
                this.scroll(0, -this._scrollDeltaAlignWithZoom);
            },

            isVisible: function (x, y) {
                const width = dojo.style(this.container_div, "width");
                const height = dojo.style(this.container_div, "height");

                if (x >= (-this.board_x - width / 2) && x <= (-this.board_x + width / 2)) {
                    if (y >= (-this.board_y - height / 2) && y < (-this.board_y + height / 2)) {
                        return true;
                    }
                }

                return false;
            },

            ///////////////////////////////////////////////////
            ///// Enable / disable scrolling
            enableScrolling: function () {
                if (!this.bEnableScrolling) {
                    this.bEnableScrolling = true;

                    dojo.query('#' + this.container_div.id + ' .movetop').style('display', 'block');
                    dojo.query('#' + this.container_div.id + ' .moveleft').style('display', 'block');
                    dojo.query('#' + this.container_div.id + ' .moveright').style('display', 'block');
                    dojo.query('#' + this.container_div.id + ' .movedown').style('display', 'block');

                }
            },
            disableScrolling: function () {
                if (this.bEnableScrolling) {
                    this.bEnableScrolling = false;

                    // hide arrows

                    dojo.query('#' + this.container_div.id + ' .movetop').style('display', 'none');
                    dojo.query('#' + this.container_div.id + ' .moveleft').style('display', 'none');
                    dojo.query('#' + this.container_div.id + ' .moveright').style('display', 'none');
                    dojo.query('#' + this.container_div.id + ' .movedown').style('display', 'none');

                }

            },

            //////////////////////////////////////////////////
            //// Zoom with buttons
            setupOnScreenZoomButtons: function (zoomDelta) {
                this.zoomDelta = zoomDelta;

                // Old controls - for compatibility
                if ($('zoomin')) {
                    dojo.connect($('zoomin'), 'onclick', this, 'onZoomIn');
                }
                if ($('zoomout')) {
                    dojo.connect($('zoomout'), 'onclick', this, 'onZoomOut');
                }

                // New controls
                dojo.query('#' + this.container_div.id + ' .zoomin').connect('onclick', this, 'onZoomIn').style('cursor', 'pointer');
                dojo.query('#' + this.container_div.id + ' .zoomout').connect('onclick', this, 'onZoomOut').style('cursor', 'pointer');

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