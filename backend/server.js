const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors());

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/index.html', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'public', 'static', 'index.html');
    res.sendFile(indexPath);
});

// Update user role 
app.post('/api/update-role', (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: 'Email and role required' });
    if (role !== 'admin' && role !== 'user') return res.status(400).json({ message: 'Role must be admin or user' });
    db.query('UPDATE users SET role=? WHERE email=?', [role, email], (err, result) => {
        if (err) {
            console.error('DB error on update-role:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            console.warn('No user found for email:', email);
            return res.status(404).json({ message: 'User not found', email });
        }
        res.json({ message: `User role updated to ${role}`, email });
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

// Signup 
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

// Login 
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });
        res.json({ message: 'Login successful', role: user.role || 'user', name: user.name });
    });
});




// --- NEWS CRUD ---

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

// Search news 
app.get('/api/news/search', (req, res) => {
    let { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
        console.warn('Search endpoint called with empty query');
        return res.status(400).json({ message: 'Search query required' });
    }
    q = q.trim();
    const searchTerm = `%${q.toLowerCase()}%`;
    const sql = 'SELECT * FROM news WHERE LOWER(title) LIKE ? OR LOWER(category) LIKE ? ORDER BY date DESC';
    console.log(`[SEARCH] Query: "${q}", SQL: ${sql}, Params:`, [searchTerm, searchTerm]);
    db.query(sql, [searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('Database error on /api/news/search:', err);
            return res.status(500).end();
        }
        if (!Array.isArray(results)) {
            console.error('Unexpected results type from DB:', results);
            return res.status(500).end();
        }
        if (results.length === 0) {
            console.info('No news found for search:', q);
            return res.status(404).end();
        }
        res.json(results);
    });
});

// Add news 
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

// Update news
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

// Like a news post 
app.post('/api/news/:id/like', (req, res) => {
    const newsId = req.params.id;
    const userEmail = req.body.email;
    if (!userEmail) {
        return res.status(400).json({ success: false, message: 'User email required.' });
    }
    // Check if user already liked this post
    db.query('SELECT id FROM news_likes WHERE user_email = ? AND news_id = ?', [userEmail, newsId], (err, rows) => {
        if (err) {
            console.error('Database error on LIKE CHECK /api/news/:id/like:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (rows && rows.length > 0) {
            // Already liked
            db.query('SELECT likes FROM news WHERE id = ?', [newsId], (err2, rows2) => {
                if (err2 || !rows2 || rows2.length === 0) {
                    return res.json({ success: false, message: 'Failed to fetch like count.' });
                }
                res.json({ success: false, message: 'Already liked', likes: rows2[0].likes });
            });
            return;
        }
        // Insert like record
        db.query('INSERT INTO news_likes (user_email, news_id) VALUES (?, ?)', [userEmail, newsId], (err3) => {
            if (err3) {
                console.error('Database error on LIKE INSERT /api/news/:id/like:', err3);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            // Increment the like count
            db.query('UPDATE news SET likes = likes + 1 WHERE id = ?', [newsId], (err4) => {
                if (err4) {
                    console.error('Database error on LIKE UPDATE /api/news/:id/like:', err4);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                // Get the new like count
                db.query('SELECT likes FROM news WHERE id = ?', [newsId], (err5, rows5) => {
                    if (err5 || !rows5 || rows5.length === 0) {
                        return res.json({ success: false, message: 'Failed to fetch like count.' });
                    }
                    res.json({ success: true, likes: rows5[0].likes });
                });
            });
        });
    });
});

// --- USERS TABLE---
app.get('/api/users', (req, res) => {
    db.query('SELECT name, email, role FROM users', (err, results) => {
        if (err) {
            console.error('DB error on get all users:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.json(results);
    });
});