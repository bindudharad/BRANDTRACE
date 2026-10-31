import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import { api, ReviewComment, UserRole } from '../../services/api';

interface ReviewCommentsPanelProps {
  reviewId: string;
  role: UserRole;
}

export const ReviewCommentsPanel: React.FC<ReviewCommentsPanelProps> = ({
  reviewId,
  role,
}) => {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [reviewId]);

  const loadComments = async () => {
    try {
      const data = await api.reviewComments(reviewId);
      setComments(data);
    } catch {
      // Non-critical
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const created = await api.addReviewComment(reviewId, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment('');
    } catch (err: any) {
      alert(err?.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #DCE5DF',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F8FAF8',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MessageSquare size={16} color="#0A7352" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#123B2D' }}>
          Review Collaboration & Governance Discussion ({comments.length})
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {comments.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No reviewer notes or comments posted yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 14 }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#F8FAF8',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{c.author}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {c.author_role}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{c.created_at.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: '1.4' }}>{c.comment}</div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Add a reviewer note or clarification question..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #DCE5DF',
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={!newComment.trim() || submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Send size={13} />
            <span>Post</span>
          </button>
        </form>
      </div>
    </div>
  );
};
