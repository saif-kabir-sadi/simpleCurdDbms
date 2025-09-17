// Update User Role
const updateRoleForm = document.getElementById('updateRoleForm');
if (updateRoleForm) {
    updateRoleForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('roleEmail').value.trim();
        const role = document.getElementById('roleValue').value;
        if (!email || !role) return;
        const res = await fetch('/api/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role })
        });
        const data = await res.json();
        document.getElementById('roleUpdateMsg').textContent = data.message || 'Role updated.';
    });
}
// Make user 
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

// Remove user
const removeUserForm = document.getElementById('removeUserForm');
if (removeUserForm) {
    removeUserForm.onsubmit = async function (e) {
        e.preventDefault();
        const email = removeUserForm.removeEmail.value;
        if (!confirm(`Are you sure you want to remove user: ${email}?`)) return;
        try {
            const res = await fetch('/api/remove-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            alert(data.message);
            removeUserForm.reset();
        } catch (err) {
            alert('Failed to remove user.');
        }
    };
}
//user creation 
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

// Display admin name from localStorage
document.addEventListener('DOMContentLoaded', function () {
    const adminName = localStorage.getItem('name') || 'Admin';
    document.getElementById('adminName').textContent = adminName;
});


document.addEventListener('DOMContentLoaded', function () {
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

    // Fetch all news 
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

    // Render all news 
    function renderNews() {
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
        const isEditMode = document.getElementById('newsIdContainer').style.display === 'block';
        const newsPayload = {
            title: newsForm.title.value,
            location: newsForm.location.value,
            date: newsForm.date.value,
            content: newsForm.content.value,
            category: newsForm.category.value
        };
        console.log('Submitting news form:', { id, ...newsPayload });
        try {
            let response;
            if (id && isEditMode) {
                // Update
                response = await fetch(`/api/news/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newsPayload)
                });
            } else {
                // Add
                response = await fetch('/api/news', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newsPayload)
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
        newsForm.category.value = news.category || '';
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

    // ID search
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
                    newsForm.reset();
                    newsIdInput.value = '';
                    document.getElementById('newsIdContainer').style.display = 'none';
                    return;
                }
                newsForm.title.value = news.title;
                newsForm.location.value = news.location;
                newsForm.date.value = news.date;
                newsForm.content.value = news.content;
                newsForm.category.value = news.category || '';
                newsIdInput.value = news.id;
                document.getElementById('newsIdContainer').style.display = 'block';
            } catch (err) {
                alert('Failed to search post.');
            }
        };
    }

    fetchNews();

});
// Fetch and render users in the admin dashboard
async function fetchAndRenderUsers() {
    const tableBody = document.querySelector('#usersTable tbody');
    tableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        if (!Array.isArray(users) || users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
            return;
        }
        tableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style='border:1px solid #ccc;padding:8px;'>${user.name || ''}</td>
                <td style='border:1px solid #ccc;padding:8px;'>${user.email}</td>
                <td style='border:1px solid #ccc;padding:8px;'>${user.role}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="3" style="color:red;">Failed to load users.</td></tr>';
    }
}

document.getElementById('refreshUsersBtn').onclick = fetchAndRenderUsers;
// Auto-load users on page load
fetchAndRenderUsers();
