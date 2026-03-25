import React, { useState, useEffect, useRef } from 'react';

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  placeholder,
  label
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display text for selected value
  const selectedOption = options.find(opt => String(opt.code) === String(value));
  const displayText = selectedOption ? selectedOption.name : '';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement && highlightedElement.scrollIntoView) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  function handleInputClick() {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm('');
    }
  }

  function handleInputChange(e) {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  }

  function handleOptionClick(option) {
    onChange(String(option.code));
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;

      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  }

  return (
    <div className="searchable-select" ref={containerRef}>
      <div className="searchable-select-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="searchable-select-input"
          value={isOpen ? searchTerm : displayText}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          role="combobox"
        />
        <div className="searchable-select-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8">
            <path fill="currentColor" d="M1.41 0L6 4.59 10.59 0 12 1.41l-6 6-6-6z"/>
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          className="searchable-select-dropdown"
          role="listbox"
          aria-label={label}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={option.code}
                className={`searchable-select-option ${index === highlightedIndex ? 'highlighted' : ''} ${String(option.code) === String(value) ? 'selected' : ''}`}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={String(option.code) === String(value)}
              >
                {option.name}
              </li>
            ))
          ) : (
            <li className="searchable-select-no-results">
              Nenhum resultado encontrado
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
