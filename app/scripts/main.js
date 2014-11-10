'use strict';
(function () {
  var socket = io('http://192.168.11.3:3000');
  var elementById = (id) => document.getElementById(id);
  var local = elementById('local-video');
  var remote = elementById('remote-video');
  var startButton = elementById('start');
  var endButton = elementById('end');
  var form = elementById('message-form');
  var input = elementById('message-input');
  var chat = elementById('messages');
  var connection, messages, name;

  socket.on('offerAnswer', ({sdp}) =>  {
    connection.setRemoteDescription(new RTCSessionDescription(sdp));
    connection.createAnswer(gotDescription);
    name = 'Patrik';
  });

  socket.on('iceCandidate', ({candidate}) => candidate && connection.addIceCandidate(new RTCIceCandidate(candidate)));

  var gotDescription = description => {
    connection.setLocalDescription(description);
    socket.emit('offerAnswer', {'sdp': description});
  };

  var formatDate = (date) => {
    typeof date === 'string' && (date = new Date(date));
    let zero = (time) => time < 10 ? '0' + time : time;
    let hours = zero(date.getHours());
    let minutes = zero(date.getMinutes());
    return `${hours}:${minutes}`;
  };

  var showMessage = (event) => {
    let create = (element) => document.createElement(element);
    let fragment = document.createDocumentFragment();
    let li = create('li');
    let nameAndTime = create('header');
    let message = create('div');
    let time = create('span');
    let user = create('span');
    let data = event.data;
    typeof data === 'string' && (data = JSON.parse(data));

    user.appendChild(document.createTextNode(data.name));
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

  var createMessageChannel = (connection) => {
    messages = connection.createDataChannel('Messages', {reliable: false});
    messages.onmessage = showMessage;
  };

  var call = () => {
    createMessageChannel(connection);
    connection.createOffer(gotDescription);
    name = 'Peter';
  };

  var end = () => {
    local.pause();
    remote.pause();
    connection.close();
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
    let select = elementById('video-select');
    sources.forEach(source => {
      if (source.kind == 'video') addVideoOption(source, select);
    });
    initialize(select);
  });

  startButton.addEventListener('click', call, false);
  endButton.addEventListener('click', end, false);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let message = {time: new Date(), message: input.value, name: name};
    messages.send(JSON.stringify(message));
    showMessage({data: message});
    input.value = '';
  });

})();
