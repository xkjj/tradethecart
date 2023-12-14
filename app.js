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

    const uid = sessionobj.authen;
    const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}"`;

    db.query(user, (err, row) => {
        if (err) throw err;
        const firstrow = row[0];

            const allcards = `SELECT * FROM tradethecart_pokemon ORDER BY id DESC LIMIT 4;`;

            db.query(allcards, (err, row2) => {
                if (err) throw err;

                res.render('tradethecart', { userdata: firstrow, allcards: row2 });
            });
        });
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

    const sessionobj = req.session;
    const uid = sessionobj.authen;

    const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}"`;

    db.query(user, (err, row) => {
        if (err) throw err;
        const firstrow = row[0];

        const searchQuery = req.query.search;
        const sortOption = req.query.sort;
        switch (sortOption) {
            case 'newest':
                sortOrder = 'ORDER BY id DESC';
                break;
            case 'oldest':
                sortOrder = 'ORDER BY id ASC';
                break;
            case 'a-z':
                sortOrder = 'ORDER BY pokemon_name ASC';
                break;
            case 'z-a':
                sortOrder = 'ORDER BY pokemon_name DESC';
                break;
            default:
                sortOrder = 'ORDER BY pokemon_name ASC';
                break;
        }

        let showcards;
        if (searchQuery) {
            showcards = `SELECT id FROM tradethecart_pokemon WHERE pokemon_name LIKE '%${searchQuery}%' 
                      ${sortOrder};
                     SELECT * FROM tradethecart_pokemon WHERE pokemon_name LIKE '%${searchQuery}%' 
                         ${sortOrder} LIMIT ${limit} OFFSET ${offset}`;

        } else {
            showcards = `SELECT id FROM tradethecart_pokemon ${sortOrder};
                    SELECT * FROM tradethecart_pokemon ${sortOrder} LIMIT ${limit} OFFSET ${offset}`;
        }

        db.query(showcards, (err, rows) => {
            if (err) throw err;
            const totalRows = rows[0].length;
            const pageCount = Math.ceil(totalRows / limit);
            res.render('catalogue', { userdata: firstrow, allcards: rows[1], num_pages: pageCount, searchQuery, sortOption });

        });
    });
});

app.get('/yourcards', (req, res) => {
    const sessionobj = req.session;

    if (sessionobj.authen) {
        const uid = sessionobj.authen;

        const getuser = `SELECT tradethecart_users.id, tradethecart_users.firstname, tradethecart_users.username
                                FROM tradethecart_users
                                WHERE tradethecart_users.id = ${uid};`;

        db.query(getuser, (err, rows) => {
            if (err) throw err;
            const firstrow = rows[0];

            let getuser = rows[0].id;

            const searchQuery = req.query.search;

            let getcards;
            if (searchQuery) {
                getcards = `SELECT * 
                                FROM tradethecart_pokemon
                                INNER JOIN tradethecart_user_cards ON
                                tradethecart_pokemon.id = tradethecart_user_cards.card_id
                                WHERE tradethecart_user_cards.user_id = '${getuser}' AND
                                tradethecart_pokemon.pokemon_name LIKE '%${searchQuery}%';
                                ;`;

            } else {
                getcards = `SELECT * 
                                FROM tradethecart_pokemon
                                INNER JOIN tradethecart_user_cards ON
                                tradethecart_pokemon.id = tradethecart_user_cards.card_id
                                WHERE tradethecart_user_cards.user_id = ${getuser};`;
            }

            db.query(getcards, (err, rows2) => {
                if (err) throw err;
                res.render('yourcards', { userdata: firstrow, carddata: rows2, searchQuery });
            });
        });
    } else {
        res.redirect('/noaccess');
    }
});

app.post('/yourcards', (req, res) => {
    const sessionobj = req.session;
    const del_id = req.body.id_field;
    const uid = sessionobj.authen;

    const deletecardsql = `DELETE FROM tradethecart_user_cards WHERE id = ${del_id} `;

    db.query(deletecardsql, (err, result) => {
        if (err) throw err;

        console.log(result);
        res.redirect('/yourcards');
    });
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
            const firstrow = row[0];

            const searchQuery = req.query.search;

            let getcards;
            if (searchQuery) {
                getcards = `SELECT * FROM tradethecart_pokemon WHERE pokemon_name LIKE '%${searchQuery}%' 
                      ORDER BY pokemon_name ASC`;

            } else {
                getcards = `SELECT * FROM tradethecart_pokemon ORDER BY pokemon_name ASC`;
            }

            db.query(getcards, (err, row2) => {
                if (err) throw err;

                res.render('addcard', { userdata: firstrow, carddata: row2, searchQuery })

            });

        });
    } else {
        res.redirect('/noaccess');
    }
});

app.post('/addcard', (req, res) => {
    const sessionobj = req.session;
    const card_id = req.body.id_field;
    const uid = sessionobj.authen;

    const insertcardsql = `INSERT INTO tradethecart_user_cards (user_id, card_id) VALUES ('${uid}', '${card_id}');`;

    db.query(insertcardsql, (err, result) => {
        if (err) throw err;

        res.redirect('/yourcards')

    });

});

