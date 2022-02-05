const mysql = require('mysql2');

var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "customers"
});

conn.connect((err) => {
    if(err) {
        throw err;
    } else {
        console.log("Customers Database connected Susccessfully");
    }
});

module.exports = conn;
