import Board from "./board";
class Layout{
  static default(){
    let layOut = [
      Board.WHITE_ROOK,   Board.WHITE_NIGHT,  Board.WHITE_BISHOP, Board.WHITE_QUEEN,  Board.WHITE_KING,   Board.WHITE_BISHOP, Board.WHITE_NIGHT,  Board.WHITE_ROOK,
      Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,
      Board.BLACK_ROOK,   Board.BLACK_NIGHT,  Board.BLACK_BISHOP, Board.BLACK_QUEEN,  Board.BLACK_KING,   Board.BLACK_BISHOP, Board.BLACK_NIGHT,  Board.BLACK_ROOK
    ];
    return layOut
  }

  static weightTesting(){
    let layOut = [
      Board.WHITE_ROOK,   Board.WHITE_NIGHT,  Board.WHITE_BISHOP, Board.WHITE_QUEEN,  Board.WHITE_KING,   Board.WHITE_BISHOP, Board.WHITE_NIGHT,  Board.WHITE_ROOK,
      Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,   Board.WHITE_PAWN,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,   Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN, Board.BLACK_PAWN,   Board.BLACK_PAWN,   Board.BLACK_PAWN,
      Board.BLACK_ROOK,   Board.BLACK_NIGHT,  Board.BLACK_BISHOP, Board.BLACK_QUEEN,  Board.BLACK_KING,   Board.BLACK_BISHOP, Board.BLACK_NIGHT,  Board.BLACK_ROOK
    ];
    return layOut
  }

  static approachingStale(){
    let layOut = ["ee", "ee", "ee", "ee", "WK", "ee", "ee", "ee",
                  "ee", "ee", "ee", "WP", "WN", "WP", "WP", "ee",
                  "ee", "ee", "ee", "ee", "ee", "ee", "ee", "WR",
                  "WP", "WB", "ee", "ee", "ee", "ee", "ee", "ee",
                  "ee", "ee", "ee", "ee", "WQ", "ee", "ee", "ee",
                  "ee", "ee", "ee", "ee", "BP", "ee", "ee", "ee",
                  "ee", "ee", "ee", "ee", "ee", "BK", "ee", "ee",
                  "ee", "ee", "ee", "ee", "ee", "ee", "ee", "WR"]
    return layOut
  }

  static approachingMate(){
    let layOut = [
      Board.WHITE_ROOK,  Board.EMPTY_SQUARE, Board.WHITE_BISHOP,  Board.WHITE_QUEEN, Board.WHITE_KING,  Board.EMPTY_SQUARE,   Board.WHITE_NIGHT, Board.WHITE_ROOK,
      Board.WHITE_PAWN,  Board.WHITE_PAWN,  Board.WHITE_PAWN,    Board.WHITE_PAWN,  Board.EMPTY_SQUARE, Board.WHITE_PAWN,    Board.WHITE_PAWN,  Board.WHITE_PAWN,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.WHITE_NIGHT,   Board.EMPTY_SQUARE, Board.WHITE_PAWN,  Board.EMPTY_SQUARE,   Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.WHITE_BISHOP,  Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,   Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.EMPTY_SQUARE, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,   Board.EMPTY_SQUARE, Board.BLACK_PAWN,  Board.EMPTY_SQUARE,   Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.BLACK_NIGHT, Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,   Board.BLACK_PAWN,  Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,   Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,
      Board.BLACK_PAWN,  Board.BLACK_PAWN,  Board.BLACK_PAWN,    Board.EMPTY_SQUARE, Board.EMPTY_SQUARE,Board.BLACK_PAWN,   Board.BLACK_PAWN,  Board.BLACK_PAWN,
      Board.BLACK_ROOK,  Board.EMPTY_SQUARE, Board.BLACK_BISHOP,  Board.BLACK_QUEEN, Board.BLACK_KING,  Board.BLACK_BISHOP,  Board.BLACK_NIGHT, Board.BLACK_ROOK
    ];//approachingMate used for training bot to seek mate

    return layOut
  }
}

export default Layout