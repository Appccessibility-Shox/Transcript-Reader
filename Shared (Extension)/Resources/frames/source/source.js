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
      resolve(vimeoCrossOriginOptions);
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
    transcriptData = await getTranscript(options, video);
    return Promise.resolve(transcriptData)
  } catch(error) {
    console.log(error)
    if (options.alternative) {
      return main(options.alternative)
    }
  }
}

function getTranscript(options, video) {
  console.log("transcribing.")
  const transcript = new Promise((resolve, reject) => {
    tracks = video.textTracks;
    track = getPreferredTrack(tracks);
    
    if (track) { track.mode = 'showing'; }
    
    switch (options.transcriptSource) {
      case transcriptSources.TRACK: {
        console.log("track")
        if (!track.cues) {
          continuallySetTrackToShowingUntilCuesExist(video)
            .catch((err) => reject(err));
        }

        const transcriptData = new TranscriptData(track, null, video.duration);
        updateForegroundOfNewCues(track);
        
        if (transcriptData.trackIsLazyLoaded) {
          // TODO: refactor this redundant code (the switch statement is copy-pasted).
          scrubPreference = options.trackScrubOption;
          if (!scrubPreference) {
            confirmation().then(userResponse => {
              console.log(userResponse)
              scrubPreference = userResponse
              switch (scrubPreference) {
                case trackScrubOptions.REAL_TIME:
                  console.log("realtime with Bill Maher")
                  resolve(transcriptData);
                  break;
                case trackScrubOptions.OUTSET:
                  console.log("outset with Bill Maher")
                  scrubEntireVideo(video, 5).then(() => {
                    video.playbackRate = 1;
                    resolve(transcriptData);
                  });
                  break;
              }
            })
          }
          switch (scrubPreference) {
            case trackScrubOptions.REAL_TIME:
              console.log("realtime with Bill Maher")
              resolve(transcriptData);
              break;
            case trackScrubOptions.OUTSET:
              console.log("outset with Bill Maher")
              scrubEntireVideo(video, 5).then(() => {
                video.playbackRate = 1;
                resolve(transcriptData);
              });
              break;
          }
        } else {
          resolve(transcriptData);
        }
        break;
      }
      case transcriptSources.TRANSCRIPT:
        console.log("transcript")
        options.openTranscript()
          .then(() => {
            const texts = Array.from(document.querySelectorAll(options.cueTextSelector)).map((element) => element.innerText);
            const startTimes = Array.from(document.querySelectorAll(options.timeStampSelector)).map((element) => element.innerText).map((hms) => hms.toSeconds());
            const transcriptData = new TranscriptData(track, texts, video.duration, startTimes);
            resolve(transcriptData);
          })
          .catch((error) => reject(error));
        break;
      case transcriptSources.FETCH:
        frameUrl = window.location.href
        options.fetchTranscript(frameUrl)
          .then((transcriptData) => resolve(transcriptData))
          .catch((error) => reject(error));
        break;
      case transcriptSources.PLAIN_TEXT:
        var possibleSources = Array.from(document.querySelectorAll(options.plainTextSelector));

        if (options.joinPlainTextSelectorMatches) {
          script = Array.from(document.querySelectorAll(options.plainTextSelector)).map((match) => match.innerText).join(' ');
          const transcriptData = new TranscriptData(track, [script], video.duration);
          resolve(transcriptData);
        }

        if (possibleSources.length === 0) {
          reject(new Error(`Searched for plaintext transcript at selector matching ${options.plainTextSelector}, but couldn't find any elements matching this selector.`));
        } else if (possibleSources.length === 1) {
          const transcriptData = new TranscriptData(track, [document.querySelector(options.plainTextSelector).innerText], video.duration);
          resolve(transcriptData);
        } else if (track.cues) {
          // When there are multiple matches of the plainTextSelector, we might be able to use the track to know which to use.
          const knownTextString = Array.from(track.cues).map((cue) => cue.text).join(' ');
          const bestMatch = getBestMatch(knownTextString, possibleSources);
          const transcriptData = new TranscriptData(track, [bestMatch.innerText], video.duration);
          resolve(transcriptData);
        } else {
          reject(new Error('Unfortunately, multiple matches existed for the transcript selector, and we were not able to use the track to determine which was right. Hence, the following transcript might be incorrect. Please consider filing an issue at https://github.com/Appccessibility-Shox/Transcript-Reader/issues'));
        }
        break;
      default:
        reject(new Error("Couldn't get transcript. The options object's transcript source property must be set to either 'track', 'transcript', 'plaintext' or 'fetch'."));
    }
  })
  
  return transcript
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
function confirmation() {
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
