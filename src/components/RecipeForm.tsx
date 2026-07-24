import React from 'react';
import { Plus, Trash2, HelpCircle, Calculator, Info, Sparkles, Percent } from 'lucide-react';
import type { Recipe, Ingredient } from '../types';
import type { CalculatedNutrition } from '../utils/nutritionCalculator';

interface RecipeFormProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  nutrition: CalculatedNutrition;
  onChange: (updatedRecipe: Recipe) => void;
  onOpenIngredientManager: () => void;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  recipe,
  ingredients,
  nutrition,
  onChange,
  onOpenIngredientManager
}) => {
  // 更新單一欄位
  const updateField = (key: keyof Recipe, value: any) => {
    onChange({
      ...recipe,
      [key]: value
    });
  };

  // 新增配方原料列
  const handleAddIngredientRow = () => {
    if (ingredients.length === 0) return;
    const defaultIngId = ingredients[0].id;
    const newIngredients = [...recipe.ingredients, { ingredientId: defaultIngId, weight: 100 }];
    updateField('ingredients', newIngredients);
  };

  // 移除配方原料列
  const handleRemoveIngredientRow = (index: number) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    updateField('ingredients', newIngredients);
  };

  // 修改原料品項
  const handleIngredientChange = (index: number, ingredientId: string) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], ingredientId };
    updateField('ingredients', newIngredients);
  };

  // 修改原料重量
  const handleWeightChange = (index: number, weight: number) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], weight: Math.max(0, weight) };
    updateField('ingredients', newIngredients);
  };

  // 烘焙百分比計算基礎 (基底麵粉偵測)
  // 自動找出名字含「粉」或「Flour」且重量最重的原料作為 100% 基準
  const getBakersPercentageBaseWeight = (): number => {
    let baseWeight = 0;
    let maxWeight = 0;
    
    recipe.ingredients.forEach((ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      if (!ing) return;
      
      // 記錄最大重量原料作為後備
      if (ri.weight > maxWeight) {
        maxWeight = ri.weight;
      }
      
      const name = ing.name.toLowerCase();
      if (name.includes('粉') || name.includes('flour') || name.includes('starch')) {
        if (ri.weight > baseWeight) {
          baseWeight = ri.weight;
        }
      }
    });

    return baseWeight > 0 ? baseWeight : (maxWeight > 0 ? maxWeight : 1);
  };

  const baseWeight = getBakersPercentageBaseWeight();

  // 自動填滿預設製造商資訊 (加速輸入)
  const handleApplySampleManufacturer = () => {
    onChange({
      ...recipe,
      manufacturer: '台度法式甜點工作坊 (Taidu Patisserie)',
      origin: '台灣',
      address: '台北市大安區信義路四段 100 號',
      phone: '02-2700-1234',
      expirationText: '常溫保存 3 天，冷藏保存 7 天 (標示於包裝上)'
    });
  };

  return (
    <div className="recipe-form-container">
      {/* 區塊 1: 基礎產品設定 */}
      <div className="form-card">
        <div className="card-title-bar">
          <Calculator size={18} className="card-title-icon" />
          <h3>基礎產品與包裝設定</h3>
        </div>

        {/* 滑動式計算模式切換器 */}
        <div className="toggle-switch-container">
          <span className="toggle-switch-label">
            {recipe.calcMethod === 'single-piece' ? '當前模式：單顆生熟重換算法 ⚖️' : '當前模式：批次比例損耗法 📊'}
          </span>
          <label className="switch" title="切換計算方式：批次比例損耗法 / 單顆生熟重換算法">
            <input
              type="checkbox"
              checked={recipe.calcMethod === 'single-piece'}
              onChange={(e) => {
                const nextMethod = e.target.checked ? 'single-piece' : 'batch';
                onChange({
                  ...recipe,
                  calcMethod: nextMethod,
                  // 初始化單顆重
                  rawDoughPieceWeight: recipe.rawDoughPieceWeight || 50,
                  bakedPieceWeight: recipe.bakedPieceWeight || 42
                });
              }}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="form-grid">
          <div className="form-section-full">
            <label className="form-label">食譜檔案名稱 *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="用於存檔管理，例如：經典原味可麗露"
            />
          </div>

          <div>
            <label className="form-label">標籤印製品名 (法規) *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.productName}
              onChange={(e) => updateField('productName', e.target.value)}
              placeholder="印在標籤上的品名"
            />
          </div>

          <div>
            <label className="form-label">
              包裝淨重 (公克 g) *
              <span className="tooltip-trigger" title="指單個包裝的食品淨重，不含包裝袋/盒重。">
                <HelpCircle size={12} />
              </span>
            </label>
            <input
              type="number"
              className="form-input"
              value={recipe.netWeight || ''}
              onChange={(e) => updateField('netWeight', Math.max(0, Number(e.target.value)))}
              placeholder="例如：250"
            />
          </div>

          <div>
            <label className="form-label">
              淨重誤差值 (± 選填)
              <span className="tooltip-trigger" title="例如輸入「9」或「3%」。有填寫時標籤會顯示「± 誤差值」，留空則不顯示。">
                <HelpCircle size={12} />
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              value={recipe.netWeightTolerance || ''}
              onChange={(e) => updateField('netWeightTolerance', e.target.value)}
              placeholder="例如：9 或 3% (留空不顯示)"
            />
          </div>

          {/* 方法 1：批次比例損耗法欄位 */}
          {recipe.calcMethod !== 'single-piece' && (
            <>
              <div>
                <label className="form-label">每一份量 (公克 g) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={recipe.servingSize || ''}
                  onChange={(e) => updateField('servingSize', Math.max(0, Number(e.target.value)))}
                  placeholder="單個或建議食用量，如：50"
                />
              </div>

              <div>
                <label className="form-label">本包裝含份數 *</label>
                <input
                  type="number"
                  className="form-input"
                  value={recipe.servings || ''}
                  onChange={(e) => updateField('servings', Math.max(0, Number(e.target.value)))}
                  placeholder="例如：5"
                />
              </div>

              <div>
                <label className="form-label">烤焙損耗計算模式</label>
                <select
                  className="form-select"
                  value={recipe.lossRateMode}
                  onChange={(e) => updateField('lossRateMode', e.target.value)}
                >
                  <option value="manual">手動輸入烤焙損耗率 (%)</option>
                  <option value="auto">自動 (將成品重設為包裝淨重)</option>
                </select>
              </div>

              {recipe.lossRateMode === 'manual' && (
                <div>
                  <label className="form-label">
                    烤焙損耗率 (%) 
                    <span className="tooltip-trigger" title="麵團烤焙過程中水分散失比率。損耗率 = (生重 - 熟重) / 生重 * 100%">
                      <HelpCircle size={12} />
                    </span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={recipe.lossRate}
                    onChange={(e) => updateField('lossRate', Math.max(0, Math.min(100, Number(e.target.value))))}
                    placeholder="例如：10"
                  />
                </div>
              )}
            </>
          )}

          {/* 方法 2：單顆生熟重換算法欄位 */}
          {recipe.calcMethod === 'single-piece' && (
            <>
              <div>
                <label className="form-label">單顆生麵糊重量 (g) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={recipe.rawDoughPieceWeight || ''}
                  onChange={(e) => updateField('rawDoughPieceWeight', Math.max(0, Number(e.target.value)))}
                  placeholder="例如：50"
                />
              </div>

              <div>
                <label className="form-label">單顆熟成品重量 (g) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={recipe.bakedPieceWeight || ''}
                  onChange={(e) => updateField('bakedPieceWeight', Math.max(0, Number(e.target.value)))}
                  placeholder="例如：42"
                />
              </div>

              <div className="form-section-full derived-value-indicator">
                <span className="derived-badge">自動換算資訊</span>
                <span className="derived-val-item">自動水分蒸發率: <strong>{nutrition.derivedLossRate}%</strong></span>
                <span className="derived-val-item">每份克數: <strong>{nutrition.derivedServingSize}g</strong></span>
                <span className="derived-val-item">包裝含份數: <strong>{nutrition.derivedServings} 份</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 區塊 2: 配方食材比例與重量 */}
      <div className="form-card">
        <div className="card-title-bar-flex">
          <div className="title-left">
            <Sparkles size={18} className="card-title-icon" />
            <h3>配方原料與重量比例</h3>
          </div>
          <button
            type="button"
            className="link-action-btn"
            onClick={onOpenIngredientManager}
          >
            管理/新增食材資料
          </button>
        </div>

        {recipe.ingredients.length === 0 ? (
          <div className="empty-ingredients-panel">
            <p>目前食譜中沒有任何原料。</p>
            <button
              type="button"
              className="microsoft-btn microsoft-btn-primary btn-sm"
              onClick={handleAddIngredientRow}
            >
              <Plus size={14} className="btn-icon" />
              新增第一項原料
            </button>
          </div>
        ) : (
          <div className="ingredients-editor-list">
            <div className="editor-list-header">
              <span className="col-name">食材名稱</span>
              <span className="col-weight">重量 (g)</span>
              <span className="col-bakers">烘焙%</span>
              <span className="col-cost">預估成本</span>
              <span className="col-actions"></span>
            </div>

            {recipe.ingredients.map((row, idx) => {
              const ing = ingredients.find((i) => i.id === row.ingredientId);
              const bakersPercent = ((row.weight / baseWeight) * 100).toFixed(1);
              const cost = ing && ing.costPerKg ? ((row.weight / 1000) * ing.costPerKg).toFixed(1) : '-';

              return (
                <div key={idx} className="ingredient-row-item">
                  <div className="col-name">
                    <select
                      className="form-select select-sm"
                      value={row.ingredientId}
                      onChange={(e) => handleIngredientChange(idx, e.target.value)}
                    >
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} {i.isCustom ? '[自訂]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-weight">
                    <input
                      type="number"
                      className="form-input input-sm text-right"
                      value={row.weight}
                      onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                    />
                  </div>
                  <div className="col-bakers text-muted font-mono text-sm">
                    {bakersPercent}%
                  </div>
                  <div className="col-cost text-muted text-sm">
                    {cost !== '-' ? `$${cost}` : '-'}
                  </div>
                  <div className="col-actions">
                    <button
                      type="button"
                      className="action-icon-btn delete-btn"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      title="刪除原料"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="editor-list-actions">
              <button
                type="button"
                className="microsoft-btn btn-sm"
                onClick={handleAddIngredientRow}
              >
                <Plus size={14} className="btn-icon" />
                增加原料品項
              </button>
            </div>

            {/* 配方統計摘要 */}
            <div className="recipe-calc-summary">
              <div className="summary-item">
                <span>配方總重 (生重):</span>
                <strong>{nutrition.totalRawWeight.toFixed(1)} 克 (g)</strong>
              </div>
              <div className="summary-item">
                <span>烤焙後成品重:</span>
                <strong>{nutrition.finishedWeight.toFixed(1)} 克 (g)</strong>
              </div>
              <div className="summary-item">
                <span>配方預估總成本:</span>
                <strong className="text-success">${nutrition.totalCost} 元</strong>
              </div>
              <div className="summary-item">
                <span>單份預估成本:</span>
                <strong className="text-success">${nutrition.costPerServing} 元</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 區塊 3: 烘焙/生產與法規標示欄位 */}
      <div className="form-card">
        <div className="card-title-bar-flex">
          <div className="title-left">
            <Info size={18} className="card-title-icon" />
            <h3>包裝安全標示法規欄位</h3>
          </div>
          <button
            type="button"
            className="link-action-btn"
            onClick={handleApplySampleManufacturer}
            title="一鍵填入工作室的預設資訊"
          >
            代入烘焙坊範本
          </button>
        </div>
        
        <div className="form-grid">
          <div>
            <label className="form-label">原產地 (國) *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.origin}
              onChange={(e) => updateField('origin', e.target.value)}
              placeholder="例如：台灣、日本"
            />
          </div>

          <div>
            <label className="form-label">製造商/委託商 *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.manufacturer}
              onChange={(e) => updateField('manufacturer', e.target.value)}
              placeholder="例如：XX 甜點工作室"
            />
          </div>

          <div className="form-section-full">
            <label className="form-label">製造商地址 *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="完整的地址"
            />
          </div>

          <div>
            <label className="form-label">聯絡電話 *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="例如：02-12345678"
            />
          </div>

          <div>
            <label className="form-label">有效日期標示說明 *</label>
            <input
              type="text"
              className="form-input"
              value={recipe.expirationText}
              onChange={(e) => updateField('expirationText', e.target.value)}
              placeholder="例如：標示於包裝上、常溫保存 3 天"
            />
          </div>

          <div>
            <label className="form-label">過敏原標示模式</label>
            <select
              className="form-select"
              value={recipe.allergenAlertMode}
              onChange={(e) => updateField('allergenAlertMode', e.target.value)}
            >
              <option value="auto">自動偵測 (依食材庫設定自動生成)</option>
              <option value="manual">手動輸入自訂警語</option>
            </select>
          </div>

          {recipe.allergenAlertMode === 'manual' && (
            <div className="form-section-full">
              <label className="form-label">自訂過敏原警語</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={recipe.customAllergensText || ''}
                onChange={(e) => updateField('customAllergensText', e.target.value)}
                placeholder="例如：※本產品含蛋、牛奶、麩質，不適合對其過敏者食用。"
              />
            </div>
          )}
        </div>
      </div>

      {/* 區塊 4: 標籤外觀與排版客製化 */}
      <div className="form-card">
        <div className="card-title-bar">
          <Percent size={18} className="card-title-icon" />
          <h3>標籤排版自訂樣式</h3>
        </div>
        <div className="form-grid">
          <div>
            <label className="form-label">標籤格式</label>
            <select
              className="form-select"
              value={recipe.labelType}
              onChange={(e) => updateField('labelType', e.target.value)}
            >
              <option value="double-column">標準雙欄位 (每份 & 每100g)</option>
              <option value="daily-value">每日參考百分比 % 欄位</option>
              <option value="horizontal">橫式標籤 (適合窄扁包裝)</option>
            </select>
          </div>

          <div>
            <label className="form-label">標籤寬度 (像素 px)</label>
            <input
              type="number"
              className="form-input"
              value={recipe.labelWidth}
              onChange={(e) => updateField('labelWidth', Math.max(250, Math.min(600, Number(e.target.value))))}
            />
          </div>

          <div>
            <label className="form-label">基礎字型大小 (像素 px)</label>
            <input
              type="number"
              className="form-input"
              value={recipe.fontSize}
              onChange={(e) => updateField('fontSize', Math.max(10, Math.min(24, Number(e.target.value))))}
            />
          </div>

          <div>
            <label className="form-label">框線粗細 (像素 px)</label>
            <input
              type="number"
              className="form-input"
              value={recipe.borderWidth}
              onChange={(e) => updateField('borderWidth', Math.max(0, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div>
            <label className="form-label">邊框圓角 (像素 px)</label>
            <input
              type="number"
              className="form-input"
              value={recipe.borderRadius}
              onChange={(e) => updateField('borderRadius', Math.max(0, Math.min(30, Number(e.target.value))))}
            />
          </div>

          <div>
            <label className="form-label">語言對照顯示 *</label>
            <select
              className="form-select"
              value={recipe.languageMode || (recipe.showBilingual ? 'bilingual' : 'zh')}
              onChange={(e) => {
                const nextLang = e.target.value as 'zh' | 'en' | 'bilingual';
                onChange({
                  ...recipe,
                  languageMode: nextLang,
                  showBilingual: nextLang === 'bilingual'
                });
              }}
            >
              <option value="zh">繁體中文 (Traditional Chinese)</option>
              <option value="en">僅英文 (English Only)</option>
              <option value="bilingual">中英雙語對照 (Bilingual)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
