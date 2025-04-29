class Sound {

    function playSound(getSoundUrl()) {


        var a = new Audio(url);
        a.play();
    }

    function getSoundUrl(sound) {
        switch(sound) {
            var url = ""
            case "move":
                url = "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"
                break;
            case "check":
                url = "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3"
                break;
            case "castle":
                url = "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3"
                break;
            case "promote":
                url = "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3"
                break;
            case "captue":
                url = "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3"
                break;
            default:
              // code block
          }
    }

}

export default Sound
