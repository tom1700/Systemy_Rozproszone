const cluster = require('cluster');
const net = require('net');
const dgram = require('dgram');
const udpServer = dgram.createSocket('udp4');

const HOST = '127.0.0.1';
const PORT = 6969;

if (cluster.isMaster) {
  //---------------------------------------Master process code------------------------------------------------------
  let workers = {};
  let numberOfWorkers = 0;
  console.log(`Master ${process.pid} is running`);

  //TCP server
  net.createServer().on("connection", (sock) => {
    if( numberOfWorkers < 30 ) {
      let key = `${sock.remoteAddress}:${sock.remotePort}`;
      console.log(`Connection accepted from: ${key}`);
      workers[key] = cluster.fork();
      numberOfWorkers++;
      workers[key].send('socket', sock);

      workers[key].on("disconnect", () => {
        workers[key].kill();
        numberOfWorkers--;
        delete workers[key];
      }).on("message", (msg) => {
        for ([k,v] of Object.entries(workers)){
          if(k !== key){
            v.send(msg);
          }
        }
      });
    }
    else{
      console.log(`Connection refused from: ${sock.remoteAddress}:${sock.remotePort}`);
    }
  }).on("close", () => {
    console.log("Server Closed");
  }).listen(PORT, HOST);
  console.log(`TCP server listening on ${HOST}:${PORT}`);

  
  //Udp server
  udpServer.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    udpServer.close();
  }).on('message', (msg, rinfo) => {
    let key = `${rinfo.address}:${rinfo.port}`;
    if(workers[key]){
      for ([k,v] of Object.entries(workers)){
        if(k !== key){
          udpServer.send(msg, parseInt(k.split(":")[1]), k.split(":")[0], (err) => {
            if(err !== null){
              udpServer.close();
            }
          });
        }
      }
    }
  }).on('listening', () => {
    var address = udpServer.address();
    console.log(`UDP server listening ${address.address}:${address.port}`);
  }).bind(PORT, HOST);

}
else {
  //---------------------------------------Child process code------------------------------------------------------
  let socket;
  let nick;
  let udpServ;

  new Promise((resolve, reject) => {
    process.on("message", (m, data) => {
      if(m === 'socket') {
        socket = data;
        resolve();
      }
    }).on("error", () => {
      reject();
    });
  }).then(() => {
    process.on("message", (m, data) => {
      socket.write(m);
    });

    socket.write('Choose your nick');
    socket.on('data', (data) => {
        if(nick) {
            process.send(`${nick}: ${data}`);
        }
        else {
            nick = data.toString();
            console.log(`Client ${nick} added`);
            socket.write(`You are logged in ${nick}. You can start conversation.`);
        }
    }).on("error", (error) => {
      console.error(error);
    }).on('close', () => {
        console.log(`Client ${nick} removed`);
        process.disconnect();
    });
  });
}