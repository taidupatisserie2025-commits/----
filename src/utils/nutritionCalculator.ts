import type { Ingredient, Recipe } from '../types';

export interface CalculatedNutrition {
  per100g: {
    calories: number;
    protein: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    carbohydrates: number;
    sugar: number;
    sodium: number;
  };
  perServing: {
    calories: number;
    protein: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    carbohydrates: number;
    sugar: number;
    sodium: number;
  };
  dailyValuePercentage: {
    calories: number;
    protein: number;
    fat: number;
    saturatedFat: number;
    carbohydrates: number;
    sodium: number;
  };
  totalRawWeight: number;
  finishedWeight: number;
  ingredientsSorted: { name: string; weight: number; percent: number }[];
  allergensDetected: string[];
  totalCost: number;
  costPerServing: number;
  derivedLossRate: number;
  derivedServingSize: number;
  derivedServings: number;
}

// 台灣衛福部食品每日營養素攝取量基準值 (TFDA Daily Reference Values)
export const DAILY_REF_VALUES = {
  calories: 2000,      // 大卡
  protein: 60,         // 公克
  fat: 60,             // 公克
  saturatedFat: 18,    // 公克
  carbohydrates: 300,  // 公克
  sodium: 2000,        // 毫克
};

/**
 * 計算食譜營養成分與相關數據
 */
