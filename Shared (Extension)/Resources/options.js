/*  template
const siteSpecificOptions = {
  
  * prepare(video) - (optional) a site-specific function which takes the video as its parameter and, if set, will run just before getTranscript. It should be used to prepare the video for getTranscript.
  
  * videoSource - (required) "embed", "copy" or "move". This will determine where the video in the reader comes from.
    - embed: A link will be used to embed an iframe into the reader, so of course you'll have to provide an getEmbedLink function.
    - move: The video will be moved into the reader.
    - copy: the video will be cloned and then moved. Be cautious about doing this when the video's src is a blob url.
  * getEmbedLink - (required when videoSource == "embed") a function that will run on the page and must return the link to produce the iframe to embed. Only required if videoSource == "embed".
  
  * transcriptSource - (required) "track", "transcript", "plain", or "fetch". Determines how the video's transcript will be discovered.
    - track: will use video.textTracks to find the video's transcription.
    - transcript: some sites, like YouTube and Ted, provide html transcripts.
    - plain: some sites, like Fox News, simply place the transcript for their videos as the body of the article. Hence, no cue startTime information could be gleaned. In these cases, the text shouldn't highlight while playing but rather should just behave as plaintext in the reader.
    - fetch: technically, you just have to provide some function that returns a cueObject. Obviously, it would make sense semantically to make a fetch request to return a cueObject, but it's not enforced in any way.
  * openTranscript - (optional. To be used when transcriptSource == "transcript". Immediately resolves by default). To scrape html transcript, you may also want to provide a function that returns a promise that resolves when the transcript is ready to be scraped. For example, on YouTube, this would resolve only after the ... button has been clicked, then the "Open Transcript" button has been clicked, then the transcript the appears.
  * cueTextSelector - (Required when transcriptSource == "plain"). The selector that will return an array of elements with each containing one cue.
  * plainTextSelector - (Required when transcriptSource == "plain"). The selector that contains **all** of the text in the video. If multiple elements match the given selector, the cue text of the video will be used to decide which one is best. If that approach is impossible, querySelector will be used to simply select the first.
  * fetchTranscript - (Required when transcriptSource == "fetch"). To fetch a url and then return a cueObject.
 
  * trackScrubOption – (optional). Determines how the track should be scrubbed in the case that the track appears to be lazy loaded.
    – realtime: the video will be scrubbed after the reader is opened and the user will see the reader being populated in realtime.
    - outset: the video will be scrubbed quickly first, and then the transcript will be displayed.
  
  * alternative - (optional). An options object. If the first transcriptSources fails, an alternative set of otions will be used.
  
  * joinPlainTextSelectorMatches - (optional) a boolean that determines whether querySelectorAll should join all matches.
}
*/

const trackScrubOptions = {
  OUTSET: "outset",
  REAL_TIME: "realtime"
}

const transcriptSources = {
  FETCH: "fetch",
  OTHER: "other",
  PLAIN_TEXT: "plain",
  TRACK: "track",
  TRANSCRIPT: "transcript"
}

const videoSources = {
  COPY_VIDEO: "copy",
  EMBED_VIDEO: "embed",
  MOVE_FROM_PAGE: "move"
}

/////// Site-specific options ///////

const defaultOptions = {
  "videoSource": videoSources.COPY_VIDEO,
  "transcriptSource": transcriptSources.TRACK
}

const tedOptions = {
  "videoSource": videoSources.MOVE_FROM_PAGE,
  "transcriptSource": transcriptSources.TRANSCRIPT,
  "openTranscript": function(video) {
    Array.from(document.querySelectorAll(".css-yyu8zw a")).filter(element => element.href.includes("transcript"))[0].click();
    
    const checkForTranscript = new Promise((resolve, reject) => {
      const numberOfMilisecondsBetweenChecks = 10;
      const maxNumberOfChecksBeforeError = 100;
      const index = 1;
    
      const selector = ".Grid p a";
      var checksMadeSoFar = 0;

      const checker = setInterval(function() {
        if (checksMadeSoFar > maxNumberOfChecksBeforeError) {
          clearInterval(checker);
          reject("Timed out while attempting to find 'Open Transcript' button.");
        }
        if (document.querySelectorAll(selector).length > 0) {
          clearInterval(checker);
          resolve();
        }
      }, numberOfMilisecondsBetweenChecks);
    });
    
    return checkForTranscript;
  },
  "cueTextSelector": ".Grid p a",
  "timeStampSelector": ".asdflkjaslkjdflkasjfdlkasjdf"
}

