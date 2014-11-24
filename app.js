'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var request = require('request');
var url = require('url');

// start static serving
app.use(express.static(__dirname + '/./'));

// CORS server
app.get(/^\/cors\/(.+)$/, function(req, res) {
  var pathname = url.parse(req.url).pathname;
  var uri = decodeURIComponent(pathname.replace(/^\/cors\/(.+)$/, '$1'));
  res.setHeaders = {
    'access-control-allow-methods': 'HEAD, POST, GET, PUT, PATCH, DELETE',
    'access-control-max-age': '86400',
    'access-control-allow-credentials': 'true',
    'access-control-allow-origin': req.headers.origin || '*'
  };
  try {
    var headers = req.headers;
    var options = {
      url: uri,
      headers: headers
    };
    options.headers.referer = 'https://www.youtube.com/watch';
    delete options.headers.host;
    request.get(options).pipe(res);
  } catch(e) {
    res.statusCode = 404;
    res.send('Error 404 File not found.');
  }
});

// start the server
var port = process.env.PORT || 5000;
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);