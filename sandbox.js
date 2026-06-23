/* ============================================================
   BATTLESHIP
   ============================================================
   How the game works:
   1) PLACING phase - you arrange your own ships on the left grid.
   2) BATTLE phase  - you click the right grid to fire at the
                      computer, and the computer fires back.

   We use two grids. Each grid is a 10x10 array of numbers.
   The numbers mean:
        0 = water (empty)
        1 = a ship is here
        2 = a ship square that has been hit
        3 = a shot that missed (just water)
        4 = part of a ship that has been completely sunk
   ============================================================ */


/* ---------- settings you can change ---------- */
const BOARD_SIZE = 10;     // the grid is 10 by 10
const TOTAL_HITS = 17;     // 5 + 4 + 3 + 3 + 2 squares of ships

/* the five ships every player gets */
const FLEET = [
  { name: "Carrier",     size: 5 },
  { name: "Battleship",  size: 4 },
  { name: "Destroyer",   size: 3 },
  { name: "Submarine",   size: 3 },
  { name: "Patrol Boat", size: 2 }
];

/* names for the cell numbers above, so the code reads nicely */
const EMPTY = 0;
const SHIP  = 1;
const HIT   = 2;
const MISS  = 3;
const SUNK  = 4;

/* what the computer knows about YOUR grid while it is shooting */
const UNKNOWN   = 0;
const KNOWN_MISS = 1;
const KNOWN_HIT  = 2;
const KNOWN_SUNK = 3;


/* ---------- things that change while we play ---------- */
let phase = "placing";          // "placing", "battle" or "over"
let currentHorizontal = true;   // which way the ship we are placing faces

let playerBoard;     // your 10x10 grid of numbers
let enemyBoard;      // the computer's 10x10 grid of numbers
let playerShips;     // list of your ships
let enemyShips;      // list of the computer's ships

let botKnows;        // the computer's notes about your grid
let enemyShipSizesLeft; // sizes of your ships the computer has NOT sunk yet

let playerHits = 0;  // how many enemy squares you have hit
let botHits = 0;     // how many of your squares the computer has hit
let busy = false;    // true while the computer is taking its turn


/* ---------- find the boxes on the page ---------- */
let playerBoardEl = document.getElementById("player-board");
let enemyBoardEl  = document.getElementById("enemy-board");
let playerFleetEl = document.getElementById("player-fleet");
let enemyFleetEl  = document.getElementById("enemy-fleet");
let instructionsEl = document.getElementById("instructions");
let statusEl = document.getElementById("status");
let rotateBtn = document.getElementById("rotate-btn");
let randomBtn = document.getElementById("random-btn");
let resetBtn  = document.getElementById("reset-btn");
let startBtn  = document.getElementById("start-btn");
let newGameBtn = document.getElementById("newgame-btn");


/* ============================================================
   SMALL HELPERS
   ============================================================ */

/* make a fresh 10x10 grid where every square holds the same value */
function makeGrid(value) {
  let grid = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    let oneRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      oneRow.push(value);
    }
    grid.push(oneRow);
  }
  return grid;
}

/* show a short message at the top of the page */
function setStatus(message) {
  statusEl.textContent = message;
}

/* the list of squares a ship would cover if it started at (row, col) */
function getShipSquares(row, col, size, horizontal) {
  let squares = [];
  for (let i = 0; i < size; i++) {
    if (horizontal) {
      squares.push({ row: row, col: col + i });
    } else {
      squares.push({ row: row + i, col: col });
    }
  }
  return squares;
}

/* can a ship of this size fit here without going off the grid
   or landing on another ship? */
function canPlaceShip(board, row, col, size, horizontal) {
  let squares = getShipSquares(row, col, size, horizontal);
  for (let i = 0; i < squares.length; i++) {
    let r = squares[i].row;
    let c = squares[i].col;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      return false;   // off the grid
    }
    if (board[r][c] !== EMPTY) {
      return false;   // another ship is already there
    }
  }
  return true;
}

/* actually put a ship on the grid and add it to a ship list */
function placeShip(board, shipList, name, size, row, col, horizontal) {
  let squares = getShipSquares(row, col, size, horizontal);
  for (let i = 0; i < squares.length; i++) {
    board[squares[i].row][squares[i].col] = SHIP;
  }
  shipList.push({ name: name, size: size, squares: squares, hits: 0, sunk: false });
}

