const mysql = require('mysql2');

var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "orders"
});

conn.connect((err) => {
    if(err) {
        throw err;
    } else {
        console.log("Orders Database connected Susccessfully");
    }
});

module.exports = conn;
