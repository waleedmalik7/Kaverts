const express = require('express')
const app = express()
const http = require("http")
const port = 81
const { Pool } = require('pg')
const ActiveTutor = require("./psClasses.js")
const pool = new Pool({
    user: 'ps_login',
    host: 'localhost',
    database: 'Kaverts',
    password: "7i%9iU>a48,^",
    port: 5432,
})
app.use(express.urlencoded({ extended: true}))

var activeTutors = {}

/**
 * Student posts a question into the forum
 */
app.post("/question", (req, res) => {
    sqlInsert = "INSERT INTO question (student_id, prompt, subject, level, status) VALUES ($1, $2, $3, $4, False) RETURNING id;"
    sqlParams = [req.body.student, req.body.question, req.body.subject, req.body.level]
    run_query(sqlInsert, sqlParams, (result) => {
        questionId = result.rows[0].id
        for (const [key, tutor] of Object.entries(activeTutors)) {
            for (let j = 0; j < tutor.quals.length; j++) {
                if (tutor.quals[j][0] == req.body.subject && tutor.quals[j][1] > req.body.level) {
                    tutor.questions.push(questionId)
                }
            }
        }
        res.sendStatus(200)
    }, (err)=> {
        console.log(err)
        res.sendStatus(404)
    });
})

/**
 * Tutor gets list of questions assigned to them
 */
app.get("/questions", (req, res) => {
    tutorID = req.body.tutorId
    if (activeTutors.tutorId) {
        res.json(activeTutors.tutorID.questions)
    } else {
        res.sendStatus(404)
    }
})

/**
 * Tutors lets server know they are actively looking for question
 */
app.post("/active", (req, res) => {
    run_query("SELECT * FROM qualification WHERE tutor_id = $1;", [req.body.tutorId], (result) => {
        if (result.rows.length > 0) {
            quals = []
            for (var i = 0; i < result.rows.length; i++) {
                quals.push([result.rows[i].subject_name, parseInt(result.rows[i].subject_level)])
            }
            tutorID = req.body.tutorId
            activeTutors.tutorID = new ActiveTutor(tutorID, quals)
            res.sendStatus(200)
        } else {
            res.status(303).send("Please add qualifications.")
        }
    })
})


/**
 * Tutors lets server know they are are no longer actively looking for question
 */
app.post("/deactive", (req, res) => {
    tutorID = req.body.tutorId 
    if (activeTutors.tutorID) {
        delete activeTutors.tutorID
        res.sendStatus(200)
    } else {
        res.sendStatus(404)
    }
})

/**
 * Run http server
 */
http.createServer(app).listen(port, () => {
    console.log("listening on port: " + port)  
})

// Asynchronously runs a Postgresql query
async function run_query(query, params, callback, errHandle = (error) => {console.log(error); res.sendStatus(404);}){ 
    try {
        const result = await pool.query(query, params);
        callback(result)
    } catch (error) {
        errHandle(error)
    }
}
