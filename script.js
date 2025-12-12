// Глобальные переменные
let cart = JSON.parse(localStorage.getItem('compyou_cart')) || [];
let selectedComponents = {
    cpu: {name: '', price: 0},
    gpu: {name: '', price: 0},
    ram: {name: '', price: 0},
    storage: {name: '', price: 0},
    mb: {name: '', price: 0}
};
let orders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
let isAdminLoggedIn = localStorage.getItem('compyou_admin_logged') === 'true';
let cardData = JSON.parse(localStorage.getItem('compyou_card_data')) || null;

// Данные для авторизации администратора
const ADMIN_CREDENTIALS = {
    login: 'admin',
    password: '123321'
};

// Компоненты для конструктора
const components = {
    cpu: [
        {name: 'Intel Core i9-13900K', desc: '24 ядра, до 5.8 ГГц', price: 58990},
        {name: 'Intel Core i7-13700K', desc: '16 ядер, до 5.4 ГГц', price: 38990},
        {name: 'Intel Core i5-13600KF', desc: '14 ядер, до 5.1 ГГц', price: 28990},
        {name: 'AMD Ryzen 9 7950X', desc: '16 ядер, до 5.7 ГГц', price: 54990},
        {name: 'AMD Ryzen 7 7700X', desc: '8 ядер, до 5.4 ГГц', price: 32990},
        {name: 'AMD Ryzen 5 7600X', desc: '6 ядер, до 5.3 ГГц', price: 23990},
        {name: 'Intel Core i3-13100', desc: '4 ядра, до 4.5 ГГц', price: 14990},
        {name: 'AMD Ryzen 5 5600X', desc: '6 ядер, до 4.6 ГГц', price: 18990}
    ],
    gpu: [
        {name: 'NVIDIA RTX 4090', desc: '24GB GDDR6X, 4K гейминг', price: 189990},
        {name: 'NVIDIA RTX 4080', desc: '16GB GDDR6X', price: 119990},
        {name: 'NVIDIA RTX 4070 Ti', desc: '12GB GDDR6X', price: 84990},
        {name: 'NVIDIA RTX 4070', desc: '12GB GDDR6X', price: 64990},
        {name: 'NVIDIA RTX 4060 Ti', desc: '8GB GDDR6', price: 44990},
        {name: 'AMD Radeon RX 7900 XTX', desc: '24GB GDDR6', price: 109990},
        {name: 'AMD Radeon RX 7800 XT', desc: '16GB GDDR6', price: 64990},
        {name: 'AMD Radeon RX 7700 XT', desc: '12GB GDDR6', price: 47990},
        {name: 'NVIDIA RTX 3060 Ti', desc: '8GB GDDR6', price: 38990},
        {name: 'AMD Radeon RX 6700 XT', desc: '12GB GDDR6', price: 34990}
    ],
    ram: [
        {name: '32GB DDR5 6000MHz', desc: '2x16GB Kingston Fury', price: 15990},
        {name: '64GB DDR5 6000MHz', desc: '2x32GB Kingston Fury', price: 29990},
        {name: '32GB DDR5 6400MHz', desc: '2x16GB Corsair Dominator', price: 18990},
        {name: '16GB DDR5 5600MHz', desc: '2x8GB Kingston Fury', price: 8990},
        {name: '64GB DDR5 6400MHz', desc: '2x32GB Corsair Dominator', price: 34990},
        {name: '128GB DDR5 5600MHz', desc: '4x32GB Kingston Fury', price: 68990},
        {name: '32GB DDR4 3600MHz', desc: '2x16GB Corsair Vengeance', price: 8990},
        {name: '16GB DDR4 3200MHz', desc: '2x8GB Corsair Vengeance', price: 4990}
    ],
    storage: [
        {name: '1TB NVMe SSD', desc: 'Samsung 990 PRO', price: 8990},
        {name: '2TB NVMe SSD', desc: 'Samsung 990 PRO', price: 15990},
        {name: '4TB NVMe SSD', desc: 'Samsung 990 PRO', price: 32990},
        {name: '2TB SATA SSD', desc: 'Samsung 870 EVO', price: 11990},
        {name: '1TB NVMe SSD + 2TB HDD', desc: 'Комбинированное решение', price: 14990},
        {name: '4TB NVMe SSD + 8TB HDD', desc: 'Максимальный объем', price: 55990},
        {name: '500GB NVMe SSD', desc: 'Samsung 980', price: 4990},
        {name: '1TB SATA SSD', desc: 'Crucial MX500', price: 5990}
    ],
    mb: [
        {name: 'ASUS ROG MAXIMUS Z790 HERO', desc: 'Intel Z790, Wi-Fi 6E', price: 49990},
        {name: 'MSI MPG Z790 CARBON WIFI', desc: 'Intel Z790, Wi-Fi 6E', price: 38990},
        {name: 'ASUS ROG STRIX B760-F GAMING', desc: 'Intel B760, Wi-Fi 6', price: 24990},
        {name: 'Gigabyte B760 GAMING X', desc: 'Intel B760', price: 16990},
        {name: 'ASUS ROG CROSSHAIR X670E HERO', desc: 'AMD X670E, Wi-Fi 6E', price: 54990},
        {name: 'GIGABYTE B650 AORUS ELITE AX', desc: 'AMD B650, Wi-Fi 6', price: 21990},
        {name: 'MSI MAG B650 TOMAHAWK WIFI', desc: 'AMD B650, Wi-Fi 6', price: 23990},
        {name: 'ASRock B650M-HDV', desc: 'AMD B650, бюджетная', price: 12990}
    ]
};

    // Инициализация страницы
    document.addEventListener('DOMContentLoaded', function() {
        updateCartCount();
        initComponentLists();
        updateSummary();
        initAdminPanel();
        
        // Инициализация маски телефона
        initPhoneMask();
        
        // Инициализация валидации формы
        initFormValidation();
        
        // Инициализация масок для карты
        initCardInputMasks();
        
        // Обработка отправки формы заказа
        document.getElementById('orderForm').addEventListener('submit', function(e) {
            e.preventDefault();
            submitOrder();
        });
    
    // Обработка отправки формы входа в админ-панель
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        loginAdmin();
    });
    
    // Открытие корзины по клику на иконку
    document.getElementById('cartIcon').addEventListener('click', function() {
        openCartModal();
    });
    
    // Обработчик клика по ссылке на админ-панель
    document.getElementById('adminNavLink').addEventListener('click', function(e) {
        // Если админ не авторизован, показываем форму входа
        if (!isAdminLoggedIn) {
            e.preventDefault();
            document.getElementById('admin').scrollIntoView({behavior: 'smooth'});
        } else {
            // Если авторизован - переходим на админ-страницу
            window.location.href = 'admin.html';
        }
    });
    
    // Показываем информацию о карте при загрузке, если выбран способ оплаты картой
    if (document.getElementById('cardPayment') && document.getElementById('cardPayment').checked) {
        showCardFields();
    }
    
    // Добавляем обработчик для кнопок закрытия модальных окон на мобильных
    initMobileModalHandlers();
    
    // Инициализация фиксации скролла для мобильных
    initMobileScrollFix();
    
    // Предотвращаем зум на iOS
    preventIOSZoom();
});