// simulate a click of the ... button on youtube and try to click "Open Transcript" before scraping it.
const youTubeOptionsAlternative3 = {
  "videoSource": videoSources.EMBED_VIDEO,
  "transcriptSource": transcriptSources.TRANSCRIPT,
  "openTranscript": function() {
    document.querySelector("#info div#menu button[aria-label='More actions']").click();
    
    const openTranscript = new Promise((resolve, reject) => {
      const numberOfMilisecondsBetweenChecks = 200;
      const maxNumberOfChecksBeforeError = 100;
      const index = 1;
    
      const selector = "ytd-menu-service-item-renderer";
      var checksMadeSoFar = 0;

      const checker = setInterval(function() {
        if (checksMadeSoFar > maxNumberOfChecksBeforeError) {
          clearInterval(checker)
          reject("Timed out while attempting to find 'Open Transcript' button.")
        }
        if (document.querySelectorAll(selector).length == 1) {
          reject("Only one option in the more actions (a.k.a. '...') menu dropdown.")
        }
        if (document.querySelectorAll(selector).length > 1) {
          document.querySelectorAll(selector)[index].click()
          clearInterval(checker)
          resolve()
        }
      }, numberOfMilisecondsBetweenChecks)
    });
    
    const scrapeTranscript = new Promise((resolve, reject) => {
      const numberOfMilisecondsBetweenChecks = 300;
      const maxNumberOfChecksBeforeError = 15;
      const selector = "ytd-transcript-body-renderer";
    
      var checksMadeSoFar = 0;
      
      const checker = setInterval(function() {
        if (checksMadeSoFar > maxNumberOfChecksBeforeError) {
          clearInterval(checker)
          reject("Timed Out While Awaiting Transcript to Download.")
        }
        if (document.querySelectorAll(selector).length == 1) {
          clearInterval(checker);
          resolve();
        }
      }, numberOfMilisecondsBetweenChecks)
    })
    
    return openTranscript.then(function() {
      return scrapeTranscript
    });
  },
  "timeStampSelector": ".cue-group-start-offset.ytd-transcript-body-renderer",
  "cueTextSelector": ".cues.ytd-transcript-body-renderer",
  "getEmbedLink": function() {
    
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
    
    videoID = getYouTubeVideoIDFromURL(window.location.href);
    
    startTime = document.querySelector("video").currentTime;
    
    return `https://www.youtube.com/embed/${videoID}?fs=0&amp;modestbranding=1&amp;start=${Math.round(startTime)}`
  }
}

