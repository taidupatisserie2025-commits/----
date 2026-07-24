import { useState, useEffect } from 'react';
import { FileText, Database, Sun, Moon, Save, Settings, Cloud } from 'lucide-react';
import type { Recipe, Ingredient, AppSettings } from './types';
import { DEFAULT_INGREDIENTS } from './data/defaultIngredients';
import { calculateNutrition } from './utils/nutritionCalculator';
import { RecipeList } from './components/RecipeList';
import { RecipeForm } from './components/RecipeForm';
import { LabelPreview } from './components/LabelPreview';
import { IngredientModal } from './components/IngredientModal';
import { SaveConfirmModal } from './components/SaveConfirmModal';
import { SettingsView } from './components/SettingsView';
import { subscribeToFirebase, uploadToFirebase } from './utils/firebaseSync';


// 建立樣品食譜 (經典原味可麗露) 作為初始資料，提升 UI 體驗
const SAMPLE_RECIPE: Recipe = {
  id: 'recipe-sample-1',
  name: '經典原味可麗露 (Cannelé)',
  productName: '經典原味可麗露',
  ingredients: [
    { ingredientId: 'ing-11', weight: 500 }, // 全脂鮮乳 500g
    { ingredientId: 'ing-4', weight: 50 },   // 無鹽奶油 50g
    { ingredientId: 'ing-6', weight: 200 },  // 細砂糖 200g
    { ingredientId: 'ing-3', weight: 100 },  // 低筋麵粉 100g
    { ingredientId: 'ing-8', weight: 100 },  // 全蛋 100g
    { ingredientId: 'ing-9', weight: 40 },   // 蛋黃 40g
  ],
  netWeight: 500,
  netWeightTolerance: '',
  lossRate: 25,
  lossRateMode: 'manual',
  servingSize: 50,
  servings: 10,
  calcMethod: 'batch',
  rawDoughPieceWeight: 50,
  bakedPieceWeight: 42,
  origin: '台灣',
  manufacturer: '台度法式甜點工作坊 (Taidu Patisserie)',
  address: '台北市大安區信義路四段 100 號',
  phone: '02-2700-1234',
  expirationText: '常溫保存 3 天，冷藏保存 7 天 (標示於包裝上)',
  allergenAlertMode: 'auto',
  labelType: 'double-column',
  labelWidth: 350,
  fontSize: 13,
  borderWidth: 1,
  borderRadius: 4,
  showBilingual: true,
  languageMode: 'bilingual'
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultOrigin: '台灣',
  defaultManufacturer: '',
  defaultAddress: '',
  defaultPhone: '',
  defaultExpirationText: '標示於包裝上',
  printers: [
    { id: 'p-1', name: '標籤機 50mm x 30mm', widthMm: 50, heightMm: 30, minFontSizePx: 10 },
    { id: 'p-2', name: '圓標機 40mm 圓形', widthMm: 40, heightMm: 40, minFontSizePx: 8 }
  ],
  selectedPrinterId: null,
  firebaseSyncEnabled: true,
  firebaseSyncKey: ''
};

