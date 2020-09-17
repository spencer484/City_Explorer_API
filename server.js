'use strict'

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

const app = express();

app.use(cors());

const PORT = process.env.PORT;

function handleHomePage(req, res) {
  res.status(200).send('Home Page Good');
}

app.listen(PORT, () => {
  console.log('Server is listening on port,' PORT)
});