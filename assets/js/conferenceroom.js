var localVideo;
var sessionId;
var screensessionId;
var participants         = {};
var globalconstraints    = 0;
var stopSession          = 0;
var Screenpublished      = 0;
var updttimecalled       = 0;
var elapsedTime          = 0;
var connctionLost        = 0;
var pingsend             = 0;
var socket = io.connect(node_url);
var alreadyConnected     = 0;
var published            = 0;
var browser_name         = 'Chrome';
var protocol             = 'https://';
var domain               = 'jam-webrtc.youseeu.com';
var mozScreenshareAvailable = 0;

 /*
 *   Socket connection success callback for kurento client
 */
socket.on("connect", function (id) {
    $('#live-lab').html('LIVE');
    $('#live-lab').removeClass('off');
    $('#indication').removeClass('offline');
    swal.close();
    //alert('connected == '+alreadyConnected+'//'+published);
    if(alreadyConnected == 1 ){
       leaveRoom();
    }
    register(role);    
});
/*
 *   Socket connection disconnect callback for room server
 */
socket.on('disconnect', function () {

    $('#live-lab').html('OFFLINE');
    $('#live-lab').addClass('off');
    $('#indication').addClass('offline');  
    if(stopSession == 0){
        connctionLost = 1;
        setTimeout(function(){
            swal("Message!", "Connection with server lost!!!");
        },2000);
        
    }
});

window.onbeforeunload = function () {
    socket.disconnect();
    
};
/**
 * Register to a romm
 * 
 */
function register(roleval) {
    var data = {
        id: "register",
        userName: userName,
        role: roleval,
        mode: mode,
        room: room
    };
    sendMessage(data);
}
/**
 * callback from nodejs server for getting socket id
 */
socket.on("id", function (id) {
    sessionId       = id;
    screensessionId = id+'_screen';
    socketId        = id;
});
/**
 * Send message to server
 * @param data
 */
function sendMessage(data) {

    socket.emit("message", data);
}
/**
 * Invoke from nodejs server on each event triggers
 * @param message
 */
socket.on("message", function (message) {
    switch (message.id) {
        case "registered":
             joinRoom(room,message.role);
             if(globalconstraints == 0){
                $('#share_cam').removeAttr('disabled');
             }
             $('#share_screen').removeAttr('disabled');
             alreadyConnected = 1;
        break;
        case "existingParticipants":
            if(message.role == 'screen')
            {
               onExistingParticipants(message,screensessionId,screensessionId,'screen');
            }
            else
            {
                onExistingParticipants(message,sessionId,socketId,role);
            }
        break;
        case "receiveVideoAnswer":
            onReceiveVideoAnswer(message);
        break;
        case "newParticipantArrived":
            onNewParticipant(message);
        break;
        case "participantLeft":
             onParticipantLeft(message);
        break;
        case "onExistingUserForConnectionCheck":
             onExistingUserForConnectionCheck(message);
        break;
        case "iceCandidate":
            var participant = participants[message.sessionId];
            if (participant != null) {
                participant.rtcPeer.addIceCandidate(message.candidate, function (error) {
                    if (error) {
                        if (message.sessionId === sessionId) {
                            console.error("Error adding candidate to self : " + error);
                        } else {
                            console.error("Error adding candidate : " + error);
                        }
                    }
                });
            } else {
                console.error('still does not establish rtc peer for : ' + message.sessionId);
            }
        break;
        case 'onReceiveSendToOne':
              onReceiveSendToOne(message);
        break;
        case 'onReceiveSendToAll':  
              onReceiveSendToAll(message);
        break;
        case 'onInitialTime':  
            if(updttimecalled == 0){
                elapsedTime = parseInt(message.time);
                updateTime(); 
                updttimecalled = 1;
            }
        break;
        case 'onGetTime':
            elapsedTime = parseInt(message.time);
        break; 
        case 'room_expired':
            swal("Message!", "This room expired ! ");
        break; 
        case 'recordingStarted':
            //alert('record started');
        break;
        case "playstarted":
            var strmId = message.streamId;
            $('#'+strmId).show();
        break;  
        case "userDisconnected":
            var strmId = message.streamId;
            if(strmId == socketId){
                leaveRoom();
              if(stopSession == 0){
                connctionLost = 1;
                swal("Message!", "Connection with server lost!!!");
                setTimeout(function(){
                  register(role); 
                },2000);
               }
            }else{
                //alert('other disconnect');
                $('#'+strmId).remove();
                $('#user-'+strmId).remove();
                $('#user-'+strmId+'_screen').remove();
            }
            
        break;
        default:
             console.log("Unrecognized message: "+message.id);
    }
});
$('document').ready(function(){
    $('#share_cam').click(function(){
         $("#share_cam").attr("disabled","disabled");
         $('#stop_cam').removeAttr('disabled');
         setTimeout(function(){
           publishMyCam(socketId,socketId,role);
         },2000);
         published = 1;
    });
    $('#share_screen').click(function(){
         startShare();         
    });
    $('#stop_screen').click(function(){
         //leaveRoom();
         stopShare();

    });
     $('#stop_cam').click(function(){
         //leaveRoom();
         published = 0;
         leaveForUserPublish();
         setTimeout(register,500,role); 
         $("#stop_cam").attr("disabled","disabled");

    });
});
/**
 * Tell room you're leaving and remove all video elements
 */