/* drop all five ships in random spots (used for the computer,
   and for the "Place randomly" button) */
function placeShipsRandomly(board, shipList) {
  for (let s = 0; s < FLEET.length; s++) {
    let name = FLEET[s].name;
    let size = FLEET[s].size;
    let placed = false;
    while (placed === false) {
      let horizontal = (Math.random() < 0.5);
      let row = Math.floor(Math.random() * BOARD_SIZE);
      let col = Math.floor(Math.random() * BOARD_SIZE);
      if (canPlaceShip(board, row, col, size, horizontal)) {
        placeShip(board, shipList, name, size, row, col, horizontal);
        placed = true;
      }
    }
  }
}

/* find which ship (if any) covers a given square */
function findShipAt(shipList, row, col) {
  for (let s = 0; s < shipList.length; s++) {
    let squares = shipList[s].squares;
    for (let i = 0; i < squares.length; i++) {
      if (squares[i].row === row && squares[i].col === col) {
        return shipList[s];
      }
    }
  }
  return null;
}

/* mark every square of a ship as SUNK on its grid */
function markShipSunk(board, ship) {
  for (let i = 0; i < ship.squares.length; i++) {
    board[ship.squares[i].row][ship.squares[i].col] = SUNK;
  }
}

/* remove one matching number from a list (used when a ship sinks) */
function removeOneValue(list, value) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === value) {
      list.splice(i, 1);
      return;
    }
  }
}


/* ============================================================
   DRAWING THE GRIDS
   ============================================================ */

/* build one grid out of 100 little <div> squares */
function buildBoard(container, prefix) {
  container.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let square = document.createElement("div");
      square.className = "cell water";
      square.id = prefix + "-" + row + "-" + col;
      square.dataset.row = row;
      square.dataset.col = col;
      container.appendChild(square);
    }
  }
}

/* find one square element on the page */
function getCell(prefix, row, col) {
  return document.getElementById(prefix + "-" + row + "-" + col);
}

/* give one square a colour by setting its class */
function paintCell(prefix, row, col, className) {
  getCell(prefix, row, col).className = "cell " + className;
}

/* turn a cell number into a colour name */
function colourFor(value, showShips) {
  if (value === HIT)  { return "hit"; }
  if (value === MISS) { return "miss"; }
  if (value === SUNK) { return "sunk"; }
  if (value === SHIP && showShips) { return "ship"; }
  return "water";
}

/* repaint your whole grid from the playerBoard numbers */
function drawPlayerBoard() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      paintCell("player", row, col, colourFor(playerBoard[row][col], true));
    }
  }
}

/* repaint the enemy grid. Their ships stay hidden (shown as water)
   until the game is over and we reveal them. */
function drawEnemyBoard(revealShips) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      paintCell("enemy", row, col, colourFor(enemyBoard[row][col], revealShips));
    }
  }
}

/* write a small list under each grid showing each ship's state */
function drawFleet(element, shipList, hideUntilStart) {
  if (hideUntilStart) {
    element.textContent = "";
    return;
  }
  let text = "";
  for (let i = 0; i < shipList.length; i++) {
    let ship = shipList[i];
    if (ship.sunk) {
      text += ship.name + " - sunk\n";
    } else {
      text += ship.name + " - " + ship.hits + "/" + ship.size + " hit\n";
    }
  }
  element.textContent = text;
}


/* ============================================================
   PLACING YOUR SHIPS
   ============================================================ */

/* which ship should we place next? the first one not on the grid yet */
function getNextShipToPlace() {
  for (let s = 0; s < FLEET.length; s++) {
    let name = FLEET[s].name;
    let alreadyPlaced = false;
    for (let p = 0; p < playerShips.length; p++) {
      if (playerShips[p].name === name) {
        alreadyPlaced = true;
      }
    }
    if (alreadyPlaced === false) {
      return FLEET[s];
    }
  }
  return null;   // all ships are placed
}

