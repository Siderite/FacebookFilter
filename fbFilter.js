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
					$('body').addClass('statusProcessor');
				},
				populateStatus : function (elem, status) {
					elem = $(elem);
					var m;
					var text = elem.text().replace('\u200E', '').replace('\xA0', ' ');
					if (text.endsWith('.')) text=text.substr(0,text.length-1);
					var html = elem.html();
					var who = this.fb.getWho(elem);
					var whoText=[];
					who.each(function() {
						var w=$(this).text();
						if (text.startsWith(w)) {
							text=text.substr(w.length).trim();
							whoText.push(w);
						}
						m=/^(?:and|with|,)\s+(.*)$/.exec(text);
						if (m) text=m[1];
					});
					m=/^(\d+\s+others)\s*(.*)$/.exec(text);
					if (m) {
						whoText.push(m[1]);
						text=m[2];
					}
					if (whoText.length)
						status.who = whoText;
					status.type=[];
					if (text=='') {
						status.type.push('own content');
						return;
					}
					if (/'s Birthday$/.test(text)) {
						status.type.push('birthday');
						// do birthday
						return;
					}
					m = /(shared|updated|added|posted) .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this|memory|profile)/.exec(text);
					if (m) {
						status.type.push(m[1]);
						status.type.push(m[1] + ' ' + m[2]);
						return;
					}
					m = /(commented|replied to a comment) on .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this|memory|profile)/.exec(text);
					if (m) {
						if (m[1]!='commented') status.type.push('commented');
						status.type.push(m[1]);
						status.type.push(m[1] + ' ' + m[2]);
						return;
					}
					m = /(?:are|is) (interested) .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this|memory|profile)/.exec(text);
					if (m) {
						status.type.push(m[1]);
						status.type.push(m[1] + ' ' + m[2]);
						return;
					}
					m = /was (tagged|mentioned) .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this|memory|profile)/.exec(text);
					if (m) {
						status.type.push(m[1]);
						status.type.push(m[1] + ' ' + m[2]);
						return;
					}
					m = /(like)[sd]? .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this|memory|profile)/.exec(text);
					if (m) {
						status.type.push(m[1]);
						status.type.push(m[1] + ' ' + m[2]);
						return;
					}
					m = /(reacted|going|went) to .*(video|photo[s]?|profile picture|post|link|event|album|update[s]?|this|memory|profile)/.exec(text);
					if (m) {
						status.type.push(m[1]);
						status.type.push(m[1] + ' ' + m[2]);
						return;
					}
					if (/feeling /.test(text)) {
						status.type.push('feeling');
						return;
					}
					if (/^to\s+/.test(text)) {
						status.type.push('shared');
						status.type.push('shared to friend');
						return;
					}
					if (/^(checked in|at|in)\s+/.test(text)) {
						status.type.push('check in');
						return;
					}
					if (/^\s+is\s+with\s+.*\s+at\s+/.test(text)) {
						status.type.push('check in');
						return;
					}
					if (/^is\s+live\s+/.test(text)) {
						status.type.push('live');
						return;
					}
					if (/^(was|were|are|is) watching /.test(text)) {
						status.type.push('watching');
						return;
					}
					if (/^like[sd]? /.test(text)) {
						status.type.push('like');
						return;
					}
					if (/^completed /.test(text)) {
						status.type.push('completed');
						return;
					}
					m = /^([^\s]+)\s/.exec(text);
					if (m) {
						status.type.push(m[1]);
					}
					status.type.push('unknown');
					status.temp = text || html;
				},
				populateShared : function (elem, status) {
					elem = $(elem);
					var img=$('img',elem).filter(function() { return $(this).width()>100&&$(this).height()>100; });
					var video=$('video',elem).filter(function() { return $(this).width()>100&&$(this).height()>100; });
					if (video.length) {
						status.shared='video';
						return;
					}
					if (img.length) {
						status.shared='image';
						return;
					}
					status.shared='text';
				},
				extractInfo : function (elem, info) {
					var status = {};
					var statusElem = this.fb.getByFt({
							tn : 'C'
						}, elem).first();
					this.populateStatus(statusElem, status);
					var sharedElem=this.fb.getStorySharedContent(elem);
					this.populateShared(sharedElem, status);
					info.status = status;
				},
				process : function (elem, info) {
					if (!info.status)
						return;
					elem = $(elem);
					if (info.status.type) {
						//console.log(info.status.type);
						info.status.type.forEach(function(type) {
							elem.addClass('status_'+type.replace(/\s+/g, '_'));
						});
					}
					if (info.status.who) {
						info.status.who.forEach(function(who) {
							elem.addClass('who_'+who.replace(/\s+/g, '_'));
						});
					}
					if (info.status.shared) {
						elem.addClass('shared_'+info.status.shared.replace(/\s+/g, '_'));
					}
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
				var self=this;
				var result=$();
				$(story).each(function() {
					result=result.add(self.getByFt({tn:'C'}, this).first());
				});
				return result;
			},
			getWho : function (header) {
				return $('a.profileLink,a[data-hovercard]',header);
			},
			getStoryUserContent : function (story) {
				return $('div.userContent', story);
			},
			getStorySharedContent : function (story) {
				var self=this;
				var result=$();
				$(story).each(function() {
					var h=self.getStoryHeader(this); 
					if (h.next().is('.mtm')) {
						result=result.add(h.next()); //list of several users content, shared follows the header
					}
					var uc=self.getStoryUserContent(this);
					result=result.add(uc.next()); // just one user content, get shared
				});
				return result;
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

		chrome.runtime.onMessage.addListener(
		  function(request, sender, sendResponse) {
		    if (typeof(request.enabled) != 'undefined')
		      fb.toggle(request.enabled);
		    }
		);
	}

	InitExtension(window.ex$||window.jQuery);

})();