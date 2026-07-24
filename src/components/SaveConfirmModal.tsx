import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SaveConfirmModalProps {
  isOpen: boolean;
  documentName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const SaveConfirmModal: React.FC<SaveConfirmModalProps> = ({
  isOpen,
  documentName,
  onSave,
  onDiscard,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="microsoft-modal-overlay">
      <div className="microsoft-dialog">
        <div className="microsoft-dialog-header">
          <span className="microsoft-dialog-title">自動營養標籤計算機</span>
          <button className="microsoft-dialog-close" onClick={onCancel}>✕</button>
        </div>
        <div className="microsoft-dialog-content">
          <div className="microsoft-dialog-icon-container">
            <AlertTriangle className="microsoft-dialog-icon" size={32} />
          </div>
          <div className="microsoft-dialog-message">
            <p className="microsoft-dialog-text-main">
              您要將變更儲存到 <strong>{documentName}</strong> 嗎？
            </p>
            <p className="microsoft-dialog-text-sub">
              如果您選擇「不儲存」，將會永久遺失您剛才所做的修改。
            </p>
          </div>
        </div>
        <div className="microsoft-dialog-actions">
          <button className="microsoft-btn microsoft-btn-primary" onClick={onSave}>
            儲存 (S)
          </button>
          <button className="microsoft-btn" onClick={onDiscard}>
            不儲存 (N)
          </button>
          <button className="microsoft-btn microsoft-btn-cancel" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
