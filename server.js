const express = require('express')
const app = express()
const http = require("http")
const session = require('express-session')
const port = 80
const { Pool } = require('pg')
const bycrypt = require('bcrypt')
const saltRounds = 4
const emailValidator = require('email-validator');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const jwtKey = "vUL8qmXMqKwSSqUP_O_MRoYNd2taqRnumPc7UhgtX6jAjtgvsni02dbFEC7OlbMjyipUqQHpuzS9opSxZDTN9hiiPI3n_l7-Wo0dTysDLKtXndAvrsxTzkM0y9lk5mAoay9OT9jgJ54v0T8rtjVY4YwkctOO8bciVu_uvu_t_G0"
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

// Session is used to store user info
app.use(session({
    secret: "Jb0FVuOuTz",
    cookie: {maxAge: 2*24*60*60*1000},
    resave: false, 
    saveUninitialized: false
}))

// Transporter is used to send mail to users
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: "kaverts.emailer@gmail.com",
        pass: "qoipqcnipdzczkaa"
    }
});

app.post("/login", async (req, res) => {
    let email = req.body.email
    let pw = req.body.password
    if (email && pw) { // If user entered email and password, check if hashed password matches DB
        run_query("SELECT pw_hash FROM student WHERE email = $1;", [email], async (result)=> {
            if (result.rows.length && await bycrypt.compare(pw, result.rows[0].pw_hash)) {
                req.session.user = email
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
    if (req.session.user) {
        req.session.user = null
        res.redirect("/")
    } else {
        res.render("login.ejs", {
            prompt: "",
            prevEmail: ""
        })
    }
})

app.get("/signup", async (req, res) => {
    if (req.session.user) {
        req.session.user = null
        res.redirect("/")
    } else {
        res.render("sign-up.ejs", {
            prompt: "",
            prevEmail: "",
            prevName: ""
        })
    }  
})

app.post("/signup", async (req, res) => {
    let pw = req.body.password
    let name = req.body.name.split(" ", 2)
    let email = req.body.username
    if (await emailValidator.validate(email)) { // Check if email exists
         sql_query = "INSERT INTO student (f_name, l_name, email, pw_hash) VALUES ($1, $2, $3, $4) RETURNING id;"
        run_query(sql_query, [name[0], name[1], email, await bycrypt.hash(pw, saltRounds)], async(result) => {
            // Craft email to send to user
            let token = jwt.sign({data: email}, jwtKey, { expiresIn: '10m' } ); 
            let mailConfig = {
                from: "kaverts.emailer@gmail.com",
                to: email,
                subject: 'Email Verification',
                text:  `Hi, thank you for using our platform. Please follow the given link to verify your email 
http://localhost:${port}/verify/${token}. 
Hope you enjoy!` 
            };
            // Send email to user
            transporter.sendMail(mailConfig, (err) => {
                if (err) {
                    console.log(err)
                }
                else {
                    req.session.user = email
                    req.session.userActive = false
                    res.redirect("/")
                }
            })
        }, async (sqlError) => {
            // Duplicate email
            if (sqlError.code == '23505') {
                res.render("sign-up.ejs", {     
                    prompt: "That email has already been used",
                    prevEmail: "",
                    prevName: req.body.name
                })
            } else {
                console.log(sqlError)
            }
        })
    } else {
        res.render("sign-up.ejs", {     
            prompt: "Please enter a valid email",
            prevName: req.body.name
        })
    }

})

app.post("/resend", async(req, res) => {
    console.log(req.body)
    // If client requests new email with confirmation link
    let token = jwt.sign({data: req.body.email}, jwtKey, { expiresIn: '10m' } ); 
    let mailConfig = {
        from: "kaverts.emailer@gmail.com",
        to: req.body.email,
        subject: 'Email Verification',
        text:  `Hi, thank you for using our platform. Please follow the given link to verify your email 
http://localhost:${port}/verify/${token}. 
Hope you enjoy!` 
    };
    transporter.sendMail(mailConfig, (err) => {
        if (err) {
            console.log(err)
            res.sendStatus(500)
        }
        else {
            res.sendStatus(200)
        }
    }) 
})

app.get("/verify/:token", async(req, res) => {
    // Verifies email belongs to user
    let token = req.params.token
    jwt.verify(token, jwtKey, (err, decoded) => {
        if (err) {
            console.log(err)
        } else {
            run_query("UPDATE student SET active = True WHERE email = $1", [decoded.data], async(result) => {
                req.session.user = decoded.data
                req.session.userActive = true
                res.redirect("/")
            }, async(sqlError) => {
                console.log(sqlError)
            })
        }
    })
})

app.get("/", async(req, res) => {
    if (req.session.user) {
        if (req.session.userActive) {
            res.render("home.ejs")
        } else {
            res.render("waitEmailConfirm.ejs", {
                prevEmail: req.session.user
            })
        }
    } else {
        res.send("Main page")
    }
})

app.get("/signout", async(req, res) => {
    req.session.user = null 
    req.session.activeUser = false
    res.redirect("/")
})

// Asynchronously runs a Postgresql query
async function run_query(query, params, callback, errHandle){ 
    try {
        const result = await pool.query(query, params);
        callback(result)
    } catch (error) {
        errHandle(error)
    }
}

http.createServer(app).listen(port, () => {
    console.log("listening on port: " + port)  
})