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
define([
	"dojo", "dojo/_base/declare", 
	'./modules/js/scrollmapWithZoom',
	'./modules/js/core_patch',
	"ebg/core/gamegui",
	"ebg/counter",
	"ebg/zone",
],
	function (dojo, declare) {
		return declare("bgagame.cacao", [ebg.core.gamegui, ebg.core.core_patch] , {
			constructor: function () {
				this.anim_duration = 1000;
				this.tile_size = 120;
				this.action_shift = 20;

				this.jungles_display = new ebg.zone();
				this.scrollmap = new ebg.scrollmapWithZoom(); // Scrollable area
				this.scrollmap.zoom = 0.8;
				this.clientStateArgs = {}; // Data during one state
				//this.default_viewport = "width=740px";//this.interface_min_width; //width=device-width, initial-scale=1.0
				this.setViewPort();
			},

			setup: function (gamedatas) {
				// Set mobile viewport for portrait orientation based on gameinfos.inc.php
				//this.default_viewport = this.interface_min_width; /*"width=740px" +  */
				this.onScreenWidthChange();
				
				/*
					Create scrollmap
				*/
				this.scrollmap.zoomChangeHandler = this.handleMapZoomChange.bind(this);
				this.scrollmap.create($('map_container'), $('map_scrollable'), $('map_surface'),$('map_scrollable_oversurface'), $('map_scrollable_anim'));
				/*
					Make map draggable, scrollable and zoomable
				*/
				this.scrollmap.bEnableZooming = true;
				this.scrollmap.setupOnScreenArrows(this.tile_size);
				this.scrollmap.setupOnScreenZoomButtons(0.2);
				dojo.connect($('enlargedisplay'), 'onclick', this, 'onIncreaseDisplayHeight');
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
				}
				this.scrollmap.scrollToCenter();

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

			},

			setViewPort : function () {
				var agent = navigator.userAgent.toLowerCase();
				if ((agent.indexOf('firefox') >= 0) || (agent.indexOf("fxios") >= 0)){
					this.interface_min_width=500;
					if (screen.width < this.interface_min_width) {
						var viewport = document.getElementsByName("viewport")[0];
						viewport.setAttribute("content", "width="+this.interface_min_width+"");
					}
					// // viewport.setAttribute("content", "width=740");//+this.interface_min_width+
					// if (viewport === null) {
					// 	//$('head').append('<meta name="viewport" content="740"/>');
					// 	viewport=document.createElement('meta');
					// 	viewport.id = "vp";
					// 	viewport.name = "viewport";
					// 	viewport.setAttribute("content", "width=740");
					// 	document.getElementsByTagName('head')[0].appendChild(viewport);
					// 	console.log("add viewport");
					// } else {
					// 	viewport.setAttribute("content", "width=740");//+this.interface_min_width+
					// 	console.log("set viewport");
					// }
				}
			},
			
			onScreenWidthChange: function () {
				this.setViewPort();
				// Remove broken "zoom" property added by BGA framework
				// this.gameinterface_zoomFactor = 1;
				// $("page-content").style.removeProperty("zoom");
				// $("page-content").style.setProperty("transform","scale("+this.gameinterface_zoomFactor+")");
				// $("page-title").style.removeProperty("zoom");
				// $("right-side-first-part").style.removeProperty("zoom");
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
							this.clientStateArgs.placesConnected = null;
							this.updatePlacesForTiles(args.args.junglePlaces);
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
							this.addActionButton("complete_actions", _("Finish"), "onCompleteActions");
							this.addActionButton("choice_workers", _("Don't activate all workers"), "onNotActivateAllWorkers", null, false, "gray");
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
				this.addTooltip(tile_id, description, '');
				dojo.place("<span>" + cnt_deck_jungles + "</span>", 'counter_jungles', "only");
			},

			/*
				Center the board on a tile
				TODO : bad position when zoom out
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
						// material_parent = "counters_" + player_id;
						to_zone = $("player_score_" + player_id);
						material_parent = to_zone.parentNode;
					} else {
						material_parent = "counter_" + material + "_" + player_id;
						to_zone = material_parent;
					}
					from_zone = "jungle_" + card_id;
					console.log(material_parent, from_zone, to_zone);
				} else {
					material_parent = "map_scrollable_anim";
					if (material == "gold")
						from_zone = "player_score_" + player_id;
					else
						from_zone = "counter_" + material + "_" + player_id;
					to_zone = "jungle_" + card_id;
					console.log(material_parent, from_zone, to_zone);
				}
				//this.setScale("map_scrollable", 1);
				this.slideTemporaryObject(
					this.format_block("jstpl_material", { 'material': material }),
					material_parent,
					from_zone,
					to_zone,
					this.anim_duration,
					delay
				);
				//this.setScale("map_scrollable", this.scrollmap.zoom);
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
						"map_scrollable");
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
						"map_scrollable");
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

			/*
				Scrollmap zone extension
			*/
			onIncreaseDisplayHeight: function (evt) {
				evt.preventDefault();
				var cur_h = toint(dojo.style($('map_container'), 'height'));
				this.scrollmap.board_y -= 150;
				dojo.style($('map_container'), 'height', (cur_h + 300) + 'px');
			},
			/*
				Scrollmap zoom
			*/
			handleMapZoomChange: function (zoom) {
				this.setScale('jungle_display', zoom);
			},

			setScale: function (elemId, scale) {
				dojo.style($(elemId), 'transform', 'scale(' + scale + ')');
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
				} else {
					// Tile already on board : switch tiles
					var tile_id_to_switch = this.clientStateArgs.worker_id;
					// New tile to place...
					this.clientStateArgs.worker_id = tile_id;
					dojo.addClass(tile_id, "selected");
					//this.setScale("map_scrollable_oversurface", 1);
					this.attachToNewParent(tile_id, "map_scrollable_anim");
					var anim = this.slideToObject(tile_id, this.clientStateArgs.place_id, this.anim_duration);
					dojo.connect(anim, 'onEnd', dojo.hitch(this, function () {
						dojo.place(tile_id, "tiles_container");
					}));
					anim.play();
					// ... and previous tile back in the hand
					var hand_tiles = "hand_tiles_" + this.player_id;
					this.attachToNewParent(tile_id_to_switch, hand_tiles);
					dojo.removeClass(tile_id_to_switch, "selected");
					this.rotateTo(tile_id_to_switch, 0);
					dojo.destroy("rotate_click");
					var animation_id = this.slideToObject(tile_id_to_switch, hand_tiles, this.anim_duration);
					dojo.connect(animation_id, 'onEnd', dojo.hitch(this, function () {
						dojo.style(tile_id_to_switch, 'top', 'auto');
						dojo.style(tile_id_to_switch, 'left', 'auto');
						dojo.style(tile_id_to_switch, 'transform', 'rotate(0deg)');
						this.showRotateLink(tile_id);
						dojo.connect($(tile_id_to_switch), "onclick", this, "onWorkerTile");
					}));
					animation_id.play();
					//this.setScale("map_scrollable_oversurface", this.scrollmap.zoom);
				}
			},

			/*
				Choose a place on the board for the worker tile
			*/
			onSelectWorkerPlace: function (event) {
				if (!this.checkAction('placeWorker')) return;
				var place_id = event.currentTarget.id;
				dojo.stopEvent(event);
				this.clientStateArgs.place_id = place_id;
				var tile_id = this.clientStateArgs.worker_id;
				//this.setScale("map_scrollable_oversurface", 1);
				this.attachToNewParent(tile_id, "map_scrollable_anim");
				var animation_id = this.slideToObject(tile_id, place_id, this.anim_duration);
				dojo.connect(animation_id, 'onEnd', dojo.hitch(this, function () {
					console.log(tile_id);
					dojo.place(tile_id, "tiles_container");
					if (this.gamedatas.gamestate.name != "client_selectWorkerRotate") {
						// A worker tile is placed on the board for the first time in this player tour
						this.setClientState("client_selectWorkerRotate", {
							description: _('${actplayer} can move and/or rotate his tile'),
							descriptionmyturn: _('${you} can move (click on another place) and/or rotate (click on it) your tile'),
						});
					} else {
						// A worker tile is moved to another place (connect broken for rotate_click ! (?) )
						dojo.connect($('rotate_click'), "onclick", this, "onRotateCurrent");
					}
				}));
				animation_id.play();
				//this.setScale("map_scrollable_oversurface", this.scrollmap.zoom);
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
				var place_id = event.currentTarget.id;
				dojo.stopEvent(event);
				var tile_id = this.clientStateArgs.jungle_id;
				var position = place_id.substring(6);
				var coord = position.split("x");
				this.ajaxcall(
					"/cacao/cacao/junglePlaced.html",
					{
						jungle_id: tile_id,
						jungle_type: dojo.attr(tile_id, "tile"),
						card_id: dojo.attr(tile_id, "card-id"),
						x: coord[0],
						y: coord[1],
						cnt_places: dojo.query("#places_container .place").length,
						lock: true
					},
					this,
					function (result) { },
					function (result) { }
				);
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
				dojo.subscribe('newPlayerScores', this, "notif_newPlayerScores");
				dojo.subscribe('jungleAdded', this, "notif_jungleAdded");
				this.notifqueue.setSynchronous('jungleAdded', 1100);
				dojo.subscribe('zombieJungle', this, "notif_zombieJungle");
				dojo.subscribe('displayNewJungle', this, "notif_displayNewJungle");
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
				var to_left = this.tile_size * notif.args.tile_x;
				var to_top = this.tile_size * notif.args.tile_y;
				if (notif.args.overbuild == "1") {
					to_left -= 2;
					to_top -= 2;
				}
				if (notif.args.player_id == this.player_id) {
					// Destroy and recreate the tile in map_scrollable : necessary for the replay
					dojo.destroy(tile_id);
					dojo.place(
						this.format_block(
							"jstpl_worker_xy",
							{
								'type': notif.args.tile_type,
								'id': tile_id,
								'card_id': notif.args.card_id,
								'color': this.getColorClass(notif.args.color),
								'rotation': notif.args.tile_rotation,
								'top': to_top,
								'left': to_left
							}
						),
						"map_scrollable"
					);
				} else {
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
					//this.setScale("map_scrollable", 1); // Avoid misplacement error
					this.attachToNewParent(tile_id, "map_scrollable_anim");
					var anim = this.slideToObjectPos(tile_id, "map_scrollable_anim", to_left, to_top, this.anim_duration);
					dojo.connect(anim, 'onEnd', dojo.hitch(this, function () {
						dojo.place(tile_id, "map_scrollable");
					}));
					anim.play();
					//this.setScale("map_scrollable", this.scrollmap.zoom);
					// this.centerBoardOnTile( notif.args.tile_x , notif.args.tile_y ); TODO
				}
				dojo.addClass(tile_id, "last");
				if (notif.args.overbuild == "1") {
					dojo.addClass(tile_id, "overbuild");
				}
				// Update sun tokens : maybe one is spent to overbuild
				dojo.place('<div class="value-' + notif.args.sun + '"></div>', "counter_sun_" + notif.args.player_id, "only");
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

			notif_jungleAdded: function (notifJungleAdded) {
				dojo.removeClass(notifJungleAdded.args.tile_id, "selected");
				dojo.removeClass("jungle_display", "active");
				var first_tile_id = notifJungleAdded.args.tile_id;
				var first_to_left = this.tile_size * notifJungleAdded.args.tile_x;
				var first_to_top = this.tile_size * notifJungleAdded.args.tile_y;
				//this.setScale("map_scrollable", 1);
				this.attachToNewParent(first_tile_id, "map_scrollable_anim");
				this.jungles_display.removeFromZone(first_tile_id, false, null);
				var animation_id = this.slideToObjectPos(first_tile_id, "map_scrollable_anim", first_to_left, first_to_top, this.anim_duration);
				dojo.connect(animation_id, 'onEnd', dojo.hitch(this, function () {
					dojo.place(first_tile_id, "map_scrollable");
					dojo.removeClass(first_tile_id, "selected");
					dojo.query("#places_container .place").forEach(dojo.destroy);
					if (notifJungleAdded.args.tile_2_id != null) {
						// Second jungle tile automatically placed
						var second_tile_id = notifJungleAdded.args.tile_2_id;
						var second_to_left = this.tile_size * notifJungleAdded.args.tile_2_x;
						var second_to_top = this.tile_size * notifJungleAdded.args.tile_2_y;
						//this.setScale("map_scrollable", 1);
						this.attachToNewParent(second_tile_id, "map_scrollable_anim");
						this.jungles_display.removeFromZone(second_tile_id, false, null);
						var anim2 = this.slideToObjectPos(second_tile_id, "map_scrollable_anim", second_to_left, second_to_top, this.anim_duration).play();
						dojo.connect(anim2, 'onEnd', dojo.hitch(this, function () {
							dojo.place(second_tile_id, "map_scrollable");
						}));
						anim2.play();
						//this.setScale("map_scrollable", this.scrollmap.zoom);
						// Sometimes the tile is misplaced
						setTimeout(function (second_tile_id, second_to_left, second_to_top) {
							dojo.attr(second_tile_id, 'style', "left: " + second_to_left + "px; top: " + second_to_top + "px;");
						}, this.anim_duration+500, second_tile_id, second_to_left, second_to_top);
					}
				}));
				animation_id.play();
				//this.setScale("map_scrollable", this.scrollmap.zoom);
				// Sometimes the tile is misplaced
				setTimeout(function (first_tile_id, first_to_left, first_to_top) {
					dojo.attr(first_tile_id, 'style', "left: " + first_to_left + "px; top: " + first_to_top + "px;");
				}, this.anim_duration+500, first_tile_id, first_to_left, first_to_top);
			},

			notif_zombieJungle: function (notif) {
				console.log("notif_zombieJungle");
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
				this.dialogStats.show();
			},
		});
	});
