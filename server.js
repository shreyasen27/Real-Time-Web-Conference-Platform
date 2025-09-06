const express = require('express');
const session = require('express-session');
const passport = require('passport');

const app = express();
 require('dotenv').config();

// loads auth.js 
require('./auth');

function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401);
}
  
// Middlewares

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());


// creates an http server using express
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  transports: ['polling']
});


// generates unique ids for room ids
const { v4: uuidV4 } = require('uuid');


const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use('/peerjs', peerServer);

let USER_LIST = [];
let ROOM_ID;

// Rendering a new room on a new connection
app.get('/', (req, res) => {
    ROOM_ID=uuidV4();

    if (req.user) {
        res.render(`index`, { ROOM_ID: ROOM_ID, username: req.user.displayName })
    } else
        res.render('home')
})

  

// Rendering the requested room

app.get('/:room', (req, res) => {

    ROOM_ID = req.params.room;
    //console.log(ROOM_ID);

    if (req.user) {
        //sending the room.ejs view
        console.log(req.user.displayName);
        res.render('room', { roomId: ROOM_ID, username: req.user.displayName })
    } else
        res.render('home')
})


// On connecting to a new client

io.on('connection', socket => {

    socket.on('join-room', (roomId, userId,username) => {

        console.log(username);   
        socket.join(roomId);

        USER_LIST.push({roomId: roomId , userId : userId ,username : username})
        console.log(USER_LIST);

        // to tell existing users that one guy joined 

        socket.broadcast.to(roomId).emit('user-connected', userId);

        const updatedUsers = USER_LIST.filter(u => u.roomId === roomId);
        io.to(roomId).emit('update-user-list', updatedUsers);


        // Sending a new message to common chat
        socket.on('sendMessage', (data) => {
            io.to(roomId).emit('addNewMessage', data);
        });


        // On disconnecting
        socket.on('disconnect', () => {
            USER_LIST = USER_LIST.filter(u => u.userId !== userId);
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
            const updated = USER_LIST.filter(u => u.roomId === roomId);
            io.to(roomId).emit('update-user-list', updated);
        })
    })
})



// redirects user to google login page 

app.get('/auth/google',
passport.authenticate('google', { scope: [ 'email', 'profile' ],prompt: 'select_account' }
));

// google redirects back here after login

app.get( '/google/callback',
passport.authenticate( 'google', {
successRedirect: (ROOM_ID) ? `/${ROOM_ID}` : '/',
failureRedirect: '/auth/google/failure'
})
);

app.get('/auth/google/failure', (req, res) => {
    res.send('Failed to authenticate..');
});




let connections = [];
// Ends here

// WBC
// let connections = []


// whiteboard connection part

io.on('connect' , (socket) => {
  connections.push(socket);
  console.log(`${socket.id} has connected`);

  socket.on('draw' , (data) =>{
      connections.forEach(con =>{
          if(con.id !== socket.id){
              con.emit('ondraw' , {x :data.x ,y: data.y})
          }
      })
  })

  socket.on('down' , (data) =>{
      connections.forEach(con =>{
          if(con.id!==socket.id){
              con.emit('ondown', {x : data.x , y : data.y});
          }
      });
  });

  socket.on("disconnect" , (reason) => {
      console.log(`${socket.id} is disconnected`);
      connections = connections.filter((con) =>con.id != socket.id);
  });
});


app.get('/whiteboard/:id', isLoggedIn,(req, res) => {
  const roomId = req.params.id;
  res.render('whiteboard', { roomId }); 
});


const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});


