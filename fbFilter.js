(function () {
	if (this.fbFilter) return;
	this.fbFilter=true;

	function getURL(file) {
		return extensionBaseUrl + file;
	}

	function Processor(extra) {
		if (!extra)
			return;
		for (var k in extra) {
			this[k] = extra[k];
		}
	}

	Processor.prototype = {
		init : function (fb) {
			this.fb = fb;
		},
		extractInfo : function (elem, info) {},
		process : function (elem, info) {},
		dispose : function() {
		}
	};

	function InitExtension($) {

		function StatusProcessor() {}
		StatusProcessor.prototype = new Processor({
				init : function (fb) {
					this.fb = fb;
					$("<link/>", {
						rel : "stylesheet",
						type : "text/css",
						href : getURL("statusProcessor.css")
					}).appendTo("head");
					$('body').addClass('statusProcessor');
				},
				populateStatus : function (elem, status) {
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
					var m = / (shared|reacted to|like[sd]?|commented on|replied to a comment on|is interested in|updated|added|was tagged|posted|was mentioned|going to|went to) .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this)/.exec(text);
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
					var status = {};
					var statusElem = this.fb.getByFt({
							tn : 'C'
						}, elem).first();
					this.populateStatus(statusElem, status);
					info.status = status;
				},
				process : function (elem, info) {
					if (!info.status || !info.status.type)
						return;
					elem = $(elem);
					var className = info.status.type.replace(/\s+/g, '_');
					elem.addClass(className);
				},
				dispose:function() {
					$('body').removeClass('statusProcessor');
				}
			});

		Facebook = function () {};

		Facebook.prototype = {
			getFt : function (jq) {
				var val = $(jq).attr('data-ft');
				if (!val)
					return;
				var result = JSON.parse(val);
				return result;
			},
			getByFt : function (obj, context) {
				var self = this;
				return $('[data-ft]', context).filter(function () {
					var ft = self.getFt(this);
					for (var k in obj) {
						if (obj[k] != ft[k])
							return false;
					}
					return true;
				});
			},
			getFeeds : function () {
				return $('div[id^=topnews_main_stream],div[id^=feed_stream_],div[id^=subscriptions_main_stream_],div[data-referrer=pagelet_timeline_recent_ocm]');
			},
			getFeedStories : function (feed) {
				return $('div[id^=hyperfeed_story_id_]', feed);
			},
			getStoryHeader : function (story) {
				return this.getByFt('{tn:"C"}', story).first();
			},
			getStoryUserContent : function (story) {
				return $('div.userContent', story);
			},
			getStorySharedContent : function (story) {
				var uc=this.getStoryUserContent(story);
				if (uc.length==1) {
					return uc.next(); // just one user content, get shared
				}
				var h=this.getStoryHeader(story); //list of several users content, shared follows the header
				return h.next();
			},
			getStoryReactions : function (story) {
				return $('div.userContent', story).parent().next(); //can be more than one
			},
			getLikes : function (story) {
				return $('.UFIList', story).each(function () {
					//TODO
				});
			},
			ensureStoryObserver : function () {
				if (this.storyObserver)
					return;
				this.storyObservers = [];
				var self = this;
				var mo = new MutationObserver(function (mutations) {
						mutations.forEach(function (mutation) {
							if (mutation.type != 'childList' || !mutation.addedNodes || !mutation.addedNodes.length)
								return;
							Array.from(mutation.addedNodes).forEach(function (node) {
								if ($(node).parent().is('div[id^=hyperfeed_story_id_]')) {
									self.storyObservers.forEach(function (observer) {
										observer($(node).parent()[0]);
									});
								}
							});
						});
					});
				mo.observe(document.body, {
					attributes : false,
					childList : true,
					characterData : false,
					subtree : true
				});
				this.storyObserver = mo;
			},
			disposeStoryObserver : function () {
				if (!this.storyObserver)
					return;
				this.storyObserver.disconnect();
				this.storyObserver = null;
				this.storyObservers = null;
			},
			onStory : function (observer) {
				this.ensureStoryObserver();
				var stories = $([]);
				var feeds = this.getFeeds();
				var self = this;
				feeds.each(function () {
					$.merge(stories, self.getFeedStories(this));
				});
				stories.each(function () {
					observer(this);
				});
				this.storyObservers.push(observer);
			},
			initProcessors : function () {
				var self = this;
				self.enabled=true;
				self.processors.forEach(function (proc) {
					proc.init(self);
				});
				self.onStory(function (story) {
					if ($(story).data('processed'))
						return;
					$(story).data('processed', true);
					$(story).addClass('story');
					var info = {};
					self.processors.forEach(function (proc) {
						proc.extractInfo(story, info);
					});
					self.processors.forEach(function (proc) {
						proc.process(story, info);
					});
				});
			},
			disposeProcessors : function () {
				var self = this;
				self.enabled=false;
				self.processors.forEach(function (proc) {
					proc.dispose();
				});
				self.disposeStoryObserver();
			},
			toggle: function(enabled) {
				var self=this;
				if (enabled===self.enabled) return;
				if (enabled) {
					self.initProcessors();
				} else {
					self.disposeProcessors();
				}
			}
		};

		var fb = new Facebook();
		fb.processors=[new StatusProcessor()];
		//fb.initProcessors();

		this.Facebook=fb;
	}

	InitExtension(window.ex$);

})();