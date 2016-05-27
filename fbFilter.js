function Processor(extra) {
	if (!extra) return;
	for (var k in extra) {
		this[k]=extra[k];
	}
}
Processor.prototype = {
	init : function () {},
	extractInfo : function (elem, info) {},
	process : function (elem, info) {}
};

function getURL(file) {
	return extensionBaseUrl + file;
}

function StatusProcessor() {}
StatusProcessor.prototype = new Processor({
		init : function () {
			var $ = window.ex$;
			$("<link/>", {
				rel : "stylesheet",
				type : "text/css",
				href : getURL("statusProcessor.css")
			}).appendTo("head");
		},
		getProfile : function (html) {
			var $ = window.ex$;
			//<a class="profileLink" href="https://www.facebook.com/bogdan.vazzolla" data-ft="{&quot;tn&quot;:&quot;l&quot;}" data-hovercard="/ajax/hovercard/user.php?id=100000380052277">Bogdan Vz</a>
			var pl = $(html);
			if (pl.find('a.profileLink').length == 1) {
				pl = pl.find('a.profileLink');
			}
			if (!pl.is('.profileLink'))
				throw "getProfile cannot get profile from " + html;
			var lnk = pl.attr('href');
			var m = /^(?:http[s]?:)?\/\/www\.facebook\.com\/(.*$)/.exec(lnk);
			if (!m)
				throw "cannot understand profile link: " + lnk;
			var userName = m[1];

			var hovercard = pl.attr('data-hovercard');
			m = /id=(\d+)/.exec(hovercard);
			if (!m)
				throw "cannot understand profile hovercard: " + hovercard;
			var id = m[1];

			var name = pl.text();

			return {
				id : id,
				userName : userName,
				name : name
			};
		},
		populateStatus : function (elem, status) {
			var $ = window.ex$;
			elem = $(elem);
			var text = elem.text().replace('\u200E', '').replace('\xA0', ' ');
			var html = elem.html();
			var who = $('a:first', elem).text();
			if (who)
				status.who = who;
			if (elem.text() == who) {
				status.type = 'own content';
				return;
			}
			if (/'s Birthday$/.test(text)) {
				status.type = 'birthday';
				// do birthday
				return;
			}
			var m = / (shared|reacted to|liked|commented on|replied to a comment on|is interested in|updated|added|was tagged|posted|was mentioned|going to|went to) .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this)/.exec(text);
			if (m) {
				status.type = m[1] + ' ' + m[2];
				return;
			}
			if (/ feeling /.test(text)) {
				status.type = 'feeling';
				return;
			}
			if (/ going to an event/.test(text)) {
				status.type = 'going to event';
				return;
			}
			if (new RegExp('^' + who + '\\s+to\\s+').test(text)) {
				status.type = 'content shared to friend';
				return;
			}
			if (new RegExp('^' + who + '\\s+at\\s+').test(text)) {
				status.type = 'check in';
				return;
			}
			if (new RegExp('^' + who + '\\s+is\\s+with\\s+.*\\s+at\\s+').test(text)) {
				status.type = 'check in';
				return;
			}
			if (new RegExp('^' + who + '\\s+is\\s+live\\s+').test(text)) {
				status.type = 'live event';
				return;
			}
			status.type = 'unknown';
			status.temp = text || html;
		},
		extractInfo : function (elem, info) {
			var $ = window.ex$;
			var status = {};
			//var statusElem = $('._5pbw:first', elem);
			var statusElem=getByFt({tn:'C'},elem).first();
			this.populateStatus(statusElem, status);
			/*if (status.type == 'unknown')
				console.log(status);*/
			info.status = status;
		},
		process : function (elem, info) {
			if (!info.status || !info.status.type)
				return;
			var className = info.status.type.replace(/\s+/g, '_');
			elem.addClass(className);
			/*console.log(className);*/
		}
	});

function getFt(jq) {
	var $ = window.ex$;
	var val = $(jq).attr('data-ft');
	if (!val)
		return;
	var result = JSON.parse(val);
	return result;
}

function getByFt(obj, context) {
	var $ = window.ex$;
	return $('[data-ft]', context).filter(function () {
		var ft = getFt(this);
		for (var k in obj) {
			if (obj[k] != ft[k])
				return false;
		}
		return true;
	});
}

var processors = [];

function init() {

	processors.push(new StatusProcessor());

	processors.forEach(function (prc) {
		prc.init();
	});

	setInterval(function () {
		var $ = window.ex$;
		if (!$)
			return;
		$('[data-testid=fbfeed_story]:visible').each(function () {
			var el = $(this);
			if (!el.length || !el.height() || el.data('processed'))
				return;
			el.data('processed', true);
			var info = {};
			processors.forEach(function (prc) {
				prc.extractInfo(el, info);
			});
			processors.forEach(function (prc) {
				prc.process(el, info);
			});
		});
	}, 500);

}

window.ex$(init);