export function calculateNutrition(
  recipe: Recipe,
  ingredientList: Ingredient[]
): CalculatedNutrition {
  // 1. 初始化累加器
  let totalRawWeight = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalSaturatedFat = 0;
  let totalTransFat = 0;
  let totalCarbohydrates = 0;
  let totalSugar = 0;
  let totalSodium = 0;
  let totalCost = 0;

  const allergensSet = new Set<string>();
  const ingredientsSorted: { name: string; weight: number; percent: number }[] = [];

  // 2. 計算總配方成分與其營養成分總量
  recipe.ingredients.forEach((recipeIng) => {
    const ing = ingredientList.find((i) => i.id === recipeIng.ingredientId);
    if (!ing) return;

    const weight = recipeIng.weight;
    totalRawWeight += weight;

    // 每 100g 的營養素，換算成該重量所含的營養素
    const factor = weight / 100;
    totalCalories += ing.calories * factor;
    totalProtein += ing.protein * factor;
    totalFat += ing.fat * factor;
    totalSaturatedFat += ing.saturatedFat * factor;
    totalTransFat += ing.transFat * factor;
    totalCarbohydrates += ing.carbohydrates * factor;
    totalSugar += ing.sugar * factor;
    totalSodium += ing.sodium * factor;

    // 計算成本
    if (ing.costPerKg) {
      totalCost += (weight / 1000) * ing.costPerKg;
    }

    // 收集過敏原
    if (ing.allergens && ing.allergens.length > 0) {
      ing.allergens.forEach((a) => allergensSet.add(a));
    }

    ingredientsSorted.push({
      name: ing.name.split(' (')[0], // 拿掉英文/括號後綴
      weight,
      percent: 0 // 後續計算
    });
  });

  // 計算烘焙百分比 & 排序
  if (totalRawWeight > 0) {
    ingredientsSorted.forEach((item) => {
      item.percent = (item.weight / totalRawWeight) * 100;
    });
    // 依重量由大到小排序 (符合法規)
    ingredientsSorted.sort((a, b) => b.weight - a.weight);
  }

  // 3. 計算生熟單顆換算與烤焙後成品重 (Finished Yield Weight)
  let derivedLossRate = recipe.lossRate;
  let derivedServingSize = recipe.servingSize;
  let derivedServings = recipe.servings;

  if (
    recipe.calcMethod === 'single-piece' &&
    recipe.rawDoughPieceWeight &&
    recipe.bakedPieceWeight &&
    recipe.rawDoughPieceWeight > 0
  ) {
    derivedLossRate = ((recipe.rawDoughPieceWeight - recipe.bakedPieceWeight) / recipe.rawDoughPieceWeight) * 100;
    derivedServingSize = recipe.bakedPieceWeight;
    derivedServings = recipe.bakedPieceWeight > 0 ? parseFloat((recipe.netWeight / recipe.bakedPieceWeight).toFixed(2)) : recipe.servings;
  }

  let finishedWeight = totalRawWeight;
  if (recipe.calcMethod === 'single-piece') {
    finishedWeight = totalRawWeight * (1 - derivedLossRate / 100);
  } else if (recipe.lossRateMode === 'manual') {
    finishedWeight = totalRawWeight * (1 - recipe.lossRate / 100);
  } else if (recipe.lossRateMode === 'auto' && recipe.netWeight > 0) {
    finishedWeight = recipe.netWeight;
  }
  
  if (finishedWeight <= 0) {
    finishedWeight = totalRawWeight > 0 ? totalRawWeight : 100; // 防呆
  }

  // 4. 計算每 100g 含量
  // 成品 100g 佔總成品重的比例
  const factor100g = totalRawWeight > 0 ? (100 / finishedWeight) : 0;
  
  const per100g = {
    calories: Math.max(0, parseFloat((totalCalories * factor100g).toFixed(1))),
    protein: Math.max(0, parseFloat((totalProtein * factor100g).toFixed(1))),
    fat: Math.max(0, parseFloat((totalFat * factor100g).toFixed(1))),
    saturatedFat: Math.max(0, parseFloat((totalSaturatedFat * factor100g).toFixed(1))),
    transFat: Math.max(0, parseFloat((totalTransFat * factor100g).toFixed(1))),
    carbohydrates: Math.max(0, parseFloat((totalCarbohydrates * factor100g).toFixed(1))),
    sugar: Math.max(0, parseFloat((totalSugar * factor100g).toFixed(1))),
    sodium: Math.max(0, Math.round(totalSodium * factor100g)),
  };

  // 5. 計算每份含量 (Per Serving)
  const servingSize = derivedServingSize > 0 ? derivedServingSize : 100;
  const servingFactor = servingSize / 100;

  const perServing = {
    calories: parseFloat((per100g.calories * servingFactor).toFixed(1)),
    protein: parseFloat((per100g.protein * servingFactor).toFixed(1)),
    fat: parseFloat((per100g.fat * servingFactor).toFixed(1)),
    saturatedFat: parseFloat((per100g.saturatedFat * servingFactor).toFixed(1)),
    transFat: parseFloat((per100g.transFat * servingFactor).toFixed(1)),
    carbohydrates: parseFloat((per100g.carbohydrates * servingFactor).toFixed(1)),
    sugar: parseFloat((per100g.sugar * servingFactor).toFixed(1)),
    sodium: Math.round(per100g.sodium * servingFactor),
  };

  // 6. 計算每日參考值百分比 (Daily Value %)
  const dailyValuePercentage = {
    calories: Math.round((perServing.calories / DAILY_REF_VALUES.calories) * 100),
    protein: Math.round((perServing.protein / DAILY_REF_VALUES.protein) * 100),
    fat: Math.round((perServing.fat / DAILY_REF_VALUES.fat) * 100),
    saturatedFat: Math.round((perServing.saturatedFat / DAILY_REF_VALUES.saturatedFat) * 100),
    carbohydrates: Math.round((perServing.carbohydrates / DAILY_REF_VALUES.carbohydrates) * 100),
    sodium: Math.round((perServing.sodium / DAILY_REF_VALUES.sodium) * 100),
  };

  // 7. 計算單份成本與總成本
  const costPerServing = derivedServings > 0 ? totalCost / derivedServings : 0;

  return {
    per100g,
    perServing,
    dailyValuePercentage,
    totalRawWeight,
    finishedWeight,
    ingredientsSorted,
    allergensDetected: Array.from(allergensSet),
    totalCost: parseFloat(totalCost.toFixed(1)),
    costPerServing: parseFloat(costPerServing.toFixed(1)),
    derivedLossRate: parseFloat(derivedLossRate.toFixed(1)),
    derivedServingSize: parseFloat(derivedServingSize.toFixed(1)),
    derivedServings: parseFloat(derivedServings.toFixed(2))
  };
}

/**
 * 格式化過敏原警語
 */
export function formatAllergenAlert(allergens: string[]): string {
  if (allergens.length === 0) return '';
  // e.g. "本產品含有麥類 (小麥/麩質)、奶類 (牛奶/乳製品)，不適合對其過敏體質者食用。"
  const listStr = allergens.join('、');
  return `※本產品含有${listStr}，不適合對其過敏體質者食用。`;
}

/**
 * 格式化成分列表字串
 */
export function formatIngredientsText(sortedIngredients: { name: string }[]): string {
  return sortedIngredients.map((i) => i.name).join('、');
}
