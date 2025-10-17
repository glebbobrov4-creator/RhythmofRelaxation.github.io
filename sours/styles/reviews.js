// sours/reviews.js
document.addEventListener('DOMContentLoaded', function () {
    console.log('JS файл отзывов подключен!');

    const reviewForm = document.getElementById('reviewForm');
    const reviewsContainer = document.getElementById('reviewsContainer');

    if (!reviewForm) {
        console.log('Форма отзывов не найдена');
        return;
    }

    let editingReviewId = null;
    const isAdmin = checkAdminStatus(); // Проверяем, админ ли

    // Загружаем сохраненные отзывы
    loadReviews();

    // Обработчик отправки формы
    reviewForm.addEventListener('submit', function (e) {
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
                userToken: generateUserToken() // Добавляем метку пользователя
            };
            saveReview(newReview);
            addReviewToPage(newReview);
            showSuccessMessage('Спасибо за ваш отзыв!');
        }

        // Сбрасываем форму
        resetForm();
    });

    // Генерация уникального токена пользователя
    function generateUserToken() {
        let token = localStorage.getItem('userToken');
        if (!token) {
            token = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userToken', token);
        }
        return token;
    }

    // Получение текущего токена пользователя
    function getCurrentUserToken() {
        return localStorage.getItem('userToken');
    }

    // Проверка прав администратора (по паролю)
    function checkAdminStatus() {
        return localStorage.getItem('isAdmin') === 'true';
    }

    // Функция входа в режим администратора
    window.loginAsAdmin = function () {
        const password = prompt('Введите пароль для доступа к управлению отзывами:');
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

    // Выход из режима администратора
    window.logoutAdmin = function () {
        localStorage.removeItem('isAdmin');
        showSuccessMessage('Режим администратора деактивирован');
        refreshReviewsDisplay();
    };

    // Функция сброса формы
    function resetForm() {
        reviewForm.reset();
        editingReviewId = null;
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Отправить отзыв';
        submitBtn.classList.remove('btn-warning');
        submitBtn.classList.add('btn-primary');
    }

    // Функция обновления отзыва (только для админа)
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

    // Функция удаления отзыва
    function deleteReview(reviewId) {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const review = reviews.find(r => r.id === reviewId);
        const currentUserToken = getCurrentUserToken();

        // Проверяем права: админ ИЛИ автор отзыва
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

    // Функция редактирования отзыва
    function editReview(reviewId) {
        if (!isAdmin) {
            alert('Только администратор может редактировать отзывы!');
            return;
        }

        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        const review = reviews.find(r => r.id === reviewId);

        if (review) {
            // Заполняем форму данными отзыва
            document.getElementById('name').value = review.name;
            document.getElementById('service').value = review.service;
            document.getElementById('review').value = review.text;

            // Устанавливаем рейтинг
            const ratingInput = document.querySelector(`input[name="rating"][value="${review.rating}"]`);
            if (ratingInput) ratingInput.checked = true;

            // Меняем режим формы
            editingReviewId = reviewId;
            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Обновить отзыв';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-warning');

            // Прокручиваем к форме
            document.querySelector('.add-review-section').scrollIntoView({
                behavior: 'smooth'
            });
        }
    }

    // Функция обновления отображения отзывов
    function refreshReviewsDisplay() {
        reviewsContainer.innerHTML = '';
        loadReviews();
    }

    function saveReview(review) {
        let reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.unshift(review);
        localStorage.setItem('massageReviews', JSON.stringify(reviews));
    }

    function loadReviews() {
        const reviews = JSON.parse(localStorage.getItem('massageReviews') || '[]');
        reviews.forEach(review => addReviewToPage(review));

        // Показываем/скрываем панель админа
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
                </div>
            </div>
        `;
        reviewsContainer.insertAdjacentHTML('beforeend', reviewHTML);
    }

    // Обновление панели администратора
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

    // Функция для полной очистки всех отзывов (только для админа)
    window.clearAllReviews = function () {
        if (!isAdmin) {
            alert('Только администратор может удалять все отзывы!');
            return;
        }

        if (confirm('ВНИМАНИЕ! Вы уверены, что хотите удалить ВСЕ отзывы? Это действие нельзя отменить.')) {
            localStorage.removeItem('massageReviews');
            refreshReviewsDisplay();
            showSuccessMessage('Все отзывы удалены!');
        }
    };

    // Инициализация
    updateAdminPanel();
    console.log('Система отзывов готова!');
});