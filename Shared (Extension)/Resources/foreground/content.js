var frameUrl;
var crossOrigin;
var transcriptChannelPort;
var confirmationChannelPort;
var lastUsedOptions;

var currentlyRunning = false;

browser.runtime.onMessage.addListener((msg) => {
  var triggeredByContextMenu = msg.action === 'contextMenuItemClicked'
  var triggeredByToolbarItem = msg.action === 'readerToolbarButtonClicked'
  
  if (triggeredByContextMenu) {
    frameUrl = msg.frameUrl;
    crossOrigin = new URL(frameUrl).hostname !== window.location.hostname
  } else if (triggeredByToolbarItem) {
    frameUrl = null;
    crossOrigin = false;
  }
  
  if (!currentlyRunning && (triggeredByContextMenu || triggeredByToolbarItem)) {
    currentlyRunning = true;
    getOptionSet().then(options => {
      lastUsedOptions = options;
      main(options)
    })
  } else if (!!document.querySelector("transcript-reader") && triggeredByToolbarItem) {
    // tapping the toolbar item when the reader is already displayed should safely teardown the reader.
    currentlyRunning = false;
    insertedVideo = document.querySelector("transcript-reader").shadowRoot.querySelector("video")
    reader = document.querySelector("transcript-reader")
    teardown(lastUsedOptions, insertedVideo, reader)
  }
});

async function main(options) {

  const video = getRelevantVideo(frameUrl);

  if (!options.hasOwnProperty('prepare') || crossOrigin) {
    options.prepare = function () {
      return Promise.resolve();
    };
  }

  await options.prepare(video);

  // get transcript.
  try {
    if (crossOrigin) {
      transcriptChannelPort = await getPortConnection("Transcript Channel Port");
      getPortConnection("Confirmation Channel Port").then((port) => {
        presentConfirmDialogs(() => {port.postMessage({result: trackScrubOptions.OUTSET})}, () => {port.postMessage({result: trackScrubOptions.REAL_TIME})}, () => {port.postMessage({error: "Aborted by user."})})
      });
    }
    var transcriptData = await getTranscript(options, video, transcriptChannelPort);
  } catch (error) {
    if (options.hasOwnProperty('alternative')) {
      lastUsedOptions = options.alternative;
      main(options.alternative);
    } else {
      alert("Error gathering transcript: " + error)
    }
    return;
  }

  // generate reader template
  const [reader, container, transcript, background, videoContainer] = createReader();
  transcript.innerHTML = transcriptData.toHTML();

  const inserted = await insertVideoIntoReader(options, video, videoContainer);

  // booleans for readability
  const addable = (!transcriptData.unhighlightable && options.transcriptSource == transcriptSources.TRACK && transcriptData.track != null); // note that addable is false when the source frame is sending additions.
  const scrubbable = (options.videoSource !== videoSources.MOVE_FROM_PAGE);

  // scrubbing to enable addition:
  if (scrubbable && addable) {
    scrubEntireVideo(video, 5).then(() => {
      scrubEntireVideo(video, 3).then(() => {
        video.pause();
        video.playbackRate = 1;
      });
    });
  }

  // addition:
  if (addable) {
    transcriptData.track.addEventListener('cuechange', () => {
      Array.from(transcriptData.track.cues).forEach((cue) => {
        const targetIndex = transcriptData.addCue(cue.text, cue.startTime);
        const cueAsHTML = document.createElement('div');
        cueAsHTML.classList.add('TRcue'); // TODO: simplify all of this.
        cueAsHTML.innerText = `${removeLineBreaks(cue.text)} `;
        if (targetIndex === -1 || Array.from(container.querySelectorAll('.TRcue')).length === 0) {
          transcript.innerHTML = `<div class='TRcue'>${removeLineBreaks(cue.text)} </div>`;
        } else if (targetIndex === 0) { // oldest cue
          transcript.firstChild.before(cueAsHTML);
        } else if (targetIndex !== null) { // other.
          transcript.querySelectorAll('.TRcue')[targetIndex - 1].after(cueAsHTML);
        }
      });
    });
  }

  // addition via cross-origin frame.
  if (transcriptChannelPort) {
      transcriptChannelPort.addEventListener("message", function(e) {
        if (e.data.name == "addedCue") {
          const targetIndex = transcriptData.addCue(e.data.text, e.data.startTime);
          const cueAsHTML = document.createElement('div');
          cueAsHTML.classList.add('TRcue'); // TODO: simplify all of this.
          cueAsHTML.innerText = `${removeLineBreaks(e.data.text)} `;
          if (targetIndex === -1 || Array.from(container.querySelectorAll('.TRcue')).length === 0) {
            transcript.innerHTML = `<div class='TRcue'>${removeLineBreaks(e.data.text)} </div>`;
          } else if (targetIndex === 0) { // oldest cue
            transcript.firstChild.before(cueAsHTML);
          } else if (targetIndex !== null) { // other.
            transcript.querySelectorAll('.TRcue')[targetIndex - 1].after(cueAsHTML);
          }
        }
      })
    }

  // highlihting.
  if (!transcriptData.unhighlightable && options.transcriptSource !== transcriptSources.PLAIN_TEXT) {
    
    inserted.video?.addEventListener('cuechange', () => {
      Array.from(transcriptData.track.activeCues).forEach((cue) => {
        colorCue(transcriptData, transcript, cue.text);
      })
    });
    
    inserted.video?.addEventListener('timeupdate', () => {
      colorCue(transcriptData, transcript, inserted.video.currentTime);
    });
    
    window.addEventListener("message", (event) => {
      if (event.data.name == "currentFrameTimeUpdate") {
          colorCue(transcriptData, transcript, event.data.time);
      } else if (event.data.name == "currentFrameActiveCueUpdate") {
          colorCue(transcriptData, transcript, event.data.text);
      }
    });
    
  }

  // hiding page while reader is displayed:
  html.classList.add("tr-enabled")
  
  // teardown:
  container.onclick = function (e) {
    if (e.target == e.currentTarget) {
      currentlyRunning = false;
      teardown(options, inserted, reader)
    }
  };
  
  document.onkeypress = function (e) {
    console.log(e.key)
    if (e.key === "Escape") {
      currentlyRunning = false;
      teardown(options, inserted, reader)
    }
  }
}
