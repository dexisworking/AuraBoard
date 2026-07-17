import './primitives.css';

/**
 * ErrorState — micro-caps failure message with an optional brutal retry button.
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="ab-state">
      <p className="ab-state-message">
        <span className="ab-state-flag">Error — </span>
        {message}
      </p>
      {onRetry && (
        <button type="button" className="ab-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
