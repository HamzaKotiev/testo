import { STORAGE_KEYS } from './constants.js';

// Утилиты для работы с кэшем
export class CacheManager {
  static get cacheExpiration() {
    return 300000; // 5 минут
  }

  static set(key, data) {
    const cache = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cache));
  }

  static get(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cache = JSON.parse(cached);
    const isExpired = Date.now() - cache.timestamp > this.cacheExpiration;
    
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return cache.data;
  }

  static clear() {
    Object.keys(localStorage).forEach(key => {
      if (key === STORAGE_KEYS.DATA_CACHE || key.startsWith(`${STORAGE_KEYS.DATA_CACHE}_`)) {
        localStorage.removeItem(key);
      }
    });

    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATE);
  }

  static clearCategoryCache(categoryId) {
    localStorage.removeItem(`${STORAGE_KEYS.DATA_CACHE}_${categoryId}`);
  }
}

// Утилиты для работы с сетью
export class NetworkUtils {
  static async fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  static async fetchWithCache(url, cacheKey) {
    const cachedData = CacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const data = await this.fetchWithRetry(url);
      CacheManager.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      throw error;
    }
  }

  static isOnline() {
    return navigator.onLine;
  }
}

// Утилиты для работы с DOM
export class DOMUtils {
  static createEl(tag, classes = [], content = '') {
    const el = document.createElement(tag);
    if (classes.length > 0) {
      el.classList.add(...classes);
    }
    if (content) {
      el.innerHTML = content;
    }
    return el;
  }

  static showLoader(element) {
    element.innerHTML = `<div class="loader">Загрузка...</div>`;
  }

  static showError(element, message) {
    element.innerHTML = `<div class="error">${message}</div>`;
  }

  static showEmptyState(element, message = 'В этой категории пока ничего нет') {
    element.innerHTML = `<p class="empty">${message}</p>`;
  }

  static toggleClass(element, className, condition) {
    if (condition) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }
}

// Утилиты для работы с данными
export class DataUtils {
  static sortItemsBySubcategoryOrder(items, category) {
    if (!category || !Array.isArray(category.subcategories) || category.subcategories.length === 0) {
      return items;
    }

    const subcategoryOrder = new Map(
      category.subcategories.map((sub, index) => [sub.id, index])
    );

    return [...items].sort((a, b) => {
      const aIndex = subcategoryOrder.get(a.subcategoryId) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = subcategoryOrder.get(b.subcategoryId) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }

  static filterItems(items, categoryIds = [], subcategoryKeys = []) {
    return items.filter(item => {
      if (subcategoryKeys.length > 0) {
        const key = `${item.categoryId}:${item.subcategoryId}`;
        if (!subcategoryKeys.includes(key)) {
          return false;
        }
      }

      if (categoryIds.length > 0) {
        return categoryIds.includes(item.categoryId);
      }

      return true;
    });
  }

  static formatPrice(price) {
    return `${price.toLocaleString()} ₽`;
  }

  static getImageUrl(imagePath) {
    return imagePath || 'https://via.placeholder.com/300x200?text=No+Image';
  }
}

// Утилиты для работы с событиями
export class EventUtils {
  static debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  static throttle(fn, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  }
}

// Утилиты для логирования
export class Logger {
  static info(message, ...args) {
    console.log('%cℹ️  ' + message, 'color: #2563eb;', ...args);
  }

  static error(message, ...args) {
    console.error('%c❌  ' + message, 'color: #ef4444;', ...args);
  }

  static success(message, ...args) {
    console.log('%c✅  ' + message, 'color: #10b981;', ...args);
  }

  static warn(message, ...args) {
    console.warn('%c⚠  ' + message, 'color: #f59e0b;', ...args);
  }
}

// Экспорт всех утилит
export const Utils = {
  CacheManager,
  NetworkUtils,
  DOMUtils,
  DataUtils,
  EventUtils,
  Logger
};
