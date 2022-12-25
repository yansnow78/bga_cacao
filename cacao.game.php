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
  * cacao.game.php
  *
  */

require_once( APP_GAMEMODULE_PATH.'module/table/table.game.php' );

class Cacao extends Table
{
	function __construct( )
	{
        parent::__construct();
		
		// Global values
		self::initGameStateLabels( array( 
			// Jungle tiles in display
			'place1_x' => 10,
			'place1_y' => 11,
			'place2_x' => 12,
			'place2_y' => 13,
			// No more jungle tiles
			'jungle_end' => 14,
			// Two jungle tiles placed ?
			'cnt_jungles_placed' => 15,
			// Notify end of jungles ?
			'notify_end_jungle' => 16,
			// Last workers tile placed
			'last_workers_card_id' => 17
		) );
		/*
			Initialize decks
		*/
		$this->jungle_deck = self::getNew( "module.common.deck" );
        $this->jungle_deck->init( "jungle" );
		$this->workers_deck = self::getNew( "module.common.deck" );
        $this->workers_deck->init( "worker" );
		/*
			Some global values to minimize database access
		*/
		$this->jungle_places = array();
		$this->action_players = array();
		$this->players_infos = array();        
	}
	
    protected function getGameName( )
    {
		// Used for translations and stuff. Please do not modify.
        return "cacao";
    }	

    protected function setupNewGame( $players, $options = array() )
    {    
        // Set the colors of the players with HTML color code
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos['player_colors'];
		
		// Deck of a player
		$qty_players = count($players);
		$workerTiles = array();
		foreach ($this->worker_tiles as $tile_id => $qty_tiles) {
			$nbr = $qty_tiles[$qty_players];
			$workerTiles[] = array('type'=>$tile_id, 'type_arg'=>"", 'nbr'=>$nbr);
		} 
        /*
			Create players
		*/
        $values = array();
		$iPlayer = 0;
        foreach( $players as $player_id => $player ) {
			$iPlayer++;
            $color = array_shift( $default_colors );
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes( $player['player_name'] )."','".addslashes( $player['player_avatar'] )."')";
			// Deck of worker tiles for this player
			$workersDeck = "deck_".$player_id;
			$this->workers_deck->createCards( $workerTiles, $workersDeck ); 
			$this->workers_deck->shuffle( $workersDeck );
			$this->workers_deck->pickCards( 3, $workersDeck, $player_id );
		}
        $sqlValues = implode( $values, ',' );
        self::DbQuery( "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES " . $sqlValues );
        self::reattributeColorsBasedOnPreferences( $players, $gameinfos['player_colors'] );
        self::reloadPlayersBasicInfos();
		/*
			Init statistitcs
		*/
        self::initStat( 'player', 'sold_cacao_number', 0 );
        self::initStat( 'player', 'cacao_gold_gain', 0 );
        self::initStat( 'player', 'mines_gold_gain', 0 );
        self::initStat( 'player', 'water_gold_gain', 0 );
        self::initStat( 'player', 'sun_gold_gain', 0 );
        self::initStat( 'player', 'temples_gold_gain', 0 );
        self::initStat( 'player', 'placed_jungle_number', 0 );
        /*
			Setup the initial game
		*/
		// Build deck of jungle tiles
		$jungleTiles = array();
		foreach ($this->jungle_tiles as $tile_id => $qty_tiles) {
			$nbr = $qty_tiles[$qty_players];
			$jungleTiles[] = array('type'=>$tile_id, 'type_arg'=>"", 'nbr'=>$nbr);
		}
		$this->jungle_deck->createCards( $jungleTiles, 'deck' );
		// Place first two tiles on board
		$tiles = $this->jungle_deck->getCardsOfType("market_2");
		foreach ($tiles as $tile) {
			$firstTile = $tile;
			break;
		}
		$this->jungle_deck->moveCard( $firstTile['id'] , "board" );
		$tiles = $this->jungle_deck->getCardsOfType("plantation_1" );
		foreach ($tiles as $tile) {
			$secondTile = $tile;
			break;
		}
		$this->jungle_deck->moveCard( $secondTile['id'], "board" );
		// Place these two first tiles in middle of the board
		self::DbQuery( "INSERT INTO board (relative_x, relative_y, tile, card_id) VALUES (-1,-1,'market_2',".$firstTile['id'].")" );
		self::DbQuery( "INSERT INTO board (relative_x, relative_y, tile, card_id) VALUES (0,0,'plantation_1',".$secondTile['id'].")" );
		// Shuffle the deck
		$this->jungle_deck->shuffle( "deck" );
		// Place two next jungle tiles in the display zone
		$this->jungle_deck->pickCardForLocation( "deck", "display" );
		$this->jungle_deck->pickCardForLocation( "deck", "display" );
		/*
			Initialize global values
		*/
		self::setGameStateInitialValue( 'place1_x', 99 );
		self::setGameStateInitialValue( 'place1_y', 99 );
		self::setGameStateInitialValue( 'place2_x', 99 );
		self::setGameStateInitialValue( 'place2_y', 99 );
		self::setGameStateInitialValue( 'jungle_end', 0 );
		self::setGameStateInitialValue( 'cnt_jungles_placed', 0 );
		self::setGameStateInitialValue( 'notify_end_jungle', 0 );
		
        // Activate first player (which is in general a good idea :) )
        $this->activeNextPlayer();

        /************ End of the game initialization *****/
    }

    protected function getAllDatas()
    {
        $result = array();
    
        $current_player_id = self::getCurrentPlayerId();    // !! We must only return informations visible by this player !!
    
        // Get information about players
        $sql = "SELECT player_id, IFNULL(player_score,0) gold, player_cacao cacao, player_sun sun, player_water water FROM player";
        $result['players'] = self::getCollectionFromDb( $sql );
  
        // Gather all information about current game situation (visible by player $current_player_id).
 		$result['board'] = $this->getBoard();
		$result['workerHand'] = self::getWorkersHand( $current_player_id );
		$result['counterDeck'] = $this->workers_deck->countCardInLocation( "deck_".$current_player_id );
		
		// Number of tiles for all players
		$result['playerHands'] = $this->workers_deck->countCardsByLocationArgs( 'hand' );
		$result['count_deck_workers'] = $this->workers_deck->countCardsInLocations();
		
		// Next two jungle tiles
		$result['next_jungle'] = $this->jungle_deck->getCardsInLocation("display");
		foreach ($result['next_jungle'] as $id=>$tile) {
			$result['next_jungle'][$id]['description'] = $this->jungle_tiles[$tile['type']]['description'];
		}
		$result['cnt_deck_jungles'] = $this->jungle_deck->countCardInLocation("deck");
		
		// Last workers tile placed
		$result['last_workers_card_id'] = self::getGameStateValue( 'last_workers_card_id' );
  
        return $result;
    }

