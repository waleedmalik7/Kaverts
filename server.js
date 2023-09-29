const express = require('express')
const app = express()
const http = require("http")
const session = require('express-session')
const port = 80
const { Pool } = require('pg')
const bycrypt = require('bcrypt')
const emailValidator = require('email-validator');
const saltRounds = 4
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
            if (result.rows.length && await bycrypt.compare(pw, result.rows[0].pw_hash)) {
                req.session.authenticated = true
                res.redirect("/")
            }
            else {
                res.render("login.ejs", {
                    prompt: "INCORRECT EMAIL/PASSWORD",
                    prevEmail: email
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
            prompt: "",
            prevEmail: ""
        })
    }
})

app.get("/signup", async (req, res) => {
    if (req.session.authenticated) {
        req.session.authenticated = false
        res.redirect("/")
    } else {
        res.render("sign-up.ejs", {
            prompt: "",
            prevFName: "",
            prevLName: "",
            prevPassword: "",
        })
    }
})

app.post("/signup", async (req, res) => {
    let pw = req.body.password
    let fName = req.body.fName
    let lName = req.body.lName
    let email = req.body.email
    if (await emailValidator.validate(email)) {
        sql_query = "INSERT INTO student (f_name, l_name, email, pw_hash) VALUES ($1, $2, $3, $4);"
        run_query(sql_query, [fName, lName, email, await bycrypt.hash(pw, saltRounds)], async (result)=> {
            if (result.error) {
            } else {
            }
        })
    } else {
        //email is not valid
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