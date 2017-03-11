const net = require('net');
const process = require('process');
const readline = require('readline');
const dgram = require('dgram');
const udpClient = dgram.createSocket('udp4');
const udpClientSend = dgram.createSocket('udp4');

const HOST = '127.0.0.1';
const PORT = 6969;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var client = new net.Socket();
client.on('data', (data) => {
    console.log(data.toString());
}).on('close', () => {
    console.log('Connection closed');
}).connect(PORT, HOST, function() {
    console.log(`Connected to: ${HOST}:${PORT}`);
    
    udpClient.on('error', (err) => {
      console.log(`server error:\n${err.stack}`);
      udpClient.close();
    }).on('message', (msg, rinfo) => {
      console.log(`UDP/${msg.toString()}`);
    });
    udpClient.bind(parseInt(client.address().port),client.address().address);
});


rl.on("line", (input) => {
    if(input === "-exit"){
        client.destroy();
        process.exit();
    }
    else if(input.substr(0,2) === "-M"){
      let msg = input.substr(2);
      udpClient.send(msg, PORT, HOST, (err) => {
        if(err !== null){
          console.log(err);
          udpClient.close();
        }
      });
    }
    else{
        client.write(input);
    }
});