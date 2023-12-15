# Pin npm packages by running ./bin/importmap

pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js", preload: true
pin_all_from "app/javascript/controllers", under: "controllers"
pin_all_from '/app/javascript/gameplay', under: 'gameplay', to: 'gameplay'
pin_all_from '/app/assets/images/chess_pieces', under: 'chess_pieces', to: 'chess_pieces'