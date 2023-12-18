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
const { run } = require('node:test');
const psURL = 'http://localhost:81'
const jwtKey = "vUL8qmXMqKwSSqUP_O_MRoYNd2taqRnumPc7UhgtX6jAjtgvsni02dbFEC7OlbMjyipUqQHpuzS9opSxZDTN9hiiPI3n_l7-Wo0dTysDLKtXndAvrsxTzkM0y9lk5mAoay9OT9jgJ54v0T8rtjVY4YwkctOO8bciVu_uvu_t_G0"
const multer  = require('multer')
const path = require('path');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Specify the directory where you want to save the files
    },
    filename: (req, file, cb) => {
        if (req.session.user && !req.session.tutor){
            // Keep the original file extension
            const originalExt = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + Date.now() + "-" + req.session.user + originalExt);
        }
    }, 
  });
  
const upload = multer({ storage: storage });

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

// Gets a list of all subjects and academic levels from the most updated DB
let subjects = [];
let academicLevels = []
run_query("SELECT * FROM subject;", [], (result)=> {
    subjects = result.rows
})
run_query("SELECT * FROM academic_level", [], (result)=> {
    academicLevels = result.rows
})

// Post request for a tutor and student trying to log in
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

// Get request for tutor and student accessing login page
app.get("/login", async (req, res) => {
    if (req.session.user) {
        req.session.destroy
    }
    res.render("login.ejs", {
        prompt: "",
        prevEmail: ""
    })
})

// Get request for tutor and student accessing sign-up page
app.get("/signup", async (req, res) => {
    if (req.session.user) {
        req.session.destroy
    }
    res.render("sign-up.ejs", {
        prompt: "",
        prevEmail: "",
        prevName: ""
    })
})

