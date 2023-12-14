# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2023_12_12_234742) do
  create_table "bots", force: :cascade do |t|
    t.integer "user_id"
    t.json "code"
    t.string "api_version", default: "1.0"
    t.integer "win_record", default: 0
    t.integer "loss_record", default: 0
    t.integer "tie_record", default: 0
    t.boolean "approved", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_bots_on_user_id"
  end

  create_table "games", force: :cascade do |t|
    t.string "white_player_type"
    t.integer "white_player_id"
    t.string "black_player_type"
    t.integer "black_player_id"
    t.boolean "completed", default: false
    t.integer "winner"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["black_player_type", "black_player_id"], name: "index_games_on_black_player"
    t.index ["white_player_type", "white_player_id"], name: "index_games_on_white_player"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

end
