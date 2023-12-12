class ApplicationController < ActionController::Base
    before_action :authenticate_user

    def authenticate_user
        if !current_user
            redirect_to root_path
        end
    end

end