app.get('/createcard', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;
            const firstrow = row[0];

            const getcards = `SELECT * FROM tradethecart_pokemon ORDER BY pokemon_name ASC`
            db.query(getcards, (err, row2) => {
                if (err) throw err;

                const gettypes = `SELECT * FROM tradethecart_types`
                db.query(gettypes, (err, row3) => {
                    if (err) throw err;

                    const getsets = `SELECT * from tradethecart_set;`;
                    db.query(getsets, (err, row4) => {
                        if (err) throw err;

                        res.render('createcard', { userdata: firstrow, carddata: row2, typedata: row3, setdata: row4 })
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
    const pokeD = req.body.pokemondesc_field;
    const pokeI = req.body.pokemonimg_field;
    const uid = sessionobj.authen;

    const insertcardsql = `INSERT INTO tradethecart_pokemon (set_id, pokemon_name, pokemon_hp, type_id, description, pokemon_img) VALUES ('${pokeS}', '${pokeN}', '${pokeHP}', '${pokeT}', '${pokeD}', '${pokeI}');`;

    db.query(insertcardsql, (err, result2) => {
        if (err) throw err;

        res.redirect('/dashboard')
    });

});

app.get('/createset', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;
            const firstrow = row[0];

            const getsets = `SELECT * FROM tradethecart_set`
            db.query(getsets, (err, row2) => {
                if (err) throw err;

                res.render('createset', { userdata: firstrow, setdata: row2 })

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

app.get('/cardstats', (req, res) => {

    const card_id = req.query.cid;

    const onecardsql = `SELECT * FROM tradethecart_pokemon 
                            INNER JOIN tradethecart_types 
                            ON tradethecart_pokemon.type_id = tradethecart_types.type_id
                            INNER JOIN tradethecart_set
                            ON tradethecart_pokemon.set_id = tradethecart_set.set_id
                            WHERE tradethecart_pokemon.id = ${card_id}; `;

    db.query(onecardsql, (err, row) => {
        if (err) throw err;
        res.render('cardstats', { card: row });
    });
});

app.get('/editcardlist', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;
            const firstrow = row[0];

            const searchQuery = req.query.search;

            let getcards;
            if (searchQuery) {
                getcards = `SELECT * FROM tradethecart_pokemon WHERE pokemon_name LIKE '%${searchQuery}%' 
                                 ORDER BY pokemon_name ASC`;

            } else {
                getcards = `SELECT * FROM tradethecart_pokemon ORDER BY pokemon_name ASC`;
            }

            db.query(getcards, (err, row2) => {
                if (err) throw err;

                res.render('editcardlist', { userdata: firstrow, carddata: row2, searchQuery })

            });

        });
    } else {
        res.redirect('/noaccess');
    }
});

app.get('/editcard', (req, res) => {
    const sessionobj = req.session;

    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}" `;

        db.query(user, (err, row) => {
            if (err) throw err;
            const firstrow = row[0];

            const gettypes = `SELECT * FROM tradethecart_types`
            db.query(gettypes, (err, row) => {
                if (err) throw err;

                const getsets = `SELECT * from tradethecart_set;`;
                db.query(getsets, (err, row2) => {
                    if (err) throw err;

                    const card_id = req.query.cid;
                    const onecardsql = `SELECT * FROM tradethecart_pokemon
                                                INNER JOIN tradethecart_types 
                                                ON tradethecart_pokemon.type_id = tradethecart_types.type_id
                                                INNER JOIN tradethecart_set
                                                ON tradethecart_pokemon.set_id = tradethecart_set.set_id
                                                WHERE tradethecart_pokemon.id = ${card_id}; `;

                    db.query(onecardsql, (err, row3) => {
                        if (err) throw err;
                        res.render('editcard', { userdata: firstrow, typedata: row, setdata: row2, card: row3 })
                    });

                });

            });
        });

    } else {
        res.redirect('/noaccess');
    }

    app.post('/editcard', (req, res) => {
        const sessionobj = req.session;
        const id_update = req.body.id_field;
        const name_update = req.body.pokemonname_field;
        const type_update = req.body.pokemontype_field;
        const hp_update = req.body.pokemonhp_field;
        const set_update = req.body.pokemonset_field;
        const desc_update = req.body.pokemondesc_field;
        const img_update = req.body.pokemonimg_field;
        const uid = sessionobj.authen;

        console.log('ID to be updated:', id_update);

        const updatecardsql = `UPDATE tradethecart_pokemon SET pokemon_name = '${name_update}', set_id = '${set_update}', 
                                    pokemon_hp = '${hp_update}', type_id = '${type_update}', description = '${desc_update}', pokemon_img = '${img_update}'
                                    WHERE id = '${id_update}' `;

        db.query(updatecardsql, (err, result) => {
            if (err) throw err;

            console.log(result);
            res.redirect('/editcardlist')
        });

    });

});

app.get('/collections', (req, res) => {
    const sessionobj = req.session;

    const uid = sessionobj.authen;
    const user = `SELECT * FROM tradethecart_users WHERE id = "${uid}"`;

    db.query(user, (err, row) => {
        if (err) throw err;
        const firstrow = row[0];
        const searchQuery = req.query.search

        if (searchQuery) {
            usercollections = `SELECT tradethecart_users.id AS user_id,
                                tradethecart_users.username,
                                GROUP_CONCAT(tradethecart_user_cards.card_id) AS user_cards,
                                GROUP_CONCAT(tradethecart_pokemon.pokemon_img SEPARATOR ' ') AS card_images
                                FROM tradethecart_users
                                LEFT JOIN tradethecart_user_cards ON tradethecart_users.id = tradethecart_user_cards.user_id
                                LEFT JOIN tradethecart_pokemon ON tradethecart_user_cards.card_id = tradethecart_pokemon.id
                                WHERE tradethecart_user_cards.card_id IS NOT NULL AND tradethecart_users.username LIKE '%${searchQuery}%';
                              
                            ;`;

        } else {
            usercollections = `SELECT tradethecart_users.id AS user_id,
                                tradethecart_users.username,
                                GROUP_CONCAT(tradethecart_user_cards.card_id) AS user_cards,
                                GROUP_CONCAT(tradethecart_pokemon.pokemon_img SEPARATOR ' ') AS card_images
                                FROM tradethecart_users
                                LEFT JOIN tradethecart_user_cards ON tradethecart_users.id = tradethecart_user_cards.user_id
                                LEFT JOIN tradethecart_pokemon ON tradethecart_user_cards.card_id = tradethecart_pokemon.id
                                WHERE tradethecart_user_cards.card_id IS NOT NULL
                                GROUP BY tradethecart_users.id;`;
        }

            db.query(usercollections, (err, row2) => {
                if (err) throw err;
                
                res.render('collections', { userdata: firstrow, usercards: row2, searchQuery });
            });
        });
    });

app.get("/noaccess", (req, res) => {

    res.render('noaccess');
});


//server
app.listen(process.env.PORT || 3000);
console.log(' Server is listening//localhost:3000/ ');