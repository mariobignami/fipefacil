import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableSelect from './SearchableSelect.jsx';

describe('SearchableSelect', () => {
  const mockOptions = [
    { code: 1, name: 'Honda' },
    { code: 2, name: 'Toyota' },
    { code: 3, name: 'Ford' },
    { code: 4, name: 'Chevrolet' },
    { code: 5, name: 'Volkswagen' }
  ];

  it('renders with placeholder', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value=""
        onChange={handleChange}
        options={mockOptions}
        disabled={false}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('placeholder', 'Select an option');
  });

  it('displays selected value', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value="2"
        onChange={handleChange}
        options={mockOptions}
        disabled={false}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    expect(input.value).toBe('Toyota');
  });

  it('opens dropdown on click', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value=""
        onChange={handleChange}
        options={mockOptions}
        disabled={false}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
  });

  it('filters options based on search term', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value=""
        onChange={handleChange}
        options={mockOptions}
        disabled={false}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'vol' } });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Volkswagen');
  });

  it('calls onChange with selected value', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value=""
        onChange={handleChange}
        options={mockOptions}
        disabled={false}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    const toyotaOption = screen.getByText('Toyota');
    fireEvent.click(toyotaOption);

    expect(handleChange).toHaveBeenCalledWith('2');
  });

  it('shows no results message when no matches', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value=""
        onChange={handleChange}
        options={mockOptions}
        disabled={false}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'xyz' } });

    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
  });

  it('does not open when disabled', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        id="test"
        value=""
        onChange={handleChange}
        options={mockOptions}
        disabled={true}
        placeholder="Select an option"
        label="Test Label"
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
