import { initializeApp, getApps } from 'firebase/app';

import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import firebaseConfig from '../../firebase-config.json';

// ──────────────────────────────────────────────
// Singleton Firebase 初始化
// 使用具名 app 避免與其他 Firebase 專案衝突
// ──────────────────────────────────────────────
const FIREBASE_APP_NAME = 'nutrition-label-app';

function getNutritionApp() {
  const existing = getApps().find(app => app.name === FIREBASE_APP_NAME);
  if (existing) return existing;
  return initializeApp(firebaseConfig, FIREBASE_APP_NAME);
}

function getNutritionDB() {
  return getDatabase(getNutritionApp());
}

// ──────────────────────────────────────────────
// 寫入雲端 (Realtime Database)
// ──────────────────────────────────────────────
export const uploadToFirebase = async (
  syncKey: string,
  data: { recipes: any[]; ingredients: any[] }
): Promise<void> => {
  if (!syncKey) return;

  try {
    const db = getNutritionDB();
    const syncRef = ref(db, `nutrition_sync/${syncKey}`);
    await set(syncRef, {
      recipes: data.recipes,
      ingredients: data.ingredients,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.error('Firebase 上傳失敗:', err);
    throw err;
  }
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
      try {
        const val = snapshot.val();

        // Firebase Realtime Database 會把陣列轉成物件 {0: {...}, 1: {...}}
        // 必須用 toArray 確保還原成正確的 JS 陣列
        const toArray = (maybeArr: any): any[] => {
          if (!maybeArr) return [];
          if (Array.isArray(maybeArr)) return maybeArr;
          return Object.values(maybeArr);
        };

        // 即使資料庫是空的（val === null），也要通知 App 連線成功
        // 這樣狀態標籤才能從「同步中」變成「已連線」
        onUpdate({
          recipes: val ? toArray(val.recipes) : [],
          ingredients: val ? toArray(val.ingredients) : [],
          updatedAt: val?.updatedAt || 0
        });
      } catch (parseErr) {
        console.error('Firebase 資料解析錯誤:', parseErr);
      }
    };

    onValue(syncRef, handleValue, (error: any) => {
      console.error('Realtime Database 即時訂閱失敗:', error);
      onError(error);
    });

    return () => {
      off(syncRef, 'value', handleValue);
    };
  } catch (err) {
    console.error('Realtime Database 訂閱啟動錯誤:', err);
    onError(err);
    return () => {};
  }
};
