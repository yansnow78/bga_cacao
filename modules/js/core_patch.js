// e board game core patched functions (taking into account scale)

define([
    "dojo", "dojo/_base/declare",
    "dojo/fx",
    "dojo/fx/easing"
],
    function (dojo, declare) {
        return declare("ebg.core.core_patch", null, {
            constructor: function () {
                console.log('ebg.core.core_patch constructor');
            },

            // Return an animation that is moving (slide) a DOM object over another one
            slideToObject: function (mobile_obj, target_obj, duration, delay) {
                if (mobile_obj === null) { console.error('slideToObject: mobile obj is null'); }
                if (target_obj === null) { console.error('slideToObject: target obj is null'); }

                if (typeof mobile_obj == 'string') { var mobile_obj = $(mobile_obj); }
                if (typeof target_obj == 'string') { var target_obj = $(target_obj); }

                var disabled3d = this.disable3dIfNeeded();

                var tgt = dojo.position(target_obj);
                var src = dojo.position(mobile_obj);

                if (typeof duration == 'undefined') { duration = 500; }
                if (typeof delay == 'undefined') { delay = 0; }

                if (this.instantaneousMode) {
                    delay = Math.min(1, delay);
                    duration = Math.min(1, duration);
                }

                var scale = target_obj.getBoundingClientRect().width / target_obj.offsetWidth;
                var vector = {
                    x: (tgt.x - src.x) / scale,
                    y: (tgt.y - src.y) / scale
                };

                var left = dojo.style(target_obj, 'left');
                var top = dojo.style(target_obj, 'top');

                //            console.log( 'src: left='+toint( src.x )+', top='+toint( src.y ) +"\n"+
                //                   'target: left='+toint( tgt.x )+', top='+toint( tgt.y ) +"\n"+
                //                   'result: left='+toint( left )+', top='+toint( top ) );


                this.enable3dIfNeeded(disabled3d);

                var anim = dojo.fx.slideTo({
                    node: mobile_obj,
                    top: top,
                    left: left,
                    delay: delay,
                    duration: duration,
                    unit: "px"
                });

                if (disabled3d !== null) {
                    anim = this.transformSlideAnimTo3d(anim, mobile_obj, duration, delay, vector.x, vector.y);
                }
                return anim;

            },

            // Return an animation that is moving (slide) a DOM object over another one at the given coordinates
            slideToObjectPos: function (mobile_obj, target_obj, target_x, target_y, duration, delay) {
                if (mobile_obj === null) { console.error('slideToObjectPos: mobile obj is null'); }
                if (target_obj === null) { console.error('slideToObjectPos: target obj is null'); }
                if (target_x === null) { console.error('slideToObjectPos: target x is null'); }
                if (target_y === null) { console.error('slideToObjectPos: target y is null'); }

                if (typeof mobile_obj == 'string') { var mobile_obj = $(mobile_obj); }
                if (typeof target_obj == 'string') { var target_obj = $(target_obj); }

                var disabled3d = this.disable3dIfNeeded();

                var tgt = dojo.position(target_obj);
                var src = dojo.position(mobile_obj);

                if (typeof duration == 'undefined') { duration = 500; }
                if (typeof delay == 'undefined') { delay = 0; }

                if (this.instantaneousMode) {
                    delay = Math.min(1, delay);
                    duration = Math.min(1, duration);
                }

                var scale = target_obj.getBoundingClientRect().width / target_obj.offsetWidth;
                var vector = {
                    x: (tgt.x - src.x + toint(target_x)) / scale,
                    y: (tgt.y - src.y + toint(target_y)) / scale
                };

                this.enable3dIfNeeded(disabled3d);

                // Move to new location and fade in
                var anim = dojo.fx.slideTo({
                    node: mobile_obj,
                    top: toint(target_y),
                    left: toint(target_x),
                    delay: delay,
                    duration: duration,
                    easing: dojo.fx.easing.cubicInOut,
                    unit: "px"
                });

                if (disabled3d !== null) {
                    anim = this.transformSlideAnimTo3d(anim, mobile_obj, duration, delay, vector.x, vector.y);
                }

                return anim;
            },


            // Attach mobile_obj to a new parent, keeping its absolute position in the screen constant.
            // !! mobile_obj is no longer valid after that (a new corresponding mobile_obj is returned)
            attachToNewParent: function (mobile_obj, new_parent, position) {
                //console.log( "attachToNewParent" );

                if (typeof mobile_obj == 'string') { mobile_obj = $(mobile_obj); }
                if (typeof new_parent == 'string') { new_parent = $(new_parent); }
                if (typeof position == 'undefined') { position = 'last'; }

                if (mobile_obj === null) { console.error('attachToNewParent: mobile obj is null'); }
                if (new_parent === null) { console.error('attachToNewParent: new_parent is null'); }

                var disabled3d = this.disable3dIfNeeded();

                var tgt = dojo.position(mobile_obj);
                var my_new_mobile = dojo.clone(mobile_obj);
                dojo.destroy(mobile_obj);
                dojo.place(my_new_mobile, new_parent, position);

                var src = dojo.position(my_new_mobile);
                var left = dojo.style(my_new_mobile, 'left');
                var top = dojo.style(my_new_mobile, 'top');

                var vector = {
                    x: tgt.x - src.x /* + (tgt.w-src.w)/2 */,
                    y: tgt.y - src.y/*  + (tgt.h-src.h)/2 */
                };

                var scale = my_new_mobile.getBoundingClientRect().width / my_new_mobile.offsetWidth;
                left = left + vector.x / scale;
                top = top + vector.y / scale;

                dojo.style(my_new_mobile, 'top', top + 'px');
                dojo.style(my_new_mobile, 'left', left + 'px');

                this.enable3dIfNeeded(disabled3d);

                return my_new_mobile;
            },




        });



    });

