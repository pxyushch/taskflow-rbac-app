
import React from 'react';

export default function TaskFilterBar({ onSearch, onFilterChange }) {
  return (
    <div className="filter-bar">
      <input type="text" placeholder="Search tasks..." onChange={(e) => onSearch(e.target.value)} />
    </div>
  );
}
