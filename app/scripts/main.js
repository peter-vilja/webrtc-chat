'use strict';
(function () {
  var socket = io('http://192.168.11.3:3000');
  var local = document.getElementById('local-video');
  var remote = document.getElementById('remote-video');
  var startButton = document.getElementById('start');
  var connection;

  socket.on('offerAnswer', ({sdp}) =>  {
    connection.setRemoteDescription(new RTCSessionDescription(sdp));
    answer();
  });

  socket.on('iceCandidate', ({candidate}) => candidate && connection.addIceCandidate(new RTCIceCandidate(candidate)));

  var gotDescription = description => {
    connection.setLocalDescription(description);
    socket.emit('offerAnswer', {'sdp': description});
  };

  var call = () => connection.createOffer(gotDescription);
  var answer = () => connection.createAnswer(gotDescription);

  var addVideoOption = (source, select) => {
    let fragment = document.createDocumentFragment();
    let option = document.createElement('option');
    option.value = source.id;
    option.text = source.label || 'camera';
    fragment.appendChild(option);
    select.appendChild(fragment);
  }

  startButton.addEventListener('click', call, false);

  MediaStreamTrack.getSources(sources => {
    let select = document.getElementById('video-select');
    sources.forEach(source => {
      if (source.kind == 'video') addVideoOption(source, select);
    });
    initialize(select);
  });

  var initialize = select => {
    connection = new RTCPeerConnection(null);
    connection.onicecandidate = ({candidate}) => socket.emit('iceCandidate', {'candidate': candidate});
    connection.onaddstream = ({stream}) => remote.src = URL.createObjectURL(stream);
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
})();
