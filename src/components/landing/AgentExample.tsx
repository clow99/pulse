'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

const example = `const response = await fetch(
  '/api/agent/reports/generate',
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${PULSE_AGENT_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      siteId,
      reports: ['overview', 'uptime_summary']
    })
  }
);

const report = await response.json();`;

export function AgentExample() {
  const [status, setStatus] = useState('');
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(example);
      setStatus('Example copied');
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeRef.current!);
      selection?.removeAllRanges();
      selection?.addRange(range);
      setStatus('Select and copy the highlighted example.');
      codeRef.current?.focus();
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), 5000);
  }

  return (
    <div className={styles.codePanel}>
      <div className={styles.codePanelHeader}>
        <span>
          <i />
          report.ts<span className={styles.codeLanguage}>REST API</span>
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy report request example"
        >
          {status === 'Example copied' ? 'Copied ✓' : 'Copy example'}
        </button>
      </div>
      <pre
        className={styles.codeBlock}
        tabIndex={0}
        aria-label="Example authenticated report request"
      >
        <code ref={codeRef} tabIndex={-1}>
          {example}
        </code>
      </pre>
      <div className={styles.scopeBar}>
        <span>Required scopes</span>
        <code>reports:generate</code>
        <code>analytics:read</code>
        <code>uptime:read</code>
      </div>
      <p className={styles.copyStatus} role="status">
        {status}
      </p>
    </div>
  );
}
