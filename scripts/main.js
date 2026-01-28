document.addEventListener('DOMContentLoaded', function() {
    const navUl = document.querySelector('nav ul');
    const content = document.getElementById('content');

    // Показать лоадер
    content.innerHTML = '<div class="loader">Загрузка...</div>';

    // Загрузка JSON
    fetch('data/menu.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Не удалось загрузить меню');
            }
            return response.json();
        })
        .then(data => {
            // Рендер категорий в nav
            data.categories.forEach(cat => {
                const li = document.createElement('li');
                li.textContent = cat.name;
                li.dataset.id = cat.id;
                li.addEventListener('click', () => loadCategory(cat.id, data.categories));
                navUl.appendChild(li);
            });

            // Автозагрузка первой категории
            if (data.categories.length > 0) {
                loadCategory(data.categories[0].id, data.categories);
            }
        })
        .catch(error => {
            content.innerHTML = '<div class="error">' + error.message + '. Попробуйте позже.</div>';
        });

    // Функция загрузки категории
    function loadCategory(catId, categories) {
        // Активный класс
        document.querySelectorAll('nav li').forEach(li => {
            li.classList.toggle('active', li.dataset.id === catId);
        });

        const cat = categories.find(c => c.id === catId);
        if (!cat) {
            content.innerHTML = '<div class="error">Категория не найдена</div>';
            return;
        }

        let html = '<div class="items-grid">';
        if (cat.items.length === 0) {
            html += '<p>В этой категории пока нет элементов</p>';
        } else {
            cat.items.forEach(item => {
                html += `
                    <div class="item-card">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <div class="price">${item.price} руб.</div>
                    </div>
                `;
            });
        }
        html += '</div>';
        content.innerHTML = html;
    }
});