<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Cacao implementation : © Paul Barbieux <paul.barbieux@gmail.com>
 * 
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * material.inc.php
 *
 * Cacao game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */

/*
	Tiles for jungle.
	Quantity depending on number of players.
	auto = true (gain is automatic) or false (player decision)
*/
$this->jungle_tiles = array(
	'plantation_1' =>	array( 4 => 6, 3 => 6, 2 => 4 , 'gain'=>"cacao" , 	'value'=>1 , 'auto'=>false , 
		'description'=>clienttranslate("Single plantation : get 1 cacao fruit for each activated worker.") ),
	'plantation_2' =>	array( 4 => 2, 3 => 2, 2 => 2 , 'gain'=>"cacao" , 	'value'=>2 , 'auto'=>false , 
		'description'=>clienttranslate("Double plantation : get 2 cacao fruits for each activated worker.") ),
	'market_2' =>		array( 4 => 2, 3 => 2, 2 => 2 , 'gain'=>"sale" , 	'value'=>2 , 'auto'=>false , 
		'description'=>clienttranslate("Market : for each activated worker, sell 1 cacao fruit for 2 gold.") ),
	'market_3' =>  		array( 4 => 4, 3 => 4, 2 => 3 , 'gain'=>"sale" , 	'value'=>3 , 'auto'=>false , 
		'description'=>clienttranslate("Market : for each activated worker, sell 1 cacao fruit for 3 gold.") ),
	'market_4' => 		array( 4 => 1, 3 => 1, 2 => 1 , 'gain'=>"sale" , 	'value'=>4 , 'auto'=>false , 
		'description'=>clienttranslate("Market : for each activated worker, sell 1 cacao fruit for 4 gold.") ),
	'temples' => 		array( 4 => 5, 3 => 5, 2 => 4 , 'gain'=>"temple" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Temple : at the end of the game, the player who has the most adjacent workers receives 6 gold, the second receives 3 gold.") ),
	'mine_1' => 		array( 4 => 2, 3 => 2, 2 => 1 , 'gain'=>"mine" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Gold mine : get 1 gold for each activated worker.") ),
	'mine_2' => 		array( 4 => 1, 3 => 1, 2 => 1 , 'gain'=>"mine" , 	'value'=>2 , 'auto'=>true , 
		'description'=>clienttranslate("Gold mine : get 2 gold for each activated worker.") ),
	'sun' => 			array( 4 => 2, 3 => 2, 2 => 1 , 'gain'=>"sun" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Sun-worshiping site : get 1 sun token for each activated worker. Towards the end of the game, you can use its to “overbuild” your worker tiles.") ),
	'source' => 		array( 4 => 3, 3 => 3, 2 => 2 , 'gain'=>"water" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Water : for each activated worker, move 1 water field ahead.") ),
);

// Small deck for test
/*
$this->jungle_tiles = array(
	'plantation_1' =>	array( 4 => 6, 3 => 6, 2 => 2 , 'gain'=>"cacao" , 	'value'=>1 , 'auto'=>false , 
		'description'=>clienttranslate("Single plantation : get 1 cacao fruit for each activated worker.") ),
	'plantation_2' =>	array( 4 => 2, 3 => 2, 2 => 1 , 'gain'=>"cacao" , 	'value'=>2 , 'auto'=>false , 
		'description'=>clienttranslate("Double plantation : get 2 cacao fruits for each activated worker.") ),
	'market_2' =>		array( 4 => 2, 3 => 2, 2 => 1 , 'gain'=>"sale" , 	'value'=>2 , 'auto'=>false , 
		'description'=>clienttranslate("Market : for each activated worker, sell 1 cacao fruit for 2 gold.") ),
	'market_3' =>  		array( 4 => 4, 3 => 4, 2 => 1 , 'gain'=>"sale" , 	'value'=>3 , 'auto'=>false , 
		'description'=>clienttranslate("Market : for each activated worker, sell 1 cacao fruit for 3 gold.") ),
	'market_4' => 		array( 4 => 1, 3 => 1, 2 => 0 , 'gain'=>"sale" , 	'value'=>4 , 'auto'=>false , 
		'description'=>clienttranslate("Market : for each activated worker, sell 1 cacao fruit for 4 gold.") ),
	'temples' => 		array( 4 => 5, 3 => 5, 2 => 1 , 'gain'=>"temple" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Temple : at the end of the game, the player who has the most adjacent workers receives 6 gold, the second receives 3 gold.") ),
	'mine_1' => 		array( 4 => 2, 3 => 2, 2 => 1 , 'gain'=>"mine" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Gold mine : get 1 gold for each activated worker.") ),
	'mine_2' => 		array( 4 => 1, 3 => 1, 2 => 0 , 'gain'=>"mine" , 	'value'=>2 , 'auto'=>true , 
		'description'=>clienttranslate("Gold mine : get 2 gold for each activated worker.") ),
	'sun' => 			array( 4 => 2, 3 => 2, 2 => 1 , 'gain'=>"sun" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Sun-worshiping site : get 1 sun token for each activated worker. Towards the end of the game, you can use its to “overbuild” your worker tiles.") ),
	'source' => 		array( 4 => 3, 3 => 3, 2 => 1 , 'gain'=>"water" , 	'value'=>1 , 'auto'=>true , 
		'description'=>clienttranslate("Water : for each activated worker, move 1 water field ahead.") ),
);
*/
/*
	Tiles of workers. Quantity depending on number of players
*/
$this->worker_tiles = array(
	'worker_1111' => array( 4 => 3, 3 => 3, 2 => 4),
	'worker_2101' => array( 4 => 4, 3 => 5, 2 => 5),
	'worker_3001' => array( 4 => 1, 3 => 1, 2 => 1),
	'worker_3100' => array( 4 => 1, 3 => 1, 2 => 1),
);

// Small deck for test
/*
$this->worker_tiles = array(
	'worker_1111' => array( 4 => 3, 3 => 1, 2 => 1),
	'worker_2101' => array( 4 => 4, 3 => 1, 2 => 1),
	'worker_3001' => array( 4 => 1, 3 => 1, 2 => 1),
	'worker_3100' => array( 4 => 1, 3 => 1, 2 => 1),
);
*/
/*
	Number of workers by side : north - east - south - west
*/
$this->worker_sides = array(
	'worker_1111' => array( 1 , 1 , 1 , 1 ),
	'worker_2101' => array( 1 , 2 , 1 , 0 ),
	'worker_3001' => array( 1 , 3 , 0 , 0 ),
	'worker_3100' => array( 0 , 3 , 1 , 0 ),
);