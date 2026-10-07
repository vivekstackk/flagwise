const { EventSource } = require('eventsource');
const es = new EventSource('http://localhost:3000/stream');

es.onmessage = (event) => {
  console.log('Flag changed:', JSON.parse(event.data));
};

console.log('Watching for flag changes... (Ctrl+C to stop)');