// Post request for student and tutor signing up a new account
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
                    html:  `<p> Hi, thank you for using our platform. Please follow the given link to verify your email </p>
                        <p> http://localhost:${port}/verify/${token} </p>
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

//Post request for student and tutor asking server to resend verification email
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

//Get request for student/tutor activating their account with the emailed link
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
                    res.redirect("/tutor")
                })
            }
        }
    })
})

//Serves landing page for student and tutor
app.get("/", async(req, res) => {
    if (req.session.user) {
        if (req.session.userActive) {
            if (req.session.tutor) {
                res.render("tutor/home.ejs")
            } else {
                res.render("student/home.ejs", {
                    subjects: subjects,
                    academicLevels: academicLevels,
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

//Serves signout page
app.get("/signout", async(req, res) => {
    res.redirect("/login")
})

//Serves add qualifications page for tutor
app.get("/add-quals", async(req, res) => {
    if (req.session.user && req.session.tutor) {
        if (req.session.userActive) {
            res.render("tutor/add-quals.ejs", {
                subjects: subjects,
                academicLevels: academicLevels,
                prompt: ""
            })
        } else {
            res.render("wait-email-confirm.ejs", {
                prevEmail: req.session.user
            })
        }
    } else {
        res.redirect("/login")
    }
})

//Uploads a question for a student
app.post("/", upload.any('imgs'), (req, res) => {
    if(req.session.user && !req.session.tutor) {
        img_path_string = "{"
        for (i=0; i < req.files.length; i++) {
            img_path_string += req.files[i].filename
            console.log(req.files[i])
            if (i+1 < req.files.length) {
                img_path_string += ","
            }
        }
        img_path_string += "}"
        if (req.body.description, req.body.subject, req.body.grade) {
            const form = {
                studentEmail: req.session.user,
                question: req.body.description,
                subject: req.body.subject,
                level: req.body.grade,
                img_path: img_path_string
            }
            axios.post(psURL + '/question', form, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }).then((response) => {
                res.sendStatus(200)
            }).catch((error) => {
                res.render("student/home.ejs", {
                    subjects: subjects,
                    academicLevels: academicLevels,
                    prompt: "Sorry, there seem to be a problem. Please try again"
                })
            });
        } else {
            res.render("student/home.ejs", {
                subjects: subjects,
                academicLevels: academicLevels,
                prompt: "Uh oh, seems like you missed a spot."
            })
        }
    } else {
        res.redirect("/login")
    }
})

// and makes tutor activ
app.post("/tutor/active", async(req, res)=> {
    if (req.session.tutor) {
        if (!req.session.searching) {
            const form = {
                tutorEmail: req.session.user
            }
            axios.post(psURL + '/active', form, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }).then((response) => {
                res.redirect("/tutor/searching")
            }).catch((error) => {
                res.render("tutor/home.ejs")
            });
        } else {
            res.redirect("/tutor/searching")
        }
    } 
})

//Adds qualification to a tutor
app.post("/add-quals", async(req, res)=> {
    if (req.session.user && req.session.tutor) {
        if (req.session.userActive) {
            insertQuery = "INSERT INTO qualification VALUES ((SELECT id FROM tutor WHERE email = $1), $2, $3);"
            run_query(insertQuery, [req.session.user, req.body.subject, req.body.grade], async(result)=> {
                res.render("tutor/add-quals.ejs", {
                    subjects: subjects,
                    academicLevels: academicLevels,
                    prompt: "Qualification has been added. We are now verifying it."
                })
            }, async(sqlError) =>{
                if (sqlError.code == "23505") {
                    res.render("tutor/add-quals.ejs", {
                        subjects: subjects,
                        academicLevels: academicLevels,
                        prompt: "Uh oh, it seems like you have already added this qualification."
                    })
                } else {
                    res.sendStatus(400)
                }
            })
        } else {
            res.render("wait-email-confirm.ejs", {
                prevEmail: req.session.user
            })
        }
    } else {
        res.redirect("/login")
    }
})

//Serves tutor's page of all available questions to chose from
app.get("/tutor-searching", async(req, res)=> {
    if (req.session.user && req.session.tutor) {
        if (req.session.userActive) {
            axios.get(psURL + '/questions/' + req.session.user, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }).then((response) => {
                selectQuery = "SELECT id, prompt, subject, name FROM question INNER JOIN academic_level" +
                " ON question.level = academic_level.level WHERE id in ("
                for (i = 0; i < response.data.length; i++) {
                    selectQuery += response.data[i] + ","
                }
                selectQuery += "-1);"

                run_query(selectQuery, [], async(result)=> {
                    test_result = []
                    for (i=0; i<100; i++) {
                        test_result.push(result.rows[0])
                    }
                    res.render("tutor/searching.ejs", {
                        data: test_result
                    })   
                }) 
            }).catch((error) => {
                res.render("tutor/home.ejs")
            });
        }
    } else {
        res.redirect("/login")
    }
})

//Serves a page for the tutor so select a question to help with
app.get("/pairing/:questionID", async(req, res)=> { 
    if (req.session.user && req.session.tutor) {
        if (req.session.userActive) {
            sqlQuery = "SELECT id, prompt, subject, name, img_path FROM question INNER JOIN academic_level" +
                " ON question.level = academic_level.level WHERE id = $1;"
            run_query(sqlQuery, [req.params.questionID], async(result)=>{
                res.render("tutor/select-question.ejs", {
                    id: result.rows[0].id,
                    prompt: result.rows[0].prompt,
                    subject: result.rows[0].subject,
                    grade: result.rows[0].name,
                    img_paths: result.rows[0].img_path
                })
            })
        } else {
            res.render("wait-email-confirm.ejs", {
                prevEmail: req.session.user
            })
        }
    } else {
        res.redirect("/login")
    }
})

//Serves the profile page for tutor and user
app.get("/profile", async(req, res)=>{
    if (req.session.user) {
        if (req.session.tutor) {
            run_query("SELECT * FROM qualification WHERE ")
            res.render("tutor/profile.ejs", {
                prompt: ""
            })
        } else {
            res.render("student/profile.ejs", {
                
            })
        }
    } else {
        res.redirect('/login')
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