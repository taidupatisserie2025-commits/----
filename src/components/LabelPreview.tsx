import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, FileImage, ShieldAlert, BadgeCheck, Printer } from 'lucide-react';
import type { Recipe, AppSettings } from '../types';
import { type CalculatedNutrition, formatAllergenAlert } from '../utils/nutritionCalculator';

interface LabelPreviewProps {
  recipe: Recipe;
  nutrition: CalculatedNutrition;
  settings: AppSettings;
  onSelectPrinterId: (id: string | null) => void;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({
  recipe,
  nutrition,
  settings,
  onSelectPrinterId
}) => {
  const combinedRef = useRef<HTMLDivElement>(null);
  const nutritionRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  // 取得語言設定
  const lang = recipe.languageMode || (recipe.showBilingual ? 'bilingual' : 'zh');
  const showZh = lang === 'zh' || lang === 'bilingual';
  const showEn = lang === 'en' || lang === 'bilingual';
  const showBilingual = lang === 'bilingual';

  // 取得當前選取的標籤機規格
  const selectedPrinter = settings.printers.find(p => p.id === settings.selectedPrinterId) || null;
  const appliedWidth = selectedPrinter ? Math.round(selectedPrinter.widthMm * 3.78) : recipe.labelWidth;
  const appliedFontSize = selectedPrinter ? Math.max(recipe.fontSize, selectedPrinter.minFontSizePx) : recipe.fontSize;
  const isFontWarning = selectedPrinter && recipe.fontSize < selectedPrinter.minFontSizePx;

  // 取得排序後的成分字串
  const sortedIngredientsNames = nutrition.ingredientsSorted.map((item) => item.name).join('、');

  // 過敏原警語
  const allergenText = recipe.allergenAlertMode === 'auto'
    ? formatAllergenAlert(nutrition.allergensDetected)
    : recipe.customAllergensText || '';

  // 法規合規性檢查 (Compliance Checker)
  const complianceErrors: string[] = [];
  if (showZh) {
    if (!recipe.productName) complianceErrors.push('「品名」未填寫');
    if (recipe.ingredients.length === 0) complianceErrors.push('「食譜原料」不可為空');
    if (!recipe.netWeight || recipe.netWeight <= 0) complianceErrors.push('「淨重」未填寫或必須大於 0');
    if (!recipe.origin) complianceErrors.push('「原產地」未填寫');
    if (!recipe.manufacturer) complianceErrors.push('「製造商」未填寫');
    if (!recipe.address) complianceErrors.push('「地址」未填寫');
    if (!recipe.phone) complianceErrors.push('「聯絡電話」未填寫');
    if (!recipe.expirationText) complianceErrors.push('「有效日期」未填寫');
  } else {
    // 英文模式下同樣檢查對應欄位
    if (!recipe.productName) complianceErrors.push('Product Name is empty');
    if (recipe.ingredients.length === 0) complianceErrors.push('Recipe Ingredients cannot be empty');
    if (!recipe.netWeight || recipe.netWeight <= 0) complianceErrors.push('Net Weight must be greater than 0');
    if (!recipe.origin) complianceErrors.push('Country of Origin is empty');
    if (!recipe.manufacturer) complianceErrors.push('Manufacturer is empty');
    if (!recipe.address) complianceErrors.push('Address is empty');
    if (!recipe.phone) complianceErrors.push('Contact Phone is empty');
    if (!recipe.expirationText) complianceErrors.push('Expiration Text is empty');
  }

  // 導出圖片功能 (支援 PNG/JPG)
  const exportImage = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string, format: 'png' | 'jpeg') => {
    if (!ref.current) return;
    
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 3, // 高解析度
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imageType = format === 'png' ? 'image/png' : 'image/jpeg';
      const fileExtension = format === 'png' ? 'png' : 'jpg';
      const url = canvas.toDataURL(imageType, 1.0);
      
      const link = document.createElement('a');
      link.download = `${fileName}.${fileExtension}`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('匯出標籤失敗:', err);
      alert('匯出圖片時發生錯誤');
    }
  };

  // 依設定套用的容器樣式
  const getContainerStyle = () => ({
    width: `${appliedWidth}px`,
    fontSize: `${appliedFontSize}px`,
    borderWidth: `${recipe.borderWidth}px`,
    borderRadius: `${recipe.borderRadius}px`,
    borderStyle: 'solid',
    borderColor: '#000000',
    padding: '12px',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
    lineHeight: '1.4',
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
    minHeight: selectedPrinter && selectedPrinter.heightMm ? `${selectedPrinter.heightMm * 3.78}px` : 'auto',
  });

  // 輔助函式：取得商品標示表頭與標示文字
  const getFieldLabel = (zhLabel: string, enLabel: string) => {
    if (showBilingual) return `${zhLabel} / ${enLabel}`;
    if (showZh) return zhLabel;
    return enLabel;
  };

  return (
    <div className="preview-pane-container">
      {/* 1. 法規安全合規檢查儀表板 */}
      <div className="compliance-dashboard">
        <div className="dashboard-header">
          {complianceErrors.length > 0 ? (
            <div className="status-badge error">
              <ShieldAlert size={16} />
              <span>有 {complianceErrors.length} 項標示欄位不符食安規範</span>
            </div>
          ) : (
            <div className="status-badge success">
              <BadgeCheck size={16} />
              <span>完美合規！所有標示欄位已填齊</span>
            </div>
          )}
        </div>
        {complianceErrors.length > 0 && (
          <ul className="compliance-errors-list">
            {complianceErrors.map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        )}
        
        {/* 標籤機最小字級限制警告 */}
        {isFontWarning && selectedPrinter && (
          <div className="status-badge error" style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            <Printer size={14} style={{ marginRight: '4px' }} />
            <span>⚠️ 當前字型太小 ({recipe.fontSize}px)，已自動將字級極限限制為 {selectedPrinter.minFontSizePx}px 以免列印模糊。</span>
          </div>
        )}
      </div>

      {/* 2. 標籤下載按鈕與標籤機選擇 */}
      <div className="export-action-bar">
        
        {/* 選擇標籤機規格 */}
        <div className="export-dropdown-group">
          <span className="export-group-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Printer size={14} />
            選擇目標標籤機規格:
          </span>
          <select
            className="form-select select-sm"
            style={{ width: '190px' }}
            value={settings.selectedPrinterId || ''}
            onChange={(e) => onSelectPrinterId(e.target.value || null)}
          >
            <option value="">無 (使用食譜寬度設定)</option>
            {settings.printers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.widthMm}x{p.heightMm} mm)
              </option>
            ))}
          </select>
        </div>

        <div className="export-dropdown-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
          <span className="export-group-label">合併標籤匯出 (一般與營養):</span>
          <div className="btn-row">
            <button
              className="microsoft-btn microsoft-btn-primary btn-sm"
              onClick={() => exportImage(combinedRef, `${recipe.name}_完整標籤`, 'png')}
            >
              <Download size={14} className="btn-icon" />
              匯出 PNG
            </button>
            <button
              className="microsoft-btn btn-sm"
              onClick={() => exportImage(combinedRef, `${recipe.name}_完整標籤`, 'jpeg')}
            >
              <FileImage size={14} className="btn-icon" />
              匯出 JPG
            </button>
          </div>
        </div>

        <div className="export-dropdown-group">
          <span className="export-group-label">單獨營養標示匯出:</span>
          <div className="btn-row">
            <button
              className="microsoft-btn btn-sm"
              onClick={() => exportImage(nutritionRef, `${recipe.name}_營養標示`, 'png')}
            >
              <Download size={14} className="btn-icon" />
              PNG
            </button>
            <button
              className="microsoft-btn btn-sm"
              onClick={() => exportImage(nutritionRef, `${recipe.name}_營養標示`, 'jpeg')}
            >
              <FileImage size={14} className="btn-icon" />
              JPG
            </button>
          </div>
        </div>
      </div>

      {/* 3. 標籤排版顯示區 */}
      <div className="label-render-area">
        
        {/* A. 隱藏/用於合併下載的完整包裝標籤 */}
        <div className="hidden-export-container">
          <div
            ref={combinedRef}
            style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              display: 'inline-flex',
              flexDirection: 'column',
              gap: '12px',
              border: '1px solid #ddd'
            }}
          >
            {/* 商品標示表 */}
            <div style={getContainerStyle()}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: `${appliedFontSize + 2}px`, borderBottom: '2px solid #000', paddingBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                {getFieldLabel('商品標示', 'Product Label')}
              </h3>
              <div className="general-label-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>{getFieldLabel('品名', 'Product Name')}: </strong>{recipe.productName || '-'}</div>
                <div><strong>{getFieldLabel('成分', 'Ingredients')}: </strong>{sortedIngredientsNames || '-'}</div>
                <div>
                  <strong>{getFieldLabel('淨重', 'Net Weight')}: </strong>
                  {recipe.netWeight ? (
                    <>
                      {recipe.netWeight} {showZh ? '公克' : ''}{showEn ? ' (g)' : ''}
                      {recipe.netWeightTolerance ? ` ± ${recipe.netWeightTolerance}` : ''}
                    </>
                  ) : '-'}
                </div>
                <div><strong>{getFieldLabel('原產地', 'Country of Origin')}: </strong>{recipe.origin || '-'}</div>
                <div><strong>{getFieldLabel('製造商', 'Manufacturer')}: </strong>{recipe.manufacturer || '-'}</div>
                <div><strong>{getFieldLabel('地址', 'Address')}: </strong>{recipe.address || '-'}</div>
                <div><strong>{getFieldLabel('電話', 'Phone')}: </strong>{recipe.phone || '-'}</div>
                <div><strong>{getFieldLabel('有效日期', 'Expiry Date')}: </strong>{recipe.expirationText || '-'}</div>
                {allergenText && (
                  <div style={{ marginTop: '6px', fontSize: `${appliedFontSize - 1}px`, color: '#d93838', fontWeight: 'bold' }}>
                    {allergenText}
                  </div>
                )}
              </div>
            </div>

            {/* 營養標示表 */}
            <div style={getContainerStyle()}>
              <NutritionLabelBox recipe={recipe} nutrition={nutrition} />
            </div>
          </div>
        </div>

        {/* B. 畫面上呈現的獨立預覽版 */}
        <div className="preview-label-column">
          
          {/* 一般商品標示 Preview */}
          <div className="preview-card-wrapper">
            <span className="preview-card-badge">一般商品標示</span>
            <div ref={productRef} style={getContainerStyle()}>
              {/* 實體標籤高度剪裁參考線 */}
              {selectedPrinter && selectedPrinter.heightMm && (
                <div className="printer-height-boundary" style={{ height: `${selectedPrinter.heightMm * 3.78}px` }} title="標籤紙實體高度邊界" />
              )}
              <h3 style={{ margin: '0 0 8px 0', fontSize: `${appliedFontSize + 2}px`, borderBottom: '2px solid #000', paddingBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                {getFieldLabel('商品標示', 'Product Label')}
              </h3>
              <div className="general-label-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>{getFieldLabel('品名', 'Product Name')}: </strong>{recipe.productName || <span className="text-placeholder">未填寫</span>}</div>
                <div><strong>{getFieldLabel('成分', 'Ingredients')}: </strong>{sortedIngredientsNames || <span className="text-placeholder">無成分原料</span>}</div>
                <div>
                  <strong>{getFieldLabel('淨重', 'Net Weight')}: </strong>
                  {recipe.netWeight ? (
                    <>
                      {recipe.netWeight} {showZh ? '公克' : ''}{showEn ? ' (g)' : ''}
                      {recipe.netWeightTolerance ? ` ± ${recipe.netWeightTolerance}` : ''}
                    </>
                  ) : <span className="text-placeholder">未填寫</span>}
                </div>
                <div><strong>{getFieldLabel('原產地', 'Country of Origin')}: </strong>{recipe.origin || <span className="text-placeholder">未填寫</span>}</div>
                <div><strong>{getFieldLabel('製造商', 'Manufacturer')}: </strong>{recipe.manufacturer || <span className="text-placeholder">未填寫</span>}</div>
                <div><strong>{getFieldLabel('地址', 'Address')}: </strong>{recipe.address || <span className="text-placeholder">未填寫</span>}</div>
                <div><strong>{getFieldLabel('電話', 'Phone')}: </strong>{recipe.phone || <span className="text-placeholder">未填寫</span>}</div>
                <div><strong>{getFieldLabel('有效日期', 'Expiry Date')}: </strong>{recipe.expirationText || <span className="text-placeholder">未填寫</span>}</div>
                {allergenText && (
                  <div style={{ marginTop: '6px', fontSize: `${appliedFontSize - 1}px`, color: '#d93838', fontWeight: 'bold' }}>
                    {allergenText}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 營養標示 Preview */}
          <div className="preview-card-wrapper">
            <span className="preview-card-badge">營養標示</span>
            <div ref={nutritionRef} style={getContainerStyle()}>
              {/* 實體標籤高度剪裁參考線 */}
              {selectedPrinter && selectedPrinter.heightMm && (
                <div className="printer-height-boundary" style={{ height: `${selectedPrinter.heightMm * 3.78}px` }} title="標籤紙實體高度邊界" />
              )}
              <NutritionLabelBox recipe={recipe} nutrition={nutrition} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/**
 * 獨立的營養標示方塊組件，供畫面上與合併下載時共用，符合衛福部公告樣式
 */
const NutritionLabelBox: React.FC<{ recipe: Recipe; nutrition: CalculatedNutrition }> = ({
  recipe,
  nutrition
}) => {
  const { perServing, per100g, dailyValuePercentage, derivedServingSize, derivedServings } = nutrition;
  
  // 取得語言設定
  const lang = recipe.languageMode || (recipe.showBilingual ? 'bilingual' : 'zh');
  const showZh = lang === 'zh' || lang === 'bilingual';
  const showEn = lang === 'en' || lang === 'bilingual';
  const showBilingual = lang === 'bilingual';

  // 輔助翻譯表頭
  const getLabelHeader = (zhHeader: string, enHeader: string) => {
    if (showBilingual) {
      return (
        <>
          <div>{zhHeader}</div>
          <div style={{ fontSize: '0.8em', fontWeight: 'normal' }}>{enHeader}</div>
        </>
      );
    }
    return showZh ? zhHeader : enHeader;
  };

  // 雙欄位標題與表格
  const renderDoubleColumn = () => {
    return (
      <table className="nutrition-table-box" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 'bold' }}>
              {getLabelHeader('營養標示', 'Nutrition Facts')}
            </th>
            <th style={{ textAlign: 'right', padding: '4px 0', width: '30%', fontWeight: 'bold' }}>
              {getLabelHeader('每份', 'Per Serving')}
            </th>
            <th style={{ textAlign: 'right', padding: '4px 0', width: '30%', fontWeight: 'bold' }}>
              {getLabelHeader('每 100 公克', 'Per 100g')}
            </th>
          </tr>
        </thead>
        <tbody>
          {renderRow('熱量', 'Calories', perServing.calories, '大卡', 'kcal', per100g.calories, '大卡', 'kcal')}
          {renderRow('蛋白質', 'Protein', perServing.protein, '公克', 'g', per100g.protein, '公克', 'g')}
          {renderRow('脂肪', 'Fat', perServing.fat, '公克', 'g', per100g.fat, '公克', 'g')}
          {renderRow('  飽和脂肪', '  Saturated Fat', perServing.saturatedFat, '公克', 'g', per100g.saturatedFat, '公克', 'g', true)}
          {renderRow('  反式脂肪', '  Trans Fat', perServing.transFat, '公克', 'g', per100g.transFat, '公克', 'g', true)}
          {renderRow('碳水化合物', 'Carbohydrates', perServing.carbohydrates, '公克', 'g', per100g.carbohydrates, '公克', 'g')}
          {renderRow('  糖', '  Sugars', perServing.sugar, '公克', 'g', per100g.sugar, '公克', 'g', true)}
          {renderRow('鈉', 'Sodium', perServing.sodium, '毫克', 'mg', per100g.sodium, '毫克', 'mg')}
        </tbody>
      </table>
    );
  };

  // 每日參考值百分比表格
  const renderDailyValueColumn = () => {
    return (
      <table className="nutrition-table-box" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 'bold' }}>
              {getLabelHeader('營養標示', 'Nutrition Facts')}
            </th>
            <th style={{ textAlign: 'right', padding: '4px 0', width: '30%', fontWeight: 'bold' }}>
              {getLabelHeader('每份', 'Per Serving')}
            </th>
            <th style={{ textAlign: 'right', padding: '4px 0', width: '30%', fontWeight: 'bold' }}>
              {showBilingual ? (
                <>
                  <div>每日參考值百分比</div>
                  <div style={{ fontSize: '0.8em', fontWeight: 'normal' }}>% Daily Value</div>
                </>
              ) : showZh ? (
                <>
                  <div>每日參考值</div>
                  <div>百分比</div>
                </>
              ) : (
                '% Daily Value'
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {renderRow('熱量', 'Calories', perServing.calories, '大卡', 'kcal', dailyValuePercentage.calories, '%', '%')}
          {renderRow('蛋白質', 'Protein', perServing.protein, '公克', 'g', dailyValuePercentage.protein, '%', '%')}
          {renderRow('脂肪', 'Fat', perServing.fat, '公克', 'g', dailyValuePercentage.fat, '%', '%')}
          {renderRow('  飽和脂肪', '  Saturated Fat', perServing.saturatedFat, '公克', 'g', dailyValuePercentage.saturatedFat, '%', '%', true)}
          {renderRow('  反式脂肪', '  Trans Fat', perServing.transFat, '公克', 'g', '*', '', '', true)}
          {renderRow('碳水化合物', 'Carbohydrates', perServing.carbohydrates, '公克', 'g', dailyValuePercentage.carbohydrates, '%', '%')}
          {renderRow('  糖', '  Sugars', perServing.sugar, '公克', 'g', '*', '', '', true)}
          {renderRow('鈉', 'Sodium', perServing.sodium, '毫克', 'mg', dailyValuePercentage.sodium, '%', '%')}
        </tbody>
      </table>
    );
  };

  // 橫式營養標示表格
  const renderHorizontalLayout = () => {
    return (
      <div className="horizontal-nutrition-box">
        <div style={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '3px' }}>
          {showBilingual ? '營養標示 / Nutrition Facts' : showZh ? '營養標示' : 'Nutrition Facts'}
        </div>
        <div style={{ fontSize: '0.9em', borderBottom: '1px solid #000', padding: '3px 0' }}>
          <div>
            {getFieldText('每一份量：', 'Serving Size: ', `${derivedServingSize} ${showZh ? '公克' : ''}${showEn ? ' (g)' : ''}`)}
          </div>
          <div>
            {getFieldText('本包裝含：', 'Servings Per Package: ', `${derivedServings} ${showZh ? '份' : ''}`)}
          </div>
        </div>
        <table className="nutrition-table-box-horizontal" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>{getFieldText('項目', 'Item', '')}</th>
              <th style={{ textAlign: 'right', padding: '3px 0' }}>{getFieldText('每份', 'Per Serving', '')}</th>
              <th style={{ textAlign: 'right', padding: '3px 0' }}>{getFieldText('每 100 公克', 'Per 100g', '')}</th>
            </tr>
          </thead>
          <tbody>
            {renderHorizontalRow('熱量 / Calories', perServing.calories, showZh ? '大卡' : 'kcal', per100g.calories, showZh ? '大卡' : 'kcal')}
            {renderHorizontalRow('蛋白質 / Protein', perServing.protein, showZh ? '公克' : 'g', per100g.protein, showZh ? '公克' : 'g')}
            {renderHorizontalRow('脂肪 / Fat', perServing.fat, showZh ? '公克' : 'g', per100g.fat, showZh ? '公克' : 'g')}
            {renderHorizontalRow(' 飽和脂肪 / Sat. Fat', perServing.saturatedFat, showZh ? '公克' : 'g', per100g.saturatedFat, showZh ? '公克' : 'g')}
            {renderHorizontalRow(' 反式脂肪 / Trans Fat', perServing.transFat, showZh ? '公克' : 'g', per100g.transFat, showZh ? '公克' : 'g')}
            {renderHorizontalRow('碳水化合物 / Carb', perServing.carbohydrates, showZh ? '公克' : 'g', per100g.carbohydrates, showZh ? '公克' : 'g')}
            {renderHorizontalRow(' 糖 / Sugar', perServing.sugar, showZh ? '公克' : 'g', per100g.sugar, showZh ? '公克' : 'g')}
            {renderHorizontalRow('鈉 / Sodium', perServing.sodium, showZh ? '毫克' : 'mg', per100g.sodium, showZh ? '毫克' : 'mg')}
          </tbody>
        </table>
      </div>
    );
  };

  const getFieldText = (zhPrefix: string, enPrefix: string, val: string) => {
    if (showBilingual) return `${zhPrefix}${val} / ${enPrefix}${val}`;
    return showZh ? `${zhPrefix}${val}` : `${enPrefix}${val}`;
  };

  // 輔助函式：列印橫式列
  const renderHorizontalRow = (name: string, val1: any, unit1: string, val2: any, unit2: string) => {
    const cleanName = showBilingual ? name : showZh ? name.split(' / ')[0] : name.split(' / ')[1];
    return (
      <tr style={{ borderBottom: '1px dashed #ccc' }}>
        <td style={{ padding: '3px 0' }}>{cleanName}</td>
        <td style={{ textAlign: 'right', padding: '3px 0' }}>{val1} {unit1}</td>
        <td style={{ textAlign: 'right', padding: '3px 0' }}>{val2} {unit2}</td>
      </tr>
    );
  };

  // 輔助函式：渲染標準列 (支援雙語與層級縮排)
  const renderRow = (
    nameZh: string,
    nameEn: string,
    val1: any,
    unit1Zh: string,
    unit1En: string,
    val2: any,
    unit2Zh: string,
    unit2En: string,
    isIndent: boolean = false
  ) => {
    const isSpecialValue = val2 === '*';
    const unit1 = showBilingual ? `${unit1Zh}/${unit1En}` : showZh ? unit1Zh : unit1En;
    const unit2 = showBilingual ? `${unit2Zh}/${unit2En}` : showZh ? unit2Zh : unit2En;

    return (
      <tr style={{ borderBottom: '1px solid #eee' }}>
        <td style={{ padding: '4px 0', paddingLeft: isIndent ? '12px' : '0' }}>
          {showBilingual ? (
            <>
              <strong>{nameZh}</strong>
              <span style={{ fontSize: '0.85em', color: '#555', display: 'block', fontWeight: 'normal' }}>
                {nameEn}
              </span>
            </>
          ) : (
            <strong>{showZh ? nameZh : nameEn}</strong>
          )}
        </td>
        <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'middle' }}>
          {val1} {unit1}
        </td>
        <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'middle' }}>
          {isSpecialValue ? '*' : `${val2} ${unit2}`}
        </td>
      </tr>
    );
  };

  return (
    <div className="nutrition-box-container">
      {/* 標籤上方的份量說明 */}
      {recipe.labelType !== 'horizontal' && (
        <div className="nutrition-header-servings" style={{ borderBottom: '2px solid #000', paddingBottom: '4px', fontSize: '0.95em' }}>
          <h3 style={{ margin: '0 0 4px 0', textAlign: 'center', fontSize: `${recipe.fontSize + 2}px`, fontWeight: 'bold' }}>
            {showBilingual ? '營養標示 / Nutrition Facts' : showZh ? '營養標示' : 'Nutrition Facts'}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{getFieldText('每一份量：', 'Serving Size: ', '')}</span>
            <strong>{derivedServingSize} {showZh ? '公克' : ''}{showEn ? ' (g)' : ''}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{getFieldText('本包裝含：', 'Servings Per Package: ', '')}</span>
            <strong>{derivedServings} {showZh ? '份' : ''}{showEn ? ' (Servings)' : ''}</strong>
          </div>
        </div>
      )}

      {/* 依格式渲染表格 */}
      {recipe.labelType === 'double-column' && renderDoubleColumn()}
      {recipe.labelType === 'daily-value' && renderDailyValueColumn()}
      {recipe.labelType === 'horizontal' && renderHorizontalLayout()}

      {/* 每日參考值註腳 */}
      {recipe.labelType === 'daily-value' && (
        <div style={{ fontSize: '0.75em', marginTop: '6px', borderTop: '1px solid #000', paddingTop: '4px', color: '#555' }}>
          {showBilingual ? (
            <>
              <div>* 參考值未訂定 / * Daily Value not established</div>
              <div>
                每日參考值：熱量 2000大卡、蛋白質 60公克、脂肪 60公克、飽和脂肪 18公克、碳水化合物 300公克、鈉 2000毫克。
              </div>
            </>
          ) : showZh ? (
            <>
              <div>* 參考值未訂定</div>
              <div>
                每日參考值：熱量 2000大卡、蛋白質 60公克、脂肪 60公克、飽和脂肪 18公克、碳水化合物 300公克、鈉 2000毫克。
              </div>
            </>
          ) : (
            <>
              <div>* Daily Reference Value not established</div>
              <div>
                Daily Reference Values: Calories 2000 kcal, Protein 60g, Fat 60g, Saturated Fat 18g, Carbohydrate 300g, Sodium 2000mg.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
