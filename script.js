// No Firebase - using custom backend

// UI Functions
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
let isResizing = false;

resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'col-resize'; });
document.addEventListener('mousemove', (e) => { if (isResizing && e.clientX >= 300 && e.clientX <= 600) sidebar.style.width = e.clientX + 'px'; });
document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; });

function openChat(userName) {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
    document.getElementById('chatUserName').textContent = userName;
    window.currentChat = userName.replace(/\s+/g, '_').toLowerCase();
    
    // Load chat history
    if (window.loadMessages) {
        window.loadMessages(window.currentChat);
    }
}

document.getElementById('messageInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
document.querySelector('.profile-avatar')?.addEventListener('click', () => document.getElementById('profilePanel').classList.add('active'));
function closeProfile() { document.getElementById('profilePanel').classList.remove('active'); }
function showStatus() { alert('Status feature - Coming soon!'); }
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', function() { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); this.classList.add('active'); }));

// WebRTC
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
let peerConnection = null;
let dataChannel = null;
let currentRoomCode = null;
let roomRef = null;

function toggleFabMenu() { document.getElementById('roomModal').classList.add('active'); }
function closeRoomModal() { document.getElementById('roomModal').classList.remove('active'); document.getElementById('createView').style.display = 'none'; document.getElementById('joinView').style.display = 'none'; document.querySelector('.modal-options').style.display = 'grid'; }
function generateRoomCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function showJoinRoom() { document.querySelector('.modal-options').style.display = 'none'; document.getElementById('joinView').style.display = 'block'; }
function backToOptions() { document.getElementById('joinView').style.display = 'none'; document.getElementById('createView').style.display = 'none'; document.querySelector('.modal-options').style.display = 'grid'; }
function copyRoomCode() { navigator.clipboard.writeText(currentRoomCode); alert('Room code copied!'); }
function shareLink() { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`); alert('Link copied!'); }

async function createRoom() {
    currentRoomCode = generateRoomCode();
    document.querySelector('.modal-options').style.display = 'none';
    document.getElementById('createView').style.display = 'block';
    document.getElementById('roomCodeDisplay').textContent = currentRoomCode;
    document.getElementById('waitingText').textContent = 'Share code to connect...';
    
    // Emit room creation to server
    socket.emit('createRoom', currentRoomCode);
    
    // Listen for someone joining
    socket.on('userJoinedRoom', (data) => {
        if (data.roomCode === currentRoomCode) {
            document.getElementById('waitingText').textContent = 'Connected! 🎉';
            setTimeout(() => {
                closeRoomModal();
                openChat(data.username);
            }, 1000);
        }
    });
}

async function joinRoom() {
    const code = document.getElementById('joinCodeInput').value.toUpperCase().trim();
    if (code.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }
    
    currentRoomCode = code;
    socket.emit('joinRoom', { roomCode: code, username: currentUser });
    
    socket.on('roomJoined', () => {
        closeRoomModal();
        openChat('Room: ' + code);
    });
    
    socket.on('roomNotFound', () => {
        alert('Room not found. Please check the code.');
    });
}

function setupDataChannel() {
    dataChannel.onopen = () => console.log('Connected!');
    dataChannel.onmessage = (event) => receiveMessage(event.data);
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (message) {
        const messagesArea = document.querySelector('.messages-area');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        messageDiv.innerHTML = `<div class="message-content"><p>${message}</p><span class="message-time">${time}</span></div>`;
        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        input.value = '';
        
        // Send via Socket.io if connected
        if (window.socket && window.currentChat) {
            window.socket.emit('sendMessage', {
                chatId: window.currentChat,
                sender: window.currentUser || 'You',
                text: message
            });
        }
    }
}

function receiveMessage(data) {
    const messagesArea = document.querySelector('.messages-area');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message received';
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `<div class="message-content"><p>${data}</p><span class="message-time">${time}</span></div>`;
    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

async function startVideoCall() {
    if (!peerConnection) { alert('Please connect first!'); return; }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        peerConnection.ontrack = (event) => showVideoUI(stream, event.streams[0]);
    } catch (err) { alert('Camera access denied'); }
}

async function startAudioCall() {
    if (!peerConnection) { alert('Please connect first!'); return; }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        peerConnection.ontrack = (event) => showAudioUI(event.streams[0]);
    } catch (err) { alert('Microphone access denied'); }
}

function showVideoUI(local, remote) {
    const messagesArea = document.querySelector('.messages-area');
    let videoContainer = document.getElementById('videoCallContainer');
    if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.id = 'videoCallContainer';
        videoContainer.className = 'video-call-container';
        videoContainer.innerHTML = `<video id="remoteVideo" autoplay playsinline></video><video id="localVideo" autoplay muted playsinline></video><div class="call-controls"><button class="call-btn end-call" onclick="endCall()">End</button></div>`;
        messagesArea.appendChild(videoContainer);
    }
    document.getElementById('localVideo').srcObject = local;
    document.getElementById('remoteVideo').srcObject = remote;
}

function showAudioUI(stream) {
    const messagesArea = document.querySelector('.messages-area');
    let audioContainer = document.getElementById('audioCallContainer');
    if (!audioContainer) {
        audioContainer = document.createElement('div');
        audioContainer.id = 'audioCallContainer';
        audioContainer.className = 'audio-call-container';
        audioContainer.innerHTML = `<div class="audio-call-info"><div class="audio-avatar">📞</div><p>Voice Call</p><button class="call-btn end-call" onclick="endCall()">End</button></div><audio id="remoteAudio" autoplay></audio>`;
        messagesArea.appendChild(audioContainer);
    }
    document.getElementById('remoteAudio').srcObject = stream;
}

function endCall() {
    if (peerConnection) peerConnection.getSenders().forEach(sender => { if (sender.track) sender.track.stop(); });
    document.getElementById('videoCallContainer')?.remove();
    document.getElementById('audioCallContainer')?.remove();
}

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        document.getElementById('joinCodeInput').value = roomCode;
        toggleFabMenu();
        showJoinRoom();
    }
});
