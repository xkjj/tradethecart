const express = require('express');
const app = express();
const mysql = require('mysql2');
const sessions = require('express-session');
const cookieParser = require('cookie-parser');
const hour = 1000 * 60 * 60;

//middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(sessions({
    secret: "thisismysecretkey599",
    saveUninitialized: true,
    cookie: { maxAge: hour },
    resave: false
}));
app.use(cookieParser());

const db = mysql.createConnection({

    host: "localhost",
    user: "root",
    database: "kjarosz02",
    password: "",
    port: "3306",

});


db.connect((err) => {
    if (err) throw err;
});


//routes
app.get("/", (req, res) => {

    res.render('login');
});

app.post('/', (req, res) => {
    const username = req.body.username_field;
    const checkuser = `SELECT * FROM tradethecart_users WHERE username = "${username}"`;
    const userpass = req.body.password_field;
    const checkpass = `SELECT * FROM tradethecart_users WHERE password = "${userpass}"`;

    db.query(checkuser, (err, rows) => {
        if (err) throw err;
        const numRows = rows.length;

        if (numRows > 0) {
            const sessionobj = req.session;
            sessionobj.authen = rows[0].id;

            db.query(checkpass, (err, rows2) => {
                if (err) throw err;
                const numRows2 = rows2.length;

                if (numRows2 > 0) {
                    const sessionobj = req.session;
                    sessionobj.authen = rows2[0].id;
                    res.redirect('/tradethecart')
                } else {
                    res.send("invalid password");
                }
            })
        } else {
            res.send("user does not exist");
        }
    })
});

app.get('/signup', (req, res) => {

    let getusers = `SELECT * FROM tradethecart_users`
    db.query(getusers, (err, rows) => {
        if (err) throw err;
        res.render('signup', { users: rows });
    });
});

app.post('/signup', (req, res) => {
    const firstN = req.body.firstname_field;
    const surN = req.body.surname_field;
    const userN = req.body.username_field;
    const passW = req.body.password_field;

    const insertusersSQL = `INSERT into tradethecart_users (firstname, surname, username, password) values ('${firstN}', '${surN}','${userN}','${passW}'); `;

    db.query(insertusersSQL, (err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

app.get('/tradethecart', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}"`;

        db.query(user, (err, row) => {
            if (err) throw err;
            const firstrow = row[0];
            res.render('tradethecart', { userdata: firstrow });
        });
    } else {
        res.send("Access denied");
    }
});

app.get('/logout', (req, res) => {

    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');

    });

});

app.get('/catalogue', (req, res) => {
    const showcards = `SELECT * FROM tradethecart_pokemon LIMIT 9`;

    db.query(showcards, (err, rows) => {
        if (err) throw err;
        res.render('catalogue', { allcards: rows });

    });

});

app.get('/yourcards', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const getuser = `SELECT tradethecart_users.id, tradethecart_users.firstname, tradethecart_users.username
                                FROM tradethecart_users
                                INNER JOIN tradethecart_user_cards ON
                                tradethecart_users.id = tradethecart_user_cards.user_id
                                WHERE tradethecart_users.id = ${uid};`;
                                
        db.query(getuser, (err, rows) => {
            if (err) throw err;

            let getuser = rows[0].id;
            const getcards = `SELECT * 
                                FROM tradethecart_pokemon
                                INNER JOIN tradethecart_user_cards ON
                                tradethecart_pokemon.id = tradethecart_user_cards.card_id
                                WHERE tradethecart_user_cards.user_id = ${getuser};`;

            db.query(getcards, (err, rows2) => {
                if (err) throw err;
                res.render('yourcards', { userdata: rows, carddata: rows2 })
            });
        });
    } else {
        res.send("Access denied");
    }
});


//server
app.listen(process.env.PORT || 3000);
console.log(' Server is listening//localhost:3000/ ');