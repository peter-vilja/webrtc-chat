'use strict';
(function () {
  var socket = io('http://192.168.100.14:3000');
  var local = document.getElementById('local-video');
  var remote = document.getElementById('remote-video');
  var startButton = document.getElementById('start');
  var connection;

  socket.on('offerAnswer', function (data) {
    connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  });

  socket.on('iceCandidate', function (data) {
    connection.addIceCandidate(new RTCIceCandidate(data.candidate));
  });

  var gotDescription = function (description) {
    connection.setLocalDescription(description);
    socket.emit('offerAnswer', {'sdp': description});
  };
  var call = function () {connection.createOffer(gotDescription);};
  var answer = function () {connection.createAnswer(gotDescription);};
  var addVideoOption = function (source, select) {
    var fragment = document.createDocumentFragment();
    var option = document.createElement('option');
    option.value = source.id;
    option.text = source.label || 'camera';
    fragment.appendChild(option);
    select.appendChild(fragment);
  }

  startButton.addEventListener('click', call, false);
  MediaStreamTrack.getSources(function (sources) {
    var select = document.getElementById('video-select');
    sources.forEach(function (source) {
      if (source.kind == 'video') addVideoOption(source, select);
    });
    initialize(select);
  });

  var initialize = function (select) {
    connection = new RTCPeerConnection(null);
    connection.onicecandidate = function (event) {socket.emit('offerAnswer', {'candidate': event.candidate});};
    connection.onaddstream = function (event) {remote.src = URL.createObjectURL(event.stream);};
    var constraints = {
      audio: false,
      video: { optional: [{sourceId: select.value}] }
    };
    var success = function (stream) {
      local.src = URL.createObjectURL(stream);
      connection.addStream(stream);
    };
    var failure = function () {console.log('getUserMedia failed!');};
    navigator.getUserMedia(constraints, success, failure);
  };
})();
