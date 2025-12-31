import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function MessageManagement() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchMessages();
  }, [token, user, navigate]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/messages`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(response.data);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId) => {
    if (!replyText.trim()) {
      alert('Please enter a reply message');
      return;
    }

    setSending(true);
    setError('');

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/messages/${messageId}/reply`,
        { reply: replyText },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSelectedMessage(null);
      setReplyText('');
      fetchMessages();
      alert('Reply sent successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  const unrepliedCount = messages.filter(m => !m.replied).length;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>📬 Contact Messages</h1>
        <div className="message-stats">
          <span className="stat-badge unreplied">{unrepliedCount} Pending</span>
          <span className="stat-badge total">{messages.length} Total</span>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No messages yet</h3>
          <p>User messages will appear here</p>
        </div>
      ) : (
        <div className="messages-grid">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message-card ${message.replied ? 'replied' : 'pending'}`}
            >
              <div className="message-header">
                <div>
                  <h3>{message.name}</h3>
                  <p className="message-email">{message.email}</p>
                </div>
                <span className={`status-badge ${message.replied ? 'replied' : 'pending'}`}>
                  {message.replied ? '✓ Replied' : '⏳ Pending'}
                </span>
              </div>

              <div className="message-subject">
                <strong>Subject:</strong> {message.subject}
              </div>

              <div className="message-body">
                <strong>Message:</strong>
                <p>{message.message}</p>
              </div>

              <div className="message-meta">
                <span>📅 {new Date(message.created_at).toLocaleString()}</span>
              </div>

              {message.replied && message.admin_reply && (
                <div className="admin-reply-section">
                  <strong>Your Reply:</strong>
                  <p className="admin-reply-text">{message.admin_reply}</p>
                  <small>Replied on: {new Date(message.replied_at).toLocaleString()}</small>
                </div>
              )}

              {!message.replied && (
                <button 
                  onClick={() => setSelectedMessage(message)} 
                  className="reply-button"
                >
                  📧 Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {selectedMessage && (
        <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reply to {selectedMessage.name}</h2>
              <button onClick={() => setSelectedMessage(null)} className="close-modal">✕</button>
            </div>

            <div className="original-message">
              <strong>Original Message:</strong>
              <p><strong>Subject:</strong> {selectedMessage.subject}</p>
              <p>{selectedMessage.message}</p>
            </div>

            <div className="form-group">
              <label>Your Reply:</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows="8"
                placeholder="Type your reply here..."
                className="reply-textarea"
              />
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => setSelectedMessage(null)} 
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReply(selectedMessage.id)} 
                className="send-button"
                disabled={sending}
              >
                {sending ? 'Sending...' : '📧 Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageManagement;