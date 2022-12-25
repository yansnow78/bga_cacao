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
 * stats.inc.php
 *
 * Cacao game statistics description
 *
 */

$stats_type = array(

    // Statistics global to table
    "table" => array(
    ),
    
    // Statistics existing for each player
    "player" => array(

        "sold_cacao_number" => array(
			"id"=> 10,
			"name" => totranslate("Number of sold cacao fruits"),
			"type" => "int" ),
        "cacao_gold_gain" => array(
			"id"=> 11,
			"name" => totranslate("Gold gained from the sale of cacao"),
			"type" => "int" ),
        "mines_gold_gain" => array(
			"id"=> 12,
			"name" => totranslate("Gold gained from gold mines"),
			"type" => "int" ),
        "sun_gold_gain" => array(
			"id"=> 13,
			"name" => totranslate("Gold gained from sun token"),
			"type" => "int" ),
        "water_gold_gain" => array(
			"id"=> 14,
			"name" => totranslate("Gold gained from water fields"),
			"type" => "int" ),
        "temples_gold_gain" => array(
			"id"=> 15,
			"name" => totranslate("Gold gained from temples"),
			"type" => "int" ),
        "placed_jungle_number" => array(
			"id"=> 20,
			"name" => totranslate("Number of placed jungle tiles"),
			"type" => "int" ),
    )

);
