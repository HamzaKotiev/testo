// Пример unit-теста для проверки функциональности
import { AppManager } from '../scripts/app.js';
import { CacheManager } from '../scripts/utils.js';

describe('AppManager', () => {
  let app;

  beforeEach(() => {
    app = new AppManager();
  });

  test('should initialize correctly', () => {
    expect(app).toBeDefined();
    expect(app.categories).toBeInstanceOf(Array);
  });

  test('should handle category selection', () => {
    app.handleCategorySelect('pizza');
    expect(app.selectedCategoryId).toBe('pizza');
  });

  test('should clear selection', () => {
    app.selectedCategoryId = 'test';
    app.clearSelection();
    expect(app.selectedCategoryId).toBeNull();
  });

  test('should cache data', async () => {
    await app.loadCategories();
    const cached = CacheManager.get('app_data_cache');
    expect(cached).toBeDefined();
  });
});

// Тестовые JSON файлы
describe('TestData', () => {
  test('should have valid categories structure', () => {
    const testCategories = [
      {
        id: 'pizza',
        name: 'Пицца',
        subcategories: [
          { id: 'classic', name: 'Классика' },
          { id: 'premium', name: 'Премиум' }
        ]
      }
    ];
    
    expect(testCategories).toBeInstanceOf(Array);
    expect(testCategories[0]).toHaveProperty('id');
    expect(testCategories[0]).toHaveProperty('name');
    expect(testCategories[0]).toHaveProperty('subcategories');
  });

  test('should have valid items structure', () => {
    const testItems = [
      {
        id: 1,
        name: 'Маргарита',
        description: 'Томатный соус, сыр',
        price: 499,
        image: 'pizza1.jpg',
        categoryId: 'pizza',
        subcategoryId: 'classic'
      }
    ];
    
    expect(testItems).toBeInstanceOf(Array);
    expect(testItems[0]).toHaveProperty('id');
    expect(testItems[0]).toHaveProperty('name');
    expect(testItems[0]).toHaveProperty('price');
  });
});