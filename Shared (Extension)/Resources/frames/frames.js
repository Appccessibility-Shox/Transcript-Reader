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
}, false);
