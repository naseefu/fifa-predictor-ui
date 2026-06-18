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

const getAvatarColor = (name: string) => {
  const colors = ['#FF4B2B', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

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
    if (!showDropdown) {
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
      const status = await getFanFightPushStatus();
      setPushEnabled(status);

      const res = await fetch(`${CHAT_URL}/messages`);
      if (res.ok) {
        const history = await res.json();
        setMessages(history);
      }

      const token = getToken();
      const s = io(CHAT_URL, { auth: { token } });

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
      setPushEnabled(!newState);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    
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
      <div className="ff-wrapper">
        <main className="ff-page-modern">
          <div className="ff-header-modern">
            <div className="ff-header-info">
              <div className="ff-icon-wrapper">⚔️</div>
              <div>
                <h1 className="ff-title-modern">Fan Fight</h1>
                <p className="ff-subtitle-modern">Global banter clears at 10:30 AM IST</p>
              </div>
            </div>
            <button 
              className={`btn-push-modern ${pushEnabled ? 'active' : ''}`} 
              onClick={togglePush}
              title={pushEnabled ? "Mute Room" : "Unmute Room"}
            >
              <span className="push-icon">{pushEnabled ? '🔕' : '🔔'}</span>
            </button>
          </div>

          <div className="ff-container-modern">
            <div className="ff-messages-modern" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="ff-empty-modern">
                  <div className="empty-icon">🏟️</div>
                  <p>The stands are empty.</p>
                  <span>Be the first to start the banter!</span>
                </div>
              ) : (
                messages.map(m => {
                  const isMe = m.username === me?.username;
                  return (
                    <div key={m.id} className={`ff-msg-group ${isMe ? 'mine' : 'theirs'}`}>
                      {!isMe && (
                        <div className="ff-avatar-modern" style={{ background: getAvatarColor(m.username) }}>
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ff-msg-content-modern">
                        <div className="ff-meta-modern">
                          <span className="ff-user-modern">{isMe ? 'You' : m.username}</span>
                          <span className="ff-time-modern">{formatTime(m.created_at)}</span>
                        </div>
                        <ChatBubble content={m.content} mentions={m.mentions} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ff-input-area">
              {showDropdown && suggestions.length > 0 && (
                <div className="mention-dropdown-modern">
                  {suggestions.map((name, i) => (
                    <div key={name} className={`mention-item ${i === activeSuggestion ? 'active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
                      onMouseEnter={() => setActiveSuggestion(i)}>
                      <div className="mention-item-avatar" style={{ background: getAvatarColor(name) }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="mention-name">{name}</span>
                    </div>
                  ))}
                </div>
              )}
              <form className="ff-form-modern" onSubmit={handleSend}>
                <input
                  ref={inputRef}
                  className="ff-input-modern"
                  placeholder="Drop some banter... Use @ to mention"
                  value={text}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(closeDropdown, 150)}
                  maxLength={500}
                />
                <button className="ff-send-modern" type="submit" disabled={!text.trim() || !socket}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