function leaveForScreenShare() {

    if (participants) {
        if (participants.hasOwnProperty(screensessionId)) {
            var message = {
                id: "leaveScreenPublishOnly"
            };
            //participants[sessionId].rtcPeer.dispose();
            sendMessage(message);
            //participants = {};
            $('#' + socketId + '_screen').remove();
            $('#user-'+socketId).remove();
        }
    }
    $('#share_screen').removeAttr('disabled');

}
/**
 * Tell room you're leaving and remove all video elements
 */
function leaveForUserPublish(){

    if(participants)
    {
         if(participants.hasOwnProperty(socketId))
          {
            $('#share_cam').removeAttr('disabled');
            var message = {
                id: "leaveMyPublishOnly"
            };
            //participants[sessionId].rtcPeer.dispose();
            sendMessage(message);
            //participants = {};
            $('#'+socketId).remove();
            $('#user-'+socketId).remove();
         }
    }
    
    
}
function getTimeRequest(){
    var message = {
        id : 'getTime',
        room : room
    };

    sendMessage(message);
}
/*
 *   Call back of send to all function
 */
function onReceiveSendToAll(parsedMessage)
{
   
    if(parsedMessage.room == room)
    {
        var jsonstring = parsedMessage.contentJson;
        var parsedMessage = JSON.parse(jsonstring);
        var parsedValues;
        
        
            switch (parsedMessage.method) {
                case 'participant_cam_on_off':
                    if(parsedMessage.status == "on"){ vidLockarray[parsedMessage.element] = true; } else { vidLockarray[parsedMessage.element] = false; }
                      participantCamOnOff(parsedMessage.element, false, parsedMessage.status);
                    break;
                case 'participant_mic_on_off':
                    if(parsedMessage.status == "on"){ micLockarray[parsedMessage.element] = true; } else { micLockarray[parsedMessage.element] = false; }
                      participantMicOnOff(parsedMessage.element, false, parsedMessage.status);
                    break;
                case 'onkick':
                    kickUserRecived(parsedMessage.user_id);
                break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
    }
}
/**
 * Check if roomName exists, use DOM roomName otherwise, then join room
 * @param roomName and roleval
 */
function joinRoom(roomName,roleval) {

    if(typeof roomName == 'undefined'){
        roomName = room;
    }
    var data = {
        id: "joinRoom",
        roomName: roomName,
        userName: userName,
        role: roleval,
        mode: mode,
        webinar: webinar,
        recording: record
    };
    sendMessage(data);
}
/**
 * Request video from all existing participants
 * @param message
 */

function onExistingParticipants(message,ses_id,name_id,cur_role) {
    if(connctionLost == 1){
        if(Screenpublished == 1){
            startShare();
        }
    }
    connctionLost = 0;
    if(globalconstraints == 0)
    {
        for (var i in message.data) {
            var str = message.data[i];
            var res = str.split("*_*");
            var request             = {};
                request['userid']   = res[0];
                request['userName'] = res[1];
                request['role']     = res[2];
                request['mode']     = res[3];
                receiveVideoFrom(res[0],request);
       }
       if(published == 1){
          setTimeout(function(){
            publishMyCam(ses_id,name_id,cur_role);
            
          },2000);
       }
       
    }else{
        if(globalconstraints != 0){
            Screenpublished = 1;
            $("#share_screen").attr("disabled","disabled");
            $('#stop_screen').removeAttr('disabled');
            publishMyCam(ses_id,name_id,cur_role);
            globalconstraints = 0;
          /*setTimeout(function(){
            publishMyCam(ses_id,name_id,cur_role);
            globalconstraints = 0;
          },2000);*/
       }
    }
}
function publishMyCam(ses_id,name_id,cur_role){
    onParticipantLeft({sessionId:ses_id});
    if(globalconstraints==0)
    {
        if(webinar == '0' || mode == 'presenter')
        {
            var constraints = {
                audio: false,
                video: {
                frameRate: 15,
                    width: 640,
                    height: 480
                }
            };
        }
        else
        {
            var constraints = {
                audio: false,
                video: false
            };
        }
            
    }
    else
    {
        var constraints = globalconstraints;
    }
    var localParticipant = new Participant(ses_id,cur_role);
    participants[ses_id] = localParticipant;
    createVideoForuserList(userName,name_id,cur_role,mode);
    localVideo = document.getElementById("video-"+name_id);
    var video = localVideo;

    // bind function so that calling 'this' in that function will receive the current instance
    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: localParticipant.onIceCandidate.bind(localParticipant)
    };

    if(webinar == '0' || mode == 'presenter')
    {
        
        localParticipant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
            if (error) {
                return console.error(error);
            }
            localVideo = document.getElementById("video-"+name_id);
            localVideo.src = localParticipant.rtcPeer.localVideo.src;
            localVideo.muted = true; 
            this.generateOffer(localParticipant.offerToReceiveVideo.bind(localParticipant));
            
        });
        
        if(globalconstraints == 0){
             var message = {
                id: "startRecording",
                room:room
            };
        }else{
             var message = {
                id: "startRecording",
                room:room,
                screen:'true'

            };
        }
        
        sendMessage(message);
    }
}
/**
 * Receive video from new participant
 * @param message
 */
function onNewParticipant(message) {
    
    receiveVideoFrom(message.new_user_id,message);
}
/**
 * Add new participant locally and request video from new participant
 * @param sender
 */
