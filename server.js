const express = require('express')
const app = express()
const http = require("http")
const session = require('express-session')
const port = 80
const { Pool } = require('pg')
const bycrypt = require('bcrypt')
const saltRounds = 2
const pool = new Pool({
    user: 'ws_login',
    host: 'localhost',
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

 

app.post("/login", async (req, res) => {
    let email = req.body.email
    let pw = req.body.password
    if (email && pw) {
        run_query("SELECT pw_hash FROM student WHERE email = $1;", [email], async (result)=> {
            if (result.rows.length && await bycrypt.compare(result.rows[0].pw_hash, await bycrypt.hash(pw, saltRounds))) {
                req.session.authenticated = true
                res.redirect("/")
            }
            else {
                res.render("login.ejs", {
                    prompt: "INVALID LOGIN"
                })  
            }
        })

    }
})


app.get("/login", async (req, res) => {
    if (req.session.authenticated) {
        req.session.authenticated = false
        res.redirect("/")
    } else {
        res.render("login.ejs", {
            prompt: ""
        })
    }
})

async function run_query(query, params, callback){
    try {
        const result = await pool.query(query, params);
        callback(result)
      } catch (error) {
        console.error('Error executing query:', error);
      }
}

http.createServer(app).listen(port, () => {
    console.log("listening on port: " + port)  
})