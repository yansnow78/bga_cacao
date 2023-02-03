{OVERALL_GAME_HEADER}

<div id="map_container" class="scrollmap_container">
</div>

<div id="map_footer" class="whiteblock">
	<a href="#" id="enlargedisplay">↓  {LABEL_ENLARGE_DISPLAY}  ↓</a>
</div>

<script type="text/javascript">

var jstpl_jungle = '<div id="${id}" class="tile jungle tile_${type}" tile="${type}" card-id="${card_id}"></div>';
var jstpl_jungle_xy = '<div id="${id}" class="tile jungle tile_${type}" tile="${type}" card-id="${card_id}" style="top:${top}px;left:${left}px;"></div>';
var jstpl_worker = '<div id="${id}" class="tile worker tile_${type} color_${color} rotation_${rotation}" tile="${type}" card-id="${card_id}"></div>';
var jstpl_worker_xy = '<div id="${id}" class="tile worker tile_${type} color_${color} rotation_${rotation}" tile="${type}" card-id="${card_id}" style="top:${top}px;left:${left}px;"></div>';
var jstpl_place = '<div id="place_${x}x${y}" class="place" style="top:${top}px;left:${left}px;"></div>';
var jstpl_action = '<div id="action_${action_id}" workers="${workers}" class="action edge-${edge} workers-${workers}" style="top:${top}px;left:${left}px;"></div>';
var jstpl_action_link = '<a id="action_${link_id}" class="action_link activate-${occurs}" action-id="${action_id}" activate="${occurs}">${occurs}x</a>';

var jstpl_material = '<div class="moving moving-${material}"></div>';

var jstpl_player_board = '\
	<div id="counters_${playerId}" class="player-counters">\
		<div class="counter_cacao_sun">\
			<div id="counter_cacao_${playerId}" class="counter-cacao"><div class="value-0"></div></div>\
			<div id="counter_sun_${playerId}" class="counter-sun"></div>\
		</div>\
    	<div id="counter_water_${playerId}" class="counter-water"><div class="value-0"></div></div>\
	</div>\
	<div id="display_tiles_${playerId}" class="hand-player">\
		<div id="hand_tiles_${playerId}" class="hand-tiles"></div>\
		<div id="counter_tiles_${playerId}" class="pile-tiles pile-${color}"></div>\
	</div>';

var jstpl_map_onsurface = `
	<div id="places_container"></div>
	<div id="tiles_container"></div>`;
var jstpl_map_clipped =`
	<div id="jungle_display" class="scrollmap-zoomed" style="transform-origin: 0px 0px;">
		<div id="counter_jungles" class="pile-tiles pile-g"></div>
	</div>`
</script>  

{OVERALL_GAME_FOOTER}
