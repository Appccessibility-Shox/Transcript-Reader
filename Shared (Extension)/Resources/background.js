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
        frameId = clickData.frameId;
        // send a message to the active tab, or in other words the main page, or in other words to content.js.
        browser.tabs.query({active: true, currentWindow: true}, function(tabs){
            browser.tabs.sendMessage(tabs[0].id, {action: "contextMenuItemClicked", "srcUrl": clickData.srcUrl, "frameUrl": clickData.frameUrl, "id": clickData.frameId, tid: tabs[0].id});
        });
        
        // send a message to the frame where the context menu item was clicked, so that it knows its the source frame.
        // browser.tabs.sendMessage(clickData.frameId, {action: "contextMenuItemClicked", info: ""})
        browser.tabs.query({active: true, currentWindow: true}, function(tabs){
            browser.tabs.executeScript(tabs[0].id, {
              file: "/frames/source/source.js",
              frameId: clickData.frameId
            });
        });
    }
    else if (clickData.menuItemId == "openTR") {
      sendMessageToContentScript();
    }
})
