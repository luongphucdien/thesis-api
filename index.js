const express = require("express")
const cors = require("cors")
const axios = require("axios")
const { auth, db, storage } = require("./firebase")
const { signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } = require("firebase/auth")
const { ref: dbRef, get, child, set, remove } = require("firebase/database")
const { ref: stRef, uploadBytes, uploadString } = require("firebase/storage")
require("dotenv").config()

const app = express()

const corsOptions = {
    origin: process.env.ORIGIN_URL,
    credenial: true,
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.get("/", (req, res) => {
    res.send("Success!")
})

const storageRef = stRef(storage)
const databaseRef = dbRef(db)

app.post("/api/users", async (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const base64Email = req.body.base64Email

    await set(dbRef(db, `test/${base64Email}`), {
        email: email,
        password: password
    })

    await createUserWithEmailAndPassword(auth, email, password).then((userCredential) => {
        res.json({code: axios.HttpStatusCode.Ok})
    }).catch((error) => {
        res.json({errorCode: error.code, message: error.message})
    })
})

app.post("/api/user/:email", async (req, res) => {
    const email = req.body.email
    const password = req.body.password

    await signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
        const user = userCredential.user
        user.getIdToken(true).then(token => {
            res.json({code: axios.HttpStatusCode.Ok, userToken: token})
        })
    }).catch((error) => {
        res.json({code: error.code, message: error.message})
    })
})

app.get("/api/users/:email", async (req, res) => {
    const base64Email = req.params.email
    const email = Buffer.from(base64Email, "base64").toString("utf-8")

    await get(child(databaseRef, `users/${base64Email}`)).then((value) => {
        if (value.exists()) {
            res.json({code: axios.HttpStatusCode.Ok, message: `User existed! | ${email}`})
        } else {
            res.json({code: axios.HttpStatusCode.NotFound, message: `User not existed! | ${email}`})
        }
    }).catch(error => res.json({code: error.code, message: error.message, fullError: error}))
})

app.post("/api/user/:email/project/:project", async (req, res) => {
    const base64Email = req.params.email
    const projName = req.params.project

    await set(dbRef(db, `users/${base64Email}/projects/${projName}`), req.body).then(() => {
        res.json({code: axios.HttpStatusCode.Ok, message: "Upload successfully!"})
    }).catch((error) => {
        res.json({code: error.code, message: error.message})
    })
})

app.get("/api/user/:email/projects", async (req, res) => {
    const userUID = req.params.email

    await get(child(databaseRef, `users/${userUID}/projects`)).then((value) => {
        res.json({code: axios.HttpStatusCode.Ok, projects: value.val()})
    }).catch((error) => {
        res.json({code: error.code, message: error.message})
    })
})

app.delete("/api/user/:userUID/project/:name", async (req, res) => {
    const userUID = req.params.userUID
    const projName = req.params.name

    await remove(dbRef(db, `users/${userUID}/projects/${projName}`))
})

app.post("/api/user/:userUID/project/:name/objects", async (req, res) => {
    const userUID = req.params.userUID
    const projName = req.params.name

    const userRoomRef = child(databaseRef, `users/${userUID}/projects/${projName}/room/objects`)

    await set(userRoomRef, req.body).then(() => {
        res.json({code: axios.HttpStatusCode.Ok})
    }).catch((error) => {
        res.json({code: error.code, message: error.message})
    })
})

app.listen(process.env.PORT)

module.exports = app