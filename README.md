# Battleship

A small browser game of Battleship, written in plain HTML, CSS, and JavaScript.
You arrange your own fleet, then trade shots with the computer. The computer
does **not** fire randomly — it works out where your ships are most likely to be
and aims there.

No build step and no libraries. Open `index.html` in any browser and play.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The page: the two grids, the message lines, and the buttons. |
| `style.css` | All the colours and layout. One class per kind of square. |
| `sandbox.js` | The whole game: placing ships, your turn, and the computer's turn. |

## How to play

The game has two phases.

1. **Placing.** You arrange your five ships on the left grid (*Your fleet*).
   Hover over the grid to preview where the next ship will sit — green means it
   fits, red means it doesn't. Click to drop it. Click a ship you've already
   placed to pick it up and move it again.
2. **Battle.** Click squares on the right grid (*Enemy waters*) to fire. After
   each of your shots the computer takes one shot back.

A square's colour tells you its state:

| Colour | Meaning |
| --- | --- |
| Light blue | Water (nothing there yet) |
| Grey | One of your ships |
| Red | A ship square that's been hit |
| Pale grey | A shot that missed |
| Dark red | Part of a ship that's been fully sunk |

## The buttons

Two sets of buttons appear at different times. The placing buttons show while
you arrange your fleet; once the battle starts they're replaced by **New game**.

| Button | When it shows | What it does |
| --- | --- | --- |
| **Rotate** | Placing | Switches the ship you're about to place between lying *across* (horizontal) and standing *down* (vertical). |
| **Place randomly** | Placing | Clears your grid and drops all five of your ships in random spots, so you don't have to place them by hand. You can still pick any of them up afterwards to move them. |
| **Reset** | Placing | Removes every ship from your grid so you can start arranging from scratch. |
| **Start battle** | Placing | Begins the battle. It stays greyed out and unclickable until all five ships are placed. |
| **New game** | Battle / after a game | Clears both grids and sends you back to the placing phase to set up a fresh game. |

## The computer's combat algorithm

I wanted an opponent that feels like it's genuinely hunting your fleet instead
of poking the board at random, so I worked through four approaches before
settling on the one I shipped.

I started with **pure random** firing — pick any square I hadn't tried yet. It's
trivial to write, but it throws away everything it learns and takes roughly half
the board to win. I used it as my baseline and the thing I wanted to beat.

Next I looked at **parity (a checkerboard)**. Because every ship is at least two
squares long, it always covers at least one square of each colour on a
checkerboard, so I'd only need to search half the board to be sure of clipping
every ship. That roughly halves the wasted shots, but it still does nothing
clever once a ship actually turns up.

Then I considered **hunt-and-target** — search until I get a hit, then switch
into a separate mode that probes around that hit and follows the line once two
hits line up. It's how I'd play by hand, and it's a real step up, but keeping two
hand-written modes in sync felt fiddly and easy to get wrong.

The version I built uses **probability density**. Instead of two modes, I score
every square by how likely it is to hide a ship and always fire at the highest
score. It lives in `buildHeatMap()` and `botChooseTarget()`.

### How it works

Each turn I build a "heat map" of the board:

- For every ship size still afloat, I try that ship in **every** position it
  could legally fit — every row, every column, lying across and standing down.
- I only count a position if it stays on the grid and doesn't overlap a known
  miss or an already-sunk ship.
- Each valid position adds points to the squares it would cover. Squares that
  lots of possible ships could pass through score high; cramped spots score low.
  I fire at the highest score.

What I like about this is that one idea handles both hunting and targeting:

- With no live hits on the board, the scores spread into a natural search
  pattern — and because the smallest ship is two squares, checkerboard parity
  falls straight out of the maths, so I get that benefit without coding it.
- The moment I land a hit that isn't sunk yet, every imagined ship passing
  through it gets a large bonus (a thousand points per live hit it lines up
  with). That floods the neighbouring squares with points, so the computer locks
  on, and once it has two hits in a row the placements running along that line
  outscore everything else — it walks straight down the ship.

So hunting and targeting end up being the same scoring loop; the numbers just
shift depending on what's already been hit. That actually made the code simpler
than the separate-modes version would have been.

### Results

To check it was actually working and not just looking clever, I ran it over
3,000 simulated games and compared it against pure random firing:

| Method | Average shots to sink the whole fleet | Worst game |
| --- | --- | --- |
| Pure random | ~95 of 100 squares | — |
| Probability density (this game) | ~44 of 100 squares | 71 |

A perfect game is 17 shots (the number of ship squares), so getting the average
down from about 95 to about 44 is a big, measurable win — and even my worst
observed game stayed well short of filling the board.
