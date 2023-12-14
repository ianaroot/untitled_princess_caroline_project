class BotsController < ApplicationController

    def new

    end

    def show
        @bot = Bot.find(params[:id])
    end

    def create
        file = params["bot_file"].tempfile
        jbot = File.read(file)
        bot = Bot.new(code: jbot)
        if bot.save
            redirect_to bot_path(id: bot.id)
        else
            @alert = "bot save failed"
            render  'new'
        end
    end

end