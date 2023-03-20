define([
	"dojo", "dojo/_base/declare",
	"dojo/_base/array", "dojo/dom", "dojo/_base/lang", "dojo/mouse", "dojo/on",
	"dijit/Tooltip"
],
	function (dojo, declare, array, dom, lang, mouse, on, Tooltip) {
		return declare("ebg.core.core_patch2", null, {
			constructor: function () {
				console.log('ebg.core.gamegui_patch constructor');
				Tooltip.prototype._setConnectIdAttr = this._setConnectIdAttr;
			},

			/* patch to make tooltip displayed on safari ios*/
			_setConnectIdAttr: function (/*String|String[]|DomNode|DomNode[]*/ newId) {
				// summary:
				//		Connect to specified node(s)

				// Remove connections to old nodes (if there are any)
				array.forEach(this._connections || [], function (nested) {
					array.forEach(nested, function (handle) { handle.remove(); });
				}, this);

				// Make array of id's to connect to, excluding entries for nodes that don't exist yet, see startup()
				this._connectIds = array.filter(lang.isArrayLike(newId) ? newId : (newId ? [newId] : []),
					function (id) { return dom.byId(id, this.ownerDocument); }, this);

				// Make connections
				this._connections = array.map(this._connectIds, function (id) {
					var node = dom.byId(id, this.ownerDocument),
						selector = this.selector,
						delegatedEvent = selector ?
							function (eventType) { return on.selector(selector, eventType); } :
							function (eventType) { return eventType; },
						self = this/* ,
						target = node */;
					return [
						on(node, delegatedEvent(mouse.enter), function () {
							self._onHover(this);
						}),
						on(node, delegatedEvent("focusin"), function () {
							self._onHover(this);
						}),
						/* begin of patch for safari ios */
						on(node, "touchstart", function (e) { //pointerdown
							if (e.touches.length === 1){
								var hideFct = function (e) {
									// console.log("end monitor touchstart, close tooltip", e.type);
									document.removeEventListener("touchstart", hideFct, true);
									self.set("state", "DORMANT");
								};
								var stopTimerFct = function (e) {
									// console.log("end monitor touchcancel", e.type);
									document.removeEventListener("touchcancel", stopTimerFct, true);
									document.removeEventListener("touchend", stopTimerFct, true);
									document.removeEventListener("pointerleave", stopTimerFct, true); 
									if (self.state == "SHOWING") { //already showing, no time to stop
										document.addEventListener("touchstart", hideFct, true);
										// console.log("monitor touchstart", e.type);
									} else { // stop timer
										self.set("state", "DORMANT");
										// console.log("close tooltip", e.type);
									}
								};
								document.addEventListener("touchend", stopTimerFct, true);
								document.addEventListener("touchcancel", stopTimerFct, true);
								document.addEventListener("pointerleave", stopTimerFct, true); 
								self._onHover(this);
							}
						}),
						/* end of patch*/
						on(node, delegatedEvent("mouseleave"), lang.hitch(self, "_onUnHover")),
						on(node, delegatedEvent("focusout"), lang.hitch(self, "set", "state", "DORMANT"))
					];
				}, this);

				this._set("connectId", newId);
			},
		});
	});