// e board game core stuff

define([
    "dojo", "dojo/_base/declare",
    "dojo/fx",
    "dojo/fx/easing",
    "dijit/Tooltip"
],
function (dojo, declare) {

    return declare("ebg.core.core_patch2", null, {
        constructor: function(){
            this.calcScale = true;
            console.log('ebg.core.core_patch2 constructor');
        },
        
        addTooltip: function( id, help, action, delay )
        {
            //console.log( 'addTooltip :' + id );
        
            if( typeof id != 'string' )
            {   console.error( 'Call addTooltip with an id that is not a string !' ); }
        
            if( this.tooltips[ id ] )
            {
                this.tooltips[ id ].destroy();
            }
                        
            var showDelay = 400;
            if( typeof delay !== 'undefined' )
            {   showDelay = delay;  }
        
            this.tooltips[ id ] = new dijit.Tooltip({
                 connectId: [ id ],
                 label: "hello"+ this.getHtmlFromTooltipinfos( help, action ),
                 showDelay: showDelay
              });
            // $("dijit__MasterTooltip_0").style.zoom = $('page-title').style.zoom;
            // this.tooltips[ id ].domNode.style.color = "#FF0000";

            if ( this.bHideTooltips )
            {
                // Define onShow callback to autohide tooltip immediately (Hide tooltips)
                this.tooltips[id].onShow = dojo.hitch(this.tooltips[id], function() { this.close(); });
            } else {
                this.tooltips[id].onShow = function() { 
                    if ($("MasterTooltip_Zoomed")==null) {
                        var div=document.createElement("div");
                        div.id = "MasterTooltip_Zoomed";
                        document.body.appendChild(div);
                    }
                    $("MasterTooltip_Zoomed").style.zoom = $('page-title').style.zoom; 
                    $("MasterTooltip_Zoomed").appendChild($("dijit__MasterTooltip_0"));
                };
            }

            dojo.connect( $( id ), 'onclick', this.tooltips[ id ], 'close' );
            
            // Starting dojo 1.10, tooltip does not disapear when mouse is on tooltip => for consistency we must make tooltip disapear in such a case
            this.tooltipsInfos[ id ] = {
                hideOnHoverEvt: null
            };
            dojo.connect( this.tooltips[id],'_onHover', dojo.hitch( this, function() {

                    if( ( this.tooltipsInfos[ id ].hideOnHoverEvt === null ) && $('dijit__MasterTooltip_0' ) )
                    {
                        this.tooltipsInfos[ id ].hideOnHoverEvt = dojo.connect( $('dijit__MasterTooltip_0'), 'onmouseenter', this.tooltips[ id ] , 'close' );
                    }
            } ) );
            
        },
      
        
    });       
    
  
    
});