import { CONFIG, SELECTORS, CLASSES, DATA_TYPES, STORAGE_KEYS } from './constants.js';
import { CacheManager, NetworkUtils, DOMUtils, DataUtils, EventUtils, Logger } from './utils.js';

// Основной класс для управления данными и UI
export class AppManager {
  constructor() {
    this.categoryList = document.querySelector(SELECTORS.CATEGORY_LIST);
    this.subcategoryRow = document.querySelector(SELECTORS.SUBCATEGORY_ROW);
    this.subcategoryList = document.querySelector(SELECTORS.SUBCATEGORY_LIST);
    this.content = document.querySelector(SELECTORS.CONTENT);
    
    this.categories = [];
    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    
    this.init();
  }

  // Инициализация приложения
  async init() {
    try {
      Logger.info('Инициализация приложения...');
      
      // Загрузка категорий
      await this.loadCategories();
      
      // Очистка предыдущего состояния
      this.clearSelection();
      
      // Загрузка всех товаров
      await this.loadAllItems();
      
      Logger.success('Приложение успешно инициализировано');
    } catch (error) {
      Logger.error('Ошибка инициализации:', error);
      DOMUtils.showError(this.content, CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  // Загрузка категорий
  async loadCategories() {
    Logger.info('Загрузка категорий...');
    
    try {
      // Проверка кэша
      const cachedCategories = CacheManager.get(STORAGE_KEYS.DATA_CACHE);
      if (cachedCategories) {
        this.categories = cachedCategories;
        this.renderCategories(this.categories);
        return;
      }
      
      // Загрузка с API
      const categories = await NetworkUtils.fetchWithCache(
        `${CONFIG.API_BASE_URL}${DATA_TYPES.CATEGORIES}.json`,
        STORAGE_KEYS.DATA_CACHE
      );
      
      this.categories = categories;
      CacheManager.set(STORAGE_KEYS.DATA_CACHE, categories);
      this.renderCategories(categories);
      
      Logger.success('Категории загружены');
    } catch (error) {
      Logger.error('Ошибка загрузки категорий:', error);
      throw error;
    }
  }

  // Рендеринг категорий
  renderCategories(list) {
    this.categoryList.innerHTML = '';
    
    list.forEach(cat => {
      const li = DOMUtils.createEl('li', [], cat.name);
      li.dataset.id = cat.id;
      li.addEventListener('click', () => this.handleCategorySelect(cat.id));
      this.categoryList.appendChild(li);
    });
  }

  // Обработка выбора категории
  async handleCategorySelect(catId) {
    Logger.info('Выбор категории:', catId);
    
    if (this.selectedCategoryId === catId) {
      this.clearSelection();
      await this.loadAllItems();
      return;
    }

    this.selectedCategoryId = catId;
    this.selectedSubcategoryId = null;
    
    // Обновление UI
    this.updateCategoryUI(catId);
    
    const category = this.categories.find(item => item.id === catId);
    
    if (category && Array.isArray(category.subcategories) && category.subcategories.length > 0) {
      this.renderSubcategories(category.subcategories, catId);
      DOMUtils.toggleClass(this.subcategoryRow, CLASSES.VISIBLE, true);
      this.clearSubcategorySelection();
      await this.loadCategory(catId, null);
      return;
    }

    DOMUtils.toggleClass(this.subcategoryRow, CLASSES.VISIBLE, false);
    this.subcategoryList.innerHTML = '';
    await this.loadCategory(catId, null);
  }

  // Обновление UI категории
  updateCategoryUI(catId) {
    this.categoryList.querySelectorAll('li').forEach(li => {
      DOMUtils.toggleClass(li, CLASSES.ACTIVE, li.dataset.id === catId);
    });
  }

  // Рендеринг подкатегорий
  renderSubcategories(list, catId) {
    this.subcategoryList.innerHTML = '';
    
    list.forEach(sub => {
      const li = DOMUtils.createEl('li', [], sub.name);
      li.dataset.id = sub.id;
      li.addEventListener('click', () => this.handleSubcategorySelect(catId, sub.id));
      this.subcategoryList.appendChild(li);
    });
  }

  // Обработка выбора подкатегории
  async handleSubcategorySelect(catId, subId) {
    Logger.info('Выбор подкатегории:', subId);
    
    if (this.selectedSubcategoryId === subId) {
      this.clearSubcategorySelection();
      await this.loadCategory(catId, null);
      return;
    }

    this.selectedCategoryId = catId;
    this.selectedSubcategoryId = subId;
    
    // Обновление UI
    this.updateSubcategoryUI(subId);
    await this.loadCategory(catId, subId);
  }

  // Обновление UI подкатегории
  updateSubcategoryUI(subId) {
    this.subcategoryList.querySelectorAll('li').forEach(li => {
      DOMUtils.toggleClass(li, CLASSES.ACTIVE, li.dataset.id === subId);
    });
  }

  // Очистка выбора подкатегории
  clearSubcategorySelection() {
    this.selectedSubcategoryId = null;
    this.subcategoryList.querySelectorAll('li').forEach(li => {
      li.classList.remove(CLASSES.ACTIVE);
    });
  }

  // Загрузка категории
  async loadCategory(catId, subId) {
    Logger.info('Загрузка категории:', catId, subId);
    
    DOMUtils.showLoader(this.content);
    
    try {
      const category = this.categories.find(item => item.id === catId);
      const data = await NetworkUtils.fetchWithCache(
        `${CONFIG.API_BASE_URL}${catId}.json`,
        `${STORAGE_KEYS.DATA_CACHE}_${catId}`
      );
      
      const items = DataUtils.sortItemsBySubcategoryOrder(data.items || [], category);
      const filteredItems = DataUtils.filterItems(items, catId, subId);
      
      this.renderItems(filteredItems);
      
      Logger.success('Категория загружена');
    } catch (error) {
      Logger.error('Ошибка загрузки категории:', error);
      DOMUtils.showError(this.content, CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  // Загрузка всех товаров
  async loadAllItems() {
    Logger.info('Загрузка всех товаров...');
    
    DOMUtils.showLoader(this.content);
    
    try {
      const categoryPromises = this.categories.map(async category => {
        const data = await NetworkUtils.fetchWithCache(
          `${CONFIG.API_BASE_URL}${category.id}.json`,
          `${STORAGE_KEYS.DATA_CACHE}_${category.id}`
        );
        return {
          category,
          items: DataUtils.sortItemsBySubcategoryOrder(data.items || [], category)
        };
      });

      const results = await Promise.all(categoryPromises);
      const allItems = results.reduce((acc, result) => {
        return acc.concat(result.items);
      }, []);

      this.renderItems(allItems);
      
      Logger.success('Все товары загружены');
    } catch (error) {
      Logger.error('Ошибка загрузки всех товаров:', error);
      DOMUtils.showError(this.content, CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  // Рендеринг товаров
  renderItems(items) {
    let html = `<div class="items-grid">`;

    if (!items || items.length === 0) {
      DOMUtils.showEmptyState(this.content);
      return;
    }

    items.forEach(item => {
      html += `
        <div class="item-card">
          <img 
            src="${DataUtils.getImageUrl(item.image)}" 
            alt="${item.name}" 
            loading="lazy"
            onerror="this.style.display='none'"
          >
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <div class="price">${DataUtils.formatPrice(item.price)}</div>
        </div>
      `;
    });

    html += '</div>';
    this.content.innerHTML = html;
  }

  // Очистка выбора
  clearSelection() {
    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    
    this.categoryList.querySelectorAll('li').forEach(li => {
      li.classList.remove(CLASSES.ACTIVE);
    });
    
    this.clearSubcategorySelection();
    DOMUtils.toggleClass(this.subcategoryRow, CLASSES.VISIBLE, false);
    this.subcategoryList.innerHTML = '';
  }

  // Очистка кэша
  clearCache() {
    CacheManager.clear();
    Logger.info('Кэш очищен');
  }

  // Обновление данных
  async refreshData() {
    Logger.info('Обновление данных...');
    
    try {
      this.clearCache();
      await this.loadCategories();
      Logger.success('Данные обновлены');
    } catch (error) {
      Logger.error('Ошибка обновления данных:', error);
    }
  }

  // Проверка онлайн-статуса
  checkOnlineStatus() {
    if (!NetworkUtils.isOnline()) {
      Logger.warn('Нет интернет-соединения');
      DOMUtils.showError(this.content, 'Нет интернет-соединения. Проверьте подключение.');
    }
  }
}

// Инициализация приложения
const app = new AppManager();
