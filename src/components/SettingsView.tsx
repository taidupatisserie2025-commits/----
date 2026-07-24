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
  const [firebaseSyncEnabled, setFirebaseSyncEnabled] = useState(settings.firebaseSyncEnabled || false);
  const [firebaseSyncKey, setFirebaseSyncKey] = useState(settings.firebaseSyncKey || '');
  const [firebaseConfigJson, setFirebaseConfigJson] = useState(settings.firebaseConfigJson || '');

  // 儲存設定
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    // 如果啟用了同步，基本檢查設定值
    if (firebaseSyncEnabled) {
      if (!firebaseSyncKey) {
        alert('請設定一組專屬的「同步金鑰」以辨識您的雲端資料！');
        return;
      }
      if (!firebaseConfigJson) {
        alert('請貼上您的 Firebase Config JSON 設定！');
        return;
      }
      try {
        JSON.parse(firebaseConfigJson.trim());
      } catch (err) {
        alert('Firebase Config 格式不正確，必須是有效的 JSON 大括號格式！');
        return;
      }
    }

    onSaveSettings({
      defaultOrigin,
      defaultManufacturer,
      defaultAddress,
      defaultPhone,
      defaultExpirationText,
      printers,
      selectedPrinterId: settings.selectedPrinterId,
      firebaseSyncEnabled,
      firebaseSyncKey,
      firebaseConfigJson
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
            <h3>Firebase 跨裝置雲端即時同步設定</h3>
          </div>
          <div style={{ padding: '4px 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <p>本系統預設將所有資料儲存在您本地瀏覽器。若您想要在**多台電腦或手機之間同步資料**，可以使用免費的 Firebase Realtime Database 服務。</p>
            <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <strong>📝 設定五步驟：</strong>
              <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>前往 <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>Firebase Console</a> 登入您的 Google 帳號。</li>
                <li>建立一個新專案（例如：<code>nutrition-label-sync</code>）。</li>
                <li>新增一個「網頁應用程式 (Web App)」，複製 SDK 設定中的 <code>firebaseConfig</code> 物件（大括號 <code>{"{ ... }"}</code> 內的部分）。</li>
                <li>在 Firebase 左側選單選擇 <strong>Build ➡️ Realtime Database</strong> 建立資料庫，並將 Rules (規則) 暫時修改為 <code>{`{ "rules": { ".read": true, ".write": true } }`}</code> 以供連線。</li>
                <li>在下方輸入框貼上 SDK 設定 JSON，並設定一組您的「專屬同步金鑰（同步房間密碼）」，即可啟用同步！</li>
              </ol>
            </div>
          </div>

          <div className="form-grid" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div className="form-section-full" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={firebaseSyncEnabled}
                  onChange={(e) => setFirebaseSyncEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <strong style={{ fontSize: '0.9rem' }}>啟用 Firebase 雲端即時同步</strong>
            </div>

            {firebaseSyncEnabled && (
              <>
                <div className="form-section-full">
                  <label className="form-label">Firebase Config JSON 設定檔 (貼上 SDK 大括號內的代碼) *</label>
                  <textarea
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', height: '130px', resize: 'vertical' }}
                    value={firebaseConfigJson}
                    onChange={(e) => setFirebaseConfigJson(e.target.value)}
                    placeholder={`例如：\n{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "databaseURL": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                  />
                </div>

                <div className="form-section-full">
                  <label className="form-label">您的專屬同步金鑰 (同步密碼) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={firebaseSyncKey}
                    onChange={(e) => setFirebaseSyncKey(e.target.value)}
                    placeholder="請輸入自訂的同步密碼（例如：taidu-bakery-2025），不同裝置輸入同密碼即可共享數據"
                  />
                </div>
              </>
            )}
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