// fetch auto-generated YT captions assuming video has changed and making a fetch of a whole new web page.
youTubeOptionsAlternative2 = {
  "videoSource": videoSources.EMBED_VIDEO,
  "getEmbedLink": function() {
    
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
    
    videoID = getYouTubeVideoIDFromURL(window.location.href);
    
    startTime = document.querySelector("video").currentTime;
    
    return `https://www.youtube.com/embed/${videoID}?fs=0&amp;modestbranding=1&amp;start=${Math.round(startTime)}`
  },
  "transcriptSource": transcriptSources.FETCH,
  "fetchTranscript": function(srcUrl) {
    // inspired by Mr. Polywhirl on Stack Overflow.
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
    
    vid = getYouTubeVideoIDFromURL(window.location.href);
    url = `https://www.youtube.com/watch?v=${vid}`
    
    console.log(url)
    
    fetched = fetch(url)
    .then(url => url.text())
    .then(htmlText => {
      var regExp = new RegExp(/playerCaptionsTracklistRenderer.*?(youtube.com\/api\/timedtext.*?)"/);
      escaped = regExp.exec(htmlText)[1];
      return unescaped = JSON.parse(`"https://${escaped}&format=json3"`);
    }).then(unescaped => fetch(unescaped))
    .then(a => a.json())
    .then(json => {
      if (unescaped.match(/v=([^&#]{5,})/)[1] != getYouTubeVideoIDFromURL(window.location.href)) {
      throw "Video changed";
      }
      startTimes = json.events.map(object => Math.round(object.tStartMs/1000))
      texts = json.events.map(object => object.segs).map(segs => {
        if (segs) {
        return segs.map(word => word.utf8).join("")
        } else {
        return "..."
        }
      })
      transcriptData = new TranscriptData(null, texts, null, startTimes)
      return transcriptData;
    })
    
    return fetched
  },
  "alternative": youTubeOptionsAlternative3
}

// fetch auto-generated YT captions assuming the video hasn't been updated due to single-page app design.
const youTubeOptionsAlternative1 = {
  "videoSource": videoSources.EMBED_VIDEO,
  "getEmbedLink": function() {
    
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
    
    videoID = getYouTubeVideoIDFromURL(window.location.href);
    
    startTime = document.querySelector("video").currentTime;
    
    return `https://www.youtube.com/embed/${videoID}?fs=0&amp;modestbranding=1&amp;start=${Math.round(startTime)}`
  },
  "transcriptSource": transcriptSources.FETCH,
  "fetchTranscript": function(srcUrl) {
    // inspired by Mr. Polywhirl on Stack Overflow.
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
  
    // The PHP implementation that inspired this is courtesy of Patrick Shyu.
    var regExp = new RegExp(/playerCaptionsTracklistRenderer.*?(youtube.com\/api\/timedtext.*?)"/);
    escaped = regExp.exec(document.body.innerHTML)[1];
    unescaped = JSON.parse(`"https://${escaped}&format=json3"`);
    
    fetched = fetch(unescaped)
    .then(a => a.json())
    .then(json => {
      if (unescaped.match(/v=([^&#]{5,})/)[1] != getYouTubeVideoIDFromURL(window.location.href)) {
      throw "Video changed";
      }
      startTimes = json.events.map(object => Math.round(object.tStartMs/1000))
      texts = json.events.map(object => object.segs).map(segs => {
        if (segs) {
        return segs.map(word => word.utf8).join("")
        } else {
        return "..."
        }
      })
      transcriptData = new TranscriptData(null, texts, null, startTimes)
      return transcriptData;
    })
    
    return fetched
  },
  "alternative": youTubeOptionsAlternative2
}

// fetch human-generated YT captions.
const youTubeOptions = {
  "videoSource": videoSources.EMBED_VIDEO,
  "getEmbedLink": function() {
    
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
    
    videoID = getYouTubeVideoIDFromURL(window.location.href);
    
    startTime = document.querySelector("video").currentTime;
    
    return `https://www.youtube.com/embed/${videoID}?fs=0&amp;modestbranding=1&amp;start=${Math.round(startTime)}`
  },
  "transcriptSource": transcriptSources.FETCH,
  "fetchTranscript": function(srcUrl) {
    // inspired by Mr. Polywhirl on Stack Overflow.
    function getYouTubeVideoIDFromURL(url){
      // courtesy of Lasnv on Stack Overflow.
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
    
    videoID = getYouTubeVideoIDFromURL((srcUrl || window.location.href));
    
    listUrl = `https://video.google.com/timedtext?type=list&v=${videoID}`
    
    // if you're wondering why we have to fetch two urls, its because of the problem outlined here: https://stackoverflow.com/questions/23665343/get-closed-caption-cc-for-youtube-video . Essentially, if a name attribute exists in the list (see here for an example: http://video.google.com/timedtext?type=list&v=zlJDTxahav0 , then the name attribute has to be in the url to get the transcript. But if it doesn't have a name, it cannot be in the call. See https://video.google.com/timedtext?lang=en&v=zlJDTxahav0&name=en for an example and note it has to have the name attribute based on the previous link XML.
        
    fetched = fetch(listUrl)
      .then(response => response.text())
      .then(data => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");
        englishTrack = xml.querySelector("track[lang_code|='en']"); // there could technically be more than one, but a problem for another day.
        var url;
        if (englishTrack.getAttribute("name") != "") {
          url = `https://video.google.com/timedtext?lang=${englishTrack.getAttribute('lang_code')}&v=${videoID}&name=${englishTrack.getAttribute('name')}&fmt=json3`;
        } else {
          url = `https://video.google.com/timedtext?lang=${englishTrack.getAttribute('lang_code')}&v=${videoID}&fmt=json3`;
        }
        return fetch(url)
      })
      .then(result => result.json())
      .then(json => {
        texts = json.events.map(object => object.segs[0].utf8);
        startTimes = json.events.map(object => Math.round(object.tStartMs/1000));
        transcriptData = new TranscriptData(null, texts, null, startTimes)
        return transcriptData;
      })
      
    return fetched
  },
  "alternative": youTubeOptionsAlternative1
}

const NYTOptions = {
  "videoSource": videoSources.MOVE_FROM_PAGE,
  "transcriptSource": transcriptSources.PLAIN_TEXT,
  "plainTextSelector": "dl",
  "alternative": defaultOptions
}

const WaPoOptions = {
  "videoSource": videoSources.MOVE_FROM_PAGE,
  "transcriptSource": transcriptSources.TRACK
}

const WSJOptions = {
  "videoSource": videoSources.MOVE_FROM_PAGE,
  "transcriptSource": transcriptSources.TRACK,
  "trackScrubOption": trackScrubOptions.REAL_TIME,
  "prepare": function(video) {
    return new Promise((resolve, reject) => {
      ccButton = video.parentElement.querySelector("#video-cc-video-player");
      interval = setInterval(function(){
        if (!Array.from(video.textTracks).some(track => track.cues)) {
          ccButton.click()
        }
        if (getPreferredTrack(video.textTracks).cues.length > 0) {
          console.log(getPreferredTrack(video.textTracks).cues.length)
          clearInterval(interval)
          resolve();
        }
      }, 50);
    })
  }
}

const vimeoOptions = {
  "videoSource": videoSources.MOVE_FROM_PAGE,
  "transcriptSource": transcriptSources.TRACK,
  "trackScrubOption": trackScrubOptions.REAL_TIME,
  "prepare": continuallySetTrackToShowingUntilCuesExist
}

defaultCrossOriginOptions = {
  "videoSource": videoSources.EMBED_VIDEO,
  "getEmbedLink": function() {
  console.log(frameUrl)
  return frameUrl;
  },
  "transcriptSource": transcriptSources.TRACK,
}

vimeoCrossOriginOptions = {
  "videoSource": videoSources.EMBED_VIDEO,
  "getEmbedLink": function() {
  console.log(frameUrl)
  return frameUrl;
  },
  "transcriptSource": transcriptSources.TRACK,
  "trackScrubOption": trackScrubOptions.REAL_TIME
}

vimeoCrossOriginOptionsSource = {
  "transcriptSource": transcriptSources.TRACK,
  "trackScrubOption": trackScrubOptions.REAL_TIME,
  "prepare": continuallySetTrackToShowingUntilCuesExist
}
