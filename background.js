(function() {

var enabled;
chrome.storage.local.get('enabled',function(result) {
	enabled = !result||typeof(result.enabled)=='undefined'
			? true
			: result.enabled;

function refreshIcon(tabId,value) {
	chrome.browserAction.setIcon({
		path : value
					?'icon.png'
					:'icon_disabled.png',
		tabId : tabId
	});
}

function sendEnabled(tab,enabled) {
	if (!tab) return;
	if (!tab.url || !/http[s]?:\/\/\w+\.facebook\.com/i.test(tab.url)) return;
	refreshIcon(tab.id,enabled);

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  		chrome.tabs.sendMessage(tabs[0].id, {enabled: enabled}, function(response) {
			chrome.storage.local.set({enabled:enabled});
  		});
	});
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	refreshIcon(tab.id,false);
	if (!tab.url || !/http[s]?:\/\/\w+\.facebook\.com/i.test(tab.url))
		return;
	refreshIcon(tab.id,enabled);
	if (changeInfo && changeInfo.status == 'complete') {
		sendEnabled(tab,enabled);
	}
});

chrome.browserAction.onClicked.addListener(function() {
	enabled=!enabled;
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		if (!tabs) return;
		sendEnabled(tabs[0],enabled);
	});
});

});

})();