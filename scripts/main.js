document.addEventListener('DOMContentLoaded', function () {
  const categoryList = document.querySelector('.category-list');
  const subcategoryRow = document.getElementById('subcategories');
  const subcategoryList = document.querySelector('.subcategory-list');
  const content = document.getElementById('content');
  let categories = [];

  fetch('data/categories.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Не удалось загрузить категории');
      }
      return response.json();
    })
    .then(data => {
      categories = data;
      renderCategories(categories);
      if (categories.length > 0) {
        handleCategorySelect(categories[0].id);
      }
    })
    .catch(error => {
      content.innerHTML = `<div class="error">${error.message}</div>`;
    });

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
    const category = categories.find(item => item.id === catId);
    document.querySelectorAll('.category-list li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === catId);
    });

    if (category && Array.isArray(category.subcategories) && category.subcategories.length > 0) {
      renderSubcategories(category.subcategories, catId);
      subcategoryRow.classList.add('is-visible');
      const firstSub = category.subcategories[0];
      if (firstSub) {
        handleSubcategorySelect(catId, firstSub.id);
      }
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
    document.querySelectorAll('.subcategory-list li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === subId);
    });
    loadCategory(catId, subId);
  }

  function loadCategory(catId, subId) {
    content.innerHTML = '<div class="loader">Загрузка...</div>';

    fetch(`data/${catId}.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Категория "${catId}" не найдена`);
        }
        return response.json();
      })
      .then(data => {
        let html = '<div class="items-grid">';
        const items = (data.items || []).filter(item => {
          if (subId) {
            return item.categoryId === catId && item.subcategoryId === subId;
          }
          return item.categoryId === catId;
        });

        if (items.length === 0) {
          html += '<p class="empty">В этой категории пока ничего нет</p>';
        } else {
          items.forEach(item => {
            html += `
              <div class="item-card">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy">` : ''}
                <h3>${item.name}</h3>
                <p>${item.description || ''}</p>
                <div class="price">${item.price} ₽</div>
              </div>
            `;
          });
        }

        html += '</div>';
        content.innerHTML = html;
      })
      .catch(error => {
        content.innerHTML = `<div class="error">${error.message}</div>`;
      });
  }
});
