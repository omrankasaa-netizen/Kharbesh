import React from 'react';

/**
 * Last-resort catch for render errors anywhere in the route tree. Without
 * this, an uncaught error (a bad API response shape, a null-ref in a page
 * component, etc.) unmounts the whole React tree and the visitor sees a
 * blank white screen with no way forward except guessing to hit refresh.
 * `lazyRetry` (src/lib/lazyRetry.js) already handles the specific "stale
 * chunk after deploy" case by reloading automatically; this boundary is the
 * catch-all for everything else, and gives people an explicit reload
 * action instead of a dead page.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[RouteErrorBoundary] caught render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex items-center justify-center px-6"
          style={{ background: 'var(--background)' }}
        >
          <div className="max-w-sm text-center">
            <p
              className="font-heading text-xl uppercase tracking-wide"
              style={{ fontFamily: 'var(--brand-font-heading)' }}
            >
              Something glitched
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Fi shi ghalat — bas 3ade. Tap below to reload.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="kh-btn-text mt-4"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
