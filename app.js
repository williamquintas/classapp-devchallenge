//Requirements
var express = require('express');
var path = require('path');
var fs = require('fs');
var csv2json = require('./csv2json.js');
var formidable = require('formidable');

var app = express();
//set up templates
app.set('view engine', 'ejs');
//static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.render('csv2json', {json: "JSON will appear here..."});
})

app.post('/upload', function(req, res){

  // create an incoming form object
  var form = new formidable.IncomingForm();

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, 'input.csv'));
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    var csv = fs.readFileSync('input.csv', 'utf8');
    var json = csv2json(csv);
    res.render('./csv2json', {json:json});
  });

  // parse the incoming request containing the form data
  form.parse(req);
});




app.listen(process.env.PORT || 8080);
