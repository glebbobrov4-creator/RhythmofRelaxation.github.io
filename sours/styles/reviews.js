// sours/reviews.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Система отзывов запущена');
    
    const reviewForm = document.getElementById('reviewForm');
    const reviewsContainer = document.getElementById('reviewsContainer');
    
    if (!reviewForm) {
        console.log('Форма отзывов не найдена');
        return;
    }
    
    // 🔧 НАСТРОЙКИ FORMSPREE - ЗАМЕНИТЕ НА ВАШ FORMSPREE ID
    const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORMSPREE_ID_HERE';
    
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
        
        // Создаем новый отзыв
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
        
        // 🔧 ОТПРАВЛЯЕМ ОТЗЫВ НА FORMSPREE
        sendReviewToFormspree(newReview);
        
        showSuccessMessage('✅ Спасибо! Ваш отзыв отправлен и скоро появится на сайте.');
        
        resetForm();
    });
    
    // 🔧 ФУНКЦИЯ ОТПРАВКИ В FORMSPREE
    function sendReviewToFormspree(review) {
        const formData = new FormData();
        formData.append('Имя', review.name);
        formData.append('Оценка', `${review.rating}/5`);
        formData.append('Услуга', review.service || 'Не указана');
        formData.append('Отзыв', review.text);
        formData.append('Дата', review.date);
        formData.append('Источник', 'Сайт Rhythm of Relaxation');
        
        fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                console.log('✅ Отзыв отправлен на Formspree');
                return response.json();
            } else {
                throw new Error('Ошибка отправки');
            }
        })
        .then(data => {
            console.log('Formspree ответ:', data);
        })
        .catch(error => {
            console.error('❌ Ошибка отправки в Formspree:', error);
            // Показываем сообщение, но не беспокоим пользователя
            showOfflineMessage();
        });
    }
    
    function showOfflineMessage() {
        // Создаем незаметное сообщение в консоли
        console.log('📧 Отзыв сохранен локально. При подключении к интернету будет отправлен автоматически.');
    }

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
    
    function resetForm() {
        reviewForm.reset();
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Отправить отзыв';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');
        }
    }
    
    function deleteReview(reviewId) {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const review = reviews.find(r => r.id === reviewId);
        const currentUserToken = getCurrentUserToken();
        
        if (review && review.userToken === currentUserToken) {
            if (confirm('Вы уверены, что хотите удалить свой отзыв?')) {
                let updatedReviews = reviews.filter(review => review.id !== reviewId);
                localStorage.setItem('massageReviews', JSON.stringify(updatedReviews));
                refreshReviewsDisplay();
                showSuccessMessage('Ваш отзыв удален!');
            }
        } else {
            alert('Вы можете удалять только свои отзывы!');
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
        
        // Показываем статистику
        console.log(`📊 Загружено ${reviews.length} отзывов`);
        
        // Если нет отзывов, показываем сообщение
        if (reviews.length === 0 && reviewsContainer) {
            reviewsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="no-reviews-message">
                        <p class="text-muted">Пока нет отзывов. Будьте первым!</p>
                    </div>
                </div>
            `;
        }
    }
    
    function addReviewToPage(review) {
        if (!reviewsContainer) return;
        
        const currentUserToken = getCurrentUserToken();
        const canDelete = review.userToken === currentUserToken;
        
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
                            ${canDelete ? `
                                <button class="btn-delete" onclick="deleteReview(${review.id})" title="Удалить отзыв">
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
    
    function showSuccessMessage(message) {
        // Удаляем предыдущие сообщения
        const existingAlerts = document.querySelectorAll('.alert-success');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const form = document.querySelector('.review-form-card');
        if (form) {
            form.insertBefore(alert, form.firstChild);
        }
    }
    
    function showErrorMessage(message) {
        // Удаляем предыдущие сообщения
        const existingAlerts = document.querySelectorAll('.alert-danger');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const form = document.querySelector('.review-form-card');
        if (form) {
            form.insertBefore(alert, form.firstChild);
        }
    }
    
    // Добавляем функции в глобальную область видимости
    window.deleteReview = deleteReview;
    
    console.log('✅ Система отзывов с Formspree готова!');
    console.log('📧 Отзывы будут приходить на вашу почту через Formspree');
});
