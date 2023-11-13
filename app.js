const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql2");

//middleware
app.use(express.static(path.join(__dirname, './public')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));

const db = mysql.createConnection({ 
    
        host:"localhost",
        user:"root",
        database:"kjarosz02",
        password:"",
        port:"3306",

});

const connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'kjarosz02',
        port: '3306'
    }
);

connection.connect((err) => {

    if (err) return console.log(err.message);

});


//routes
app.get("/", (req, res) => {

    res.render('tradethecart');
});

app.get("/signup", (req, res) => {

    res.render('signup');
});

app.get("/login", (req, res) => {

    res.render('login');
});

//server
app.listen(process.env.PORT || 3000);
console.log(' Server is listening//localhost:3000/ ');