const express = require('express')	//import express module for using middleware and database libraries
const app = express()								// Calls the Express Function

require('dotenv').config({path: './sample.env'}); 	// Showing path to env file
const mongoose = require('mongoose')				// import mongoose for backend database

const cors = require('cors')						//CORS are basically a set of headers sent by the server to the browser.
const bodyParser = require('body-parser')			//Node. js body parsing middleware. It is responsible for parsing the incoming request bodies in a middleware before you handle it.

let uri = process.env.MONGO_URI;					// Get mongoose connection from env file;
mongoose.connect(uri, { 
  useNewUrlParser: true, 							// To ovecome: current URL string parser is deprecated, and will be removed in a future version. 
  useUnifiedTopology: true 							// avoid DeprecationWarning: option useUnifiedTopology to MongoClient.connect
});
mongoose.set('useFindAndModify', false);			//findOneAndUpdate() automatically uses findAndModify() instead, to overcome this false is set


app.use(cors())										//{	"origin": "*",  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",  "preflightContinue": false,  "optionsSuccessStatus": 204 }
app.use(bodyParser.urlencoded({ extended: false }));//false for querystring: flat data, simple algo; true for qs: complex algo; Both give same output
app.use(express.static('public'))					// Express, by default does not allow you to serve static files.(Static content is any content that can be delivered to an end user without having to be generated, modified, or processed. )  , Express looks up the files relative to the static directory, so the name of the static directory is not part of the URL.
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')		//To load the base page
});

const listener = app.listen(process.env.PORT || 5000, () => {				// Port at which the app runs
  console.log('Your app is listening on port ' + listener.address().port)
})
//Mongoose schema defines the structure of the document, default values, validators, etc.,
let exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})
//Mongoose model provides an interface to the database for creating, querying, updating, deleting records, etc.
let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)
//USE CASE 2
app.post('/api/users', function(request, response) {
  let newUser = new User({
      username: request.body.username					//from index.html
    });
  newUser.save( function(error, addedUser) {			//Save the new user created
    if(!error){							
      let responseObject = {}
      responseObject['username'] = addedUser.username
      responseObject['_id'] = addedUser.id
      response.json(responseObject)						//Display added user details in json format
    }
  })
})
//USE CASE 3
app.get('/api/users', function(request, response) {		//get request
  User.find({}, function(error, arrayOfUsers) {
    if(!error){
      response.json(arrayOfUsers)						//If No error, Display all the users and their excercise details
    }
  })
  
})
app.post('/api/users/:_id/exercises', function(request, response) {	//USE CASE 4

  let newSession = new Session({								//Add new excercise for User
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  });

  if(newSession.date === ''){									//If Date field is empty, add todays date
    newSession.date = new Date().toISOString().substring(0, 10)
  }

  User.findByIdAndUpdate(
    request.params._id,											//Get Id from index.html
    {$push : {log: newSession}},								//Pushes new excercise
    {new: true},												//Returns current updated data, by default it is set to false
    function(error, updatedUser) {
      if(!error){
        let responseObject = {}
        responseObject['_id'] = updatedUser.id;
        responseObject['username'] = updatedUser.username;
        responseObject['date'] = new Date(newSession.date).toDateString();	//Change Date to string format
        responseObject['description'] = newSession.description;
        responseObject['duration'] = newSession.duration;
        response.json(responseObject);							//added excercise details are shown in json format
      }
      else{
        response.json({"error": error})
      }
      
    }
  )
});
//USE CASE 5&6
app.get('/api/users/:_id/logs', function(request, response) {
  
  User.findById(request.params._id, function(error, result) {		//if(!result){response.json({"error": "Id donot exist"})}
    if(!error){
      if(request.query.from || request.query.to){				//If from or to details are mentioned
        let fromDate = new Date()
        let toDate = new Date()
        if(request.query.from){
          fromDate = new Date(request.query.from)				//Assigning from date in query to fromDate if exists
        }
        if(request.query.to){
          toDate = new Date(request.query.to)					//Assigning from date in query to fromDate if exists
        }

        fromDate = fromDate.getTime()							//convert date to time for easy calculation
        toDate = toDate.getTime()

        result.log = result.log.filter(function(session) {
          let sessionDate = new Date(session.date).getTime()
          
          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }
      
      if(request.query.limit){
        result.log = result.log.slice(0, request.query.limit)	//Negative value of limit set to 0
      }
      //console.log(result);
      result = result.toJSON()
	  //console.log(result);
      result['count'] = result.log.length
      response.json(result)
    }
    else
    {
        response.json({"error": error})							//Print error if exist in json form
    }
  })
})