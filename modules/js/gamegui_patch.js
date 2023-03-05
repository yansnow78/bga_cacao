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
        },

        _regOnShowTooltip: function(){
            var gamegui = this;
            function onShowTooltip(){
                const that = this;
                dijit._masterTT._onHide= function(){
                    // summary:
                    //		Called at end of fade-out operation
                    // tags:
                    //		protected
        
                    this.domNode.style.cssText="";	// to position offscreen again
                    this.containerNode.innerHTML="";
                    if(this._onDeck){
                        // a show request has been queued up; do it now
                        this.show.apply(this, this._onDeck);
                        this._onDeck=null;
                        that.onShow(that._connectNode, that.position);
                    }
                };
                if (dijit._masterTT._onDeck)
                    return;
                if (gamegui.gameinterface_zoomFactor == 1) 
                    return;
                const zoom = gamegui.gameinterface_zoomFactor;
                var s = dijit._masterTT.domNode.style;
                var left = parseInt(s.left.slice(0, -2));
                var top = parseInt(s.top.slice(0, -2));
                var width = parseInt(s.width.slice(0, -2));
                s.left = (left * zoom) + (window.scrollX * (1 -zoom)) + 'px';
                s.top  = (top * zoom)  + (window.scrollY * (1 -zoom)) + 'px';
                s.width = (width*zoom)+'px';
                s = dijit._masterTT.connectorNode.style;
                if (s.top!=""){
                    top = parseInt(s.top.slice(0, -2));
                    s.top  = (top * zoom) /* + (window.scrollY * (1 -zoom)) */ + 'px';
                }
                if (s.left!=""){
                    left = parseInt(s.left.slice(0, -2));
                    s.left = (left * zoom) /* + (window.scrollX * (1 -zoom)) */ + 'px';
                }
            }
            return onShowTooltip;
        },
        
        addTooltip: function( id, help, action, delay )
        {
            this.inherited(arguments);
            this.tooltips[id].onShow = this._regOnShowTooltip();
        },
      
        addTooltipHtml: function( id, help, action, delay )
        {
            this.inherited(arguments);
            this.tooltips[id].onShow = this._regOnShowTooltip();
        },        
    });
});