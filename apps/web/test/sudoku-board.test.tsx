import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SudokuBoard } from '../components/sudoku-board';

describe('SudokuBoard', () => {
  it('disables given cells', () => {
    render(
      <SudokuBoard
        board="134678912672195348198342567859761423426853791713924856961537284287419635345286179"
        givens="134678912672195348198342567859761423426853791713924856961537284287419635345286179"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('cell-0')).toBeDisabled();
  });

  it('sanitizes editable input to a single digit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SudokuBoard
        board="034678912672195348198342567859761423426853791713924856961537284287419635345286179"
        givens="034678912672195348198342567859761423426853791713924856961537284287419635345286179"
        onChange={onChange}
      />,
    );

    await user.type(screen.getByTestId('cell-0'), 'a5');

    expect(onChange).toHaveBeenLastCalledWith(0, '5');
  });
});
