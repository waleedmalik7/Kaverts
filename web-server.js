const express = require('express')
const app = express()
const ejs = require('ejs');
const http = require("http")
const session = require('express-session')
const port = 80
const { Pool } = require('pg')
const bycrypt = require('bcrypt')
const saltRounds = 4
const emailValidator = require('email-validator');
const nodemailer = require('nodemailer');
const axios = require('axios')
const jwt = require('jsonwebtoken');
const psURL = 'http://localhost:81/question'
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
    let userType = req.body.userType
    if (email && pw) { // If user entered email and password, check if hashed password matches DB
        if(userType == "tutor") {
            sqlQuery = "SELECT pw_hash, active FROM tutor WHERE email = $1;"
        } else {
            sqlQuery = "SELECT pw_hash, active FROM student WHERE email = $1;"
        }
        run_query(sqlQuery, [email], async (result)=> {
            if (result.rows.length && await bycrypt.compare(pw, result.rows[0].pw_hash)) {
                req.session.user = email
                req.session.userActive = result.rows[0].active
                req.session.tutor = (userType == "tutor")
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
        req.session.destroy
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
        req.session.destroy
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
    if (req.body.name && req.body.password && req.body.username) {
        let pw = req.body.password
        let name = req.body.name.split(" ", 2)
        let email = req.body.username
        let userType = req.body.userType
        if (await emailValidator.validate(email)) { // Check if email exists
            sql_query = "INSERT INTO tutor (f_name, l_name, email, pw_hash) VALUES ($1, $2, $3, $4) RETURNING id;"
            if (userType == 'student') {
                sql_query = "INSERT INTO student (f_name, l_name, email, pw_hash) VALUES ($1, $2, $3, $4) RETURNING id;"
            }
            run_query(sql_query, [name[0], name[1], email, await bycrypt.hash(pw, saltRounds)], async(result) => {
                // Craft email to send to user
                let token = jwt.sign({data: {email: email, userType: userType}}, jwtKey, { expiresIn: '10m' } ); 
                let mailConfig = {
                    from: "kaverts.emailer@gmail.com",
                    to: email,
                    subject: 'Email Verification for Kaverts',
                    html:  `<p> Hi, thank you for using our platform. Please follow the given link to verify your email  </p>
                        <p> ` + `http://localhost:${port}/verify/${token}` + `</p>
                        <p> Hope you enjoy! </p>`
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
                    res.sendStatus(500)
                }
            })
        } else {
            res.render("sign-up.ejs", {     
                prompt: "Please enter a valid email",
                prevName: req.body.name,
                prevEmail: ""
            })
        }
    } else {
        res.render("sign-up.ejs", {     
            prompt: "Sorry, something failed. Please try again",
            prevName: "",
            prevEmail: ""
        })
    }

})

app.post("/resend", async(req, res) => {
    // If client requests new email with confirmation link
    let token = jwt.sign({data: req.body.email}, jwtKey, { expiresIn: '10m' } ); 
    let mailConfig = {
        from: "kaverts.emailer@gmail.com",
        to:  req.body.email,
        subject: 'Email Verification for Kaverts',
        html:  `<p> Hi, thank you for using our platform. Please follow the given link to verify your email  </p>
            <p> ` + `http://localhost:${port}/verify/${token}` + `</p>
            <p> Hope you enjoy! </p>`
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
    req.session.destroy
    // Verifies email belongs to user
    let token = req.params.token
    
    jwt.verify(token, jwtKey, (err, decoded) => {
        if (err) {
            res.send("Sorry, this link has expired")
        } else {
            if (decoded.data.userType == "student") {
                run_query("UPDATE student SET active = True WHERE email = $1", [decoded.data.email], async(result) => {
                    req.session.user = decoded.data
                    req.session.userActive = true
                    res.redirect("/")
                })
            } else {
                run_query("UPDATE tutor SET active = True WHERE email = $1", [decoded.data.email], async(result) => {
                    req.session.user = decoded.data
                    req.session.userActive = true
                    req.session.tutor = true
                    res.redirect("/add-quals")
            })
            }
        }
    })
})

app.get("/", async(req, res) => {
    if (req.session.user) {
        if (req.session.userActive) {
            if (req.session.tutor) {
                res.render("add-quals.ejs", {
                })
            } else {
                res.render("home.ejs", {
                    prompt: ""
                })
            }
        } else {
            res.render("wait-email-confirm.ejs", {
                prevEmail: req.session.user
            })
        }
    } else {
        res.redirect("/login")
    }
})

app.get("/signout", async(req, res) => {
    req.session.user = null 
    req.session.activeUser = false
    res.redirect("/login")
})

app.get("/add-quals", async(req, res) => {
    if (req.session.user && req.session.tutor) {
        if (req.session.userActive) {
            res.render("add-quals.ejs")
        } else {
            res.render("wait-email-confirm.ejs", {
                prevEmail: req.session.user
            })
        }
    } else {
        res.redirect("/login")
    }
})

app.post("/", async(req, res) => {
    if (req.body.description, req.body.subject, req.body.grade) {
        const form = {
            studentEmail: req.session.user,
            question: req.body.description,
            subject: req.body.subject,
            levelName: req.body.grade,
        }
        axios.post(psURL + 'question', form, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }).then((response) => {
            res.sendStatus(200)
        }).catch((error) => {
            res.render("home.ejs", {
                prompt: "Sorry, there seem to be a problem. Please try again"
            })
        });
    } else {
        res.render("home.ejs", {
            prompt: "Uh oh, seems like you missed a spot."
        })
    }
})
// Asynchronously runs a Postgresql query
async function run_query(query, params, callback, errHandle = (error)=> {console.log(error)}){ 
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