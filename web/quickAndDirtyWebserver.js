var connect = require('connect');
var argv = require('optimist') // https://github.com/substack/node-optimist
    .usage('Usage: $0 --root [root folder]')
    .demand([ 'root' ])
    .alias('root', 'r')
    .argv; 

connect.createServer(
    connect.static(argv.root)
).listen(8080);