/* update the instruction line and turn the Start button on/off */
function updatePlacementMessage() {
  let ship = getNextShipToPlace();
  if (ship === null) {
    instructionsEl.textContent = "All ships placed. Press \"Start battle\" when you are ready.";
    startBtn.disabled = false;
    return;
  }
  startBtn.disabled = true;
  let direction = "across";
  if (currentHorizontal === false) {
    direction = "down";
  }
  instructionsEl.textContent =
    "Placing your " + ship.name + " (" + ship.size + " squares, going " + direction + "). " +
    "Click the left grid to drop it. \"Rotate\" turns it. Click a placed ship to move it.";
}

/* when you hover over your grid, show a preview of the next ship */
function onPlayerHover(event) {
  if (phase !== "placing") { return; }
  let square = event.target;
  if (square.classList.contains("cell") === false) { return; }

  let ship = getNextShipToPlace();
  if (ship === null) { return; }

  let row = Number(square.dataset.row);
  let col = Number(square.dataset.col);

  drawPlayerBoard();   // clear the old preview first

  let fits = canPlaceShip(playerBoard, row, col, ship.size, currentHorizontal);
  let squares = getShipSquares(row, col, ship.size, currentHorizontal);
  for (let i = 0; i < squares.length; i++) {
    let r = squares[i].row;
    let c = squares[i].col;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      if (fits) {
        paintCell("player", r, c, "preview-ok");
      } else {
        paintCell("player", r, c, "preview-bad");
      }
    }
  }
}

/* clear the preview when the mouse leaves the grid */
function onPlayerLeave() {
  if (phase === "placing") {
    drawPlayerBoard();
  }
}

/* clicking your grid either places the next ship or picks one up */
function onPlayerClick(event) {
  if (phase !== "placing") { return; }
  let square = event.target;
  if (square.classList.contains("cell") === false) { return; }

  let row = Number(square.dataset.row);
  let col = Number(square.dataset.col);

  // if you click a ship you already placed, pick it up to move it
  let existing = findShipAt(playerShips, row, col);
  if (existing !== null) {
    pickUpShip(existing);
    return;
  }

  // otherwise try to drop the current ship here
  let ship = getNextShipToPlace();
  if (ship === null) { return; }

  if (canPlaceShip(playerBoard, row, col, ship.size, currentHorizontal)) {
    placeShip(playerBoard, playerShips, ship.name, ship.size, row, col, currentHorizontal);
    drawPlayerBoard();
    updatePlacementMessage();
    setStatus("Placed the " + ship.name + ".");
  } else {
    setStatus("That ship does not fit there. Try another spot or rotate it.");
  }
}

/* take a placed ship back off the grid so it can be moved */
function pickUpShip(ship) {
  for (let i = 0; i < ship.squares.length; i++) {
    playerBoard[ship.squares[i].row][ship.squares[i].col] = EMPTY;
  }
  for (let i = 0; i < playerShips.length; i++) {
    if (playerShips[i] === ship) {
      playerShips.splice(i, 1);
      break;
    }
  }
  drawPlayerBoard();
  updatePlacementMessage();
  setStatus("Picked up the " + ship.name + ". Click a square to place it again.");
}

/* the buttons during placement */
function onRotateClick() {
  if (currentHorizontal) {
    currentHorizontal = false;
  } else {
    currentHorizontal = true;
  }
  updatePlacementMessage();
}

function onRandomClick() {
  playerBoard = makeGrid(EMPTY);
  playerShips = [];
  placeShipsRandomly(playerBoard, playerShips);
  drawPlayerBoard();
  updatePlacementMessage();
  setStatus("Placed your ships for you. Move any you like, or start the battle.");
}

function onResetClick() {
  playerBoard = makeGrid(EMPTY);
  playerShips = [];
  drawPlayerBoard();
  updatePlacementMessage();
  setStatus("Cleared your grid. Place your ships.");
}


/* ============================================================
   YOUR TURN - firing at the enemy grid
   ============================================================ */
