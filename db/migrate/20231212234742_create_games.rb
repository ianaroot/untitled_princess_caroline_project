class CreateGames < ActiveRecord::Migration[7.1]
  def change
    create_table :games do |t|
      t.belongs_to :white_player, polymorphic: true
      t.belongs_to :black_player, polymorphic: true
      t.boolean :completed, default: false
      t.integer :winner

      t.timestamps
    end
  end
end
