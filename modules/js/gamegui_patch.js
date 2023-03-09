// e board game core stuff

define([
    "dojo", "dojo/_base/declare",
    "dojo/fx",
    "dojo/fx/easing",
    "dijit/Tooltip"
],
function (dojo, declare) {

    return declare("ebg.core.gamegui_patch", null, {
        constructor: function(){
            console.log('ebg.core.gamegui_patch constructor');
            if(!dijit._masterTT){ dijit._masterTT = dijit.Tooltip._masterTT = new dijit.Tooltip._MasterTooltip(); }
            dijit._masterTT._origShow = dijit._masterTT.show;
            dijit._masterTT.show = this._masterTT_Show;
            dijit._masterTT._getZoomFactor = () => {return this.gameinterface_zoomFactor;};
        },

        _masterTT_Show: function(innerHTML, aroundNode, position, rtl, textDir, onMouseEnter, onMouseLeave){
			if(this.aroundNode && this.aroundNode === aroundNode && this.containerNode.innerHTML == innerHTML){
				return;
			}

			if(this.fadeOut.status() == "playing"){
				// previous tooltip is being hidden; wait until the hide completes then show new one
				this._onDeck=arguments;
				return;
			}
            this._origShow(innerHTML, aroundNode, position, rtl, textDir, onMouseEnter, onMouseLeave);
            const zoom = this._getZoomFactor();
            if (zoom == 1)
                return;
                // look if aroundNode is a node inside a zoomed div and store this info to not redo that each time
                if (!aroundNode.hasAttribute('_may_be_zoomed')){
                // look if 
                const may_be_zoomed = $('page-content').contains(aroundNode) || $('right-side-first-part').contains(aroundNode) || $('page-title').contains(aroundNode);
                aroundNode.setAttribute('_may_be_zoomed', may_be_zoomed.toString());
            }
            if (aroundNode.getAttribute('_may_be_zoomed')==="true"){
                this.domNode.style.zoom = zoom; 
                let s = this.domNode.style;
                const left = parseInt(s.left.slice(0, -2));
                const top = parseInt(s.top.slice(0, -2));
                const scrollCorr =  (1 -zoom) / zoom;
                s.left = left + (window.scrollX * scrollCorr) + 'px';
                s.top  = top + (window.scrollY * scrollCorr) + 'px';
            }
        },
    });
});