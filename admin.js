// Глобальные переменные для админ-панели
let orders = [];
let filteredOrders = [];
let sortDirection = { date: 'desc', total: 'desc', id: 'desc' };
let currentSort = 'date';
let currentFilter = 'all';
let selectedOrders = new Set();
let isSyncing = false; // Флаг для предотвращения повторной синхронизации

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    if (localStorage.getItem('compyou_admin_logged') !== 'true') {
        window.location.href = 'index.html';
        return;
    }
    
    // Инициализируем заказы из localStorage
    orders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
    filteredOrders = [...orders];
    
    initializeOrders();
    
    // Обработчик поиска
    document.getElementById('searchInput').addEventListener('input', function() {
        searchOrders(this.value);
    });
    
    // Установка активной кнопки сортировки
    if (document.querySelectorAll('.sort-btn').length > 0) {
        document.querySelectorAll('.sort-btn')[0].classList.add('active');
    }
    
    // Инициализация мобильного UX
    initMobileAdminUX();
});

// Инициализация заказов (без автоматической синхронизации)
function initializeOrders() {
    updateStats();
    displayOrders();
}

// Инициализация мобильного UX для админ-панели
function initMobileAdminUX() {
    // Проверяем мобильное устройство
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isMobile) {
        // Улучшаем таблицу для мобильных
        const table = document.querySelector('.orders-table');
        if (table) {
            table.style.fontSize = '14px';
        }
        
        // Улучшаем выпадающие списки
        const selects = document.querySelectorAll('.status-select');
        selects.forEach(select => {
            select.style.fontSize = '14px';
            select.style.padding = '8px';
            select.style.minHeight = '44px';
        });
        
        // Улучшаем кнопки действий
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.style.minHeight = '44px';
            btn.style.minWidth = '44px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
        });
        
        // Улучшаем инпут поиска
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.style.fontSize = '16px';
            searchInput.style.minHeight = '44px';
        }
        
        // Добавляем свайп для закрытия деталей заказа
        const orderDetails = document.getElementById('orderDetails');
        if (orderDetails) {
            let startX = 0;
            let startY = 0;
            
            orderDetails.addEventListener('touchstart', function(e) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });
            
            orderDetails.addEventListener('touchend', function(e) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;
                
                if (diffX > 100 && Math.abs(diffY) < 50) {
                    closeOrderDetails();
                }
            });
        }
    }
}

// Загрузка заказов (без автоматической синхронизации)
async function loadOrders() {
    // Показываем индикатор загрузки
    const tbody = document.getElementById('ordersTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 50px;">
                    <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid rgba(138, 43, 226, 0.3); border-top-color: var(--primary-color); border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
                    <p>Обновляем список заказов...</p>
                </td>
            </tr>
        `;
    }
    
    // Если идет синхронизация, не загружаем заново
    if (isSyncing) {
        return;
    }
    
    try {
        console.log('Начинаем загрузку заказов...');
        
        // Сначала пробуем загрузить из localStorage
        const localOrders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
        console.log('Локальные заказы (из localStorage):', localOrders.length);
        
        // Проверяем наличие cloudDB
        if (window.cloudDB && typeof cloudDB.loadAllOrders === 'function') {
            console.log('Пробуем загрузить из облака...');
            try {
                const cloudOrders = await cloudDB.loadAllOrders();
                console.log('Заказов из облака:', cloudOrders.length);
                
                // Используем облачные заказы, если они есть
                if (cloudOrders.length > 0) {
                    orders = cloudOrders;
                    localStorage.setItem('compyou_orders', JSON.stringify(cloudOrders));
                    console.log('Используем заказы из облака');
                } else {
                    orders = localOrders;
                    console.log('Облако пустое, используем локальные заказы');
                }
            } catch (cloudError) {
                console.warn('Ошибка загрузки из облака:', cloudError);
                orders = localOrders;
                console.log('Используем локальные заказы из-за ошибки облака');
            }
        } else {
            orders = localOrders;
            console.log('CloudDB недоступен, используем локальные заказы');
        }
        
    } catch (error) {
        console.error('Критическая ошибка загрузки заказов:', error);
        // Используем пустой массив как запасной вариант
        orders = [];
    }
    
    console.log('Итоговое количество заказов:', orders.length);
    
    filteredOrders = [...orders];
    updateStats();
    displayOrders();
}
    
    // Если идет синхронизация, не загружаем заново
    if (isSyncing) {
        return;
    }
    
    try {
        // Проверяем наличие cloudDB
        if (window.cloudDB && typeof cloudDB.loadAllOrders === 'function') {
            console.log('Загружаем заказы из облака...');
            const cloudOrders = await cloudDB.loadAllOrders();
            
            // Сохраняем заказы
            orders = cloudOrders;
            localStorage.setItem('compyou_orders', JSON.stringify(cloudOrders));
            
            console.log(`Загружено ${cloudOrders.length} заказов из облака`);
            
        } else {
            // Используем локальные заказы
            orders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
            console.log('Используем локальные заказы:', orders.length);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        // Используем локальные заказы
        orders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
    }
    
    filteredOrders = [...orders];
    updateStats();
    displayOrders();
}

// Обновление статистики
function updateStats() {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const newOrders = orders.filter(order => order.status === 'Новый').length;
    const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString() + ' ₽';
    document.getElementById('newOrders').textContent = newOrders;
    document.getElementById('averageOrder').textContent = averageOrder.toLocaleString() + ' ₽';
}

// Поиск заказов
function searchOrders(query) {
    if (!query.trim()) {
        filteredOrders = [...orders];
    } else {
        const searchTerm = query.toLowerCase();
        filteredOrders = orders.filter(order => 
            (order.id && order.id.toString().includes(searchTerm)) ||
            (order.fullName && order.fullName.toLowerCase().includes(searchTerm)) ||
            (order.phone && order.phone.toLowerCase().includes(searchTerm)) ||
            (order.email && order.email.toLowerCase().includes(searchTerm)) ||
            (order.address && order.address.toLowerCase().includes(searchTerm))
        );
    }
    
    // Применяем текущий фильтр после поиска
    if (currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === currentFilter);
    }
    
    // Применяем текущую сортировку
    sortOrders(currentSort, null, true);
}

// Сортировка заказов
function sortOrders(criteria, button = null, skipButtonActive = false) {
    currentSort = criteria;
    
    if (button && !skipButtonActive) {
        // Убираем active со всех кнопок
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        // Добавляем active на текущую кнопку
        button.classList.add('active');
    }
    
    // Переключаем направление сортировки
    sortDirection[criteria] = sortDirection[criteria] === 'asc' ? 'desc' : 'asc';
    
    filteredOrders.sort((a, b) => {
        let valA, valB;
        
        switch(criteria) {
            case 'date':
                valA = a.date ? new Date(a.date.split(', ')[0].split('.').reverse().join('-')) : new Date(0);
                valB = b.date ? new Date(b.date.split(', ')[0].split('.').reverse().join('-')) : new Date(0);
                break;
            case 'total':
                valA = a.total || 0;
                valB = b.total || 0;
                break;
            case 'id':
                valA = a.id || 0;
                valB = b.id || 0;
                break;
            default:
                return 0;
        }
        
        if (sortDirection[criteria] === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });
    
    displayOrders();
}

// Фильтрация заказов по статусу
function filterOrders(status, button) {
    currentFilter = status;
    
    // Убираем active со всех кнопок фильтра
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Добавляем active на текущую кнопку
    button.classList.add('active');
    
    if (status === 'all') {
        filteredOrders = [...orders];
    } else {
        filteredOrders = orders.filter(order => order.status === status);
    }
    
    // Применяем поиск, если есть запрос
    const searchQuery = document.getElementById('searchInput').value;
    if (searchQuery) {
        searchOrders(searchQuery);
    } else {
        // Применяем текущую сортировку
        sortOrders(currentSort, null, true);
    }
}

// Отображение заказов в таблице
function displayOrders() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const ordersCountElement = document.getElementById('ordersCount');
    
    if (!ordersTableBody) return;
    
    ordersTableBody.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 50px; color: var(--text-secondary)">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>Заказов не найдено</p>
                </td>
            </tr>
        `;
        if (ordersCountElement) {
            ordersCountElement.textContent = `Показано 0 из ${orders.length} заказов`;
        }
        return;
    }
    
    filteredOrders.forEach(order => {
        const isSelected = selectedOrders.has(order.id);
        const statusClass = order.status ? `status-${order.status.toLowerCase().replace(/ /g, '-')}` : 'status-новый';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="order-checkbox" data-id="${order.id}" 
                       ${isSelected ? 'checked' : ''} onchange="toggleOrderSelection(${order.id}, this)"
                       style="transform: scale(1.2); margin: 0;">
            </td>
            <td><strong>#${order.id || ''}</strong></td>
            <td>${order.fullName || ''}</td>
            <td>${order.phone || ''}</td>
            <td>${order.email || ''}</td>
            <td>${order.orderType || 'custom'}</td>
            <td><strong>${(order.total || 0).toLocaleString()} ₽</strong></td>
            <td>${order.date || ''}</td>
            <td>
                <select class="status-select ${statusClass}" data-id="${order.id}" onchange="updateOrderStatus(${order.id}, this)"
                        style="min-height: 44px; min-width: 120px;">
                    <option value="Новый" ${order.status === 'Новый' ? 'selected' : ''}>Новый</option>
                    <option value="В обработке" ${order.status === 'В обработке' ? 'selected' : ''}>В обработке</option>
                    <option value="Отправлен" ${order.status === 'Отправлен' ? 'selected' : ''}>Отправлен</option>
                    <option value="Доставлен" ${order.status === 'Доставлен' ? 'selected' : ''}>Доставлен</option>
                    <option value="Отменен" ${order.status === 'Отменен' ? 'selected' : ''}>Отменен</option>
                </select>
            </td>
            <td style="white-space: nowrap;">
                <button class="action-btn" onclick="showOrderDetails(${order.id})" title="Просмотреть детали" style="margin-right: 5px;">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="deleteOrder(${order.id})" title="Удалить заказ">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
    
    if (ordersCountElement) {
        ordersCountElement.textContent = `Показано ${filteredOrders.length} из ${orders.length} заказов`;
    }
    
    // Обновляем чекбокс "Выбрать все"
    updateSelectAllCheckbox();
}

// Показать детали заказа
function showOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('orderDetailsId').textContent = `#${order.id}`;
    
    // Заполняем детали
    const detailsGrid = document.getElementById('orderDetailsGrid');
    detailsGrid.innerHTML = `
        <div class="detail-item">
            <h4>Клиент</h4>
            <p>${order.fullName || ''}</p>
        </div>
        <div class="detail-item">
            <h4>Контакты</h4>
            <p>📞 ${order.phone || ''}<br>📧 ${order.email || ''}</p>
        </div>
        <div class="detail-item">
            <h4>Адрес доставки</h4>
            <p>${order.address || ''}</p>
        </div>
        <div class="detail-item">
            <h4>Тип заказа</h4>
            <p>${order.orderType || 'custom'}</p>
        </div>
        <div class="detail-item">
            <h4>Сумма</h4>
            <p><strong>${(order.total || 0).toLocaleString()} ₽</strong></p>
        </div>
        <div class="detail-item">
            <h4>Дата</h4>
            <p>${order.date || ''}</p>
        </div>
        <div class="detail-item">
            <h4>Статус</h4>
            <p class="status-${order.status ? order.status.toLowerCase().replace(/ /g, '-') : 'новый'}">${order.status || 'Новый'}</p>
        </div>
        <div class="detail-item">
            <h4>Оплата</h4>
            <p>${order.payment === 'card' ? 'Картой онлайн' : 'При получении'}</p>
        </div>
    `;
    
    // Добавляем информацию об оплате картой, если есть
    if (order.paymentDetails) {
        detailsGrid.innerHTML += `
            <div class="detail-item">
                <h4>Детали оплаты</h4>
                <p>Карта: **** ${order.paymentDetails.lastFourDigits || ''}<br>
                   Дата оплата: ${order.paymentDetails.paymentDate || ''}</p>
            </div>
        `;
    }
    
    // Заполняем список товаров
    const itemsList = document.getElementById('orderItemsList');
    itemsList.innerHTML = '';
    
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';
            itemRow.innerHTML = `
                <div>
                    <strong>${item.name || ''}</strong>
                    ${item.description ? `<p style="font-size: 14px; color: var(--text-secondary); margin-top: 5px;">${item.description}</p>` : ''}
                </div>
                <div>${(item.price || 0).toLocaleString()} ₽</div>
            `;
            itemsList.appendChild(itemRow);
        });
    } else {
        itemsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Товары не найдены</p>';
    }
    
    // Показываем блок с деталями
    document.getElementById('orderDetails').classList.add('show');
    
    // На мобильных - плавная прокрутка
    if (window.innerWidth <= 768) {
        document.getElementById('orderDetails').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Добавляем кнопку "Закрыть" сверху для мобильных
        const detailsContainer = document.getElementById('orderDetails');
        const closeBtn = detailsContainer.querySelector('.btn');
        if (closeBtn) {
            const mobileCloseBtn = document.createElement('button');
            mobileCloseBtn.className = 'btn btn-secondary';
            mobileCloseBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Назад';
            mobileCloseBtn.style.marginBottom = '20px';
            mobileCloseBtn.style.width = '100%';
            mobileCloseBtn.style.minHeight = '44px';
            mobileCloseBtn.onclick = closeOrderDetails;
            
            detailsContainer.insertBefore(mobileCloseBtn, detailsContainer.firstChild);
        }
    }
}

// Закрыть детали заказа
function closeOrderDetails() {
    document.getElementById('orderDetails').classList.remove('show');
    
    // Удаляем мобильную кнопку "Назад", если она есть
    const mobileCloseBtn = document.querySelector('#orderDetails .btn-secondary[style*="width: 100%"]');
    if (mobileCloseBtn) {
        mobileCloseBtn.remove();
    }
}

// Обновить статус заказа
function updateOrderStatus(orderId, selectElement) {
    const newStatus = selectElement.value;
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        localStorage.setItem('compyou_orders', JSON.stringify(orders));
        
        // Обновляем отображение
        updateStats();
        displayOrders();
        showNotification(`Статус заказа #${orderId} изменен на "${newStatus}"`);
    }
}

// Удалить заказ
function deleteOrder(orderId) {
    if (confirm(`Удалить заказ #${orderId}? Это действие нельзя отменить.`)) {
        orders = orders.filter(order => order.id !== orderId);
        localStorage.setItem('compyou_orders', JSON.stringify(orders));
        
        // Удаляем из выбранных
        selectedOrders.delete(orderId);
        
        // Обновляем отображение
        filteredOrders = [...orders];
        updateStats();
        displayOrders();
        showNotification(`Заказ #${orderId} удален`, 'warning');
    }
}

// Выбрать все заказы
function selectAllOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        const orderId = parseInt(checkbox.getAttribute('data-id'));
        selectedOrders.add(orderId);
        checkbox.checked = true;
    });
    updateSelectAllCheckbox();
}

// Снять выделение со всех заказов
function deselectAllOrders() {
    selectedOrders.clear();
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectAllCheckbox();
}

// Удалить выбранные заказы
function deleteSelectedOrders() {
    if (selectedOrders.size === 0) {
        showNotification('Не выбрано ни одного заказа', 'error');
        return;
    }
    
    if (confirm(`Удалить ${selectedOrders.size} выбранных заказ(ов)? Это действие нельзя отменить.`)) {
        orders = orders.filter(order => !selectedOrders.has(order.id));
        localStorage.setItem('compyou_orders', JSON.stringify(orders));
        
        selectedOrders.clear();
        filteredOrders = [...orders];
        updateStats();
        displayOrders();
        showNotification(`${selectedOrders.size} заказ(ов) удалено`, 'warning');
    }
}

// Отметить как "В обработке"
function markAsProcessed() {
    if (selectedOrders.size === 0) {
        showNotification('Не выбрано ни одного заказа', 'error');
        return;
    }
    
    orders.forEach(order => {
        if (selectedOrders.has(order.id)) {
            order.status = 'В обработке';
        }
    });
    
    localStorage.setItem('compyou_orders', JSON.stringify(orders));
    updateStats();
    displayOrders();
    showNotification(`${selectedOrders.size} заказ(ов) отмечен(ы) как "В обработке"`);
}

// Выбор/отмена выбора заказа
function toggleOrderSelection(orderId, checkbox) {
    if (checkbox.checked) {
        selectedOrders.add(orderId);
    } else {
        selectedOrders.delete(orderId);
    }
    updateSelectAllCheckbox();
}

// Выбрать все/снять выделение
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    
    if (checkbox.checked) {
        checkboxes.forEach(cb => {
            const orderId = parseInt(cb.getAttribute('data-id'));
            selectedOrders.add(orderId);
            cb.checked = true;
        });
    } else {
        selectedOrders.clear();
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
    }
}

