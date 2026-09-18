import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { HOWTO_BOT_NAME, HOWTO_STARTER_QUESTIONS } from '../config/howtoKnowledge';
import { answerHowTo } from '../utils/howtoBot';

function BotMascot({ size = 56 }) {
  return (
    <svg
      className="howto-bot-mascot"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="32" cy="58" rx="16" ry="3.2" fill="rgba(0,0,0,0.18)" />
      <circle cx="18" cy="16" r="7.5" fill="#7EB6F7" />
      <circle cx="46" cy="16" r="7.5" fill="#7EB6F7" />
      <circle cx="32" cy="34" r="22" fill="#5BA3F5" />
      <circle cx="32" cy="36" r="16.5" fill="#F4FBFF" />
      <rect x="21.5" y="31" width="7.5" height="9" rx="2.4" fill="#1E3A5F" />
      <rect x="35" y="31" width="7.5" height="9" rx="2.4" fill="#1E3A5F" />
      <path d="M28.5 44.5 L35 47.5 L28.5 50.5" stroke="#2F6FB3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function BotMessage({ text, related, onAsk }) {
  return (
    <div className="howto-bot-msg howto-bot-msg-bot">
      <BotMascot size={28} />
      <div className="howto-bot-bubble">
        <p>{text}</p>
        {related?.length > 0 && (
          <div className="howto-bot-related">
            {related.map((question) => (
              <button
                key={question}
                type="button"
                className="howto-bot-chip"
                onClick={() => onAsk(question)}
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HowToBot({ onOpenGuide }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'bot',
      text: `Hi, I'm ${HOWTO_BOT_NAME}. Ask a how-to question about renaming exhibits, presets, or keeping files local.`,
      related: HOWTO_STARTER_QUESTIONS,
    },
  ]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const ask = (raw) => {
    const question = String(raw || '').trim();
    if (!question) return;
    const stamp = Date.now();
    const result = answerHowTo(question);
    setMessages((prev) => [
      ...prev,
      { id: `u-${stamp}`, role: 'user', text: question },
      {
        id: `b-${stamp}`,
        role: 'bot',
        text: result.answer,
        related: result.related,
      },
    ]);
    setDraft('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    ask(draft);
  };

  return (
    <div className={`howto-bot ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="howto-bot-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `Close ${HOWTO_BOT_NAME}` : `Ask ${HOWTO_BOT_NAME} a how-to question`}
        title={open ? `Close ${HOWTO_BOT_NAME}` : `Ask ${HOWTO_BOT_NAME} a how-to question`}
      >
        <BotMascot size={58} />
      </button>

      {open && (
        <section
          id={panelId}
          className="howto-bot-panel"
          role="dialog"
          aria-label={`${HOWTO_BOT_NAME} how-to help`}
        >
          <header className="howto-bot-header">
            <div className="howto-bot-header-copy">
              <strong>{HOWTO_BOT_NAME}</strong>
              <span>How-to answers · stays on this device</span>
            </div>
            <button
              type="button"
              className="howto-bot-close"
              onClick={() => setOpen(false)}
              aria-label="Close how-to help"
            >
              <X size={14} />
            </button>
          </header>

          <div className="howto-bot-thread" ref={listRef}>
            {messages.map((message) => (
              message.role === 'bot' ? (
                <BotMessage
                  key={message.id}
                  text={message.text}
                  related={message.related}
                  onAsk={ask}
                />
              ) : (
                <div key={message.id} className="howto-bot-msg howto-bot-msg-user">
                  <div className="howto-bot-bubble">{message.text}</div>
                </div>
              )
            ))}
          </div>

          <form className="howto-bot-composer" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask how to…"
              aria-label="How-to question"
            />
            <button type="submit" className="howto-bot-send" aria-label="Send question" disabled={!draft.trim()}>
              →
            </button>
          </form>

          {onOpenGuide && (
            <button type="button" className="howto-bot-guide-link" onClick={onOpenGuide}>
              Open full How to Use guide
            </button>
          )}
        </section>
      )}
    </div>
  );
}
