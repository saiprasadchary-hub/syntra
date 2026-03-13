import React, { useEffect, useRef } from 'react';
import { useIDE } from '../context/IDEContext';

export default function LivePreview() {
  const { state } = useIDE();
  const iframeRef = useRef(null);

  const htmlFile = state.files['index.html'];
  const cssFile = state.files['style.css'];
  const jsFile = state.files['app.js'];

  useEffect(() => {
    if (!iframeRef.current) return;

    let html = htmlFile?.content || '';
    const css = cssFile?.content || '';
    const js = jsFile?.content || '';

    // Inject CSS and JS inline
    if (css) {
      html = html.replace(
        /<link[^>]+href=["']style\.css["'][^>]*>/gi,
        `<style>${css}</style>`
      );
      if (!html.includes(css)) {
        html = html.replace('</head>', `<style>${css}</style></head>`);
      }
    }
    if (js) {
      html = html.replace(
        /<script[^>]+src=["']app\.js["'][^>]*><\/script>/gi,
        `<script>${js}</script>`
      );
      if (!html.includes('</script>')) {
        html = html.replace('</body>', `<script>${js}</script></body>`);
      }
    }

    // Add base styling reset
    html = html.replace('<head>', `<head><base target="_blank">`);

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [htmlFile?.content, cssFile?.content, jsFile?.content]);

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        Live Preview
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          index.html
        </span>
      </div>
      <iframe
        ref={iframeRef}
        className="preview-iframe"
        sandbox="allow-scripts"
        title="Live Preview"
      />
    </div>
  );
}
