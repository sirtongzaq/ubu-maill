// startServer.js

const { spawn } = require('child_process');

// Start WebSocket server
const websocketServer = spawn('node', ['websocketServer.js']);

websocketServer.stdout.on('data', (data) => {
  console.log(`WebSocket Server: ${data}`);
});

websocketServer.stderr.on('data', (data) => {
  console.error(`WebSocket Server Error: ${data}`);
});

websocketServer.on('close', (code) => {
  console.log(`WebSocket Server exited with code ${code}`);
});

// Start Kafka server (if it's not already running as a separate service)
const kafkaServer = spawn('bin/kafka-server-start.sh', ['config/server.properties']);

kafkaServer.stdout.on('data', (data) => {
  console.log(`Kafka Server: ${data}`);
});

kafkaServer.stderr.on('data', (data) => {
  console.error(`Kafka Server Error: ${data}`);
});

kafkaServer.on('close', (code) => {
  console.log(`Kafka Server exited with code ${code}`);
});
