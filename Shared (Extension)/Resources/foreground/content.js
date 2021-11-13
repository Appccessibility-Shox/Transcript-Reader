var frameUrl, srcUrl, crossOrigin, transcriptChannelPort, confirmationChannelPort, lastUsedOptions, sourceWindow;
var currentlyRunning = false;

browser.runtime.onMessage.addListener((msg) => {
  var triggeredByContextMenu = msg.action === 'contextMenuItemClicked'
  var triggeredByToolbarItem = msg.action === 'readerToolbarButtonClicked'
  
  frameUrl = msg.frameUrl === undefined ? null : msg.frameUrl
  srcUrl = msg.srcUrl === undefined ? null : msg.srcUrl
  crossOrigin = (frameUrl && new URL(frameUrl).hostname !== window.location.hostname) ? true : false
  
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
  
  // 1. get the relevant player.
  // There's a little bit of complexity to this step due to one fact: when the user selects an iframe via the context menu, source.js is injected into it immediately by the background scrip and the content script thus has no reference to it. In that case, we use getSourceWindow() to just ask all frames to tell us if they have source.js injected. Only the one with source.js injected will know to respond in the affirmative. In the case where the background script doesn't inject source.js, we know that we get to decide which player (iframes + videos) should become the source frame. That's what is happening inside the if (!frameUrl) block.
  var video = null;
  if (!frameUrl) {
    // ^ if there's a frameUrl, that means the background script would have already injected source.js into the source video.
    data = await getRelevantVideo(srcUrl);
    player = data.element;
    if (player.tagName === "IFRAME") {
      sourceWindow = player.contentWindow
      sourceWindow.postMessage("selectedAsSourceFrameByTR", "*")
      frameUrl = data.frameUrl;
      crossOrigin = new URL(frameUrl).hostname !== window.location.hostname;
      getOptionSet().then(newOptions => {
        options = newOptions;
        lastUsedOptions = newOptions;
      });
    } else if (player.tagName === "VIDEO") {
      video = data.element
    }
  } else {
    try {
      sourceWindow = await getSourceWindow()
    } catch(e) {
      console.log(`Error getting frame containing source.js ${e}`)
    }
  }
  
  // 1-2. log video playback properties so that when you create an inserted video, you can set its playback properties to match the original.
  sourcePlayer = sourceWindow ?? video
  originalPlaybackProperties = await getVideoPlaybackProperties(sourcePlayer);
  
  // 2. run site-specific preparations.
  if (!options.hasOwnProperty('prepare') || frameUrl) {
    options.prepare = function () {
      return Promise.resolve();
    };
  }

  await options.prepare(video);
  
  // 3. get the transcript.
  try {
    if (frameUrl) {
      transcriptChannelPort = await getPortConnection("Transcript Channel Port", function() {
        if (sourceWindow) {
          sourceWindow.postMessage("Send transcript channel port", "*")
        } else {
          Array.from(window.frames).forEach((frame) => {frame.postMessage("Send transcript channel port", "*")})
        }
      });
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

  // 4. generate reader template
  const [reader, container, transcript, background, videoContainer] = createReader();
  transcript.innerHTML = transcriptData.toHTML();

  const inserted = await insertVideoIntoReader(options, video, videoContainer);
  
  // sync video times
  // TODO: Because ads can ruin this, we may want to have as a little button at the top of the reader "Skip to [currentTimeFromA]" whenever the inserted video is at a time between 0 & 5 seconds.
  insertedPlayer = inserted?.container?.contentWindow ?? inserted?.video
  setVideoPlaybackProperties(insertedPlayer, originalPlaybackProperties)

  // booleans for readability
  const addable = (!transcriptData.unhighlightable && options.transcriptSource == transcriptSources.TRACK && transcriptData.track != null); // note that addable is false when the source frame is sending additions.
  const scrubbable = (options.videoSource !== videoSources.MOVE_FROM_PAGE);

  // 6-a. addition:
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

  // 6-b. addition via cross-origin frame.
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

  // 7. highlihting.
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

  // 8. hiding page while reader is displayed:
  html.classList.add("tr-enabled")
  
  // 9. teardown:
  container.onclick = function (e) {
    if (e.target == e.currentTarget) {
      syncVideoPlaybackProperties(insertedPlayer, sourcePlayer)
      currentlyRunning = false;
      teardown(options, inserted, reader)
    }
  };
  
  document.onkeypress = function (e) {
    if (e.key === "Escape") {
      syncVideoPlaybackProperties(insertedPlayer, sourcePlayer)
      currentlyRunning = false;
      teardown(options, inserted, reader)
    }
  }
}

window.addEventListener("message", (event) => {
  if (event.data === "I'm the source frame activated by bg page") {
    sourceWindow = event.source
  }
})
