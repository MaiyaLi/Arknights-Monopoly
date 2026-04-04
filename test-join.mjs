import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Joiner Connected!');
  socket.emit('identify-user', { email: 'joiner@test.com', name: 'JoinerDr' });
  
  setTimeout(() => {
    console.log('Joining room TEST... (assume Host made it)');
    socket.emit('join-game', { roomId: 'TEST', playerName: 'JoinerDr', playerEmail: 'joiner@test.com' });
  }, 100);
});

socket.on('joined-room', (data) => {
  console.log('Joiner Joined EVENT emitted perfectly.');
  setTimeout(() => {
    socket.emit('select-operator', { roomId: 'TEST', operator: { name: 'Exusiai', color: 'red' }, player: { id: socket.id, name: 'JoinerDr' }});
  }, 200);
});

socket.on('error', (err) => console.log('ERROR:', err));
socket.on('operator-selected', (data) => {
  console.log('Joiner saw operator-selected! IT WORKS.');
  process.exit(0);
});
