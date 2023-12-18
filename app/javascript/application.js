// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import Api from "./gameplay/api.js"
import Board from "./gameplay/board.js"
import Bot from "./gameplay/bot.js"
import GameController from "./gameplay/game_controller.js"
import Layout from "./gameplay/layout.js"
import MoveObject from "./gameplay/move_object.js"
import MovementType from "./gameplay/movement_type.js"
import MovesCalculator from "./gameplay/moves_calculator.js"
import Rules from "./gameplay/rules.js"
import View from "./gameplay/view.js"

var gameController = new GameController()