// Инициализация обработчиков для мобильных модальных окон
function initMobileModalHandlers() {
    // Закрытие модальных окон по клику на фон (для мобильных)
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (this.id === 'cartModal') closeCartModal();
                if (this.id === 'pcDetailsModal') closePCDetails();
                if (this.id === 'cardModal') closeCardModal();
                
                // Закрытие окна успешной оплаты
                if (this.id === 'paymentSuccessModal') {
                    this.remove();
                }
            }
        });
    });
    
    // Предотвращаем закрытие при клике внутри контента
    const modalContents = document.querySelectorAll('.modal-content');
    modalContents.forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
}

// ФИКСИРУЮЩАЯ ФУНКЦИЯ ДЛЯ МОБИЛЬНОГО СКРОЛЛА - ИСПРАВЛЕННАЯ
function initMobileScrollFix() {
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        console.log('Инициализация фиксации скролла для мобильных');
        
        let scrollPosition = 0;
        let isFocusing = false;
        
        // Сохраняем позицию скролла перед фокусом
        document.addEventListener('focusin', function(e) {
            if (e.target.matches('input, textarea, select')) {
                isFocusing = true;
                scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
                console.log('Фокус на поле, позиция скролла:', scrollPosition);
                
                // Для полей в модальных окнах - позволяем нормальный скролл
                if (!e.target.closest('.modal')) {
                    // Фиксируем скролл для обычных полей
                    setTimeout(() => {
                        if (window.pageYOffset !== scrollPosition) {
                            window.scrollTo({
                                top: scrollPosition,
                                behavior: 'instant'
                            });
                            console.log('Восстановлена позиция скролла:', scrollPosition);
                        }
                    }, 50);
                }
            }
        });
        
        // Восстанавливаем позицию после потери фокуса
        document.addEventListener('focusout', function(e) {
            if (e.target.matches('input, textarea, select')) {
                isFocusing = false;
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                    console.log('Восстановление скролла после потери фокуса');
                }, 300);
            }
        });
        
        // Дополнительная защита от нежелательного скролла
        window.addEventListener('scroll', function() {
            if (isFocusing) {
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.matches('input, textarea, select'))) {
                    if (!activeElement.closest('.modal')) {
                        window.scrollTo({
                            top: scrollPosition,
                            behavior: 'instant'
                        });
                    }
                }
            }
        });
        
        // Предотвращаем зум на iOS
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type === 'text' || input.type === 'email' || input.type === 'tel' || 
                input.type === 'number' || input.type === 'password' || input.tagName === 'TEXTAREA') {
                input.style.fontSize = '16px';
            }
        });
    }
}

// Предотвращение зума на iOS
function preventIOSZoom() {
    if ('ontouchstart' in window) {
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            let content = viewportMeta.getAttribute('content');
            content = content.replace(/user-scalable=[^,]+/, 'user-scalable=no');
            viewportMeta.setAttribute('content', content);
        }
    }
}

// Инициализация маски телефона
function initPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, '');
        
        // Форматирование номера
        if (value.length > 0) {
            value = '+' + value;
            
            if (value.length > 1) {
                value = value.substring(0, 2) + ' (' + value.substring(2);
            }
            if (value.length > 7) {
                value = value.substring(0, 7) + ') ' + value.substring(7);
            }
            if (value.length > 12) {
                value = value.substring(0, 12) + '-' + value.substring(12);
            }
            if (value.length > 15) {
                value = value.substring(0, 15) + '-' + value.substring(15);
            }
        }
        
        this.value = value;
    });
    
    // Валидация телефона при потере фокуса
    phoneInput.addEventListener('blur', function() {
        validatePhone(this);
    });
    
    // Для мобильных - устанавливаем правильный тип input
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        phoneInput.setAttribute('inputmode', 'tel');
    }
}