    /*
        Compute game progression on worker tiles.
    */
    function getGameProgression() {
        $cntCards = $this->workers_deck->countCardsInLocations();
		if (!isset($cntCards['discard']) or $cntCards['discard'] == 0) {
			// No worker tiles on the board
        	return 0;
		} elseif (!isset($cntCards['hand']) or $cntCards['hand'] == 0) {
			// No more worker tiles on players hands
			return 100;
		} else {
			// % of placed worker tiles
			$totalWorkers = 0;
			foreach ($cntCards as $location=>$count) {
				$totalWorkers += $count;
			}
			return round( ( $cntCards['discard'] / $totalWorkers ) * 100 );
		}
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////
	
	/*
		Get board situation
	*/
	function getBoard() {
		return self::getObjectListFromDB( "
			SELECT relative_x x, relative_y y, tile, card_id, rotation, B.player_id, player_color, new, overbuilded
			FROM board B LEFT JOIN player P ON P.player_id=B.player_id
			ORDER BY overbuilded");
	}
	
	/*
		Build the matrix 3x3 around a tile (0,0 is the middle)
		[-1,-1] [0,-1] [1,-1]
		[-1,0]  [0,0]  [1,0]
		[-1,1]  [0,1]  [1,1]
	*/
	function getMatrix( $midX , $midY , $board="" ) {
		if ($board == "") {
			$board = $this->getBoard();
		}
		$matrix = array();
		$midX = (int) $midX;
		$midY = (int) $midY;
		$fromX = $midX-1;
		$toX = $midX+1;
		$fromY = $midY-1;
		$toY = $midY+1;
		foreach ($board as $tile) {
			$tileX = (int) $tile['x'];
			$tileY = (int) $tile['y'];
			if ($tileX >= $fromX and $tileX <= $toX and $tileY >= $fromY and $tileY <= $toY) {
				$matrix[$tileX-$midX][$tileY-$midY] = $tile;
			}
		}
		return $matrix;
	}
	
	/*
		Return worker tiles in the hand of a player
	*/
	function getWorkersHand( $player_id ) {
		return $this->workers_deck->getPlayerHand( $player_id );
	}
	
	/*
		Find places for worker on the board
	*/
	function placesForWorker() {
		$board = $this->getBoard(); // #TODO : not request again if already selected ?
		$player_id = self::getActivePlayerId();
		$workerPlaces = array();
		if ($this->jungle_deck->countCardInLocation("display") == 0) {
			// No more jungle tiles to place : overbuild is now possible
			$playerSun = self::getUniqueValueFromDB( "SELECT player_sun FROM player WHERE player_id=".$player_id );
			if ($playerSun > 0) {
				// The player can overbuild
				$overbuild = true;
			} else {
				// No sun token to overbuild
				$overbuild = false;
			}
		} else {
			$overbuild = false;
		}
		foreach ($board as $tile) {
			$x = (int) $tile['x'];
			$y = (int) $tile['y'];
			if ($tile['rotation'] != "") {
				// Only worker tiles must be checked
				$workerPlaces[$x][$y] = "filled";
			}
		}
		$places = array();
		foreach ($board as $tile) {
			if ($tile['player_id'] == "") {
				// This is a jungle tile
				$x = (int) $tile['x'];
				$y = (int) $tile['y'];
				if (!isset($workerPlaces[$x - 1][$y])) {
					$workerPlaces[$x - 1][$y] = "free"; // West place
				}
				if (!isset($workerPlaces[$x][$y - 1])) {
					$workerPlaces[$x][$y - 1] = "free"; // North place
				}
				if (!isset($workerPlaces[$x + 1][$y])) {
					$workerPlaces[$x + 1][$y] = "free"; // East place
				}
				if (!isset($workerPlaces[$x][$y + 1])) {
					$workerPlaces[$x][$y + 1] = "free"; // South place
				}
			} else {
				// This is a worker tile
				if ($overbuild and $tile['player_id'] == $player_id and $tile['overbuilded'] != true) {
					// Tile owned by this active player
					$x = (int) $tile['x'];
					$y = (int) $tile['y'];
					$workerPlaces[$x][$y] = "free";
				}
			}
		}
		// Build list of free places
		$freePlaces = array();
		foreach ($workerPlaces as $x=>$yPlaces) {
			foreach ($yPlaces as $y=>$place) {
				if ($place == "free") {
					$freePlaces[] = array($x,$y);
				}
			}	
		}
		return $freePlaces;
	}

	/*
		Places for jungle tile after worker placement
	*/
	function placesForJungle( $midX , $midY , $board="" ) {
		if ($this->jungle_deck->countCardInLocation("display") > 0) {
			if ($board == "") {
				$board = $this->getBoard();
			}
			$junglePlaces = array();
			$matrix = $this->getMatrix($midX,$midY,$board);
			if (!isset($matrix[0][-1]) and (isset($matrix[-1][-1]) or isset($matrix[1][-1]))) {
				$junglePlaces[] = array( (int) $midX, (int) $midY-1); // North edge
			}
			if (!isset($matrix[1][0]) and (isset($matrix[1][-1]) or isset($matrix[1][1]))) {
				$junglePlaces[] = array( (int) $midX+1, (int) $midY); // East edge
			}
			if (!isset($matrix[0][1]) and (isset($matrix[-1][1]) or isset($matrix[1][1]))) {
				$junglePlaces[] = array( (int) $midX, (int) $midY+1); // South edge
			}
			if (!isset($matrix[-1][0]) and (isset($matrix[-1][-1]) or isset($matrix[-1][1]))) {
				$junglePlaces[] = array( (int) $midX-1, (int) $midY); // West edge
			}
			return $junglePlaces;
		} else {
			return false;
		}
	}
	
	/*
		Return number of workers on each side of a worker tile, depending on the rotation.
		Rotation = 1 (no rotation) to 4.
		┌───X───┐ & rotation 2 = n => 0
		│       X				 e => 1
		│       X				 s => 2
		└───X───┘				 w => 1
	*/
	function getSideWorkers( $tile_type , $rotation ) {
		$workerSides = array_merge($this->worker_sides[$tile_type],$this->worker_sides[$tile_type]);
		$north = $workerSides[ 5 - $rotation ];
		$east = $workerSides[ 6 - $rotation ];
		$south = $workerSides[ 7 - $rotation ];
		$west = $workerSides[ 8 - $rotation ];
		return array( 
			'n'=>array( 'workers'=>$north , 'x'=>0 , 'y'=>-1 ),
			'e'=>array( 'workers'=>$east , 'x'=>1 , 'y'=>0 ),
			's'=>array( 'workers'=>$south , 'x'=>0 , 'y'=>1 ),
			'w'=>array( 'workers'=>$west , 'x'=>-1 , 'y'=>0 )
		);
	}
	
	/*
		Set scores of a player depending on number of workers for this jungle tile
	*/
	function setPlayerScore( $player_id , $tile , $card_id , $workers , $action_id="" ) {
		$gainValue = $this->jungle_tiles[$tile]['value'];
		$thisPlayerScores = self::getObjectFromDB( "
			SELECT IFNULL(player_score,0) player_score, player_cacao, player_sun, player_water 
			FROM player WHERE player_id=".$player_id );
		$movements = array();
		switch ($this->jungle_tiles[$tile]['gain']) {
			case "cacao" :
				$qty = $gainValue * $workers;
				if (($thisPlayerScores['player_cacao'] + $qty) > 5) {
					$qty = 5 - $thisPlayerScores['player_cacao'];
				}
				$thisPlayerScores['player_cacao'] += $qty;
				self::DbQuery( "UPDATE player SET player_cacao=".$thisPlayerScores['player_cacao']." WHERE player_id=".$player_id );
				self::notifyAllPlayers( "playerCarryOutAction", clienttranslate( '${player_name} gets ${qty} cacao fruit(s)' ), array(
					'player_name' => $this->getPlayerName($player_id),
					'qty' => $qty,
					'place_id' => $action_id
				) );
				for ($i=1; $i<=$qty; $i++) {
					$movements[] = array('player_id'=>$player_id, 'card_id'=>$card_id, 'material'=>"cacao", 'direction'=>"get");
				}
				self::incStat( $qty , "sold_cacao_number" , $player_id );
				break;
			case "sale" :
				if ($thisPlayerScores['player_cacao'] < $workers) {
					$qtyCacao = $thisPlayerScores['player_cacao'];
				} else {
					$qtyCacao = $workers;
				}
				$gold = $qtyCacao * $gainValue;
				$thisPlayerScores['player_score'] += $gold;
				$thisPlayerScores['player_cacao'] -= $qtyCacao;
				self::DbQuery( "UPDATE player SET player_score=".$thisPlayerScores['player_score'].", player_cacao=".$thisPlayerScores['player_cacao']." WHERE player_id=".$player_id );
				self::notifyAllPlayers( "playerCarryOutAction", clienttranslate( '${player_name} sells ${qty} cacao fruit(s) and gets ${gold} gold' ), array(
					'player_name' => $this->getPlayerName($player_id),
					'qty' => $qtyCacao,
					'gold' => $gold,
					'place_id' => $action_id
				) );
				for ($i=1; $i<=$qtyCacao; $i++) {
					$movements[] = array('player_id'=>$player_id, 'card_id'=>$card_id, 'material'=>"cacao", 'direction'=>"give");
				}
				for ($i=1; $i<=$gold; $i++) {
					$movements[] = array('player_id'=>$player_id, 'card_id'=>$card_id, 'material'=>"gold", 'direction'=>"get");
				}
				self::incStat( $gold , "cacao_gold_gain" , $player_id );
				break;
			case "mine" :
				$gold = $gainValue * $workers;
				$thisPlayerScores['player_score'] += $gold;
				self::DbQuery( "UPDATE player SET player_score=".$thisPlayerScores['player_score']." WHERE player_id=".$player_id );
				self::notifyAllPlayers( "playerCarryOutAction", clienttranslate( '${player_name} gets ${gold} gold from the gold mine' ), array(
					'player_name' => $this->getPlayerName($player_id),
					'gold' => $gold
				) );
				for ($i=1; $i<=$gold; $i++) {
					$movements[] = array('player_id'=>$player_id, 'card_id'=>$card_id, 'material'=>"gold", 'direction'=>"get");
				}
				self::incStat( $gold , "mines_gold_gain" , $player_id );
				break;
			case "sun" :
				if (($thisPlayerScores['player_sun'] + $workers) > 3) {
					$qty = 3 - $thisPlayerScores['player_sun'];
				} else {
					$qty = $workers;
				}
				$thisPlayerScores['player_sun'] += $qty;
				self::DbQuery( "UPDATE player SET player_sun=".$thisPlayerScores['player_sun']." WHERE player_id=".$player_id );
				self::notifyAllPlayers( "playerCarryOutAction", clienttranslate( '${player_name} gets ${qty} sun token(s)' ), array(
					'player_name' => $this->getPlayerName($player_id),
					'qty' => $qty
				) );
				for ($i=1; $i<=$qty; $i++) {
					$movements[] = array('player_id'=>$player_id, 'card_id'=>$card_id, 'material'=>"sun", 'direction'=>"get");
				}
				break;
			case "water" :
				if (($thisPlayerScores['player_water'] + $workers) > 8) {
					$qty = 8 - $thisPlayerScores['player_water'];
				} else {
					$qty = $workers;
				}
				$thisPlayerScores['player_water'] += $qty;
				self::DbQuery( "UPDATE player SET player_water=".$thisPlayerScores['player_water']." WHERE player_id=".$player_id );
				self::notifyAllPlayers( "playerCarryOutAction", clienttranslate( '${player_name} moves the water carrier ${qty} water field(s) ahead' ), array(
					'player_name' => $this->getPlayerName($player_id),
					'qty' => $qty
				) );
				for ($i=1; $i<=$qty; $i++) {
					$movements[] = array('player_id'=>$player_id, 'card_id'=>$card_id, 'material'=>"water", 'direction'=>"get");
				}
				break;
			case "temple" :
				// Scoring at the end of the game, not here
				self::notifyAllPlayers( "playerCarryOutAction", clienttranslate( '${player_name} has ${qty} more worker(s) adjacent to temples' ), array(
					'player_name' => $this->getPlayerName($player_id),
					'qty' => $workers
				) );
				break;
		}
		// Get updated scores and notify
        self::notifyAllPlayers(
			"newPlayerScores", 
			'', 
			array(
				'player_id' => $player_id,
				'gold' => (int) $thisPlayerScores['player_score'], 
				'cacao' => (int) $thisPlayerScores['player_cacao'],
				'sun' => (int) $thisPlayerScores['player_sun'],
				'water' => (int) $thisPlayerScores['player_water'],
				'movements' => $movements
			)
		);
	}
	
	/*
		Which player can carry out tile action in this tour ?
		Return an array of player_id => array of gain tiles id
	*/
	function setActionPlayers() {
		$board = $this->getBoard();
		$actionPlayers = array(); // List of players => jungle tile(s) action
		foreach ($board as $tile) {
			if ($tile['new']) { // Each new tile have 'new' to true in table 'board'
				$matrix = $this->getMatrix( $tile['x'],$tile['y'],$board );
				if ($tile['player_id'] == "") {
					// Jungle tile just placed : build list of worker tiles around this new jungle
					$workerTiles = array(
						's' => ( isset($matrix[0][-1]) ? $matrix[0][-1] : false ),
						'w' => ( isset($matrix[1][0]) ? $matrix[1][0] : false ),
						'n' => ( isset($matrix[0][1]) ? $matrix[0][1] : false ),
						'e' => ( isset($matrix[-1][0]) ? $matrix[-1][0] : false )
					);
					foreach ($workerTiles as $edge=>$workerTile) {
						if ($workerTile != false and !$workerTile['new']) {
							// Worker tile exists adgacent to this new jungle
							$sideWorkers = $this->getSideWorkers( $workerTile['tile'] , $workerTile['rotation'] );
							if ($sideWorkers[$edge]['workers'] > 0) {
								// Workers exist on this edge
								if ($this->jungle_tiles[$tile['tile']]['auto']) {
									// Gain is automatic
									$this->setPlayerScore( $workerTile['player_id'] , $tile['tile'] , $tile['card_id'] , $sideWorkers[$edge]['workers'] );
								} else {
									// Gain to decide
									$actionId = $tile['card_id']."_".$workerTile['card_id'];
									$actionPlayers[$workerTile['player_id']][] = 
										array (
											'action_id'=>$actionId , 
											'x'=>$workerTile['x'] , 'y'=>$workerTile['y'] , 
											'edge'=>$edge , 
											'workers'=>$sideWorkers[$edge]['workers'] ,
											'gain'=>$this->jungle_tiles[$tile['tile']]['gain'] , 
											'value'=>$this->jungle_tiles[$tile['tile']]['value']
										);
									$tile;
									self::DbQuery(
										"INSERT INTO action (id, player_id, workers, card_id, card_type, relative_x, relative_y, edge)".
										" VALUES ('".$actionId."', ".$workerTile['player_id'].",".$sideWorkers[$edge]['workers'].",".$tile['card_id'].",'".$tile['tile']."',".$workerTile['x'].",".$workerTile['y'].",'".$edge."')");
								}
							}
						}
					}
				} else {
					// Worker tile of the active player
					$sideWorkers = $this->getSideWorkers( $tile['tile'] , $tile['rotation'] );
					foreach ($sideWorkers as $edge=>$side) {
						$x = $side['x'];
						$y = $side['y'];
						if (isset($matrix[$x][$y])) {
							$jungleTile = $matrix[$x][$y];
							if ($side['workers'] > 0) {
								// Gain on this side for this worker tile 
								if ($this->jungle_tiles[$jungleTile['tile']]['auto']) {
									// Gain is automatic
									$this->setPlayerScore( $tile['player_id'] , $jungleTile['tile'] , $jungleTile['card_id'] , $side['workers'] );
								} else {
									// Player chooses order of gains, or decides to refuse gain 
									$actionId = $jungleTile['card_id']."_".$tile['card_id'];
									$actionPlayers[$tile['player_id']][] = 
										array ( 
											'action_id'=>$actionId , 
											'x'=>$tile['x'] , 'y'=>$tile['y'] , 
											'edge'=>$edge , 
											'workers'=>$side['workers'] ,
											'gain'=>$this->jungle_tiles[$jungleTile['tile']]['gain'] , 
											'value'=>$this->jungle_tiles[$jungleTile['tile']]['value']
										);
									self::DbQuery(
										"INSERT INTO action (id, player_id, workers, card_id, card_type, relative_x, relative_y, edge)".
										" VALUES ('".$actionId."', ".$tile['player_id'].",".$side['workers'].",".$jungleTile['card_id'].",'".$jungleTile['tile']."',".$tile['x'].",".$tile['y'].",'".$edge."')");
								}
							}
						}
					}
				}
			}
		}
		$this->action_players = $actionPlayers;
	}
	
	/*
    	Return string player name based on $player_id
    */
    function getPlayerName($player_id) {
		if (count($this->players_infos) == 0) {
        	$this->players_infos = $this->loadPlayersBasicInfos();
		}
        if (!isset($this->players_infos[$player_id])) {
            return "unknown";
        }
        return $this->players_infos[$player_id]['player_name'];
    }
	
	/*
    	Return player color based on $player_id
    */
    function getPlayerColor($player_id) {
		if (count($this->players_infos) == 0) {
        	$this->players_infos = $this->loadPlayersBasicInfos();
		}
        if (!isset($this->players_infos[$player_id])) {
            return "unknown";
        }
        return $this->players_infos[$player_id]['player_color'];
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Player actions
//////////// 

    function confirmWorker( $tile_id , $this_x , $this_y , $rotation )
    {
		/*
			tile_id : worker_2101_15
			          *********** 		-> tile/card type
						          **	-> id in the deck (card_id)
		*/ 
        self::checkAction( 'confirmWorker' );
        $player_id = self::getActivePlayerId();
		// Remove this tile from the player's deck
		$card_id = substr($tile_id,12);
		$this->workers_deck->playCard($card_id);
		// Memorize this tile as the last workes tile placed
		self::setGameStateValue( 'last_workers_card_id', $card_id );
		/*
			Update board situation
		*/
		$tile_type = substr($tile_id, 0 , 11);
		$tileOverbuild = false;
		if (self::getGameStateValue('jungle_end') == 1) {
			// Maybe it's an overbuild ?
			$tileOverbuild = self::getUniqueValueFromDB("SELECT 1 FROM board WHERE player_id=".$player_id." AND relative_x=".$this_x." AND relative_y=".$this_y);
		}
		if ($tileOverbuild) {
			// Overbuild on an existing worker tile
			self::DbQuery("UPDATE board SET tile='".$tile_type."', card_id=".$card_id.", rotation=".$rotation.", new=1, overbuilded=1 WHERE 
					player_id=".$player_id." AND relative_x=".$this_x." AND relative_y=".$this_y);
			self::DbQuery("UPDATE player SET player_sun=player_sun-1 WHERE player_id=".$player_id);
		} else {
			self::DbQuery("INSERT INTO board (relative_x, relative_y, tile, card_id, rotation, player_id, new) 
					VALUES (".$this_x.",".$this_y.",'".$tile_type."',".$card_id.",".$rotation.",".$player_id.",1)");
		}
		// Notify about worker tile placed
		$cntSun = self::getUniqueValueFromDB("SELECT player_sun FROM player WHERE player_id=".$player_id);
		self::notifyAllPlayers( 
			"workerPlaced", 
			clienttranslate( '${player_name} places a worker tile'), 
			array(
				'player_name' => self::getActivePlayerName(),
				'color' => self::getCurrentPlayerColor(),
				'player_id' => $player_id,
				'tile_type' => $tile_type,
				'card_id' => $card_id,
				'tile_x' => (int) $this_x,
				'tile_y' => (int) $this_y,
				'tile_rotation' => $rotation,
				'sun' => $cntSun,
				'overbuild' => $tileOverbuild
			)
		);
		// Next state
		$junglePlaces = $this->placesForJungle($this_x,$this_y);
		if ($junglePlaces != false) {
			/*
				Invite to place jungles
			*/
			self::setGameStateValue( "place1_x", $junglePlaces[0][0] );
			self::setGameStateValue( "place1_y", $junglePlaces[0][1] );
			$notifyArgs = array( 'player_name' => self::getActivePlayerName() );
			if (isset($junglePlaces[1])) {
				self::setGameStateValue( "place2_x", $junglePlaces[1][0] );
				self::setGameStateValue( "place2_y", $junglePlaces[1][1] );
				self::notifyAllPlayers( "jungleMustBePlaced", clienttranslate( '${player_name} must place two jungle tiles' ), $notifyArgs );
			} else {
				self::notifyAllPlayers( "jungleMustBePlaced", clienttranslate( '${player_name} must place one jungle tile' ), $notifyArgs );
			}
			$this->gamestate->nextState("fillJungle");
		} else {
			$this->setActionPlayers(); // Get possible actions for all players
			if (count($this->action_players) > 0) {
				// At least one jungle action to carry out
				$this->gamestate->nextState("jungleActions");
			} else {
				// No jungle action to carry out : next player
				$this->gamestate->nextState("nextPlayer");
			} 
		}
    }
	
	/*
		Jungle tile placed on the board
	*/
    function junglePlaced( $tile_id , $tile_type , $card_id , $place_x , $place_y , $cnt_places ) {
        self::checkAction( 'placeJungle' );
        $player_id = self::getActivePlayerId();
		// Update database
		$sql = "INSERT INTO board (relative_x, relative_y, tile, card_id, new) 
				VALUES (".$place_x.",".$place_y.",'".$tile_type."',".$card_id.",1)";
		self::DbQuery( $sql );
		// Move tile to the board
		$this->jungle_deck->moveCard( $card_id , "board" );
		$cntTilesInDisplay = $this->jungle_deck->countCardInLocation("display");
		// Is there is a second place for a jungle tile or it was the last jungle tile ?
		if (self::getGameStateValue("place2_x") == 99 or $cntTilesInDisplay == 0) {
			// Only one place or no more tile for the second place
			self::setGameStateValue( 'cnt_jungles_placed', 1 );
			self::notifyAllPlayers( "jungleAdded", clienttranslate( '${player_name} fills a jungle space' ), array(
				'player_name' => self::getActivePlayerName(),
				'player_id' => $player_id,
				'tile_id' => $tile_id,
				'tile_x' => (int) $place_x,
				'tile_y' => (int) $place_y
			) );
		} else {
			// Yes, there were two places : place automatically the second jungle
			self::setGameStateValue( 'cnt_jungles_placed', 2 );
			if (self::getGameStateValue("place2_x") == $place_x and self::getGameStateValue("place2_y") == $place_y) {
				$place2_x = self::getGameStateValue("place1_x");
				$place2_y = self::getGameStateValue("place1_y");
			} else {
				$place2_x = self::getGameStateValue("place2_x");
				$place2_y = self::getGameStateValue("place2_y");
			}
			$tilesInDisplay = $this->jungle_deck->getCardsInLocation("display");
			$cntTilesInDeck = $this->jungle_deck->countCardInLocation("deck");
			$secondTile = reset($tilesInDisplay);
			if ($secondTile != false) { // Maybe display contained only one tile
				$sql = "INSERT INTO board (relative_x, relative_y, tile, card_id, new) 
						VALUES (".$place2_x.",".$place2_y.",'".$secondTile['type']."',".$secondTile['id'].",1)";
				self::DbQuery( $sql );
				$this->jungle_deck->moveCard( $secondTile['id'] , "board" );
				self::notifyAllPlayers( "jungleAdded", clienttranslate( '${player_name} fills two jungle spaces.' ), array(
					'player_name' => self::getActivePlayerName(),
					'player_id' => $player_id,
					'tile_id' => $tile_id,
					'tile_x' => (int) $place_x,
					'tile_y' => (int) $place_y,
					'tile_2_id' => "jungle_".$secondTile['id'],
					'tile_2_x' => (int) $place2_x,
					'tile_2_y' => (int) $place2_y
				) );
			} else {
				self::setGameStateValue( 'cnt_jungles_placed', 1 );
			}
		}
		// Statistics
		self::incStat( self::getGameStateValue('cnt_jungles_placed') , "placed_jungle_number" , $player_id );
		// Reset global jungle places
		self::setGameStateValue( 'place1_x', 99 );
		self::setGameStateValue( 'place1_y', 99 );
		self::setGameStateValue( 'place2_x', 99 );
		self::setGameStateValue( 'place2_y', 99 );
		
		$this->setActionPlayers();
		if (count($this->action_players) > 0) {
			// At least one jungle action to carry out
			$this->gamestate->nextState("jungleActions");
		} else {
			// No jungle action to carry out : next player
			$this->gamestate->nextState("nextPlayer");
		} 			
	}
	
	/*
		Player carry out action on a jungle tile.
		If there are two (or three) workers on the edge, player can activate 1, 2 (or 3) workers : this is $occurs
	*/
	function carryOutAction( $action_id , $occurs ) {
        self::checkAction( 'carryOutAction' );
		$current_player_id = self::getCurrentPlayerId();
		$row = self::getObjectFromDB( "SELECT * FROM action WHERE id='".$action_id."'" );
		if ($occurs < 0 or $occurs > $row['workers']) {
			// Cheating : value set by the player with a debugging tool
			$occurs = $row['workers'];
		}
		$this->setPlayerScore( $current_player_id , $row['card_type'] , $row['card_id'] , $occurs , $action_id );
		self::DbQuery("DELETE FROM action WHERE id='".$action_id."'");
		$cntActions = self::getUniqueValueFromDB("SELECT count(*) FROM action WHERE player_id=".$current_player_id);
		if ($cntActions == 0) {
			// No more workers to activate
			$this->actionsCompleted(false);
		}
	}
	
	/*
		No more action or player decides to skip last action(s) ($forgo = true)
		Exemple : don't sale cacao because price is to low
	*/
	function actionsCompleted($forgo=false) {
        self::checkAction( 'actionsCompleted' );
		$current_player_id = self::getCurrentPlayerId();
		if ($forgo) {
			self::DbQuery("DELETE FROM action WHERE player_id='".$current_player_id."'");
			self::notifyAllPlayers( "playerForgo", clienttranslate( '${player_name} forgoes his/her latest action(s)' ), array(
				'player_name' => $this->getPlayerName($current_player_id),
				'player_id' => $current_player_id
			) );
		}
		$this->gamestate->setPlayerNonMultiactive($current_player_id, 'next');
	}
    
//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////
	
    function argPlayerTurn() {
        return array(
            'workerPlaces' => self::placesForWorker()
        );
    }
	
    function argPlayerJungle() {
		if (count($this->jungle_places) == 0) {
			$row = self::getObjectFromDB( "SELECT relative_x, relative_y FROM board WHERE new=1 AND player_id IS NOT NULL" );
			$this->jungle_places = self::placesForJungle( $row['relative_x'] , $row['relative_y'] );
		}
        return array(
            'junglePlaces' => $this->jungle_places
        );
    }
	
	function argPlayerActions() {
		if (count($this->action_players) == 0) {
			$actions = self::getObjectListFromDB("SELECT * FROM action");
			foreach ($actions as $action) {
				$card_type = explode("_",$action['card_type']);
				$this->action_players[$action['player_id']][] = 
					array (
						'action_id'=>$action['id'] , 
						'x'=>$action['relative_x'] , 'y'=>$action['relative_y'] , 
						'edge'=>$action['edge'] , 'workers'=>$action['workers'] , 
						'gain'=>($card_type[0] == "plantation" ? "cacao" : "sale") , 'value'=>$card_type[1]
					);
			}
		}
		return array(
			'actionPlayers' => $this->action_players
		);
	}
	
	function argGameTurn() {
		return array(
			'cntNewJungles' => self::getGameStateValue('cnt_jungles_placed')
		);
	}
	
	function argPlayerScores() {
		return array('end'); #TODO : inutile
	}
	

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    function stGameTurn() {
		if (!self::isCurrentPlayerZombie()) {
			// Reset new tiles
			self::DbQuery( "UPDATE board SET new=NULL WHERE new=1" );
			if (self::getGameStateValue('cnt_jungles_placed') > 0) {
				// Fill the display with a new tile...
				$next_jungle_tile = $this->jungle_deck->pickCardForLocation( "deck", "display" );
				$cntTilesInDeck = $this->jungle_deck->countCardInLocation("deck");
				if ($next_jungle_tile == null) {
					// No more jungle tile
					self::setGameStateValue( 'jungle_end', 1 );
				} else {
					// ... and show it to the players.
					self::notifyAllPlayers( "displayNewJungle", "", array(
						'type' => $next_jungle_tile['type'],
						'id' => $next_jungle_tile['id'],
						'cnt_deck_jungles' => $cntTilesInDeck,
						'description' => $this->jungle_tiles[$next_jungle_tile['type']]['description']
					) );
					if (self::getGameStateValue('cnt_jungles_placed') == 2) {
						// Show a second jungle tile on the display
						$next_jungle_tile = $this->jungle_deck->pickCardForLocation( "deck", "display" );
						$cntTilesInDeck = $this->jungle_deck->countCardInLocation("deck");
						if ($next_jungle_tile == null) {
							self::setGameStateValue( 'jungle_end', 1 );
						} else {
							self::notifyAllPlayers( "displayNewJungle", "", array(
								'type' => $next_jungle_tile['type'],
								'id' => $next_jungle_tile['id'],
								'cnt_deck_jungles' => $cntTilesInDeck,
								'description' => $this->jungle_tiles[$next_jungle_tile['type']]['description']
							) );
						}
					}
				}
			}
			// New tile in this player hand
			$player_id = self::getActivePlayerId();
			$this->giveExtraTime($player_id);
			$worker_tile = $this->workers_deck->pickCard( "deck_".$player_id, $player_id );
			if ($worker_tile != null) {
				// Show a new tile in the hand
				self::notifyPlayer( $player_id , "getNewWorker", "", array(
					'type' => $worker_tile['type'],
					'card_id' => $worker_tile['id'],
					'color' => $this->getPlayerColor($player_id),
					'counterDeck' => $this->workers_deck->countCardInLocation("deck_".$player_id)
				) );
				self::notifyAllPlayers( "addWorkerInPlayerHand", "", array(
					'player_id' => $player_id,
					'color' => $this->getPlayerColor($player_id),
					'counterDeck' => $this->workers_deck->countCardInLocation("deck_".$player_id)
				) );
			}
			// Reduce jungle display if empty
			if ($this->jungle_deck->countCardInLocation("display") == 0 and self::getGameStateValue('notify_end_jungle') == 0) {
				self::notifyAllPlayers( "jungleEnd" , clienttranslate( "No more jungle tiles : overbuild is now possible" ) , array() );
				self::setGameStateValue( 'notify_end_jungle', 1 );
			}
			// Wait before next player : some movements must be completed
			self::notifyAllPlayers( "playerTurnWait" , "" , array() );
		}
		// Next player
		$player_id = self::activeNextPlayer();
		if ($this->workers_deck->countCardInLocation( "hand" , $player_id ) > 0) {
			$this->gamestate->nextState( 'nextTurn' );
		} else {
        	// End of the game
			$this->gamestate->nextState( 'end' );
		}
		self::setGameStateValue( 'cnt_jungles_placed', 0 );
    }
	
	function stMultiPlayerInit() {
		$activePlayers = array();
		// Build list of players who must carry out an action
		foreach ($this->action_players as $playerId=>$tiles) {
			$activePlayers[] = $playerId;
		}
		$this->gamestate->setPlayersMultiactive( $activePlayers , "next" , false );
   }
   
	/*
		Adjust final scores
	*/
    function stGameScores() {
		$newScores = array();
		self::notifyAllPlayers( "endOfTheGame" , clienttranslate( 'All players have placed their last worker tile : adjust score with water fields, sun tokens and temples...' ) , array() );
   		/*
			Malus/bonus for water fields and add sun tokens
		*/
		$playersScores = self::getCollectionFromDB( "SELECT player_id, player_score, player_sun, player_water, player_cacao FROM player" );
		foreach ($playersScores as $player_id=>$scores) {
			$playerName = $this->getPlayerName($player_id);
			switch ($scores['player_water']) {
				case 0 : $waterScore = -10; break;
				case 1 : $waterScore = -4; break;
				case 2 : $waterScore = -1; break;
				case 3 : $waterScore = 0; break;
				case 4 : $waterScore = 2; break;
				case 5 : $waterScore = 4; break;
				case 6 : $waterScore = 7; break;
				case 7 : $waterScore = 11; break;
				default : $waterScore = 16;
			}
			$newScores[$player_id] = $scores['player_score'] + $waterScore;
			self::incStat( $waterScore , "water_gold_gain" , $player_id );
			if ($waterScore < 0) {
				self::notifyAllPlayers( "scoreWater" , clienttranslate( '${player_name} looses ${adjust_score} gold from the water field' ), array(
					'player_name' => $playerName,
					'player_id' => $player_id,
					'adjust_score' => $waterScore,
					'gold' => $newScores[$player_id]
				) );
			} elseif ($waterScore > 0) {
				self::notifyAllPlayers( "scoreWater" , clienttranslate( '${player_name} wins ${adjust_score} gold from the water field' ), array(
					'player_name' => $playerName,
					'player_id' => $player_id,
					'adjust_score' => $waterScore,
					'gold' => $newScores[$player_id]
				) );
			}
			if ($scores['player_sun'] > 0) {
				$newScores[$player_id] += $scores['player_sun'];
				self::notifyAllPlayers( "scoreSun" , clienttranslate( '${player_name} has ${sun} sun token(s) and get ${sun} more gold' ), array(
					'player_name' => $playerName,
					'player_id' => $player_id,
					'sun' => $scores['player_sun'],
					'gold' => $newScores[$player_id]
				) );
				self::incStat( $scores['player_sun'] , "sun_gold_gain" , $player_id );
			}
		};
		/*
			Majorities around temples
		*/
		$board = $this->getBoard();
		$templeNr = 0;
		foreach ($board as $tile) {
			if ($tile['tile'] == "temples") {
				$templeNr += 1;
				$x = (int) $tile['x'];
				$y = (int) $tile['y'];
				$matrix = $this->getMatrix($x,$y,$board);
				$workerTiles = array(
					// Edge to check => on this worker tile
					's' => ( isset($matrix[0][-1]) ? $matrix[0][-1] : false ),
					'w' => ( isset($matrix[1][0]) ? $matrix[1][0] : false ),
					'n' => ( isset($matrix[0][1]) ? $matrix[0][1] : false ),
					'e' => ( isset($matrix[-1][0]) ? $matrix[-1][0] : false )
				);
				$playersAround = array();
				// Compute workers around the temple, by player
				foreach ($workerTiles as $edge=>$workerTile) {
					if ($workerTile != false) {
						$sideWorkers = $this->getSideWorkers( $workerTile['tile'] , $workerTile['rotation'] );
						$tilePlayerId = $workerTile['player_id'];
						if ($sideWorkers[$edge]['workers'] > 0) {
							if (isset($playersAround[$tilePlayerId])) {
								$playersAround[$tilePlayerId] += $sideWorkers[$edge]['workers'];
							} else {
								$playersAround[$tilePlayerId] = $sideWorkers[$edge]['workers'];
							}
						}
					}
				}
				if (count($playersAround) > 0) {
					// Compute ranking
					$scoresTemple = array();
					foreach ($playersAround as $player_id => $workers) {
						$scoresTemple[$workers][] = $player_id;
					}
					krsort($scoresTemple);
					$iRank = 0;
					$secondPlace = true;
					foreach ($scoresTemple as $workers=>$players) {
						$iRank++;
						if ($iRank == 1 or ($iRank == 2 and $secondPlace)) {
							if ($iRank == 1) {
								$gold = 6;
							} else {
								$gold = 3;
							}
							$notifyArgs = array(
								'player_name' => "",
								'player_id' => "",
								'gold' => 0,
								'card_id' => $tile['card_id'],
								'temple_nr' => $templeNr,
								'movements' => array()
							);
							if (count($players) > 1) {
								$gold = floor( $gold / count($players) );
								$notifyArgs['gold'] = $gold;
								$secondPlace = false; // No second place
								foreach ($players as $player_id) {
									$notifyArgs['player_name'] = $this->getPlayerName($player_id);
									$notifyArgs['player_id'] = $player_id;
									$newScores[$player_id] += $gold;
									$notifyArgs['movements'] = array();
									for ($i=1; $i<=$gold; $i++) {
										$notifyArgs['movements'][] = array('player_id'=>$player_id, 'card_id'=>$tile['card_id'], 'material'=>"gold", 'direction'=>"get");
									}
									if ($iRank == 1) {
										self::notifyAllPlayers( "scoreTemples" ,clienttranslate( '${player_name} shares the first place around temple number ${temple_nr} and wins ${gold} more gold' ) , $notifyArgs );
									} else {
										self::notifyAllPlayers( "scoreTemples" ,clienttranslate( '${player_name} shares the second place around temple number ${temple_nr} and wins ${gold} more gold' ) ,$notifyArgs );
									}
									self::incStat( $gold , "temples_gold_gain" , $player_id );
								}
							} else {
								$player_id = $players[0];
								$notifyArgs['player_name'] = $this->getPlayerName($player_id);
								$notifyArgs['player_id'] = $player_id;
								$notifyArgs['gold'] = $gold;
								$newScores[$player_id] += $gold;
								for ($i=1; $i<=$gold; $i++) {
									$notifyArgs['movements'][] = array('player_id'=>$player_id, 'card_id'=>$tile['card_id'], 'material'=>"gold", 'direction'=>"get");
								}
								if ($iRank == 1) {
									self::notifyAllPlayers( "scoreTemples" ,clienttranslate( '${player_name} has the first place around temple number ${temple_nr} and wins ${gold} more gold' ) ,$notifyArgs );
								} else {
									self::notifyAllPlayers( "scoreTemples" ,clienttranslate( '${player_name} has the second place around temple number ${temple_nr} and wins ${gold} more gold' ) , $notifyArgs );
								}
								self::incStat( $gold , "temples_gold_gain" , $player_id );
							}
						}
					}
				}
			}
		}
		/*
			Update payer final scores
		*/
		foreach ($newScores as $player_id=>$newScore) {
			self::DbQuery("UPDATE player SET player_score=".$newScore.", player_score_aux=player_cacao WHERE player_id=".$player_id);
		}
		/*
			Show statistics
		*/
		$html = '<TABLE><THEAD><TR><TH></TH>';
		foreach ($newScores as $player_id=>$newScore) {
			$html .= '<TH>'.$this->getPlayerName($player_id).'</TH>';
		}
		$html .= '</TR></THEAD><TBODY>';
		// Score
		$html .= '<TR><TH>'.clienttranslate("Score").'</TH>';
		foreach ($newScores as $player_id=>$newScore) {
			$html .= '<TD align="center">'.$newScore.'<i class="fa fa-lg fa-star"></i></TD>';
		}
		$html .= '</TR><TR><TH>'.clienttranslate("Left cacao fruits")." (".clienttranslate("Tie breaker").')</TH>';
		foreach ($playersScores as $player_id=>$scores) {
			$html .= '<TD align="center">'.$scores['player_cacao'].'</TD>';
		}
		// Statistics
		require ("stats.inc.php");
		foreach ($stats_type['player'] as $statName => $statValues) {
			$html .= '<TR><TH>'.clienttranslate($statValues['name']).'</TH>';
			foreach ($newScores as $player_id=>$newScore) {
				$html .= '<TD align="center">'.self::getStat( $statName ,$player_id ).'</TD>';
			}
			$html .= '</TR>';
		}
		// Reflexion time
		$html .= '<TR><TH>'.clienttranslate("Thinking time")."</TH>";
		$playersTimes = self::getCollectionFromDB( "SELECT stats_player_id, stats_value FROM stats WHERE stats_type=1" , true );
		foreach ($newScores as $player_id=>$newScore) {
			$seconds = $playersTimes[$player_id];
			$h = floor($seconds / 3600);
			if ($h > 48) {
				$days = floor($h / 24);
				$html .= '<TD align="center">'.$days." ".clienttranslate("days").'</TD>';
			} else {
				$m = ($seconds / 60) % 60;
				$s = $seconds % 60;
				$html .= '<TD align="center">'.($h > 0 ? $h.sprintf(":%02d:%02d", $m, $s) : $m.sprintf(":%02d", $s)).'</TD>';
			}
		}
		$html .= '</TR></BODY></TABLE>';
		self::notifyAllPlayers( "finalStats" , "" , array('html'=>$html) );
		
		$this->gamestate->nextState( 'end' );
   }

//////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////

    /*
        ExtraPaul : je n'arrive pas à résoudre les problèmes suivants...
		- Abandon lors de playerJungleActions : 
			Unexpected error: Propagating error from GS 1 (method: zombie): feException: More than one possible action at this state
		- Abandon lors de playerJungle : 
			Unexpected error: Propagating error from GS 1 (method: zombie): feException: Can't manage zombie player in this game state (4) 
			
		http://en.doc.boardgamearena.com/Troubleshooting#Zombie_mode
    */

    function zombieTurn( $state, $active_player ) {
		self::dump('========================= zombieTurn : state = ',$state);
		self::dump('========================= zombieTurn : active_player = ',$active_player);
    	$statename = $state['name'];
		
		
        if ($state['type'] === "activeplayer") {
            switch ($statename) {
				case "playerJungle" :
					#TODO Les tuiles jungles doivent être placées par le jeu
					self::notifyAllPlayers( "zombieJungle" , clienttranslate( 'Jungle tile(s) placed by the game' ), array() );
					break;
                default:
                    $this->gamestate->nextState( "zombiePass" );
                	break;
            }

            return;
        }

        if ($state['type'] === "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $this->gamestate->setPlayerNonMultiactive( $active_player, '' );
            
            return;
        }

        throw new feException( "Zombie mode not supported at this game state: ".$statename );
    }
    
///////////////////////////////////////////////////////////////////////////////////:
////////// DB upgrade
//////////

    /*
        upgradeTableDb:
        
        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.
    
    */
    
    function upgradeTableDb( $from_version )
    {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
        
        // Example:
//        if( $from_version <= 1404301345 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            self::applyDbUpgradeToAllDB( $sql );
//        }
//        if( $from_version <= 1405061421 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            self::applyDbUpgradeToAllDB( $sql );
//        }
//        // Please add your future database scheme changes here
//
//


    }    
}
