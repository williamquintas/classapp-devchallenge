var fs = require('fs');
var http = require('http');
var csv2json = require('./csv2json.js');

var csv = fs.readFileSync('input.csv', 'utf8');

var json = csv2json(csv);

var server = http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Fim da resposta');
});

server.listen(3000, '127.0.0.1');