// Инициализация валидации формы
function initFormValidation() {
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    
    if (fullNameInput) {
        fullNameInput.addEventListener('blur', function() {
            validateFullName(this);
        });
    }
    
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmail(this);
        });
        
        // Для мобильных - правильный тип клавиатуры
        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            emailInput.setAttribute('inputmode', 'email');
        }
    }
    
    if (addressInput) {
        addressInput.addEventListener('blur', function() {
            validateAddress(this);
        });
    }
}

// Валидация ФИО
function validateFullName(input) {
    const value = input.value.trim();
    const errorElement = input.parentElement.querySelector('.validation-error');
    
    // Регулярное выражение для ФИО (русские буквы, пробелы, дефисы)
    const nameRegex = /^[А-ЯЁ][а-яё]+(?:[- ][А-ЯЁ][а-яё]+)* [А-ЯЁ][а-яё]+(?:[- ][А-ЯЁ][а-яё]+)* [А-ЯЁ][а-яё]+(?:[- ][А-ЯЁ][а-яё]+)*$/;
    
    // Создаем элемент для ошибки, если его нет
    let errorDiv = errorElement;
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        input.parentElement.appendChild(errorDiv);
    }
    
    // Проверяем валидность
    if (!value) {
        showValidationError(input, errorDiv, 'Поле ФИО обязательно для заполнения');
        return false;
    }
    
    // Проверяем, что введено три слова (Фамилия Имя Отчество)
    const words = value.split(' ').filter(word => word.length > 0);
    if (words.length < 2) {
        showValidationError(input, errorDiv, 'Введите фамилию, имя и отчество через пробел');
        return false;
    }
    
    // Проверяем формат каждого слова
    for (let word of words) {
        const wordRegex = /^[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?$/;
        if (!wordRegex.test(word)) {
            showValidationError(input, errorDiv, 'Каждое слово должно начинаться с заглавной буквы и содержать только русские буквы и дефисы');
            return false;
        }
    }
    
    // Если все проверки пройдены
    hideValidationError(input, errorDiv);
    return true;
}

// Валидация телефона
function validatePhone(input) {
    const value = input.value.trim();
    const errorElement = input.parentElement.querySelector('.validation-error');
    
    // Создаем элемент для ошибки, если его нет
    let errorDiv = errorElement;
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        input.parentElement.appendChild(errorDiv);
    }
    
    // Убираем все нецифровые символы для проверки
    const digitsOnly = value.replace(/\D/g, '');
    
    // Проверяем валидность
    if (!value) {
        showValidationError(input, errorDiv, 'Поле телефона обязательно для заполнения');
        return false;
    }
    
    // Проверяем длину номера (11 цифр для российского номера)
    if (digitsOnly.length !== 11) {
        showValidationError(input, errorDiv, 'Введите корректный номер телефона (11 цифр)');
        return false;
    }
    
    // Проверяем, что номер начинается с 7 или 8
    if (!digitsOnly.startsWith('7') && !digitsOnly.startsWith('8')) {
        showValidationError(input, errorDiv, 'Номер должен начинаться с 7 или 8');
        return false;
    }
    
    // Если все проверки пройдены
    hideValidationError(input, errorDiv);
    return true;
}

// Валидация email
function validateEmail(input) {
    const value = input.value.trim();
    const errorElement = input.parentElement.querySelector('.validation-error');
    
    // Регулярное выражение для email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Создаем элемент для ошибки, если его нет
    let errorDiv = errorElement;
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        input.parentElement.appendChild(errorDiv);
    }
    
    // Проверяем валидность
    if (!value) {
        showValidationError(input, errorDiv, 'Поле Email обязательно для заполнения');
        return false;
    }
    
    if (!emailRegex.test(value)) {
        showValidationError(input, errorDiv, 'Введите корректный email адрес');
        return false;
    }
    
    // Если все проверки пройдены
    hideValidationError(input, errorDiv);
    return true;
}

// Валидация адреса
function validateAddress(input) {
    const value = input.value.trim();
    const errorElement = input.parentElement.querySelector('.validation-error');
    
    // Создаем элемент для ошибки, если его нет
    let errorDiv = errorElement;
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        input.parentElement.appendChild(errorDiv);
    }
    
    // Проверяем валидность
    if (!value) {
        showValidationError(input, errorDiv, 'Поле адреса обязательно для заполнения');
        return false;
    }
    
    // Проверяем минимальную длину адреса
    if (value.length < 10) {
        showValidationError(input, errorDiv, 'Адрес должен содержать не менее 10 символов');
        return false;
    }
    
    // Если все проверки пройдены
    hideValidationError(input, errorDiv);
    return true;
}

// Показать ошибку валидации
function showValidationError(input, errorDiv, message) {
    input.style.borderColor = '#ff5555';
    input.style.boxShadow = '0 0 0 2px rgba(255, 85, 85, 0.2)';
    
    errorDiv.textContent = message;
    errorDiv.style.color = '#ff5555';
    errorDiv.style.fontSize = '14px';
    errorDiv.style.marginTop = '5px';
    errorDiv.style.display = 'block';
}

