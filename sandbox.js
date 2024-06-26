// set grid rows and columns and the size of each square
let rows = 10;
let cols = 10;
let squareSize = 50;

let enemyHits = 0
// get the container element
let gameBoardContainer = document.getElementById("gameboard");
let gameBoardContainer2 = document.getElementById("gameboard2");

let yOffSet = 0;   
let gameOver = false


// make the grid columns and rows
for (i = 0; i < cols; i++) {
	for (j = 0; j < rows; j++) {
		
		// create a new div HTML element for each grid square and make it the right size
		let square = document.createElement("div");
		gameBoardContainer.appendChild(square);

    // give each div element a unique id based on its row and column, like "s00"
		square.id = 's' + j + i;			
		
		// set each grid square's coordinates: multiples of the current row or column number
		let topPosition = j * squareSize;
		let leftPosition = i * squareSize;			
		
		// use CSS absolute positioning to place each grid square on the page
		square.style.top = topPosition + 'px';
		square.style.left = leftPosition + 'px';		
        
        //console.log(topPosition);
	}
}

for (i = 0; i < cols; i++) {
	for (j = 0; j < rows; j++) {
		
		// create a new div HTML element for each grid square and make it the right size
		let square = document.createElement("div"); 
		gameBoardContainer2.appendChild(square); 

    // give each div element a unique id based on its row and column, like "s00"
		square.id = 'b' + j + i;
		//console.log(square.id)			
		
		// set each grid square's coordinates: multiples of the current row or column number
		let topPosition = j * squareSize;
		let leftPosition = i * squareSize;			
		
		// use CSS absolute positioning to place each grid square on the page
		square.style.top = topPosition + yOffSet + 'px';
		square.style.left = leftPosition + 'px';			
	}
}

/* lazy way of tracking when the game is won: just increment hitCount on every hit
   in this version, and according to the official Hasbro rules (http://www.hasbro.com/common/instruct/BattleShip_(2002).PDF)
   there are 17 hits to be made in order to win the game:
      Carrier     - 5 hits
      Battleship  - 4 hits
      Destroyer   - 3 hits
      Submarine   - 3 hits
      Patrol Boat - 2 hits
*/
let hitCount = 0;

/* create the 2d array that will contain the status of each square on the board
   and place ships on the board (later, create function for random placement!)

   0 = empty, 1 = part of a ship, 2 = a sunken part of a ship, 3 = a missed shot
*/


let gameBoard = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,0,0,0],
    [0,0,0,0,0,0,1,0,0,0],
    [1,0,0,0,0,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0],
    [1,0,0,1,0,0,0,0,0,0],
    [1,0,0,1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0,0]
    ]

let gameBoard2 = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,0,0,0],
    [0,0,0,0,0,0,1,0,0,0],
    [1,0,0,0,0,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0],
    [1,0,0,1,0,0,0,0,0,0],
    [1,0,0,1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0,0]
    ]

// set event listener for all elements in gameboard, run fireTorpedo function when square is clicked
gameBoardContainer.addEventListener("click", fireTorpedo, false);

// initial code via http://www.kirupa.com/html5/handling_events_for_many_elements.htm:
function fireTorpedo(e) {
	if(gameOver){
		return
	}
    // if item clicked (e.target) is not the parent element on which the event listener was set (e.currentTarget)
	if (e.target !== e.currentTarget) {
        // extract row and column # from the HTML element's id
		let row = e.target.id.substring(1,2);
		let col = e.target.id.substring(2,3);
        //alert("Clicked on row " + row + ", col " + col);
				
		// if player clicks a square with no ship, change the color and change square's value
		if (gameBoard[row][col] == 0) {
			e.target.style.background = '#bbb';
			// set this square's value to 3 to indicate that they fired and missed
			gameBoard[row][col] = 3;
			enemyTurn()
		// if player clicks a square with a ship, change the color and change square's value
		} 
		else if (gameBoard[row][col] == 1) {
			e.target.style.background = 'red';
			// set this square's value to 2 to indicate the ship has been hit
			gameBoard[row][col] = 2;
			
			// increment hitCount each time a ship is hit
			hitCount++;
			// this definitely shouldn't be hard-coded, but here it is anyway. lazy, simple solution:
			if (hitCount == 17) {
				alert("All enemy battleships have been defeated! You win!");
			}
			
		// if player clicks a square that's been previously hit, let them know
		} 
		else if (gameBoard[row][col] > 1) {
			alert("Stop wasting your torpedos! You already fired at this location.");
		}		
    }
    e.stopPropagation();
}

function enemyTurn(){
	let col = Math.floor(Math.random() * gameBoard2[0].length-1)+1;
	let row = Math.floor(Math.random() * gameBoard2.length-1)+1;
	//let row = 0, col = 0
	let e = document.getElementById(`${'b'+row+col}`)
	//let e = cellE[row][col]
	console.log(`${'b'+row+col}`)
	if (gameBoard2[row][col] == 0) {
			e.style.background = '#bbb';
			gameBoard2[row][col] = 3;
			
		} 
	else if (gameBoard2[row][col] == 1) {
		e.style.background = 'red';
		gameBoard2[row][col] = 2;
		enemyHits++
		if(enemyHits == 17){
			gameOver = true
			alert("Enemy won")
		}
		else{
			enemyTurn()
		}
	} 
	else if (gameBoard2[row][col] > 1) {
		enemyTurn()
	}	
}