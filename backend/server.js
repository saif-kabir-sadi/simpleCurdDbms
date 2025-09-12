
const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from the public directory (absolute path with logging)
const publicDir = path.resolve(__dirname, '..', 'public');
console.log('Serving static files from:', publicDir);
app.use(express.static(publicDir));

// Redirect root to login.html (correct path)
app.get('/', (req, res) => {
    const loginPath = path.join(__dirname, '..', 'public', 'login.html');
    console.log('Serving login.html from:', loginPath);
    res.sendFile(loginPath, (err) => {
        if (err) {
            console.error('Error sending login.html:', err);
            res.status(500).send('Error loading login page');
        }
    });
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
    const { email, name, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ message: 'Email, name, and password required' });
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length > 0) return res.status(409).json({ message: 'Email already exists' });
        db.query('INSERT INTO users (email, name, password) VALUES (?, ?, ?)', [email, name, hashedPassword], (err) => {
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
        res.json({ message: 'Login successful' });
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
