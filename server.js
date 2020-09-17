'use strict'
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();

app.use(cors());

const PORT = process.env.PORT;

app.get('/', getHomePage);
app.get('/location', getLocation);
app.get('/yelp', getYelp);
app.use('*', notFoundHandler);


function getHomePage(req, res) {
  res.status(200).send('Home Page Good');
}
function notFoundHandler(req, res) {
  res.status(404).send('That doesnt work. Try something else');
}
app.use((err, req, res, next) => {
  res.status(500).send(`Server Error: ${err.message}`);
});

function getLocation(req, res) {
  let url = `https://us1.locationiq.com/v1/search.php`;

  let queryObject = {
    key: process.env.GEOCODE_API_KEY,
    city: req.query.city,
    format: 'json',
    limit: 1
  };

  superagent.get(url).query(queryObject)
    .then(info => {
      let data = info.body[0];
      let location = {
        latitude: data.lat,
        longitude: data.lon,
        name: data.display_name
      };
      res.status(200).json(location);
    })
    .catch(err => {
      throw new Error(err.message);
    })
}

function getYelp(req, res) {
  // get the lat/lon/location from req.query (?=&=)
  let lat = req.query.lat;
  let lon = req.query.lon;
  let location = req.query.location;

  // Make a URL
  let url = 'https://api.yelp.com/v3/businesses/search';

  // Query Object
  let queryObject = {
    location: location,
  }

  // Superagent Request
  // add a header to it
  superagent.get(url)
    .query(queryObject)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(response => {
      console.log(response.body);
      res.status(200).json(response.body);
    })
    .catch(err => {
      console.error(err);
      throw new Error(err.message);
    });
}






function makeAnErrorHappen(req, res) {
  throw new Error("Whoopsie");
}

app.listen(PORT, () => {
  console.log('Server is listening on port', PORT)
});