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
            var vendor = navigator.vendor;
            domGeometry._isSafariDetected = vendor && (vendor.toLowerCase().indexOf('apple') >= 0);
            Tooltip._MasterTooltip.prototype._origShow = Tooltip._MasterTooltip.prototype.show;
            Tooltip._MasterTooltip.prototype.show = this._masterTT_Show;
            Tooltip._MasterTooltip.prototype._geom_position = this._geom_position;
        },

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
                    const may_be_zoomed = $('page-content').contains(node) || 
                        $('right-side-first-part').contains(node) ||
                        $('page-title').contains(node);
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