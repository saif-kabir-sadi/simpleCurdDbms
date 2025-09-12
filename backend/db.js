const mysql = require('mysql2');

const db = mysql.createConnection({
       host: 'localhost',
       user: 'root', // change to your MySQL username
       password: '1234', // change to your MySQL password
       database: 'furniro_databse', // updated to your new database name
       port: 3306 // default MySQL port
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

module.exports = db;