// Скрыть ошибку валидации
function hideValidationError(input, errorDiv) {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    errorDiv.style.display = 'none';
}

// Проверка всей формы перед отправкой
function validateForm() {
    const fullNameValid = validateFullName(document.getElementById('fullName'));
    const phoneValid = validatePhone(document.getElementById('phone'));
    const emailValid = validateEmail(document.getElementById('email'));
    const addressValid = validateAddress(document.getElementById('address'));
    
    return fullNameValid && phoneValid && emailValid && addressValid;
}

// Инициализация админ-панели
function initAdminPanel() {
    if (isAdminLoggedIn) {
        // Если админ уже авторизован, скрываем форму входа
        showAdminPanel();
    } else {
        // Иначе показываем форму входа
        showLoginForm();
    }
}

// Вход в админ-панель
function loginAdmin() {
    const login = document.getElementById('adminLogin').value;
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('loginError');
    const successElement = document.getElementById('loginSuccess');
    
    // Скрываем сообщения об ошибке/успехе
    errorElement.style.display = 'none';
    successElement.style.display = 'none';
    
    // Проверяем логин и пароль
    if (login === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password) {
        // Авторизация успешна
        isAdminLoggedIn = true;
        localStorage.setItem('compyou_admin_logged', 'true');
        
        // Показываем сообщение об успехе
        successElement.style.display = 'block';
        successElement.textContent = 'Вход выполнен успешно! Перенаправляем...';
        
        // Через 1 секунду перенаправляем на страницу админ-панели
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    } else {
        // Неверные данные
        errorElement.style.display = 'block';
        showNotification('Неверный логин или пароль', 'error');
    }
}

// Выход из админ-панели
function logoutAdmin() {
    if (confirm('Вы уверены, что хотите выйти из админ-панели?')) {
        isAdminLoggedIn = false;
        localStorage.removeItem('compyou_admin_logged');
        window.location.href = 'index.html';
    }
}

// Показать форму входа
function showLoginForm() {
    const adminLoginContainer = document.getElementById('adminLoginContainer');
    const adminPanelContainer = document.getElementById('adminPanelContainer');
    
    if (adminLoginContainer) adminLoginContainer.classList.remove('hidden');
    if (adminPanelContainer) adminPanelContainer.classList.add('hidden');
    
    // Очищаем форму входа
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) adminLoginForm.reset();
    
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');
    if (loginError) loginError.style.display = 'none';
    if (loginSuccess) loginSuccess.style.display = 'none';
}

// Показать админ-панель (на главной странице)
function showAdminPanel() {
    const adminLoginContainer = document.getElementById('adminLoginContainer');
    const adminPanelContainer = document.getElementById('adminPanelContainer');
    
    if (adminLoginContainer) adminLoginContainer.classList.add('hidden');
    if (adminPanelContainer) adminPanelContainer.classList.remove('hidden');
}

// Инициализация списков компонентов
function initComponentLists() {
    for (let category in components) {
        const listElement = document.getElementById(`${category}-list`);
        if (listElement) {
            listElement.innerHTML = '';
            
            components[category].forEach(component => {
                const option = document.createElement('div');
                option.className = 'component-option';
                option.setAttribute('data-category', category);
                option.setAttribute('data-name', component.name);
                option.setAttribute('data-price', component.price);
                
                option.innerHTML = `
                    <div class="component-info">
                        <h4>${component.name}</h4>
                        <p>${component.desc}</p>
                    </div>
                    <div class="component-price">${component.price.toLocaleString()} ₽</div>
                    <button class="select-btn">Выбрать</button>
                `;
                
                // Добавляем обработчик клика на всю карточку
                option.addEventListener('click', function(e) {
                    if (!e.target.classList.contains('select-btn')) {
                        const btn = this.querySelector('.select-btn');
                        selectComponent(category, component.name, component.price, btn);
                    }
                });
                
                // Добавляем обработчик клика на кнопку
                const selectBtn = option.querySelector('.select-btn');
                selectBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    selectComponent(category, component.name, component.price, this);
                });
                
                listElement.appendChild(option);
            });
        }
    }
}

// Выбор компонента в конструкторе
function selectComponent(category, name, price, button) {
    // Сброс предыдущего выбора для этой категории
    const buttons = document.querySelectorAll(`#${category}-list .select-btn`);
    const options = document.querySelectorAll(`#${category}-list .component-option`);
    
    buttons.forEach(btn => {
        btn.classList.remove('selected');
        btn.textContent = 'Выбрать';
    });
    
    options.forEach(option => {
        option.classList.remove('selected');
    });
    
    // Установка нового выбора
    button.classList.add('selected');
    button.textContent = '✓ Выбрано';
    button.parentElement.classList.add('selected');
    
    // Сохранение выбора
    selectedComponents[category] = {name, price};
    
    // Обновление сводки
    updateSummary();
}

