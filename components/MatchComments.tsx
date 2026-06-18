import { useEffect, useState, useRef } from 'react';
import { getMatchComments, postMatchComment, CommentResponse } from '@/lib/api';

export default function MatchComments({ matchId }: { matchId: number }) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      loadComments();
    }
  }, [expanded, matchId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, expanded]);

  async function loadComments() {
    setLoading(true);
    try {
      const data = await getMatchComments(matchId);
      setComments(data);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const posted = await postMatchComment(matchId, newComment.trim());
      setComments(prev => [...prev, posted]);
      setNewComment('');
    } catch (e) {
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
              <div className="chat-bubble">{c.content}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handlePost} className="chat-form">
        <input
          type="text"
          className="chat-input"
          placeholder="Type your banter..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={1000}
        />
        <button type="submit" className="chat-send" disabled={submitting || !newComment.trim()}>
          {submitting ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
