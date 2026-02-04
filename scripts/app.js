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
    this.activeCategories = new Set();
    this.activeSubcategories = new Set();
    
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
    
    if (this.activeCategories.has(catId)) {
      this.activeCategories.delete(catId);
      this.clearSubcategoriesForCategory(catId);
    } else {
      this.activeCategories.add(catId);
    }

    this.updateCategoryUI();
    this.renderSubcategoriesForActiveCategories();
    await this.refreshFilteredItems();
    this.scrollToSection(catId);
  }

  // Обновление UI категории
  updateCategoryUI() {
    this.categoryList.querySelectorAll('li').forEach(li => {
      DOMUtils.toggleClass(li, CLASSES.ACTIVE, this.activeCategories.has(li.dataset.id));
    });
  }

  // Рендеринг подкатегорий
  renderSubcategories(list) {
    this.subcategoryList.innerHTML = '';
    
    list.forEach(sub => {
      const li = DOMUtils.createEl('li', [], sub.name);
      li.dataset.id = sub.id;
      li.dataset.categoryId = sub.categoryId;
      li.dataset.key = `${sub.categoryId}:${sub.id}`;
      li.addEventListener('click', () => this.handleSubcategorySelect(sub.categoryId, sub.id));
      this.subcategoryList.appendChild(li);
    });
  }

  renderSubcategoriesForActiveCategories() {
    if (this.activeCategories.size === 0) {
      DOMUtils.toggleClass(this.subcategoryRow, CLASSES.VISIBLE, false);
      this.subcategoryList.innerHTML = '';
      return;
    }

    const subcategories = this.getActiveSubcategories();
    this.renderSubcategories(subcategories);
    DOMUtils.toggleClass(this.subcategoryRow, CLASSES.VISIBLE, subcategories.length > 0);
    this.updateSubcategoryUI();
  }

  // Обработка выбора подкатегории
  async handleSubcategorySelect(catId, subId) {
    Logger.info('Выбор подкатегории:', subId);
    
    const subcategoryKey = `${catId}:${subId}`;

    if (this.activeSubcategories.has(subcategoryKey)) {
      this.activeSubcategories.delete(subcategoryKey);
    } else {
      this.activeSubcategories.add(subcategoryKey);
      this.activeCategories.add(catId);
    }

    this.updateCategoryUI();
    this.updateSubcategoryUI();
    await this.refreshFilteredItems();
    this.scrollToSection(`${catId}-${subId}`, true);
  }

  // Обновление UI подкатегории
  updateSubcategoryUI() {
    this.subcategoryList.querySelectorAll('li').forEach(li => {
      DOMUtils.toggleClass(li, CLASSES.ACTIVE, this.activeSubcategories.has(li.dataset.key));
    });
  }

  // Очистка выбора подкатегории
  clearSubcategorySelection() {
    this.activeSubcategories.clear();
    this.updateSubcategoryUI();
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
      const filteredItems = DataUtils.filterItems(
        items,
        catId ? [catId] : [],
        subId ? [subId] : []
      );
      
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
    const groupedItems = this.groupItems(items);
    let html = '';

    if (!items || items.length === 0) {
      DOMUtils.showEmptyState(this.content);
      return;
    }

    groupedItems.forEach(categoryGroup => {
      html += `
        <section class="category-section" id="cat-${categoryGroup.id}">
          <h2>${categoryGroup.name}</h2>
      `;

      categoryGroup.subcategories.forEach(subcategoryGroup => {
        html += `
          <section class="subcategory-section" id="sub-${categoryGroup.id}-${subcategoryGroup.id}">
            <h3>${subcategoryGroup.name}</h3>
            <div class="items-grid">
        `;

        subcategoryGroup.items.forEach(item => {
          html += this.renderItemCard(item);
        });

        html += `
            </div>
          </section>
        `;
      });

      html += `
        </section>
      `;
    });

    this.content.innerHTML = html;
  }

  renderItemCard(item) {
    return `
      <div class="item-card">
        <img 
          src="${DataUtils.getImageUrl(item.image)}" 
          alt="${item.name}" 
          loading="lazy"
          onerror="this.style.display='none'"
        >
        <h4>${item.name}</h4>
        <p>${item.description || ''}</p>
        <div class="price">${DataUtils.formatPrice(item.price)}</div>
      </div>
    `;
  }

  groupItems(items) {
    const categoryMap = new Map();
    const subcategoryLookup = new Map();

    this.categories.forEach(category => {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        subcategories: []
      });
      (category.subcategories || []).forEach(sub => {
        subcategoryLookup.set(`${category.id}-${sub.id}`, sub.name);
      });
    });

    items.forEach(item => {
      const categoryGroup = categoryMap.get(item.categoryId);
      if (!categoryGroup) {
        return;
      }

      let subcategoryGroup = categoryGroup.subcategories.find(
        sub => sub.id === item.subcategoryId
      );

      if (!subcategoryGroup) {
        subcategoryGroup = {
          id: item.subcategoryId,
          name: subcategoryLookup.get(`${item.categoryId}-${item.subcategoryId}`) || 'Без подкатегории',
          items: []
        };
        categoryGroup.subcategories.push(subcategoryGroup);
      }

      subcategoryGroup.items.push(item);
    });

    return [...categoryMap.values()].filter(group => group.subcategories.length > 0);
  }

  // Очистка выбора
  clearSelection() {
    this.activeCategories.clear();
    this.activeSubcategories.clear();
    
    this.updateCategoryUI();
    
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

  getActiveSubcategories() {
    return this.categories
      .filter(category => this.activeCategories.has(category.id))
      .flatMap(category =>
        (category.subcategories || []).map(sub => ({
          ...sub,
          categoryId: category.id
        }))
      );
  }

  clearSubcategoriesForCategory(categoryId) {
    [...this.activeSubcategories].forEach(key => {
      if (key.startsWith(`${categoryId}:`)) {
        this.activeSubcategories.delete(key);
      }
    });
  }

  async refreshFilteredItems() {
    if (this.activeCategories.size === 0 && this.activeSubcategories.size === 0) {
      await this.loadAllItems();
      return;
    }

    const filteredItems = await this.getFilteredItems();
    this.renderItems(filteredItems);
  }

  async getFilteredItems() {
    const categoryIds = [...this.activeCategories];
    const subcategoryKeys = [...this.activeSubcategories];

    const categoryPromises = this.categories
      .filter(category => categoryIds.length === 0 || categoryIds.includes(category.id))
      .map(async category => {
        const data = await NetworkUtils.fetchWithCache(
          `${CONFIG.API_BASE_URL}${category.id}.json`,
          `${STORAGE_KEYS.DATA_CACHE}_${category.id}`
        );
        return DataUtils.sortItemsBySubcategoryOrder(data.items || [], category);
      });

    const items = (await Promise.all(categoryPromises)).flat();
    return DataUtils.filterItems(items, categoryIds, subcategoryKeys);
  }

  scrollToSection(id, isSubcategory = false) {
    const targetId = isSubcategory ? `sub-${id}` : `cat-${id}`;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Инициализация приложения
const app = new AppManager();