function onEnemyClick(event) {
  if (phase !== "battle") { return; }
  if (busy) { return; }                       // wait for the computer
  let square = event.target;
  if (square.classList.contains("cell") === false) { return; }

  let row = Number(square.dataset.row);
  let col = Number(square.dataset.col);
  let value = enemyBoard[row][col];

  if (value === HIT || value === MISS || value === SUNK) {
    setStatus("You already fired at row " + (row + 1) + ", column " + (col + 1) + ".");
    return;
  }

  if (value === SHIP) {
    enemyBoard[row][col] = HIT;
    playerHits++;
    let ship = findShipAt(enemyShips, row, col);
    ship.hits++;
    if (ship.hits === ship.size) {
      ship.sunk = true;
      markShipSunk(enemyBoard, ship);
      setStatus("Hit! You sank their " + ship.name + "!");
    } else {
      setStatus("Hit at row " + (row + 1) + ", column " + (col + 1) + "!");
    }
    drawEnemyBoard(false);
    drawFleet(enemyFleetEl, enemyShips, false);
    if (playerHits === TOTAL_HITS) {
      endGame(true);
      return;
    }
  } else {
    enemyBoard[row][col] = MISS;
    drawEnemyBoard(false);
    setStatus("Miss at row " + (row + 1) + ", column " + (col + 1) + ".");
  }

  // now it is the computer's turn (after a short pause so you can see)
  busy = true;
  setTimeout(botTurn, 600);
}


/* ============================================================
   THE COMPUTER'S TURN - a smart guess, not a random one
   ------------------------------------------------------------
   The computer builds a "heat map". For every ship it has not
   sunk yet, it imagines that ship in every spot it could still
   fit, and adds 1 point to each square that ship would cover.
   Squares where ships can fit in MANY ways score highest, so
   that is where it shoots. When it has already hit a ship but
   not sunk it, those placements get a huge bonus, so the
   computer locks on and finishes the ship off.
   ============================================================ */
function buildHeatMap() {
  let heat = makeGrid(0);
  let LOCK_ON_BONUS = 1000;

  // try each ship size the player still has afloat
  for (let s = 0; s < enemyShipSizesLeft.length; s++) {
    let size = enemyShipSizesLeft[s];

    // try the ship lying across, then standing down
    for (let dir = 0; dir < 2; dir++) {
      let horizontal = (dir === 0);

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {

          let squares = getShipSquares(row, col, size, horizontal);
          let fits = true;
          let coversHits = 0;

          // check every square this placement would use
          for (let i = 0; i < squares.length; i++) {
            let r = squares[i].row;
            let c = squares[i].col;
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
              fits = false;     // off the grid
              break;
            }
            let note = botKnows[r][c];
            if (note === KNOWN_MISS || note === KNOWN_SUNK) {
              fits = false;     // can't sit on a miss or a sunk ship
              break;
            }
            if (note === KNOWN_HIT) {
              coversHits++;     // it lines up with a square we already hit
            }
          }

          if (fits === false) { continue; }

          // a placement that covers a live hit is much more interesting
          let points = 1;
          if (coversHits > 0) {
            points = coversHits * LOCK_ON_BONUS;
          }

          // add points to the squares we have NOT shot at yet
          for (let i = 0; i < squares.length; i++) {
            let r = squares[i].row;
            let c = squares[i].col;
            if (botKnows[r][c] === UNKNOWN) {
              heat[r][c] = heat[r][c] + points;
            }
          }
        }
      }
    }
  }
  return heat;
}

/* pick the highest-scoring square to shoot at (break ties randomly) */
function botChooseTarget() {
  let heat = buildHeatMap();
  let bestScore = -1;
  let bestSquares = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (botKnows[row][col] !== UNKNOWN) { continue; } // already shot here
      if (heat[row][col] > bestScore) {
        bestScore = heat[row][col];
        bestSquares = [{ row: row, col: col }];
      } else if (heat[row][col] === bestScore) {
        bestSquares.push({ row: row, col: col });
      }
    }
  }

  let pick = Math.floor(Math.random() * bestSquares.length);
  return bestSquares[pick];
}

