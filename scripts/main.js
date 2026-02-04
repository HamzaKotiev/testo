document.addEventListener('DOMContentLoaded', function () {
  const categoryList = document.querySelector('.category-list');
  const subcategoryRow = document.getElementById('subcategories');
  const subcategoryList = document.querySelector('.subcategory-list');
  const content = document.getElementById('content');
  let categories = [];
  let selectedCategoryId = null;
  let selectedSubcategoryId = null;
  let dataCache = {};

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  // Улучшенный fetch с retry-механизмом
  async function fetchWithRetry(url, retries = MAX_RETRIES) {
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
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
  }

  // Загрузка категорий с кэшированием
  async function loadCategories() {
    if (dataCache.categories) {
      categories = dataCache.categories;
      renderCategories(categories);
      clearSelection();
      loadAllItems();
      return;
    }

    try {
      const data = await fetchWithRetry('data/categories.json');
      categories = data;
      dataCache.categories = data;
      renderCategories(categories);
      clearSelection();
      loadAllItems();
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
      content.innerHTML = `<div class="error">Не удалось загрузить категории. Попробуйте обновить страницу.</div>`;
    }
  }

  function renderCategories(list) {
    categoryList.innerHTML = '';
    list.forEach(cat => {
      const li = document.createElement('li');
      li.textContent = cat.name;
      li.dataset.id = cat.id;
      li.addEventListener('click', () => handleCategorySelect(cat.id));
      categoryList.appendChild(li);
    });
  }

  function handleCategorySelect(catId) {
    if (selectedCategoryId === catId) {
      clearSelection();
      loadAllItems();
      return;
    }

    selectedCategoryId = catId;
    selectedSubcategoryId = null;
    const category = categories.find(item => item.id === catId);
    document.querySelectorAll('.category-list li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === catId);
    });

    if (category && Array.isArray(category.subcategories) && category.subcategories.length > 0) {
      renderSubcategories(category.subcategories, catId);
      subcategoryRow.classList.add('is-visible');
      clearSubcategorySelection();
      loadCategory(catId, null);
      return;
    }

    subcategoryRow.classList.remove('is-visible');
    subcategoryList.innerHTML = '';
    loadCategory(catId, null);
  }

  function renderSubcategories(list, catId) {
    subcategoryList.innerHTML = '';
    list.forEach(sub => {
      const li = document.createElement('li');
      li.textContent = sub.name;
      li.dataset.id = sub.id;
      li.addEventListener('click', () => handleSubcategorySelect(catId, sub.id));
      subcategoryList.appendChild(li);
    });
  }

  function handleSubcategorySelect(catId, subId) {
    if (selectedSubcategoryId === subId) {
      clearSubcategorySelection();
      loadCategory(catId, null);
      return;
    }

    selectedCategoryId = catId;
    selectedSubcategoryId = subId;
    document.querySelectorAll('.subcategory-list li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === subId);
    });
    loadCategory(catId, subId);
  }

  async function loadCategory(catId, subId) {
    content.innerHTML = '<div class="loader">Загрузка...</div>';

    try {
      if (dataCache[catId]) {
        const data = dataCache[catId];
        const category = categories.find(item => item.id === catId);
        const items = sortItemsBySubcategoryOrder(data.items || [], category).filter(item => {
          if (subId) {
            return item.categoryId === catId && item.subcategoryId === subId;
          }
          return item.categoryId === catId;
        });
        renderItems(items);
        return;
      }

      const data = await fetchWithRetry(`data/${catId}.json`);
      dataCache[catId] = data;
      const category = categories.find(item => item.id === catId);
      const items = sortItemsBySubcategoryOrder(data.items || [], category).filter(item => {
        if (subId) {
          return item.categoryId === catId && item.subcategoryId === subId;
        }
        return item.categoryId === catId;
      });
      renderItems(items);
    } catch (error) {
      console.error(`Ошибка загрузки категории ${catId}:`, error);
      content.innerHTML = `<div class="error">Не удалось загрузить категорию. Попробуйте позже.</div>`;
    }
  }

  async function loadAllItems() {
    content.innerHTML = '<div class="loader">Загрузка...</div>';

    try {
      const categoryPromises = categories.map(async category => {
        if (dataCache[category.id]) {
          return dataCache[category.id];
        }
        const data = await fetchWithRetry(`data/${category.id}.json`);
        dataCache[category.id] = data;
        return data;
      });

      const results = await Promise.all(categoryPromises);
      const allItems = results.reduce((acc, data, index) => {
        const category = categories[index];
        const items = sortItemsBySubcategoryOrder(data.items || [], category);
        return acc.concat(items);
      }, []);

      renderItems(allItems);
    } catch (error) {
      console.error('Ошибка загрузки всех товаров:', error);
      content.innerHTML = `<div class="error">Не удалось загрузить товары. Попробуйте позже.</div>`;
    }
  }

  function renderItems(items) {
    let html = '<div class="items-grid">';

    if (!items || items.length === 0) {
      html += '<p class="empty">В этой категории пока ничего нет</p>';
    } else {
      items.forEach(item => {
        html += `
          <div class="item-card">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
            <h3>${item.name}</h3>
            <p>${item.description || ''}</p>
            <div class="price">${item.price} ₽</div>
          </div>
        `;
      });
    }

    html += '</div>';
    content.innerHTML = html;
  }

  function sortItemsBySubcategoryOrder(items, category) {
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

  function clearSelection() {
    selectedCategoryId = null;
    selectedSubcategoryId = null;
    categoryList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    clearSubcategorySelection();
    subcategoryRow.classList.remove('is-visible');
    subcategoryList.innerHTML = '';
  }

  function clearSubcategorySelection() {
    selectedSubcategoryId = null;
    subcategoryList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
  }

  loadCategories();
});