// Обновление сводки в конструкторе
function updateSummary() {
    // Обновление текста в сводке
    document.getElementById('cpu-summary').textContent = selectedComponents.cpu.name || 'Не выбрано';
    document.getElementById('gpu-summary').textContent = selectedComponents.gpu.name || 'Не выбрано';
    document.getElementById('ram-summary').textContent = selectedComponents.ram.name || 'Не выбрано';
    document.getElementById('storage-summary').textContent = selectedComponents.storage.name || 'Не выбрано';
    document.getElementById('mb-summary').textContent = selectedComponents.mb.name || 'Не выбрано';
    
    // Обновление списка в корзине конструктора
    const buildItemsContainer = document.getElementById('custom-build-items');
    buildItemsContainer.innerHTML = '';
    
    let hasComponents = false;
    for (let category in selectedComponents) {
        if (selectedComponents[category].name) {
            hasComponents = true;
            const item = document.createElement('div');
            item.className = 'cart-item';
            item.innerHTML = `
                <div class="cart-item-info">
                    <h4>${getCategoryName(category)}</h4>
                    <p>${selectedComponents[category].name}</p>
                </div>
                <div class="cart-item-price">${selectedComponents[category].price.toLocaleString()} ₽</div>
            `;
            buildItemsContainer.appendChild(item);
        }
    }
    
    if (!hasComponents) {
        buildItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 15px;">Выберите компоненты слева</p>';
    }
    
    // Расчет общей стоимости
    let total = 20000; // Базовая стоимость (корпус, блок питания, охлаждение, сборка)
    for (let category in selectedComponents) {
        total += selectedComponents[category].price;
    }
    
    document.getElementById('total-price').textContent = total.toLocaleString() + ' ₽';
}

// Получение читаемого названия категории
function getCategoryName(key) {
    const names = {
        cpu: 'Процессор',
        gpu: 'Видеокарта',
        ram: 'Оперативная память',
        storage: 'Накопитель',
        mb: 'Материнская плата'
    };
    return names[key] || key;
}

// Открытие детальной информации о ПК
function openPCDetails(name, price, image, description, specs) {
    const modal = document.getElementById('pcDetailsModal');
    const content = document.getElementById('pcDetailsContent');
    
    // Создаем HTML для детальной информации
    let specsHTML = '';
    specs.forEach(spec => {
        specsHTML += `
            <div class="spec-item">
                <div class="spec-name">Компонент</div>
                <div class="spec-value">${spec}</div>
            </div>
        `;
    });
    
    content.innerHTML = `
<div class="pc-details-img">
    <img src="${image}" alt="${name}" style="width:100%;height:100%;object-fit:cover;">
</div>
<div class="pc-details-info">
    <h3>${name}</h3>
    <div class="pc-price">${price.toLocaleString()} ₽</div>
    <p class="pc-details-description">${description}</p>
    
    <div class="pc-details-specs">
        <h4>Комплектация</h4>
        <div class="specs-grid">
            ${specsHTML}
        </div>
    </div>
    
    <div style="display: flex; gap: 15px; margin-top: 30px; flex-wrap: wrap;">
    <button class="btn" onclick="addToCart('${name}', ${price}, 'prebuilt'); closePCDetails();" 
            style="flex: 1; min-height: 44px; display: flex; align-items: center; justify-content: center;">
        Добавить в корзину
    </button>
    <button class="btn btn-secondary" onclick="closePCDetails()" 
            style="flex: 1; min-height: 44px; display: flex; align-items: center; justify-content: center;">
        Закрыть
    </button>
</div>
</div>
`;
    
    modal.style.display = 'flex';
    
    // На мобильных - прокрутка к верху модального окна
    if (window.innerWidth <= 768) {
        modal.scrollTop = 0;
    }
}

// Закрытие детальной информации о ПК
function closePCDetails() {
    const modal = document.getElementById('pcDetailsModal');
    modal.style.display = 'none';
}

// Добавление готовой сборки в корзину
function addToCart(name, price, type) {
    const item = {
        id: Date.now(),
        name,
        price,
        type,
        date: new Date().toLocaleDateString('ru-RU')
    };
    
    cart.push(item);
    saveCart();
    updateCartCount();
    
    // Показать уведомление
    showNotification(`"${name}" добавлен в корзину`);
}

// Добавление кастомной сборки в корзину
function addCustomBuildToCart() {
    // Проверка, что выбраны основные компоненты
    if (!selectedComponents.cpu.name || !selectedComponents.gpu.name || !selectedComponents.mb.name) {
        showNotification('Выберите процессор, видеокарту и материнскую плату', 'error');
        return;
    }
    
    // Создание описания сборки
    let description = 'Кастомная сборка: ';
    for (let category in selectedComponents) {
        if (selectedComponents[category].name) {
            description += `${getCategoryName(category)}: ${selectedComponents[category].name}; `;
        }
    }
    
    // Расчет стоимости
    let total = 20000; // Базовая стоимость
    for (let category in selectedComponents) {
        total += selectedComponents[category].price;
    }
    
    const item = {
        id: Date.now(),
        name: 'Кастомная сборка ПК',
        price: total,
        type: 'custom',
        description: description.trim(),
        date: new Date().toLocaleDateString('ru-RU'),
        components: {...selectedComponents}
    };
    
    cart.push(item);
    saveCart();
    updateCartCount();
    
    // Показать уведомление
    showNotification('Кастомная сборка добавлена в корзину');
    
    // Обновить детали заказа в форме
    document.getElementById('orderDetails').value = description;
    document.getElementById('orderType').value = 'custom';
}

// Открытие модального окна корзины
function openCartModal() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'flex';
    
    updateCartModal();
    
    // На мобильных - предотвращаем скролл body
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
    }
}

// Закрытие модального окна корзины
function closeCartModal() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'none';
    
    // Возвращаем скролл
    document.body.style.overflow = '';
}

