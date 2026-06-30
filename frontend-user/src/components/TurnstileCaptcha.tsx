import React, { useEffect, useRef, useState } from 'react';

interface TurnstileCaptchaProps {
  onVerify: (token: string | null) => void;
  theme?: 'light' | 'dark' | 'auto';
}

interface TurnstileWindow extends Window {
  turnstile?: {
    render: (
      element: HTMLElement,
      options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
      }
    ) => string;
    remove: (widgetId: string) => void;
  };
}

const TurnstileCaptcha: React.FC<TurnstileCaptchaProps> = ({ onVerify, theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
    const win = window as unknown as TurnstileWindow;

    const renderWidget = () => {
      if (win.turnstile && containerRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = win.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onVerify(token);
              setError(null);
            },
            'expired-callback': () => {
              onVerify(null);
            },
            theme: theme,
          });
        } catch (e) {
          console.error('Failed to render Turnstile widget', e);
          setError('Failed to load captcha. Please refresh the page.');
        }
      }
    };

    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (win.turnstile) {
      renderWidget();
    } else {
      // Poll until win.turnstile is available
      intervalId = setInterval(() => {
        if (win.turnstile) {
          clearInterval(intervalId);
          renderWidget();
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current !== null && win.turnstile) {
        try {
          win.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.error('Failed to remove Turnstile widget', e);
        }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, theme]);

  return (
    <div className="turnstile-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0' }}>
      <div ref={containerRef} className="turnstile-widget"></div>
      {error && <span className="form-error" style={{ textAlign: 'center' }}>{error}</span>}
    </div>
  );
};

export default TurnstileCaptcha;
