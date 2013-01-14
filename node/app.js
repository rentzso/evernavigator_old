var express = require('express');
var fs = require('fs');
var mongo = require('./mongoInterface');

var app = express();
app.use(express.logger());

app.use(express.static('public'));
app.set('views', __dirname + '/views');

app.engine('html', require('ejs').renderFile);

// render the main page sending the userId
app.get('/:userId', function(req, res){
    res.render('index.ejs', {userId: req.params.userId});
    res.end();
});


// get the json representing the userId graph
app.get('/graph/:userId', function(req, res){
    console.log("Received userId from client:", req.params.userId);
    mongo.NodeModel.buildUserGraph(req.params.userId, 
        function(error, content){
            if (error){
                res.send(404, error);
            } else {
                res.type('json');
                res.send(content);
            }
        }
    );
});

app.listen(3000);
console.log('Listening on port 3000');
