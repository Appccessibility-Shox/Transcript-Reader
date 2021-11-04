browser.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    document.querySelector("video").pause();
});

window.addEventListener("message", (event) => {
    if (event.data == "embeddedByTR") {
        const parentWindow = window.top
        
        sendMessageOfCurrentTimeToPageInterval = setInterval(function() {
            currentTimeNew = document.querySelector("video").currentTime;
            data = {
                "name": "currentFrameTimeUpdate",
                "time": currentTimeNew
            }
            parentWindow.postMessage(data, "*")
        }, 100);
        
        video = document.querySelector("video")
        track = getPreferredTrack(video.textTracks)
        if (track) {
          track.mode = "showing";
          track.oncuechange = function() {
            track.activeCues.forEach((cue) => {
              data = {
                "name": "currentFrameCueUpdate",
                "text": cue.text
              }
              parentWindow.postMessage(data, "*")
            })
          }
        }
        
    }
}, false);
