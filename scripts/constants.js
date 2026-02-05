// Константы для приложения
export const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  API_BASE_URL: 'data/',
  CACHE_EXPIRATION: 300000, // 5 минут
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Не удалось загрузить данные. Проверьте интернет-соединение.',
    SERVER_ERROR: 'Сервер временно недоступен. Попробуйте позже.',
    NOT_FOUND: 'Запрашиваемый ресурс не найден.',
    TIMEOUT: 'Время ожидания ответа истекло.'
  }
};

// Селекторы DOM
export const SELECTORS = {
  CATEGORY_LIST: '.category-list',
  SUBCATEGORY_ROW: '#subcategories',
  SUBCATEGORY_LIST: '.subcategory-list',
  CONTENT: '#content',
  ITEM_CARD: '.item-card',
  LOADER: '.loader',
  ERROR: '.error',
  EMPTY_STATE: '.empty'
};

// Классы CSS
export const CLASSES = {
  ACTIVE: 'active',
  VISIBLE: 'is-visible',
  ERROR: 'error',
  LOADER: 'loader',
  EMPTY: 'empty'
};

// Типы данных
export const DATA_TYPES = {
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories',
  ITEMS: 'items',
  SITE: 'site',
  THEME: 'theme'
};

// Ключи localStorage
export const STORAGE_KEYS = {
  DATA_CACHE: 'app_data_cache',
  LAST_UPDATE: 'app_last_update',
  SITE_CACHE: 'app_site_cache',
  THEME_CACHE: 'app_theme_cache'
};
