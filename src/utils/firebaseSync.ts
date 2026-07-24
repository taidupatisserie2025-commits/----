import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import firebaseConfig from '../../firebase-config.json';

// ──────────────────────────────────────────────
// Singleton Firebase 初始化（設定寫死在程式碼中，不需使用者填入）
// ──────────────────────────────────────────────
function getNutritionApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function getNutritionDB() {
  return getDatabase(getNutritionApp());
}

// ──────────────────────────────────────────────
// 寫入雲端 (Realtime Database)
// ──────────────────────────name──────────────────
export const uploadToFirebase = async (
  syncKey: string,
  data: { recipes: any[]; ingredients: any[] }
): Promise<void> => {
  if (!syncKey) return;

  const db = getNutritionDB();
  // 把同步金鑰當作資料庫路徑，不同金鑰完全隔離
  const syncRef = ref(db, `nutrition_sync/${syncKey}`);

  await set(syncRef, {
    recipes: data.recipes,
    ingredients: data.ingredients,
    updatedAt: Date.now()
  });
};

// ──────────────────────────────────────────────
// 即時訂閱雲端同步（Realtime Database onValue）
// 回傳 unsubscribe 函數
// ──────────────────────────────────────────────
export const subscribeToFirebase = (
  syncKey: string,
  onUpdate: (data: { recipes: any[]; ingredients: any[]; updatedAt: number }) => void,
  onError: (err: any) => void
): (() => void) => {
  if (!syncKey) return () => {};

  try {
    const db = getNutritionDB();
    const syncRef = ref(db, `nutrition_sync/${syncKey}`);

    const handleValue = (snapshot: any) => {
      const val = snapshot.val();
      if (val) {
        // Firebase Realtime Database 會把陣列轉成物件 {0: {...}, 1: {...}}
        // 必須用 toArray 確保還原成正確的 JS 陣列
        const toArray = (maybeArr: any): any[] => {
          if (!maybeArr) return [];
          if (Array.isArray(maybeArr)) return maybeArr;
          // Firebase 物件 → 陣列
          return Object.values(maybeArr);
        };

        const recipes = toArray(val.recipes);
        const ingredients = toArray(val.ingredients);

        if (recipes.length > 0 || ingredients.length > 0) {
          onUpdate({
            recipes,
            ingredients,
            updatedAt: val.updatedAt || 0
          });
        }
      }
    };

    onValue(syncRef, handleValue, (error: any) => {
      console.error('Realtime Database 即時訂閱失敗:', error);
      onError(error);
    });

    // 回傳 unsubscribe 函數
    return () => {
      off(syncRef, 'value', handleValue);
    };
  } catch (err) {
    console.error('Realtime Database 訂閱啟動錯誤:', err);
    onError(err);
    return () => {};
  }
};