export default function App() {
  // 狀態管理
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // 頁籤切換：'editor' 編輯配方標籤 | 'settings' 系統設定頁面
  const [activeTab, setActiveTab] = useState<'editor' | 'settings'>('editor');
  
  // 編輯中的暫存狀態 (使用者修改表單時直接修改這裡，儲存時才寫回 recipes)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  // 髒檔案追蹤
  const [dirtyRecipes, setDirtyRecipes] = useState<Record<string, boolean>>({});

  // UI Modal 狀態
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Firebase 雲端同步狀態
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(0);

  // Microsoft 存檔對話框控制
  const [saveConfirmState, setSaveConfirmState] = useState<{
    isOpen: boolean;
    documentName: string;
    pendingAction: 
      | { type: 'switch'; targetId: string } 
      | { type: 'create' } 
      | null;
  }>({
    isOpen: false,
    documentName: '',
    pendingAction: null
  });

  // 1. 初始化讀取 LocalStorage
  useEffect(() => {
    const storedRecipes = localStorage.getItem('nutrition_calculator_recipes');
    const storedIngredients = localStorage.getItem('nutrition_calculator_ingredients');
    const storedTheme = localStorage.getItem('nutrition_calculator_theme') as 'light' | 'dark';
    const storedSettings = localStorage.getItem('nutrition_calculator_settings');

    // 載入系統設定
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('nutrition_calculator_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // 載入食材庫
    if (storedIngredients) {
      setIngredients(JSON.parse(storedIngredients));
    } else {
      setIngredients(DEFAULT_INGREDIENTS);
      localStorage.setItem('nutrition_calculator_ingredients', JSON.stringify(DEFAULT_INGREDIENTS));
    }

    // 載入食譜
    let loadedRecipes: Recipe[] = [];
    if (storedRecipes) {
      loadedRecipes = JSON.parse(storedRecipes);
      setRecipes(loadedRecipes);
    } else {
      loadedRecipes = [SAMPLE_RECIPE];
      setRecipes(loadedRecipes);
      localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(loadedRecipes));
    }

    // 載入預設選取食譜
    if (loadedRecipes.length > 0) {
      setCurrentRecipeId(loadedRecipes[0].id);
      setEditingRecipe({ ...loadedRecipes[0] });
    }

    // 載入主題
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // 1b. 處理 Firestore 雲端即時訂閱同步
  useEffect(() => {
    // 只要有輸入同步金鑰，就自動訂閱（config 已寫死在程式碼中）
    if (!settings.firebaseSyncKey) {
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    
    let isInitialLoad = true;
    
    const unsubscribe = subscribeToFirebase(
      settings.firebaseSyncKey,
      (remoteData) => {
        // Firebase 有回應就代表連線成功，立即更新狀態標籤
        setSyncStatus('success');

        if (isInitialLoad || remoteData.updatedAt > lastSyncedAt) {
          isInitialLoad = false;
          setLastSyncedAt(remoteData.updatedAt);

          // 雙重保險：確保一定是陣列（Firebase 有時會回傳物件）
          const safeRecipes = Array.isArray(remoteData.recipes) ? remoteData.recipes : [];
          const safeIngredients = Array.isArray(remoteData.ingredients) ? remoteData.ingredients : [];
          
          if (safeRecipes.length > 0) {
            setRecipes(safeRecipes);
            localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(safeRecipes));
            
            if (currentRecipeId) {
              const updated = safeRecipes.find((r: any) => r.id === currentRecipeId);
              if (updated) {
                setEditingRecipe(updated);
                setDirtyRecipes(prev => ({ ...prev, [currentRecipeId]: false }));
              }
            }
          }
          
          if (safeIngredients.length > 0) {
            setIngredients(safeIngredients);
            localStorage.setItem('nutrition_calculator_ingredients', JSON.stringify(safeIngredients));
          }
        }


      },
      (error) => {
        console.error('Firestore sync error:', error);
        setSyncStatus('error');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [settings.firebaseSyncKey, lastSyncedAt, currentRecipeId]);


  // 1c. 觸發 Firestore 上傳
  const triggerFirebaseUpload = async (updatedRecipes: Recipe[], updatedIngredients: Ingredient[]) => {
    if (!settings.firebaseSyncKey) return;
    try {
      setSyncStatus('syncing');
      const now = Date.now();
      await uploadToFirebase(settings.firebaseSyncKey, {
        recipes: updatedRecipes,
        ingredients: updatedIngredients
      });
      setLastSyncedAt(now);
      setSyncStatus('success');
    } catch (err) {
      console.error('Firestore 同步失敗:', err);
      setSyncStatus('error');
    }
  };

  // 2. 監聽瀏覽器關閉/重整，未存檔時彈出原生提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = Object.values(dirtyRecipes).some((isDirty) => isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '您有尚未儲存的食譜變更，確定要離開嗎？';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyRecipes]);

  // 3. 綁定快捷鍵 (Ctrl+S / Cmd+S 存檔, Ctrl+N / Cmd+N 新增)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isSave = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 's';
      const isNew = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'n';

      if (isSave) {
        e.preventDefault();
        handleSaveCurrentRecipe();
      } else if (isNew) {
        e.preventDefault();
        handleNewRecipe();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingRecipe, currentRecipeId, recipes, ingredients, settings]);

  // 切換深淺色主題
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('nutrition_calculator_theme', nextTheme);
  };

  // 4. 新增食譜邏輯 (觸發髒資料檢查)
  const handleNewRecipe = () => {
    if (currentRecipeId && dirtyRecipes[currentRecipeId]) {
      // 若有未存檔修改，先彈出微軟式對話框
      const currentRec = recipes.find(r => r.id === currentRecipeId);
      setSaveConfirmState({
        isOpen: true,
        documentName: currentRec?.name || '未命名配方',
        pendingAction: { type: 'create' }
      });
      return;
    }
    executeCreateRecipe();
  };

  // 執行建立空食譜
  const executeCreateRecipe = () => {
    const newId = `recipe-${Date.now()}`;
    const newRec: Recipe = {
      id: newId,
      name: '新增未命名配方',
      productName: '',
      ingredients: [],
      netWeight: 100,
      netWeightTolerance: '',
      lossRate: 0,
      lossRateMode: 'manual',
      servingSize: 50,
      servings: 2,
      calcMethod: 'batch',
      rawDoughPieceWeight: 50,
      bakedPieceWeight: 42,
      origin: settings.defaultOrigin || '台灣',
      manufacturer: settings.defaultManufacturer || '',
      address: settings.defaultAddress || '',
      phone: settings.defaultPhone || '',
      expirationText: settings.defaultExpirationText || '標示於包裝上',
      allergenAlertMode: 'auto',
      labelType: 'double-column',
      labelWidth: 350,
      fontSize: 13,
      borderWidth: 1,
      borderRadius: 4,
      showBilingual: false,
      languageMode: 'zh'
    };

    const updatedRecipes = [newRec, ...recipes];
    setRecipes(updatedRecipes);
    localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(updatedRecipes));
    
    setCurrentRecipeId(newId);
    setEditingRecipe({ ...newRec });
    setActiveTab('editor'); // 切換回編輯器
    
    // 初始化清空此檔案的 dirty 標記
    setDirtyRecipes(prev => ({ ...prev, [newId]: false }));

    // 同步到雲端
    triggerFirebaseUpload(updatedRecipes, ingredients);
  };

  // 5. 選取食譜檔案邏輯 (觸發髒資料檢查)
  const handleSelectRecipe = (id: string) => {
    if (id === currentRecipeId) {
      setActiveTab('editor');
      return;
    }

    if (currentRecipeId && dirtyRecipes[currentRecipeId]) {
      const currentRec = recipes.find(r => r.id === currentRecipeId);
      setSaveConfirmState({
        isOpen: true,
        documentName: currentRec?.name || '未命名配方',
        pendingAction: { type: 'switch', targetId: id }
      });
      return;
    }
    executeSelectRecipe(id);
  };

  // 執行切換選取食譜
  const executeSelectRecipe = (id: string) => {
    const target = recipes.find((r) => r.id === id);
    if (target) {
      setCurrentRecipeId(id);
      setEditingRecipe({ ...target });
      setActiveTab('editor'); // 強制切回編輯器
    }
  };

  // 6. 儲存目前食譜檔案到資料庫
  const handleSaveCurrentRecipe = () => {
    if (!editingRecipe || !currentRecipeId) return;

    const updatedRecipes = recipes.map((r) =>
      r.id === currentRecipeId ? { ...editingRecipe } : r
    );

    setRecipes(updatedRecipes);
    localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(updatedRecipes));

    // 清除該食譜的未存檔標記
    setDirtyRecipes(prev => ({ ...prev, [currentRecipeId]: false }));

    // 觸發雲端同步
    triggerFirebaseUpload(updatedRecipes, ingredients);
    
    alert(`配方「${editingRecipe.name}」已儲存成功！`);
  };

  // 7. 刪除食譜檔案
  const handleDeleteRecipe = (id: string) => {
    const updated = recipes.filter((r) => r.id !== id);
    setRecipes(updated);
    localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(updated));

    // 若刪除的是當前選取的，則切換到第一個
    if (id === currentRecipeId) {
      if (updated.length > 0) {
        setCurrentRecipeId(updated[0].id);
        setEditingRecipe({ ...updated[0] });
      } else {
        setCurrentRecipeId(null);
        setEditingRecipe(null);
      }
    }

    // 移除該食譜的 dirty 狀態
    setDirtyRecipes(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    // 觸發雲端同步
    triggerFirebaseUpload(updated, ingredients);
  };

  // 8. 接收表單修改，將 editingRecipe 設為髒資料狀態
  const handleRecipeFormChange = (updated: Recipe) => {
    setEditingRecipe(updated);
    if (currentRecipeId) {
      setDirtyRecipes(prev => ({
        ...prev,
        [currentRecipeId]: true
      }));
    }
  };

  // ==========================================
  // 微軟存檔確認 Modal 互動處理
  // ==========================================
  
  // 互動 1: 點擊「儲存」
  const handleConfirmSave = () => {
    if (!editingRecipe || !currentRecipeId) return;

    // 先儲存目前檔案
    const updatedRecipes = recipes.map((r) =>
      r.id === currentRecipeId ? { ...editingRecipe } : r
    );
    setRecipes(updatedRecipes);
    localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(updatedRecipes));
    setDirtyRecipes(prev => ({ ...prev, [currentRecipeId]: false }));

    const pending = saveConfirmState.pendingAction;
    setSaveConfirmState({ isOpen: false, documentName: '', pendingAction: null });

    // 觸發雲端同步
    triggerFirebaseUpload(updatedRecipes, ingredients);

    // 隨後執行待辦動作
    if (pending) {
      if (pending.type === 'switch') {
        const target = updatedRecipes.find(r => r.id === pending.targetId);
        if (target) {
          setCurrentRecipeId(pending.targetId);
          setEditingRecipe({ ...target });
          setActiveTab('editor');
        }
      } else if (pending.type === 'create') {
        const newId = `recipe-${Date.now()}`;
        const newRec: Recipe = {
          id: newId,
          name: '新增未命名配方',
          productName: '',
          ingredients: [],
          netWeight: 100,
          netWeightTolerance: '',
          lossRate: 0,
          lossRateMode: 'manual',
          servingSize: 50,
          servings: 2,
          calcMethod: 'batch',
          rawDoughPieceWeight: 50,
          bakedPieceWeight: 42,
          origin: settings.defaultOrigin || '台灣',
          manufacturer: settings.defaultManufacturer || '',
          address: settings.defaultAddress || '',
          phone: settings.defaultPhone || '',
          expirationText: settings.defaultExpirationText || '標示於包裝上',
          allergenAlertMode: 'auto',
          labelType: 'double-column',
          labelWidth: 350,
          fontSize: 13,
          borderWidth: 1,
          borderRadius: 4,
          showBilingual: false,
          languageMode: 'zh'
        };
        const nextRecipes = [newRec, ...updatedRecipes];
        setRecipes(nextRecipes);
        localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(nextRecipes));
        setCurrentRecipeId(newId);
        setEditingRecipe({ ...newRec });
        setActiveTab('editor');
        triggerFirebaseUpload(nextRecipes, ingredients);
      }
    }
  };

  // 互動 2: 點擊「不儲存」
  const handleConfirmDiscard = () => {
    if (currentRecipeId) {
      const original = recipes.find(r => r.id === currentRecipeId);
      if (original) {
        setEditingRecipe({ ...original });
      }
      setDirtyRecipes(prev => ({ ...prev, [currentRecipeId]: false }));
    }

    const pending = saveConfirmState.pendingAction;
    setSaveConfirmState({ isOpen: false, documentName: '', pendingAction: null });

    // 隨後執行待辦動作
    if (pending) {
      if (pending.type === 'switch') {
        executeSelectRecipe(pending.targetId);
      } else if (pending.type === 'create') {
        executeCreateRecipe();
      }
    }
  };

  // 互動 3: 點擊「取消」
  const handleConfirmCancel = () => {
    setSaveConfirmState({ isOpen: false, documentName: '', pendingAction: null });
  };

  // ==========================================
  // 食材庫管理 CRUD
  // ==========================================
  const handleAddIngredient = (ing: Ingredient) => {
    const updated = [ing, ...ingredients];
    setIngredients(updated);
    localStorage.setItem('nutrition_calculator_ingredients', JSON.stringify(updated));
    triggerFirebaseUpload(recipes, updated);
  };

  const handleUpdateIngredient = (ing: Ingredient) => {
    const updated = ingredients.map((i) => (i.id === ing.id ? ing : i));
    setIngredients(updated);
    localStorage.setItem('nutrition_calculator_ingredients', JSON.stringify(updated));
    triggerFirebaseUpload(recipes, updated);
  };

  const handleDeleteIngredient = (id: string) => {
    const updated = ingredients.filter((i) => i.id !== id);
    setIngredients(updated);
    localStorage.setItem('nutrition_calculator_ingredients', JSON.stringify(updated));
    triggerFirebaseUpload(recipes, updated);
  };

  // ==========================================
  // 儲存系統設定與選擇標籤機
  // ==========================================
  const handleSaveSettings = (updatedSettings: AppSettings) => {
    setSettings(updatedSettings);
    localStorage.setItem('nutrition_calculator_settings', JSON.stringify(updatedSettings));
    
    // 如果設定了同步金鑰，主動上傳一次本地現有數據
    if (updatedSettings.firebaseSyncKey) {
      setTimeout(() => {
        triggerFirebaseUpload(recipes, ingredients);
      }, 600);
    }
  };

  const handleSelectPrinterId = (printerId: string | null) => {
    const updated = {
      ...settings,
      selectedPrinterId: printerId
    };
    setSettings(updated);
    localStorage.setItem('nutrition_calculator_settings', JSON.stringify(updated));
  };

  // ==========================================
  // 資料備份導出與匯入 (JSON)
  // ==========================================
  const handleExportBackup = () => {
    const backupData = {
      version: '1.2',
      recipes,
      ingredients,
      settings
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `自動營養標籤計算機_完整備份_${dateStr}.json`;
    link.href = url;
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (!data.recipes || !data.ingredients) {
          alert('匯入的檔案格式不符合備份檔要求。');
          return;
        }

        if (confirm('匯入備份會完全覆蓋您目前的配方存檔、食材庫與系統設定！是否確認繼續？')) {
          setRecipes(data.recipes);
          setIngredients(data.ingredients);
          
          localStorage.setItem('nutrition_calculator_recipes', JSON.stringify(data.recipes));
          localStorage.setItem('nutrition_calculator_ingredients', JSON.stringify(data.ingredients));

          if (data.settings) {
            setSettings(data.settings);
            localStorage.setItem('nutrition_calculator_settings', JSON.stringify(data.settings));
          }

          if (data.recipes.length > 0) {
            setCurrentRecipeId(data.recipes[0].id);
            setEditingRecipe({ ...data.recipes[0] });
          } else {
            setCurrentRecipeId(null);
            setEditingRecipe(null);
          }
          
          setDirtyRecipes({});
          
          // 如果有設定同步金鑰，還原後同步上傳
          if (data.settings?.firebaseSyncKey || settings.firebaseSyncKey) {
            triggerFirebaseUpload(data.recipes, data.ingredients);
          }
          
          alert('備份檔案已成功還原！');
        }
      } catch (err) {
        alert('解析備份檔案時發生錯誤，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ==========================================
  // 核心營養標籤計算
  // ==========================================
  const nutrition = editingRecipe
    ? calculateNutrition(editingRecipe, ingredients)
    : null;

  return (
    <div className="app-container">
      {/* 1. 側邊存檔區 */}
      <RecipeList
        recipes={recipes}
        currentRecipeId={currentRecipeId}
        dirtyRecipes={dirtyRecipes}
        onSelectRecipe={handleSelectRecipe}
        onNewRecipe={handleNewRecipe}
        onDeleteRecipe={handleDeleteRecipe}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* 2. 主工作區 */}
      <div className="main-workspace">
        <header className="navbar-header">
          <div className="navbar-left">
            <h1 className="navbar-app-title">自動營養標籤計算機</h1>
            
            {/* 編輯器與設定切換頁籤 */}
            <div className="navbar-tabs-container">
              <button
                className={`navbar-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                <FileText size={14} className="btn-icon" />
                配方標籤編輯
              </button>
              <button
                className={`navbar-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={14} className="btn-icon" />
                系統設定
              </button>
            </div>

            {activeTab === 'editor' && editingRecipe && (
              <span className="active-file-title">
                {editingRecipe.name} {dirtyRecipes[currentRecipeId || ''] ? '*' : ''}
              </span>
            )}
          </div>
          
          <div className="navbar-right">
            {/* Firebase 雲端同步狀態顯示 */}
            {settings.firebaseSyncKey && (
              <span 
                className={`sync-status-badge ${syncStatus}`}
                style={{ 
                  fontSize: '0.8rem', 
                  marginRight: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: syncStatus === 'success' ? '#def7ec' : syncStatus === 'error' ? '#fde8e8' : '#e1effe',
                  color: syncStatus === 'success' ? '#03543f' : syncStatus === 'error' ? '#9b1c1c' : '#1e429f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '600'
                }}
              >
                <Cloud size={12} />
                {syncStatus === 'success' && '雲端已連線'}
                {syncStatus === 'syncing' && '雲端同步中...'}
                {syncStatus === 'error' && '雲端連線失敗'}
              </span>
            )}

            <button
              className="sidebar-footer-btn"
              onClick={() => setIsIngredientModalOpen(true)}
              title="查看與管理食材庫，或聯網搜尋"
            >
              <Database size={14} />
              <span>食材資料庫</span>
            </button>
            
            {activeTab === 'editor' && editingRecipe && (
              <button
                className="microsoft-btn microsoft-btn-primary"
                onClick={handleSaveCurrentRecipe}
                title="儲存此配方 (Ctrl+S)"
              >
                <Save size={14} className="btn-icon" />
                儲存 (S)
              </button>
            )}
            
            <button
              className="theme-toggle-btn"
              onClick={handleToggleTheme}
              title={theme === 'light' ? '切換為深色模式' : '切換為淺色模式'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* 雙欄主工作區 / 設定頁面區切換 */}
        {activeTab === 'settings' ? (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        ) : editingRecipe && nutrition ? (
          <div className="workspace-split-view">
            {/* 左側：食譜與標示輸入區 */}
            <div className="form-view-column">
              <RecipeForm
                recipe={editingRecipe}
                ingredients={ingredients}
                nutrition={nutrition}
                onChange={handleRecipeFormChange}
                onOpenIngredientManager={() => setIsIngredientModalOpen(true)}
              />
            </div>

            {/* 右側：排版預覽與匯出 */}
            <div className="preview-view-column">
              <LabelPreview
                recipe={editingRecipe}
                nutrition={nutrition}
                settings={settings}
                onSelectPrinterId={handleSelectPrinterId}
              />
            </div>
          </div>
        ) : (
          <div className="no-recipe-state">
            <FileText size={64} className="no-recipe-icon" />
            <h2>歡迎使用自動營養標籤計算機</h2>
            <p>請在左側存檔區選擇配方檔案，或點擊「新增配方」按鈕建立一個新的烘焙食譜來計算包裝標籤。</p>
            <button className="microsoft-btn microsoft-btn-primary" onClick={handleNewRecipe}>
              建立第一個配方食譜
            </button>
          </div>
        )}
      </div>

      {/* 3. 彈出視窗：食材庫管理 */}
      <IngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        ingredients={ingredients}
        onAddIngredient={handleAddIngredient}
        onUpdateIngredient={handleUpdateIngredient}
        onDeleteIngredient={handleDeleteIngredient}
      />

      {/* 4. 彈出視窗：經典微軟式未存檔提示對話框 */}
      <SaveConfirmModal
        isOpen={saveConfirmState.isOpen}
        documentName={saveConfirmState.documentName}
        onSave={handleConfirmSave}
        onDiscard={handleConfirmDiscard}
        onCancel={handleConfirmCancel}
      />
    </div>
  );
}
