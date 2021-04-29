const express = require('express')
const app = express()

require('dotenv').config({path: './sample.env'}); 
const mongoose = require('mongoose')

const cors = require('cors')
const bodyParser = require('body-parser')

let uri = process.env.MONGO_URI;
mongoose.connect(uri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});
mongoose.set('useFindAndModify', false);


app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

let exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)

app.post('/api/users', function(request, response) {
  let newUser = new User({
      username: request.body.username
    });
  newUser.save( function(error, addedUser) {
    if(!error){
      let responseObject = {}
      responseObject['username'] = addedUser.username
      responseObject['_id'] = addedUser.id
      response.json(responseObject)
    }
  })
})

app.get('/api/users', function(request, response) {
  User.find({}, function(error, arrayOfUsers) {
    if(!error){
      response.json(arrayOfUsers)
    }
  })
  
})
app.post('/api/users/:_id/exercises', function(request, response) {

  let newSession = new Session({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  });

  if(newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0, 10)
  }

  User.findByIdAndUpdate(
    request.params._id,
    {$push : {log: newSession}},
    {new: true},
    function(error, updatedUser) {
      if(!error){
        let responseObject = {}
        responseObject['_id'] = updatedUser.id;
        responseObject['username'] = updatedUser.username;
        responseObject['date'] = new Date(newSession.date).toDateString();
        responseObject['description'] = newSession.description;
        responseObject['duration'] = newSession.duration;
        response.json(responseObject);
      }
      else{
        response.json({"error": "invalid Id"})
      }
      
    }
  )
});

app.post('/api/users/:_id/logs', (request, response) => {
  let fromm = request.body.from;
  let to = request.body.to;
  let limit = request.body.limit;
  let id = request.body.fromuserid;

  User.findById(id, function (error, result) {
    if(error){
      return response.json({"error": error});
    }
    if(fromm ||to){
      let fromDate = new Date()
      let toDate = new Date()

      if(fromm){
        fromDate = new Date(fromm)
      }
      if(to){
        toDate = new Date(to)
      }

      fromDate = fromDate.getTime()
      toDate = toDate.getTime()

      result.log = result.log.filter( 
          function(session){
          let date = new Date(session.date).getTime()
          return date >= fromDate && date <= toDate
        }
      );
    }

    if(limit){
      result.log = result.log.slice(0, limit)
    }

    result = result.toJSON()
    result['count'] = result.log.length;
    response.json(result)
  })
})

app.get('/api/users/:_id/logs', function(request, response) {
  
  User.findById(request.params._id, function(error, result) {
    if(!error){
      if(request.query.from || request.query.to){
        let fromDate = new Date()
        let toDate = new Date()
        if(request.query.from){
          fromDate = new Date(request.query.from)
        }
        if(request.query.to){
          toDate = new Date(request.query.to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        result.log = result.log.filter(function(session) {
          let sessionDate = new Date(session.date).getTime()
          
          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }
      
      if(request.query.limit){
        result.log = result.log.slice(0, request.query.limit)
      }
      
      result = result.toJSON()
      result['count'] = result.log.length
      response.json(result)
    }
  })
})