
-- ------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- Cacaoo implementation : © Paul Barbieux <paul.barbieux@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

ALTER TABLE player ADD player_cacao TINYINT(1) DEFAULT 0;
ALTER TABLE player ADD player_sun TINYINT(1) DEFAULT 0;
ALTER TABLE player ADD player_water TINYINT(2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS `board` (
  `relative_x` TINYINT(2) NOT NULL,
  `relative_y` TINYINT(2) NOT NULL,
  `tile` VARCHAR(32) NOT NULL,
  `card_id` TINYINT(2) DEFAULT NULL,
  `rotation` TINYINT(1) DEFAULT NULL,
  `player_id` INT(10) DEFAULT NULL,
  `new` TINYINT(1) DEFAULT NULL,
  `overbuilded` TINYINT(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ;

CREATE TABLE IF NOT EXISTS `jungle` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `worker` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `action` (
  `id` char(7) NOT NULL,
  `player_id` INT(10) DEFAULT NULL,
  `workers` tinyint(1) NOT NULL,
  `card_id` int(3) NOT NULL,
  `card_type` varchar(16) NOT NULL,
  `relative_x` TINYINT(2) NOT NULL,
  `relative_y` TINYINT(2) NOT NULL,
  `edge` CHAR(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ;