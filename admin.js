// Глобальные переменные для админ-панели
let orders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
let filteredOrders = [...orders];
let sortDirection = { date: 'desc', total: 'desc', id: 'desc' };
let currentSort = 'date';
let currentFilter = 'all';
let selectedOrders = new Set();

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    if (localStorage.getItem('compyou_admin_logged') !== 'true') {
        window.location.href = 'index.html';
        return;
    }
    
    loadOrders();    
    updateStats();
    
    // Обработчик поиска
    document.getElementById('searchInput').addEventListener('input', function() {
        searchOrders(this.value);
    });
    
    // Установка активной кнопки сортировки
    document.querySelectorAll('.sort-btn')[0].classList.add('active');
    
    // Инициализация мобильного UX
    initMobileAdminUX();
});

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
            select.style.minHeight = '44px'; // Минимальная высота для касания
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
            searchInput.style.fontSize = '16px'; // Предотвращает зум на iOS
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
                
                // Если свайп вправо больше чем на 100px и вертикальный свайп небольшой
                if (diffX > 100 && Math.abs(diffY) < 50) {
                    closeOrderDetails();
                }
            });
        }
    }
}

// Загрузка заказов
async function loadOrders() {
  // Показываем индикатор загрузки
  const tbody = document.getElementById('ordersTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 50px;">
          <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid rgba(138, 43, 226, 0.3); border-top-color: var(--primary-color); border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
          <p>Загружаем заказы из облака...</p>
        </td>
      </tr>
    `;
  }
  
  // Загружаем из облачной БД
  try {
    orders = await cloudDB.loadAllOrders();
    localStorage.setItem('compyou_orders', JSON.stringify(orders));
    
    // Обновляем статистику
    const stats = cloudDB.getStats();
    console.log('Загружено заказов:', stats.totalOrders);
    
    // Показываем уведомление о синхронизации
    if (stats.useCloud && stats.cachedOrders > 0) {
      showNotification(`Загружено ${stats.cachedOrders} заказов из облака`, 'success');
    }
    
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    // Используем локальные заказы как запасной вариант
    orders = JSON.parse(localStorage.getItem('compyou_orders')) || [];
    showNotification('Используем локальные заказы', 'warning');
  }
  
  filteredOrders = [...orders];
  sortOrders(currentSort);
  updateStats();
  displayOrders();
}

// Обновление статистики
function updateStats() {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
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
            order.id.toString().includes(searchTerm) ||
            order.fullName.toLowerCase().includes(searchTerm) ||
            order.phone.toLowerCase().includes(searchTerm) ||
            order.email.toLowerCase().includes(searchTerm) ||
            order.address.toLowerCase().includes(searchTerm)
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
                valA = new Date(a.date.split(', ')[0].split('.').reverse().join('-'));
                valB = new Date(b.date.split(', ')[0].split('.').reverse().join('-'));
                break;
            case 'total':
                valA = a.total;
                valB = b.total;
                break;
            case 'id':
                valA = a.id;
                valB = b.id;
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
        ordersCountElement.textContent = `Показано 0 из ${orders.length} заказов`;
        return;
    }
    
    filteredOrders.forEach(order => {
        const isSelected = selectedOrders.has(order.id);
        const statusClass = `status-${order.status.toLowerCase().replace(' ', '-')}`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="order-checkbox" data-id="${order.id}" 
                       ${isSelected ? 'checked' : ''} onchange="toggleOrderSelection(${order.id}, this)"
                       style="transform: scale(1.2); margin: 0;">
            </td>
            <td><strong>#${order.id}</strong></td>
            <td>${order.fullName}</td>
            <td>${order.phone}</td>
            <td>${order.email}</td>
            <td>${order.orderType}</td>
            <td><strong>${order.total.toLocaleString()} ₽</strong></td>
            <td>${order.date}</td>
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
    
    ordersCountElement.textContent = `Показано ${filteredOrders.length} из ${orders.length} заказов`;
    
    // Обновляем чекбокс "Выбрать все"
    updateSelectAllCheckbox();
}

// Показать детали заказа (обновлено для отображения информации об оплате)
function showOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('orderDetailsId').textContent = `#${order.id}`;
    
    // Заполняем детали
    const detailsGrid = document.getElementById('orderDetailsGrid');
    detailsGrid.innerHTML = `
        <div class="detail-item">
            <h4>Клиент</h4>
            <p>${order.fullName}</p>
        </div>
        <div class="detail-item">
            <h4>Контакты</h4>
            <p>📞 ${order.phone}<br>📧 ${order.email}</p>
        </div>
        <div class="detail-item">
            <h4>Адрес доставки</h4>
            <p>${order.address}</p>
        </div>
        <div class="detail-item">
            <h4>Тип заказа</h4>
            <p>${order.orderType}</p>
        </div>
        <div class="detail-item">
            <h4>Сумма</h4>
            <p><strong>${order.total.toLocaleString()} ₽</strong></p>
        </div>
        <div class="detail-item">
            <h4>Дата</h4>
            <p>${order.date}</p>
        </div>
        <div class="detail-item">
            <h4>Статус</h4>
            <p class="status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</p>
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
                <p>Карта: **** ${order.paymentDetails.lastFourDigits}<br>
                   Дата оплата: ${order.paymentDetails.paymentDate}</p>
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
                    <strong>${item.name}</strong>
                    ${item.description ? `<p style="font-size: 14px; color: var(--text-secondary); margin-top: 5px;">${item.description}</p>` : ''}
                </div>
                <div>${item.price.toLocaleString()} ₽</div>
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
        loadOrders();
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
        loadOrders();
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
        loadOrders();
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
    loadOrders();
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
    
    if (allCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
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

// Экспорт в Excel (обновленная версия для админ-панели)
function exportToExcel() {
    if (orders.length === 0) {
        showNotification('Нет заказов для экспорта', 'error');
        return;
    }
    
    // Определяем, что экспортировать: все заказы или отфильтрованные
    const exportData = filteredOrders.length > 0 ? filteredOrders : orders;
    
    // Создание CSV строки с правильной кодировкой UTF-8 с BOM
    let csv = '\ufeff';
    csv += 'ID;ФИО;Телефон;Email;Адрес;Тип заказа;Сумма;Дата;Статус;Оплата\n';
    
    exportData.forEach(order => {
        const escapedFullName = order.fullName.replace(/"/g, '""');
        const escapedEmail = order.email.replace(/"/g, '""');
        const escapedAddress = order.address.replace(/"/g, '""');
        const escapedOrderType = order.orderType.replace(/"/g, '""');
        const escapedStatus = order.status.replace(/"/g, '""');
        const paymentMethod = order.payment === 'card' ? 'Картой онлайн' : 'При получении';
        
        csv += `"${order.id}";"${escapedFullName}";"${order.phone}";"${escapedEmail}";"${escapedAddress}";"${escapedOrderType}";"${order.total}";"${order.date}";"${escapedStatus}";"${paymentMethod}"\n`;
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

// Экспорт в Word (обновленная версия для админ-панели)
function exportToWord() {
    if (orders.length === 0) {
        showNotification('Нет заказов для экспорта', 'error');
        return;
    }
    
    // Определяем, что экспортировать: все заказы или отфильтрованные
    const exportData = filteredOrders.length > 0 ? filteredOrders : orders;
    
    // Функция для безопасного экранирования данных
    function escapeForXML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    
    // Создание HTML-содержимого для Word
    let content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>Заказы CompYou</title>
<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #8a2be2; padding-bottom: 10px; }
    .info { margin: 15px 0; color: #666; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th { background-color: #f2f2f2; padding: 10px; border: 1px solid #ddd; text-align: left; }
    td { padding: 10px; border: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .total { margin-top: 20px; font-weight: bold; color: #8a2be2; }
    .status-new { color: #ffaa00; }
    .status-processing { color: #2196F3; }
    .status-shipped { color: #4CAF50; }
    .status-delivered { color: #00cc66; }
    .status-cancelled { color: #ff5555; }
</style>
</head>
<body>
<h1>Заказы CompYou</h1>
<div class="info">
    <p><strong>Дата экспорта:</strong> ${escapeForXML(new Date().toLocaleString('ru-RU'))}</p>
    <p><strong>Всего заказов:</strong> ${exportData.length}</p>
    <p><strong>Фильтр:</strong> ${currentFilter === 'all' ? 'Все заказы' : 'Статус: ' + currentFilter}</p>
    <p><strong>Сортировка:</strong> ${currentSort === 'date' ? 'По дате' : currentSort === 'total' ? 'По сумме' : 'По ID'}</p>
</div>
<table border="1" cellspacing="0" cellpadding="5">
<tr>
    <th>ID</th>
    <th>ФИО</th>
    <th>Телефон</th>
    <th>Email</th>
    <th>Адрес</th>
    <th>Тип заказа</th>
    <th>Сумма</th>
    <th>Дата</th>
    <th>Статус</th>
    <th>Оплата</th>
</tr>
`;
    
    exportData.forEach(order => {
        const statusClass = `status-${order.status.toLowerCase().replace(' ', '-')}`;
        const paymentMethod = order.payment === 'card' ? 'Картой онлайн' : 'При получении';
        
        content += `<tr>
    <td>${escapeForXML(order.id)}</td>
    <td>${escapeForXML(order.fullName)}</td>
    <td>${escapeForXML(order.phone)}</td>
    <td>${escapeForXML(order.email)}</td>
    <td>${escapeForXML(order.address)}</td>
    <td>${escapeForXML(order.orderType)}</td>
    <td>${escapeForXML(order.total.toLocaleString())} ₽</td>
    <td>${escapeForXML(order.date)}</td>
    <td class="${statusClass}">${escapeForXML(order.status)}</td>
    <td>${escapeForXML(paymentMethod)}</td>
</tr>`;
    });
    
    // Добавляем итоговую сумму
    const totalSum = exportData.reduce((sum, order) => sum + order.total, 0);
    content += `</table>
<div class="total">
    Общая сумма экспортированных заказов: ${totalSum.toLocaleString()} ₽
</div>
</body>
</html>`;
    
    // Создание и скачивание файла с правильной кодировкой
    const blob = new Blob(['\ufeff', content], {type: 'application/msword;charset=UTF-8'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compyou_orders_${new Date().toISOString().slice(0,10)}.doc`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Экспортировано ${exportData.length} заказ(ов) в Word документ`);
}

// Печать заказа (обновленная версия)
function printOrder() {
    const orderDetails = document.getElementById('orderDetails');
    if (!orderDetails.classList.contains('show')) return;
    
    const orderId = document.getElementById('orderDetailsId').textContent;
    const orderGrid = document.getElementById('orderDetailsGrid').innerHTML;
    const orderItems = document.getElementById('orderItemsList').innerHTML;
    
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>Накладная CompYou - ${orderId}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                
                h1 {
                    color: #8a2be2;
                    border-bottom: 2px solid #8a2be2;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                
                .company-info {
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #ddd;
                }
                
                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .detail-item {
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                }
                
                .detail-item h4 {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 8px;
                }
                
                .detail-item p {
                    font-size: 16px;
                    font-weight: 500;
                }
                
                .items-section {
                    margin-top: 30px;
                }
                
                .item-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid #ddd;
                }
                
                .item-row:last-child {
                    border-bottom: none;
                }
                
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 2px solid #333;
                    font-size: 14px;
                    color: #666;
                }
                
                @media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                    @page { margin: 1cm; }
                }
                
                /* Для мобильных */
                @media (max-width: 768px) {
                    .details-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1><i class="fas fa-file-invoice"></i> Накладная CompYou</h1>
                <div class="company-info">
                    <p><strong>CompYou - Сборка игровых ПК</strong></p>
                    <p>Саранск, ул.Транспортная 11</p>
                    <p>8 (987) 570-07-85 | kuvsinov094@gmail.com</p>
                </div>
            </div>
            
            <h2>Детали заказа ${orderId}</h2>
            
            <div class="details-grid">
                ${orderGrid}
            </div>
            
            <div class="items-section">
                <h3>Товары в заказе:</h3>
                <div class="items-list">
                    ${orderItems}
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Дата печати:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                <p>Подпись ответственного лица: ________________________</p>
                <p>Печать</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #8a2be2; color: white; border: none; border-radius: 4px; cursor: pointer;">Печать</button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Закрыть</button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Ждем загрузку контента и показываем кнопку печати
    printWindow.onload = function() {
        printWindow.document.querySelector('.no-print').style.display = 'block';
    };
}

// Показать уведомление (аналогичная функция из script.js)
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

// Выход из админ-панели
function logoutAdmin() {
    if (confirm('Вы уверены, что хотите выйти из админ-панели?')) {
        localStorage.removeItem('compyou_admin_logged');
        window.location.href = 'index.html';
    }
}

// Синхронизация с облаком
async function syncWithCloud() {
    showNotification('Начинаем синхронизацию...', 'info');
    
    try {
        // Проверяем, существует ли cloudDB
        if (!window.cloudDB) {
            showNotification('Облачная база данных не инициализирована', 'error');
            return;
        }
        
        // Проверяем подключение к облаку
        let testResult;
        try {
            // Проверяем наличие метода testConnection
            if (typeof cloudDB.testConnection === 'function') {
                testResult = await cloudDB.testConnection();
            } else {
                // Если метода нет, используем checkCloudAvailability
                testResult = await cloudDB.checkCloudAvailability();
                testResult = { success: testResult, message: testResult ? 'Подключение установлено' : 'Подключение не установлено' };
            }
        } catch (testError) {
            console.error('Ошибка проверки подключения:', testError);
            testResult = { success: false, message: 'Ошибка проверки подключения' };
        }
        
        console.log('Тест подключения:', testResult);
        
        if (!testResult || !testResult.success) {
            showNotification('Облако недоступно. Проверьте подключение.', 'error');
            return;
        }
        
        // Выполняем синхронизацию
        const result = await cloudDB.syncOrders();
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Перезагружаем заказы
            await loadOrders();
        } else {
            showNotification(`Ошибка: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        showNotification(`Ошибка синхронизации: ${error.message}`, 'error');
    }

}

