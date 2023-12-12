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
    multipleStatements: true,

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

    db.query(insertusersSQL, (err, rows) => {
        if (err) throw err;
        res.redirect('/usercreated');
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

            const allcards = `(SELECT * FROM tradethecart_pokemon ORDER BY id DESC limit 5)
            ORDER BY id ASC;`;

            db.query(allcards, (err,row2) => {
                if (err) throw err;

                res.render('tradethecart', { userdata: firstrow, allcards: row2 });
            });
            
        });
    } else {
        res.redirect('/noaccess');
    }
});

app.get('/logout', (req, res) => {

    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');

    });

});

app.get('/catalogue', (req, res) => {
    const limit = 8;
    let offset = 0;
    const page = req.query.page;
    offset = (page - 1) * limit;
    if (Number.isNaN(offset)) offset = 0;

    const showcards = `SELECT id FROM tradethecart_pokemon;
    SELECT * FROM tradethecart_pokemon LIMIT ${limit} OFFSET ${offset}`;

    db.query(showcards, (err, rows) => {
        if (err) throw err;
        const totalRows = rows[0].length;
        const pageCount = Math.ceil(totalRows / limit);
        res.render('catalogue', { allcards: rows[1], num_pages: pageCount });

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
        res.redirect('/noaccess');
    }
});

app.get("/usercreated", (req, res) => {

    let getusers = `SELECT * FROM tradethecart_users;`;

    db.query(getusers, (err, rows) => {
        if (err) throw err;
        res.render('usercreated', { usercreated: rows });
    });
});

app.get('/dashboard', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;
            const firstrow = row[0];
            res.render('dashboard', { userdata: firstrow });
        });
    } else {
        res.redirect('/noaccess');
    }
});

app.get('/addcard', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;

            const getcards = `SELECT * FROM tradethecart_pokemon ORDER BY pokemon_name ASC`
            db.query(getcards, (err, row2) => {
                if (err) throw err;

                res.render('addcard', { userdata: row, carddata: row2 })

            });

        });
    } else {
        res.redirect('/noaccess');
    }
});

app.post('/addcard', (req, res) => {
    const sessionobj = req.session;
    const pokemon = req.body.pokemon_card;
    const uid = sessionobj.authen;

    const insertcardsql = `INSERT INTO tradethecart_user_cards (user_id, card_id) VALUES ('${uid}', '${pokemon}');`;

    db.query(insertcardsql, (err, result) => {
        if (err) throw err;

        res.redirect('/addcard')

    });

});

app.get('/createcard', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;

            const getcards = `SELECT * FROM tradethecart_pokemon ORDER BY pokemon_name ASC`
            db.query(getcards, (err, row2) => {
                if (err) throw err;

                const gettypes = `SELECT * FROM tradethecart_types`
                db.query(gettypes, (err, row3) => {
                    if (err) throw err;

                    const getsets = `SELECT * from tradethecart_set;`;
                    db.query(getsets, (err, row4) => {
                        if (err) throw err;

                        res.render('createcard', { userdata: row, carddata: row2, typedata: row3, setdata: row4 })
                    });

                });

            });

        });
    } else {
        res.redirect('/noaccess');
    }
});

app.post('/createcard', (req, res) => {
    const sessionobj = req.session;
    const pokeN = req.body.pokemonname_field;
    const pokeT = req.body.pokemontype_field;
    const pokeHP = req.body.pokemonhp_field;
    const pokeS = req.body.pokemonset_field;
    const pokeI = req.body.pokemonimg_field;
    const uid = sessionobj.authen;

    const insertcardsql = `INSERT INTO tradethecart_pokemon (set_id, pokemon_name, pokemon_hp, type_id, pokemon_img) VALUES ('${pokeS}', '${pokeN}', '${pokeHP}', '${pokeT}', '${pokeI}');`;

        db.query(insertcardsql, (err, result2) => {
            if (err) throw err;

            res.redirect('/addcard')
        });

    });

app.get('/createset', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;

            const getsets = `SELECT * FROM tradethecart_set`
            db.query(getsets, (err, row2) => {
                if (err) throw err;

                res.render('createset', { userdata: row, setdata: row2 })

            });

        });
    } else {
        res.redirect('/noaccess');
    }
});

app.post('/createset', (req, res) => {
    const setN = req.body.pokemonset_field;

    const insertsetsql = `INSERT INTO tradethecart_set (set_name) VALUES ('${setN}');`;

    db.query(insertsetsql, (err, result) => {
        if (err) throw err;

        res.redirect('/createcard')

    });

});

app.get("/noaccess", (req, res) => {

        res.render('noaccess');
});


//server
app.listen(process.env.PORT || 3000);
console.log(' Server is listening//localhost:3000/ ');