function botTurn() {
  if (phase !== "battle") { return; }

  let target = botChooseTarget();
  let row = target.row;
  let col = target.col;

  if (playerBoard[row][col] === SHIP) {
    playerBoard[row][col] = HIT;
    botKnows[row][col] = KNOWN_HIT;
    botHits++;
    let ship = findShipAt(playerShips, row, col);
    ship.hits++;
    if (ship.hits === ship.size) {
      ship.sunk = true;
      markShipSunk(playerBoard, ship);
      // tell the computer those squares are now sunk
      for (let i = 0; i < ship.squares.length; i++) {
        botKnows[ship.squares[i].row][ship.squares[i].col] = KNOWN_SUNK;
      }
      removeOneValue(enemyShipSizesLeft, ship.size);
      setStatus("The computer sank your " + ship.name + "! Your turn.");
    } else {
      setStatus("The computer hit your fleet at row " + (row + 1) + ", column " + (col + 1) + ". Your turn.");
    }
  } else {
    playerBoard[row][col] = MISS;
    botKnows[row][col] = KNOWN_MISS;
    setStatus("The computer fired at row " + (row + 1) + ", column " + (col + 1) + " and missed. Your turn.");
  }

  drawPlayerBoard();
  drawFleet(playerFleetEl, playerShips, false);

  if (botHits === TOTAL_HITS) {
    endGame(false);
    return;
  }
  busy = false;   // your turn again
}


/* ============================================================
   STARTING AND ENDING THE GAME
   ============================================================ */
function startBattle() {
  if (getNextShipToPlace() !== null) {
    setStatus("Place all of your ships first.");
    return;
  }

  phase = "battle";

  // give the computer a random fleet on its own grid
  enemyBoard = makeGrid(EMPTY);
  enemyShips = [];
  placeShipsRandomly(enemyBoard, enemyShips);

  // reset the computer's notes about your grid
  botKnows = makeGrid(UNKNOWN);
  enemyShipSizesLeft = [];
  for (let s = 0; s < FLEET.length; s++) {
    enemyShipSizesLeft.push(FLEET[s].size);
  }

  playerHits = 0;
  botHits = 0;
  busy = false;

  drawEnemyBoard(false);
  drawFleet(enemyFleetEl, enemyShips, false);
  drawFleet(playerFleetEl, playerShips, false);

  showPlacementButtons(false);
  instructionsEl.textContent = "Battle! Click the right grid to fire at the enemy.";
  setStatus("Your turn. Take a shot.");
}

function endGame(playerWon) {
  phase = "over";
  busy = false;
  drawEnemyBoard(true);   // reveal where their ships were
  if (playerWon) {
    setStatus("You win! Every enemy ship has been sunk.");
  } else {
    setStatus("You lose. Your whole fleet was sunk. Press \"New game\" to try again.");
  }
}

/* show the placement buttons, or swap them for the New game button */
function showPlacementButtons(show) {
  let display = "none";
  if (show) { display = "inline-block"; }
  rotateBtn.style.display = display;
  randomBtn.style.display = display;
  resetBtn.style.display = display;
  startBtn.style.display = display;

  if (show) {
    newGameBtn.style.display = "none";
  } else {
    newGameBtn.style.display = "inline-block";
  }
}

/* set everything back to the start (the placing phase) */
function newGame() {
  phase = "placing";
  currentHorizontal = true;

  playerBoard = makeGrid(EMPTY);
  enemyBoard = makeGrid(EMPTY);
  playerShips = [];
  enemyShips = [];
  playerHits = 0;
  botHits = 0;
  busy = false;

  buildBoard(playerBoardEl, "player");
  buildBoard(enemyBoardEl, "enemy");
  drawPlayerBoard();
  drawEnemyBoard(false);
  drawFleet(playerFleetEl, playerShips, true);
  drawFleet(enemyFleetEl, enemyShips, true);

  showPlacementButtons(true);
  updatePlacementMessage();
  setStatus("Arrange your ships, then start the battle.");
}


/* ============================================================
   CONNECT THE BUTTONS AND GRIDS, THEN START
   ============================================================ */
playerBoardEl.addEventListener("click", onPlayerClick);
playerBoardEl.addEventListener("mouseover", onPlayerHover);
playerBoardEl.addEventListener("mouseleave", onPlayerLeave);
enemyBoardEl.addEventListener("click", onEnemyClick);

rotateBtn.addEventListener("click", onRotateClick);
randomBtn.addEventListener("click", onRandomClick);
resetBtn.addEventListener("click", onResetClick);
startBtn.addEventListener("click", startBattle);
newGameBtn.addEventListener("click", newGame);

newGame();