// Обновление содержимого модального окна корзины
function updateCartModal() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Корзина пуста</p>';
        cartTotalElement.textContent = '0 ₽';
        return;
    }
    
    let total = 0;
    
    cart.forEach((item, index) => {
        total += item.price;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                ${item.description ? `<p style="font-size: 14px; color: var(--text-secondary); margin-top: 5px;">${item.description.substring(0, 80)}...</p>` : ''}
                <p style="font-size: 14px; color: var(--text-secondary); margin-top: 5px;">${item.date}</p>
            </div>
            <div>
                <div class="cart-item-price">${item.price.toLocaleString()} ₽</div>
                <button class="remove-item" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });
    
    cartTotalElement.textContent = total.toLocaleString() + ' ₽';
}

// Удаление товара из корзины
function removeFromCart(index) {
    if (confirm('Удалить товар из корзины?')) {
        cart.splice(index, 1);
        saveCart();
        updateCartCount();
        updateCartModal();
        showNotification('Товар удален из корзины', 'warning');
    }
}

// Переход к оформлению заказа из корзины
function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Корзина пуста', 'error');
        return;
    }
    
    closeCartModal();
    
    // Прокрутка к форме заказа
    document.getElementById('order').scrollIntoView({behavior: 'smooth'});
    
    // Заполнение деталей заказа в форме
    let orderDetails = '';
    let total = 0;
    
    cart.forEach(item => {
        orderDetails += `${item.name} - ${item.price.toLocaleString()} ₽\n`;
        if (item.description) {
            orderDetails += `${item.description}\n`;
        }
        orderDetails += '\n';
        total += item.price;
    });
    
    orderDetails += `\nИтого: ${total.toLocaleString()} ₽`;
    
    document.getElementById('orderDetails').value = orderDetails;
    document.getElementById('orderType').value = cart.length === 1 && cart[0].type === 'pre-built' ? 'pre-built' : 'custom';
}

// Обновление счетчика корзины
function updateCartCount() {
    const count = cart.reduce((total, item) => total + 1, 0);
    document.getElementById('cartCount').textContent = count;
}

// Сохранение корзины в localStorage
function saveCart() {
    localStorage.setItem('compyou_cart', JSON.stringify(cart));
}

// Показать/скрыть информацию о карте в форме
function showCardFields() {
    const container = document.getElementById('cardInfoContainer');
    if (container) {
        container.style.display = 'block';
    }
}

function hideCardFields() {
    const container = document.getElementById('cardInfoContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Открытие модального окна карты
function openCardModal() {
    const modal = document.getElementById('cardModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // На мобильных - предотвращаем скролл body
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
    }
    
    // Заполняем сохраненные данные, если они есть
    if (cardData) {
        const cardNumber = document.getElementById('cardNumber');
        const cardExpiry = document.getElementById('cardExpiry');
        const cardHolder = document.getElementById('cardHolder');
        const cardEmail = document.getElementById('cardEmail');
        
        if (cardNumber) cardNumber.value = cardData.cardNumber || '';
        if (cardExpiry) cardExpiry.value = cardData.cardExpiry || '';
        if (cardHolder) cardHolder.value = cardData.cardHolder || '';
        if (cardEmail) cardEmail.value = cardData.cardEmail || '';
    }
    
    // Инициализация масок ввода
    initCardInputMasks();
}

// Закрытие модального окна карты
function closeCardModal() {
    const modal = document.getElementById('cardModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    const form = document.getElementById('cardForm');
    if (form) form.reset();
    
    // Возвращаем скролл
    document.body.style.overflow = '';
}

// Инициализация масок для ввода данных карты
function initCardInputMasks() {
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCVCInput = document.getElementById('cardCVC');
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '');
            let formattedValue = '';
            
            // Форматирование: XXXX XXXX XXXX XXXX
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            
            this.value = formattedValue.substring(0, 19);
            
            // Определение типа карты и изменение иконки
            detectCardType(value);
        });
        
        // Для мобильных - правильный тип клавиатуры
        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            cardNumberInput.setAttribute('inputmode', 'numeric');
        }
    }
    
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '');
            
            if (value.length >= 2) {
                this.value = value.substring(0, 2) + '/' + value.substring(2, 4);
            } else {
                this.value = value;
            }
        });
    }
    
    if (cardCVCInput) {
        cardCVCInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '').substring(0, 4);
        });
    }
    
    // Преобразование имени владельца в верхний регистр
    const cardHolderInput = document.getElementById('cardHolder');
    if (cardHolderInput) {
        cardHolderInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
}

// Определение типа карты по номеру
function detectCardType(cardNumber) {
    const cardIcons = document.querySelector('.card-icons');
    if (!cardIcons) return;
    
    // Visa: начинается с 4
    if (/^4/.test(cardNumber)) {
        cardIcons.innerHTML = '<i class="fab fa-cc-visa" style="font-size: 24px; color: #1a1f71;"></i>';
    }
    // MasterCard: начинается с 5
    else if (/^5[1-5]/.test(cardNumber)) {
        cardIcons.innerHTML = '<i class="fab fa-cc-mastercard" style="font-size: 24px; color: #eb001b;"></i>';
    }
    // МИР: начинается с 2
    else if (/^2/.test(cardNumber)) {
        cardIcons.innerHTML = '<i class="fab fa-cc-mir" style="font-size: 24px; color: #5cb850;"></i>';
    }
    // Неизвестная карта - показываем все иконки
    else {
        cardIcons.innerHTML = `
            <i class="fab fa-cc-visa" style="font-size: 24px; color: #1a1f71;"></i>
            <i class="fab fa-cc-mastercard" style="font-size: 24px; color: #eb001b;"></i>
            <i class="fab fa-cc-mir" style="font-size: 24px; color: #5cb850;"></i>
        `;
    }
}

