const express = require('express')
const app = express()
const http = require("http")
const session = require('express-session')
const port = 80
const { Pool } = require('pg')

const pool = new Pool({
    user: 'ws_login',
    host: '127.0.0.1',
    database: 'Kaverts',
    password: 'mt3sBf35.#tM',
    port: 5432,
})


app.set('view engine', 'ejs')

app.use(express.static("public"))
app.use(express.urlencoded({ extended: true}))


app.use(session({
    secret: "Jb0FVuOuTz",
    cookie: {maxAge: 2*24*60*60*1000},
    resave: false, 
    saveUninitialized: false
}))



app.post("/", (req, res, next) => {
    let username = req.body.username
    let password = req.body.password
    if (username && password) {
        try {
            con.connect( ()=> {
                sqlQuery = "SELECT if ( (SELECT CONCAT('*', UPPER(SHA1(UNHEX(SHA1(?)))))) = " +
                    "(SELECT authentication_string FROM mysql.user WHERE user = ?),true, false) as authenticated"
                sqlParams = [password, username]
                con.query(sqlQuery, sqlParams, (error, result, fields) => {
                    if (result[0].authenticated) {
                        req.session.authenticated = true
                        res.redirect("/")
                    }
                    else {
                        res.render("login.ejs", {
                            prompt: "INVALID LOGIN"
                        })  
                    }
                })
            })
        }
        catch (error) {
            next(error)
        }
    }
})


app.get("/", (req, res) => {
    console.log(pool.query('SELECT * FROM student'))
    if (req.session.authenticated) {
        req.session.authenticated = false
        res.redirect("/")
    } else {
        res.render("login.ejs", {
            prompt: ""
        })
    }
})

http.createServer(app).listen(port, () => {
    console.log("listening on port: " + port)  
})