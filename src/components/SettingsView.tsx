import React, { useState } from 'react';
import { Save, Plus, Trash2, Printer, Factory } from 'lucide-react';
import type { AppSettings, PrinterProfile } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  // 廠商預設資訊 State
  const [defaultOrigin, setDefaultOrigin] = useState(settings.defaultOrigin || '台灣');
  const [defaultManufacturer, setDefaultManufacturer] = useState(settings.defaultManufacturer || '');
  const [defaultAddress, setDefaultAddress] = useState(settings.defaultAddress || '');
  const [defaultPhone, setDefaultPhone] = useState(settings.defaultPhone || '');
  const [defaultExpirationText, setDefaultExpirationText] = useState(settings.defaultExpirationText || '標示於包裝上');

  // 標籤機清單 State
  const [printers, setPrinters] = useState<PrinterProfile[]>(settings.printers || []);
  
  // 新增標籤機表單 State
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newWidthMm, setNewWidthMm] = useState(50);
  const [newHeightMm, setNewHeightMm] = useState(30);
  const [newMinFontSize, setNewMinFontSize] = useState(10);
  const [showAddPrinter, setShowAddPrinter] = useState(false);

  // 儲存設定
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      defaultOrigin,
      defaultManufacturer,
      defaultAddress,
      defaultPhone,
      defaultExpirationText,
      printers,
      selectedPrinterId: settings.selectedPrinterId // 保持原本選擇的印表機
    });
    alert('設定已儲存成功！將自動套用到未來新建的配方中。');
  };

  // 新增標籤機
  const handleAddPrinter = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim()) {
      alert('請輸入標籤機名稱');
      return;
    }

    const newPrinter: PrinterProfile = {
      id: `printer-${Date.now()}`,
      name: newPrinterName.trim(),
      widthMm: Number(newWidthMm),
      heightMm: Number(newHeightMm),
      minFontSizePx: Number(newMinFontSize)
    };

    setPrinters([...printers, newPrinter]);
    setNewPrinterName('');
    setNewWidthMm(50);
    setNewHeightMm(30);
    setNewMinFontSize(10);
    setShowAddPrinter(false);
  };

  // 刪除標籤機
  const handleDeletePrinter = (id: string) => {
    if (confirm('確定要刪除此標籤機設定檔嗎？')) {
      setPrinters(printers.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="settings-page-wrapper">
      <form onSubmit={handleSaveAll} className="settings-form">
        
        {/* 廠商預設設定 */}
        <div className="form-card">
          <div className="card-title-bar">
            <Factory size={18} className="card-title-icon" />
            <h3>預設廠商標示設定 (新建配方時自動代入)</h3>
          </div>
          <div className="form-grid">
            <div>
              <label className="form-label">預設原產地 (國)</label>
              <input
                type="text"
                className="form-input"
                value={defaultOrigin}
                onChange={(e) => setDefaultOrigin(e.target.value)}
                placeholder="例如：台灣"
              />
            </div>
            <div>
              <label className="form-label">預設製造商/委託商</label>
              <input
                type="text"
                className="form-input"
                value={defaultManufacturer}
                onChange={(e) => setDefaultManufacturer(e.target.value)}
                placeholder="例如：台度法式甜點工作室"
              />
            </div>
            <div className="form-section-full">
              <label className="form-label">預設製造地址</label>
              <input
                type="text"
                className="form-input"
                value={defaultAddress}
                onChange={(e) => setDefaultAddress(e.target.value)}
                placeholder="例如：台北市大安區信義路..."
              />
            </div>
            <div>
              <label className="form-label">預設聯絡電話</label>
              <input
                type="text"
                className="form-input"
                value={defaultPhone}
                onChange={(e) => setDefaultPhone(e.target.value)}
                placeholder="例如：02-2700-1234"
              />
            </div>
            <div>
              <label className="form-label">預設有效日期標示說明</label>
              <input
                type="text"
                className="form-input"
                value={defaultExpirationText}
                onChange={(e) => setDefaultExpirationText(e.target.value)}
                placeholder="例如：標示於包裝上"
              />
            </div>
          </div>
        </div>

        {/* 標籤機選項管理 */}
        <div className="form-card">
          <div className="card-title-bar-flex">
            <div className="title-left">
              <Printer size={18} className="card-title-icon" />
              <h3>標籤印表機設定檔管理</h3>
            </div>
            {!showAddPrinter && (
              <button
                type="button"
                className="microsoft-btn btn-sm"
                onClick={() => setShowAddPrinter(true)}
              >
                <Plus size={12} className="btn-icon" />
                新增標籤機
              </button>
            )}
          </div>

          {/* 新增標籤機表單區 */}
          {showAddPrinter && (
            <div className="add-printer-box">
              <h4>新增標籤機設定檔</h4>
              <div className="form-grid">
                <div>
                  <label className="form-label">標籤機名稱/規格名稱 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如：Dymo 40mm圓形, Brother QL-800"
                    value={newPrinterName}
                    onChange={(e) => setNewPrinterName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">標籤紙寬度 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newWidthMm}
                    onChange={(e) => setNewWidthMm(Math.max(10, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label className="form-label">標籤紙高度 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newHeightMm}
                    onChange={(e) => setNewHeightMm(Math.max(10, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label className="form-label">最小可印中英文字級 (px) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newMinFontSize}
                    onChange={(e) => setNewMinFontSize(Math.max(6, Number(e.target.value)))}
                  />
                </div>
              </div>
              <div className="add-printer-actions">
                <button
                  type="button"
                  className="microsoft-btn btn-sm"
                  onClick={() => setShowAddPrinter(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="microsoft-btn microsoft-btn-primary btn-sm"
                  onClick={handleAddPrinter}
                >
                  儲存標籤機
                </button>
              </div>
            </div>
          )}

          {/* 標籤機列表 */}
          <div className="printers-list-table-container">
            {printers.length === 0 ? (
              <div className="empty-table-cell">
                目前尚無設定任何標籤機規格。可點擊右上方「新增標籤機」進行添加。
              </div>
            ) : (
              <table className="ingredient-table">
                <thead>
                  <tr>
                    <th>標籤機/規格名稱</th>
                    <th>紙張寬度 (mm)</th>
                    <th>紙張高度 (mm)</th>
                    <th>最小字型 (px)</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {printers.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td>{p.widthMm} mm</td>
                      <td>{p.heightMm} mm</td>
                      <td>{p.minFontSizePx} px</td>
                      <td>
                        <button
                          type="button"
                          className="action-icon-btn delete-btn"
                          onClick={() => handleDeletePrinter(p.id)}
                          title="刪除標籤機規格"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 儲存按鈕 */}
        <div className="settings-submit-container">
          <button type="submit" className="microsoft-btn microsoft-btn-primary">
            <Save size={16} className="btn-icon" />
            儲存所有系統設定
          </button>
        </div>

      </form>
    </div>
  );
};
