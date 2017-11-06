function createWebSocket(path) {
    var host = window.location.hostname;
    if(host == '') host = 'localhost';
    var uri = 'ws://' + host + ':3000' + path;

    return new WebSocket(uri);
}

function onMessage(el) {
    return function(event) {
        var p = $(document.createElement('p')).text(event.data);

        $(el).append(p);
        $(el).animate({scrollTop: $(el)[0].scrollHeight});
    };
}

function sign(algorithm, header, payload, key) {
  var value = '', error = null, headerAsJSON, payloadAsJSON;

  try {
    headerAsJSON = JSON.stringify(header);
  } catch (e) {
    error = {result: null, error: {cause: e, who: ['header']}};
  }
  try {
    payloadAsJSON = JSON.stringify(payload);
  } catch (e) {
    if (error) {
      error.error.who.push('payload');
    } else {
      error = {result: null, error: {cause: e, who: ['payload']}};
    }
  }

  if (error) {
    return error;
  }

  try {
    value = KJUR.jws.JWS.sign(algorithm, headerAsJSON, payloadAsJSON, key);
  } catch (e) {
    error = e;
  }

  return {result: value, error: error};
}

function updateJWT() {
    $('#jwt').val(jwt());
}

function jwt() {
    var alg = 'HS256',
        header = {
            alg: alg,
            typ: 'JWT'
        },
        payload = {
            mode: 'rw'
        },
        key = 'auwhfdnskjhewfi34uwehdlaehsfkuaeiskjnfduierhfsiweskjcnzeiluwhskdewishdnpwe';
    return sign(alg, header, payload, key).result;
}

$(document).ready(function () {
    var ws = null;
    var auditWs = null;

    $('#channel').keyup(updateJWT);
    updateJWT();

    auditWs = createWebSocket('/audit/' + jwt());
    auditWs.onmessage = onMessage('#audit-messages');

    $('#message-form').submit(function () {
        var text = $('#text').val();
        if(ws === null){
            var jwt = $('#jwt').val();
            var channel = $('#channel').val();
            ws = createWebSocket('/' + channel + '/' + jwt);
            ws.onopen = function() {
                ws.send(text);
            };
            ws.onmessage = onMessage('#messages');
        }
        else{
            ws.send(text);
        }
        $('#text').val('');
        return false;
    });
});
