// sours/reviews.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('JS файл отзывов подключен!');
    
    const reviewForm = document.getElementById('reviewForm');
    const reviewsContainer = document.getElementById('reviewsContainer');
    
    // 🔧 НАСТРОЙКИ GOOGLE FORMS
    const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd7vX9PMB43_ZgnZ3b-ul-rVG15oKQwL_ugkyGW7YRQMPg/formResponse';
    const FIELD_IDS = {
        name: 'entry.2005620554',      // Поле "Ваше имя"
        service: 'entry.1166974658',   // Поле "Услуга"  
        rating: 'entry.839337160',     // Поле "Оценка"
        text: 'entry.1065046570'       // Поле "Ваш отзыв"
    };
    
    if (!reviewForm) {
        console.log('Форма отзывов не найдена');
        return;
    }
    
    let editingReviewId = null;
    const isAdmin = checkAdminStatus();
    
    // Загружаем сохраненные отзывы
    loadReviews();
    
    // Обработчик отправки формы
    reviewForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const service = document.getElementById('service').value;
        const rating = document.querySelector('input[name="rating"]:checked');
        const reviewText = document.getElementById('review').value.trim();
        
        // Валидация
        if (!name) {
            showErrorMessage('Пожалуйста, введите ваше имя');
            return;
        }
        
        if (!rating) {
            showErrorMessage('Пожалуйста, поставьте оценку');
            return;
        }
        
        if (!reviewText) {
            showErrorMessage('Пожалуйста, напишите отзыв');
            return;
        }
        
        if (editingReviewId && isAdmin) {
            updateReview(editingReviewId, name, service, rating.value, reviewText);
        } else {
            const newReview = {
                id: Date.now(),
                name: name,
                service: service,
                rating: parseInt(rating.value),
                text: reviewText,
                date: new Date().toLocaleDateString('ru-RU'),
                timestamp: Date.now(),
                userToken: generateUserToken(),
                synced: false
            };
            
            // Сохраняем локально
            saveReviewToLocal(newReview);
            addReviewToPage(newReview);
            
            // Пытаемся отправить в Google Forms
            try {
                await sendToGoogleForms(name, service, rating.value, reviewText);
                newReview.synced = true;
                updateReviewSyncStatus(newReview.id, true);
                showSuccessMessage('✅ Отзыв отправлен! Будет виден в Google Forms');
            } catch (error) {
                console.log('Не удалось отправить в Google Forms:', error);
                showSuccessMessage('📱 Отзыв сохранен локально!');
            }
        }
        
        resetForm();
    });
    
    // 🔧 Функция отправки в Google Forms
    async function sendToGoogleForms(name, service, rating, text) {
        const formData = new URLSearchParams();
        
        // Заполняем данные формы
        formData.append(FIELD_IDS.name, name);
        formData.append(FIELD_IDS.service, service);
        formData.append(FIELD_IDS.rating, rating);
        formData.append(FIELD_IDS.text, text);
        
        // Отправляем запрос
        const response = await fetch(GOOGLE_FORM_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        return Promise.resolve();
    }
    
    // 🔧 Синхронизация неотправленных отзывов
    function syncPendingReviews() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const pendingReviews = reviews.filter(review => !review.synced);
        
        pendingReviews.forEach(async (review) => {
            try {
                await sendToGoogleForms(review.name, review.service, review.rating.toString(), review.text);
                updateReviewSyncStatus(review.id, true);
                console.log('Отзыв синхронизирован:', review.id);
            } catch (error) {
                console.log('Ошибка синхронизации:', review.id);
            }
        });
    }
    
    // Запускаем синхронизацию каждые 30 секунд
    setInterval(syncPendingReviews, 30000);
    
    // Остальные функции остаются без изменений
    function updateReviewSyncStatus(reviewId, synced) {
        let reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const reviewIndex = reviews.findIndex(review => review.id === reviewId);
        
        if (reviewIndex !== -1) {
            reviews[reviewIndex].synced = synced;
            localStorage.setItem('massageReviews', JSON.stringify(reviews));
        }
    }

    function generateUserToken() {
        let token = localStorage.getItem('userToken');
        if (!token) {
            token = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userToken', token);
        }
        return token;
    }
    
    function getCurrentUserToken() {
        return localStorage.getItem('userToken');
    }
    
    function checkAdminStatus() {
        return localStorage.getItem('isAdmin') === 'true';
    }
    
    window.loginAsAdmin = function() {
        const password = prompt
        if (password === 'Gleb2404') {
            localStorage.setItem('isAdmin', 'true');
            showSuccessMessage('Режим администратора активирован!');
            refreshReviewsDisplay();
            return true;
        } else {
            alert('Неверный пароль!');
            return false;
        }
    };
    
    // ... остальные функции (logoutAdmin, resetForm, updateReview, deleteReview, editReview, etc.)
    // Копируйте их из предыдущей версии без изменений
    
    function saveReviewToLocal(review) {
        let reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.unshift(review);
        localStorage.setItem('massageReviews', JSON.stringify(reviews));
    }
    
    function loadReviews() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.forEach(review => addReviewToPage(review));
        updateAdminPanel();
    }
    
    function addReviewToPage(review) {
        const currentUserToken = getCurrentUserToken();
        const canDelete = isAdmin || review.userToken === currentUserToken;
        const canEdit = isAdmin;
        
        const reviewHTML = `
            <div class="col-lg-6 mb-4" data-review-id="${review.id}">
                <div class="real-review-card">
                    <div class="real-review-header">
                        <div class="real-client-avatar">${review.name.charAt(0).toUpperCase()}</div>
                        <div class="client-info">
                            <div class="client-name">${review.name}</div>
                            <div class="review-date">${review.date}</div>
                        </div>
                        <div class="review-actions">
                            ${canEdit ? `
                                <button class="btn-edit" onclick="editReview(${review.id})" title="Редактировать">
                                    ✏️
                                </button>
                            ` : ''}
                            ${canDelete ? `
                                <button class="btn-delete" onclick="deleteReview(${review.id})" title="Удалить">
                                    🗑️
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="real-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    <p class="real-review-text">${review.text}</p>
                    ${review.service ? `<span class="real-service-type">${review.service}</span>` : ''}
                    ${review.userToken === currentUserToken ? '<small class="text-muted d-block mt-2">Ваш отзыв</small>' : ''}
                    ${!review.synced ? '<small class="text-warning d-block mt-1">⏳ Ожидает синхронизации</small>' : ''}
                </div>
            </div>
        `;
        reviewsContainer.insertAdjacentHTML('beforeend', reviewHTML);
    }
    
    function updateAdminPanel() {
        let adminPanel = document.getElementById('adminPanel');
        if (!adminPanel) {
            adminPanel = document.createElement('div');
            adminPanel.id = 'adminPanel';
            adminPanel.className = 'admin-panel';
            document.querySelector('.add-review-section').prepend(adminPanel);
        }
        
        if (isAdmin) {
            adminPanel.innerHTML = `
                <div class="alert alert-info">
                    <strong>Режим администратора активирован</strong>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="logoutAdmin()">Выйти</button>
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="clearAllReviews()">Удалить все отзывы</button>
                </div>
            `;
        } else {
            adminPanel.innerHTML = `
                <div class="text-center mb-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="loginAsAdmin()">
                        Войти как администратор
                    </button>
                </div>
            `;
        }
    }
    
    function showSuccessMessage(message) {
        const existingAlerts = document.querySelectorAll('.alert-success');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = 'alert-success';
        alert.textContent = message;
        
        const form = document.querySelector('.review-form-card');
        form.insertBefore(alert, form.firstChild);
        
        setTimeout(() => alert.remove(), 5000);
    }
    
    function showErrorMessage(message) {
        const alert = document.createElement('div');
        alert.style.cssText = 'background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
        alert.textContent = message;
        
        const form = document.querySelector('.review-form-card');
        form.insertBefore(alert, form.firstChild);
        
        setTimeout(() => alert.remove(), 5000);
    }
    
    // Добавляем функции в глобальную область видимости
    window.editReview = editReview;
    window.deleteReview = deleteReview;
    window.loginAsAdmin = loginAsAdmin;
    window.logoutAdmin = logoutAdmin;
    window.clearAllReviews = clearAllReviews;
    
    // Инициализация
    updateAdminPanel();
    console.log('✅ Система отзывов с Google Forms готова!');
});
