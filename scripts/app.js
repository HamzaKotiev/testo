import { CONFIG, SELECTORS, CLASSES, DATA_TYPES, STORAGE_KEYS } from './constants.js';
import { CacheManager, NetworkUtils, DOMUtils, DataUtils, EventUtils, Logger } from './utils.js';

// Основной класс для управления данными и UI
export class AppManager {
  constructor() {
    this.categoryList = document.querySelector(SELECTORS.CATEGORY_LIST);
    this.subcategoryRow = document.querySelector(SELECTORS.SUBCATEGORY_ROW);
    this.subcategoryList = document.querySelector(SELECTORS.SUBCATEGORY_LIST);
    this.content = document.querySelector(SELECTORS.CONTENT);
    this.header = document.querySelector('header');
    
    this.categories = [];
    this.items = [];
    this.siteData = null;
    this.activeCategories = new Set();
    this.activeSubcategories = new Set();
    
    this.init();
  }

  // Инициализация приложения
  async init() {
    try {
      Logger.info('Инициализация приложения...');
      
      // Загрузка темы
      await this.loadTheme();

      // Загрузка данных сайта
      await this.loadSiteData();
      
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

  // Загрузка данных сайта
  async loadSiteData() {
    Logger.info('Загрузка данных сайта...');
    
    try {
      const cachedSite = CacheManager.get(STORAGE_KEYS.SITE_CACHE);
      if (cachedSite) {
        this.applySiteData(cachedSite);
        return;
      }

      const siteData = await NetworkUtils.fetchWithCache(
        `${CONFIG.API_BASE_URL}${DATA_TYPES.SITE}.json`,
        STORAGE_KEYS.SITE_CACHE
      );

      CacheManager.set(STORAGE_KEYS.SITE_CACHE, siteData);
      this.applySiteData(siteData);
      Logger.success('Данные сайта загружены');
    } catch (error) {
      Logger.error('Ошибка загрузки данных сайта:', error);
      throw error;
    }
  }

  applySiteData(siteData) {
    this.siteData = siteData;
    this.categories = siteData?.categories || [];
    this.items = siteData?.items || [];
    this.renderCategories(this.categories);
    this.applySiteMeta(siteData?.meta);
  }

  applySiteMeta(meta) {
    if (!meta) return;
    if (meta.title) {
      document.title = meta.title;
      if (this.header) {
        this.header.textContent = meta.title;
      }
    }
  }

  async loadTheme() {
    Logger.info('Загрузка темы...');
    try {
      const cachedTheme = CacheManager.get(STORAGE_KEYS.THEME_CACHE);
      if (cachedTheme) {
        this.applyTheme(cachedTheme);
        return;
      }

      const theme = await NetworkUtils.fetchWithCache(
        `${CONFIG.API_BASE_URL}${DATA_TYPES.THEME}.json`,
        STORAGE_KEYS.THEME_CACHE
      );

      CacheManager.set(STORAGE_KEYS.THEME_CACHE, theme);
      this.applyTheme(theme);
      Logger.success('Тема загружена');
    } catch (error) {
      Logger.warn('Не удалось загрузить тему, используются значения по умолчанию.', error);
    }
  }

  applyTheme(theme) {
    if (!theme) return;
    const rootStyle = document.documentElement.style;
    const colorMap = {
      background: '--color-bg',
      surface: '--color-surface',
      text: '--color-text',
      muted: '--color-muted',
      border: '--color-border',
      borderLight: '--color-border-light',
      accent: '--color-accent',
      accentLight: '--color-accent-light',
      accentSoft: '--color-accent-soft',
      accentFocus: '--color-accent-focus',
      error: '--color-error',
      empty: '--color-empty',
      chipBg: '--color-chip-bg'
    };

    Object.entries(colorMap).forEach(([key, variable]) => {
      const value = theme?.colors?.[key];
      if (value) {
        rootStyle.setProperty(variable, value);
      }
    });

    const shadowMap = {
      accent: '--shadow-accent',
      accentSoft: '--shadow-accent-soft',
      accentMobile: '--shadow-accent-mobile',
      card: '--shadow-card'
    };

    Object.entries(shadowMap).forEach(([key, variable]) => {
      const value = theme?.shadows?.[key];
      if (value) {
        rootStyle.setProperty(variable, value);
      }
    });

    const radiusMap = {
      pill: '--radius-pill',
      card: '--radius-card',
      image: '--radius-image'
    };

    Object.entries(radiusMap).forEach(([key, variable]) => {
      const value = theme?.radii?.[key];
      if (value) {
        rootStyle.setProperty(variable, value);
      }
    });

    if (theme?.borders?.width) {
      rootStyle.setProperty('--border-width', theme.borders.width);
    }
  }

  // Рендеринг категорий
  renderCategories(list) {
    this.categoryList.innerHTML = '';
    
    list.forEach(cat => {
      const li = DOMUtils.createEl('li');
      const label = DOMUtils.createEl('span', [], cat.name);
      const scrollButton = DOMUtils.createEl('button', ['scroll-to'], '↧');
      scrollButton.type = 'button';
      scrollButton.setAttribute('aria-label', `Перейти к ${cat.name}`);
      li.dataset.id = cat.id;
      li.addEventListener('click', event => {
        event.stopPropagation();
        this.handleCategorySelect(cat.id);
      });
      scrollButton.addEventListener('click', event => {
        event.stopPropagation();
        this.scrollToSection(cat.id);
      });
      li.append(label, scrollButton);
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
      const li = DOMUtils.createEl('li');
      const label = DOMUtils.createEl('span', [], sub.name);
      const scrollButton = DOMUtils.createEl('button', ['scroll-to'], '↧');
      scrollButton.type = 'button';
      scrollButton.setAttribute('aria-label', `Перейти к ${sub.name}`);
      li.dataset.id = sub.id;
      li.dataset.categoryId = sub.categoryId;
      li.dataset.key = `${sub.categoryId}:${sub.id}`;
      li.addEventListener('click', event => {
        event.stopPropagation();
        this.handleSubcategorySelect(sub.categoryId, sub.id);
      });
      scrollButton.addEventListener('click', event => {
        event.stopPropagation();
        this.scrollToSection(`${sub.categoryId}-${sub.id}`, true);
      });
      li.append(label, scrollButton);
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
      const items = DataUtils.sortItemsBySubcategoryOrder(
        this.items.filter(item => item.categoryId === catId),
        category
      );
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
      const allItems = this.categories.reduce((acc, category) => {
        const categoryItems = DataUtils.sortItemsBySubcategoryOrder(
          this.items.filter(item => item.categoryId === category.id),
          category
        );
        return acc.concat(categoryItems);
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
    const sizes = Array.isArray(item.sizes) ? item.sizes : [];
    const prices = Array.isArray(item.prices) ? item.prices : [];
    const priceLines = sizes
      .map((size, index) => {
        const price = prices[index];
        const formattedPrice = typeof price === 'number'
          ? DataUtils.formatPrice(price)
          : '';
        return `
          <div class="price-line">
            <span class="price-size">${size}</span>
            <span class="price-value">${formattedPrice}</span>
          </div>
        `;
      })
      .join('');
    const priceMarkup = priceLines || `
      <div class="price-line">
        <span class="price-value">Цена уточняется</span>
      </div>
    `;

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
        <div class="price-list">${priceMarkup}</div>
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
      await this.loadSiteData();
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

    const items = this.categories
      .filter(category => categoryIds.length === 0 || categoryIds.includes(category.id))
      .flatMap(category =>
        DataUtils.sortItemsBySubcategoryOrder(
          this.items.filter(item => item.categoryId === category.id),
          category
        )
      );

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
