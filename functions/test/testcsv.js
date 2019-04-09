const CSV = require ('../csv');
const fs = require('fs');

fs.readFile('mytest.csv', "utf8", (err, content) => {
  if (err) {
    console.log(err);
  } else {
    let csv = new CSV();
    csv.parse(content.replace(/^\uFEFF/, ''), (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(JSON.stringify(data)) 
      }
    });
  }
});