// Обновить чекбокс "Выбрать все"
function updateSelectAllCheckbox() {
    const allCheckboxes = document.querySelectorAll('.order-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (allCheckboxes.length === 0 || !selectAllCheckbox) {
        return;
    }
    
    const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === allCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Экспорт в Excel
function exportToExcel() {
    if (orders.length === 0) {
        showNotification('Нет заказов для экспорта', 'error');
        return;
    }
    
    // Определяем, что экспортировать: все заказы или отфильтрованные
    const exportData = filteredOrders.length > 0 ? filteredOrders : orders;
    
    // Создание CSV строки
    let csv = '\ufeff';
    csv += 'ID;ФИО;Телефон;Email;Адрес;Тип заказа;Сумма;Дата;Статус;Оплата\n';
    
    exportData.forEach(order => {
        const escapedFullName = (order.fullName || '').replace(/"/g, '""');
        const escapedEmail = (order.email || '').replace(/"/g, '""');
        const escapedAddress = (order.address || '').replace(/"/g, '""');
        const escapedOrderType = (order.orderType || '').replace(/"/g, '""');
        const escapedStatus = (order.status || '').replace(/"/g, '""');
        const paymentMethod = order.payment === 'card' ? 'Картой онлайн' : 'При получении';
        
        csv += `"${order.id || ''}";"${escapedFullName}";"${order.phone || ''}";"${escapedEmail}";"${escapedAddress}";"${escapedOrderType}";"${order.total || 0}";"${order.date || ''}";"${escapedStatus}";"${paymentMethod}"\n`;
    });
    
    // Создание и скачивание файла
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compyou_orders_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Экспортировано ${exportData.length} заказ(ов) в CSV файл`);
}

// Синхронизация с облаком - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function syncWithCloud() {
    if (isSyncing) {
        showNotification('Синхронизация уже выполняется...', 'info');
        return;
    }
    
    isSyncing = true;
    showNotification('Начинаем синхронизацию...', 'info');
    
    try {
        // Проверяем, существует ли cloudDB
        if (!window.cloudDB) {
            showNotification('Облачная база данных не инициализирована', 'error');
            isSyncing = false;
            return;
        }
        
        // Сохраняем текущие локальные заказы ДО синхронизации
        const localOrdersBefore = [...orders];
        
        console.log('Заказов до синхронизации:', localOrdersBefore.length);
        
        // Выполняем синхронизацию
        const result = await cloudDB.syncOrders();
        
        if (result.success) {
            // Загружаем обновленные данные ИЗ cloudDB
            console.log('Загружаем данные после синхронизации...');
            const freshOrders = await cloudDB.loadAllOrders();
            
            console.log('Заказов после загрузки из cloudDB:', freshOrders.length);
            
            // Проверяем, что мы получили заказы
            if (!Array.isArray(freshOrders)) {
                throw new Error('Неверный формат данных из облака');
            }
            
            // Сохраняем данные
            orders = freshOrders;
            filteredOrders = [...freshOrders];
            
            // Сохраняем в localStorage
            localStorage.setItem('compyou_orders', JSON.stringify(freshOrders));
            
            // Обновляем интерфейс
            updateStats();
            displayOrders();
            
            // Сравниваем заказы ДО и ПОСЛЕ
            const localOrdersAfter = freshOrders.length;
            
            // Находим ID заказов, которые были до
            const beforeIds = new Set(localOrdersBefore.map(order => order.id));
            const afterIds = new Set(freshOrders.map(order => order.id));
            
            // Находим новые заказы (которые есть после, но не было до)
            const newOrders = freshOrders.filter(order => !beforeIds.has(order.id));
            
            // Находим удаленные заказы (которые были до, но нет после)
            const removedOrders = localOrdersBefore.filter(order => !afterIds.has(order.id));
            
            console.log('Новых заказов:', newOrders.length);
            console.log('Удаленных заказов:', removedOrders.length);
            
            // Формируем сообщение
            let message = `Синхронизация завершена! Всего заказов: ${localOrdersAfter}`;
            
            if (newOrders.length > 0) {
                message += `\nДобавлено новых: ${newOrders.length}`;
            }
            
            if (removedOrders.length > 0) {
                message += `\nУдалено из облака: ${removedOrders.length}`;
                
                // Показываем предупреждение, если заказы были удалены
                if (removedOrders.length > 0) {
                    console.warn('Удаленные заказы:', removedOrders.map(o => `#${o.id}`));
                }
            }
            
            showNotification(message, newOrders.length > 0 ? 'success' : 'info');
            
        } else {
            if (result.reason === 'cloud_disabled') {
                showNotification('Облачное хранилище отключено. Проверьте настройки.', 'warning');
            } else {
                showNotification(`Ошибка синхронизации: ${result.error || 'Неизвестная ошибка'}`, 'error');
            }
        }
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        showNotification(`Ошибка синхронизации: ${error.message}`, 'error');
        
        // В случае ошибки показываем текущие заказы
        updateStats();
        displayOrders();
    } finally {
        isSyncing = false;
    }
}

// Простое обновление списка заказов
function refreshOrders() {
    loadOrders();
    showNotification('Список заказов обновлен', 'info');
}

// Выход из админ-панели
function logoutAdmin() {
    if (confirm('Вы уверены, что хотите выйти из админ-панели?')) {
        localStorage.removeItem('compyou_admin_logged');
        window.location.href = 'index.html';
    }
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
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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

