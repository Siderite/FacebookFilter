// executeScript's a function rather than a string
function remex(tabId, func, callback) {
	chrome.tabs.executeScript(tabId, {
		code : '(' + func.toString() + ')()'
	}, function () {
		if (callback)
			return callback.apply(this, arguments);
	});
}

function windowContextRemex(tabId,srcOrFunc,callback) {
	var code='var script = document.createElement("script");';
	switch(typeof(srcOrFunc)) {
		case 'function':
			var f=JSON.stringify(srcOrFunc.toString());
			code+='script.innerHTML = "('+f.substr(1,f.length-2)+')();";';
			break;
		case 'string':
			code+='script.src="'+chrome.extension.getURL(srcOrFunc)+'";';
			break;
		default:
			throw "srcOrFunc needs to be a string URL or a contextless function";
	}
	code+='document.body.appendChild(script)';
	chrome.tabs.executeScript(tabId, {
		code : code
	}, function () {
		if (callback)
			return callback.apply(this, arguments);
	});
}

function initJqueryOnWebPage(tab, callback) {
	// the function to be executed on the loaded web page
	function f() {
		// return if jQuery is already loaded as ex$
		if (window.ex$)
			return;
		// create a script element to load jQuery
		var script = document.createElement('script');
		// create a second script tag after loading jQuery, to avoid conflicts
		script.onload = function () {
			var noc = document.createElement('script');
			// this should display in the web page's console
			noc.innerHTML = 'window.ex$=jQuery.noConflict(true);window.extensionBaseUrl=\''+chrome.extension.getURL('')+'\';';
			document.body.appendChild(noc);
		};
		// use extension.getURL to get at the packed script
		script.src = chrome.extension.getURL('jquery-2.2.2.min.js');
		document.body.appendChild(script);
	};
	// execute the content of the function f
	remex(tab.id, f, function () {
		if (typeof(callback)=='function') callback();
	}); // this should log in the background/popup page console
}

function fixConsoleWarning() {
	__d("Chromedome", ["fbt"], function(a, b, c, d, e, f, g) {
    	f.start = function(h) {	};
	});
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (!tab.url||tab.url.toLowerCase() != 'https://www.facebook.com/')
		return;
	windowContextRemex(tab.id, fixConsoleWarning, function () {
		if (changeInfo && changeInfo.status == 'complete') {
			initJqueryOnWebPage(tab, function () {
				windowContextRemex(tab.id, 'fbFilter.js');
			});
		}
	});
});