// Валидация данных карты
function validateCardData() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCVC = document.getElementById('cardCVC').value;
    const cardHolder = document.getElementById('cardHolder').value.trim();
    
    // Валидация номера карты (алгоритм Луна)
    if (!isValidCardNumber(cardNumber)) {
        showNotification('Неверный номер карты', 'error');
        return false;
    }
    
    // Валидация срока действия
    if (!isValidExpiry(cardExpiry)) {
        showNotification('Неверный срок действия карты', 'error');
        return false;
    }
    
    // Валидация CVC
    if (!/^\d{3,4}$/.test(cardCVC)) {
        showNotification('CVC код должен содержать 3-4 цифры', 'error');
        return false;
    }
    
    // Валидация имени владельца
    if (cardHolder.length < 2) {
        showNotification('Введите имя владельца карты', 'error');
        return false;
    }
    
    return true;
}

// Проверка номера карты (алгоритм Луна)
function isValidCardNumber(cardNumber) {
    if (!/^\d{16}$/.test(cardNumber)) {
        return false;
    }
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i], 10);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Проверка срока действия карты
function isValidExpiry(expiry) {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        return false;
    }
    
    const [month, year] = expiry.split('/').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    // Проверка месяца
    if (month < 1 || month > 12) {
        return false;
    }
    
    // Проверка года
    if (year < currentYear) {
        return false;
    }
    
    // Если год текущий, проверяем месяц
    if (year === currentYear && month < currentMonth) {
        return false;
    }
    
    return true;
}

// Обработка оплаты картой
function processCardPayment(event) {
    event.preventDefault();
    
    if (!validateCardData()) {
        return;
    }
    
    // Сбор данных карты
    const cardData = {
        cardNumber: document.getElementById('cardNumber').value,
        cardExpiry: document.getElementById('cardExpiry').value,
        cardHolder: document.getElementById('cardHolder').value,
        cardEmail: document.getElementById('cardEmail').value || document.getElementById('email').value,
        lastFourDigits: document.getElementById('cardNumber').value.replace(/\s/g, '').slice(-4),
        timestamp: new Date().toISOString()
    };
    
    // Сохранение данных карты (только для демо - в реальном приложении это должно отправляться на сервер)
    localStorage.setItem('compyou_card_data', JSON.stringify({
        lastFourDigits: cardData.lastFourDigits,
        cardHolder: cardData.cardHolder,
        timestamp: cardData.timestamp
    }));
    
    // Симуляция обработки платежа
    showProcessingPayment();
    
    // Через 2 секунды показываем результат
    setTimeout(() => {
        closeCardModal();
        showPaymentSuccess(cardData.lastFourDigits);
        
        // Автоматически продолжаем оформление заказа после успешной оплаты
        setTimeout(() => {
            proceedWithOrder();
        }, 1000);
    }, 2000);
}

// Показать процесс обработки платежа
function showProcessingPayment() {
    const modal = document.getElementById('cardModal');
    const form = document.getElementById('cardForm');
    
    if (!modal || !form) return;
    
    // Сохраняем оригинальный контент
    const originalContent = form.innerHTML;
    
    // Показываем индикатор обработки
    form.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div class="loading-spinner" style="width: 60px; height: 60px; border: 4px solid rgba(138, 43, 226, 0.3); border-top-color: var(--primary-color); border-radius: 50%; margin: 0 auto 30px; animation: spin 1s linear infinite;"></div>
            <h3 style="margin-bottom: 15px; color: var(--text-color);">Обработка платежа</h3>
            <p style="color: var(--text-secondary);">Пожалуйста, подождите. Мы обрабатываем ваш платеж...</p>
            <p style="color: var(--text-secondary); font-size: 14px; margin-top: 20px;">
                <i class="fas fa-shield-alt"></i> Безопасное соединение
            </p>
        </div>
    `;
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Показать успешную оплату
function showPaymentSuccess(lastFourDigits) {
    const successHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div style="width: 80px; height: 80px; background-color: #00cc66; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px;">
                <i class="fas fa-check" style="font-size: 36px; color: white;"></i>
            </div>
            <h3 style="margin-bottom: 15px; color: var(--text-color);">Оплата прошла успешно!</h3>
            <p style="color: var(--text-secondary); margin-bottom: 25px;">
                С вашей карты **** ${lastFourDigits} была списана сумма заказа.
                Чек отправлен на указанный email.
            </p>
            <div style="background-color: rgba(0, 204, 102, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #00cc66; text-align: left; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-receipt" style="color: #00cc66;"></i>
                    <strong style="color: var(--text-color);">Информация о платеже</strong>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">
                    Номер транзакции: #${Date.now().toString().slice(-8)}<br>
                    Дата: ${new Date().toLocaleString('ru-RU')}<br>
                    Статус: Успешно
                </p>
            </div>
            <button class="btn" onclick="closePaymentSuccess()" style="width: 100%; min-height: 44px;">
                Продолжить оформление заказа
            </button>
        </div>
    `;
    
    // Создаем новое модальное окно для успешной оплаты
    const successModal = document.createElement('div');
    successModal.className = 'modal';
    successModal.id = 'paymentSuccessModal';
    successModal.style.display = 'flex';
    successModal.innerHTML = `
        <div class="modal-content" style="max-width: 95%; margin: 20px;">
            ${successHTML}
        </div>
    `;
    
    document.body.appendChild(successModal);
    
    // Добавляем обработчик для закрытия по клику на фон
    successModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closePaymentSuccess();
        }
    });
}