function receiveVideoFrom(sender,message) {
    var res = sender.replace("_screen", "");
    if(res != socketId)
    {
        var participant = new Participant(sender,role);
        participants[sender] = participant;
        var video = createVideoForParticipant(sender,message);

        // bind function so that calling 'this' in that function will receive the current instance
        var options = {
            remoteVideo: video,
            onicecandidate: participant.onIceCandidate.bind(participant)
        };

        participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
            if (error) {
                //alert('error');
                return console.error(error);
            }
            this.generateOffer(participant.offerToReceiveVideo.bind(participant));
        });
    }
}
/**
 * On receive video answer
 * @param message
 */
function onReceiveVideoAnswer(message) {
    var participant = participants[message.sessionId];
    participant.rtcPeer.processAnswer(message.sdpAnswer, function (error) {
        if (error) {
            console.error(error);
        } else {
            participant.isAnswer = true;
            while (participant.iceCandidateQueue.length) {
                var candidate = participant.iceCandidateQueue.shift();
                participant.rtcPeer.addIceCandidate(candidate);
            }
        }
    });
}
/**
 * Create video DOM element
 * @param participant
 * @returns {Element}
 */
function createVideoForParticipant(userid,message) {
    //pingUsers(userid);
    var videoId = "video-" + userid;
    createVideoForuserList(message.userName,userid,message.role,message.mode);
    return document.getElementById(videoId);
}
/*
* Turn ON/OFF video for each participant
*/
var vidLock      = false;
var micLock          = false;
var vidLockarray = {};
var micLockarray = {};

/*
* Turn ON/OFF camera for each participant
* @param ele   : camera ON/OFF div element
* @param send  : send signal to the viewer
* @param status: ON/OFF status at the user end
*/
var status = "on";
function participantCamOnOff(ele, send, status){
    status = status || "";
    var onHtml = '<i class="fa fa-video-camera cam-ic"></i>';
    var offHtml = '<i class="fa fa-video-camera cam-ic"></i><i class="fa fa-times cam-cls-chat"></i>';
    var v = $('#video-'+ele);
    if(status == "")
    {
        if($('#v-'+ele).html()==onHtml)
        {
            v.addClass('hide-vid');
            $('#v-'+ele).html(offHtml);
            status = "on";
        }
        else
        {
            v.removeClass('hide-vid');
            $('#v-'+ele).html(onHtml);
            status = "off";
        }
    } 
    else if(status == "on") 
    {
        v.addClass('hide-vid');
            $('#v-'+ele).html(offHtml);
            status = "on";
    }
    else
    {
       v.removeClass('hide-vid');
       $('#v-'+ele).html(onHtml);
       status = "off";
    }
    
   if(send){ 
   
        sendToAll(JSON.stringify({method: "participant_cam_on_off", element: ele, socketId: socketId, status: status})); 
        //saveParticipants({action:"camoffone",status:status,name: name});
    }
}
/*
* Turn ON/OFF sound for each participant
* @param ele   : mic ON/OFF div element
* @param send  : send signal to the viewer
* @param status: ON/OFF status at the user end
*/
function participantMicOnOff(ele, send, status){
    status = status || "";
    var onHtml = '<i class="fa fa-microphone microphone-icon"></i>';
    var offHtml = '<i class="fa fa-microphone-slash microphone-icon"></i>';
    var v = $('#video-'+ele);
    if(status == ""){
        if($('#m-'+ele).html()==onHtml)
        {
            if(ele != socketId)
            v.prop('muted',true);
            $('#m-'+ele).html(offHtml);
            status = "on";
        }
        else
        {
            if(ele != '#m-'+name)
            {
               if(ele != socketId)
               v.prop('muted',false);
               $('#m-'+ele).html(onHtml);
                
                status = "off";
            }
            $(ele).html(onHtml);
            
        }
    }
    else if(status == "on")
    {
         v.prop('muted',true);
         $('#m-'+ele).html(offHtml);
         status = "on";
    }
    else 
    {
         v.prop('muted',false);
         $('#m-'+ele).html(onHtml);
         status = "off";
    }
    if(send){ 
        sendToAll(JSON.stringify({method: "participant_mic_on_off", element: ele, socketId: socketId, status: status})); 
    }
}
function fullscreen(id){
  
        var elem = document.getElementById('video-'+id);
        if (elem.requestFullscreen) {
        elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        }
}
/**
 * Function for creating video elements
 * @param realName,name_id,userRole,userMode
 */
function createVideoForuserList(realName,name_id,userRole,userMode)
{
    var idonly = name_id.replace('_screen', '');
     var isscreen = false;
     var newname = realName;
     if(name_id.indexOf('_screen') !== -1){
        isscreen = true;
        newname = realName+" Shared Screen";
     }
	 var name_html 		= "";
     //style="display:none;"
     if(isscreen){
        var video_html      = '<div id="'+name_id+'" class="vid-parent"><div class="control-back"><div id="vidctrl-'+name_id+'" class="video-contrl" >';
    }else{
        var video_html      = '<div style="display:none;" id="'+name_id+'" class="vid-parent"><div class="control-back"><div id="vidctrl-'+name_id+'" class="video-contrl" >';
    }
     if(isscreen){
     video_html         += '<div style="width:150px;" class="userName">'+newname+'</div>';
     }else{
      video_html         += '<div class="userName">'+newname+'</div>';  
     }
     if(isscreen == false){
     video_html         += '<div title="Video ON/OFF" class="cam-on-off chat-vid" id="v-'+name_id+'"><i class="fa fa-video-camera cam-ic"></i></div>';
     }
     video_html         += '<div style="display:none;" title="Sound ON/OFF" class="mic-on-off chat-mic" id="m-'+name_id+'"><i class="fa fa-microphone microphone-icon"></i></div>';
     if(name_id != socketId){

        video_html         += '<div title="Kick User" style="display:none;" class="kick-user chat-mic" id="k-'+name_id+'"><i class="fa fa-times microphone-icon"></i></div>';
        video_html         += '<div style="float:right" title="Full Screen" class="fullscrn chat-mic" id="f-'+name_id+'"><i class="fa fa-arrows-alt microphone-icon"></i></div>';
        
    		name_html 		   += '<ul id="user-'+name_id+'" class="list-group customlist">';
    		name_html 		   += '<li class="list-group-item customfields">'+realName+'</li>';
    		name_html 		   += '</ul>';
        
     }  
     if(isscreen){
     video_html         += '</div></div><video  poster="assets/images/screenload.gif" data-myid="'+name_id+'" onplay="onPlayVideo(\''+name_id+'\')" width="222" height="167" id="video-'+name_id+'" autoplay="true"></video></div>';
     }else{
      video_html         += '</div></div><video  poster="assets/images/user_image.png" data-myid="'+name_id+'" onplay="onPlayVideo(\''+name_id+'\')" width="222" height="167" id="video-'+name_id+'" autoplay="true"></video></div>';  
     }
     if(name_id == socketId){
        $('#layout').append(video_html);
        $('#vidctrl-'+name_id).addClass('video-contrl-my');
     }else{
        $('#layout').append(video_html);
        if(name_id.indexOf('_screen') == -1){
            if (document.getElementById('user-'+name_id) == null) {
                $('.list-div').append(name_html);
        // do what you need here
         }
		   
        }
     }
    $("#v-"+name_id).click(function()
    {
        var id = this.id.replace('v-','');
        if(!vidLock){

            if(this.id == 'v-'+socketId){ 
                  participantCamOnOff(id, true, ""); 
            } else {
                if(!vidLockarray[id]){
                   participantCamOnOff(id, true, "");
                }
            }
        }
    });
    $("#m-"+name_id).click(function()
    {
        var id = this.id.replace('m-','');
        if(!micLock){
            if(this.id == 'm-'+socketId){ 
                  participantMicOnOff(id, true, ""); 
            } else {
                if(!micLockarray[id]){
                   participantMicOnOff(id, false, "");
                }
            }
        }
    });
    $(".vid-parent").on("click", '.fullscrn', function()
    {
        var id = this.id.replace('f-','');
        fullscreen(id);
    });
    $(".vid-parent").on("click", '.kick-user', function()
    {
        var id = this.id.replace('k-','');
        var kickdata             = {};
            kickdata['method']   = 'onkick';
            kickdata['user_id']   = id;
        var kickjson = JSON.stringify(kickdata);
        sendToAll(kickjson);
    });
    var vidN = document.getElementById("video-"+name_id);
    vidN.onloadstart = function() {
         
    };
    vidN.onwaiting = function() {
         
    };
/*vidN.onloadedmetadata = function() {
    alert("Meta data for video loaded");
};*/
    vidN.onplaying = function() {
        //alert('play');
         $('#'+name_id).show();

    };
    var svidN = document.getElementById("video-"+name_id);
    if(svidN){
        svidN.onended = function() {
        stopShare();
      };
    }
    

}
/*
   function for sending data to all
*/
function sendToAll(contentJson)
{
    var message = {
        id : 'sendToAll',
        name : socketId,
        contentJson : contentJson,
        room : room
    };
   
    sendMessage(message);
}
/**
 * Function triggered when playing a video 
 * @param socketId
 */
function onPlayVideo(id)
{

}
/**
 * Destroy videostream/DOM element on participant leaving room
 * @param message
 */
function onParticipantLeft(message) {
    if(participants[message.sessionId]){
        var participant = participants[message.sessionId];
        participant.dispose();
        delete participants[message.sessionId];
    }
    $('#video-'+message.sessionId).remove();
    $('#'+message.sessionId).remove();
    $('#user-'+message.sessionId).remove();
    $('#user-'+message.sessionId+'_screen').remove();
    
}
/**
 * Send data to perticular user
 * @param contentJson,receiversocket
 */
function sendToOne(contentJson,receiversocket)
{
    var message = {
        id : 'sendToOne',
        receiversocket : receiversocket,
        sendersocket : socketId,
        contentJson : contentJson,
        room : room
    };

    sendMessage(message);
}  
/**
 * Trigger when someone send data to only me
 * @param parsedMessage
 */
function onReceiveSendToOne(parsedMessage)
{
    
        
        var jsonstring = parsedMessage.contentJson;
        var jsonobject = JSON.parse(jsonstring);
        var parsedValues;
        
                switch (jsonobject.method) 
                {
                    case 'pinguser':
                      pingreplysend(jsonobject,parsedMessage.sendersocket);
                    break;
                    case 'pingreply':
                      onReceivePingReply(jsonobject);
                    break;  
                    
                    default:
                        console.error('Unrecognized message', parsedMessage);
                }
   
}
/**
 * Destroy ping session for findout ghost user
 * @param message
 */

function onReceivePingReply(pingdata)
{ 
     
      var pingid = pingdata['pingid'];
      if(pingRegistry.hasOwnProperty(pingid))
        {
           var aliveuser = pingRegistry[pingid];
           delete pingRegistry[pingid];
           //console.log('User alive : '+aliveuser);
           
        }
}
function pingreplysend(pingdata,sendersocket)
{
        
        pingdata['method']              = 'pingreply';
        var jsonpingdata                = JSON.stringify(pingdata);
        sendToOne(jsonpingdata,sendersocket);
}
var pingRegistry = {};
function pingUsers(receiverSocket)
{
   
    var pingdata                        = {};
        pingdata['method']              = 'pinguser';
        pingdata['pingid']              = generateUUID();
        jsonpingdata                    = JSON.stringify(pingdata);
        sendToOne(jsonpingdata,receiverSocket);
        pingRegistry[pingdata['pingid']]    = receiverSocket;
        setTimeout(checkArrivalOfPingData,10000,pingdata['pingid'],receiverSocket);

}
/**
 * Function called when admin kick user
 */
function kickUserRecived(id)
{
   
    if(id==socketId)
    {
        stopSession = 1;
        leaveRoom();
        swal("Message!", "You have been kicked from this conference")
        socket.disconnect();
    }
    
}
/**
 * Tell room you're leaving and remove all video elements
 */
function leaveRoom(){
    $('.list-div').html('');
    globalconstraints = 0;
    if(participants)
    {
         if(participants.hasOwnProperty(sessionId))
          {
            var message = {
                id: "leaveRoom"
            };
            if(webinar == false)
            {
                participants[sessionId].rtcPeer.dispose();
            }
            
            sendMessage(message);
            participants = {};

            var myNode = document.getElementById("layout");
            while (myNode.firstChild) {
                myNode.removeChild(myNode.firstChild);
            }
                       
         }
         
    } 
}
var timeDisplay = 0;
function updateTime(){
     updttimecalled = 1;
     if(stopSession == 0)
     {
            elapsedTime++; 
            timeDisplay++;
            $("#elapsedtime").html(secondsToHms(timeDisplay));
            setTimeout(updateTime, 1000);
            if(elapsedTime % 10 == 0){
               getTimeRequest();
            }
    }
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s); 
}
/* 
* Generate Unique id 
* @return: Unique id
*/
function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        var out = (c=='x' ? r : (r&0x3|0x8)).toString(16);
        var ret = out.substr(out.length - 3);
        return ret;
    });
    var ret = uuid.substr(uuid.length - 6);
    return ret;
}

