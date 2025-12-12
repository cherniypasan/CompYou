// cloud-db.js - Облачная база данных для заказов CompYou
// Использует Google Sheets как простую облачную БД

class CloudDB {
    constructor() {
        // URL вашего Google Apps Script веб-приложения
        this.API_URL = 'https://script.google.com/macros/s/AKfycbz0ZVSBXTdM9pxnDxlldDidPjogZKADzEtsToCXTR39XWaimqEKQvOmvGqnuawXsRqS/exec'; // ВАЖНО: Замените на ваш URL после настройки
        
        // Флаг для использования облака
        this.useCloud = false;
        
        // Кэш заказов
        this.cachedOrders = [];
        
        // Инициализация
        this.init();
    }
    
    init() {
        // Проверяем, указан ли URL API
        if (this.API_URL && this.API_URL.startsWith('https://')) {
            this.useCloud = true;
            console.log('Cloud DB: Облачное хранилище активировано');
        } else {
            console.log('Cloud DB: Используется локальное хранилище (укажите API_URL для облака)');
        }
    }
    
    // Проверка доступности облака
    async checkCloudAvailability() {
        if (!this.useCloud) return false;
        
        try {
            const response = await fetch(`${this.API_URL}?action=ping&t=${Date.now()}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.success || true;
            }
            return false;
        } catch (error) {
            console.warn('Cloud DB: Облачное хранилище недоступно:', error.message);
            return false;
        }
    }
    
    // Сохранение заказа в облако
    async saveOrder(order) {
        // Всегда сохраняем локально
        this.saveOrderLocal(order);
        
        // Пробуем сохранить в облако
        if (!this.useCloud) {
            console.log('Cloud DB: Облако отключено, заказ сохранен только локально');
            return { success: true, localOnly: true };
        }
        
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addOrder',
                    order: order
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`Cloud DB: Заказ #${order.id} сохранен в облако`);
                return { success: true, cloudSaved: true };
            } else {
                throw new Error(result.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Cloud DB: Ошибка сохранения в облако:', error);
            return { 
                success: true, 
                localOnly: true, 
                cloudError: error.message 
            };
        }
    }
    
    // Загрузка всех заказов (из облака + локальные)
        async loadAllOrders() {
        const localOrders = this.loadOrdersLocal();
        
        if (!this.useCloud) {
            console.log('Cloud DB: Загружены только локальные заказы:', localOrders.length);
            return localOrders;
        }
        
        try {
            // Загружаем из облака
            const response = await fetch(`${this.API_URL}?action=getOrders&t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Cloud DB Response:', result);
            
            // Проверяем формат ответа
            if (!result.success) {
                console.warn('Cloud DB: Ошибка от сервера:', result.error);
                return localOrders;
            }
            
            // Получаем заказы из data
            let cloudOrders = [];
            if (result.data && Array.isArray(result.data)) {
                cloudOrders = result.data;
            }
            
            console.log(`Cloud DB: Загружено ${cloudOrders.length} заказов из облака`);
            
            // Объединяем заказы
            const mergedOrders = this.mergeOrders(cloudOrders, localOrders);
            
            // Сохраняем локально
            this.saveOrdersLocal(mergedOrders);
            
            this.cachedOrders = mergedOrders;
            return mergedOrders;
            
        } catch (error) {
            console.warn('Cloud DB: Ошибка загрузки из облака:', error.message);
            return localOrders;
        }
    }
    
    // Обновление статуса заказа
    async updateOrderStatus(orderId, status) {
        // Обновляем локально
        const localUpdated = this.updateOrderStatusLocal(orderId, status);
        
        if (!this.useCloud) {
            return { success: localUpdated, localOnly: true };
        }
        
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateStatus',
                    orderId: orderId,
                    status: status
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`Cloud DB: Статус заказа #${orderId} обновлен в облаке`);
                return { success: true, cloudUpdated: true };
            } else {
                throw new Error(result.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Cloud DB: Ошибка обновления статуса в облаке:', error);
            return { 
                success: localUpdated, 
                localOnly: true,
                cloudError: error.message 
            };
        }
    }
    
    // Удаление заказа
    async deleteOrder(orderId) {
        // Удаляем локально
        const localDeleted = this.deleteOrderLocal(orderId);
        
        if (!this.useCloud) {
            return { success: localDeleted, localOnly: true };
        }
        
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deleteOrder',
                    orderId: orderId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`Cloud DB: Заказ #${orderId} удален из облака`);
                return { success: true, cloudDeleted: true };
            } else {
                throw new Error(result.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Cloud DB: Ошибка удаления из облака:', error);
            return { 
                success: localDeleted, 
                localOnly: true,
                cloudError: error.message 
            };
        }
    }
    
    // Синхронизация локальных и облачных данных
    async syncOrders() {
        console.log('Cloud DB: Начало синхронизации...');
        
        const localOrders = this.loadOrdersLocal();
        
        if (!this.useCloud) {
            console.log('Cloud DB: Облако отключено');
            return { 
                success: false, 
                reason: 'cloud_disabled' 
            };
        }
        
        try {
            // Загружаем из облака
            const response = await fetch(`${this.API_URL}?action=getOrders`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Ошибка сервера');
            }
            
            const cloudOrders = result.data || [];
            
            console.log(`Cloud DB: Облако: ${cloudOrders.length}, Локально: ${localOrders.length}`);
            
            // Загружаем локальные заказы в облако
            let uploaded = 0;
            for (const order of localOrders) {
                const existsInCloud = cloudOrders.some(cloudOrder => cloudOrder.id === order.id);
                if (!existsInCloud) {
                    try {
                        await this.saveOrder(order);
                        uploaded++;
                    } catch (error) {
                        console.warn('Не удалось загрузить заказ в облако:', error);
                    }
                }
            }
            
            // Загружаем обновленный список
            const finalResponse = await fetch(`${this.API_URL}?action=getOrders`);
            const finalResult = await finalResponse.json();
            const finalOrders = finalResult.data || [];
            
            // Сохраняем локально
            this.saveOrdersLocal(finalOrders);
            this.cachedOrders = finalOrders;
            
            return {
                success: true,
                message: `Синхронизация завершена. Загружено: ${uploaded}. Всего: ${finalOrders.length}`,
                uploaded: uploaded,
                total: finalOrders.length
            };
            
        } catch (error) {
            console.error('Cloud DB: Ошибка синхронизации:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ========== ЛОКАЛЬНЫЕ ФУНКЦИИ ==========
    
    saveOrderLocal(order) {
        let orders = this.loadOrdersLocal();
        const existingIndex = orders.findIndex(o => o.id === order.id);
        
        if (existingIndex >= 0) {
            orders[existingIndex] = order; // Обновляем существующий
        } else {
            orders.push(order); // Добавляем новый
        }
        
        localStorage.setItem('compyou_orders', JSON.stringify(orders));
        return true;
    }
    
    loadOrdersLocal() {
        const ordersJson = localStorage.getItem('compyou_orders');
        return ordersJson ? JSON.parse(ordersJson) : [];
    }
    
    saveOrdersLocal(orders) {
        localStorage.setItem('compyou_orders', JSON.stringify(orders));
        return true;
    }
    
    updateOrderStatusLocal(orderId, status) {
        let orders = this.loadOrdersLocal();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex >= 0) {
            orders[orderIndex].status = status;
            localStorage.setItem('compyou_orders', JSON.stringify(orders));
            return true;
        }
        
        return false;
    }
    
    deleteOrderLocal(orderId) {
        let orders = this.loadOrdersLocal();
        const initialLength = orders.length;
        
        orders = orders.filter(order => order.id !== orderId);
        
        if (orders.length < initialLength) {
            localStorage.setItem('compyou_orders', JSON.stringify(orders));
            return true;
        }
        
        return false;
    }
    
    // Объединение заказов из облака и локальных
    mergeOrders(cloudOrders, localOrders) {
        const orderMap = new Map();
        
        // Сначала добавляем облачные заказы
        cloudOrders.forEach(order => {
            orderMap.set(order.id, order);
        });
        
        // Затем добавляем локальные, которые отсутствуют в облаке
        localOrders.forEach(order => {
            if (!orderMap.has(order.id)) {
                orderMap.set(order.id, order);
            }
        });
        
        // Преобразуем Map обратно в массив и сортируем по ID (новые сверху)
        return Array.from(orderMap.values())
            .sort((a, b) => b.id - a.id);
    }
    
    // ========== УТИЛИТЫ ==========
    
    // Получить статистику
    getStats() {
        const localOrders = this.loadOrdersLocal();
        const totalOrders = this.cachedOrders.length || localOrders.length;
        
        const statusCounts = {};
        const localStatusCounts = {};
        
        // Считаем статусы из кэша или локальных
        const ordersToCount = this.cachedOrders.length > 0 ? this.cachedOrders : localOrders;
        
        ordersToCount.forEach(order => {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        
        // Считаем локальные статусы отдельно
        localOrders.forEach(order => {
            localStatusCounts[order.status] = (localStatusCounts[order.status] || 0) + 1;
        });
        
        return {
            totalOrders,
            localOrders: localOrders.length,
            cachedOrders: this.cachedOrders.length,
            useCloud: this.useCloud,
            statusCounts,
            localStatusCounts
        };
    }
    
    // Очистить все заказы (локальные и из облака)
    async clearAllOrders(confirm = false) {
        if (!confirm) {
            return { success: false, message: 'Требуется подтверждение' };
        }
        
        // Очищаем локальные
        localStorage.removeItem('compyou_orders');
        this.cachedOrders = [];
        
        if (this.useCloud) {
            try {
                // Загружаем все заказы из облака
                const cloudOrders = await this.loadAllOrders();
                
                // Удаляем каждый заказ из облака
                let deletedCount = 0;
                let deleteErrors = [];
                
                for (const order of cloudOrders) {
                    try {
                        const deleteResult = await this.deleteOrder(order.id);
                        if (deleteResult.success) {
                            deletedCount++;
                        }
                    } catch (error) {
                        deleteErrors.push(`Заказ #${order.id}: ${error.message}`);
                    }
                }
                
                return {
                    success: true,
                    message: `Удалено ${deletedCount} заказов`,
                    deletedCount,
                    errors: deleteErrors.length > 0 ? deleteErrors : null
                };
                
            } catch (error) {
                return {
                    success: false,
                    message: `Локальные заказы удалены, но ошибка облака: ${error.message}`
                };
            }
        }
        
        return {
            success: true,
            message: 'Локальные заказы удалены',
            localOnly: true
        };
    }
    
    // Экспорт заказов в файл
    exportToFile(format = 'json') {
        const orders = this.cachedOrders.length > 0 ? this.cachedOrders : this.loadOrdersLocal();
        
        if (orders.length === 0) {
            return null;
        }
        
        let content, mimeType, fileName;
        
        if (format === 'json') {
            content = JSON.stringify(orders, null, 2);
            mimeType = 'application/json';
            fileName = `compyou_orders_${new Date().toISOString().slice(0,10)}.json`;
        } else if (format === 'csv') {
            // Простой CSV экспорт
            const headers = ['ID', 'ФИО', 'Телефон', 'Email', 'Адрес', 'Тип', 'Сумма', 'Дата', 'Статус'];
            const rows = orders.map(order => [
                order.id,
                `"${order.fullName.replace(/"/g, '""')}"`,
                order.phone,
                `"${order.email.replace(/"/g, '""')}"`,
                `"${order.address.replace(/"/g, '""')}"`,
                order.orderType,
                order.total,
                order.date,
                order.status
            ].join(','));
            
            content = [headers.join(','), ...rows].join('\n');
            content = '\ufeff' + content; // UTF-8 BOM
            mimeType = 'text/csv;charset=utf-8';
            fileName = `compyou_orders_${new Date().toISOString().slice(0,10)}.csv`;
        }
        
        // Создание и скачивание файла
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return fileName;
    }
    
    // Импорт заказов из файла
    importFromFile(file, merge = true) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    let importedOrders;
                    
                    if (file.name.endsWith('.json')) {
                        importedOrders = JSON.parse(event.target.result);
                    } else if (file.name.endsWith('.csv')) {
                        // Простой CSV парсинг
                        const lines = event.target.result.split('\n');
                        const headers = lines[0].split(',').map(h => h.trim());
                        importedOrders = lines.slice(1)
                            .filter(line => line.trim())
                            .map(line => {
                                const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
                                return {
                                    id: parseInt(values[0]) || Date.now(),
                                    fullName: values[1] || '',
                                    phone: values[2] || '',
                                    email: values[3] || '',
                                    address: values[4] || '',
                                    orderType: values[5] || 'custom',
                                    total: parseFloat(values[6]) || 0,
                                    date: values[7] || new Date().toLocaleString('ru-RU'),
                                    status: values[8] || 'Новый'
                                };
                            });
                    }
                    
                    if (!Array.isArray(importedOrders)) {
                        throw new Error('Invalid file format');
                    }
                    
                    let currentOrders = this.loadOrdersLocal();
                    let result;
                    
                    if (merge) {
                        // Объединяем с существующими
                        result = this.mergeOrders(currentOrders, importedOrders);
                    } else {
                        // Заменяем существующие
                        result = importedOrders;
                    }
                    
                    // Сохраняем локально
                    this.saveOrdersLocal(result);
                    
                    resolve({
                        success: true,
                        imported: importedOrders.length,
                        total: result.length
                    });
                    
                } catch (error) {
                    reject(new Error(`Ошибка импорта: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }
}

// Создаем глобальный экземпляр CloudDB
window.cloudDB = new CloudDB();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Автоматически пытаемся загрузить из облака при загрузке админки
    if (window.location.pathname.includes('admin.html') || document.getElementById('adminPanelContainer')) {
        setTimeout(async () => {
            const stats = cloudDB.getStats();
            console.log('Cloud DB Статистика:', stats);
            
            // Если облако доступно, синхронизируем
            if (cloudDB.useCloud) {
                const cloudAvailable = await cloudDB.checkCloudAvailability();
                if (cloudAvailable) {
                    console.log('Cloud DB: Автосинхронизация...');
                    cloudDB.syncOrders().then(result => {
                        if (result.success) {
                            console.log('Cloud DB: Автосинхронизация завершена');
                            // Если есть функция обновления интерфейса
                            if (typeof loadOrders === 'function') {
                                loadOrders();
                            }
                        }
                    });
                }
            }
        }, 1000);
    }
});

