# MyCdA.app

MyCdA.app lets you use data collected using a power meter, speed sensor and a cycling computer and
estimate your drag coefficient (CdA) and /or rolling resistance (crr). Compare data across different runs in order
to determine if an equipment or position change is beneficial or not.

## Demo

Click [here](https://mycdap.app) for a working demo.

## Features

* Upload and process Garmin .FIT files
* Analyze power, speed and elevation data
* View statistics by entire activity or for individual laps
* Analyze CdA and crr for by lap or manual selection from chart. 
* View virtual elevation chart, visually adjust CdA and crr and analyze results
* Record notes and equipment changes for specific segments
* Calculate air density by manual input or automatically based on current location
* Save CdA/crr analysis segments and view / edit later

## Screenshot Tour
<figure>
  <img src="static/images/screens/Login MyCdA app.png" alt="Activities Screen">
  <figcaption>Login screen.</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Upload MyCdA app.png" alt="Activities Screen">
  <figcaption>Activities List</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Activity Details MyCdA app.png" alt="Activity Details Screen">
  <figcaption>Home / Activity Details</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Summary Activity Details MyCdA app.png" alt="Activity Details Screen">
  <figcaption>Home / Activity Details with Segment Stats</figcaption>
</figure>

<figure>
  <img src="static/images/screens/CdA Analysis MyCdA app.png" alt="CdA Screen">
  <figcaption>CdA Analysis</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Calculator MyCdA app.png" alt="Activities Screen">
  <figcaption>CdA Analysis Air Density Calculator.</figcaption>
</figure>

## TODO

* Create FAQ / HOWTO section
* Calculate mean, CV across runs
* Include mechanical / drivetrain loss in VE calc
* Etc.
 
## Build Setup

```bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Configuration

In order to use the location based weather data pull you need to configure your app instance to connect to the OpenWeatherMap API. To do so follow these simple steps:

- Sample application configuration files are provided in the _config_ folder. Rename _sample.dev.env.js_ to _dev.env.js_ and _sample.prod.env.js_ to _prod.env.js_.
- Sign up for a free **OpenWeatherMap** account at https://openweathermap.org/api
- Once your account is set up, go into [API Keys](https://home.openweathermap.org/api_keys) and copy your API key.
- Configure **MyCdA.app** by editing the _config/prov.env.js_ or _config/dev/env.js_ files and inserting the API key copied in the previous text into the placeholder.
- Sign up for a free Google Firebase account at https://firebase.google.com/
- From the Firebase console, enable **Email/Password** authentication from the Authentication, Sign-in method tab.
- Obtain your firebase project keys and insert them in the env.js configuration file
  
```javascript
module.exports = merge(prodEnv, {
  NODE_ENV: `"development"`,
  OW_API_KEY: `"your open weather API key here"`,
  FB_API_KEY: `"Firebase API key here"`,
  FB_AUTH_DOMAIN: `"Firebase auth domain"`,
  FB_DATABASE_URL: `"Firebase database url"`,
  FB_PROJECT_ID: `"Firebase app name"`,
  FB_STORAGE_BUCKET: `"Firebase storage bucket"`,
  FB_MSG_SENDER_ID: `"Firebase sender id"`
});
```
## History

Under construction.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT
