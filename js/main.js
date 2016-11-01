$('document').ready(function() {
    var html_str = '<iframe id="conf" src="conference/videoconference.html?room=' + room + '&name=' + name + '" width="570" height="400" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true"></iframe>';
    $('.modal-body').html(html_str);
});

function start() {
    var el = document.getElementById('conf');
    getIframeWindow(el).publishCamIframe();
    $('#sh-cam').hide();
    $('#dis-cam').show();
}

function stop() {
    var el = document.getElementById('conf');
    getIframeWindow(el).unPublishCamIframe();
    $('#sh-cam').show();
    $('#dis-cam').hide();
}

function leave() {
    var el = document.getElementById('iframe-div');
    el.innerHTML = '';
}

function showconf() {

    return;
    var el = document.getElementById('iframe-div');
    el.innerHTML = '<iframe id="conf" src="conference/videoconference.html?room=34534534&name=nithin" width="100%" height="100%"></iframe>';
}

function getIframeWindow(iframe_object) {
    var doc;
    if (iframe_object.contentWindow) {
        return iframe_object.contentWindow;
    }

    if (iframe_object.window) {
        return iframe_object.window;
    }

    if (!doc && iframe_object.contentDocument) {
        doc = iframe_object.contentDocument;
    }

    if (!doc && iframe_object.document) {
        doc = iframe_object.document;
    }

    if (doc && doc.defaultView) {
        return doc.defaultView;
    }

    if (doc && doc.parentWindow) {
        return doc.parentWindow;
    }

    return undefined;
}