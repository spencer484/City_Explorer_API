'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.log(err));

app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/trails', trailsHandler);
app.get('/movies', moviesHandler);
app.get('/yelp', yelpHandler);

function locationHandler(request, response) {
  const city = request.query.city;
  // Check database for city
  let checkForCity = 'SELECT * FROM city_data WHERE search_query = $1;';
  let safeValue = [city];
  client.query(checkForCity, safeValue)
    .then(callback => {
      if (callback.rowCount) {
        console.log('checking database');
        response.status(200).send(callback.rows[0]);
      } else {
        const key = process.env.GEOCODE_API_KEY;
        const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;
        superagent
          .get(url)
          .then(superAgentResults => {
            let returnObj = new Location(city, superAgentResults.body[0]);
            console.log('checking superagent');
            // Add new city from superagent to database
            let sqlQuery = 'INSERT INTO city_data (search_query, formatted_query,latitude, longitude) VALUES ($1, $2, $3, $4);';
            let safeValue = [returnObj.search_query, returnObj.formatted_query, returnObj.latitude, returnObj.longitude];
            client.query(sqlQuery, safeValue).catch(err => console.log(err));
            response.status(200).send(returnObj);
          }).catch(err => error(err, response));
      }
    })
}

function weatherHandler(request, response) {
  let sqlString = "SELECT * FROM weather WHERE search_query = $1;"
  let safeValue = [request.query.search_query]
  client.query(sqlString, safeValue).then(resultsFromDataBase => {

    if (resultsFromDataBase.rows.length > 0) {
      console.log(resultsFromDataBase);
      if (Date.now() - 86400 < parseInt(resultsFromDataBase.rows[0].date_entered)) {
        response.status(200).send(resultsFromDataBase.rows)
      } else {
        let sqlString = "DELETE * FROM weather WHERE search_query = $1;"
        let safeValue = [request.query.search_query];
        client.query(sqlString, safeValue).then(() => {
          const url = `https://api.weatherbit.io/v2.0/forecast/daily`
          const queryParams = {
            lat: request.query.latitude,
            lon: request.query.longitude,
            key: process.env.WEATHER_API_KEY
          }
          superagent.get(url).query(queryParams)
            .then(results => {
              const returnObj = results.body.data.map(day => new Weather(day));
              returnObj.forEach(callback => {
                let sqlString = "INSERT INTO weather (search_query, forecast, time, date_entered) VALUES ($1, $2, $3, $4);";
                let safeValues = [request.query.search_query, callback.forecast, callback.time, Date.now()]
                client.query(sqlString, safeValues)
              })
              response.status(200).send(returnObj);
            }).catch(err => error(err, response));
        })
      }

    } else {
      const url = `https://api.weatherbit.io/v2.0/forecast/daily`
      const queryParams = {
        lat: request.query.latitude,
        lon: request.query.longitude,
        key: process.env.WEATHER_API_KEY
      }
      superagent.get(url).query(queryParams)
        .then(results => {
          const returnObj = results.body.data.map(day => new Weather(day));
          returnObj.forEach(callback => {
            let sqlString = "INSERT INTO weather (search_query, forecast, time, date_entered) VALUES ($1, $2, $3, $4);";
            let safeValues = [request.query.search_query, callback.forecast, callback.time, Date.now()]
            client.query(sqlString, safeValues)
          })
          response.status(200).send(returnObj);
        }).catch(err => error(err, response));
    }
  })
}

function trailsHandler(request, response) {
  const queryParams = {
    lat: request.query.latitude,
    lon: request.query.longitude,
    key: process.env.HIKING_API_KEY
  }
  const url = `https://www.hikingproject.com/data/get-trails`;
  superagent.get(url).query(queryParams)
    .then(results => {
      const returnObj = results.body.trails.map(trail => new Trail(trail));
      response.status(200).send(returnObj);
    }).catch(err => error(err, response));
}

function moviesHandler(request, response) {
  const url = 'https://api.themoviedb.org/3/search/movie/';
  const queryParams = {
    api_key: process.env.MOVIE_API_KEY,
    query: request.query.search_query
  };
  superagent.get(url)
    .query(queryParams)
    .then(movieResults => {
      const movieArray = movieResults.body.results
        .map(movieObj => new Movie(movieObj));
      response.status(200).send(movieArray);
    }).catch(err => error(err, response));
}

function yelpHandler(request, response) {
  const key = process.env.YELP_API_KEY;
  const page = request.query.page;
  const numPerPage = 5;
  const start = (page - 1) * numPerPage;
  const url = 'https://api.yelp.com/v3/businesses/search';
  const queryParams = {
    latitude: request.query.latitude,
    longitude: request.query.longitude,
    categories: 'food',
    offset: start,
    limit: numPerPage
  };
  superagent.get(url).set('Authorization', `Bearer ${key}`)
    .query(queryParams).then(query => {
      const restaurantArray = query.body.businesses
        .map(business => new Restaurant(business));
      response.status(200).send(restaurantArray);
    }).catch(err => error(err, response));
}

function Location(searchQuery, obj) {
  this.search_query = searchQuery;
  this.formatted_query = obj.display_name;
  this.latitude = obj.lat;
  this.longitude = obj.lon;
}

function Weather(obj) {
  this.forecast = obj.weather.description;
  this.time = new Date(obj.datetime).toLocaleDateString();
}

function Trail(obj) {
  this.name = obj.name;
  this.location = obj.location;
  this.length = obj.length;
  this.stars = obj.stars;
  this.star_votes = obj.starVotes;
  this.summary = obj.summary;
  this.trail_url = obj.url;
  this.conditions = obj.conditionDetails;
  this.condition_date = (new Date(obj.conditionDate)).toLocaleDateString();
  this.condition_time = (new Date(obj.conditionDate)).toLocaleTimeString();
}

function Movie(obj) {
  this.title = obj.original_title,
    this.overview = obj.overview,
    this.average_votes = obj.vote_average,
    this.total_votes = obj.vote_count,
    this.image_url = `https://image.tmdb.org/t/p/w500${obj.poster_path}`,
    this.releasedOn = obj.release_date
}

function Restaurant(obj) {
  this.name = obj.name,
    this.image_url = obj.image_url,
    this.price = obj.price,
    this.rating = obj.rating,
    this.url = obj.url
}

// 500 error message
function error(err, response) {
  console.log('ERROR', err);
  response.status(500).send('Hmmm, something isn\'t working');
}

// 404 error message
app.get('*', (request, response) => {
  response.status(404).send('Sorry, this route does not exist');
})

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`);
    })
  }).catch((err) => {
    console.log(err);
  })

// app.listen(PORT, () => {
//   console.log(`listening on ${PORT}`);
// })