require('dotenv').config();
const express = require('express');
const axios = require('axios');
const massive = require('massive');
const { json } = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const strategy = require('./strategy');
const path = require('path');
const PORT = process.env.PORT || 4001;

const app = express();

// controllers
const eventsCtrl = require('./controllers/eventsCtrl');
const usersCtrl = require('./controllers/usersCtrl');
//

massive(process.env.CONNECTION_STRING)
  .then(dbInstance => {
    return app.set('db', dbInstance);
  })
  .catch(err => console.log(err));

app.use(json());
app.use(cors());
app.use(morgan('tiny'));

//Auth & Sessions

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 2 * 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(strategy);

passport.serializeUser((user, done) => {
  return done(null, user);
});

passport.deserializeUser((user, done) => {
  return done(null, user);
});

app.get('/login', (req, res, next) => {
  passport.authenticate('auth0', (err, user, info) => {
    const db = req.app.get('db');
    db.users.find({ auth_id: user.id }).then(([dbUser]) => {
      if (!dbUser) {
        db.users
          .insert({
            first_name: user.name.givenName,
            last_name: user.name.familyName,
            email: user.emails[0].value,
            session_id: req.session.id,
            auth_id: user.id,
            profile_image: user.picture
          })
          .then(newUser => {
            req.session.user = newUser;
            // return res.redirect("http://localhost:3000/#/setup");
            return res.redirect(process.env.REACT_APP_SETUP);
          });
      } else {
        req.session.user = dbUser;
        // return res.redirect("http://localhost:3000/#/main/feed");
        return res.redirect(process.env.REACT_APP_FEED);
      }
    });
  })(req, res, next);
});

app.get('/logout', (req, res, next) => {
  req.session = null;
  // res.redirect("http://localhost:3000");
  res.redirect(process.env.REACT_APP_HOMEPAGE);
});

//end of Auth & Session

//endpoints

//events
app.get('/api/events', eventsCtrl.getEvents);
app.get('/api/events/:id', eventsCtrl, getAnEvent);
app.post('/api/events', eventsCtrl.addEvent);
app.put('/api/events', eventsCtrl.updateEvent);
app.delete('/api/events', eventsCtrl.deleteEvent);
//users
app.get('/api/user', userCtrl.getCurrentUser);
app.get('/api/users', userCtrl.getUsers);
app.put('/api/user', userCtrl.updateUser);
//

app.listen(port, () => {
  console.log(`The server is listening at port`);
});
