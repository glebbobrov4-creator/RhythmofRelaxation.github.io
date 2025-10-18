// sours/styles/reviews.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Система отзывов запущена');
    
    const reviewForm = document.getElementById('reviewForm');
    const reviewsContainer = document.getElementById('reviewsContainer');
    
    if (!reviewForm) {
        console.log('Форма отзывов не найдена');
        return;
    }
    
    // 🔧 НАСТРОЙКИ FORMSPREE 
    const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xeornwpg'; 
    
    // Загружаем сохраненные отзывы (только динамические)
    loadReviews();
    
    // Обработчик отправки формы
    reviewForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const service = document.getElementById('service').value;
        const rating = document.querySelector('input[name="rating"]:checked');
        const reviewText = document.getElementById('review').value.trim();
        
        console.log('📝 Данные формы:', { name, service, rating: rating?.value, reviewText });
        
        // Валидация
        if (!name) {
            showMessage('Пожалуйста, введите ваше имя', 'error');
            return;
        }
        
        if (!rating) {
            showMessage('Пожалуйста, поставьте оценку', 'error');
            return;
        }
        
        if (!reviewText) {
            showMessage('Пожалуйста, напишите отзыв', 'error');
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
            timestamp: Date.now()
        };
        
        console.log('💾 Сохраняем отзыв локально:', newReview);
        
        // Сохраняем локально
        saveReview(newReview);
        // Добавляем только ДИНАМИЧЕСКИЕ отзывы
        addDynamicReviewToPage(newReview);
        
        // 🔧 ОТПРАВЛЯЕМ ОТЗЫВ НА FORMSPREE
        console.log('📤 Отправляем на Formspree...');
        sendReviewToFormspree(newReview);
        
        showMessage('✅ Спасибо! Ваш отзыв отправлен.', 'success');
        resetForm();
    });
    
    // 🔧 ФУНКЦИЯ ОТПРАВКИ В FORMSPREE
    function sendReviewToFormspree(review) {
        // Формируем данные для отправки
        const data = {
            name: review.name,
            rating: `${review.rating}/5`,
            service: review.service || 'Не указана',
            review: review.text,
            date: review.date,
            source: 'Rhythm of Relaxation Website'
        };
        
        console.log('📨 Данные для Formspree:', data);
        
        // Отправляем запрос
        fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            console.log('📩 Response status:', response.status, response.statusText);
            if (response.ok) {
                console.log('✅ Отзыв успешно отправлен на Formspree');
                return response.json();
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .then(data => {
            console.log('✅ Formspree ответ:', data);
        })
        .catch(error => {
            console.error('❌ Ошибка отправки в Formspree:', error);
            console.log('💾 Отзыв сохранен локально, но не отправлен на email');
        });
    }

    // Вспомогательные функции
    function resetForm() {
        reviewForm.reset();
    }
    
    function saveReview(review) {
        let reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.unshift(review);
        localStorage.setItem('massageReviews', JSON.stringify(reviews));
        console.log('💾 Отзыв сохранен локально. Всего отзывов:', reviews.length);
    }
    
    function loadReviews() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        console.log('📂 Загружаем динамические отзывы из localStorage:', reviews.length);
        
        // Добавляем только динамические отзывы
        reviews.forEach(review => addDynamicReviewToPage(review));
    }
    
    // Добавляем только ДИНАМИЧЕСКИЕ отзывы (не трогаем статические)
    function addDynamicReviewToPage(review) {
        if (!reviewsContainer) return;
        
        // Создаем контейнер для динамических отзывов если его нет
        let dynamicContainer = document.getElementById('dynamicReviewsContainer');
        if (!dynamicContainer) {
            dynamicContainer = document.createElement('div');
            dynamicContainer.id = 'dynamicReviewsContainer';
            dynamicContainer.className = 'row';
            // Вставляем после статических отзывов
            reviewsContainer.appendChild(dynamicContainer);
        }
        
        const reviewHTML = `
            <div class="col-lg-6 mb-4" data-review-id="${review.id}">
                <div class="real-review-card">
                    <div class="real-review-header">
                        <div class="real-client-avatar">${review.name.charAt(0).toUpperCase()}</div>
                        <div class="client-info">
                            <div class="client-name">${review.name}</div>
                            <div class="review-date">${review.date}</div>
                        </div>
                    </div>
                    <div class="real-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    <p class="real-review-text">${review.text}</p>
                    ${review.service ? `<span class="real-service-type">${review.service}</span>` : ''}
                </div>
            </div>
        `;
        dynamicContainer.insertAdjacentHTML('beforeend', reviewHTML);
    }
    
    function showMessage(message, type) {
        // Удаляем предыдущие сообщения
        const existingAlerts = document.querySelectorAll('.alert-message');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = `alert-message alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mt-3`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const form = document.querySelector('.review-form-card');
        if (form) {
            form.appendChild(alert);
        }
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
    
    // Функция для ручного сброса формы (если нужна в HTML)
    window.resetForm = resetForm;
    
    console.log('✅ Система отзывов готова!');
    console.log('📧 Formspree endpoint:', FORMSPREE_ENDPOINT);
});
