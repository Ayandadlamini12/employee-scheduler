const express = require("express")
const app = express()

app.use(express.json())

app.get("/", (req,res)=>{
    res.send("Employee Scheduler API Running")
})

app.listen(4000, ()=>{
    console.log("Backend running on port 4000")
})
