// e board game core stuff

define([
    "dojo", "dojo/_base/declare",
    "dojo/dom-geometry",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dijit/Tooltip",
    "dijit/place"
],
function (dojo, declare, domGeometry, lang, domStyle, Tooltip, place) {
    return declare("ebg.core.core_patch_tooltip_position", null, {
        constructor: function(){
            _patchTooltipPosIfNeeded();
            function _patchTooltipPosIfNeeded(){

                const origPositionFct = domGeometry.position;
                const origShowFct =  Tooltip._MasterTooltip.prototype.show;
                function _masterTT_Show(innerHTML, aroundNode, position, rtl, textDir, onMouseEnter, onMouseLeave){
                    domGeometry.position = _geom_position;
                    try {
                        origShowFct.call(this, innerHTML, aroundNode, position, rtl, textDir, onMouseEnter, onMouseLeave);
                    } finally {
                        domGeometry.position = origPositionFct;
                    }
                }
    
                function _getZoom(node){
                    let zoom = 1.0;
                    if (typeof node.style.zoom !== "undefined") {
                        zoom = node.style.zoom;
                        if (zoom =="")
                            zoom = 1.0;
                    }
                    const parent = node.parentElement; 
                    if (parent)
                        zoom = zoom * _getZoom(parent);
                        return zoom;
                }
        
                function _geom_position(/*DomNode*/ node, /*Boolean?*/ includeScroll){
                    if (typeof node == "string") {
                        node = document.getElementById(node);
                    }
                    const zoom = _getZoom(node);
                    if (zoom != 1) {
                        let position = _origPosition(node, false);
                        position.x = position.x*zoom;
                        position.y = position.y*zoom;
                        if (includeScroll) {
                            if (_bCorrScroll){
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
                    return _origPosition(node, includeScroll);
                }

                const scrollX = window.pageXOffset;
                const scrollY = window.pageYOffset;
                const el = document.createElement("div");
                el.style = 'top : 10px; left: 10px; zoom: 2.0; width: 4000px; height: 4000px; position: absolute';
                document.body.appendChild(el);
                const el2 = document.createElement("div");
                el2.style = 'top : 20px; left: 5px; zoom: 4.0; width: 10px; height: 10px; position: absolute';
                el.appendChild(el2);
                window.scroll(0,0);
                const tBox = domGeometry.position(el2);
                const bCorrPos = (tBox.x>7.4) && (tBox.x<7.6);
                const _origPosition = domGeometry.position;
                var _bCorrScroll = false;
                console.log("_checkIfPosCorrNeeded", bCorrPos, tBox.x);
                if (bCorrPos){
                    window.scroll(80,0);
                    const tBox2 = domGeometry.position(el2);
                    _bCorrScroll = (tBox2.x>-72.6) && (tBox2.x<-72.4) ;
                    Object.defineProperty(Tooltip._MasterTooltip.prototype, "show", {
                        get() {return _masterTT_Show;}
                    });
                    Tooltip._checkIfPosCorrDone = true;
                    console.log("_checkIfPosCorrNeeded", domGeometry._bCorrScroll, tBox2.x);
                }
                document.body.removeChild(el);
                window.scroll(scrollX,scrollY);

            }
        },

    });
});