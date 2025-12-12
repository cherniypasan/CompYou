// cloud-db.js - Облачная база данных для заказов CompYou
// Использует Google Sheets как простую облачную БД

class CloudDB {
    constructor() {
        // URL вашего Google Apps Script веб-приложения
        // ВАЖНО: Замените на ваш URL после настройки
        this.API_URL = 'https://script.google.com/macros/s/AKfycbxYD-SE50fIFSWoYJHHRhl1yw38TtffNQxCI715cH3q98gqD3ZKnDMH10EsPpszbpNN3g/exec';
        
        // Флаг для использования облака
        this.useCloud = false;
        
        // Кэш заказов
        this.cachedOrders = [];
        
        // Инициализация
        this.init();
    }
    
    init() {
        // Проверяем, указан ли URL API
        if (this.API_URL && this.API_URL.startsWith('https://script.google.com')) {
            this.useCloud = true;
            console.log('Cloud DB: Облачное хранилище активировано');
            console.log('Cloud DB URL:', this.API_URL);
            
            // Тестируем подключение
            this.testConnection().then(result => {
                if (result.success) {
                    console.log('Cloud DB: Подключение успешно:', result.message);
                } else {
                    console.warn('Cloud DB: Подключение не удалось:', result.message);
                    this.useCloud = false;
                }
            });
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
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
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
    
    // Проверка подключения к облаку
    async testConnection() {
        if (!this.useCloud) {
            return { 
                success: false, 
                message: 'Облачное хранилище отключено' 
            };
        }
        
        try {
            const response = await fetch(`${this.API_URL}?action=ping&t=${Date.now()}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return { 
                    success: result.success || true, 
                    message: result.message || 'Подключение к облаку установлено' 
                };
            }
            return { 
                success: false, 
                message: `Ошибка HTTP: ${response.status}` 
            };
        } catch (error) {
            return { 
                success: false, 
                message: `Ошибка подключения: ${error.message}` 
            };
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
                    order: order,
                    timestamp: new Date().toISOString()
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
            console.error('Cloud DB: Ошибка сохранения в облако:', error.message);
            return { 
                success: true, 
                localOnly: true, 
                cloudError: error.message 
            };
        }
    }
    
    // Загрузка всех заказов (из облака + локальные) - ОБНОВЛЕННЫЙ МЕТОД
    async loadAllOrders() {
        const localOrders = this.loadOrdersLocal();
        
        if (!this.useCloud) {
            console.log('Cloud DB: Загружены только локальные заказы:', localOrders.length);
            return localOrders;
        }
        
        try {
            // Используем JSONP для обхода CORS проблем
            console.log('Cloud DB: Загружаем заказы из облака через JSONP...');
            
            // Создаем уникальное имя callback функции
            const callbackName = 'compyou_callback_' + Date.now();
            
            return new Promise((resolve, reject) => {
                // Сохраняем ссылку на this
                const self = this;
                
                // Создаем callback функцию
                window[callbackName] = function(response) {
                    // Очищаем callback
                    delete window[callbackName];
                    
                    if (response && response.success) {
                        const cloudOrders = response.data || [];
                        console.log(`Cloud DB: Загружено ${cloudOrders.length} заказов из облака`);
                        
                        // Объединяем заказы
                        const mergedOrders = self.mergeOrders(cloudOrders, localOrders);
                        
                        // Сохраняем локально
                        self.saveOrdersLocal(mergedOrders);
                        
                        self.cachedOrders = mergedOrders;
                        resolve(mergedOrders);
                    } else {
                        console.warn('Cloud DB: Ошибка загрузки из облака:', response ? response.error : 'Unknown error');
                        resolve(localOrders);
                    }
                };
                
                // Создаем script элемент для JSONP
                const script = document.createElement('script');
                script.src = `${self.API_URL}?action=getOrders&callback=${callbackName}&t=${Date.now()}`;
                
                // Обработка ошибок
                script.onerror = function() {
                    delete window[callbackName];
                    console.warn('Cloud DB: JSONP запрос не удался');
                    resolve(localOrders);
                };
                
                // Добавляем script на страницу
                document.head.appendChild(script);
                
                // Автоматически удаляем script через 10 секунд
                setTimeout(() => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                }, 10000);
            });
            
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
                    status: status,
                    timestamp: new Date().toISOString()
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
                    orderId: orderId,
                    timestamp: new Date().toISOString()
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
    
    // Синхронизация локальных и облачных данных - ОБНОВЛЕННЫЙ МЕТОД
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
            // Загружаем из облака через JSONP
            const cloudOrders = await this.loadAllOrders();
            
            console.log(`Cloud DB: Облако: ${cloudOrders.length}, Локально: ${localOrders.length}`);
            
            // Загружаем локальные заказы в облако
            let uploaded = 0;
            for (const order of localOrders) {
                const existsInCloud = cloudOrders.some(cloudOrder => cloudOrder.id === order.id);
                if (!existsInCloud) {
                    try {
                        await this.saveOrder(order);
                        uploaded++;
                        await new Promise(resolve => setTimeout(resolve, 100)); // Задержка между запросами
                    } catch (error) {
                        console.warn('Не удалось загрузить заказ в облако:', error);
                    }
                }
            }
            
            // Загружаем обновленный список
            const finalOrders = await this.loadAllOrders();
            
            console.log('Cloud DB: Синхронизация завершена');
            
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
                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'clearAll',
                        confirm: true
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        return {
                            success: true,
                            message: result.message || 'Все заказы очищены',
                            cloudCleared: true
                        };
                    }
                }
                
                return {
                    success: true,
                    message: 'Локальные заказы удалены, облачные остались'
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
                `"${(order.fullName || '').replace(/"/g, '""')}"`,
                order.phone || '',
                `"${(order.email || '').replace(/"/g, '""')}"`,
                `"${(order.address || '').replace(/"/g, '""')}"`,
                order.orderType || 'custom',
                order.total || 0,
                order.date || '',
                order.status || 'Новый'
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
}

// Создаем глобальный экземпляр CloudDB
window.cloudDB = new CloudDB();

