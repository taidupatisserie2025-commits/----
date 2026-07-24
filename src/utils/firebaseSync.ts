import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

// 剖析並取得 Firebase app 實例
export const getFirebaseApp = (configJson: string) => {
  if (!configJson) return null;
  try {
    const config = JSON.parse(configJson.trim());
    if (!config.apiKey || !config.projectId) {
      throw new Error('不完整的 Firebase 設定檔。必須包含 apiKey 與 projectId。');
    }
    
    // 如果尚未初始化，則進行初始化；若已初始化，則重用舊的實例
    if (getApps().length === 0) {
      return initializeApp(config);
    } else {
      return getApp();
    }
  } catch (err) {
    console.error('Firebase 初始化失敗:', err);
    throw err;
  }
};

// 雲端同步寫入 (上傳)
export const uploadToFirebase = async (
  configJson: string,
  syncKey: string,
  data: { recipes: any[]; ingredients: any[] }
): Promise<void> => {
  const app = getFirebaseApp(configJson);
  if (!app || !syncKey) return;

  const db = getDatabase(app);
  const syncRef = ref(db, `sync/${syncKey}`);
  
  await set(syncRef, {
    recipes: data.recipes,
    ingredients: data.ingredients,
    updatedAt: Date.now()
  });
};

// 雲端同步即時訂閱 (回傳 unsubscribe 函數)
export const subscribeToFirebase = (
  configJson: string,
  syncKey: string,
  onUpdate: (data: { recipes: any[]; ingredients: any[]; updatedAt: number }) => void,
  onError: (err: any) => void
): (() => void) => {
  try {
    const app = getFirebaseApp(configJson);
    if (!app || !syncKey) return () => {};

    const db = getDatabase(app);
    const syncRef = ref(db, `sync/${syncKey}`);

    // 使用 onValue 監聽即時變動
    const unsubscribe = onValue(
      syncRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val && (val.recipes || val.ingredients)) {
            onUpdate({
              recipes: val.recipes || [],
              ingredients: val.ingredients || [],
              updatedAt: val.updatedAt || 0
            });
          }
        }
      },
      (error) => {
        console.error('Firebase 即時訂閱失敗:', error);
        onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Firebase 訂閱啟動錯誤:', err);
    onError(err);
    return () => {};
  }
};
