import React, { useState } from 'react';
import { X, UserCheck, Calendar, AlertCircle } from 'lucide-react';
import { api, Review, UserRole } from '../../services/api';

interface ReviewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
  role: UserRole;
  onAssignmentUpdated: (updatedReview: Review) => void;
}

export const ReviewAssignmentModal: React.FC<ReviewAssignmentModalProps> = ({
  isOpen,
  onClose,
  review,
  role,
  onAssignmentUpdated,
}) => {
  const [assignedTo, setAssignedTo] = useState(review.assigned_to || 'demo.reviewer');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>(
    (review.priority as any) || 'MEDIUM'
  );
  const [dueDate, setDueDate] = useState(
    review.due_date ? review.due_date.slice(0, 10) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateReviewAssignment(review.id, {
        assigned_to: assignedTo,
        priority: priority,
        due_date: dueDate ? `${dueDate}T18:00:00Z` : undefined,
      });
      onAssignmentUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(10, 36, 27, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="card-premium"
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck size={18} color="#0A7352" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#123B2D' }}>
              Assign Review & Set Priority
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: 6, color: '#991B1B', fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Assignee (Workspace Member)
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, backgroundColor: '#FFFFFF' }}
            >
              <option value="demo.reviewer">demo.reviewer (Brand Reviewer)</option>
              <option value="reviewer.alice">reviewer.alice (Senior Brand Reviewer)</option>
              <option value="reviewer.bob">reviewer.bob (Compliance Specialist)</option>
              <option value="demo.brand_admin">demo.brand_admin (Brand Administrator)</option>
              <option value="demo.creator">demo.creator (Content Creator)</option>
            </select>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
              Assigned reviewer is responsible for dispositioning findings.
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Review Priority
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: priority === p ? '2px solid #0A7352' : '1px solid #DCE5DF',
                    backgroundColor: priority === p ? '#E6F4EA' : '#FFFFFF',
                    color: priority === p ? '#0A7352' : '#374151',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving...' : 'Update Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
