browser.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  document.querySelector("video").pause();
});

window.addEventListener("message", (event) => {
  if (event.data == "embeddedByTR") {
    const parentWindow = window.top
    
    // update main script with the current time every time there's an update to the time.
    sendMessageOfCurrentTimeToPageInterval = setInterval(function() {
      currentTimeNew = document.querySelector("video").currentTime;
      data = {
        "name": "currentFrameTimeUpdate",
        "time": currentTimeNew
      }
      parentWindow.postMessage(data, "*")
    }, 100);
    
    // if a track exists, update the main script with the active cue's text every time there's a cue change.
    video = document.querySelector("video")
    try {
      track = getPreferredTrack(video.textTracks);
      track.oncuechange = function() {
        track.activeCues.forEach((cue) => {
          data = {
          "name": "currentFrameActiveCueUpdate",
          "text": cue.text
          }
          parentWindow.postMessage(data, "*")
        })
      }
    } catch (e) {
      console.log(e)
    }
    
  }
  
  if (event.data == "Do You Contain A Video?") {
    port = event.ports[0]
    /*
    TODO: For whatever reason, sometime the event.ports[0] is null. It happens on reddit but only when the origin is redditmedia not reddit, so maybe that has something to do with it. The code below just lets you kind of observe this but not sure how I'd go about fixing it.
    if (!port) {
      console.log("no port", window.location.href)
      return
    } else {
      console.log("port", window.location.href)
    } */
    if (!!document.querySelector("video")) {
      port.postMessage({containmentStatus: true, frameUrl: window.location.href})
    } else {
      port.postMessage({containmentStatus: false, frameUrl: window.location.href})
    }
  }
  
  if (event.data === "selectedAsSourceFrameByTR") {
    browser.runtime.sendMessage("inject source.js into me")
  }
  
  if (event.data === "What are the playback properties of your video?") {
    video = document.querySelector("video")
    if (!video) {
      window.top.postMessage({name: "playback properties from frame", error: "No video exists in this frame"}, "*")
    }
    else {
      playbackProperties = {
        "time": video.currentTime,
        "paused": video.paused,
        "muted": video.muted,
        "rate": video.playbackRate
      }
      window.top.postMessage({name: "playback properties from frame", result: playbackProperties}, "*")
    }
  }
  
  if (event.data?.name === "Set Playback Properties") {
    properties = event.data?.properties
    
    video = document.querySelector("video")
    video.currentTime = properties.time ?? 2;
    video.playbackRate = properties.rate ?? 1;
    video.paused = properties.paused ?? true;
    video.muted = properties.muted ?? false;
  }
  
}, false);
