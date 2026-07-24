export interface Ingredient {
  id: string;
  name: string;
  // 營養成分 (每 100g 含量)
  calories: number;        // 熱量 (kcal)
  protein: number;         // 蛋白質 (g)
  fat: number;             // 脂肪 (g)
  saturatedFat: number;    // 飽和脂肪 (g)
  transFat: number;        // 反式脂肪 (g)
  carbohydrates: number;   // 碳水化合物 (g)
  sugar: number;           // 糖 (g)
  sodium: number;          // 鈉 (mg)
  allergens: string[];     // 過敏原 (例如：牛奶, 蛋, 小麥, 堅果, 大豆)
  isCustom?: boolean;      // 是否為自訂食材
  costPerKg?: number;      // 每公斤成本 (TWD，加值功能，選填)
}

export interface RecipeIngredient {
  ingredientId: string;
  weight: number;          // 使用重量 (g)
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  netWeight: number;       // 淨重 (g)
  netWeightTolerance?: string; // 淨重誤差值 (±)，選填，如 "9g" 或 "3%"
  lossRate: number;        // 烘焙損耗率/蒸發率 (%)
  lossRateMode: 'manual' | 'auto'; // 'manual' 手動輸入, 'auto' 依食材總重與淨重差自動計算
  servingSize: number;     // 每份克數 (g)
  servings: number;        // 本包裝含幾份
  
  // 計算模式增強
  calcMethod: 'batch' | 'single-piece'; // 'batch' 批次損耗率, 'single-piece' 單顆生熟重換算
  rawDoughPieceWeight?: number; // 單顆生麵糊重 (g)
  bakedPieceWeight?: number;    // 單顆熟成品重 (g)

  // 食品標示法規要求欄位
  productName: string;     // 品名
  origin: string;          // 原產地
  manufacturer: string;    // 製造商/委託商
  address: string;         // 地址
  phone: string;           // 聯絡電話
  expirationText: string;  // 有效日期標示 (例如："標示於包裝上"、"常溫保存7天" 等)
  allergenAlertMode: 'auto' | 'manual'; // 過敏原標示模式 ('auto' 自動偵測, 'manual' 自訂)
  customAllergensText?: string; // 自訂過敏原警語

  // 標籤樣式設定
  labelType: 'double-column' | 'daily-value' | 'horizontal'; // 雙欄位(每份/每100g) | 每日參考值百分比 | 橫式標籤
  labelWidth: number;      // 標籤寬度 (px)，預設 350
  fontSize: number;        // 字型大小 (px)，預設 14
  borderWidth: number;     // 框線粗細 (px)，預設 1
  borderRadius: number;    // 圓角 (px)，預設 4
  showBilingual: boolean;  // 舊版相容性，是否顯示中英雙語對照
  languageMode: 'zh' | 'en' | 'bilingual'; // 'zh' 僅中文, 'en' 僅英文, 'bilingual' 中英對照
}

export interface PrinterProfile {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  minFontSizePx: number;
}

export interface AppSettings {
  defaultOrigin: string;
  defaultManufacturer: string;
  defaultAddress: string;
  defaultPhone: string;
  defaultExpirationText: string;
  printers: PrinterProfile[];
  selectedPrinterId: string | null;
  
  // Firebase 雲端同步設定（設定檔已寫死在程式碼中，只需填入同步金鑰）
  firebaseSyncEnabled?: boolean; // 保留相容性，不再用於判斷邏輯
  firebaseSyncKey?: string;

}

export interface AppState {
  recipes: Recipe[];
  ingredients: Ingredient[];
  currentRecipeId: string | null;
  dirtyRecipes: Record<string, boolean>; // recipeId -> boolean
  settings: AppSettings;
}

