import { useEffect, useState, useRef, useCallback } from 'react';
import { getMatchComments, postMatchComment, getMentionSuggestions } from '@/lib/api';
import type { CommentResponse } from '@/lib/api';
import { getUser } from '@/lib/auth';

/**
 * Renders comment content with @mentions highlighted in accent color.
 */
function CommentBubble({ content, mentions }: { content: string; mentions: string[] }) {
  if (!mentions || mentions.length === 0) {
    return <div className="chat-bubble">{content}</div>;
  }

  // Split the content into text parts and mention parts
  const mentionRegex = /@([\w-]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionedUser = match[1];
    if (lastIndex < match.index) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const isValid = mentions.includes(mentionedUser);
    parts.push(
      <span key={match.index}
        className={isValid ? 'mention-tag' : 'mention-tag-invalid'}>
        @{mentionedUser}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <div className="chat-bubble">{parts}</div>;
}

export default function MatchComments({ matchId }: { matchId: number }) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1); // caret position where @ was typed

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const me = getUser();

  useEffect(() => {
    if (expanded) loadComments();
  }, [expanded, matchId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, expanded]);

  // Fetch suggestions whenever mentionQuery changes
  useEffect(() => {
    if (!showDropdown) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await getMentionSuggestions(mentionQuery);
        // Remove self from suggestions
        setSuggestions(results.filter(u => u !== me?.username));
        setActiveSuggestion(0);
      } catch {
        setSuggestions([]);
      }
    }, 150); // debounce
    return () => clearTimeout(timeout);
  }, [mentionQuery, showDropdown]);

  async function loadComments() {
    setLoading(true);
    try {
      setComments(await getMatchComments(matchId));
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
    }
  }

  /**
   * On every keystroke: detect if cursor is inside an @mention token.
   * If yes, open the dropdown with the partial username as query.
   */
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const caret = e.target.selectionStart ?? val.length;
    setText(val);

    // Find the last @ before the caret that isn't preceded by a word character
    const before = val.slice(0, caret);
    const atMatch = before.match(/(^|[\s])@([\w-]*)$/);

    if (atMatch) {
      const query = atMatch[2];
      setMentionStart(caret - query.length - 1); // position of @
      setMentionQuery(query);
      setShowDropdown(true);
    } else {
      closeDropdown();
    }
  }

  /**
   * Keyboard navigation for the dropdown:
   * ↑/↓ to move, Enter to confirm, Escape to dismiss.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (showDropdown && suggestions[activeSuggestion]) {
        e.preventDefault();
        insertMention(suggestions[activeSuggestion]);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  }

  /**
   * Inserts the chosen username, replacing the @partial text the user typed.
   */
  function insertMention(username: string) {
    const caret = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart); // text before the @
    const after   = text.slice(caret);           // text after cursor
    const inserted = `@${username} `;
    const newText = before + inserted + after;
    setText(newText);
    closeDropdown();

    // Move caret to after the inserted mention
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + inserted.length;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  }

  function closeDropdown() {
    setShowDropdown(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    closeDropdown();
    try {
      const posted = await postMatchComment(matchId, text.trim());
      setComments(prev => [...prev, posted]);
      setText('');
    } catch {
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (!expanded) {
    return (
      <div className="chat-toggle">
        <button className="btn-ghost-sm w-full" onClick={() => setExpanded(true)}>
          💬 Chat
        </button>
      </div>
    );
  }

  return (
    <div className="chat-section fade-in">
      <div className="chat-header">
        <span className="chat-title">💬 Match Banter</span>
        <button className="chat-close" onClick={() => setExpanded(false)}>✕</button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {loading ? (
          <div className="chat-loading">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="chat-empty">No banter yet. Start the conversation!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="chat-message fade-up">
              <div className="chat-meta">
                <span className="chat-user">{c.username}</span>
                <span className="chat-time">{formatTime(c.createdAt)}</span>
              </div>
              <CommentBubble content={c.content} mentions={c.mentions ?? []} />
            </div>
          ))
        )}
      </div>

      {/* Input form with @mention autocomplete */}
      <div style={{ position: 'relative' }}>
        {/* Mention dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="mention-dropdown" ref={dropdownRef}>
            {suggestions.map((name, i) => (
              <div
                key={name}
                className={`mention-option${i === activeSuggestion ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
                onMouseEnter={() => setActiveSuggestion(i)}
              >
                <span className="mention-at">@</span>
                <span className="mention-name">{name}</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handlePost} className="chat-form">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Type your banter... use @ to mention"
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(closeDropdown, 150)}
            maxLength={1000}
          />
          <button type="submit" className="chat-send" disabled={submitting || !text.trim()}>
            {submitting ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
