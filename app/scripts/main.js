'use strict';
(function () {
  var socket = io('http://192.168.11.3:3000');
  var local = document.getElementById('local-video');
  var remote = document.getElementById('remote-video');
  var startButton = document.getElementById('start');
  var form = document.getElementById('message-form');
  var input = document.getElementById('message-input');
  var chat = document.getElementById('messages');
  var connection, messages, channel;

  socket.on('offerAnswer', ({sdp}) =>  {
    connection.setRemoteDescription(new RTCSessionDescription(sdp));
    connection.createAnswer(gotDescription);
  });

  socket.on('iceCandidate', ({candidate}) => candidate && connection.addIceCandidate(new RTCIceCandidate(candidate)));

  var gotDescription = description => {
    connection.setLocalDescription(description);
    socket.emit('offerAnswer', {'sdp': description});
  };

  var formatDate = (date) => {
    let time = new Date(date);
    let hours = time.getHours();
    let minutes = time.getMinutes();
    let seconds = time.getSeconds();
    return `${hours}:${minutes}:${seconds}`;
  };

  var showMessage = (event) => {
    let fragment = document.createDocumentFragment();
    let li = document.createElement('li');
    let time = document.createElement('div');
    let message = document.createElement('div');
    let data = JSON.parse(event.data);

    time.appendChild(document.createTextNode(formatDate(data.time)));
    message.appendChild(document.createTextNode(data.message));
    li.appendChild(time);
    li.appendChild(message);

    fragment.appendChild(li);
    chat.appendChild(fragment);
  };

  var createMessageChannel = (connection) => {
    messages = connection.createDataChannel('Messages', {reliable: false});
    messages.onmessage = showMessage;
  };

  var call = () => {
    createMessageChannel(connection);
    connection.createOffer(gotDescription);
  };

  var addVideoOption = (source, select) => {
    let fragment = document.createDocumentFragment();
    let option = document.createElement('option');
    option.value = source.id;
    option.text = source.label || 'camera';
    fragment.appendChild(option);
    select.appendChild(fragment);
  }

  var initialize = select => {
    connection = new RTCPeerConnection({iceServers: [{url: 'stun:stun.l.google.com:19302'}]}, {optional: [{RtpDataChannels: true}]});
    connection.onicecandidate = ({candidate}) => socket.emit('iceCandidate', {'candidate': candidate});
    connection.onaddstream = ({stream}) => remote.src = URL.createObjectURL(stream);
    connection.ondatachannel = (event) => {
      messages = event.channel;
      messages.onmessage = showMessage;
    };

    let constraints = {
      audio: false,
      video: { optional: [{sourceId: select.value}] }
    };
    let success = stream => {
      local.src = URL.createObjectURL(stream);
      connection.addStream(stream);
    };
    let failure = () => console.log('getUserMedia failed!');
    navigator.getUserMedia(constraints, success, failure);
  };

  MediaStreamTrack.getSources(sources => {
    let select = document.getElementById('video-select');
    sources.forEach(source => {
      if (source.kind == 'video') addVideoOption(source, select);
    });
    initialize(select);
  });

  startButton.addEventListener('click', call, false);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    messages.send(JSON.stringify({time: new Date(), message: input.value}));
    input.value = '';
  });

})();
