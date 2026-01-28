// Кэш для загруженных данных
const dataCache = {
    categories: null,
    categoryItems: {}
};

// Кэш DOM-элементов
const domCache = {
    categoriesContainer: document.getElementById('categories-container'),
    dishesContainer: document.getElementById('dishes-container'),
    categoryTitle: document.getElementById('category-title'),
    categoryDescription: document.getElementById('category-description')
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    const isCategoryPage = domCache.dishesContainer !== null;

    if (isCategoryPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('id');

        if (categoryId) {
            showLoader('dishes-container');
            loadCategoryData(categoryId);
        } else {
            showError('dishes-container', 'Категория не указана');
        }
    } else {
        showLoader('categories-container');
        loadCategories();
    }
});

// Показать состояние загрузки
function showLoader(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="loader">Загрузка меню...</div>';
}

// Показать сообщение об ошибке
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
}

// Экранирование HTML для предотвращения XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Загрузка категорий
function loadCategories() {
    if (dataCache.categories) {
        renderCategories(dataCache.categories);
        return;
    }

    fetch('data/categories.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(categories => {
            dataCache.categories = categories;
            renderCategories(categories);
        })
        .catch(error => {
            console.error('Ошибка загрузки категорий:', error);
            showError('categories-container', 'Не удалось загрузить меню. Пожалуйста, попробуйте позже.');
        });
}

// Отображение категорий
function renderCategories(categories) {
    const container = domCache.categoriesContainer;
    container.innerHTML = '';

    categories.forEach(category => {
        const tile = document.createElement('a');
        tile.href = `category.html?id=${category.id}`;
        tile.className = 'tile';
        tile.setAttribute('aria-label', `Перейти к категории ${category.title}`);

        tile.innerHTML = `
            <div class="tile-content">
                <h2>${escapeHtml(category.title)}</h2>
                <p>${escapeHtml(category.description)}</p>
            </div>
        `;

        container.appendChild(tile);
    });
}

// Загрузка данных категории
function loadCategoryData(categoryId) {
    if (dataCache.categoryItems[categoryId]) {
        renderCategory(dataCache.categoryItems[categoryId]);
        return;
    }

    fetch(`data/${categoryId}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            dataCache.categoryItems[categoryId] = data;
            renderCategory(data);
        })
        .catch(error => {
            console.error(`Ошибка загрузки категории ${categoryId}:`, error);
            showError('dishes-container', 'Не удалось загрузить категорию. Пожалуйста, попробуйте позже.');
        });
}

// Отображение категории
function renderCategory(data) {
    // Установка информации о категории
    domCache.categoryTitle.textContent = data.category.title;
    domCache.categoryDescription.textContent = data.category.description;

    // Очистка и отображение элементов
    const container = domCache.dishesContainer;
    container.innerHTML = '';

    if (!data.items || data.items.length === 0) {
        container.innerHTML = '<div class="error-message">В этой категории пока нет блюд</div>';
        return;
    }

    data.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'pizza-card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `${item.name}, от ${item.sizes[0].price} рублей`);

        // Создание HTML для карточки пиццы
        card.innerHTML = `
            <img src="images/${item.image}" alt="${escapeHtml(item.name)}" class="pizza-image" loading="lazy">
            <div class="pizza-content">
                <div class="pizza-name">${escapeHtml(item.name)}</div>
                <div class="pizza-description">${escapeHtml(item.description)}</div>
                <div class="pizza-options">
                    <div class="size-options">
                        <div class="size-option">
                            <label>
                                <input type="radio" name="size-${item.name}" value="25" checked>
                                <span>25 см</span>
                            </label>
                            <span>${item.sizes[0].price} ₽</span>
                        </div>
                        <div class="size-option">
                            <label>
                                <input type="radio" name="size-${item.name}" value="30">
                                <span>30 см</span>
                            </label>
                            <span>${item.sizes[1].price} ₽</span>
                        </div>
                        <div class="size-option">
                            <label>
                                <input type="radio" name="size-${item.name}" value="35">
                                <span>35 см</span>
                            </label>
                            <span>${item.sizes[2].price} ₽</span>
                        </div>
                    </div>
                    <div class="dough-options">
                        <div class="dough-option">
                            <label>
                                <input type="checkbox" name="dough-${item.name}" value="thin" ${item.sizes[1].doughTypes.includes('thin') ? '' : 'disabled'}>
                                <span>Тонкое тесто</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="pizza-price" id="price-${item.name}">${item.sizes[0].price} ₽</div>
            </div>
        `;

        container.appendChild(card);

        // Добавление обработчиков событий для выбора размера
        const sizeInputs = card.querySelectorAll(`input[name="size-${item.name}"]`);
        sizeInputs.forEach(input => {
            input.addEventListener('change', function() {
                const selectedSize = this.value;
                const selectedSizeData = item.sizes.find(size => size.size.toString() === selectedSize);
                const priceElement = card.querySelector(`.pizza-price`);
                priceElement.textContent = `${selectedSizeData.price} ₽`;

                // Обновление доступности типа теста
                const doughCheckbox = card.querySelector(`input[name="dough-${item.name}"]`);
                if (doughCheckbox) {
                    doughCheckbox.disabled = !selectedSizeData.doughTypes.includes('thin');
                    if (doughCheckbox.disabled) {
                        doughCheckbox.checked = false;
                    }
                }
            });
        });
    });
}

