const socket = io('http://localhost/');
const form = document.querySelector('form');
const messages = document.querySelector('#messages');
const input = document.querySelector('#messageInput');
const submit = document.querySelector('.submit');

const appendMessage = (message)=>{
    const messageElement = document.createElement('p');
    messageElement.innerText = message;
    messages.append(messageElement);
};

const client_name = prompt('what is your name');

console.log(roomNumber);

appendMessage(`You Joined room ${roomNumber}`);
// room TBD
socket.emit('new-user', {name: client_name, room: roomNumber});

socket.on('user-connected',(name)=>{
    appendMessage(`${name} Connected`);
});

socket.on('user-disconnected',(name)=>{
    appendMessage(`${name} Disconnected`);
});

socket.on('send-message',(data)=>{ //attatches send-message event to client, (listening for send-message)
    msg = data.message;
    sender_name = data.sender;
    appendMessage(`${sender_name}: ${msg}`);
});

form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(input.value){ //if defined
        socket.emit('chat-message', input.value); //emits chat message event to server, with the parameter of the input value
        appendMessage(`You: ${input.value}`);
        input.value = ''; //reset value to nothing after clicking
    };
});

