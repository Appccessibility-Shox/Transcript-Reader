var transcriptChannel = new MessageChannel();

// transfer ownership of port2 to the main window.
mainWindow = window.top;
mainWindow.postMessage('Transcript Channel Port', '*', [transcriptChannel.port2]);

// listen for messages on this channel that the main window sends here.
transcriptChannel.port1.onmessage = function(e) {
  if (e.data == "getTranscript") {
    
    getOptionSet().then(options => main(options)).then(transcriptData => {
      messageData = {
        name: "getTranscriptResponse",
        blurbs: transcriptData.texts,
        startTimes: transcriptData.startTimes,
        duration: 30
      }
      console.log(messageData)
      transcriptChannel.port1.postMessage(messageData)
    })
  }
}

// choose option set based on frame's url.
function getOptionSet() {
  return new Promise((resolve, reject) => {
    if (window.location.hostname === 'www.youtube.com') {
      resolve(youTubeOptions);
    } else if (window.location.hostname === 'player.vimeo.com') {
      resolve(vimeoOptions);
    } else {
      resolve(defaultOptions);
    }
  })
}

async function main(options) {
  console.log("maining")
  const video = document.querySelector("video") // in the case of an iframe, we can assume there's only one video.
  
  if (options.hasOwnProperty('prepare')) {
    await options.prepare(video);
  }
  
  try {
    transcriptData = await getTranscript(options, video, null);
    return Promise.resolve(transcriptData)
  } catch(error) {
    console.log(error)
    if (options.alternative) {
      return main(options.alternative)
    }
  }
}

function updateForegroundOfNewCues(track) {
  track.addEventListener('cuechange', () => {
    Array.from(track.cues).forEach((cue) => {
        messageData = {
        name: "addedCue",
        text: cue.text,
        startTime: cue.startTime
      }
      transcriptChannel.port1.postMessage(messageData)
    })
  })
}

// Thanks to Tamás Sallai for his tutorial explaining how to integrate promises with a MessageChannel.
// https://advancedweb.hu/how-to-use-async-await-with-postmessage/
function requestConfirmationResultFromMainWindow() {
  return new Promise((resolve, reject) => {
    const confirmationChannel = new MessageChannel();
    console.log("confirmation is running")
    confirmationChannel.port1.onmessage = ({data}) => {
      confirmationChannel.port1.close();
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
    };
    mainWindow.postMessage("Confirmation Channel Port", "*", [confirmationChannel.port2]);
  })
}
