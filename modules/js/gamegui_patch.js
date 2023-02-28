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
        
        addTooltip: function( id, help, action, delay )
        {
            this.inherited(arguments);
            this.tooltips[id].onShow = dojo.hitch(this, function() {
                if (this.gameinterface_zoomFactor != 1) {
                    dijit._masterTT.domNode.style.zoom = this.gameinterface_zoomFactor;
                    // $("dijit__MasterTooltip_0").style.left = (parseInt($("dijit__MasterTooltip_0").style.left.slice(0, -2))*this.gameinterface_zoomFactor)+"px";
                    // $("dijit__MasterTooltip_0").style.top = (parseInt($("dijit__MasterTooltip_0").style.top.slice(0, -2))*this.gameinterface_zoomFactor)+"px";
                }
            });
        },
      
        addTooltipHtml: function( id, help, action, delay )
        {
            this.inherited(arguments);
            this.tooltips[id].onShow = dojo.hitch(this, function() {
                if (this.gameinterface_zoomFactor != 1) {
                    dijit._masterTT.domNode.style.zoom = this.gameinterface_zoomFactor;
                    // $("dijit__MasterTooltip_0").style.left = (parseInt($("dijit__MasterTooltip_0").style.left.slice(0, -2))*this.gameinterface_zoomFactor)+"px";
                    // $("dijit__MasterTooltip_0").style.top = (parseInt($("dijit__MasterTooltip_0").style.top.slice(0, -2))*this.gameinterface_zoomFactor)+"px";
                }
            });
        },        
    });
});