/* 
* Function triggered when leaving the session
* 
*/
function leaveSession(){
  swal({   title: "Are you sure?",   text: "You will not be able to back to this session!",   type: "warning",   showCancelButton: true,   confirmButtonColor: "#DD6B55",   confirmButtonText: "Yes, leave session!",   closeOnConfirm: false }, function(){ 
        stopSession = 1;
        leaveRoom();  
        socket.disconnect();
        swal("Disconnected!", "Your session ended successfully", "success"); });

}
function inviteUser(){
    swal({
      title: "Copy Following link to invite others",
      text: window.location+'?room='+room,
      type: "success",
      confirmButtonClass: 'btn-success',
      confirmButtonText: 'Copy Link'
    });
    $('.lead').attr('id', 'link');            
}
var butcl = 0;
function showUserLIst(){
    butcl = 1;
    $('iframe').toggle();
}
$('body').click(function(){
   if(butcl == 0){
      $('iframe').hide();
   }
   butcl = 0; 
});
$(document).on("click",".confirm",function() {
        copyToClipboard(document.getElementById("link"));
});
function copyToClipboard(elem) {
      var targetId = "_hiddenCopyText_";
      var isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
      var origSelectionStart, origSelectionEnd;
      if (isInput) {
          target = elem;
          origSelectionStart = elem.selectionStart;
          origSelectionEnd = elem.selectionEnd;
      } else {
          target = document.getElementById(targetId);
          if (!target) {
              var target = document.createElement("textarea");
              target.style.position = "absolute";
              target.style.left = "-9999px";
              target.style.top = "0";
              target.id = targetId;
              document.body.appendChild(target);
          }
          target.textContent = elem.textContent;
      }
      var currentFocus = document.activeElement;
      target.focus();
      target.setSelectionRange(0, target.value.length);
      var succeed;
      try {
          succeed = document.execCommand("copy");
      } catch(e) {
          succeed = false;
      }
      if (currentFocus && typeof currentFocus.focus === "function") {
          currentFocus.focus();
      }
      
      if (isInput) {
          elem.setSelectionRange(origSelectionStart, origSelectionEnd);
      } else {
          target.textContent = "";
      }
      return succeed;
  }
  /*
     ** screen share part
     **
     */
    function startShare() {
        $('#stop_screen').removeAttr('disabled');
        DetectRTC.screen.sourceId = null;
        captureUserMedia();
        
    }
    function stopShare() {
            globalconstraints = 0;
            leaveForScreenShare();
            Screenpublished = 0;
            $('#share_screen').removeAttr('disabled');
            $("#stop_screen").attr("disabled","disabled");
    }
    var completedflag = 0;
    function completed(constraints) {
        if(completedflag == 0){
            completedflag = 1;
            setTimeout(function(){
              completedflag = 0;
            },3000);

            if (globalconstraints == 0) {
                globalconstraints = constraints;
                register('screen');
            } else if (globalconstraints.video.mandatory.chromeMediaSourceId != constraints.video.mandatory.chromeMediaSourceId) {
                globalconstraints = constraints;
                register('screen');
            }
         }
        }

  var isWebRTCExperimentsDomain = document.domain.indexOf('webrtc-experiment.com') != -1;

        function captureUserMedia(callback, extensionAvailable) {
             //alert('capt');
            ////console.log('captureUserMedia chromeMediaSource', DetectRTC.screen.chromeMediaSource);
            if (browser_name == 'Firefox') {
                if (mozScreenshareAvailable == 0) {
                    swal({
                        title: "Plugin un available?",
                        text: "Screen share plugin is not installed in this browser!",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Install plugin",
                        closeOnConfirm: false
                    }, function() {
                        installFirefoxScreenCapturingExtension();
                        swal("Installing!", "Screenshare plugin is installing. Please reload the application after installation", "success");
                    });
                }
            }
            var screen_constraints = {
                mandatory: {
                    chromeMediaSource: DetectRTC.screen.chromeMediaSource,
                    maxWidth: screen.width > 1920 ? screen.width : 1920,
                    maxHeight: screen.height > 1080 ? screen.height : 1080
                        // minAspectRatio: 1.77
                },
                optional: [{ // non-official Google-only optional constraints
                    googTemporalLayeredScreencast: true
                }, {
                    googLeakyBucket: true
                }]
            };
            // try to check if extension is installed.
            if (isChrome && isWebRTCExperimentsDomain && typeof extensionAvailable == 'undefined' && DetectRTC.screen.chromeMediaSource != 'desktop') {
                DetectRTC.screen.isChromeExtensionAvailable(function(available) {
                    captureUserMedia(callback, available);
                });
                return;
            }

            if (isChrome && isWebRTCExperimentsDomain && DetectRTC.screen.chromeMediaSource == 'desktop' && !DetectRTC.screen.sourceId) {
                DetectRTC.screen.getSourceId(function(error) {
                    if (error && error == 'PermissionDeniedError') {
                        $('#screen_share').show();
                        alert('PermissionDeniedError: User denied to share content of his screen.');
                    }

                    captureUserMedia(callback);
                });
                return;
            }

            // for non-www.webrtc-experiment.com domains
            if (isChrome && !isWebRTCExperimentsDomain && !DetectRTC.screen.sourceId) {
                window.addEventListener('message', function(event) {
                    if (event.data && event.data.chromeMediaSourceId) {
                        var sourceId = event.data.chromeMediaSourceId;
                        DetectRTC.screen.sourceId = sourceId;
                        DetectRTC.screen.chromeMediaSource = 'desktop';
                        if (sourceId == 'PermissionDeniedError') {
                            $('#screen_share').show();
                            return alert('User denied to share content of his screen.');
                        }
                        captureUserMedia(callback, true);
                    }
                    if (event.data && event.data.chromeExtensionStatus) {
                        //alert(event.data.chromeExtensionStatus);
                        DetectRTC.screen.chromeMediaSource = 'screen';
                        ///installed-disabled
                        console.log(event.data.chromeExtensionStatus);
                        if (event.data.chromeExtensionStatus != "not-installed") {
                            captureUserMedia(callback, true);
                        } else {
                            if (browser_name == 'Chrome') {
                                $('#screen_share').show();
                                //var inst_html = '<button type="button" onclick="installPlugin()" class="blue-button">Click to Install</button>';
                                //$("#modal").html("<h3>Message</h3> <p>You need to install chrome extension for screenshare. After installation reload the application.</p>"+inst_html).modal();
                                swal({
                                    title: "Plugin un available?",
                                    text: "Screen share plugin is not installed in this browser!",
                                    type: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: "Install plugin",
                                    closeOnConfirm: false
                                }, function() {
                                    installPlugin();
                                    swal("Redirected!", "You are redirected to chrome extension page. Please reload the application after installation", "success");
                                });
                            } else {
                                swal("Browser not support!", "Screen share is only supported in chrome and firefox")
                                    //$("#modal").html("<h3>Message</h3> <p>Screen share is only supported in chrome and firefox</p>").modal();
                                    //swal({   title: "Plugin un available?",   text: "Screen share plugin is not installed in this browser!",   type: "warning",   showCancelButton: true,   confirmButtonColor: "#DD6B55",   confirmButtonText: "Install plugin",   closeOnConfirm: false }, function(){installPlugin();swal("Installing!", "Screen share plugin will installed shortly. Please reload the application after completing installation.", "success"); });
                            }

                        }

                    }
                    //////console.log("scr-status="+event.data);
                });
                screenFrame.postMessage();
                return;
            }

            if (isChrome && DetectRTC.screen.chromeMediaSource == 'desktop') {
                screen_constraints.mandatory.chromeMediaSourceId = DetectRTC.screen.sourceId;
            }

            var constraints = {
                audio: false,
                video: screen_constraints
            };

            if (!!navigator.mozGetUserMedia) {
                screen_constraints = {
                    mozMediaSource: 'screen',
                    mediaSource: 'screen',
                    maxFrameRate: 1,
                    width: {
                        ideal: 640
                    },
                    height: {
                        ideal: 360
                    }
                };
                var constraints = {
                    audio: false,
                    video: screen_constraints
                };

            }

            completed(constraints);

            //////console.log( JSON.stringify( constraints , null, '\t') );
        }

        function installPlugin() {
            //var win = window.open('https://chrome.google.com/webstore/detail/enable-screen-capturing-m/hngjcmfglajjgiakgifganehohegkioj', '_blank');
            var win = window.open('https://chrome.google.com/webstore/detail/screen-capturing/adaihbmoiekaekcebiiopjpkebbgcinf', '_blank');
            win.focus();
            // $("#install-button").trigger("click");
        }

        function installFirefoxScreenCapturingExtension() {
            InstallTrigger.install({
                'Foo': {
                   // URL: 'https://addons.mozilla.org/firefox/downloads/file/498439/mercury_minds-1.0.008-fx.xpi?src=dp-btn-primary',
                    URL: 'https://addons.mozilla.org/firefox/downloads/file/363432/enable_screen_capturing_in_firefox-1.0.007-fx.xpi?src=dp-btn-primary',
                    toString: function() {
                        return this.URL;
                    }
                }
            });
        }
        /*
         * screen share init
         *
         */
        (function() {


            var uniqueToken = document.getElementById('unique-token');
            if (uniqueToken)
                if (location.hash.length > 2) uniqueToken.parentNode.parentNode.parentNode.innerHTML = '<h2 style="text-align:center;"><a href="' + location.href + '" target="_blank">Share this link</a></h2>';
                else uniqueToken.innerHTML = uniqueToken.parentNode.parentNode.href = '#' + (Math.random() * new Date().getTime()).toString(36).toUpperCase().replace(/\./g, '-');
        })();

        var Firefox_Screen_Capturing_Warning = 'Make sure that you are using Firefox Nightly and you enabled: media.getusermedia.screensharing.enabled flag from about:config page. You also need to add your domain in "media.getusermedia.screensharing.allowed_domains" flag.';

        var screenFrame, loadedScreenFrame;

        function loadScreenFrame(skip) {
            if (loadedScreenFrame) return;
            if (!skip) return loadScreenFrame(true);
            loadedScreenFrame = true;
            var iframe = document.createElement('iframe');
            iframe.onload = function() {
                iframe.isLoaded = true;
                ////console.log('Screen Capturing frame is loaded.');

            };
            //iframe.src = 'assets/others/getSourceId.html';

            //iframe.src = 'https://www.webrtc-experiment.com/getSourceId/';
            iframe.src = 'https://jam-webrtc.youseeu.com/MS2Part2/getSourceId.html';
            //iframe.src = protocol+domain+'/getSourceId.html';
            iframe.style.display = 'none';
            (document.body || document.documentElement).appendChild(iframe);
            screenFrame = {
                postMessage: function() {
                    if (!iframe.isLoaded) {
                        setTimeout(screenFrame.postMessage, 100);
                        return;
                    }
                    ////console.log('Asking iframe for sourceId.');
                    iframe.contentWindow.postMessage({
                        captureSourceId: true
                    }, '*');
                }
            };
        };

        if (!isWebRTCExperimentsDomain) {
            loadScreenFrame();
        }


        // todo: need to check exact chrome browser because opera also uses chromium framework
        var isChrome = !!navigator.webkitGetUserMedia;

        // DetectRTC.js - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/DetectRTC
        // Below code is taken from RTCMultiConnection-v1.8.js (http://www.rtcmulticonnection.org/changes-log/#v1.8)
        var DetectRTC = {};
        // initScreen();
        //function initScreen(){
        (function() {

            var screenCallback;
            DetectRTC.screen = {
                chromeMediaSource: 'screen',
                getSourceId: function(callback) {
                    if (!callback) throw '"callback" parameter is mandatory.';
                    screenCallback = callback;
                    window.postMessage('get-sourceId', '*');
                },
                isChromeExtensionAvailable: function(callback) {
                    if (!callback) return;

                    if (DetectRTC.screen.chromeMediaSource == 'desktop') return callback(true);

                    // ask extension if it is available
                    window.postMessage('are-you-there', '*');

                    setTimeout(function() {
                        if (DetectRTC.screen.chromeMediaSource == 'screen') {
                            callback(false);
                        } else callback(true);
                    }, 2000);
                },
                onMessageCallback: function(data) {
                    if (!(typeof data == 'string' || !!data.sourceId)) return;

                    ////console.log('chrome message', data);

                    // "cancel" button is clicked
                    if (data == 'PermissionDeniedError') {
                        DetectRTC.screen.chromeMediaSource = 'PermissionDeniedError';
                        if (screenCallback) return screenCallback('PermissionDeniedError');
                        else throw new Error('PermissionDeniedError');
                    }
                    // extension shared temp sourceId
                    if (data.sourceId) {
                        DetectRTC.screen.sourceId = data.sourceId;
                        if (screenCallback) screenCallback(DetectRTC.screen.sourceId);
                    }
                },
                getChromeExtensionStatus: function(callback) {
                    if (!!navigator.mozGetUserMedia) return callback('not-chrome');
                    //var extensionid = 'ajhifddimkapgcifgcodmmfdlknahffk';
                    var extensionid = 'adaihbmoiekaekcebiiopjpkebbgcinf';
                    var image = document.createElement('img');
                    image.src = 'chrome-extension://' + extensionid + '/icon.png';
                    image.onload = function() {
                        DetectRTC.screen.chromeMediaSource = 'screen';
                        window.postMessage('are-you-there', '*');
                        setTimeout(function() {
                            if (!DetectRTC.screen.notInstalled) {
                                callback('installed-enabled');
                            }
                        }, 5000);
                    };
                    image.onerror = function() {

                        DetectRTC.screen.notInstalled = true;
                        callback('not-installed');
                    };
                }
            };

            // check if desktop-capture extension installed.
            if (window.postMessage && isChrome) {
                DetectRTC.screen.isChromeExtensionAvailable();
            }
        })();

        //}

        DetectRTC.screen.getChromeExtensionStatus(function(status) {
            if (status == 'installed-enabled') {
                // alert('Extension installed');
                DetectRTC.screen.chromeMediaSource = 'desktop';
            }
        });

        window.addEventListener('message', function(event) {
            if (event.origin != window.location.origin) {
                return;
            }

            DetectRTC.screen.onMessageCallback(event.data);
        });
        var dom_arr = [];
            dom_arr.push(protocol+domain);
            dom_arr.push(domain);
        window.postMessage({
            enableScreenCapturing: true,
            domains: dom_arr
        }, "*");

        // watch addon's response
        // addon will return "enabledScreenCapturing=true" for success
        // else "enabledScreenCapturing=false" for failure (i.e. user rejection)
        window.addEventListener("message", function(event) {
            var addonMessage = event.data;

            if (!addonMessage || typeof addonMessage.enabledScreenCapturing === 'undefined') return;

            if (addonMessage.enabledScreenCapturing === true) {
                mozScreenshareAvailable = 1;
            }
        }, false);

        /*
         * get browser name
         */
        var isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);

        function getBrowserInfo() {
            var nVer = navigator.appVersion;
            var nAgt = navigator.userAgent;
            var browserName = navigator.appName;
            var fullVersion = '' + parseFloat(navigator.appVersion);
            var majorVersion = parseInt(navigator.appVersion, 10);
            var nameOffset, verOffset, ix;
            var screenshareok = 0;
            // In Opera, the true version is after 'Opera' or after 'Version'
            if ((verOffset = nAgt.indexOf('OPR')) !== -1) {
                browserName = 'Opera';
                fullVersion = nAgt.substring(verOffset + 6);

                if ((verOffset = nAgt.indexOf('Version')) !== -1) {
                    fullVersion = nAgt.substring(verOffset + 8);
                }
            }
            // In MSIE, the true version is after 'MSIE' in userAgent
            else if ((verOffset = nAgt.indexOf('MSIE')) !== -1) {
                browserName = 'IE';
                fullVersion = nAgt.substring(verOffset + 5);
            }
            // In Chrome, the true version is after 'Chrome' 
            else if ((verOffset = nAgt.indexOf('Chrome')) !== -1) {
                browserName = 'Chrome';
                fullVersion = nAgt.substring(verOffset + 7);
                screenshareok = 1;
            }
            // In Safari, the true version is after 'Safari' or after 'Version' 
            else if ((verOffset = nAgt.indexOf('Safari')) !== -1) {
                browserName = 'Safari';
                fullVersion = nAgt.substring(verOffset + 7);

                if ((verOffset = nAgt.indexOf('Version')) !== -1) {
                    fullVersion = nAgt.substring(verOffset + 8);
                }
            }
            // In Firefox, the true version is after 'Firefox' 
            else if ((verOffset = nAgt.indexOf('Firefox')) !== -1) {
                browserName = 'Firefox';
                fullVersion = nAgt.substring(verOffset + 8);
                screenshareok = 1;
            }

            // In most other browsers, 'name/version' is at the end of userAgent 
            else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
                browserName = nAgt.substring(nameOffset, verOffset);
                fullVersion = nAgt.substring(verOffset + 1);

                if (browserName.toLowerCase() === browserName.toUpperCase()) {
                    browserName = navigator.appName;
                }
            }

            if (isEdge) {
                browserName = 'Edge';
                // fullVersion = navigator.userAgent.split('Edge/')[1];
                fullVersion = parseInt(navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)[2], 10);
            }

            // trim the fullVersion string at semicolon/space if present
            if ((ix = fullVersion.indexOf(';')) !== -1) {
                fullVersion = fullVersion.substring(0, ix);
            }

            if ((ix = fullVersion.indexOf(' ')) !== -1) {
                fullVersion = fullVersion.substring(0, ix);
            }

            majorVersion = parseInt('' + fullVersion, 10);

            if (isNaN(majorVersion)) {
                fullVersion = '' + parseFloat(navigator.appVersion);
                majorVersion = parseInt(navigator.appVersion, 10);
            }
            if (browserName == "Netscape") {
                browserName = "Internet Explorer";
            }

            if (screenshareok == 0) {
                // $('#screen-li').html('Screen share is only supported in chrome and firefox');
            }
            return {
                fullVersion: fullVersion,
                version: majorVersion,
                name: browserName
            };
        }
        browser_name = getBrowserInfo();
        browser_name = browser_name.name;