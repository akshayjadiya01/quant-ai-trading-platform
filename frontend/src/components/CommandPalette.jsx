import { useEffect, useState } from 'react';
import '../styles/components.css';
import './CommandPalette.css';

export default function CommandPalette({ visible, onClose, onExecute }) {
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState(0);

  const commands = [
    { id: 'predict', label: 'Run Prediction' },
    { id: 'signal', label: 'Get Trade Signal' },
    { id: 'paper', label: 'Run Paper Trading' },
    { id: 'history', label: 'Show Price History' },
  ];

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelection(0);
    }
  }, [visible]);

  useEffect(() => {
    function onKey(e) {
      if (!visible) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        setSelection((s) => Math.min(s + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        setSelection((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter') {
        const cmd = filtered[selection];
        if (cmd) handleExecute(cmd.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  function handleExecute(id) {
    onExecute && onExecute(id);
    onClose && onClose();
  }

  if (!visible) return null;

  return (
    <div className="cp-overlay" onMouseDown={onClose}>
      <div className="cp-window" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cp-input"
          placeholder="Type a command (e.g. 'predict', 'AAPL')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cp-list">
          {filtered.length === 0 && (
            <div className="cp-item empty">No commands</div>
          )}
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`cp-item ${i === selection ? 'active' : ''}`}
              onClick={() => handleExecute(c.id)}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