// Закрыть окно успешной оплаты
function closePaymentSuccess() {
    const modal = document.getElementById('paymentSuccessModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Отправка заказа (обновленная с проверкой валидации)
async function submitOrder() {
    // Проверяем валидность формы
    if (!validateForm()) {
        showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
        
        // Прокручиваем к первой ошибке
        const firstError = document.querySelector('.validation-error[style*="display: block"]');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Корзина пуста. Добавьте товары перед оформлением заказа.', 'error');
        return;
    }
    
    // Проверяем метод оплаты
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    
    // Если оплата картой, открываем окно для ввода данных
    if (paymentMethod === 'card') {
        openCardModal();
        return; // Не продолжаем оформление заказа пока не пройдет оплата
    }
    
    // Если оплата при получении, продолжаем как раньше
    proceedWithOrder();
}

// Новая функция для завершения оформления заказа после оплаты
async function proceedWithOrder() {
    // Получение данных из формы
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;
    const orderType = document.getElementById('orderType').value;
    const orderDetails = document.getElementById('orderDetails').value;
    const comments = document.getElementById('comments').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;
    
    // Расчет общей стоимости
    let total = 0;
    cart.forEach(item => total += item.price);
    
    // Создание объекта заказа
    const order = {
        id: Date.now(),
        fullName,
        phone,
        email,
        address,
        orderType,
        orderDetails,
        comments,
        payment,
        total,
        date: new Date().toLocaleString('ru-RU'),
        status: 'Новый',
        items: [...cart],
        // Добавляем информацию о карте, если была оплата картой
        ...(cardData ? { 
            paymentDetails: {
                method: 'card',
                lastFourDigits: cardData.lastFourDigits,
                paymentDate: new Date().toLocaleString('ru-RU')
            }
        } : {})
    };
    
    // Сохраняем в облачную базу данных
    try {
        const result = await cloudDB.saveOrder(order);
        if (result.cloudSaved) {
            console.log('Заказ сохранен в облако');
            showNotification('Заказ сохранен в облачную базу данных', 'success');
        } else if (result.localOnly) {
            console.log('Заказ сохранен только локально');
            showNotification('Заказ сохранен локально (облако недоступно)', 'warning');
        }
    } catch (error) {
        console.error('Ошибка сохранения заказа:', error);
    }
    
    // Добавление заказа в локальный список
    orders.push(order);
    localStorage.setItem('compyou_orders', JSON.stringify(orders));
    
    // Очистка корзины
    cart = [];
    saveCart();
    updateCartCount();
    
    // Очистка данных карты
    cardData = null;
    localStorage.removeItem('compyou_card_data');
    
    // Очистка формы
    document.getElementById('orderForm').reset();
    
    // Очистка стилей валидации
    const validationErrors = document.querySelectorAll('.validation-error');
    validationErrors.forEach(error => {
        error.style.display = 'none';
    });
    
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
    
    // Показать уведомление
    showNotification(`Заказ №${order.id} успешно оформлен! Мы свяжемся с вами в ближайшее время.`);
    
    // Прокрутка к админ-панели
    document.getElementById('admin').scrollIntoView({behavior: 'smooth'});
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: ${type === 'error' ? '#ff5555' : type === 'warning' ? '#ffaa00' : '#00cc66'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 10000;
        font-weight: 600;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 90%;
        word-wrap: break-word;
    `;
    
    // На мобильных - позиционируем снизу
    if (window.innerWidth <= 768) {
        notification.style.top = 'auto';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.left = '20px';
        notification.style.transform = 'translateY(120%)';
        notification.style.maxWidth = 'calc(100% - 40px)';
    }
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        if (window.innerWidth <= 768) {
            notification.style.transform = 'translateY(0)';
        } else {
            notification.style.transform = 'translateX(0)';
        }
    }, 10);
    
    // Убираем уведомление через 3 секунды
    setTimeout(() => {
        if (window.innerWidth <= 768) {
            notification.style.transform = 'translateY(120%)';
        } else {
            notification.style.transform = 'translateX(120%)';
        }
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Упрощенные функции для отображения заказов на главной странице
function loadOrders() {
    // Эта функция больше не нужна на главной странице
    // Все функции работы с заказами теперь в admin.js
    console.log('Функции работы с заказами перенесены в admin.js');
}

// Упрощенная функция экспорта (оставлена для совместимости)
function exportToExcel() {
    showNotification('Для экспорта заказов перейдите в админ-панель', 'info');
    window.location.href = 'admin.html';
}

// Упрощенная функция очистки заказов
function clearOrders() {
    if (confirm('Вы уверены, что хотите удалить все заказы? Это действие нельзя отменить.')) {
        orders = [];
        localStorage.removeItem('compyou_orders');
        showNotification('Все заказы удалены', 'warning');
    }
}
