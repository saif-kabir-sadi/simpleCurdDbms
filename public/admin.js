    // Make user admin by email
    const makeAdminForm = document.getElementById('makeAdminForm');
    if (makeAdminForm) {
        makeAdminForm.onsubmit = async function (e) {
            e.preventDefault();
            const email = makeAdminForm.adminEmail.value;
            try {
                const res = await fetch('/api/make-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                alert(data.message);
                makeAdminForm.reset();
            } catch (err) {
                alert('Failed to make user admin.');
            }
        };
    }
    // Admin user creation form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.onsubmit = async function (e) {
            e.preventDefault();
            const name = signupForm.signupName.value;
            const email = signupForm.signupEmail.value;
            const password = signupForm.signupPassword.value;
            const role = signupForm.signupRole.value;
            try {
                const res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                const data = await res.json();
                alert(data.message);
                signupForm.reset();
            } catch (err) {
                alert('Failed to create user.');
            }
        };
    }
// admin.js - Handles dynamic CRUD for news cards

document.addEventListener('DOMContentLoaded', function () {
    // --- LOGIN/AUTH CHECK ---
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
        alert('You must be logged in as admin to access this page.');
        window.location.href = 'login.html';
        return;
    }

    const newsForm = document.getElementById('newsForm');
    const newsList = document.getElementById('newsList');
    const resetBtn = document.getElementById('resetBtn');
    const newsIdInput = document.getElementById('newsId');
    const searchIdInput = document.getElementById('searchId');
    const searchBtn = document.getElementById('searchBtn');

    let newsData = [];

    // Fetch all news from backend
    async function fetchNews() {
        try {
            const res = await fetch('/api/news');
            newsData = await res.json();
            console.log('Fetched newsData:', newsData);
            renderNews();
        } catch (err) {
            console.error('Failed to fetch news:', err);
            newsList.innerHTML = '<p style="color:red">Failed to load news.</p>';
        }
    }

    // Render all news cards and table
    function renderNews() {
        // Only render table, cards removed for clarity
        const table = document.getElementById('postsTable');
        if (table) {
            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';
            if (!Array.isArray(newsData) || newsData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">No news found.</td></tr>';
                console.warn('No news data to render:', newsData);
                return;
            }
            newsData.forEach(news => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style='border:1px solid #ccc;padding:8px;'>${news.id}</td>
                    <td style='border:1px solid #ccc;padding:8px;'>${news.title}</td>
                    <td style='border:1px solid #ccc;padding:8px;'>${news.location}</td>
                    <td style='border:1px solid #ccc;padding:8px;'>${news.date}</td>
                    <td style='border:1px solid #ccc;padding:8px;'>${news.category || ''}</td>
                    <td style='border:1px solid #ccc;padding:8px;'>
                        <button class="edit-btn" onclick="editNews(${news.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteNews(${news.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Add or update news
    newsForm.onsubmit = async function (e) {
        e.preventDefault();
        const id = newsIdInput.value;
        const formData = new FormData(newsForm);
        const isEditMode = document.getElementById('newsIdContainer').style.display === 'block';
        console.log('Submitting news form:', {
            id,
            title: newsForm.title.value,
            location: newsForm.location.value,
            date: newsForm.date.value,
            content: newsForm.content.value
        });
        try {
            let response;
            if (id && isEditMode) {
                // Update
                response = await fetch(`/api/news/${id}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                // Add
                response = await fetch('/api/news', {
                    method: 'POST',
                    body: formData
                });
            }
            console.log('Response from server:', response);
            newsForm.reset();
            newsIdInput.value = '';
            document.getElementById('newsIdContainer').style.display = 'none';
            fetchNews();
        } catch (err) {
            console.error('Failed to save news:', err);
            alert('Failed to save news.');
        }
    };

    // Edit news
    window.editNews = function (id) {
    const news = newsData.find(n => n.id === id);
    if (!news) return;
    newsForm.title.value = news.title;
    newsForm.location.value = news.location;
    newsForm.date.value = news.date;
    newsForm.content.value = news.content;
    newsIdInput.value = news.id;
    document.getElementById('newsIdContainer').style.display = 'block';
    };

    // Delete news
    window.deleteNews = async function (id) {
        if (!confirm('Delete this news?')) return;
        try {
            await fetch(`/api/news/${id}`, { method: 'DELETE' });
            fetchNews();
        } catch (err) {
            alert('Failed to delete news.');
        }
    };

    // Reset form
    resetBtn.onclick = function () {
    newsForm.reset();
    newsIdInput.value = '';
    document.getElementById('newsIdContainer').style.display = 'none';
    };

    // Search by post ID and populate form
    if (searchBtn) {
        searchBtn.onclick = async function () {
            const id = searchIdInput.value;
            if (!id) {
                alert('Please enter a Post ID');
                return;
            }
            try {
                const res = await fetch(`/api/news`);
                const allNews = await res.json();
                const news = allNews.find(n => n.id == id);
                if (!news) {
                    // No post found, clear form for new post
                    newsForm.reset();
                    newsIdInput.value = '';
                    document.getElementById('newsIdContainer').style.display = 'none';
                    return;
                }
                newsForm.title.value = news.title;
                newsForm.location.value = news.location;
                newsForm.date.value = news.date;
                newsForm.content.value = news.content;
                newsIdInput.value = news.id;
                document.getElementById('newsIdContainer').style.display = 'block';
            } catch (err) {
                alert('Failed to search post.');
            }
        };
    }

    fetchNews();
// ...existing code...
});
