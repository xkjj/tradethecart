const express = require("express");
let app = express();
const path = require("path");

//middleware
app.use(express.static(path.join(__dirname, './public')));
app.set('view engine', 'ejs');

//routes
app.get("/", (req, res) => {

    res.render('tradethecart');
});

//server
app.listen(process.env.PORT || 3000);
console.log(' Server is listening//localhost:3000/ ');