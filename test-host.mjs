const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Host Connected!');
  socket.emit('identify-user', { email: 'host@test.com', name: 'HostDr' });
  
  setTimeout(() => {
    console.log('Hosting room...');
    socket.emit('host-game', { roomId: 'TEST12', hostName: 'HostDr', hostEmail: 'host@test.com' });
  }, 100);
});

socket.on('joined-room', (data) => console.log('Host Joined Room Event:', JSON.stringify(data, null, 2)));
socket.on('player-joined', (data) => console.log('Player Joined (Host side):', JSON.stringify(data, null, 2)));
socket.on('operator-selected', (data) => console.log('Host saw Op Selected:', JSON.stringify(data, null, 2)));
