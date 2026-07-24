import React, { useState } from 'react';
import { Save, Plus, Trash2, Printer, Factory, Cloud } from 'lucide-react';
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

  // Firebase 雲端同步 State
  const [firebaseSyncKey, setFirebaseSyncKey] = useState(settings.firebaseSyncKey || '');


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
      selectedPrinterId: settings.selectedPrinterId,
      firebaseSyncKey
    });
    alert('所有系統與雲端設定已儲存成功！');
  };

  // 新增標籤機
  const handleAddPrinter = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim()) {
      alert('請輸入標籤機名稱！');
      return;
    }

    const newProfile: PrinterProfile = {
      id: `printer-${Date.now()}`,
      name: newPrinterName.trim(),
      widthMm: newWidthMm,
      heightMm: newHeightMm,
      minFontSizePx: newMinFontSize
    };

    setPrinters([...printers, newProfile]);
    setNewPrinterName('');
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
        
        {/* 廠商預設資訊 */}
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
                <Plus size={14} className="btn-icon" />
                新增標籤機規格
              </button>
            )}
          </div>

          <div className="printer-settings-container">
            {showAddPrinter && (
              <div className="add-printer-box">
                <h4>新增標籤印表機規格</h4>
                <div className="form-grid">
                  <div className="form-section-full">
                    <label className="form-label">標籤機型號/規格名稱 *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newPrinterName}
                      onChange={(e) => setNewPrinterName(e.target.value)}
                      placeholder="例如：Brother QL-800 (62x29)"
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
                    <label className="form-label">標籤紙高度 (mm，0為不限高) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newHeightMm}
                      onChange={(e) => setNewHeightMm(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <label className="form-label">最小建議可刷字級 (px) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newMinFontSize}
                      onChange={(e) => setNewMinFontSize(Math.max(4, Number(e.target.value)))}
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
                    新增
                  </button>
                </div>
              </div>
            )}

            {printers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px' }}>
                目前沒有自訂標籤印表機，預覽將使用食譜的預設寬度。
              </p>
            ) : (
              <table className="printers-list-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px' }}>型號名稱</th>
                    <th style={{ padding: '8px' }}>紙張寬度</th>
                    <th style={{ padding: '8px' }}>紙張高度</th>
                    <th style={{ padding: '8px' }}>最小字級</th>
                    <th style={{ padding: '8px', width: '60px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {printers.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.name}</td>
                      <td style={{ padding: '8px' }}>{p.widthMm} mm</td>
                      <td style={{ padding: '8px' }}>{p.heightMm} mm</td>
                      <td style={{ padding: '8px' }}>{p.minFontSizePx} px</td>
                      <td style={{ padding: '8px' }}>
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

        {/* Firebase 雲端即時同步設定 */}
        <div className="form-card">
          <div className="card-title-bar">
            <Cloud size={18} className="card-title-icon" />
            <h3>☁️ 跨裝置雲端即時同步</h3>
          </div>
          <div style={{ padding: '4px 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p>只要在多台裝置上輸入相同的「同步金鑰」，所有配方資料將會透過 Firebase Firestore 即時同步。</p>
            <p style={{ marginTop: '6px' }}>🔑 <strong>同步金鑰就像「房間名稱」</strong>，任何輸入相同金鑰的裝置都能看到同樣的資料。留空則不啟用同步。</p>
          </div>

          <div className="form-grid" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div className="form-section-full">
              <label className="form-label">同步金鑰（留空則不同步）</label>
              <input
                type="text"
                className="form-input"
                value={firebaseSyncKey}
                onChange={(e) => setFirebaseSyncKey(e.target.value)}
                placeholder="輸入一組自訂的同步密碼（例如：taidu-bakery-2025），不同裝置輸入同密碼即可共享資料"
              />
            </div>
          </div>
        </div>

        {/* 儲存按鈕 */}
        <div className="settings-submit-container">
          <button type="submit" className="microsoft-btn microsoft-btn-primary">
            <Save size={16} className="btn-icon" />
            儲存所有系統與雲端設定
          </button>
        </div>

      </form>
    </div>
  );
};
