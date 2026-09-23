import React from 'react';
import css from '../dsh.module.css';

export default function UserMessage({ text }) {
  return (
    <div className={css.userRow}>
      <div className={css.userStack}>
        <div className={css.bubble}>{text}</div>
      </div>
    </div>
  );
}
