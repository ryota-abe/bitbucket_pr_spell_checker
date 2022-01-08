chrome.runtime.onMessage.addListener(message => {
    chrome.action.setBadgeBackgroundColor({color: '#FF5630'});
    chrome.action.setBadgeText({text: message.badge});
})
