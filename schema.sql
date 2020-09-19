DROP TABLE IF EXISTS city_data;
DROP TABLE IF EXISTS weather;

CREATE TABLE city_data
(
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude decimal,
  longitude decimal
);

CREATE TABLE weather
(
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  forecast VARCHAR(255),
  time VARCHAR(15),
  date_entered VARCHAR(255)
);

