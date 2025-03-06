// Created with Squiffy 5.1.3
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
                if ('@last' in squiffy.story.section.passages && squiffy.get('_turncount')>= squiffy.story.section.passageCount) {
                    squiffy.story.passage('@last');
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            if (this.parentElement.classList.contains('visited')) {
                setAttribute('leads -= 1');
            }
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('click', 'a.squiffy-action', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
		link = String(link);
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
			var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
				rhs = incDecMatch[3];
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
				rhs = parseFloat(rhs);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
				if (op == '*') {
					value *= rhs;
				}
				if (op == '/') {
					value /= rhs;
				}
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
			else if (startsWith(text,'@') && !startsWith(text,'@replace')) {
				processAttributes(text.substring(1).split(","));
				return "";
			}
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);
			condition = condition.replace("<", "&lt;");
            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

				if(startsWith(rhs,'@')) rhs=squiffy.get(rhs.substring(1));
				
                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = 'init';
squiffy.story.id = 'e3a944683b';
squiffy.story.sections = {
	'Address Book': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"Businesses\" role=\"link\" tabindex=\"0\">Businesses</a></p>\n<p><a class=\"squiffy-action link-section\" data-section=\"People\" role=\"link\" tabindex=\"0\">People</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Businesses': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"Address Book\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p><strong>Banks</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Bank of England\" role=\"link\" tabindex=\"0\">Bank of England</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Capital & Counties\" role=\"link\" tabindex=\"0\">Capital &amp; Counties</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Drummond's\" role=\"link\" tabindex=\"0\">Drummond&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Worthington\" role=\"link\" tabindex=\"0\">Worthington</a></p>\n<p><strong>Barristers</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Attard Charles\" role=\"link\" tabindex=\"0\">Attard, Charles</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Hall Edward\" role=\"link\" tabindex=\"0\">Hall, Edward</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Mason Cecil\" role=\"link\" tabindex=\"0\">Mason, Cecil</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Truax Robert\" role=\"link\" tabindex=\"0\">Truax, Robert</a></p>\n<p><strong>Boarding Houses</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Beaufort House\" role=\"link\" tabindex=\"0\">Beaufort House</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Dover Rooms\" role=\"link\" tabindex=\"0\">Dover Rooms</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Madame Charpentier\" role=\"link\" tabindex=\"0\">Madame Charpentier</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Thrawl Street\" role=\"link\" tabindex=\"0\">Thrawl Street</a></p>\n<p><strong>Clubs</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Bagatelle Card Club\" role=\"link\" tabindex=\"0\">Bagatelle Card Club</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Carleton Club\" role=\"link\" tabindex=\"0\">Carleton Club</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Diogenes Club\" role=\"link\" tabindex=\"0\">Diogenes Club</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Tankerville Club\" role=\"link\" tabindex=\"0\">Tankerville Club</a></p>\n<p><strong>Coroner&#39;s Office</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Coroner\" role=\"link\" tabindex=\"0\">Coroner</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Medical Examiner\" role=\"link\" tabindex=\"0\">Medical Examiner</a></p>\n<p><strong>Department Stores</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Cobay's\" role=\"link\" tabindex=\"0\">Cobay&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Hanover House\" role=\"link\" tabindex=\"0\">Hanover House</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Liberty & Co\" role=\"link\" tabindex=\"0\">Liberty &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Tendwell & Krebs\" role=\"link\" tabindex=\"0\">Tendwell &amp; Krebs</a></p>\n<p><strong>Detective Agencies</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Barker's\" role=\"link\" tabindex=\"0\">Barker&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Moser's\" role=\"link\" tabindex=\"0\">Moser&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Pinkerton International\" role=\"link\" tabindex=\"0\">Pinkerton International</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Tod's Private Enquiries\" role=\"link\" tabindex=\"0\">Tod&#39;s Private Enquiries</a></p>\n<p><strong>Docks</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"East India Docks\" role=\"link\" tabindex=\"0\">East India Docks</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"London Docks\" role=\"link\" tabindex=\"0\">London Docks</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"St Katherine Docks\" role=\"link\" tabindex=\"0\">St Katherine Docks</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Shadwell New Basin\" role=\"link\" tabindex=\"0\">Shadwell New Basin</a></p>\n<p><strong>Doctors</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Agar Dr Moore\" role=\"link\" tabindex=\"0\">Agar, Dr Moore</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Fell Dr Gideon\" role=\"link\" tabindex=\"0\">Fell, Dr Gideon</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Trevelyan Dr Percy\" role=\"link\" tabindex=\"0\">Trevelyan, Dr Percy</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Watson Dr John H\" role=\"link\" tabindex=\"0\">Watson, Dr John H</a></p>\n<p><strong>Embassies</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"American Embassy\" role=\"link\" tabindex=\"0\">American Embassy</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"French Embassy\" role=\"link\" tabindex=\"0\">French Embassy</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"German Embassy\" role=\"link\" tabindex=\"0\">German Embassy</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Russian Embassy\" role=\"link\" tabindex=\"0\">Russian Embassy</a></p>\n<p><strong>Government Offices</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Foreign Office\" role=\"link\" tabindex=\"0\">Foreign Office</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Home Office\" role=\"link\" tabindex=\"0\">Home Office</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Parliament Houses of\" role=\"link\" tabindex=\"0\">Parliament, Houses of</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"War Office\" role=\"link\" tabindex=\"0\">War Office</a></p>\n<p><strong>Gunsmiths</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Colt's Firearms Co\" role=\"link\" tabindex=\"0\">Colt&#39;s Firearms Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Rigby & Co\" role=\"link\" tabindex=\"0\">Rigby &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Westley Richards\" role=\"link\" tabindex=\"0\">Westley Richards</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Winchester Arms Co\" role=\"link\" tabindex=\"0\">Winchester Arms Co</a></p>\n<p><strong>Hospitals</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Charing Cross\" role=\"link\" tabindex=\"0\">Charing Cross</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"King's College\" role=\"link\" tabindex=\"0\">King&#39;s College</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"St Bartholomew's\" role=\"link\" tabindex=\"0\">St Bartholomew&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"St George's\" role=\"link\" tabindex=\"0\">St George&#39;s</a></p>\n<p><strong>Hotels</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Claridge\" role=\"link\" tabindex=\"0\">Claridge</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Grand Hotel\" role=\"link\" tabindex=\"0\">Grand Hotel</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Langham\" role=\"link\" tabindex=\"0\">Langham</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Piccadilly\" role=\"link\" tabindex=\"0\">Piccadilly</a></p>\n<p><strong>Inns</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Black Crown\" role=\"link\" tabindex=\"0\">Black Crown</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Frying Pan\" role=\"link\" tabindex=\"0\">Frying Pan</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Red Boar\" role=\"link\" tabindex=\"0\">Red Boar</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Star & Plow\" role=\"link\" tabindex=\"0\">Star &amp; Plow</a></p>\n<p><strong>Insurance Companies</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"London & Globe\" role=\"link\" tabindex=\"0\">London &amp; Globe</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Pearl Assurance Co\" role=\"link\" tabindex=\"0\">Pearl Assurance Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Provident\" role=\"link\" tabindex=\"0\">Provident</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Royal Insurance Co\" role=\"link\" tabindex=\"0\">Royal Insurance Co</a></p>\n<p><strong>Jewellers</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Carrington & Co\" role=\"link\" tabindex=\"0\">Carrington &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"J.W. Benson Ltd\" role=\"link\" tabindex=\"0\">J.W. Benson Ltd</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"R.S. Garrard & Co\" role=\"link\" tabindex=\"0\">R.S. Garrard &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Rowlands & Frazier\" role=\"link\" tabindex=\"0\">Rowlands &amp; Frazier</a></p>\n<p><strong>Libraries</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"British Museum Library\" role=\"link\" tabindex=\"0\">British Museum Library</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Colonial Institute\" role=\"link\" tabindex=\"0\">Colonial Institute</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Law Society Library\" role=\"link\" tabindex=\"0\">Law Society Library</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"London Library\" role=\"link\" tabindex=\"0\">London Library</a></p>\n<p><strong>Music Halls</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Oxford Music Hall\" role=\"link\" tabindex=\"0\">Oxford Music Hall</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"St James' Hall\" role=\"link\" tabindex=\"0\">St James&#39; Hall</a></p>\n<p><strong>Newspapers</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Daily Gazette\" role=\"link\" tabindex=\"0\">Daily Gazette</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Pall Mall Gazette\" role=\"link\" tabindex=\"0\">Pall Mall Gazette</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Spectator\" role=\"link\" tabindex=\"0\">Spectator</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Times\" role=\"link\" tabindex=\"0\">Times</a></p>\n<p><strong>Parks</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Archbishop's Park\" role=\"link\" tabindex=\"0\">Archbishop&#39;s Park</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Greenwich Park\" role=\"link\" tabindex=\"0\">Greenwich Park</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Hyde Park\" role=\"link\" tabindex=\"0\">Hyde Park</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Regents Park\" role=\"link\" tabindex=\"0\">Regents Park</a></p>\n<p><strong>Pawnbrokers</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Hoch's\" role=\"link\" tabindex=\"0\">Hoch&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Jabez Wilson\" role=\"link\" tabindex=\"0\">Jabez Wilson</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Saul Lesbowitz\" role=\"link\" tabindex=\"0\">Saul Lesbowitz</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Zebediah\" role=\"link\" tabindex=\"0\">Zebediah</a></p>\n<p><strong>Police Stations</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Bow Street\" role=\"link\" tabindex=\"0\">Bow Street</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Lambeth\" role=\"link\" tabindex=\"0\">Lambeth</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Old Bailey\" role=\"link\" tabindex=\"0\">Old Bailey</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Tichfield\" role=\"link\" tabindex=\"0\">Tichfield</a></p>\n<p><strong>Post Offices</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"EC District\" role=\"link\" tabindex=\"0\">EC District</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"SW District\" role=\"link\" tabindex=\"0\">SW District</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"WC District\" role=\"link\" tabindex=\"0\">WC District</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Investigation Dept\" role=\"link\" tabindex=\"0\">Investigation Dept</a></p>\n<p><strong>Printers</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Ackermann\" role=\"link\" tabindex=\"0\">Ackermann</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Lefevre\" role=\"link\" tabindex=\"0\">Lefevre</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"St Bride Foundation\" role=\"link\" tabindex=\"0\">St Bride Foundation</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Valadon & Co\" role=\"link\" tabindex=\"0\">Valadon &amp; Co</a></p>\n<p><strong>Prisons</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Military Prison\" role=\"link\" tabindex=\"0\">Military Prison</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Millbank Prison\" role=\"link\" tabindex=\"0\">Millbank Prison</a></p>\n<p><strong>Public Houses</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Elephant's Nest\" role=\"link\" tabindex=\"0\">Elephant&#39;s Nest</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Nag's Head\" role=\"link\" tabindex=\"0\">Nag&#39;s Head</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Punch & Judy\" role=\"link\" tabindex=\"0\">Punch &amp; Judy</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"White Eagle\" role=\"link\" tabindex=\"0\">White Eagle</a></p>\n<p><strong>Restaurants</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Driver's Oyster Bar\" role=\"link\" tabindex=\"0\">Driver&#39;s Oyster Bar</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Keen's Chop House\" role=\"link\" tabindex=\"0\">Keen&#39;s Chop House</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Ship & Turtle\" role=\"link\" tabindex=\"0\">Ship &amp; Turtle</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Simpson's Dining Room\" role=\"link\" tabindex=\"0\">Simpson&#39;s Dining Room</a></p>\n<p><strong>Scotland Yard</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Criminology Lab\" role=\"link\" tabindex=\"0\">Criminology Lab</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Public Carriage Office\" role=\"link\" tabindex=\"0\">Public Carriage Office</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Special Branch\" role=\"link\" tabindex=\"0\">Special Branch</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Thames Division\" role=\"link\" tabindex=\"0\">Thames Division</a></p>\n<p><strong>Solicitors</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Cartwright Whitney\" role=\"link\" tabindex=\"0\">Cartwright, Whitney</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Davenport Hiram\" role=\"link\" tabindex=\"0\">Davenport, Hiram</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Morris William\" role=\"link\" tabindex=\"0\">Morris, William</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Tuttle Melvin\" role=\"link\" tabindex=\"0\">Tuttle, Melvin</a></p>\n<p><strong>Stables</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Central Carriage\" role=\"link\" tabindex=\"0\">Central Carriage</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Henry Whitlock Co\" role=\"link\" tabindex=\"0\">Henry Whitlock Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Morgan & Co\" role=\"link\" tabindex=\"0\">Morgan &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Rudge & Singer\" role=\"link\" tabindex=\"0\">Rudge &amp; Singer</a></p>\n<p><strong>Stations</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Aldgate\" role=\"link\" tabindex=\"0\">Aldgate</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Coborn Road\" role=\"link\" tabindex=\"0\">Coborn Road</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"London Bridge\" role=\"link\" tabindex=\"0\">London Bridge</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Whitechapel\" role=\"link\" tabindex=\"0\">Whitechapel</a></p>\n<p><strong>Steamship Companies</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Aberdeen Navigation Co\" role=\"link\" tabindex=\"0\">Aberdeen Navigation Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Canard Line\" role=\"link\" tabindex=\"0\">Canard Line</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Hamburg Amerika Line\" role=\"link\" tabindex=\"0\">Hamburg Amerika Line</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Thames Steamboat Co\" role=\"link\" tabindex=\"0\">Thames Steamboat Co</a></p>\n<p><strong>Tailors</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Poole & Co\" role=\"link\" tabindex=\"0\">Poole &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Roberts & Parfit\" role=\"link\" tabindex=\"0\">Roberts &amp; Parfit</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Tetley & Butler\" role=\"link\" tabindex=\"0\">Tetley &amp; Butler</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"West End Clothiers\" role=\"link\" tabindex=\"0\">West End Clothiers</a></p>\n<p><strong>Tea Merchants</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"A.B. Muirhead\" role=\"link\" tabindex=\"0\">A.B. Muirhead</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Ridgways\" role=\"link\" tabindex=\"0\">Ridgways</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Sipton & Co\" role=\"link\" tabindex=\"0\">Sipton &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Twining & Co\" role=\"link\" tabindex=\"0\">Twining &amp; Co</a></p>\n<p><strong>Tea Rooms</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Buszard\" role=\"link\" tabindex=\"0\">Buszard</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Ladies' Own Tea Association\" role=\"link\" tabindex=\"0\">Ladies&#39; Own Tea Association</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Mrs. Robertson\" role=\"link\" tabindex=\"0\">Mrs. Robertson</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Wisteria Lounge\" role=\"link\" tabindex=\"0\">Wisteria Lounge</a></p>\n<p><strong>Theatres</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Apollo\" role=\"link\" tabindex=\"0\">Apollo</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Covent Garden\" role=\"link\" tabindex=\"0\">Covent Garden</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Lyceum\" role=\"link\" tabindex=\"0\">Lyceum</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Princess\" role=\"link\" tabindex=\"0\">Princess</a></p>\n<p><strong>Tobacconists</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Amber & Co\" role=\"link\" tabindex=\"0\">Amber &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Bradley's\" role=\"link\" tabindex=\"0\">Bradley&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Mortimer's\" role=\"link\" tabindex=\"0\">Mortimer&#39;s</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Woff Philips & Co\" role=\"link\" tabindex=\"0\">Woff, Philips &amp; Co</a></p>\n<p><strong>Watchmakers</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Barraud & Lunds\" role=\"link\" tabindex=\"0\">Barraud &amp; Lunds</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Charles Frodsham & Co\" role=\"link\" tabindex=\"0\">Charles Frodsham &amp; Co</a></p>\n<p><strong>Wine Merchants</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Dolamore & Co\" role=\"link\" tabindex=\"0\">Dolamore &amp; Co</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Westhouse & Marbank\" role=\"link\" tabindex=\"0\">Westhouse &amp; Marbank</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"Address Book\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Bank of England': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Capital & Counties': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Drummond\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Worthington': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Attard Charles': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Hall Edward': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Mason Cecil': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Truax Robert': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Beaufort House': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Dover Rooms': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Madame Charpentier': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Thrawl Street': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Bagatelle Card Club': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Carleton Club': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Diogenes Club': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Tankerville Club': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Coroner': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Medical Examiner': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Cobay\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Hanover House': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Liberty & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Tendwell & Krebs': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Barker\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Moser\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Pinkerton International': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Tod\'s Private Enquiries': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'East India Docks': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'London Docks': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'St Katherine Docks': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Shadwell New Basin': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Agar Dr Moore': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Fell Dr Gideon': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Trevelyan Dr Percy': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Watson Dr John H': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'American Embassy': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'French Embassy': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'German Embassy': {
		'text': "<p>Hello!</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Russian Embassy': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Foreign Office': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Home Office': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Parliament Houses of': {
		'text': "<p>Upon entering Lord Dewsberry&#39;s stately office you see the refined politician standing behind his desk pointing at various documents as he speaks with the various underlings that seem to hover around him.</p>\n<p>The lady who so kindly escorted you through the buildings many hallways announces your presence. Lord Dewsberry looking up from his work, seems to take a moment to recognize you, as if surprised to see you in such a context. He removes his glasses and shoos everyone but you out of his office.</p>\n<p>Beckoning you toward the desk, he inquires anxiously, &quot;Please tell me you&#39;ve found something.&quot;</p>\n<p>&quot;Nothing conclusive at this point, I&#39;m sorry to say.&quot; Lord Dewsberry doesn&#39;t hide his disappointment. He fidgets, moving a pen from one side of the desk to the other for no reason.</p>\n<p>&quot;I spend much of my life making decisions that impact an entire nation. It&#39;s not often I find myself powerless, utterly unable to do something.&quot; He says, raising his hands above him in frustration. &quot;Especially for someone like Cheryl,&quot; he adds, tenderly.</p>\n<p>&quot;The documents that were stolen,&quot; you say, changing the subject, &quot;what kind of information did they contain?&quot;</p>\n<p>&quot;Being confidential documents, I, of course, cannot tell you their contents. Only that their loss impacts me personally more than it does England.&quot;</p>\n<p>&quot;How so?&quot;</p>\n<p>&quot;As you know,&quot; he starts, then remembering to whom he is speaking, &quot;--or might know, if you follow politics--I will be running for prime minister in the next election. Polls currently indicate that I am likely to do well.&quot;</p>\n<p>&quot;If the press finds out that you left confidential documents in someone&#39;s home...&quot;, you begin.</p>\n<p>&quot;Yes,&quot; Lord Dewsberry nods, &quot;that would change the situation entirely.&quot; He averts his gaze to a picture of Cheryl set inside a small frame covered in gold leaf that sits at an angle on his desk. &quot;But that pales in comparison to losing the love of my later years,&quot; he continues.</p>\n<p>&quot;Your &#39;later years&#39;?&quot; you ask.</p>\n<p>&quot;Yes, I was married once before,&quot; he reflects. Then, quietly, &quot;It will be six years ago next month since my dear Evelyn pass away. She was everything to me. When she died, all hope of happiness for me died as well. I dove headlong into my work here,&quot; he says spreading his hands over his desk. &quot;I wasn&#39;t looking for love when I met Cheryl. It was as if she found me and, for reasons unknown to anyone, became my constant companion, entirely devoted to me. She brought me a sense of joy I thought I&#39;d never feel again.&quot;</p>\n<p>You remain still, allowing the man a moment to regain his composure.</p>\n<p>&quot;Was there anything you wanted to know?&quot; he asks.</p>\n<p>&quot;I suppose not. We just wanted to get a sense of who might be interested in getting their hands on those documents.&quot;</p>\n<p>&quot;Yes, well, as I said before, the loss of those documents will impact me more than anyone else. As far as who took it, it could be any number of countries with opposing ideologies, I suppose&quot;, Lord Dewsberry ends with a shrug, sitting down in his chair and gesturing toward the door. As if on cue, his underlings reappear and swarm around the desk once again.</p>\n<p>&quot;Thank you for your time, sir,&quot; you say politely, understanding that your time with the busy politician is up.</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'War Office': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Colt\'s Firearms Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Rigby & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Westley Richards': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Winchester Arms Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Charing Cross': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'King\'s College': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'St Bartholomew\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'St George\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Claridge': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Grand Hotel': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Langham': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Piccadilly': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Black Crown': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Frying Pan': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Red Boar': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Star & Plow': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'London & Globe': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Pearl Assurance Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Provident': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Royal Insurance Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Carrington & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'J.W. Benson Ltd': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'R.S. Garrard & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Rowlands & Frazier': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'British Museum Library': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Colonial Institute': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Law Society Library': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'London Library': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Oxford Music Hall': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'St James\' Hall': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Daily Gazette': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Pall Mall Gazette': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Spectator': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Times': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Archbishop\'s Park': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Greenwich Park': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Hyde Park': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Regents Park': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Hoch\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Jabez Wilson': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Saul Lesbowitz': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Zebediah': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Bow Street': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Lambeth': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Old Bailey': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Tichfield': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'EC District': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'SW District': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'WC District': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Investigation Dept': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Ackermann': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Lefevre': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'St Bride Foundation': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Valadon & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Military Prison': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Millbank Prison': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Elephant\'s Nest': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Nag\'s Head': {
		'text': "<p>Several patrons glance your way as you enter the smokey bar. As your eyes scan the room the patrons turn their heads away, many having good reason to want to not be recognized.</p>\n<p>As you begin to wonder how you&#39;ll determine which of the many men in the room is the one you&#39;re looking for, the question answers itself: A man wearing dark brown overalls, a dirty white shirt with the sleeves rolled up, and a pair of heavy boots strides out of the bathroom and heads toward the bar, walking all the way with a noticeable limp.</p>\n<p>As he reaches for his drink, he notices you walking toward him out of the corner of his eye. Quickly, he spins around, his hands balled into fists at his side. Glowering, he says angrily, &quot;I&#39;ve had a bad day, I have. So if you&#39;re lookin&#39; for trouble go elsewheres.&quot;</p>\n<p>You raise your hands as if to say you mean no harm. &quot;We&#39;re private investigators looking into a burglery that occurred a couple days ago.&quot;</p>\n<p>&quot;What&#39;s that to do with me?&quot; he demands.</p>\n<p>&quot;Well, a witness saw you pacing back and forth in front of the victim&#39;s home, glancing furtively over your shoulder, and then running off only hours before the burglery.&quot;</p>\n<p>&quot;The victim&#39;s home? You mean Clara?&quot; he asked, letting his guard down for a moment. &quot;Is she okay?&quot; Then, frowning, &quot;Oh, what do I care. She stood me up, she did. That&#39;s not right. I ain&#39;t done nothing to deserve that.&quot;</p>\n<p>&quot;This &#39;Clara&#39;, how did you meet her?&quot;</p>\n<p>&quot;I was &#39;ere, at me pub. She walked in, lookin&#39; all pretty and genteel. She saw me lookin&#39; at &#39;er and came right over and sat down beside me.&quot;</p>\n<p>&quot;What did she want?&quot;</p>\n<p>&quot;A drink,&quot; the man replies with a laugh. &quot;We really hit it off, or so I thought. Enough for her to write her address on a slip of paper. She told me to drop by later that night, but that I shouldn&#39;t knock on the door as she didn&#39;t want anyone to find out about our little tryst.&quot;</p>\n<p>&quot;So that&#39;s why you were pacing outside her home and trying to see through the windows?&quot; you ask.</p>\n<p>He nods. &quot;After a while I thought perhaps she had to work late. She mentioned she was a secretary at the German Embassy, so I made my way over there just as fast as I could. But when I asked, they looked at me like I was crazy. Said they had never heard of a Clara Weiss before. That&#39;s when I knew I&#39;d been had,&quot; he says, angrily. &quot;She&#39;d been playing a game with me. That&#39;s not right.&quot;</p>\n<p>&quot;We&#39;re sorry to hear that,&quot; you say, hoping your empathy will make him at least somewhat willing to help you. &quot;The slip of paper she wrote her address on, would you happen to still have it, and might we take a look at it?&quot; you inquire.</p>\n<p>As if slightly confused as to why a slip of paper would be a detail of any interest, he replies, &quot;I don&#39;t &#39;ave it no more. I threw it at that obnoxious German bloke at the embassy. It was just a bit of paper,&quot; he says, using his finger and thumb to demonstrate the size. &quot;Looked like a receipt or something,&quot; he added with a shrug.</p>\n<p>&quot;Thank you, very much,&quot; you say. Then, having caught the bartender&#39;s eye and slapping some money down on the bar, you say, &quot;The next round&#39;s on us!&quot;</p>\n<p>&quot;Thank you, kindly,&quot; the man with a limp says, raising his glass toward us and smiling for the first time since we arrive.</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Punch & Judy': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'White Eagle': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Driver\'s Oyster Bar': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Keen\'s Chop House': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Ship & Turtle': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Simpson\'s Dining Room': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Criminology Lab': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Public Carriage Office': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Special Branch': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Thames Division': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Cartwright Whitney': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Davenport Hiram': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Morris William': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Tuttle Melvin': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Central Carriage': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Henry Whitlock Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Morgan & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Rudge & Singer': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Aldgate': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Coborn Road': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'London Bridge': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Whitechapel': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Aberdeen Navigation Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Canard Line': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Hamburg Amerika Line': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Thames Steamboat Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Poole & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Roberts & Parfit': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Tetley & Butler': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'West End Clothiers': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'A.B. Muirhead': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Ridgways': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Sipton & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Twining & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Buszard': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Ladies\' Own Tea Association': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Mrs. Robertson': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Wisteria Lounge': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Apollo': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Covent Garden': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Lyceum': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Princess': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Amber & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Bradley\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Mortimer\'s': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Woff Philips & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Barraud & Lunds': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Charles Frodsham & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Dolamore & Co': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Westhouse & Marbank': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Informants': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p>{if seen Sir Jasper Meeks:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Sir Jasper Meeks\" role=\"link\" tabindex=\"0\">Sir Jasper Meeks</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Sir Jasper Meeks\" role=\"link\" tabindex=\"0\">Sir Jasper Meeks</a>}</p>\n<p>Head Medical Examiner at St Bartholomew&#39;s hospital. He performs the autopsies on all bodies found during cases.</p>\n<hr>\n<p>{if seen H.R. Murray:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"H.R. Murray\" role=\"link\" tabindex=\"0\">H.R. Murray</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"H.R. Murray\" role=\"link\" tabindex=\"0\">H.R. Murray</a>}</p>\n<p>Criminologist. He analyses all items and substances found during cases.</p>\n<hr>\n<p>{if seen Scotland Yard:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Scotland Yard\" role=\"link\" tabindex=\"0\">Scotland Yard</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Scotland Yard\" role=\"link\" tabindex=\"0\">Scotland Yard</a>}</p>\n<p>Police (represented by Inspectors Lestrade and Gregson). They have reports and details related to the case.</p>\n<hr>\n<p>{if seen Disraeli O&#39;Brian:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Disraeli O'Brian\" role=\"link\" tabindex=\"0\">Disraeli O&#39;Brian</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Disraeli O'Brian\" role=\"link\" tabindex=\"0\">Disraeli O&#39;Brian</a>}</p>\n<p>Archivist with the Office of National Archives. Compiles legal and criminal documents.</p>\n<hr>\n<p>{if seen Edward Hall:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Edward Hall\" role=\"link\" tabindex=\"0\">Edward Hall</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Edward Hall\" role=\"link\" tabindex=\"0\">Edward Hall</a>}</p>\n<p>Lawyer at the Old Bailey court. Source of information on court cases and legal affairs.</p>\n<hr>\n<p>{if seen Porky Shinwell:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Porky Shinwell\" role=\"link\" tabindex=\"0\">Porky Shinwell</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Porky Shinwell\" role=\"link\" tabindex=\"0\">Porky Shinwell</a>}</p>\n<p>Owner of the Raven and Rat pub. Source of information for all illegal affairs and underworld figures.</p>\n<hr>\n<p>{if seen Henry Ellis:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Henry Ellis\" role=\"link\" tabindex=\"0\">Henry Ellis</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Henry Ellis\" role=\"link\" tabindex=\"0\">Henry Ellis</a>}</p>\n<p>Journalist at the London Times. Source of information on current events, most notably for foreign affairs.</p>\n<hr>\n<p>{if seen Quintin Hogg:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Quintin Hogg\" role=\"link\" tabindex=\"0\">Quintin Hogg</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Quintin Hogg\" role=\"link\" tabindex=\"0\">Quintin Hogg</a>}</p>\n<p>Journalist at the Police Gazette. Source of information for criminal cases.</p>\n<hr>\n<p>{if seen Mycroft Holmes:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Mycroft Holmes\" role=\"link\" tabindex=\"0\">Mycroft Holmes</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Mycroft Holmes\" role=\"link\" tabindex=\"0\">Mycroft Holmes</a>}</p>\n<p>Eminence grise. Source of information for everything to do with government and politics.</p>\n<hr>\n<p>{if seen Langdale Pike:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Langdale Pike\" role=\"link\" tabindex=\"0\">Langdale Pike</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Langdale Pike\" role=\"link\" tabindex=\"0\">Langdale Pike</a>}</p>\n<p>Social columnist. Knows all the rumours which are running through London society.</p>\n<hr>\n<p>{if seen Central Carriage Depot:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Central Carriage Depot\" role=\"link\" tabindex=\"0\">Central Carriage Depot</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Central Carriage Depot\" role=\"link\" tabindex=\"0\">Central Carriage Depot</a>}</p>\n<p>Meeting point for London cab drivers. Source of information on the movement of suspects.</p>\n<hr>\n<p>{if seen Lomax:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Lomax\" role=\"link\" tabindex=\"0\">Lomax</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Lomax\" role=\"link\" tabindex=\"0\">Lomax</a>}</p>\n<p>Librarian at the London Library. To be consulted for any encyclopedic research.</p>\n<hr>\n<p>{if seen Telegraph:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Telegraph\" role=\"link\" tabindex=\"0\">Telegraph</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Telegraph\" role=\"link\" tabindex=\"0\">Telegraph</a>}</p>\n<p>The telegraph employees record and archive all telegrams coming from or to London.</p>\n<hr>\n<p>{if seen Sherlock Holmes:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Sherlock Holmes\" role=\"link\" tabindex=\"0\">Sherlock Holmes</a></span>}{else:<a class=\"squiffy-link link-section\" data-section=\"Sherlock Holmes\" role=\"link\" tabindex=\"0\">Sherlock Holmes</a>}</p>\n<p>If you&#39;re stuck in your investigation, Sherlock Holmes will set you back on track with some good advice.</p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Sir Jasper Meeks': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'H.R. Murray': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Scotland Yard': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Disraeli O\'Brian': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Edward Hall': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Porky Shinwell': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Henry Ellis': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Quintin Hogg': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Mycroft Holmes': {
		'text': "<p>Mycroft doesn&#39;t seem exactly pleased to see us walk into his office. &quot;Yes? What is it?&quot; he demands impatiently.</p>\n<p>Getting right to the point, you ask, &quot;Since you seem to always be in the know about all things governmental, we wondered if you had heard anything about some stolen documents?&quot; Judging from the unhappy expression on his face, it is obvious he is intimately aware of the issue you&#39;re hinting at.</p>\n<p>&quot;Yes, I am aware that some top secret documents have been stolen and that a suspect has been identified.&quot;</p>\n<p>&quot;What do you know about Miss Nightgrove?&quot; you ask.</p>\n<p>&quot;Very little, other than that Lord Dewsberry is not the first politician she&#39;s dated.&quot;</p>\n<p>&quot;Oh?&quot;</p>\n<p>&quot;She was previously courted by an Igor Antanov, a Russian ambassador.&quot;</p>\n<p>&quot;Why did their relationship end?&quot;</p>\n<p>&quot;Antanov was asked to leave by the British government after it was discovered he was sympathetic to the communist movement in Russia. We had our concerns given the level of access he had to people of influence within the British government.&quot;</p>\n<p>&quot;Do you mean you suspected him of espionage?&quot; you ask, insightfully.</p>\n<p>&quot;Nothing was ever proved, but we thought it judicious to ask him to leave.&quot;</p>\n<p>&quot;And the documents? Have they been recovered yet?&quot; you ask.</p>\n<p>&quot;Not yet,&quot; he replies, nonchalantly, as his eyes drift back to the paperwork on his desk. &quot;London is a big city. The documents could be anywhere. The more important thing is that we get our hands on the culprit. It&#39;s intolerable that she&#39;s been allowed to wander free after having been accused of such crimes,&quot; Mycroft says, angrily throwing his pen down on his desk. &quot;Sometimes it feels like I&#39;ve been chasing a shadow for months,&quot; he adds, as if lost in thought.</p>\n<p>&quot;Months?&quot; you ask, puzzled. &quot;But the theft occurred only two days ago.&quot; Mycroft startles, as if realizing he&#39;s said more than he intended.</p>\n<p>&quot;Look, I have no more time for idle chat,&quot; he states as he guides you toward the door.</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Langdale Pike': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Central Carriage Depot': {
		'text': "<p>The clerk at the Central Carriage Depot returns from a room filled with filing cabinets. &quot;It&#39;s a lucky thing we have such a good filing system,&quot; he says with a laugh. &quot;I was able to gather all of the information you requested,&quot; he states, handing you a sheet of paper with the following information on it:</p>\n<h3 id=\"tue-june-13-1899\">Tue, June 13, 1899</h3>\n<table>\n<thead>\n<tr>\n<th style=\"text-align:left\">Time</th>\n<th style=\"text-align:left\">Departed</th>\n<th style=\"text-align:left\">Arrived</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td style=\"text-align:left\">8:30 PM</td>\n<td style=\"text-align:left\">61 S Audley St</td>\n<td style=\"text-align:left\">9 The Mall</td>\n</tr>\n<tr>\n<td style=\"text-align:left\">9:05 PM</td>\n<td style=\"text-align:left\">9 The Mall</td>\n<td style=\"text-align:left\">50 Westminster Bridge Rd</td>\n</tr>\n</tbody>\n</table>\n<p>&quot;And both of these drivers confirmed this passenger walked with a limp?&quot; you ask looking up from the paper.</p>\n<p>&quot;Yes, quite definitely a limp. And not at all the sort you&#39;d expect to see hanging around embassies.&quot;</p>\n<p>&quot;Excellent,&quot; you reply, &quot;that sounds like our man. This final destination, is that a boarding house or a hotel, perhaps?&quot;</p>\n<p>&quot;I&#39;m not sure, but the driver did mention it was not the passenger&#39;s <em>final</em> destination. In fact, he told the driver to stop there as he didn&#39;t have a lot of money left and he wanted to save some to buy a pint at the nearest pub. Then he walked off in the direction of St George&#39;s Circus.&quot;</p>\n<p>&quot;Thank you, you&#39;ve been most helpful,&quot; you say with a grin.</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Lomax': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Telegraph': {
		'text': "<p>&quot;Yes, I see it right here,&quot; the telegraph clerk states, looking up from a ledger book. &quot;A Miss Nightgrove was in here just a few days ago to send a telegram.&quot;</p>\n<p>&quot;May we see the message she sent?&quot; you ask.</p>\n<p>The clerk eyes you, as if trying determine if you really are working with the police as you had previously stated. He gives a slight sigh, as if to say he&#39;s not paid enough to care who you really work for. He hands over the telegram.</p>\n<p>The message, dated June 13th 10:30 AM, reads: &quot;IA COP TO STP SAT CN&quot;</p>\n<p>&quot;What could that mean?&quot; you ask the clerk without looking up from the telegram.</p>\n<p>&quot;I really couldn&#39;t say,&quot; he shrugs, &quot;We do occasionally send cryptic messages like this, although they don&#39;t normally come from an elegent, young lady like Miss Nightgrove.&quot;</p>\n<p>&quot;Does she come here often?&quot;</p>\n<p>The clerk sighs, clearly anxious to get back to his work. &quot;I don&#39;t have time to go through our records, but I can say that she wasn&#39;t familiar to me, and I&#39;ve worked here three years now.&quot;</p>\n<p>&quot;Thanks,&quot; you respond with a nod of your head as you turn toward the door.</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Sherlock Holmes': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Leads': {
		'text': "<p>Leads you&#39;ve visited will be listed here so you can review them. Reviewing leads does not count against your score.</p>\n<!-- Have to increment leads since clicking visited links decrements leads in story.js -->\n<p><span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Introduction, leads += 1\" role=\"link\" tabindex=\"0\">Introduction</a></span></p>\n<p>{if seen Mycroft Holmes:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Mycroft Holmes\" role=\"link\" tabindex=\"0\">Mycroft Holmes</a></span>}</p>\n<p>{if seen Telegraph:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Telegraph\" role=\"link\" tabindex=\"0\">Telegraph</a></span>}</p>\n<p>{if seen Dewsberry Lord Arnold:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Dewsberry Lord Arnold\" role=\"link\" tabindex=\"0\">Dewsberry, Lord Arnold</a></span>}</p>\n<p>{if seen Parliament Houses of:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Parliament Houses of\" role=\"link\" tabindex=\"0\">Houses of Parliament</a></span>}</p>\n<p>{if seen Nightgrove Cheryl:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Nightgrove Cheryl\" role=\"link\" tabindex=\"0\">Nightgrove, Cheryl</a></span>}</p>\n<p>{if seen Central Carriage Depot:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Central Carriage Depot\" role=\"link\" tabindex=\"0\">Central Carriage Depot</a></span>}</p>\n<p>{if seen German Embassy:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"German Embassy\" role=\"link\" tabindex=\"0\">German Embassy</a></span>}</p>\n<p>{if seen Nag&#39;s Head:<span class=\"visited\"><a class=\"squiffy-link link-section\" data-section=\"Nag's Head\" role=\"link\" tabindex=\"0\">Nag&#39;s Head</a></span>}</p>\n<p>{What Next}</p>",
		'passages': {
		},
	},
	'Map': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p><a class=\"squiffy-link link-section\" data-section=\"Location A\" role=\"link\" tabindex=\"0\">Location A</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Location A': {
		'text': "<p>{No Entry}</p>",
		'passages': {
		},
	},
	'Newspaper': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"Letter to the Editor\" role=\"link\" tabindex=\"0\">Letter to the Editor</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Letter to the Editor': {
		'text': "<p><strong>To the Editor,</strong>  </p>\n<p>Sir,  </p>\n<p>I write with grave concern regarding the alarming spread of seditious communist pamphlets across our great city. These dangerous doctrines, printed in shocking abundance, seek to corrupt the minds of honest working men and undermine the very foundations of our society. Who funds these agitators? How do they afford such widespread distribution? It is clear that some unseen hand enables this treasonous work.  </p>\n<p>Are the authorities blind to this threat? The government must act swiftly to uncover the source of this propaganda and put a stop to it before it takes deeper root. If such radicalism is allowed to fester, who knows what disorder may follow? The citizens of London demand answers and, more importantly, action.  </p>\n<p>Yours, etc.,<br>A Concerned Patriot</p>\n<p><a class=\"squiffy-action link-section\" data-section=\"Newspaper\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Notebook': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p>{if leads=0:You haven&#39;t visited any leads yet.}</p>\n<p>{if seen Mycroft Holmes:Mycroft told you the victim owed the bank a lot of money.}</p>\n<p>{if seen Telegraph:Cheryl Nightgrove sent a cryptic message the morning of the day the documents were stolen: &quot;IA COP TO STP SAT CN&quot;}</p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'People': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"Address Book\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p><a class=\"squiffy-link link-section\" data-section=\"Dewsberry Lord Arnold\" role=\"link\" tabindex=\"0\">Dewsberry, Lord Arnold</a></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Nightgrove Cheryl\" role=\"link\" tabindex=\"0\">Nightgrove, Cheryl</a></p>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"Address Book\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'Dewsberry Lord Arnold': {
		'text': "<p>You lift the heavy wrought-iron door knocker and let it fall on the broad wooden door of Lord Dewsberry&#39;s stately manor. A few moments later, a butler opens the door and eyes you, doing a rather poor job of hiding his distaste.</p>\n<p>&quot;Yes?&quot; he asks with feigned politeness.</p>\n<p>&quot;Is Lord Dewsberry home? We wish to speak with him about Miss Nightgrove&#39;s case,&quot; you explain.</p>\n<p>&quot;It would be a rarity indeed to find his lordship home at this hour. You can find him in his office at the Houses of Parliament.&quot; Without waiting for a response, the door closes with a thud.</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Nightgrove Cheryl': {
		'text': "<p>Cheryl&#39;s maid, Samantha, answers the door. &quot;Miss Nightgrove is not home at the moment.&quot;</p>\n<p>&quot;Oh, that&#39;s okay. We&#39;re actually here on behalf of Miss Nightgrove. We&#39;d like to ask you a few questions about what happened a few days ago.&quot;</p>\n<p>&quot;Oh!&quot; Samantha replies. &quot;I&#39;ve been so worried since she left with those men yesterday afternoon.&quot; She let&#39;s us in and leads us to the sitting room.</p>\n<p>&quot;This is where whatever happened happened,&quot; she says gesturing toward the room with her hand.</p>\n<p>&quot;What can you tell us about the evening of the 13th?&quot; you inquire politely.</p>\n<p>&quot;Let&#39;s see. That was Tuesday. Miss Nightgrove had several errands to run that day and didn&#39;t get home until mid-afternoon.&quot;</p>\n<p>&quot;Do you know what those errands were?&quot;</p>\n<p>&quot;Not really. But she doesn&#39;t normally inform me of her schedule unless it involves me.&quot; You nod and she continues, &quot;Later that evening, Lord Dewsberry came over having completed his work at parliament. They chatted for about half an hour before he left.&quot;</p>\n<p>&quot;What time would that have been?&quot;</p>\n<p>&quot;When he left? Perhaps a quarter past seven. Miss Nightgrove remained in the sitting room for another fifteen minutes or so before informing me that she was going on a walk to the park nearby. She was out quite a while and I didn&#39;t hear her return before I went to bed.&quot;</p>\n<p>&quot;Is it normal for her to go walking alone?&quot;</p>\n<p>&quot;To the park? Yes. She goes there about once a week. Says it&#39;s something about the beautiful scenery there that reminds her of her parents.&quot; At this, Samantha&#39;s face becomes downcast. &quot;She&#39;s been through so much,&quot; the maid says gently.</p>\n<p>&quot;What do you mean?&quot; you reply inquisitively.</p>\n<p>&quot;Her parents both passed away about six years ago. Miss Nightgrove was deeply affected by this loss, as you may imagine.&quot;</p>\n<p>&quot;Of course,&quot; you nod.</p>\n<p>&quot;A couple of years later she met a man, Igor--a foreign politician, I think--and fell in love. For a while, it seemed like God was repaying her for having taken her parents so young. She was so happy. But then, after about a year, it ended just as suddenly as it started.&quot;</p>\n<p>&quot;Why?&quot;</p>\n<p>&quot;I really don&#39;t know,&quot; Samantha says with a shrug. &quot;Although I like to think we have a certain rapport, Miss Nightgrove doesn&#39;t really confide in me. He went back to his country, as I understand it. Perhaps Miss Nightgrove wasn&#39;t ready to leave London, the scene of so many happy memories of her with her parents.&quot;</p>\n<p>Realizing the conversation has gone a bit off track, you ask, &quot;What about the events of the next day? The 14th?&quot;</p>\n<p>&quot;Ah, yes. Lord Dewsberry came by quite early while Miss Nightgrove was still eating breakfast. He was quite frantic.&quot;</p>\n<p>&quot;Did he tell you what was the matter?&quot;</p>\n<p>&quot;On the contrary. He and Miss Nightgrove went into the sitting room and closed the door. I admit I was curious and stood close to the door. I couldn&#39;t make out what they were saying, but it was clear his lordship was upset. I could here the sound of drawers being opened and closed, as if they were searching the room for something. After ten minutes or so of this, he left, just as upset as when he arrived.&quot;</p>\n<p>&quot;Is that all?&quot;</p>\n<p>&quot;No. Several hours later, a grand carriage pulled up and a couple of men in dark suits asked Miss Nightgrove to accompany them. To where, I don&#39;t know, but Miss Nightgrove, although anxious, encouraged me to not worry. I haven&#39;t seen her since. I was actually on the verge of calling the police to report her missing, since this absence is so unlike her.&quot;</p>\n<p>Remembering Lord Dewsberry&#39;s plea for discretion, you interject, &quot;Oh! That&#39;s not necessary. We actually just saw her earlier today with Lord Dewsberry. She is well, but might not return for a few days.&quot;</p>\n<p>This seems good enough for Samantha, who now appears quite relieved. &quot;I&#39;m so glad to hear that,&quot; she says.</p>\n<p>&quot;Did you notice any suspicious activity Tuesday evening? We&#39;re you awoken during the night, perhaps?&quot;</p>\n<p>&quot;No. I never woke up. But as for suspicious activity,&quot; she says, furrowing her brow as if to help her recall a memory, &quot;I did notice a strange man pacing back and forth in front of the house.&quot;</p>\n<p>&quot;What about him made him strange?&quot; you ask, pressing for details.</p>\n<p>&quot;He had a limp. He also looked out of place in a nice neighbourhood like this due to his rather shabby clothing.&quot; she explained. &quot;And he kept looking up at the windows, as if trying to see if anyone was home, then would glance around to see if anyone had noticed him. It was quite unnerving. When he noticed me looking at him from the upstairs window, he turned heel and flagged down a passing hansom.&quot;</p>\n<p>&quot;A man with a limp,&quot; you say, thoughtfully. &quot;Thank you for your time. We appreciate it.&quot;</p>\n<p>{What Next}</p>",
		'attributes': ["leads+=1"],
		'passages': {
		},
	},
	'Timeline': {
		'text': "<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>\n<hr>\n<p>If a lead mentions dates or times an entry will be added here.</p>\n<h3 id=\"tuesday-june-13\"><em>Tuesday, June 13</em></h3>\n<p>{if seen Telegraph:<strong>10:30 AM</strong> - Cheryl Nightgrove send a cryptic telegram.}</p>\n<p><strong>6:45 PM</strong> - Lord Dewsberry arrives at Cheryl&#39;s.</p>\n<p><strong>7:15 PM</strong> - Lord Dewsberry leaves Cheryl&#39;s.</p>\n<p><strong>7:30 PM</strong> - Cheryl Nightgrove goes on a walk alone.</p>\n<h3 id=\"thursday-june-15-today-\"><em>Thursday, June 15 (Today)</em></h3>\n<hr>\n<p><a class=\"squiffy-action link-section\" data-section=\"What Next\" role=\"link\" tabindex=\"0\">Back</a></p>",
		'passages': {
		},
	},
	'': {
		'clear': true,
		'text': "",
		'passages': {
		},
	},
	'init': {
		'text': "",
		'attributes': ["leads = 0"],
		'js': function() {
			squiffy.story.go("What Next")
		},
		'passages': {
		},
	},
	'Instructions': {
		'text': "<h2 id=\"instructions\">Instructions</h2>\n<h3 id=\"scoring\">Scoring</h3>\n<p>Once you think you know the solution to the mystery, click the <a href=\"#\" class=\"squiffy-action\">Check Solution</a> button. You will be presented with a series of questions. If you know the answer to the question, click the <a href=\"#\" class=\"squiffy-action\">I got it right!</a> button. Points will be added to your score.</p>\n<p>The number of leads you visit is tracked and will be compared with the number of leads Sherlock followed. For each lead beyond the number of leads Sherlock followed, 5 points will be deducted from your score.</p>\n<h3 id=\"navigating\">Navigating</h3>\n<p>A lead you haven&#39;t visited yet will appear <a href=\"#\" class=\"squiffy-link\">blue</a>. Clicking it will take you to the lead and will count against your score.</p>\n<p>A lead you&#39;ve visited will appear <span class=\"visited\"><a href=\"#\" class=\"squiffy-link\">green</a></span>. You may revisit it as many times as you&#39;d like without it counting against your score.</p>\n<p>Other links will appear <a href=\"#\" class=\"squiffy-action\">black</a>. These links do not count against your score.</p>\n<h3 id=\"player-aids\">Player Aids</h3>\n<p>There are player aids available. Note that using them may make the mystery easier to solve.</p>\n<p><a class=\"squiffy-action link-passage\" data-passage=\"Activate Notebook\" role=\"link\" tabindex=\"0\">Activate Notebook</a>. The notebook summarizes what you&#39;ve learned from each lead.</p>\n<p><a class=\"squiffy-action link-passage\" data-passage=\"Activate Timeline\" role=\"link\" tabindex=\"0\">Activate Timeline</a>. The timeline shows information you&#39;ve gathered in chronological order if the information includes a date and time.</p>\n<p><a class=\"squiffy-action link-section\" data-section=\"Introduction\" role=\"link\" tabindex=\"0\">Start Game</a></p>",
		'passages': {
			'Activate Notebook': {
				'text': "<p>The notebook is active!</p>",
				'attributes': ["notebookActive"],
			},
			'Activate Timeline': {
				'text': "<p>The timeline is active!</p>",
				'attributes': ["timelineActive"],
			},
		},
	},
	'Introduction': {
		'text': "<h2 id=\"introduction\">Introduction</h2>\n<p><em>Thursday, June 15, 1899</em></p>\n<p>The gaslights flicker dimly in 221B Baker Street, casting long shadows across the cluttered sitting room. The air is \nthick with the scent of pipe smoke and damp wool from the overcoats hanging on the coatrack by the door, wet with the warm summer rain. Sherlock Holmes stands near the fireplace, fingers steepled, his sharp gaze shifting between the anxious woman seated on the couch and the imposing figure pacing near the window.</p>\n<p>Cheryl Nightgrove, a young lady, well-dressed, clutches a lace handkerchief in her trembling hands. Across from her, an older mustachioed Lord Dewsberry glowers, his jaw clenched, his polished boots tapping impatiently against the floorboards. As a distinguished member of parliament, and a favourite for the next prime minister, he has the air of someone who has given much of his life to his work.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue1\" role=\"link\" tabindex=\"0\">Continue...</a></p>",
		'passages': {
		},
	},
	'_continue1': {
		'text': "<p>Holmes finally breaks the silence.</p>\n<p>&quot;Miss Nightgrove has found herself in a rather dire predicament,&quot; he announces, his tone brisk. &quot;Two nights ago, confidential government documents vanished from her home. The authorities suspect she sold them to a foreign power. If found guilty, she will be charged with treason—-a crime that carries the gravest of penalties.&quot;</p>\n<p>Lord Dewsberry exhales sharply, his irritation barely restrained. &quot;This entire affair is ridiculous. The only reason those documents were in Cheryl’s home is because I left them there myself.&quot; He turns to you, his expression stern. &quot;I had a satchel with classified materials when I visited that evening. I must have set it down and forgotten it. When I returned the next morning, it was gone.&quot;</p>\n<p>Holmes raises an eyebrow. &quot;A rather careless oversight for a man in your position, Lord Dewsberry.&quot;</p>\n<p>Dewsberry stiffens. &quot;Believe me, I have been made painfully aware of that fact.&quot;</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue2\" role=\"link\" tabindex=\"0\">Continue...</a></p>",
		'passages': {
		},
	},
	'_continue2': {
		'text': "<p>&quot;I didn’t even realize they were there until the next morning when Arnie dropped by looking for them,&quot; Cheryl interjects, her voice edged with desperation. &quot;We scoured the sitting room where we had been the night before, but couldn&#39;t find the satchel.&quot;</p>\n<p>&quot;Hmm,&quot; Holmes murmurs, exhaling a thin stream of smoke.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue3\" role=\"link\" tabindex=\"0\">Continue...</a></p>",
		'passages': {
		},
	},
	'_continue3': {
		'text': "<p>&quot;But why a charge of treason?&quot; Dr Watson interjects. &quot;I understand there were other items of value taken from Miss Nightgrove&#39;s flat. Shouldn&#39;t this be considered simple burglery?&quot; </p>\n<p>Lord Dewsberry responds, &quot;There was nothing about the satchel to suggest it was worth stealing, so the authorities are of the opinion that the thief must have known it held confidential documents and only stole the other items to make it look like a simple case of burglery.&quot;</p>\n<p>Cheryl&#39;s fingers tighten around her handkerchief. &quot;To think that they could believe I had something to do with this...&quot; she says quietly. The brave front she had been displaying until now finally fails as she begins to weep. Lord Dewsberry moves toward her and lays a loving hand on her shoulder.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue4\" role=\"link\" tabindex=\"0\">Continue...</a></p>",
		'passages': {
		},
	},
	'_continue4': {
		'text': "<p>&quot;Surely you must have an alibi?&quot;, you inquire.</p>\n<p>&quot;After Arnie left that evening, I went out on a walk through the park by myself&quot;, she states.</p>\n<p>&quot;Sadly, it&#39;s unlikely we&#39;ll be able to find anyone who can verify that.&quot;, inserts Dr Watson. Cheryl nods and continues.</p>\n<p>&quot;Afterward, I came home and slept. My maid, Samantha, had already gone to bed and didn&#39;t see me until the morning.&quot;</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue5\" role=\"link\" tabindex=\"0\">Continue...</a></p>",
		'passages': {
		},
	},
	'_continue5': {
		'text': "<p>There&#39;s a pause as everyone appreciates the gravity of the situation. Holmes studies the young lady seated before him for a moment before turning to you. &quot;The authorities will not search for another culprit if they believe they have already found their traitor. We must uncover the truth before they reach their own conclusion.&quot;</p>\n<p>&quot;Please, if you will,&quot; Lord Dewsberry starts anxiously, &quot;It&#39;s taken a considerable effort on my part to keep this quiet while we investigate. Normally, someone accused of treason would already be in jail. I&#39;d appreciate it if you would avoid involving the police or mentioning the exact issue you&#39;re investigating to the people you meet.&quot;</p>\n<p>&quot;No need to worry about the police,&quot; Holmes says looking at Watson with a grin, &quot;I&#39;m sure Lestrade has his hands quite full tracking down the source of all that communist literature littering the streets.&quot; This elicits a chuckle from Watson.</p>\n<p>A moment passes. Holmes flicks his gaze toward Cheryl, then Dewsberry, before fixing his piercing eyes on you. &quot;Well then. To work?&quot;</p>\n<p>{What Next}</p>",
		'passages': {
		},
	},
	'What Next': {
		'text': "<hr>\n<p>What next?</p>\n<p><a class=\"squiffy-action link-section\" data-section=\"Instructions\" role=\"link\" tabindex=\"0\">Instructions</a> | <a class=\"squiffy-action link-section\" data-section=\"Informants\" role=\"link\" tabindex=\"0\">Informants</a> | <a class=\"squiffy-action link-section\" data-section=\"Map\" role=\"link\" tabindex=\"0\">Map</a> | <a class=\"squiffy-action link-section\" data-section=\"Address Book\" role=\"link\" tabindex=\"0\">Address Book</a> | <a class=\"squiffy-action link-section\" data-section=\"Newspaper\" role=\"link\" tabindex=\"0\">Newspaper</a> {if notebookActive:| <a class=\"squiffy-action link-section\" data-section=\"Notebook\" role=\"link\" tabindex=\"0\">Notebook</a> }{if timelineActive:| <a class=\"squiffy-action link-section\" data-section=\"Timeline\" role=\"link\" tabindex=\"0\">Timeline</a>} | <a class=\"squiffy-action link-section\" data-section=\"Leads\" role=\"link\" tabindex=\"0\">Leads: {leads}</a></p>",
		'passages': {
		},
	},
	'No Entry': {
		'text': "<p>There is no entry for this person or location. This does not count as a lead.</p>\n<hr>\n<p>{What Next}</p>",
		'passages': {
		},
	},
}
})();