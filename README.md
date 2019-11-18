# MyCdA.app

MyCdA.app lets you use data collected using a power meter, speed sensor and a cycling computer and
estimate your drag coefficient (CdA) and /or rolling resistance (crr). Compare data across different runs in order
to determine if an equipment or position change is beneficial or not.

## Demo

Click [here](https://mycda.app) for a working demo.

## Features

* Upload and process Garmin .FIT and .CSV files
* Analyze power, speed and elevation data using an interactive chart and activity map
* View statistics by entire activity or for individual laps
* Detect loops in activity GPS track.
* Analyze CdA and crr for by lap or manual selection from chart. Identify loops and use loop start / end markings to align Virtual Elevation profile.
* View virtual elevation chart, visually adjust CdA and crr and analyze results
* Include air speed in VE calculations (through CSV import)
* Support for drivetrain / friction loss adjustments.
* Record notes and equipment changes for specific segments
* Calculate air density by manual input or automatically based on current GPS location altitude adjusted
* Save CdA/crr analysis segments and view / edit later
* Designate segments as baseline segments
* Compare segments to baseline showing % CdA, Watts Saved and Seconds/40k
* Calculate Mean, Std. Dev and CV across all segments

## Screenshot Tour
<figure>
  <img src="static/images/screens/MyCdA app.png" alt="Landing Page">
  <figcaption>Landing page</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Login MyCdA app.png" alt="Login Screen">
  <figcaption>Login screen</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Upload MyCdA app.png" alt="Activities Screen">
  <figcaption>Activities List</figcaption>
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
  <img src="static/images/screens/CdA Analysis Loop Detection MyCdA app.png" alt="CdA Screen">
  <figcaption>CdA Analysis Loop Detection</figcaption>
</figure>

<figure>
  <img src="static/images/screens/CdA Analysis Loop Settings MyCdA app.png" alt="CdA Screen">
  <figcaption>CdA Analysis Loop Detection Settings</figcaption>
</figure>

<figure>
  <img src="static/images/screens/Calculator MyCdA app.png" alt="Activities Screen">
  <figcaption>CdA Analysis Air Density Calculator.</figcaption>
</figure>

## TODO

* Segment splitting. This feature will allow to split loops into out and back segments and average individual splits CdA. This should allow analysis for courses where braking cannot be avoided or out and back time trial course etc.
 
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

# deploy to Firebase project (create and initialize a new Firebase project)
firebase deploy
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Configuration

In order to use the location based weather data pull you need to configure your app instance to connect to the OpenWeatherMap API. To do so follow these simple steps:

- Sample application configuration files are provided in the _config_ folder. Rename _sample.dev.env.js_ to _dev.env.js_ and _sample.prod.env.js_ to _prod.env.js_.
- Sign up for a free **OpenWeatherMap** account at https://openweathermap.org/api
- Once your account is set up, go into [API Keys](https://home.openweathermap.org/api_keys) and copy your API key.
- Configure **MyCdA.app** by editing the _config/prov.env.js_ file and inserting the API key copied in the previous text into the placeholder.
- Sign up for a free Google Firebase account at https://firebase.google.com/
- From the Firebase console, enable **Email/Password** authentication from the Authentication, Sign-in method tab.
- Obtain your firebase project keys and insert them in the env.js configuration file
- Obtain a Google Maps API key and insert key into the configuration file.
  
```javascript
module.exports = merge(prodEnv, {
  NODE_ENV: `"development"`,
  OW_API_KEY: `"your open weather API key here"`,
  FB_API_KEY: `"Firebase API key here"`,
  FB_AUTH_DOMAIN: `"Firebase auth domain"`,
  FB_DATABASE_URL: `"Firebase database url"`,
  FB_PROJECT_ID: `"Firebase app name"`,
  FB_STORAGE_BUCKET: `"Firebase storage bucket"`,
  FB_MSG_SENDER_ID: `"Firebase sender id"`,
  GOOGLE_MAPS_API_KEY: `"Google Maps API key"`
});
```
## History

Visit the [Community](https://groups.google.com/forum/#!forum/mycda) page for a list of build release notes.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT
'
