import type { InputHTMLAttributes } from 'react';

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: '1.05rem',
  padding: '0.6em 0.8em',
  background: 'rgba(244, 228, 188, 0.1)',
  border: '1px solid var(--color-parchment-dark)',
  color: 'var(--color-parchment)',
  outline: 'none',
  width: '100%',
};

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input style={inputStyle} {...props} />;
}
