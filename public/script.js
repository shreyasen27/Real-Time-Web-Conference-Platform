// const { use } = require("passport");

const socket = io('/');

const videoGrid = document.getElementById('video-grid');

const myVideo = document.createElement('video');
myVideo.muted = true;

// we will use it to show my own video and share it to other users 
let myVideoStream;

// Peer() where we create and recieve connections

const peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: 5001,
});

const peers = {}    

// On joining

peer.on('open', (userId) => {
    console.log(ROOM_ID);
    socket.emit('join-room', ROOM_ID, userId,USER_NAME);
})


// Getting media stream -> browser allowing audio and video
// It is a browser API for accessing media devices
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then((stream) => {
    
    myVideoStream=stream;

    // Adding our own video stream to webpage

    addVideoStream(myVideo, stream);

    peer.on('call', (call) => {
        // answering the call by sending my stream to the other
        call.answer(stream);
        // created a video element to show their stream 
        const video = document.createElement('video');
        // when we recive their we add it to the UI
        call.on('stream', (userVideoStream) => {
            addVideoStream(video, userVideoStream);
        });
    });

    // Adding new users video stream

    socket.on('user-connected', (userId) => {
        console.log('New user connected:', userId);
        //connectToNewUser(userId, stream);
        setTimeout(connectToNewUser,500,userId, stream);
    });

})
.catch((err) => console.log(err));


// On disconnecting

socket.on('user-disconnected', userId => {
    if(peers[userId]) peers[userId].close();
})


// Function to add new User - > calling new user

const connectToNewUser = (userId, stream) => {
    const call = peer.call(userId, stream);
    // created a video element to show their stream 
    const video = document.createElement('video');

    // when we recive their we add it to the UI
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    
    // If connection closes (user leaves) then remove their stream
    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
}

// Function to add new video 

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoGrid.append(video);
}


// Chat functionality

let text = $('input');

$('html').keydown((e) => {
    if(e.which == 13 && text.val().length !== 0)
    {
        // sends the message to the server 
        socket.emit('sendMessage', {
            user: USER_NAME,
            message: text.val()
        });

        // clears the input field after sending 
        text.val('');
    }
})


// recieving new messages 
socket.on('addNewMessage', data => {
    $('.messages').append(`<li class="message"><b>${data.user}</b><br/>${data.message}</li>`);
    scrollToBottom();
});

// to keep chat at the bottom
const scrollToBottom= ()=>{
    let d=$('.main_chat_window');
    d.scrollTop(d.prop("scrollHeight"));
}

// mute our video
const muteUnmute = () =>{
    const enabled=myVideoStream.getAudioTracks()[0].enabled;
    myVideoStream.getAudioTracks()[0].enabled = !enabled;
    setAudioButtonState(!enabled);
}

const setAudioButtonState = (enabled) => {
  const html = enabled
    ? '<i class="fas fa-microphone"></i><span class="remaining">Mute</span>'
    : '<i class="unmute fas fa-microphone-slash"></i><span class="remaining">Unmute</span>';
  document.querySelector('.main_mute_button').innerHTML = html;
};

// Video stop or play

const playStop= () =>{
    console.log('object');
    let enabled=myVideoStream.getVideoTracks()[0].enabled;
    myVideoStream.getVideoTracks()[0].enabled = !enabled;
    setVideoButtonState(!enabled);
}

const setVideoButtonState = (enabled) => {
  const html = enabled
    ? '<i class="fas fa-video"></i><span class="remaining">Stop Video</span>'
    : '<i class="stop fas fa-video-slash"></i><span class="remaining">Play Video</span>';
  document.querySelector('.main_video_button').innerHTML = html;
};


// changing theme -> styles.css to style.css 

const changeTheme=()=>{
    //console.log('object');
    const css=document.getElementById('css');
    //console.log(css.href);
    if(css.getAttribute("href")=="style.css"){
        css.setAttribute("href","styles.css");
    }else if(css.getAttribute("href")=="styles.css"){
        css.setAttribute("href","style.css");
    }
}


function leaveMeet() {
    // to prevent the user from navigating back to the meeting
    var backlen = history.length;
    history.go(-backlen);
    // redirect user to the home page
    window.location.href = '/';
}




// Update participant list
socket.on('update-user-list', userList => {
    const ul = document.getElementById('participants-list');
    ul.innerHTML = '';
    userList.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        ul.appendChild(li);
    });
});

