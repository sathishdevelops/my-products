chrome.runtime.onInstalled.addListener(() => {
  // Popup drives scans via chrome.scripting; error probe is a content script.
});
