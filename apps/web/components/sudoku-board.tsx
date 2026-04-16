'use client';

type SudokuBoardProps = {
  givens: string;
  board: string;
  onChange: (index: number, value: string) => void;
};

export function SudokuBoard({ givens, board, onChange }: SudokuBoardProps) {
  return (
    <div className="board-shell" data-testid="sudoku-board">
      <div className="sudoku-grid" role="grid" aria-label="Sudoku board">
        {board.split('').map((value, index) => {
          const row = Math.floor(index / 9);
          const column = index % 9;
          const isGiven = givens[index] !== '0';
          const displayValue = value === '0' ? '' : value;
          const classes = [
            'sudoku-cell',
            isGiven ? 'given' : 'editable',
            row % 3 === 0 ? 'thick-top' : '',
            column % 3 === 0 ? 'thick-left' : '',
            row === 8 ? 'thick-bottom' : '',
            column === 8 ? 'thick-right' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <input
              key={index}
              aria-label={`Row ${row + 1}, Column ${column + 1}`}
              className={classes}
              data-testid={`cell-${index}`}
              disabled={isGiven}
              inputMode="numeric"
              maxLength={1}
              pattern="[1-9]"
              type="text"
              value={displayValue}
              onChange={(event) => {
                const nextValue = event.target.value.replace(/[^1-9]/g, '').slice(-1);
                onChange(index, nextValue);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
