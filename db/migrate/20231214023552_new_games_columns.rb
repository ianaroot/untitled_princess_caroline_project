class NewGamesColumns < ActiveRecord::Migration[7.1]
  def change
    add_column :games, :notation, :string
  end
end
