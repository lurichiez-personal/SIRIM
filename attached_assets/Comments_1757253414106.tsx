
import React, { useState } from 'react';
import { Comment } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import Button from './Button';

interface CommentsProps {
  comments: Comment[];
  documentId: number;
  documentType: 'factura' | 'gasto' | 'cotizacion';
}

const Comments: React.FC<CommentsProps> = ({ comments, documentId, documentType }) => {
  const [newComment, setNewComment] = useState('');
  const { user } = useAuthStore();
  const { addComment } = useDataStore();

  const handleAddComment = () => {
    if (newComment.trim() && user) {
      addComment(documentType, documentId, newComment);
      setNewComment('');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
        {comments.length === 0 ? (
          <p className="text-sm text-secondary-500 text-center py-4">No hay comentarios todavía.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">{comment.userName.charAt(0)}</span>
              </div>
              <div>
                <div className="bg-secondary-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-secondary-800">{comment.userName}</p>
                  <p className="text-sm text-secondary-700">{comment.text}</p>
                </div>
                <p className="text-xs text-secondary-400 mt-1">{new Date(comment.timestamp).toLocaleString('es-DO')}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t pt-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario..."
          className="w-full p-2 border border-secondary-300 rounded-md"
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleAddComment} disabled={!newComment.trim()}>
            Añadir Comentario
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Comments;
