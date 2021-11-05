// toolbar button clicked
function sendMessageToContentScript() {
  browser.tabs.query({active: true, currentWindow: true}, function(tabs){
    browser.tabs.sendMessage(tabs[0].id, {action: "readerToolbarButtonClicked"}, function(response) {});
  });
}

browser.browserAction.onClicked.addListener(sendMessageToContentScript);

// context menu clicked
var contextMenuItem = {
  "id": "openTR",
  "title": "Open Player in Transcript Reader",
  "contexts": ["frame", "video"]
};

browser.contextMenus.create(contextMenuItem);

var frameId;

browser.contextMenus.onClicked.addListener(function(clickData) {
  if (clickData.menuItemId == "openTR" && clickData.frameUrl) {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs){
      browser.tabs.sendMessage(tabs[0].id, {action: "contextMenuItemClicked", "srcUrl": clickData.srcUrl, "frameUrl": clickData.frameUrl, "id": clickData.frameId, tid: tabs[0].id});
    });
    
    browser.tabs.query({active: true, currentWindow: true}, function(tabs){
      browser.tabs.executeScript(tabs[0].id, {
        file: "/frames/source/source.js",
          frameId: clickData.frameId
      });
    });
  }
  else if (clickData.menuItemId === "openTR") {
    sendMessageToContentScript();
  }
})
