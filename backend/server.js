// ...existing code...


const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors());


// Serve /index.html from static folder
app.get('/index.html', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'public', 'static', 'index.html');
    res.sendFile(indexPath);
});

// Make user admin by email
app.post('/api/make-admin', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    db.query('UPDATE users SET role="admin" WHERE email=?', [email], (err, result) => {
        if (err) {
            console.error('DB error on make-admin:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            console.warn('No user found for email:', email);
            return res.status(404).json({ message: 'User not found', email });
        }
        res.json({ message: 'User role updated to admin', email });
    });
});

// Remove user by email
app.post('/api/remove-user', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    db.query('DELETE FROM users WHERE email=?', [email], (err, result) => {
        if (err) {
            console.error('DB error on remove-user:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            console.warn('No user found for email:', email);
            return res.status(404).json({ message: 'User not found', email });
        }
        res.json({ message: 'User removed successfully', email });
    });
});



// Serve login.html for root path ONLY
app.get('/', (req, res) => {
    const loginPath = path.join(__dirname, '..', 'public', 'login.html');
    res.sendFile(loginPath, (err) => {
        if (err) {
            console.error('Error sending login.html:', err);
            res.status(500).send('Error loading login page');
        }
    });
});





// Serve static files from the entire public directory FIRST
const publicDir = path.resolve(__dirname, '..', 'public');
console.log('Serving static files from:', publicDir);
app.use(express.static(publicDir));


// Catch-all route: serve login.html for unknown non-API, non-static, non-file routes
app.get(/^\/(?!api|static|.*\..*$).*/, (req, res) => {
    const loginPath = path.join(__dirname, '..', 'public', 'login.html');
    res.sendFile(loginPath);
});

// Test route to serve login.html directly
app.get('/test-login', (req, res) => {
    const loginPath = path.join(__dirname, '..', 'public', 'login.html');
    res.sendFile(loginPath, (err) => {
        if (err) {
            console.error('Error sending login.html:', err);
            res.status(500).send('Error loading login page');
        }
    });
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json({ message: 'Email, name, and password required' });
    const userRole = role || 'user';
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length > 0) return res.status(409).json({ message: 'Email already exists' });
        db.query('INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)', [email, name, hashedPassword, userRole], (err) => {
            if (err) return res.status(500).json({ message: 'Signup failed' });
            res.status(201).json({ message: 'Signup successful' });
        });
    });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });
        // Assume user.role exists in users table, default to 'user' if not present
        res.json({ message: 'Login successful', role: user.role || 'user', name: user.name });
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// --- NEWS CRUD ENDPOINTS ---

// Get all news
app.get('/api/news', (req, res) => {
    db.query('SELECT * FROM news ORDER BY date DESC', (err, results) => {
        if (err) {
            console.error('Database error on GET /api/news:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// Search news by category, title, or content
app.get('/api/news/search', (req, res) => {
    let { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
        console.warn('Search endpoint called with empty query');
        return res.status(400).json({ message: 'Search query required' });
    }
    q = q.trim();
    const searchTerm = `%${q.toLowerCase()}%`;
    const sql = 'SELECT * FROM news WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(category) LIKE ? ORDER BY date DESC';
    console.log(`[SEARCH] Query: "${q}", SQL: ${sql}, Params:`, [searchTerm, searchTerm, searchTerm]);
    db.query(sql, [searchTerm, searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('Database error on /api/news/search:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (!Array.isArray(results)) {
            console.error('Unexpected results type from DB:', results);
            return res.status(500).json({ message: 'Unexpected DB response', results });
        }
        if (results.length === 0) {
            console.info('No news found for search:', q);
            return res.status(404).json({ message: 'No news found for search', query: q });
        }
        res.json(results);
    });
});

// Add news (no image)
app.post('/api/news', (req, res) => {
    console.log('POST /api/news called');
    const { title, location, date, content, category } = req.body;
    console.log('Received news post:', { title, location, date, content, category });
    if (!title || !location || !date || !content || !category) {
        console.warn('Missing field:', { title, location, date, content, category });
        return res.status(400).json({ message: 'All fields required' });
    }
    db.query('INSERT INTO news (title, location, date, content, category) VALUES (?, ?, ?, ?, ?)', [title, location, date, content, category], (err, result) => {
        if (err) {
            console.error('SQL error on INSERT:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        console.log('News inserted successfully:', { id: result.insertId, title, location, date, content, category });
        res.status(201).json({ id: result.insertId, title, location, date, content, category });
    });
});

// Update news with optional image upload
app.put('/api/news/:id', (req, res) => {
    const { id } = req.params;
    const { title, location, date, content, category } = req.body;
    if (!title || !location || !date || !content || !category) {
        console.warn('Missing field for update:', { title, location, date, content, category });
        return res.status(400).json({ message: 'All fields required' });
    }
    let query = 'UPDATE news SET title=?, location=?, date=?, content=?, category=? WHERE id=?';
    let params = [title, location, date, content, category, id];
    db.query(query, params, (err, result) => {
        if (err) {
            console.error('SQL error on UPDATE:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        console.log('News updated successfully:', { id, title, location, date, content, category });
        res.json({ id, title, location, date, content, category });
    });
});

// Delete news
app.delete('/api/news/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM news WHERE id=?', [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'News deleted', id });
    });
});
