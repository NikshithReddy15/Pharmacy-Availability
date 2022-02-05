const mysql = require('mysql2');

var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "countries_states_cities"
});

conn.connect((err) => {
    if(err) {
        throw err;
    } else {
        console.log("Countries_States_Cities Database connected Susccessfully");
    }
});

module.exports = conn;
