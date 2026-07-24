import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, Globe, Save, X, BookOpen, AlertCircle } from 'lucide-react';
import type { Ingredient } from '../types';
import { COMMON_ALLERGENS } from '../data/defaultIngredients';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onAddIngredient: (ing: Ingredient) => void;
  onUpdateIngredient: (ing: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
}

export const IngredientModal: React.FC<IngredientModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'search'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 編輯食材用的 State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);
  const [saturatedFat, setSaturatedFat] = useState<number>(0);
  const [transFat, setTransFat] = useState<number>(0);
  const [carbohydrates, setCarbohydrates] = useState<number>(0);
  const [sugar, setSugar] = useState<number>(0);
  const [sodium, setSodium] = useState<number>(0);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [costPerKg, setCostPerKg] = useState<number>(0);
  const [formError, setFormError] = useState('');

  // 聯網搜尋用的 State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  if (!isOpen) return null;

  // 篩選本地食材
  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 處理進入新增/編輯模式
  const handleStartEdit = (ing?: Ingredient) => {
    if (ing) {
      setEditingId(ing.id);
      setName(ing.name);
      setCalories(ing.calories);
      setProtein(ing.protein);
      setFat(ing.fat);
      setSaturatedFat(ing.saturatedFat);
      setTransFat(ing.transFat);
      setCarbohydrates(ing.carbohydrates);
      setSugar(ing.sugar);
      setSodium(ing.sodium);
      setSelectedAllergens(ing.allergens || []);
      setCostPerKg(ing.costPerKg || 0);
    } else {
      setEditingId(null);
      setName('');
      setCalories(0);
      setProtein(0);
      setFat(0);
      setSaturatedFat(0);
      setTransFat(0);
      setCarbohydrates(0);
      setSugar(0);
      setSodium(0);
      setSelectedAllergens([]);
      setCostPerKg(0);
    }
    setFormError('');
    setActiveTab('edit');
  };

  // 處理儲存食材表單
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('請輸入食材名稱');
      return;
    }

    const ingData: Ingredient = {
      id: editingId || `custom-${Date.now()}`,
      name: name.trim(),
      calories: Number(calories),
      protein: Number(protein),
      fat: Number(fat),
      saturatedFat: Number(saturatedFat),
      transFat: Number(transFat),
      carbohydrates: Number(carbohydrates),
      sugar: Number(sugar),
      sodium: Number(sodium),
      allergens: selectedAllergens,
      costPerKg: costPerKg > 0 ? Number(costPerKg) : undefined,
      isCustom: editingId ? (ingredients.find(i => i.id === editingId)?.isCustom ?? true) : true
    };

    if (editingId) {
      onUpdateIngredient(ingData);
    } else {
      onAddIngredient(ingData);
    }

    setActiveTab('list');
  };

  // 切換過敏原選取
  const handleToggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  // 聯網搜尋食材 API 串接 (Open Food Facts)
  const handleOnlineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);

    try {
      // 搜尋支持 CORS 的 Open Food Facts API (使用繁體中文語系優先)
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        searchQuery
      )}&search_simple=1&action=process&json=1&page_size=15&lc=zh`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NutritionLabelCalculatorTaiwan/1.0 (web-app)'
        }
      });

      if (!response.ok) {
        throw new Error('網路連接錯誤，無法取得線上資料');
      }

      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        setSearchError('找不到相符的食材，請嘗試其他關鍵字。');
        return;
      }

      // 整理 API 回傳的數據
      const mappedResults = data.products
        .filter((prod: any) => prod.product_name || prod.product_name_zh)
        .map((prod: any) => {
          const nut = prod.nutriments || {};
          
          // 轉換鈉（OFF 的 sodium 為克，轉為毫克 mg）
          const sodiumMg = nut.sodium_100g ? Math.round(Number(nut.sodium_100g) * 1000) : 0;
          
          // 自動推斷過敏原 (透過 allergens_tags)
          const detectedAllergens: string[] = [];
          if (prod.allergens_tags) {
            prod.allergens_tags.forEach((tag: string) => {
              const cleanTag = tag.replace('en:', '').toLowerCase();
              if (cleanTag.includes('milk') || cleanTag.includes('dairy')) detectedAllergens.push('奶類 (牛奶/乳製品)');
              if (cleanTag.includes('egg')) detectedAllergens.push('蛋類');
              if (cleanTag.includes('wheat') || cleanTag.includes('gluten')) detectedAllergens.push('麥類 (小麥/麩質)');
              if (cleanTag.includes('nut') || cleanTag.includes('almond') || cleanTag.includes('hazelnut')) detectedAllergens.push('堅果類');
              if (cleanTag.includes('soy')) detectedAllergens.push('大豆類 (大豆卵磷脂)');
              if (cleanTag.includes('peanut')) detectedAllergens.push('花生類');
              if (cleanTag.includes('sesame')) detectedAllergens.push('芝麻類');
            });
          }

          return {
            id: `online-${prod._id || Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: prod.product_name_zh || prod.product_name || '未命名線上食品',
            calories: Math.round(Number(nut['energy-kcal_100g'] || nut['energy-kcal'] || 0)),
            protein: Number(nut.proteins_100g || nut.proteins || 0),
            fat: Number(nut.fat_100g || nut.fat || 0),
            saturatedFat: Number(nut['saturated-fat_100g'] || nut['saturated-fat'] || 0),
            transFat: Number(nut['trans-fat_100g'] || nut['trans-fat'] || 0),
            carbohydrates: Number(nut.carbohydrates_100g || nut.carbohydrates || 0),
            sugar: Number(nut.sugars_100g || nut.sugars || 0),
            sodium: sodiumMg,
            allergens: Array.from(new Set(detectedAllergens)),
            isCustom: true
          };
        });

      setSearchResults(mappedResults);
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || '聯網查詢失敗，請檢查網路連線。');
    } finally {
      setSearchLoading(false);
    }
  };

  // 匯入線上搜尋的食材
  const handleImportOnlineIngredient = (ing: Ingredient) => {
    // 檢查是否已存在同名食材
    const exists = ingredients.some((i) => i.name.toLowerCase() === ing.name.toLowerCase());
    if (exists) {
      alert(`食材庫中已存在名為「${ing.name}」的食材！`);
      return;
    }
    
    onAddIngredient({
      ...ing,
      id: `custom-${Date.now()}` // 轉成本地自訂食材 ID
    });
    
    // 顯示成功提示並切換回清單
    alert(`已成功將「${ing.name}」匯入食材庫！`);
  };

  return (
    <div className="modal-overlay">
      <div className="ingredient-modal-container">
        {/* Modal 標頭 */}
        <div className="modal-header">
          <div className="modal-header-title">
            <BookOpen size={20} className="header-icon" />
            <h2>食材庫管理與聯網查詢</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 頁籤導覽 */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            食材清單 ({ingredients.length})
          </button>
          <button
            className={`modal-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => handleStartEdit()}
          >
            {editingId ? '編輯食材' : '新增自訂食材'}
          </button>
          <button
            className={`modal-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Globe size={14} className="tab-icon" />
            聯網搜尋建議
          </button>
        </div>

        {/* 頁籤內容 */}
        <div className="modal-tab-content">
          
          {/* 1. 食材清單 */}
          {activeTab === 'list' && (
            <div className="tab-pane-list">
              <div className="search-bar">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="搜尋本地食材..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="ingredient-table-container">
                <table className="ingredient-table">
                  <thead>
                    <tr>
                      <th>食材名稱</th>
                      <th>熱量 (kcal)</th>
                      <th>蛋白 (g)</th>
                      <th>脂肪 (g)</th>
                      <th>飽和 (g)</th>
                      <th>碳水 (g)</th>
                      <th>糖 (g)</th>
                      <th>鈉 (mg)</th>
                      <th>過敏原</th>
                      <th>成本(元/kg)</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="empty-table-cell">
                          找不到相符的食材。您可以嘗試新增自訂食材，或利用聯網搜尋。
                        </td>
                      </tr>
                    ) : (
                      filteredIngredients.map((ing) => (
                        <tr key={ing.id} className={ing.isCustom ? 'custom-row' : ''}>
                          <td className="font-medium">
                            {ing.name}
                            {ing.isCustom && <span className="custom-badge">自訂</span>}
                          </td>
                          <td>{ing.calories}</td>
                          <td>{ing.protein}</td>
                          <td>{ing.fat}</td>
                          <td>{ing.saturatedFat}</td>
                          <td>{ing.carbohydrates}</td>
                          <td>{ing.sugar}</td>
                          <td>{ing.sodium}</td>
                          <td>
                            <div className="table-allergen-tags">
                              {ing.allergens && ing.allergens.length > 0 ? (
                                ing.allergens.map((a, idx) => (
                                  <span key={idx} className="allergen-tag-micro">
                                    {a.split(' ')[0]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </div>
                          </td>
                          <td>{ing.costPerKg ? `$${ing.costPerKg}` : '-'}</td>
                          <td>
                            <div className="action-buttons-cell">
                              <button
                                className="action-icon-btn edit-btn"
                                onClick={() => handleStartEdit(ing)}
                                title="編輯"
                              >
                                <Edit2 size={14} />
                              </button>
                              {ing.isCustom && (
                                <button
                                  className="action-icon-btn delete-btn"
                                  onClick={() => {
                                    if (confirm(`確定要刪除自訂食材「${ing.name}」嗎？`)) {
                                      onDeleteIngredient(ing.id);
                                    }
                                  }}
                                  title="刪除"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. 新增與編輯食材 */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveForm} className="tab-pane-form">
              {formError && (
                <div className="form-error-alert">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-grid">
                {/* 基礎欄位 */}
                <div className="form-section-full">
                  <label className="form-label">食材名稱 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如：日本特級低筋麵粉、自製草莓果醬"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* 營養素欄位 */}
                <div>
                  <label className="form-label">熱量 (大卡 kcal/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={calories}
                    onChange={(e) => setCalories(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">蛋白質 (公克 g/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={protein}
                    onChange={(e) => setProtein(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">脂肪 (公克 g/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={fat}
                    onChange={(e) => setFat(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">飽和脂肪 (公克 g/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={saturatedFat}
                    onChange={(e) => setSaturatedFat(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">反式脂肪 (公克 g/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={transFat}
                    onChange={(e) => setTransFat(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">碳水化合物 (公克 g/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={carbohydrates}
                    onChange={(e) => setCarbohydrates(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">糖 (公克 g/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={sugar}
                    onChange={(e) => setSugar(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">鈉 (毫克 mg/100g) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={sodium}
                    onChange={(e) => setSodium(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </div>

                {/* 成本 */}
                <div>
                  <label className="form-label">每公斤成本 (TWD 元/kg，選填)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="請輸入原料價格，如 180"
                    value={costPerKg || ''}
                    onChange={(e) => setCostPerKg(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              {/* 過敏原標示 */}
              <div className="allergen-selection-section">
                <label className="form-label">過敏原成份標示 (勾選以供食譜自動偵測)</label>
                <div className="allergen-checkbox-grid">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <label
                      key={allergen}
                      className={`allergen-checkbox-label ${
                        selectedAllergens.includes(allergen) ? 'checked' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAllergens.includes(allergen)}
                        onChange={() => handleToggleAllergen(allergen)}
                      />
                      <span>{allergen}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions-footer">
                <button
                  type="button"
                  className="microsoft-btn"
                  onClick={() => setActiveTab('list')}
                >
                  取消
                </button>
                <button type="submit" className="microsoft-btn microsoft-btn-primary">
                  <Save size={16} className="btn-icon" />
                  儲存食材
                </button>
              </div>
            </form>
          )}

          {/* 3. 聯網搜尋建議 */}
          {activeTab === 'search' && (
            <div className="tab-pane-search">
              <form onSubmit={handleOnlineSearch} className="online-search-form">
                <input
                  type="text"
                  placeholder="輸入食材或食品關鍵字 (例如：糖粉、高筋麵粉、燕麥奶)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-field"
                />
                <button type="submit" className="search-submit-btn" disabled={searchLoading}>
                  {searchLoading ? '查詢中...' : '聯網查詢'}
                </button>
              </form>

              {searchError && (
                <div className="search-error-info">
                  <AlertCircle size={16} />
                  <span>{searchError}</span>
                </div>
              )}

              <div className="search-results-list">
                {searchLoading ? (
                  <div className="search-status-message">
                    <div className="spinner"></div>
                    <p>正在搜尋世界食品開放資料庫 (Open Food Facts)...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="results-grid">
                    {searchResults.map((result) => (
                      <div key={result.id} className="search-result-card">
                        <div className="card-header">
                          <h4>{result.name}</h4>
                          <span className="card-source-tag">全球食品庫</span>
                        </div>
                        <div className="card-nutrition-grid">
                          <div>
                            <span>熱量:</span> <strong>{result.calories} kcal</strong>
                          </div>
                          <div>
                            <span>蛋白:</span> <strong>{result.protein}g</strong>
                          </div>
                          <div>
                            <span>脂肪:</span> <strong>{result.fat}g</strong>
                          </div>
                          <div>
                            <span>碳水:</span> <strong>{result.carbohydrates}g</strong>
                          </div>
                          <div>
                            <span>糖:</span> <strong>{result.sugar}g</strong>
                          </div>
                          <div>
                            <span>鈉:</span> <strong>{result.sodium}mg</strong>
                          </div>
                        </div>
                        
                        {result.allergens.length > 0 && (
                          <div className="card-allergens">
                            <span>過敏原:</span>{' '}
                            {result.allergens.map((a: string, idx: number) => (
                              <span key={idx} className="allergen-tag-micro">
                                {a.split(' ')[0]}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <button
                          className="import-card-btn"
                          onClick={() => handleImportOnlineIngredient(result)}
                        >
                          <Plus size={14} className="btn-icon" />
                          匯入此食材
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="search-placeholder-info">
                    <Globe size={48} className="placeholder-icon" />
                    <p>線上資料庫提供海量市售食品與基礎原料營養成分對照。</p>
                    <p className="text-muted">請在上方輸入關鍵字並點擊「聯網查詢」開始。</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
