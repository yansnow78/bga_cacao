/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Cacao implementation : © Paul Barbieux <paul.barbieux@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * cacao.js
 */

/* global g_archive_mode, ScrollmapWithZoom*/
var isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;
var debug = isDebug ? console.info.bind(window.console) : function() {};
define([
	"dojo", "dojo/_base/declare",
	'./modules/js/scrollmapWithZoom',
	//'./modules/js/core_patch_slideto',
	//'./modules/js/core_patch_tooltip_show',
	//'./modules/js/core_patch_tooltip_position',
	"ebg/core/gamegui",
	"ebg/counter",
	"ebg/zone",
],
	function (dojo, declare) {
		return declare("bgagame.cacao", [ebg.core.gamegui/*, ebg.core.core_patch_slideto, ebg.core.core_patch_tooltip_show , ebg.core.core_patch_tooltip_position*/], {
			constructor: function () {
				this.anim_duration = 1000;
				this.tile_size = 120;
				this.action_shift = 20;

				this.jungles_display = new ebg.zone();
				this.scrollmap = new ebg.scrollmapWithZoom(); // Scrollable area
				// this.scrollmap.zoomingOptions.wheelZoming = ebg.scrollmapWithZoom.wheelZoomingKeys.Alt;
				this.scrollmap.zoom = 0.6;
				this.clientStateArgs = {}; // Data during one state
				//this.default_viewport = "width=740px";//this.interface_min_width; //width=device-width, initial-scale=1.0
				this.setViewPort();
			},

			setup: function (gamedatas) {
				// Set mobile viewport for portrait orientation based on gameinfos.inc.php
				//this.default_viewport = this.interface_min_width; /*"width=740px" +  */
				this.onScreenWidthChange();

				this.jungle_tiles_descriptions = gamedatas.jungle_tiles_descriptions;
				/*
					Create scrollmap
				*/
				const scrollmapCreateExtra = (scrollmap) => {
					dojo.place(dojo.eval("jstpl_map_onsurface"), scrollmap.onsurface_div);
					scrollmap.surface_div.insertAdjacentHTML("afterend", dojo.eval("jstpl_map_clipped"));
				};
				this.scrollmap.minZoom = 0.2;
				this.scrollmap.scrollDelta = this.tile_size;
				this.scrollmap.bAdaptHeightAuto = true;
				this.scrollmap.btnsDivOnMap = false;
				this.scrollmap.btnsDivPositionOutsideMap = ScrollmapWithZoom.btnsDivPositionE.Right/* + ' ' +ScrollmapWithZoom.btnsDivPositionE.Center*/;
				// this.scrollmap.bIncrHeightBtnIsShort = false;
				// this.scrollmap.bIncrHeightBtnGroupedWithOthers = false;
				this.scrollmap.createCompletely($('map_container'), this, scrollmapCreateExtra);
				
				/*
					Setting up player boards
				*/
				for (var player_id in gamedatas.players) {
					var player = gamedatas.players[player_id];
					var player_color_class = this.getColorClass(player.color);
					dojo.place(this.format_block("jstpl_player_board", { 'playerId': player_id, 'color': player_color_class }), $("player_board_" + player_id));
					this.showPlayerScore(player_id, player.gold, player.cacao, player.sun, player.water, true);
					var counter_tile_id = "counter_tiles_" + player_id;
					if (player_id == this.player_id) {
						var current_player_color = player.color;
						// Add tooltips
						this.addTooltip(counter_tile_id, _('Number of tiles in your worker draw pile.'), '');
						this.addTooltip("counter_cacao_" + player_id, _("Your cacao's reserve (maximum 5)."), '');
						this.addTooltip("counter_water_" + player_id, _("Your water fields."), '');
						this.addTooltip("counter_sun_" + player_id, _("Your sun-worshiping reserve (maximum 3)."), '');
						this.addTooltip("hand_tiles_" + player_id, _("Your hand of worker tiles."), '');
					} else {
						var cntTilesInHand = toint(gamedatas.playerHands[player_id]);
						for (var count = 1; count <= cntTilesInHand; count++) {
							dojo.place('<div class="tile-back back-' + player_color_class + '"></div>', $("hand_tiles_" + player_id));
						}
						var cntWorkersDeck;
						if (typeof gamedatas.count_deck_workers['deck_' + player_id] === "undefined") {
							cntWorkersDeck = 0;
						} else {
							cntWorkersDeck = gamedatas.count_deck_workers['deck_' + player_id];
						}
						dojo.place("<span>" + cntWorkersDeck + "</span>", "counter_tiles_" + player_id, "only");
					}
				}
				/*
					Worker tiles in the hand
				*/
				for (var i in gamedatas.workerHand) {
					var worker_tile = gamedatas.workerHand[i];
					this.addWorkerInTheHand(this.player_id, current_player_color, worker_tile.type, worker_tile.id, gamedatas.counterDeck);
				}
				/*
					Place tiles on board
				*/
				for (i in gamedatas.board) {
					var tile = gamedatas.board[i];
					var placedTileId = this.addTileOnBoard(tile.x, tile.y, tile.tile, tile.card_id, tile.rotation, tile.player_color, tile.overbuilded);
					if (placedTileId.substring(0, 6) == "worker" && tile.card_id == gamedatas.last_workers_card_id) {
						// Last workers tile placed
						dojo.addClass(placedTileId, "last");
					}
					if (placedTileId.substring(0, 6) != "worker"){
						try {
							this.addTooltip(placedTileId, _(this.jungle_tiles_descriptions[tile.tile]), '');
						} catch (error) {
							/* empty */
						}
					}

				}
				// this.scrollmap.scrollToCenter();

				/*
					Show two jungle tiles in the display
				*/
				this.jungles_display.create(this, 'jungle_display', this.tile_size, this.tile_size);
				this.jungles_display.setPattern("grid");
				if (gamedatas.next_jungle.length == 0) {
					if (gamedatas.cnt_deck_jungles == 0) {
						// No more jungles
						dojo.addClass('jungle_display', "empty");
					}
					dojo.place("<span>" + gamedatas.cnt_deck_jungles + "</span>", 'counter_jungles', "only");
				} else {
					for (i in gamedatas.next_jungle) {
						var jungle_tile = gamedatas.next_jungle[i];
						this.fillJungleDisplay(jungle_tile.type, jungle_tile.id, jungle_tile.description, gamedatas.cnt_deck_jungles);
					}
				}
				/*
					Common tooltips
				*/
				this.addTooltip("counter_jungles", _("Number of tiles in the jungle draw pile."), "");

				// Setup game notifications to handle (see "setupNotifications" method below)
				this.setupNotifications();

				// User preferences
				this.setupUserPreferences();
			},

			setViewPort: function () {
				if (typeof document.body.style.zoom === "undefined") { // css zoom not supported
					if (screen.width < this.interface_min_width) {
						var viewport = document.getElementsByName("viewport")[0];
						viewport.setAttribute("content", "width=" + this.interface_min_width + "");
					}
				}
			},

			onScreenWidthChange: function () {
				this.setViewPort();
			},

			///////////////////////////////////////////////////
			//// User preferences

			setupUserPreferences: function () {
				// Call onPreferenceChange() when any value changes
				var onchange = (e) => {
					const match = e.target.id.match(/^preference_[cf]ontrol_(\d+)$/);
					if (!match) {
						return;
					}
					const pref = match[1];
					const newValue = e.target.value;
					this.prefs[pref].value = newValue;
					this.onPreferenceChange(pref, newValue);
				};
				dojo.query('.preference_control').on('change', onchange);

				// Call onPreferenceChange() now to initialize the setup
				dojo.forEach(
					dojo.query("#ingame_menu_content .preference_control"),
					function(el) {
						onchange({
							target: el
						});
					}
				);
			},

			onPreferenceChange: function (prefId, prefValue) {
				// console.log("Preference changed", prefId, prefValue);
                // Preferences that change display
                // switch (prefId) {
                //     // Zoom with scroll wheel
                //     case "100":
				// 		this.scrollmap.bEnableWheelZooming = +prefValue;
				// 		break;

				// 	// case "101":
				// 	// 	this.scrollmap.bEnablePinchZooming = +prefValue;
				// 	// 	break;

				// 	// case "102":
				// 	// 	this.scrollmap.bEnableOneFingerScrolling = +prefValue;
				// 	// 	break;				
				// }
			},
			///////////////////////////////////////////////////
			//// Game & client states

			onEnteringState: function (stateName, args) {
				switch (stateName) {
					case "playerTurn":
						if (this.isCurrentPlayerActive()) {
							this.updatePlacesForTiles(args.args.workerPlaces);
							this.clientStateArgs.placesConnected = null;
							this.clientStateArgs.place_id = null;
							this.clientStateArgs.worker_id = null;
							this.clientStateArgs.jungle_id = null;
							dojo.query(".current-player-board .hand-tiles").addClass("active");
							this.addTooltipToClass("place", _("Place where you can put your worker tile."), _("Click on a worker tile in you hand, then click on a space."));
						}
						break;
					case "client_selectWorkerLocation":
						if (this.isCurrentPlayerActive()) {
							if (this.clientStateArgs.placesConnected == null) { // Avoid multiple triggers
								dojo.query(".place").connect("onclick", this, "onSelectWorkerPlace");
								this.clientStateArgs.placesConnected = true;
							}
						}
						break;
					case "client_selectWorkerRotate":
						if (this.isCurrentPlayerActive()) {
							this.showRotateLink(this.clientStateArgs.worker_id);
							this.addActionButton("worker_confirm", _("Confirm tile placement"), "onConfirmWorker");
						}
						break;
					case "playerJungle":
						if (this.isCurrentPlayerActive()) {
							this.showJunglePlaces(args.args.junglePlaces);
							dojo.query("#jungle_display").addClass("active");
							dojo.query("#jungle_display .jungle").connect("onclick", this, "onJungleTile");
							this.addTooltipToClass("place", _("Place where you can put a jungle tile."), _("Click on a jungle tile in the display, then click on a space. WARNING : once the tile is placed, you cannot change its place !"));

						}
						break;
					case "client_selectJungleLocation":
						if (this.isCurrentPlayerActive()) {
							if (this.clientStateArgs.placesConnected == null) { // Avoid multiple triggers
								dojo.query(".place").connect("onclick", this, "onSelectJunglePlace");
								this.clientStateArgs.placesConnected = true;
							}
						}
						break;
					case "playerJungleActions":
						for (var player_id in args.args.actionPlayers) {
							if (player_id == this.player_id) {
								this.showActionPointers(args.args.actionPlayers[player_id]);
							}
						}
						break;
					case "gameTurn":
						break;
					case "gameFinalScore":
						break;
					case 'dummmy':
						break;
				}
			},

			onLeavingState: function (stateName) {

				switch (stateName) {

					case 'dummmy':
						break;
				}
			},

			onUpdateActionButtons: function (stateName, args) {
				if (this.isCurrentPlayerActive()) {
					switch (stateName) {
						case 'playerJungleActions':
							this.addActionButton("complete_actions", _("Finish"), "onCompleteActions", null, false, "gray");
							this.addActionButton("choice_workers", _("Don't activate all workers"), "onNotActivateAllWorkers", null, false, "gray");
							break;
						case 'client_confirmJungleLocation':
							this.addActionButton('buttonConfirm', _('Confirm'), 'onConfirmJunglePlace', null, false, 'blue');
							//this.addActionButton('buttonCancel', _('Cancel'), 'onCancelJunglePlace', null, false, 'gray');
							this.addActionButton('buttonRestart', _('Restart turn'), 'onRestart', null, false, 'gray');

							this.stopActionTimer();
							this.startActionTimer('buttonConfirm', 10, 1);
							break;
						case 'client_selectJungleLocation':
							this.addActionButton('buttonRestart', _('Restart turn'), 'onRestart', null, false, 'gray');
							break;
					}
				}
			},

			///////////////////////////////////////////////////
			//// Utility methods

			/*
				Add a jungle tile on the display zone
			*/
			fillJungleDisplay: function (type, card_id, description, cnt_deck_jungles) {
				if (this.jungle_tiles_descriptions)
					description = this.jungle_tiles_descriptions[type];
				var tile_id = "jungle_" + card_id;
				dojo.place(
					this.format_block(
						"jstpl_jungle",
						{
							'type': type,
							'id': tile_id,
							'card_id': card_id
						}),
					dojo.body());
				this.jungles_display.placeInZone(tile_id);
				this.addTooltip(tile_id, _(description), '');
				dojo.place("<span>" + cnt_deck_jungles + "</span>", 'counter_jungles', "only");
			},

			/*
				Center the board on a tile
			*/
			centerBoardOnTile: function (x, y) {
				var axeX = this.tile_size * (toint(x) + 0.5);
				var axeY = this.tile_size * (toint(y) + 0.5);
				if (!this.scrollmap.isVisible(axeX, axeY)) {
					this.scrollmap.scrollto(-axeX, -axeY);
				}
			},

			/*
				Add a worker tile in the hand of a player
			*/
			addWorkerInTheHand: function (player_id, color, tile_type, card_id, nb_tiles) {
				var tile_id = tile_type + "_" + card_id;
				var color_class = this.getColorClass(color);
				var node_tile = dojo.place(
					this.format_block(
						"jstpl_worker",
						{
							'type': tile_type,
							'id': tile_id,
							'card_id': card_id,
							'color': color_class,
							'rotation': 1
						}
					),
					"hand_tiles_" + player_id);
				dojo.connect(node_tile, "onclick", this, "onWorkerTile");
				dojo.place("<span>" + nb_tiles + "</span>", "counter_tiles_" + player_id, "only");
			},

			/*
				Get code for class for a color
			*/
			getColorClass: function (color) {
				switch (color) {
					case "FFFFFF": return "w";
					case "B5A02E": return "y";
					case "88268D": return "p";
					case "DC2F31": return "r";
				}
				console.log("Unknown color : " + color);
				return false;
			},

			/*
				Show rotate symbol on a tile
			*/
			showRotateLink: function (tile_id) {
				this.clientStateArgs.rotation = 1;
				dojo.place('<div id="rotate_click"></div>', tile_id, "only");
				dojo.connect($('rotate_click'), "onclick", this, "onRotateCurrent");
			},

			/*
				Show the scores of a player
			*/
			showPlayerScore: function (player_id, gold, cacao, sun, water, setup = false) {
				if (setup) {
					// scoreCtrl is undefined at setup
					setTimeout(function () {
						dojo.place('<span>' + gold + '</span>', "player_score_" + player_id, "only");
					}, 2000);
				} else {
					this.scoreCtrl[player_id].toValue(gold);
				}
				dojo.place('<div class="value-' + cacao + '"></div>', "counter_cacao_" + player_id, "only");
				dojo.place('<div class="value-' + sun + '"></div>', "counter_sun_" + player_id, "only");
				dojo.place('<div class="value value-' + water + '"></div>', $("counter_water_" + player_id), "only");
			},

			/*
				Show material moving between board and player
			*/
			moveMaterial: function (player_id, card_id, material, direction, delay) {
				var from_zone, to_zone, material_parent;
				if (direction == "get") {
					if (material == "gold") {
						to_zone = $("player_score_" + player_id);
						material_parent = to_zone.parentNode;
					} else {
						material_parent = "counter_" + material + "_" + player_id;
						to_zone = material_parent;
					}
					from_zone = "jungle_" + card_id;
					// console.log(material_parent, from_zone, to_zone);
				} else {
					material_parent = this.scrollmap.animation_div;
					if (material == "gold")
						from_zone = "player_score_" + player_id;
					else
						from_zone = "counter_" + material + "_" + player_id;
					to_zone = "jungle_" + card_id;
					// console.log(material_parent, from_zone, to_zone);
				}
				this.slideTemporaryObject(
					this.format_block("jstpl_material", { 'material': material }),
					material_parent,
					from_zone,
					to_zone,
					this.anim_duration,
					delay,
					direction == 'get' ? null : 1/this.scrollmap.zoom
				);
			},

			/*
				Show available places on the board for a tile
			*/
			updatePlacesForTiles: function (places) {
				for (var i in places) {
					var place = places[i];
					var x = place[0];
					var y = place[1];
					if (!$("place_" + x + "x" + y)) {
						var tpl = {};
						tpl.x = x;
						tpl.y = y;
						tpl.top = y * this.tile_size;
						tpl.left = x * this.tile_size;
						dojo.place(this.format_block("jstpl_place", tpl), "places_container");
					}
				}
			},

			/*
				Place a tile on the board
			*/
			addTileOnBoard: function (x, y, tile_type, card_id, rotation, color, overbuilded) {
				var to_left = this.tile_size * x;
				var to_top = this.tile_size * y;
				if (rotation == null || rotation == "") {
					var tile_id = "jungle_" + card_id;
					dojo.place(
						this.format_block(
							"jstpl_jungle_xy",
							{
								'type': tile_type,
								'id': tile_id,
								'card_id': card_id,
								'left': to_left,
								'top': to_top
							}),
						this.scrollmap.scrollable_div);
				} else {
					tile_id = "worker_" + tile_type + "_" + card_id;
					if (overbuilded == "1") {
						to_left -= 2;
						to_top -= 2;
					}
					dojo.place(
						this.format_block(
							"jstpl_worker_xy",
							{
								'type': tile_type,
								'id': tile_id,
								'card_id': card_id,
								'color': this.getColorClass(color),
								'rotation': rotation,
								'left': to_left,
								'top': to_top
							}
						),
						this.scrollmap.scrollable_div);
					if (overbuilded == "1") {
						dojo.addClass(tile_id, "overbuild");
					}
				}
				return tile_id;
			},

			/*
				Highlight action edges
			*/
			showActionPointers: function (tiles) {
				for (var i in tiles) {
					var tile = tiles[i];
					var x = toint(tile['x']);
					var y = toint(tile['y']);
					var tpl = {};
					tpl.top = y * this.tile_size;
					tpl.left = x * this.tile_size;
					switch (tile['edge']) {
						case "n":
							tpl.top -= this.action_shift;
							break;
						case "e":
							tpl.left += this.tile_size - this.action_shift;
							break;
						case "s":
							tpl.top += this.tile_size - this.action_shift;
							break;
						case "w":
							tpl.left -= this.action_shift;
							break;
					}
					tpl.action_id = tile['action_id'];
					tpl.edge = tile['edge'];
					tpl.workers = tile['workers'];
					dojo.place(this.format_block("jstpl_action", tpl), "places_container");
					for (var occurs = 1; occurs <= tile['workers']; occurs++) {
						var link_id = tpl.action_id + "_" + occurs;
						var node_tile = dojo.place(this.format_block("jstpl_action_link", { 'action_id': tpl.action_id, 'link_id': link_id, 'occurs': occurs }), "action_" + tpl.action_id);
						dojo.query(node_tile).connect("onclick", this, "onActivatedTile");
						var activateTooltip;
						if (tile['gain'] == "cacao") {
							var total = occurs * tile['value'];
							activateTooltip = dojo.string.substitute(_("Get ${times} cacao fruit(s)."), { times: total });
						} else {
							activateTooltip = dojo.string.substitute(_("Sell ${times} cacao fruit(s)."), { times: occurs });
						}
						this.addTooltip("action_" + link_id, activateTooltip, '');
					}
				}
			},

			calcPos: function (x, y) {
				return {x: this.tile_size * x, y: this.tile_size * y};
			},

			placeTile: function (tile_id, pos) {
				if ($(tile_id).parentNode != this.scrollmap.scrollable_div)
					dojo.place( tile_id, this.scrollmap.scrollable_div );
				dojo.attr(tile_id, 'style', "left: " + pos.x + "px; top: " + pos.y + "px;");
			},

			showJunglePlaces(junglePlaces){
				this.clientStateArgs.placesConnected = null;
				this.updatePlacesForTiles(junglePlaces);
				dojo.query("#jungle_display").addClass("active");
				$("jungle_display").querySelectorAll(".jungle").forEach((elt)=>{elt.onclick=this.onJungleTile.bind(this);});
				this.addTooltipToClass("place", _("Place where you can put a jungle tile."), _("Click on a jungle tile in the display, then click on a space. WARNING : once the tile is placed, you cannot change its place !"));
			},

			getMoveJungleToPlaceAnim: function (tile_id, pos) {
				var tooltip_label = this.tooltips[ tile_id ].label;
				this.attachToNewParent(tile_id, this.scrollmap.animation_div, null, true);
				this.addTooltip(tile_id, 'd', '');
				this.tooltips[ tile_id ].label = tooltip_label;
				this.jungles_display.removeFromZone(tile_id, false, null);
				return this.slideToPos(tile_id, pos, this.anim_duration);
			},

			placeBackWorker: function(tile_id_to_switch, onEnd){
				var hand_tiles = "hand_tiles_" + this.player_id;
				this.attachToNewParent(tile_id_to_switch, hand_tiles, null, true);
				dojo.removeClass(tile_id_to_switch, "selected");
				this.rotateTo(tile_id_to_switch, 0);
				dojo.destroy("rotate_click");
				var anim = this.slideToPos(tile_id_to_switch, {x: 0, y: 0}, this.anim_duration);
				dojo.connect(anim, 'onEnd', dojo.hitch(this, function () {
					dojo.style(tile_id_to_switch, 'top', 'auto');
					dojo.style(tile_id_to_switch, 'left', 'auto');
					dojo.style(tile_id_to_switch, 'transform', 'rotate(0deg)');
					dojo.connect($(tile_id_to_switch), "onclick", this, "onWorkerTile");
					onEnd();
				}));
				anim.play();
			},
			
			isReplay() {
				return typeof g_replayFrom != 'undefined' || g_archive_mode;
			},

			isReadOnly() {
				return this.isSpectator || typeof g_replayFrom != 'undefined' || g_archive_mode;
			},

			/*
			* Add a timer on an action button :
			* params:
			*  - buttonId : id of the action button
			*  - time : time before auto click
			*  - pref : 0 is disabled (auto-click), 1 if normal timer, 2 if no timer and show normal button
			*/

			startActionTimer(buttonId, time, pref, autoclick = false) {
				var button = $(buttonId);
				var isReadOnly = this.isReadOnly();
				debug($(buttonId));
				if (button == null || isReadOnly || pref == 2) {
					debug('Ignoring startActionTimer(' + buttonId + ')', 'readOnly=' + isReadOnly, 'prefValue=' + pref);
					return;
				}
		
				// If confirm disabled, click on button
				if (pref == 0) {
				if (autoclick) button.click();
				return;
				}
		
				this._actionTimerLabel = button.innerHTML;
				this._actionTimerSeconds = time;
				this._actionTimerFunction = () => {
					var button = $(buttonId);
					if (button == null) {
						this.stopActionTimer();
					} else if (this._actionTimerSeconds-- > 1) {
						button.innerHTML = this._actionTimerLabel + ' (' + this._actionTimerSeconds + ')';
					} else {
						debug('Timer ' + buttonId + ' execute');
						button.click();
					}
				};
				this._actionTimerFunction();
				this._actionTimerId = window.setInterval(this._actionTimerFunction, 1000);
				debug('Timer #' + this._actionTimerId + ' ' + buttonId + ' start');
			},
		
			stopActionTimer() {
				if (this._actionTimerId != null) {
				debug('Timer #' + this._actionTimerId + ' stop');
				window.clearInterval(this._actionTimerId);
				delete this._actionTimerId;
				}
			},
			
			///////////////////////////////////////////////////
			//// Player's action

			/*
				Choose a worker tile in the hand
			*/
			onWorkerTile: function (event) {
				dojo.stopEvent(event);
				// this.scrollmap.scroll(0, 0, 0);
				if (!this.checkAction('selectWorker')) return;
				if (!["playerTurn", "client_selectWorkerLocation", "client_selectWorkerRotate"].includes(this.gamedatas.gamestate.name))
					return;
				var tile_id = event.currentTarget.id;
				if (this.clientStateArgs.place_id == null) {
					// First selection
					if (this.clientStateArgs.worker_id != null) {
						// Previous clicked tile
						dojo.removeClass(this.clientStateArgs.worker_id, "selected");
					}
					dojo.addClass(tile_id, "selected");
					this.clientStateArgs.worker_id = tile_id;
					this.setClientState("client_selectWorkerLocation", {
						descriptionmyturn: _('${you} must select a place for the tile'),
					});
					this.unlockInterface('selectWorker');
				} else {
					// Tile already on board : switch tiles
					var tile_id_to_switch = this.clientStateArgs.worker_id;
					// New tile to place...
					this.clientStateArgs.worker_id = tile_id;
					dojo.addClass(tile_id, "selected");
					this.attachToNewParent(tile_id, this.scrollmap.animation_div, null, true);
					var anim = this.slideToPos(tile_id, this.clientStateArgs.place_id, this.anim_duration);
					dojo.connect(anim, 'onEnd', dojo.hitch(this, function () {
						dojo.place(tile_id, "tiles_container");
					}));
					anim.play();
					// ... and previous tile back in the hand
					this.placeBackWorker(tile_id_to_switch, ()=> {this.showRotateLink(tile_id);	this.unlockInterface('selectWorker'); });
				}
			},

			/*
				Choose a place on the board for the worker tile
			*/
			onSelectWorkerPlace: function (event) {
				if (!this.checkAction('placeWorker')) return;
				this.lockInterface('placeWorker');
				var place_id = event.currentTarget.id;
				dojo.stopEvent(event);
				this.clientStateArgs.place_id = place_id;
				var tile_id = this.clientStateArgs.worker_id;
				this.attachToNewParent(tile_id, this.scrollmap.animation_div, null, true);
				var animation_id = this.slideToPos(tile_id, place_id, this.anim_duration);
				dojo.connect(animation_id, 'onEnd', dojo.hitch(this, function () {
					// console.log(tile_id);
					dojo.place(tile_id, "tiles_container");
					if (this.gamedatas.gamestate.name != "client_selectWorkerRotate") {
						// A worker tile is placed on the board for the first time in this player tour
						this.setClientState("client_selectWorkerRotate", {
							description: _('${actplayer} can move and/or rotate his tile'),
							descriptionmyturn: _('${you} can move (click on another place) and/or rotate (click on it) your tile')+'. '+_('${you} can switch with another tile (click on another tile)'),
						});
					} else {
						// A worker tile is moved to another place (connect broken for rotate_click ! (?) )
						dojo.connect($('rotate_click'), "onclick", this, "onRotateCurrent");
					}
					this.unlockInterface('placeWorker');
				}));
				animation_id.play();
			},

			/*
				Click on the worker tile to rotate it
			*/
			onRotateCurrent: function (event) {
				if (!this.checkAction('rotateWorker')) return;
				dojo.stopEvent(event);
				var tile_id = this.clientStateArgs.worker_id;
				var rotation = toint(this.clientStateArgs.rotation) + 1;
				if (rotation == 5) rotation = 1;
				this.rotateTo(tile_id, rotation * 90 - 90);
				this.clientStateArgs.rotation = rotation;
			},

			/*
				Confirm the rotation for this worker tile
			*/
			onConfirmWorker: function () {
				dojo.destroy("rotate_click");
				var tile_id = this.clientStateArgs.worker_id;
				var tile_rotation = this.clientStateArgs.rotation;
				var position = this.clientStateArgs.place_id.substring(6);
				var coord = position.split("x");
				this.ajaxcall(
					"/cacao/cacao/confirmWorker.html",
					{
						worker_id: tile_id,
						x: coord[0],
						y: coord[1],
						rotation: tile_rotation,
						lock: true
					},
					this,
					function (result) { },
					function (result) { }
				);
			},

			/*
				Select a jungle tile in the display
			*/
			onJungleTile: function (event) {
				if (!this.checkAction('selectJungle')) return;
				if (!["playerJungle", "client_selectJungleLocation"].includes(this.gamedatas.gamestate.name))
					return;
				var id = event.currentTarget.id;
				dojo.stopEvent(event);
				if (this.clientStateArgs.jungle_id != null) {
					// Previous clicked tile
					dojo.removeClass(this.clientStateArgs.jungle_id, "selected");
				}
				this.clientStateArgs.jungle_id = id;
				dojo.addClass(id, "selected");
				this.setClientState("client_selectJungleLocation", {
					descriptionmyturn: _('${you} must select a place for the jungle tile'),
				});
			},

			/*
				Select a place for the jungle tile
			*/
			onSelectJunglePlace: function (event) {
				if (!this.checkAction('placeJungle')) return;
				this.stopActionTimer();
				$("jungle_display").querySelectorAll(".jungle").forEach((elt)=>elt.onclick=null);
				this.clientStateArgs.place_jungle_id = event.currentTarget.id;
				dojo.stopEvent(event);
				var tile_id = this.clientStateArgs.jungle_id;
				var position = this.clientStateArgs.place_jungle_id.substring(6);
				var coord = position.split("x");
				var pos = this.calcPos(coord[0], coord[1]);
				var anim = this.getMoveJungleToPlaceAnim(tile_id, pos);
				anim.play();
				this.setClientState("client_confirmJungleLocation");
				// setTimeout(this.placeTile.bind(this), this.anim_duration + 500, tile_id, pos);
			},

			/*
				Confirm the place for the jungle tile
			*/
			onConfirmJunglePlace: function (event) {
				if (!this.checkAction('placeJungle')) return;
				this.stopActionTimer();
				dojo.stopEvent(event);
				var jungle_id = this.clientStateArgs.jungle_id;
				var position = this.clientStateArgs.place_jungle_id.substring(6);
				var coord = position.split("x");
				if (this.last_server_state.name == "playerJungle"){
					this.ajaxcall(
						"/cacao/cacao/junglePlaced.html",
						{
							jungle_id: jungle_id,
							jungle_type: dojo.attr(jungle_id, "tile"),
							card_id: dojo.attr(jungle_id, "card-id"),
							x: coord[0],
							y: coord[1],
							cnt_places: dojo.query("#places_container .place").length,
							lock: true
						},
						this,
						function (result) { },
						function (result) { }
					);
				} else {
					var worker_id = this.clientStateArgs.worker_id;
					var worker_rotation = this.clientStateArgs.rotation;
					var worker_position = this.clientStateArgs.place_id.substring(6);
					var worker_coord = worker_position.split("x");
					this.ajaxcall(
						"/cacao/cacao/workerAndJunglePlaced.html",
						{
							worker_id: worker_id,
							x: worker_coord[0],
							y: worker_coord[1],
							rotation: worker_rotation,
							jungle_id: jungle_id,
							jungle_type: dojo.attr(jungle_id, "tile"),
							card_id: dojo.attr(jungle_id, "card-id"),
							jungle_x: coord[0],
							jungle_y: coord[1],
							cnt_places: dojo.query("#places_container .place").length,
							lock: true
						},
						this,
						function (result) { },
						function (result) { }
					);
				}

			},

			/*
				Confirm the place for the jungle tile
			*/
			onRestart: function (event) {
				this.stopActionTimer();
				if (this.last_server_state.name != "playerJungle"){
					this.placeBackWorker(this.clientStateArgs.worker_id);
					dojo.removeClass(this.clientStateArgs.worker_id, "selected");
				}
				$("jungle_display").querySelectorAll(".jungle").forEach((elt)=>elt.onclick=null);
				dojo.removeClass("jungle_display", "active");
				if (this.clientStateArgs.jungle_id){
					this.jungles_display.placeInZone(this.clientStateArgs.jungle_id);
					dojo.removeClass(this.clientStateArgs.jungle_id, "selected");
				}
				dojo.query("#places_container .place").forEach(dojo.destroy);
				this.restoreServerGameState();
			},
			/*
				A link on jungle activated tile is clicked : execute the action (occurs) times
			*/
			onActivatedTile: function (event) {
				var link_id = event.currentTarget.id;
				dojo.stopEvent(event);
				this.ajaxcall(
					"/cacao/cacao/carryOutAction.html",
					{
						action_id: dojo.attr(link_id, "action-id"),
						occurs: dojo.attr(link_id, "activate"),
						lock: true
					},
					this,
					function (result) { },
					function (result) { }
				);
			},

			/*
				Complete actions, maybe without resolve all
			*/
			onCompleteActions: function (event) {
				this.confirmationDialog(_("Are you sure you don't want to activate remaining workers?"), () => {
					this.ajaxcall(
						"/cacao/cacao/actionsCompleted.html",
						{ lock: true },
						this,
						function (result) { },
						function (result) { }
					);
				});
			},

			/*
				Show sereral areas to activate 1, 2 or 3 workers
			*/
			onNotActivateAllWorkers: function (event) {
				dojo.query(".action").addClass("workers_choice");
				dojo.query("#choice_workers").addClass("disabled");
			},


			///////////////////////////////////////////////////
			//// Reaction to cometD notifications

			setupNotifications: function () {
				dojo.subscribe('workerPlaced', this, "notif_workerPlaced");
				this.notifqueue.setSynchronous('workerPlaced', this.anim_duration+ 100);
				dojo.subscribe('newPlayerScores', this, "notif_newPlayerScores");
				dojo.subscribe('jungleAdded', this, "notif_jungleAdded");
				this.notifqueue.setSynchronous('jungleAdded', 2*this.anim_duration+ 100);
				dojo.subscribe('zombieJungle', this, "notif_zombieJungle");
				dojo.subscribe('displayNewJungle', this, "notif_displayNewJungle");
				dojo.subscribe('junglePlaces', this, "notif_junglePlaces");
				dojo.subscribe('getNewWorker', this, "notif_getNewWorker");
				dojo.subscribe('addWorkerInPlayerHand', this, "notif_addWorkerInPlayerHand");
				this.notifqueue.setSynchronous('playerTurnWait', 1000);
				dojo.subscribe('playerCarryOutAction', this, "notif_playerCarryOutAction");
				dojo.subscribe('playerForgo', this, "notif_playerForgo");
				dojo.subscribe('jungleEnd', this, "notif_jungleEnd");
				dojo.subscribe('endOfTheGame', this, "notif_endOfTheGame");
				this.notifqueue.setSynchronous('endOfTheGame', 2000);
				dojo.subscribe('scoreWater', this, "notif_scoreWater");
				this.notifqueue.setSynchronous('scoreWater', 2000);
				dojo.subscribe('scoreSun', this, "notif_scoreSun");
				this.notifqueue.setSynchronous('scoreSun', 2000);
				dojo.subscribe('scoreTemples', this, "notif_scoreTemple");
				this.notifqueue.setSynchronous('scoreTemples', 2000);
				dojo.subscribe('finalStats', this, "notif_finalStats");
				this.notifqueue.setSynchronous('finalStats', 2000);
			},

			notif_workerPlaced: function (notif) {
				dojo.query(".last").removeClass("last");
				dojo.query(".place").forEach(dojo.destroy);
				dojo.query(".hand-tiles").removeClass("active");
				var tile_id = notif.args.tile_type + "_" + notif.args.card_id;
				var pos = this.calcPos(notif.args.tile_x , notif.args.tile_y);
				if (notif.args.overbuild == "1") {
					pos.x -= 2;
					pos.y -= 2;
				}
				if ((notif.args.player_id != this.player_id) || this.isReplay()){
					if (notif.args.player_id != this.player_id) {
						// Show worker tile with movement from the player zone
						dojo.query("#hand_tiles_" + notif.args.player_id + " .tile-back:last-child").forEach(dojo.destroy);
						dojo.place(
							this.format_block(
								"jstpl_worker",
								{
									'type': notif.args.tile_type,
									'id': tile_id,
									'card_id': notif.args.card_id,
									'color': this.getColorClass(notif.args.color),
									'rotation': notif.args.tile_rotation
								}
							),
							"player_board_" + notif.args.player_id);
					}
					this.attachToNewParent(tile_id, this.scrollmap.animation_div, null, true);
					var anim = this.slideToPos(tile_id, pos, this.anim_duration);
					dojo.connect(anim, 'onEnd', dojo.hitch(this, function () {
						dojo.place(tile_id, this.scrollmap.scrollable_div);
					}));
					anim.play();
					this.centerBoardOnTile( notif.args.tile_x , notif.args.tile_y );
				} else {
					this.placeTile(tile_id, pos);
				}
				dojo.addClass(tile_id, "last");
				if (notif.args.overbuild == "1") {
					dojo.addClass(tile_id, "overbuild");
				}
				// Update sun tokens : maybe one is spent to overbuild
				dojo.place('<div class="value-' + notif.args.sun + '"></div>', "counter_sun_" + notif.args.player_id, "only");
			},

			notif_junglePlaces: function (notif) {
				if (this.gamedatas.gamestate.name != "client_selectWorkerRotate") 
					return;
				dojo.query(".place").forEach(dojo.destroy);
				// dojo.query("#places_container .place").forEach(dojo.destroy);
				this.showJunglePlaces(notif.args.junglePlaces);
				this.setClientState("client_selectJungleLocation", {
					descriptionmyturn: _('${you} must fill a jungle space'),
				});
			},

			notif_newPlayerScores: function (notif) {
				var active_player_id = notif.args.player_id;
				this.showPlayerScore(active_player_id, notif.args.gold, notif.args.cacao, notif.args.sun, notif.args.water);
				var delay = 0;
				for (var i in notif.args.movements) {
					var movement = notif.args.movements[i];
					this.moveMaterial(movement.player_id, movement.card_id, movement.material, movement.direction, delay);
					delay += 250;
				}
			},

			notif_jungleAdded: function (notif) {
				var {tile_id, tile_x, tile_y} = notif.args;
				const pos = this.calcPos(tile_x, tile_y);
				var {tile_2_id, tile_2_x= 0, tile_2_y = 0} = notif.args;
				const pos2 = this.calcPos(tile_2_x, tile_2_y);
				dojo.removeClass(tile_id, "selected");
				dojo.removeClass("jungle_display", "active");
				dojo.query("#places_container .place").forEach(dojo.destroy);
				const placeTileBind = this.placeTile.bind(this);
				var anim_tile2 = () => {
					var anim2 = this.getMoveJungleToPlaceAnim(tile_2_id, pos2);
					anim2.play();
					// Sometimes the tile is misplaced
					setTimeout(placeTileBind,  this.instantaneousMode ? 10 : this.anim_duration + 500, tile_2_id, pos2);
				};
				if ((notif.args.player_id != this.player_id) || this.isReplay()){
					var anim = this.getMoveJungleToPlaceAnim(tile_id, pos);
					if (tile_2_id != null) 
						dojo.connect(anim, 'onEnd', dojo.hitch(this, function () {
							anim_tile2();
						}));
					anim.play();
					// Sometimes the tile is misplaced
					setTimeout(placeTileBind, this.instantaneousMode ? 10 : this.anim_duration + 500, tile_id, pos);
				} else {					
					this.placeTile(tile_id, pos);
					if (notif.args.tile_2_id != null) {
						anim_tile2();
					}
				}
			},

			notif_zombieJungle: function (notif) {
				// console.log("notif_zombieJungle");
			},

			notif_displayNewJungle: function (notif) {
				this.fillJungleDisplay(notif.args.type, notif.args.id, notif.args.description, notif.args.cnt_deck_jungles);
			},

			notif_getNewWorker: function (notif) {
				this.addWorkerInTheHand(this.player_id, notif.args.color, notif.args.type, notif.args.card_id, notif.args.counterDeck);
			},

			notif_addWorkerInPlayerHand: function (notif) {
				if (notif.args.player_id != this.player_id) {
					dojo.place('<div class="tile-back back-' + this.getColorClass(notif.args.color) + '"></div>', $("hand_tiles_" + notif.args.player_id));
					dojo.place("<span>" + notif.args.counterDeck + "</span>", "counter_tiles_" + notif.args.player_id, "only");
				}
			},

			notif_playerCarryOutAction: function (notif) {
				if (notif.args.place_id != null) {
					var action_id = "action_" + notif.args.place_id;
					dojo.destroy(action_id);
				}
			},

			notif_playerForgo: function (notif) {
				if (notif.args.player_id == this.player_id) {
					dojo.query("#places_container .action").forEach(dojo.destroy);
				}
			},

			notif_jungleEnd: function (notif) {
				dojo.addClass("jungle_display", "empty");
			},

			notif_endOfTheGame: function (notif) {
				dojo.query(".last").removeClass("last");
			},

			notif_scoreWater: function (notif) {
				this.scoreCtrl[notif.args.player_id].toValue(notif.args.gold);
			},

			notif_scoreSun: function (notif) {
				this.scoreCtrl[notif.args.player_id].toValue(notif.args.gold);
			},

			notif_scoreTemple: function (notif) {
				var jungleTileId = "jungle_" + notif.args.card_id;
				dojo.removeClass(jungleTileId, "tile_jungle");
				dojo.addClass(jungleTileId, "tile_back");
				dojo.place("<span>" + notif.args.temple_nr + "</span>", jungleTileId, "only");
				this.scoreCtrl[notif.args.player_id].incValue(notif.args.gold);
				var delay = 0;
				for (var i in notif.args.movements) {
					var movement = notif.args.movements[i];
					this.moveMaterial(movement.player_id, movement.card_id, movement.material, movement.direction, delay);
					delay += 250;
				}
			},

			notif_finalStats: function (notif) {
				this.dialogStats = new ebg.popindialog();
				this.dialogStats.create('dialogStats');
				this.dialogStats.setTitle(_("Statistics"));
				this.dialogStats.setContent(notif.args.html);
				$('popin_dialogStats_contents').querySelectorAll("th").forEach((node) => {
					node.innerHTML = _(node.innerHTML);
				});
				$('popin_dialogStats_contents').querySelectorAll("td").forEach((node) => {
					let matches = node.innerHTML.match(/(\d+) days/);
					if ((matches!=null) && (matches[0]!="")){
						node.innerHTML = dojo.string.substitute( _("${d} days"), {
							d: matches[1]
						} );
					}
				});
				this.dialogStats.show();
			},
		});
	});
