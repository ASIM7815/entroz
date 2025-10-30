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
    
    if (window.loadMessages) {
        window.loadMessages(window.currentChat);
    }
    
    // Attach call button handlers
    attachCallHandlers();
}

function attachCallHandlers() {
    const chatActions = document.querySelector('.chat-actions');
    if (chatActions) {
        const buttons = chatActions.querySelectorAll('.icon-btn');
        if (buttons[1]) buttons[1].onclick = startVideoCall;
        if (buttons[2]) buttons[2].onclick = startAudioCall;
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
let localStream = null;
let currentRoomCode = null;

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
    
    window.socket.emit('createRoom', currentRoomCode);
    
    window.socket.on('userJoinedRoom', (data) => {
        if (data.roomCode === currentRoomCode) {
            document.getElementById('waitingText').textContent = 'Connected! 🎉';
            setTimeout(() => {
                closeRoomModal();
                openChat(data.username);
                initializePeerConnection();
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
    window.socket.emit('joinRoom', { roomCode: code, username: window.currentUser });
    
    window.socket.on('roomJoined', () => {
        closeRoomModal();
        openChat('Room: ' + code);
        initializePeerConnection();
    });
    
    window.socket.on('roomNotFound', () => {
        alert('Room not found. Please check the code.');
    });
}

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(config);
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            window.socket.emit('ice-candidate', {
                candidate: event.candidate,
                to: currentRoomCode
            });
        }
    };
    
    peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream.getVideoTracks().length > 0) {
            showVideoUI(localStream, remoteStream);
        } else {
            showAudioUI(remoteStream);
        }
    };
    
    window.socket.on('call-made', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        window.socket.emit('make-answer', {
            answer: answer,
            to: data.socket
        });
    });
    
    window.socket.on('answer-made', async (data) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    });
    
    window.socket.on('ice-candidate', async (data) => {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
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
        
        if (window.socket && window.currentChat) {
            window.socket.emit('sendMessage', {
                chatId: window.currentChat,
                sender: window.currentUser || 'You',
                text: message
            });
        }
    }
}

async function startVideoCall() {
    if (!currentRoomCode) {
        alert('Please create or join a room first using the + button!');
        return;
    }
    if (!peerConnection) {
        alert('Connection not ready. Please wait...');
        return;
    }
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        window.socket.emit('call-user', {
            offer: offer,
            to: currentRoomCode
        });
        
        showVideoUI(localStream, null);
    } catch (err) { 
        alert('Camera/microphone access denied: ' + err.message); 
    }
}

async function startAudioCall() {
    if (!currentRoomCode) {
        alert('Please create or join a room first using the + button!');
        return;
    }
    if (!peerConnection) {
        alert('Connection not ready. Please wait...');
        return;
    }
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        window.socket.emit('call-user', {
            offer: offer,
            to: currentRoomCode
        });
        
        showAudioUI(null);
    } catch (err) { 
        alert('Microphone access denied: ' + err.message); 
    }
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
    if (local) document.getElementById('localVideo').srcObject = local;
    if (remote) document.getElementById('remoteVideo').srcObject = remote;
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
    if (stream) document.getElementById('remoteAudio').srcObject = stream;
}

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.getSenders().forEach(sender => {
            if (sender.track) sender.track.stop();
        });
    }
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
