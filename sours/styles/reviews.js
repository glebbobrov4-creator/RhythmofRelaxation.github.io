// sours/reviews.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Система отзывов запущена');
    
    const reviewForm = document.getElementById('reviewForm');
    const reviewsContainer = document.getElementById('reviewsContainer');
    
    if (!reviewForm) {
        console.log('Форма отзывов не найдена');
        return;
    }
    
    let editingReviewId = null;
    const isAdmin = checkAdminStatus();
    
    // Загружаем сохраненные отзывы
    loadReviews();
    
    // Обработчик отправки формы
    reviewForm.addEventListener('submit', function(e) {
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
            // Режим редактирования (только для админа)
            updateReview(editingReviewId, name, service, rating.value, reviewText);
        } else {
            // Режим добавления (для всех)
            const newReview = {
                id: Date.now(),
                name: name,
                service: service,
                rating: parseInt(rating.value),
                text: reviewText,
                date: new Date().toLocaleDateString('ru-RU'),
                timestamp: Date.now(),
                userToken: generateUserToken()
            };
            
            // Сохраняем локально
            saveReview(newReview);
            addReviewToPage(newReview);
            showSuccessMessage('✅ Отзыв сохранен!');
        }
        
        resetForm();
    });
    
    // 🔧 Функция экспорта в CSV для Google Sheets
    window.exportReviewsToCSV = function() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        
        if (reviews.length === 0) {
            alert('Нет отзывов для экспорта');
            return;
        }
        
        // Создаем CSV заголовки
        let csv = 'Дата,Имя,Услуга,Оценка,Отзыв\n';
        
        // Добавляем данные
        reviews.forEach(review => {
            const date = review.date;
            const name = `"${review.name.replace(/"/g, '""')}"`;
            const service = `"${(review.service || 'Не указано').replace(/"/g, '""')}"`;
            const rating = review.rating;
            const text = `"${review.text.replace(/"/g, '""')}"`;
            
            csv += `${date},${name},${service},${rating},${text}\n`;
        });
        
        // Создаем и скачиваем файл
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `отзывы_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccessMessage(`📊 Экспортировано ${reviews.length} отзывов в CSV файл!`);
        
        // Инструкция для импорта в Google Sheets
        setTimeout(() => {
            if (confirm('Хотите узнать как импортировать CSV в Google Sheets?')) {
                alert('Инструкция по импорту:\n\n1. Откройте Google Sheets\n2. Файл → Импорт → Загрузить\n3. Выберите скачанный CSV файл\n4. Выберите "Заменить электронную таблицу"\n5. Нажмите "Импорт данных"');
            }
        }, 1000);
    };
    
    // 🔧 Функция быстрого копирования в буфер обмена
    window.copyReviewsToClipboard = function() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        
        if (reviews.length === 0) {
            alert('Нет отзывов для копирования');
            return;
        }
        
        let text = 'Дата\tИмя\tУслуга\tОценка\tОтзыв\n';
        
        reviews.forEach(review => {
            text += `${review.date}\t${review.name}\t${review.service || 'Не указано'}\t${review.rating}\t${review.text}\n`;
        });
        
        navigator.clipboard.writeText(text).then(() => {
            showSuccessMessage('📋 Отзывы скопированы в буфер обмена!');
        }).catch(err => {
            alert('Ошибка копирования: ' + err);
        });
    };

    // Вспомогательные функции
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
        const password = prompt('Введите пароль для доступа к управлению отзывами:');
        if (password === 'admin123') {
            localStorage.setItem('isAdmin', 'true');
            showSuccessMessage('Режим администратора активирован!');
            refreshReviewsDisplay();
            return true;
        } else {
            alert('Неверный пароль!');
            return false;
        }
    };
    
    window.logoutAdmin = function() {
        localStorage.removeItem('isAdmin');
        showSuccessMessage('Режим администратора деактивирован');
        refreshReviewsDisplay();
    };
    
    function resetForm() {
        reviewForm.reset();
        editingReviewId = null;
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Отправить отзыв';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');
        }
    }
    
    function updateReview(reviewId, name, service, rating, text) {
        if (!isAdmin) return;
        
        let reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const reviewIndex = reviews.findIndex(review => review.id === reviewId);
        
        if (reviewIndex !== -1) {
            reviews[reviewIndex] = {
                ...reviews[reviewIndex],
                name: name,
                service: service,
                rating: parseInt(rating),
                text: text,
                date: new Date().toLocaleDateString('ru-RU'),
                timestamp: Date.now()
            };
            
            localStorage.setItem('massageReviews', JSON.stringify(reviews));
            refreshReviewsDisplay();
            showSuccessMessage('Отзыв успешно обновлен!');
        }
    }
    
    function deleteReview(reviewId) {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const review = reviews.find(r => r.id === reviewId);
        const currentUserToken = getCurrentUserToken();
        
        if (isAdmin || (review && review.userToken === currentUserToken)) {
            if (confirm('Вы уверены, что хотите удалить этот отзыв?')) {
                let updatedReviews = reviews.filter(review => review.id !== reviewId);
                localStorage.setItem('massageReviews', JSON.stringify(updatedReviews));
                refreshReviewsDisplay();
                showSuccessMessage('Отзыв удален!');
            }
        } else {
            alert('Вы можете удалять только свои отзывы!');
        }
    }
    
    function editReview(reviewId) {
        if (!isAdmin) {
            alert('Только администратор может редактировать отзывы!');
            return;
        }
        
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const review = reviews.find(r => r.id === reviewId);
        
        if (review) {
            document.getElementById('name').value = review.name;
            document.getElementById('service').value = review.service;
            document.getElementById('review').value = review.text;
            
            const ratingInput = document.querySelector(`input[name="rating"][value="${review.rating}"]`);
            if (ratingInput) ratingInput.checked = true;
            
            editingReviewId = reviewId;
            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Обновить отзыв';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-warning');
            
            document.querySelector('.add-review-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    }
    
    function refreshReviewsDisplay() {
        if (reviewsContainer) {
            reviewsContainer.innerHTML = '';
            loadReviews();
        }
    }
    
    function saveReview(review) {
        let reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.unshift(review);
        localStorage.setItem('massageReviews', JSON.stringify(reviews));
    }
    
    function loadReviews() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.forEach(review => addReviewToPage(review));
        updateAdminPanel();
        
        // Показываем статистику
        console.log(`📊 Загружено ${reviews.length} отзывов`);
    }
    
    function addReviewToPage(review) {
        if (!reviewsContainer) return;
        
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
            const addReviewSection = document.querySelector('.add-review-section');
            if (addReviewSection) {
                addReviewSection.prepend(adminPanel);
            }
        }
        
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        
        if (isAdmin) {
            adminPanel.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Режим администратора</strong>
                            <small class="ms-2">(${reviews.length} отзывов)</small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-success me-2" onclick="exportReviewsToCSV()" title="Экспорт в CSV">
                                📥 CSV
                            </button>
                            <button class="btn btn-sm btn-outline-secondary me-2" onclick="copyReviewsToClipboard()" title="Копировать в буфер">
                                📋
                            </button>
                            <button class="btn btn-sm btn-outline-warning me-2" onclick="clearAllReviews()" title="Удалить все">
                                🗑️ Все
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="logoutAdmin()" title="Выйти">
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            adminPanel.innerHTML = `
                <div class="text-center mb-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="loginAsAdmin()">
                        Войти как администратор
                    </button>
                    ${reviews.length > 0 ? `<small class="d-block mt-1">${reviews.length} отзывов сохранено</small>` : ''}
                </div>
            `;
        }
    }
    
    function showSuccessMessage(message) {
        // Удаляем предыдущие сообщения
        const existingAlerts = document.querySelectorAll('.alert-success');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = 'alert-success';
        alert.textContent = message;
        
        const form = document.querySelector('.review-form-card');
        if (form) {
            form.insertBefore(alert, form.firstChild);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }
    
    function showErrorMessage(message) {
        const alert = document.createElement('div');
        alert.style.cssText = 'background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
        alert.textContent = message;
        
        const form = document.querySelector('.review-form-card');
        if (form) {
            form.insertBefore(alert, form.firstChild);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }
    
    window.clearAllReviews = function() {
        if (!isAdmin) {
            alert('Только администратор может удалять все отзывы!');
            return;
        }
        
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        if (reviews.length === 0) {
            alert('Нет отзывов для удаления');
            return;
        }
        
        if (confirm(`ВНИМАНИЕ! Вы уверены, что хотите удалить ВСЕ отзывы (${reviews.length} шт.)? Это действие нельзя отменить.`)) {
            localStorage.removeItem('massageReviews');
            refreshReviewsDisplay();
            showSuccessMessage('Все отзывы удалены!');
        }
    };
    
    // Добавляем функции в глобальную область видимости
    window.editReview = editReview;
    window.deleteReview = deleteReview;
    window.loginAsAdmin = loginAsAdmin;
    window.logoutAdmin = logoutAdmin;
    window.clearAllReviews = clearAllReviews;
    window.exportReviewsToCSV = exportReviewsToCSV;
    window.copyReviewsToClipboard = copyReviewsToClipboard;
    
    // Инициализация
    updateAdminPanel();
    
    console.log('✅ Система отзывов с экспортом в CSV готова!');
    console.log('Для экспорта отзывов войдите как администратор');
});
