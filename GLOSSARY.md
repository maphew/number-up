# Number, Up

A one-board arithmetic walk: you are the Number, you step across a map of
numbers and signs, and every touch runs the superposition of you and what
you stepped on.

## Language

**Board overlay**:
Everything written onto the map during a run and shown as if it had always
been there: a swapped-in Number, cleared ground, a pit, a floor. One truth
per cell, written in move order — the last write at a cell wins.
_Avoid_: matter (one of the merged machines), collapse state (the other one)

**Pit**:
A cell where a Number was eaten — spelled `∅` in the map data. Nothing can
walk there for the rest of the run, not even you after you have left it.
_Avoid_: hole (half in the code), removed tile

**Floor**:
What a tile-vanish husk looks like once a vanished tile stops being a tile —
spelled `floor` in the map data. Unlike a pit, a floor is walkable.
_Avoid_: spent cell, collapsed tile
