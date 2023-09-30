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


app.use(session({
    secret: "Jb0FVuOuTz",
    cookie: {maxAge: 2*24*60*60*1000},
    resave: false, 
    saveUninitialized: false
}))

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
                if (result.error.code == '23505') {
                    res.render("sign-up.ejs")
                }
            } else {
                let token = jwt.sign({data: email}, jwtKey, { expiresIn: '10m' } ); 
                let mailConfig = {
                    from: "kaverts.emailer@gmail.com",
                    to: email,
                    subject: 'Email Verification',
                    text:  `Hi, thank you for using our platform. Please follow the given link to verify your email 
http://localhost:${port}/verify/${token}. 
Hope you enjoy!` 
                };
                transporter.sendMail(mailConfig, (err) => {
                    if (err) {
                        console.log(err)
                    }
                    else {
                        // res.render("waitEmailConfirm.ejs")
                    }
                })

            }
        })
    } else {
        //email is not valid
    }

})

app.get("/verify/:token", async(req, res) => {
    let token = req.params.token
    jwt.verify(token, jwtKey, (err, decoded) => {
        if (err) {
            console.log(err)
        } else {
            run_query("UPDATE student SET active = True WHERE email = $1", [decoded.data], async(result) => {
                if (result.error) {
                    console.log(result.error)
                } else {
                    // res.render("main", {
                    //     id: ""
                    // })
                }
            })
        }
    })
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