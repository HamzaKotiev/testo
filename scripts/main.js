document.addEventListener('DOMContentLoaded', function () {
  const navUl = document.querySelector('nav ul');
  const content = document.getElementById('content');

  // Список категорий (hardcode, чтобы не загружать отдельный файл)
  const categories = [
    { id: 'pizza', name: 'Пицца' },
    { id: 'snacks', name: 'Закуски' },
    { id: 'salads', name: 'Салаты' },
    { id: 'drinks', name: 'Напитки' },
    { id: 'cocktails', name: 'Коктейли' }
  ];

  // Рендер кнопок категорий
  categories.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = cat.name;
    li.dataset.id = cat.id;
    li.addEventListener('click', () => loadCategory(cat.id));
    navUl.appendChild(li);
  });

  // Автозагрузка первой категории
  if (categories.length > 0) {
    loadCategory(categories[0].id);
  }

  function loadCategory(catId) {
    // Выделение активной кнопки
    document.querySelectorAll('nav li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === catId);
    });

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

        if (!data.items || data.items.length === 0) {
          html += '<p class="empty">В этой категории пока ничего нет</p>';
        } else {
          data.items.forEach(item => {
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