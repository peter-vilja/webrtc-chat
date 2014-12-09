'use strict';
(function () {
  var socket = io('https://192.168.11.3:3000');
  var elementById = id => document.getElementById(id);
  var videoChat = document.querySelector('.video-chat');
  var local = elementById('local-video');
  var startButton = elementById('start');
  var endButton = elementById('end');
  var shareScreenButton = elementById('share-screen');
  var form = elementById('message-form');
  var input = elementById('message-input');
  var chat = elementById('messages');
  var clients = {};
  var name, localStream;

  var setLocalDescription = (connection, description) => connection.setLocalDescription(description);

  var sendAnswer = (connection, client) => {
    return description => {
      console.log('sending answer to', client);
      setLocalDescription(connection, description);
      socket.emit('answer', {'to': client, 'sdp': description});
    };
  };

  socket.on('offer', ({from, sdp}) => {
    console.log('offer from', from);
    let conn = createConnection();
    conn.onicecandidate = ({candidate}) => socket.emit('iceCandidate', {'to': from, 'candidate': candidate});
    conn.onaddstream = ({stream}) => {
      let video = document.createElement('video');
      videoChat.appendChild(video);
      video.src = URL.createObjectURL(stream);
      video.autoplay = true;
    };
    conn.ondatachannel = (event) => {
      clients[from].messages = event.channel;
      clients[from].messages.onmessage = showMessage(from);
    };

    conn.addStream(localStream);

    clients[from] = {connection: conn};
    conn.setRemoteDescription(new RTCSessionDescription(sdp));
    conn.createAnswer(sendAnswer(conn, from));
    videoChat.classList.add('started');
  });

  socket.on('answer', ({from, sdp}) => {
    console.log('answer from', from);
    var conn = clients[from].connection;
    conn.setRemoteDescription(new RTCSessionDescription(sdp));
    videoChat.classList.add('started');
  });

  socket.on('iceCandidate', ({from, candidate}) => {
    console.log('candidate from', from);
    if (candidate) {
      var conn = clients[from].connection;
      conn.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  socket.on('createOffer', ({to}) => {
    console.log('createOffer');
    let conn = createConnection();
    conn.onicecandidate = ({candidate}) => socket.emit('iceCandidate', {'to': to, 'candidate': candidate});
    conn.onaddstream = ({stream}) => {
      let video = document.createElement('video');
      videoChat.appendChild(video);
      video.src = URL.createObjectURL(stream);
      video.autoplay = true;
    };

    conn.addStream(localStream);

    clients[to] = {connection: conn};
    clients[to].messages = createMessageChannel(conn, to);
    conn.createOffer(sendOffer(conn, to));
  });

  var formatDate = date => {
    typeof date === 'string' && (date = new Date(date));
    let zero = time => time < 10 ? '0' + time : time;
    let hours = zero(date.getHours());
    let minutes = zero(date.getMinutes());
    return `${hours}:${minutes}`;
  };

  var showMessage = from => {
    return event => {
      let create = element => document.createElement(element);
      let fragment = document.createDocumentFragment();
      let li = create('li');
      let nameAndTime = create('header');
      let message = create('div');
      let time = create('span');
      let user = create('span');
      let data = event.data;
      typeof data === 'string' && (data = JSON.parse(data));

      user.appendChild(document.createTextNode(from));
      user.classList.add('name');
      time.appendChild(document.createTextNode(formatDate(data.time)));
      time.classList.add('time');

      nameAndTime.appendChild(user);
      nameAndTime.appendChild(time);

      message.appendChild(document.createTextNode(data.message));
      message.classList.add('message');

      li.appendChild(nameAndTime);
      li.appendChild(message);

      fragment.appendChild(li);
      chat.appendChild(fragment);
    };
  };

  var createMessageChannel = (connection, from) => {
    console.log('createMessageChannel');
    var messages = connection.createDataChannel('Messages', {reliable: false});
    messages.onmessage = showMessage(from);
    return messages;
  };

  var sendOffer = (connection, client) => {
    return description => {
      setLocalDescription(connection, description);
      socket.emit('offer', {'to': client, 'sdp': description});
    };
  };

  var createConnection = () => new RTCPeerConnection({iceServers: [{url: 'stun:stun.l.google.com:19302'}]}, {optional: [{RtpDataChannels: true}]});

  var call = () => {
    socket.emit('inactive', inactive => {
      inactive.forEach(client => {
        let conn = createConnection();
        conn.onicecandidate = ({candidate}) => socket.emit('iceCandidate', {'to': client, 'candidate': candidate});
        conn.onaddstream = ({stream}) => {
          let video = document.createElement('video');
          videoChat.appendChild(video);
          video.src = URL.createObjectURL(stream);
          video.autoplay = true;
        };

        conn.addStream(localStream);

        clients[client] = {connection: conn};
        clients[client].messages = createMessageChannel(conn, client);
        conn.createOffer(sendOffer(conn, client));
      });
    });
  };

  var end = () => {
    local.pause();
    connection.close();
  };

  var success = stream => {
    local.src = URL.createObjectURL(stream);
    local.classList.add('streaming');
    localStream = stream;
  };

  var failure = (e) => console.log('getUserMedia failed!', e);

  var share = () => {
    navigator.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'screen'
        }
      }
    }, success, failure);
  };

  var initialize = () => {
    let constraints = {
      audio: false,
      video: true
    };
    navigator.getUserMedia(constraints, success, failure);
  };

  initialize();
  startButton.addEventListener('click', call, false);
  endButton.addEventListener('click', end, false);
  form.addEventListener('submit', event => {
    event.preventDefault();
    let message = {time: new Date(), message: input.value};

    Object.keys(clients).forEach(key => clients[key].messages.send(JSON.stringify(message)));

    showMessage('me')({data: message});
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
  });
  shareScreenButton.addEventListener('click', share, false);

})();
