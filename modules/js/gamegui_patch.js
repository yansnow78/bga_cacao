// e board game core stuff

define([
    "dojo", "dojo/_base/declare",
    "dojo/dom-geometry",
    "dijit/Tooltip"
],
function (dojo, declare, domGeometry, Tooltip) {
    return declare("ebg.core.gamegui_patch", null, {
        constructor: function(){
            console.log('ebg.core.gamegui_patch constructor');
            domGeometry._origPosition = domGeometry.position;
            domGeometry._getZoomFactor = () => {return this.gameinterface_zoomFactor;};
            domGeometry._isZoomSupported = (typeof document.body.style.zoom !== "undefined");
            var vendor = navigator.vendor.toLowerCase() ;
            domGeometry._isSafariDetected = (vendor.indexOf('apple') >= 0);
            Tooltip._MasterTooltip.prototype._origShow = Tooltip._MasterTooltip.prototype.show;
            Tooltip._MasterTooltip.prototype.show = this._masterTT_Show;
            Tooltip._MasterTooltip.prototype._geom_position = this._geom_position;
        },

        // completesetup: function(){
        //     this.inherited(arguments);
        //     if (domGeometry._isZoomSupported){
        //         let prevZoom = $('page-content').style.zoom;
        //         window.scrollBy(0,100);
        //         $('page-content').style.zoom = 1;
        //         document.body.offsetHeight;
        //         let pageYOffsetNoZoom = window.pageYOffset;
        //         $('page-content').style.zoom = 0.5;
        //         document.body.offsetHeight;
        //         let pageYOffsetWithZoom = window.pageYOffset;
        //         domGeometry._isScrollPropZoom = (pageYOffsetNoZoom!= pageYOffsetWithZoom);
        //         this.warningDialog(''+pageYOffsetNoZoom+' '+pageYOffsetWithZoom+' '+domGeometry._isScrollPropZoom, function () {});
        //         $('page-content').style.zoom = prevZoom;
        //         window.scrollBy(0,-100);
        //     }
        // },

        _masterTT_Show: function(innerHTML, aroundNode, position, rtl, textDir, onMouseEnter, onMouseLeave){
            // domGeometry._origPosition = domGeometry.position;
            domGeometry.position = this._geom_position;
            try {
                this._origShow(innerHTML, aroundNode, position, rtl, textDir, onMouseEnter, onMouseLeave);
            } finally {
                domGeometry.position = domGeometry._origPosition;
            }
        },

        _geom_position : function(/*DomNode*/ node, /*Boolean?*/ includeScroll){
            const zoom = this._getZoomFactor();
            if ((this._isZoomSupported) && (zoom != 1)) {
                // look if aroundNode is a node inside a zoomed div and store this info to not redo that each time
                if (!node.hasAttribute('_may_be_zoomed')){
                    const may_be_zoomed = ($('page-content').contains(node) && dojo.style('page-content', 'zoom')!="")|| 
                        ($('right-side-first-part').contains(node) && dojo.style('right-side-first-part', 'zoom')!="") ||
                        ($('page-title').contains(node) && dojo.style('page-title', 'zoom')!="");
                    node.setAttribute('_may_be_zoomed', may_be_zoomed.toString());
                }
                if (node.getAttribute('_may_be_zoomed')==="true"){
                    let position = this._origPosition(node, false);
                    position.x = position.x*zoom;
                    position.y = position.y*zoom;
                    if (includeScroll) {
                        if (this._isSafariDetected){
                            position.x += window.pageXOffset*zoom;
                            position.y += window.pageYOffset*zoom;
                        } else {
                            position.x += window.pageXOffset;
                            position.y += window.pageYOffset;                            
                        }
                    }
                    position.w = position.w*zoom;
                    position.h = position.h*zoom;
                    return position;
                }
            } 
            return this._origPosition(node, includeScroll);
        }
    });
});