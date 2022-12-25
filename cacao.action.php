<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Cacao implementation : © Paul Barbieux <paul.barbieux@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * cacao.action.php
 *
 * Cacao main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/cacao/cacao/myAction.html", ...)
 *
 */
  
  
  class action_cacao extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "cacao_cacao";
            self::trace( "Complete reinitialization of board game" );
      }
  	} 
  	
    public function confirmWorker() {
        self::setAjaxMode();     
        $worker_id = self::getArg( "worker_id", AT_alphanum, true );
		$x = self::getArg( "x", AT_int, true );
		$y = self::getArg( "y", AT_int, true );
        $rotation = self::getArg( "rotation", AT_posint, true );
        $this->game->confirmWorker( $worker_id, $x, $y, $rotation );
        self::ajaxResponse( );
    }
	
    public function junglePlaced() {
        self::setAjaxMode();
		$jungle_id = self::getArg( "jungle_id", AT_alphanum, true );
        $jungle_type = self::getArg( "jungle_type", AT_alphanum, true );
		$card_id = self::getArg( "card_id", AT_int, true );
		$x = self::getArg( "x", AT_int, true );
		$y = self::getArg( "y", AT_int, true );
		$cnt_places = self::getArg( "cnt_places", AT_int, true );
        $this->game->junglePlaced( $jungle_id , $jungle_type , $card_id , $x , $y , $cnt_places );
        self::ajaxResponse();
    }
	
	public function carryOutAction() {
		self::setAjaxMode();
		$action_id = self::getArg( "action_id", AT_alphanum, true );
		$occurs = self::getArg( "occurs", AT_int, true );
		$this->game->carryOutAction( $action_id , $occurs );
		self::ajaxResponse();
    }
	
	public function actionsCompleted() {
		self::setAjaxMode();
		$this->game->actionsCompleted(true);
		self::ajaxResponse();
    }

  }
  

