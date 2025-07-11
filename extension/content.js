chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    fetch('http://localhost:8000/track/activity', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url: tab.url, window_title: tab.title, type: 'tab'})
    });
  }
});