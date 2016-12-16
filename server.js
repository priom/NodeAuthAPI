var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');
var config = require('./config/main');
var User = require('./app/models/user');
var jwt = require('jsonwebtoken');

app = express();

// use bodyparser to get POST requests
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

// log request to console
app.use(morgan('dev'));

// init passport
app.use(passport.initialize());

mongoose.connect(config.database);

// bring passport strategy
require('./config/passport')(passport);

// create API group routes
var apiRoutes = express.Router();

// register new user route
apiRoutes.post('/register', function (req, res) {
   if (!req.body.email || !req.body.password) {
       res.json({ success: false, message: 'Please enter your email and password to register'});
   } else {
       var newUser = new User ({
           email: req.body.email,
           password: req.body.password
       });

       // save new user
       newUser.save(function (err) {
           if (err) {
               return res.json({ success: false, message: 'That email already exists' });
           }
           res.json({ success: true, message: 'Successfully created user' });
       });
   }
});

// authenticate user and get JWT
apiRoutes.post('/authenticate', function (req, res) {
   User.findOne({
       email: req.body.email
   }, function (err, user) {
       if (err) throw err;

       if (!user) {
           res.send({ success: false, message: 'Authentication failed. User not found.' });
       } else {
           // check if password matches
           user.comparePassword(req.body.password, function (err, isMatch) {
               if (isMatch && !err) {
                   // create token
                   var token = jwt.sign(user, config.secret, {
                       expiresIn: 10000     // in seconds
                   });
                   res.json({ success: true, token: 'JWT ' + token });
               } else {
                   res.send({ success: false, message: 'Authentication failed. Password did not match.' });
               }
           });
       }
   });
});

// protect dashboard with jwt
apiRoutes.get('/dashboard', passport.authenticate('jwt', { session: false }), function (req, res) {
   res.send('Works! User id is: ' + req.user._id);
});

// set url for API group routes
app.use('/api', apiRoutes);

app.get('/', function(req, res) {
    res.send('Home');
});

var port = 3030;

app.listen(port);
console.log('Running on port '+ port);
