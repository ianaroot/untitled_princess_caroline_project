class CreateBots < ActiveRecord::Migration[7.1]
  def change
    create_table :bots do |t|
      t.belongs_to :user
      t.json :code
      t.string :api_version, default: "1.0"
      t.integer :win_record, default: 0
      t.integer :loss_record, default: 0
      t.integer :tie_record, default: 0
      t.boolean :approved, default: false
      


      t.timestamps
    end
  end
end
