var fs = require('fs');
var request = require('request');
var express = require('express');
var app = express();
app.use(express.urlencoded({extended: false}));

var port = process.env.PORT || 8080;
var outputToConsole = true;
var enableLogging = true;
var url = 'https://www.google.com';
var log = '';

var oldConsoleLog = console.log;
console.log = function(msg){
    if(outputToConsole) oldConsoleLog(msg);
    if(enableLogging) log = `<div><pre style='background-color:${msg.includes('status code')?'gainsboro':'wheat'}'>${new Date()}: ${msg.replace(/</g, '&lt;').replace(/>/g, '&glt;')}</pre></div>` + log;
};
app.use(function(req, res, next){
    if(req.path === '/p-changesettings' || req.path === '/p-initiatechange' ||
    req.path.slice(0, 6) === '/p-msg?' || req.path === '/p-msg' ||
    req.path === '/p-log' || req.path === '/p-logreset' ||
    req.path === '/p-quickpanel'){
        next();
        return;
    }else{
        req.pipe(request({method: req.method, url: url+req.path, gzip: true}, function(err, response, body){
            if(err){
                console.log('Error occurred while trying to fetch "'+url+req.path+'": '+err);
                res.status(500).send(err.toString());
                return;
            }
            console.log('From '+req.ip+' status code '+response.statusCode+': '+req.originalUrl);
            for(var c in response.headers){if(c.toLowerCase() === 'content-encoding') response.headers[c]='none'}
            response.headers['Content-Encoding'] = 'none';
            for(var c in response.headers){if(c.toLowerCase() === 'content-type') response.headers[c]=response.headers[c].split(';')[0]}
            res.set(response.headers);
            res.status(response.statusCode);
            
            res.send(body.replace(/:\/\/www\./, '://').replace(new RegExp(url, 'g'), req.protocol+'://'+req.headers.host));
        }));
    }
});
app.get('/p-changesettings', function(req, res){
    console.log('From '+req.ip+' accessed change settings page');
    fs.createReadStream('changesettings.html').pipe(res);
});
app.post('/p-initiatechange', function(req, res){
    if(!req.body.url){
        res.redirect('/p-msg?msg='+encodeURIComponent('No URL provided'));
    }else{
        console.log('Changed URL from '+url+' to '+req.body.url);
        url = req.body.url;
        res.redirect('/p-msg?msg='+encodeURIComponent('Successfully changed to '+url));
    }
});
app.get('/p-msg', function(req, res){
    if(!req.query.msg){
        res.send('Why u no put msg query');
    }else{
        res.send(req.query.msg);
    }
});
app.get('/p-log', function(req, res) {
    console.log('From '+req.ip+' accessed log');
    res.send(`<a href='/p-logreset'>Clear log</a>${log}`);
});
app.get('/p-logreset', function(req, res) {
    log = '';
    console.log('From '+req.ip+' reset log');
    res.send('Successfully cleared log');
});
app.get('/p-quickpanel', function(req, res) {
    console.log('From '+req.ip+' accessed quickpanel');
    fs.createReadStream('quickpanel.html').pipe(res);
});

app.listen(port, null, null, ()=>console.log('App listening on port '+port));