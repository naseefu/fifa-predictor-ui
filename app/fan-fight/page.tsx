'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Navbar from '@/components/Navbar';
import { getToken, getUser, isLoggedIn } from '@/lib/auth';
import { getMentionSuggestions, toggleFanFightPush, getFanFightPushStatus } from '@/lib/api';

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'http://localhost:4000';

interface FanFightMsg {
  id: number;
  username: string;
  content: string;
  mentions: string[];
  created_at: string;
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ChatBubble({ content, mentions }: { content: string; mentions: string[] }) {
  if (!mentions || mentions.length === 0) {
    return <div className="ff-bubble">{content}</div>;
  }
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
      <span key={match.index} className={isValid ? 'mention-tag' : 'mention-tag-invalid'}>
        @{mentionedUser}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return <div className="ff-bubble">{parts}</div>;
}

export default function FanFightRoom() {
  const router = useRouter();
  const [messages, setMessages] = useState<FanFightMsg[]>([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Settings
  const [pushEnabled, setPushEnabled] = useState(true);

  // Mention State
  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  const me = getUser();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    initRoom();
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mention debounce
  useEffect(() => {
    if (!showDropdown || mentionQuery.length === 0) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await getMentionSuggestions(mentionQuery);
        setSuggestions(results.filter(u => u !== me?.username));
        setActiveSuggestion(0);
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [mentionQuery, showDropdown]);

  async function initRoom() {
    try {
      // 1. Fetch push status
      const status = await getFanFightPushStatus();
      setPushEnabled(status);

      // 2. Load historical messages from Node backend
      const res = await fetch(`${CHAT_URL}/messages`);
      if (res.ok) {
        const history = await res.json();
        setMessages(history);
      }

      // 3. Connect Socket.io
      const token = getToken();
      const s = io(CHAT_URL, {
        auth: { token },
      });

      s.on('connect', () => console.log('Connected to Fan Fight'));
      s.on('newMessage', (msg: FanFightMsg) => setMessages(prev => [...prev, msg]));
      s.on('chatCleared', () => setMessages([]));

      setSocket(s);
    } catch (e) {
      console.error('Failed to init Fan Fight', e);
    }
  }

  async function togglePush() {
    const newState = !pushEnabled;
    setPushEnabled(newState);
    try {
      await toggleFanFightPush(newState);
    } catch (e) {
      setPushEnabled(!newState); // revert on fail
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    
    // Extract mentions to send explicitly
    const mentionRegex = /@([\w-]+)/g;
    const extractedMentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      extractedMentions.push(match[1]);
    }

    socket.emit('sendMessage', {
      content: text.trim(),
      mentions: extractedMentions
    });
    setText('');
    closeDropdown();
  }

  // Mention input handlers
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const caret = e.target.selectionStart ?? val.length;
    setText(val);

    const before = val.slice(0, caret);
    const atMatch = before.match(/(^|[\s])@([\w-]*)$/);

    if (atMatch) {
      const query = atMatch[2];
      setMentionStart(caret - query.length - 1);
      setMentionQuery(query);
      setShowDropdown(true);
    } else {
      closeDropdown();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  }

  function insertMention(username: string) {
    const caret = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(caret);
    const inserted = `@${username} `;
    setText(before + inserted + after);
    closeDropdown();
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

  return (
    <>
      <Navbar />
      <main className="page fan-fight-page">
        <div className="ff-header">
          <div>
            <h1 className="ff-title">⚔️ Fan Fight Room</h1>
            <p className="ff-subtitle">Global live chat. Clears every day at 10:30 AM IST.</p>
          </div>
          <button 
            className={`btn-toggle-push ${pushEnabled ? 'on' : 'off'}`} 
            onClick={togglePush}
            title="Toggle push notifications for this room"
          >
            {pushEnabled ? '🔕 Mute Room' : '🔔 Unmute Room'}
          </button>
        </div>

        <div className="ff-container card">
          <div className="ff-messages" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="ff-empty">The room is empty. Start the banter!</div>
            ) : (
              messages.map(m => {
                const isMe = m.username === me?.username;
                return (
                  <div key={m.id} className={`ff-msg fade-up ${isMe ? 'ff-mine' : 'ff-theirs'}`}>
                    {!isMe && (
                      <div className="ff-avatar">
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ff-msg-content">
                      <div className="ff-meta">
                        <span className="ff-user">{isMe ? 'You' : m.username}</span>
                        <span className="ff-time">{formatTime(m.created_at)}</span>
                      </div>
                      <ChatBubble content={m.content} mentions={m.mentions} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ position: 'relative' }}>
            {showDropdown && suggestions.length > 0 && (
              <div className="mention-dropdown">
                {suggestions.map((name, i) => (
                  <div key={name} className={`mention-option${i === activeSuggestion ? ' active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
                    onMouseEnter={() => setActiveSuggestion(i)}>
                    <span className="mention-at">@</span>
                    <span className="mention-name">{name}</span>
                  </div>
                ))}
              </div>
            )}
            <form className="ff-form" onSubmit={handleSend}>
              <input
                ref={inputRef}
                className="ff-input"
                placeholder="Talk trash... use @ to mention"
                value={text}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(closeDropdown, 150)}
                maxLength={500}
              />
              <button className="ff-send" type="submit" disabled={!text.trim() || !socket}>
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
