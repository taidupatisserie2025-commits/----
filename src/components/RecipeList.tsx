import React, { useState } from 'react';
import { Search, Plus, Trash2, FileDown, FileUp, FileText } from 'lucide-react';
import type { Recipe } from '../types';

interface RecipeListProps {
  recipes: Recipe[];
  currentRecipeId: string | null;
  dirtyRecipes: Record<string, boolean>;
  onSelectRecipe: (id: string) => void;
  onNewRecipe: () => void;
  onDeleteRecipe: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({
  recipes,
  currentRecipeId,
  dirtyRecipes,
  onSelectRecipe,
  onNewRecipe,
  onDeleteRecipe,
  onExportBackup,
  onImportBackup
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 篩選食譜
  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar-container">
      {/* 側邊欄標題與新建按鈕 */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <FileText size={18} />
          <h3>配方標籤存檔區</h3>
        </div>
        <button
          className="microsoft-btn microsoft-btn-primary sidebar-new-btn"
          onClick={onNewRecipe}
          title="建立新食譜配方 (Ctrl+N)"
        >
          <Plus size={14} className="btn-icon" />
          新增配方
        </button>
      </div>

      {/* 搜尋檔案 */}
      <div className="sidebar-search">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="搜尋已存配方..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 配方檔案列表 */}
      <div className="recipes-list">
        {filteredRecipes.length === 0 ? (
          <div className="empty-sidebar-message">
            {searchTerm ? '找不到相符的配方。' : '目前尚無存檔配方。請點擊「新增配方」開始製作。'}
          </div>
        ) : (
          filteredRecipes.map((r) => {
            const isSelected = r.id === currentRecipeId;
            const isDirty = !!dirtyRecipes[r.id];

            return (
              <div
                key={r.id}
                className={`recipe-list-item ${isSelected ? 'selected' : ''} ${isDirty ? 'dirty' : ''}`}
                onClick={() => onSelectRecipe(r.id)}
              >
                <div className="item-main-info">
                  <div className="item-name-row">
                    <span className="recipe-name-text">{r.name || '未命名配方'}</span>
                    {isDirty && (
                      <span className="unsaved-badge" title="檔案有未儲存的修改">
                        ●
                      </span>
                    )}
                  </div>
                  <span className="recipe-sub-text">
                    {r.productName || '無標示品名'} · {r.netWeight || 0}g
                  </span>
                </div>
                
                <button
                  className="item-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止選取事件
                    if (confirm(`確定要永久刪除「${r.name}」的食譜與標籤嗎？此動作無法復原。`)) {
                      onDeleteRecipe(r.id);
                    }
                  }}
                  title="刪除此配方"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 資料備份與還原 (底部按鈕) */}
      <div className="sidebar-footer">
        <button
          className="sidebar-footer-btn"
          onClick={onExportBackup}
          title="匯出所有配方與食材庫至本機 JSON 檔"
        >
          <FileDown size={14} />
          <span>備份匯出</span>
        </button>
        <button
          className="sidebar-footer-btn"
          onClick={() => fileInputRef.current?.click()}
          title="匯入先前備份的 JSON 配方檔"
        >
          <FileUp size={14} />
          <span>備份還原</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={onImportBackup}
        />
      </div>
    </div>
  );
};
