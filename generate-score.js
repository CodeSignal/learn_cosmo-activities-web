#!/usr/bin/env node
// AUTO-GENERATED — do not edit directly.
// Source: lib/generate-score.js
// Rebuild: npm run build:scorer

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// node_modules/marked/lib/marked.cjs
var require_marked = __commonJS({
  "node_modules/marked/lib/marked.cjs"(exports2) {
    "use strict";
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", {
        writable: false
      });
      return Constructor;
    }
    function _extends() {
      _extends = Object.assign ? Object.assign.bind() : function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      return _extends.apply(this, arguments);
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return {
            done: true
          };
          return {
            done: false,
            value: o[i++]
          };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _toPrimitive(input, hint) {
      if (typeof input !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (typeof res !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return typeof key === "symbol" ? key : String(key);
    }
    function getDefaults() {
      return {
        async: false,
        baseUrl: null,
        breaks: false,
        extensions: null,
        gfm: true,
        headerIds: true,
        headerPrefix: "",
        highlight: null,
        hooks: null,
        langPrefix: "language-",
        mangle: true,
        pedantic: false,
        renderer: null,
        sanitize: false,
        sanitizer: null,
        silent: false,
        smartypants: false,
        tokenizer: null,
        walkTokens: null,
        xhtml: false
      };
    }
    exports2.defaults = getDefaults();
    function changeDefaults(newDefaults) {
      exports2.defaults = newDefaults;
    }
    var escapeTest = /[&<>"']/;
    var escapeReplace = new RegExp(escapeTest.source, "g");
    var escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
    var escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, "g");
    var escapeReplacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    var getEscapeReplacement = function getEscapeReplacement2(ch) {
      return escapeReplacements[ch];
    };
    function escape(html, encode) {
      if (encode) {
        if (escapeTest.test(html)) {
          return html.replace(escapeReplace, getEscapeReplacement);
        }
      } else {
        if (escapeTestNoEncode.test(html)) {
          return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
      }
      return html;
    }
    var unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
    function unescape(html) {
      return html.replace(unescapeTest, function(_, n) {
        n = n.toLowerCase();
        if (n === "colon") return ":";
        if (n.charAt(0) === "#") {
          return n.charAt(1) === "x" ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
        }
        return "";
      });
    }
    var caret = /(^|[^\[])\^/g;
    function edit(regex, opt) {
      regex = typeof regex === "string" ? regex : regex.source;
      opt = opt || "";
      var obj = {
        replace: function replace(name, val) {
          val = val.source || val;
          val = val.replace(caret, "$1");
          regex = regex.replace(name, val);
          return obj;
        },
        getRegex: function getRegex() {
          return new RegExp(regex, opt);
        }
      };
      return obj;
    }
    var nonWordAndColonTest = /[^\w:]/g;
    var originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
    function cleanUrl(sanitize, base, href) {
      if (sanitize) {
        var prot;
        try {
          prot = decodeURIComponent(unescape(href)).replace(nonWordAndColonTest, "").toLowerCase();
        } catch (e) {
          return null;
        }
        if (prot.indexOf("javascript:") === 0 || prot.indexOf("vbscript:") === 0 || prot.indexOf("data:") === 0) {
          return null;
        }
      }
      if (base && !originIndependentUrl.test(href)) {
        href = resolveUrl(base, href);
      }
      try {
        href = encodeURI(href).replace(/%25/g, "%");
      } catch (e) {
        return null;
      }
      return href;
    }
    var baseUrls = {};
    var justDomain = /^[^:]+:\/*[^/]*$/;
    var protocol = /^([^:]+:)[\s\S]*$/;
    var domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;
    function resolveUrl(base, href) {
      if (!baseUrls[" " + base]) {
        if (justDomain.test(base)) {
          baseUrls[" " + base] = base + "/";
        } else {
          baseUrls[" " + base] = rtrim(base, "/", true);
        }
      }
      base = baseUrls[" " + base];
      var relativeBase = base.indexOf(":") === -1;
      if (href.substring(0, 2) === "//") {
        if (relativeBase) {
          return href;
        }
        return base.replace(protocol, "$1") + href;
      } else if (href.charAt(0) === "/") {
        if (relativeBase) {
          return href;
        }
        return base.replace(domain, "$1") + href;
      } else {
        return base + href;
      }
    }
    var noopTest = {
      exec: function noopTest2() {
      }
    };
    function splitCells(tableRow, count) {
      var row = tableRow.replace(/\|/g, function(match, offset, str) {
        var escaped = false, curr = offset;
        while (--curr >= 0 && str[curr] === "\\") {
          escaped = !escaped;
        }
        if (escaped) {
          return "|";
        } else {
          return " |";
        }
      }), cells = row.split(/ \|/);
      var i = 0;
      if (!cells[0].trim()) {
        cells.shift();
      }
      if (cells.length > 0 && !cells[cells.length - 1].trim()) {
        cells.pop();
      }
      if (cells.length > count) {
        cells.splice(count);
      } else {
        while (cells.length < count) {
          cells.push("");
        }
      }
      for (; i < cells.length; i++) {
        cells[i] = cells[i].trim().replace(/\\\|/g, "|");
      }
      return cells;
    }
    function rtrim(str, c, invert) {
      var l = str.length;
      if (l === 0) {
        return "";
      }
      var suffLen = 0;
      while (suffLen < l) {
        var currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
          suffLen++;
        } else if (currChar !== c && invert) {
          suffLen++;
        } else {
          break;
        }
      }
      return str.slice(0, l - suffLen);
    }
    function findClosingBracket(str, b) {
      if (str.indexOf(b[1]) === -1) {
        return -1;
      }
      var l = str.length;
      var level = 0, i = 0;
      for (; i < l; i++) {
        if (str[i] === "\\") {
          i++;
        } else if (str[i] === b[0]) {
          level++;
        } else if (str[i] === b[1]) {
          level--;
          if (level < 0) {
            return i;
          }
        }
      }
      return -1;
    }
    function checkSanitizeDeprecation(opt) {
      if (opt && opt.sanitize && !opt.silent) {
        console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options");
      }
    }
    function repeatString(pattern, count) {
      if (count < 1) {
        return "";
      }
      var result = "";
      while (count > 1) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result + pattern;
    }
    function outputLink(cap, link, raw, lexer2) {
      var href = link.href;
      var title = link.title ? escape(link.title) : null;
      var text = cap[1].replace(/\\([\[\]])/g, "$1");
      if (cap[0].charAt(0) !== "!") {
        lexer2.state.inLink = true;
        var token = {
          type: "link",
          raw,
          href,
          title,
          text,
          tokens: lexer2.inlineTokens(text)
        };
        lexer2.state.inLink = false;
        return token;
      }
      return {
        type: "image",
        raw,
        href,
        title,
        text: escape(text)
      };
    }
    function indentCodeCompensation(raw, text) {
      var matchIndentToCode = raw.match(/^(\s+)(?:```)/);
      if (matchIndentToCode === null) {
        return text;
      }
      var indentToCode = matchIndentToCode[1];
      return text.split("\n").map(function(node) {
        var matchIndentInNode = node.match(/^\s+/);
        if (matchIndentInNode === null) {
          return node;
        }
        var indentInNode = matchIndentInNode[0];
        if (indentInNode.length >= indentToCode.length) {
          return node.slice(indentToCode.length);
        }
        return node;
      }).join("\n");
    }
    var Tokenizer = /* @__PURE__ */ (function() {
      function Tokenizer2(options2) {
        this.options = options2 || exports2.defaults;
      }
      var _proto = Tokenizer2.prototype;
      _proto.space = function space(src) {
        var cap = this.rules.block.newline.exec(src);
        if (cap && cap[0].length > 0) {
          return {
            type: "space",
            raw: cap[0]
          };
        }
      };
      _proto.code = function code(src) {
        var cap = this.rules.block.code.exec(src);
        if (cap) {
          var text = cap[0].replace(/^ {1,4}/gm, "");
          return {
            type: "code",
            raw: cap[0],
            codeBlockStyle: "indented",
            text: !this.options.pedantic ? rtrim(text, "\n") : text
          };
        }
      };
      _proto.fences = function fences(src) {
        var cap = this.rules.block.fences.exec(src);
        if (cap) {
          var raw = cap[0];
          var text = indentCodeCompensation(raw, cap[3] || "");
          return {
            type: "code",
            raw,
            lang: cap[2] ? cap[2].trim().replace(this.rules.inline._escapes, "$1") : cap[2],
            text
          };
        }
      };
      _proto.heading = function heading(src) {
        var cap = this.rules.block.heading.exec(src);
        if (cap) {
          var text = cap[2].trim();
          if (/#$/.test(text)) {
            var trimmed = rtrim(text, "#");
            if (this.options.pedantic) {
              text = trimmed.trim();
            } else if (!trimmed || / $/.test(trimmed)) {
              text = trimmed.trim();
            }
          }
          return {
            type: "heading",
            raw: cap[0],
            depth: cap[1].length,
            text,
            tokens: this.lexer.inline(text)
          };
        }
      };
      _proto.hr = function hr(src) {
        var cap = this.rules.block.hr.exec(src);
        if (cap) {
          return {
            type: "hr",
            raw: cap[0]
          };
        }
      };
      _proto.blockquote = function blockquote(src) {
        var cap = this.rules.block.blockquote.exec(src);
        if (cap) {
          var text = cap[0].replace(/^ *>[ \t]?/gm, "");
          var top = this.lexer.state.top;
          this.lexer.state.top = true;
          var tokens = this.lexer.blockTokens(text);
          this.lexer.state.top = top;
          return {
            type: "blockquote",
            raw: cap[0],
            tokens,
            text
          };
        }
      };
      _proto.list = function list(src) {
        var cap = this.rules.block.list.exec(src);
        if (cap) {
          var raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine, line, nextLine, rawLine, itemContents, endEarly;
          var bull = cap[1].trim();
          var isordered = bull.length > 1;
          var list2 = {
            type: "list",
            raw: "",
            ordered: isordered,
            start: isordered ? +bull.slice(0, -1) : "",
            loose: false,
            items: []
          };
          bull = isordered ? "\\d{1,9}\\" + bull.slice(-1) : "\\" + bull;
          if (this.options.pedantic) {
            bull = isordered ? bull : "[*+-]";
          }
          var itemRegex = new RegExp("^( {0,3}" + bull + ")((?:[	 ][^\\n]*)?(?:\\n|$))");
          while (src) {
            endEarly = false;
            if (!(cap = itemRegex.exec(src))) {
              break;
            }
            if (this.rules.block.hr.test(src)) {
              break;
            }
            raw = cap[0];
            src = src.substring(raw.length);
            line = cap[2].split("\n", 1)[0].replace(/^\t+/, function(t) {
              return " ".repeat(3 * t.length);
            });
            nextLine = src.split("\n", 1)[0];
            if (this.options.pedantic) {
              indent = 2;
              itemContents = line.trimLeft();
            } else {
              indent = cap[2].search(/[^ ]/);
              indent = indent > 4 ? 1 : indent;
              itemContents = line.slice(indent);
              indent += cap[1].length;
            }
            blankLine = false;
            if (!line && /^ *$/.test(nextLine)) {
              raw += nextLine + "\n";
              src = src.substring(nextLine.length + 1);
              endEarly = true;
            }
            if (!endEarly) {
              var nextBulletRegex = new RegExp("^ {0," + Math.min(3, indent - 1) + "}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))");
              var hrRegex = new RegExp("^ {0," + Math.min(3, indent - 1) + "}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)");
              var fencesBeginRegex = new RegExp("^ {0," + Math.min(3, indent - 1) + "}(?:```|~~~)");
              var headingBeginRegex = new RegExp("^ {0," + Math.min(3, indent - 1) + "}#");
              while (src) {
                rawLine = src.split("\n", 1)[0];
                nextLine = rawLine;
                if (this.options.pedantic) {
                  nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
                }
                if (fencesBeginRegex.test(nextLine)) {
                  break;
                }
                if (headingBeginRegex.test(nextLine)) {
                  break;
                }
                if (nextBulletRegex.test(nextLine)) {
                  break;
                }
                if (hrRegex.test(src)) {
                  break;
                }
                if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) {
                  itemContents += "\n" + nextLine.slice(indent);
                } else {
                  if (blankLine) {
                    break;
                  }
                  if (line.search(/[^ ]/) >= 4) {
                    break;
                  }
                  if (fencesBeginRegex.test(line)) {
                    break;
                  }
                  if (headingBeginRegex.test(line)) {
                    break;
                  }
                  if (hrRegex.test(line)) {
                    break;
                  }
                  itemContents += "\n" + nextLine;
                }
                if (!blankLine && !nextLine.trim()) {
                  blankLine = true;
                }
                raw += rawLine + "\n";
                src = src.substring(rawLine.length + 1);
                line = nextLine.slice(indent);
              }
            }
            if (!list2.loose) {
              if (endsWithBlankLine) {
                list2.loose = true;
              } else if (/\n *\n *$/.test(raw)) {
                endsWithBlankLine = true;
              }
            }
            if (this.options.gfm) {
              istask = /^\[[ xX]\] /.exec(itemContents);
              if (istask) {
                ischecked = istask[0] !== "[ ] ";
                itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
              }
            }
            list2.items.push({
              type: "list_item",
              raw,
              task: !!istask,
              checked: ischecked,
              loose: false,
              text: itemContents
            });
            list2.raw += raw;
          }
          list2.items[list2.items.length - 1].raw = raw.trimRight();
          list2.items[list2.items.length - 1].text = itemContents.trimRight();
          list2.raw = list2.raw.trimRight();
          var l = list2.items.length;
          for (i = 0; i < l; i++) {
            this.lexer.state.top = false;
            list2.items[i].tokens = this.lexer.blockTokens(list2.items[i].text, []);
            if (!list2.loose) {
              var spacers = list2.items[i].tokens.filter(function(t) {
                return t.type === "space";
              });
              var hasMultipleLineBreaks = spacers.length > 0 && spacers.some(function(t) {
                return /\n.*\n/.test(t.raw);
              });
              list2.loose = hasMultipleLineBreaks;
            }
          }
          if (list2.loose) {
            for (i = 0; i < l; i++) {
              list2.items[i].loose = true;
            }
          }
          return list2;
        }
      };
      _proto.html = function html(src) {
        var cap = this.rules.block.html.exec(src);
        if (cap) {
          var token = {
            type: "html",
            raw: cap[0],
            pre: !this.options.sanitizer && (cap[1] === "pre" || cap[1] === "script" || cap[1] === "style"),
            text: cap[0]
          };
          if (this.options.sanitize) {
            var text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]);
            token.type = "paragraph";
            token.text = text;
            token.tokens = this.lexer.inline(text);
          }
          return token;
        }
      };
      _proto.def = function def(src) {
        var cap = this.rules.block.def.exec(src);
        if (cap) {
          var tag = cap[1].toLowerCase().replace(/\s+/g, " ");
          var href = cap[2] ? cap[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline._escapes, "$1") : "";
          var title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline._escapes, "$1") : cap[3];
          return {
            type: "def",
            tag,
            raw: cap[0],
            href,
            title
          };
        }
      };
      _proto.table = function table(src) {
        var cap = this.rules.block.table.exec(src);
        if (cap) {
          var item = {
            type: "table",
            header: splitCells(cap[1]).map(function(c) {
              return {
                text: c
              };
            }),
            align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
            rows: cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split("\n") : []
          };
          if (item.header.length === item.align.length) {
            item.raw = cap[0];
            var l = item.align.length;
            var i, j, k, row;
            for (i = 0; i < l; i++) {
              if (/^ *-+: *$/.test(item.align[i])) {
                item.align[i] = "right";
              } else if (/^ *:-+: *$/.test(item.align[i])) {
                item.align[i] = "center";
              } else if (/^ *:-+ *$/.test(item.align[i])) {
                item.align[i] = "left";
              } else {
                item.align[i] = null;
              }
            }
            l = item.rows.length;
            for (i = 0; i < l; i++) {
              item.rows[i] = splitCells(item.rows[i], item.header.length).map(function(c) {
                return {
                  text: c
                };
              });
            }
            l = item.header.length;
            for (j = 0; j < l; j++) {
              item.header[j].tokens = this.lexer.inline(item.header[j].text);
            }
            l = item.rows.length;
            for (j = 0; j < l; j++) {
              row = item.rows[j];
              for (k = 0; k < row.length; k++) {
                row[k].tokens = this.lexer.inline(row[k].text);
              }
            }
            return item;
          }
        }
      };
      _proto.lheading = function lheading(src) {
        var cap = this.rules.block.lheading.exec(src);
        if (cap) {
          return {
            type: "heading",
            raw: cap[0],
            depth: cap[2].charAt(0) === "=" ? 1 : 2,
            text: cap[1],
            tokens: this.lexer.inline(cap[1])
          };
        }
      };
      _proto.paragraph = function paragraph(src) {
        var cap = this.rules.block.paragraph.exec(src);
        if (cap) {
          var text = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
          return {
            type: "paragraph",
            raw: cap[0],
            text,
            tokens: this.lexer.inline(text)
          };
        }
      };
      _proto.text = function text(src) {
        var cap = this.rules.block.text.exec(src);
        if (cap) {
          return {
            type: "text",
            raw: cap[0],
            text: cap[0],
            tokens: this.lexer.inline(cap[0])
          };
        }
      };
      _proto.escape = function escape$1(src) {
        var cap = this.rules.inline.escape.exec(src);
        if (cap) {
          return {
            type: "escape",
            raw: cap[0],
            text: escape(cap[1])
          };
        }
      };
      _proto.tag = function tag(src) {
        var cap = this.rules.inline.tag.exec(src);
        if (cap) {
          if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
            this.lexer.state.inLink = true;
          } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
            this.lexer.state.inLink = false;
          }
          if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            this.lexer.state.inRawBlock = true;
          } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            this.lexer.state.inRawBlock = false;
          }
          return {
            type: this.options.sanitize ? "text" : "html",
            raw: cap[0],
            inLink: this.lexer.state.inLink,
            inRawBlock: this.lexer.state.inRawBlock,
            text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0]
          };
        }
      };
      _proto.link = function link(src) {
        var cap = this.rules.inline.link.exec(src);
        if (cap) {
          var trimmedUrl = cap[2].trim();
          if (!this.options.pedantic && /^</.test(trimmedUrl)) {
            if (!/>$/.test(trimmedUrl)) {
              return;
            }
            var rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
            if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
              return;
            }
          } else {
            var lastParenIndex = findClosingBracket(cap[2], "()");
            if (lastParenIndex > -1) {
              var start = cap[0].indexOf("!") === 0 ? 5 : 4;
              var linkLen = start + cap[1].length + lastParenIndex;
              cap[2] = cap[2].substring(0, lastParenIndex);
              cap[0] = cap[0].substring(0, linkLen).trim();
              cap[3] = "";
            }
          }
          var href = cap[2];
          var title = "";
          if (this.options.pedantic) {
            var link2 = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
            if (link2) {
              href = link2[1];
              title = link2[3];
            }
          } else {
            title = cap[3] ? cap[3].slice(1, -1) : "";
          }
          href = href.trim();
          if (/^</.test(href)) {
            if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
              href = href.slice(1);
            } else {
              href = href.slice(1, -1);
            }
          }
          return outputLink(cap, {
            href: href ? href.replace(this.rules.inline._escapes, "$1") : href,
            title: title ? title.replace(this.rules.inline._escapes, "$1") : title
          }, cap[0], this.lexer);
        }
      };
      _proto.reflink = function reflink(src, links) {
        var cap;
        if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
          var link = (cap[2] || cap[1]).replace(/\s+/g, " ");
          link = links[link.toLowerCase()];
          if (!link) {
            var text = cap[0].charAt(0);
            return {
              type: "text",
              raw: text,
              text
            };
          }
          return outputLink(cap, link, cap[0], this.lexer);
        }
      };
      _proto.emStrong = function emStrong(src, maskedSrc, prevChar) {
        if (prevChar === void 0) {
          prevChar = "";
        }
        var match = this.rules.inline.emStrong.lDelim.exec(src);
        if (!match) return;
        if (match[3] && prevChar.match(/(?:[0-9A-Za-z\xAA\xB2\xB3\xB5\xB9\xBA\xBC-\xBE\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u0660-\u0669\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088E\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09E6-\u09F1\u09F4-\u09F9\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AE6-\u0AEF\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71-\u0B77\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BF2\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5D\u0C60\u0C61\u0C66-\u0C6F\u0C78-\u0C7E\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDD\u0CDE\u0CE0\u0CE1\u0CE6-\u0CEF\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D58-\u0D61\u0D66-\u0D78\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DE6-\u0DEF\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F33\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1369-\u137C\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2070\u2071\u2074-\u2079\u207F-\u2089\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2150-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2CFD\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u3192-\u3195\u31A0-\u31BF\u31F0-\u31FF\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7CA\uA7D0\uA7D1\uA7D3\uA7D5-\uA7D9\uA7F2-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA830-\uA835\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uA9E0-\uA9E4\uA9E6-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDE80-\uDE9C\uDEA0-\uDED0\uDEE1-\uDEFB\uDF00-\uDF23\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDD70-\uDD7A\uDD7C-\uDD8A\uDD8C-\uDD92\uDD94\uDD95\uDD97-\uDDA1\uDDA3-\uDDB1\uDDB3-\uDDB9\uDDBB\uDDBC\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67\uDF80-\uDF85\uDF87-\uDFB0\uDFB2-\uDFBA]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC58-\uDC76\uDC79-\uDC9E\uDCA7-\uDCAF\uDCE0-\uDCF2\uDCF4\uDCF5\uDCFB-\uDD1B\uDD20-\uDD39\uDD80-\uDDB7\uDDBC-\uDDCF\uDDD2-\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE40-\uDE48\uDE60-\uDE7E\uDE80-\uDE9F\uDEC0-\uDEC7\uDEC9-\uDEE4\uDEEB-\uDEEF\uDF00-\uDF35\uDF40-\uDF55\uDF58-\uDF72\uDF78-\uDF91\uDFA9-\uDFAF]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDCFA-\uDD23\uDD30-\uDD39\uDE60-\uDE7E\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF27\uDF30-\uDF45\uDF51-\uDF54\uDF70-\uDF81\uDFB0-\uDFCB\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC52-\uDC6F\uDC71\uDC72\uDC75\uDC83-\uDCAF\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD03-\uDD26\uDD36-\uDD3F\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDD0-\uDDDA\uDDDC\uDDE1-\uDDF4\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDEF0-\uDEF9\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC50-\uDC59\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE50-\uDE59\uDE80-\uDEAA\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF30-\uDF3B\uDF40-\uDF46]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCF2\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDD50-\uDD59\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEB0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC50-\uDC6C\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF2\uDFB0\uDFC0-\uDFD4]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|\uD80B[\uDF90-\uDFF0]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDE70-\uDEBE\uDEC0-\uDEC9\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF50-\uDF59\uDF5B-\uDF61\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE96\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82B[\uDFF0-\uDFF3\uDFF5-\uDFFB\uDFFD\uDFFE]|\uD82C[\uDC00-\uDD22\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD837[\uDF00-\uDF1E]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD40-\uDD49\uDD4E\uDE90-\uDEAD\uDEC0-\uDEEB\uDEF0-\uDEF9]|\uD839[\uDFE0-\uDFE6\uDFE8-\uDFEB\uDFED\uDFEE\uDFF0-\uDFFE]|\uD83A[\uDC00-\uDCC4\uDCC7-\uDCCF\uDD00-\uDD43\uDD4B\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83C[\uDD00-\uDD0C]|\uD83E[\uDFF0-\uDFF9]|\uD869[\uDC00-\uDEDF\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF38\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A])/)) return;
        var nextChar = match[1] || match[2] || "";
        if (!nextChar || nextChar && (prevChar === "" || this.rules.inline.punctuation.exec(prevChar))) {
          var lLength = match[0].length - 1;
          var rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
          var endReg = match[0][0] === "*" ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
          endReg.lastIndex = 0;
          maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
          while ((match = endReg.exec(maskedSrc)) != null) {
            rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
            if (!rDelim) continue;
            rLength = rDelim.length;
            if (match[3] || match[4]) {
              delimTotal += rLength;
              continue;
            } else if (match[5] || match[6]) {
              if (lLength % 3 && !((lLength + rLength) % 3)) {
                midDelimTotal += rLength;
                continue;
              }
            }
            delimTotal -= rLength;
            if (delimTotal > 0) continue;
            rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
            var raw = src.slice(0, lLength + match.index + (match[0].length - rDelim.length) + rLength);
            if (Math.min(lLength, rLength) % 2) {
              var _text = raw.slice(1, -1);
              return {
                type: "em",
                raw,
                text: _text,
                tokens: this.lexer.inlineTokens(_text)
              };
            }
            var text = raw.slice(2, -2);
            return {
              type: "strong",
              raw,
              text,
              tokens: this.lexer.inlineTokens(text)
            };
          }
        }
      };
      _proto.codespan = function codespan(src) {
        var cap = this.rules.inline.code.exec(src);
        if (cap) {
          var text = cap[2].replace(/\n/g, " ");
          var hasNonSpaceChars = /[^ ]/.test(text);
          var hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
          if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
            text = text.substring(1, text.length - 1);
          }
          text = escape(text, true);
          return {
            type: "codespan",
            raw: cap[0],
            text
          };
        }
      };
      _proto.br = function br(src) {
        var cap = this.rules.inline.br.exec(src);
        if (cap) {
          return {
            type: "br",
            raw: cap[0]
          };
        }
      };
      _proto.del = function del(src) {
        var cap = this.rules.inline.del.exec(src);
        if (cap) {
          return {
            type: "del",
            raw: cap[0],
            text: cap[2],
            tokens: this.lexer.inlineTokens(cap[2])
          };
        }
      };
      _proto.autolink = function autolink(src, mangle2) {
        var cap = this.rules.inline.autolink.exec(src);
        if (cap) {
          var text, href;
          if (cap[2] === "@") {
            text = escape(this.options.mangle ? mangle2(cap[1]) : cap[1]);
            href = "mailto:" + text;
          } else {
            text = escape(cap[1]);
            href = text;
          }
          return {
            type: "link",
            raw: cap[0],
            text,
            href,
            tokens: [{
              type: "text",
              raw: text,
              text
            }]
          };
        }
      };
      _proto.url = function url(src, mangle2) {
        var cap;
        if (cap = this.rules.inline.url.exec(src)) {
          var text, href;
          if (cap[2] === "@") {
            text = escape(this.options.mangle ? mangle2(cap[0]) : cap[0]);
            href = "mailto:" + text;
          } else {
            var prevCapZero;
            do {
              prevCapZero = cap[0];
              cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
            } while (prevCapZero !== cap[0]);
            text = escape(cap[0]);
            if (cap[1] === "www.") {
              href = "http://" + cap[0];
            } else {
              href = cap[0];
            }
          }
          return {
            type: "link",
            raw: cap[0],
            text,
            href,
            tokens: [{
              type: "text",
              raw: text,
              text
            }]
          };
        }
      };
      _proto.inlineText = function inlineText(src, smartypants2) {
        var cap = this.rules.inline.text.exec(src);
        if (cap) {
          var text;
          if (this.lexer.state.inRawBlock) {
            text = this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0];
          } else {
            text = escape(this.options.smartypants ? smartypants2(cap[0]) : cap[0]);
          }
          return {
            type: "text",
            raw: cap[0],
            text
          };
        }
      };
      return Tokenizer2;
    })();
    var block = {
      newline: /^(?: *(?:\n|$))+/,
      code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
      fences: /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
      hr: /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
      heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
      blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
      list: /^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/,
      html: "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",
      def: /^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
      table: noopTest,
      lheading: /^((?:.|\n(?!\n))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
      // regex template, placeholders will be replaced according to different paragraph
      // interruption rules of commonmark and the original markdown spec:
      _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
      text: /^[^\n]+/
    };
    block._label = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
    block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
    block.def = edit(block.def).replace("label", block._label).replace("title", block._title).getRegex();
    block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
    block.listItemStart = edit(/^( *)(bull) */).replace("bull", block.bullet).getRegex();
    block.list = edit(block.list).replace(/bull/g, block.bullet).replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def", "\\n+(?=" + block.def.source + ")").getRegex();
    block._tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
    block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
    block.html = edit(block.html, "i").replace("comment", block._comment).replace("tag", block._tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
    block.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
    block.blockquote = edit(block.blockquote).replace("paragraph", block.paragraph).getRegex();
    block.normal = _extends({}, block);
    block.gfm = _extends({}, block.normal, {
      table: "^ *([^\\n ].*\\|.*)\\n {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
      // Cells
    });
    block.gfm.table = edit(block.gfm.table).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
    block.gfm.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("table", block.gfm.table).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
    block.pedantic = _extends({}, block.normal, {
      html: edit(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", block._comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
      heading: /^(#{1,6})(.*)(?:\n+|$)/,
      fences: noopTest,
      // fences not supported
      lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
      paragraph: edit(block.normal._paragraph).replace("hr", block.hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", block.lheading).replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").getRegex()
    });
    var inline = {
      escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
      autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
      url: noopTest,
      tag: "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
      // CDATA section
      link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
      reflink: /^!?\[(label)\]\[(ref)\]/,
      nolink: /^!?\[(ref)\](?:\[\])?/,
      reflinkSearch: "reflink|nolink(?!\\()",
      emStrong: {
        lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
        //        (1) and (2) can only be a Right Delimiter. (3) and (4) can only be Left.  (5) and (6) can be either Left or Right.
        //          () Skip orphan inside strong                                      () Consume to delim     (1) #***                (2) a***#, a***                             (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
        rDelimAst: /^(?:[^_*\\]|\\.)*?\_\_(?:[^_*\\]|\\.)*?\*(?:[^_*\\]|\\.)*?(?=\_\_)|(?:[^*\\]|\\.)+(?=[^*])|[punct_](\*+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|(?:[^punct*_\s\\]|\\.)(\*+)(?=[^punct*_\s])/,
        rDelimUnd: /^(?:[^_*\\]|\\.)*?\*\*(?:[^_*\\]|\\.)*?\_(?:[^_*\\]|\\.)*?(?=\*\*)|(?:[^_\\]|\\.)+(?=[^_])|[punct*](\_+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/
        // ^- Not allowed for _
      },
      code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
      br: /^( {2,}|\\)\n(?!\s*$)/,
      del: noopTest,
      text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
      punctuation: /^([\spunctuation])/
    };
    inline._punctuation = "!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~";
    inline.punctuation = edit(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();
    inline.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
    inline.escapedEmSt = /(?:^|[^\\])(?:\\\\)*\\[*_]/g;
    inline._comment = edit(block._comment).replace("(?:-->|$)", "-->").getRegex();
    inline.emStrong.lDelim = edit(inline.emStrong.lDelim).replace(/punct/g, inline._punctuation).getRegex();
    inline.emStrong.rDelimAst = edit(inline.emStrong.rDelimAst, "g").replace(/punct/g, inline._punctuation).getRegex();
    inline.emStrong.rDelimUnd = edit(inline.emStrong.rDelimUnd, "g").replace(/punct/g, inline._punctuation).getRegex();
    inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;
    inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
    inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
    inline.autolink = edit(inline.autolink).replace("scheme", inline._scheme).replace("email", inline._email).getRegex();
    inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
    inline.tag = edit(inline.tag).replace("comment", inline._comment).replace("attribute", inline._attribute).getRegex();
    inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
    inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
    inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;
    inline.link = edit(inline.link).replace("label", inline._label).replace("href", inline._href).replace("title", inline._title).getRegex();
    inline.reflink = edit(inline.reflink).replace("label", inline._label).replace("ref", block._label).getRegex();
    inline.nolink = edit(inline.nolink).replace("ref", block._label).getRegex();
    inline.reflinkSearch = edit(inline.reflinkSearch, "g").replace("reflink", inline.reflink).replace("nolink", inline.nolink).getRegex();
    inline.normal = _extends({}, inline);
    inline.pedantic = _extends({}, inline.normal, {
      strong: {
        start: /^__|\*\*/,
        middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        endAst: /\*\*(?!\*)/g,
        endUnd: /__(?!_)/g
      },
      em: {
        start: /^_|\*/,
        middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
        endAst: /\*(?!\*)/g,
        endUnd: /_(?!_)/g
      },
      link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", inline._label).getRegex(),
      reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", inline._label).getRegex()
    });
    inline.gfm = _extends({}, inline.normal, {
      escape: edit(inline.escape).replace("])", "~|])").getRegex(),
      _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
      url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
      _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
      del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
      text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
    });
    inline.gfm.url = edit(inline.gfm.url, "i").replace("email", inline.gfm._extended_email).getRegex();
    inline.breaks = _extends({}, inline.gfm, {
      br: edit(inline.br).replace("{2,}", "*").getRegex(),
      text: edit(inline.gfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
    });
    function smartypants(text) {
      return text.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018").replace(/'/g, "\u2019").replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201C").replace(/"/g, "\u201D").replace(/\.{3}/g, "\u2026");
    }
    function mangle(text) {
      var out = "", i, ch;
      var l = text.length;
      for (i = 0; i < l; i++) {
        ch = text.charCodeAt(i);
        if (Math.random() > 0.5) {
          ch = "x" + ch.toString(16);
        }
        out += "&#" + ch + ";";
      }
      return out;
    }
    var Lexer2 = /* @__PURE__ */ (function() {
      function Lexer3(options2) {
        this.tokens = [];
        this.tokens.links = /* @__PURE__ */ Object.create(null);
        this.options = options2 || exports2.defaults;
        this.options.tokenizer = this.options.tokenizer || new Tokenizer();
        this.tokenizer = this.options.tokenizer;
        this.tokenizer.options = this.options;
        this.tokenizer.lexer = this;
        this.inlineQueue = [];
        this.state = {
          inLink: false,
          inRawBlock: false,
          top: true
        };
        var rules = {
          block: block.normal,
          inline: inline.normal
        };
        if (this.options.pedantic) {
          rules.block = block.pedantic;
          rules.inline = inline.pedantic;
        } else if (this.options.gfm) {
          rules.block = block.gfm;
          if (this.options.breaks) {
            rules.inline = inline.breaks;
          } else {
            rules.inline = inline.gfm;
          }
        }
        this.tokenizer.rules = rules;
      }
      Lexer3.lex = function lex(src, options2) {
        var lexer2 = new Lexer3(options2);
        return lexer2.lex(src);
      };
      Lexer3.lexInline = function lexInline(src, options2) {
        var lexer2 = new Lexer3(options2);
        return lexer2.inlineTokens(src);
      };
      var _proto = Lexer3.prototype;
      _proto.lex = function lex(src) {
        src = src.replace(/\r\n|\r/g, "\n");
        this.blockTokens(src, this.tokens);
        var next;
        while (next = this.inlineQueue.shift()) {
          this.inlineTokens(next.src, next.tokens);
        }
        return this.tokens;
      };
      _proto.blockTokens = function blockTokens(src, tokens) {
        var _this = this;
        if (tokens === void 0) {
          tokens = [];
        }
        if (this.options.pedantic) {
          src = src.replace(/\t/g, "    ").replace(/^ +$/gm, "");
        } else {
          src = src.replace(/^( *)(\t+)/gm, function(_, leading, tabs) {
            return leading + "    ".repeat(tabs.length);
          });
        }
        var token, lastToken, cutSrc, lastParagraphClipped;
        while (src) {
          if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some(function(extTokenizer) {
            if (token = extTokenizer.call({
              lexer: _this
            }, src, tokens)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              return true;
            }
            return false;
          })) {
            continue;
          }
          if (token = this.tokenizer.space(src)) {
            src = src.substring(token.raw.length);
            if (token.raw.length === 1 && tokens.length > 0) {
              tokens[tokens.length - 1].raw += "\n";
            } else {
              tokens.push(token);
            }
            continue;
          }
          if (token = this.tokenizer.code(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
              lastToken.raw += "\n" + token.raw;
              lastToken.text += "\n" + token.text;
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            continue;
          }
          if (token = this.tokenizer.fences(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.heading(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.hr(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.blockquote(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.list(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.html(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.def(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
              lastToken.raw += "\n" + token.raw;
              lastToken.text += "\n" + token.raw;
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else if (!this.tokens.links[token.tag]) {
              this.tokens.links[token.tag] = {
                href: token.href,
                title: token.title
              };
            }
            continue;
          }
          if (token = this.tokenizer.table(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.lheading(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          cutSrc = src;
          if (this.options.extensions && this.options.extensions.startBlock) {
            (function() {
              var startIndex = Infinity;
              var tempSrc = src.slice(1);
              var tempStart = void 0;
              _this.options.extensions.startBlock.forEach(function(getStartIndex) {
                tempStart = getStartIndex.call({
                  lexer: this
                }, tempSrc);
                if (typeof tempStart === "number" && tempStart >= 0) {
                  startIndex = Math.min(startIndex, tempStart);
                }
              });
              if (startIndex < Infinity && startIndex >= 0) {
                cutSrc = src.substring(0, startIndex + 1);
              }
            })();
          }
          if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
            lastToken = tokens[tokens.length - 1];
            if (lastParagraphClipped && lastToken.type === "paragraph") {
              lastToken.raw += "\n" + token.raw;
              lastToken.text += "\n" + token.text;
              this.inlineQueue.pop();
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            lastParagraphClipped = cutSrc.length !== src.length;
            src = src.substring(token.raw.length);
            continue;
          }
          if (token = this.tokenizer.text(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === "text") {
              lastToken.raw += "\n" + token.raw;
              lastToken.text += "\n" + token.text;
              this.inlineQueue.pop();
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            continue;
          }
          if (src) {
            var errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }
        this.state.top = true;
        return tokens;
      };
      _proto.inline = function inline2(src, tokens) {
        if (tokens === void 0) {
          tokens = [];
        }
        this.inlineQueue.push({
          src,
          tokens
        });
        return tokens;
      };
      _proto.inlineTokens = function inlineTokens(src, tokens) {
        var _this2 = this;
        if (tokens === void 0) {
          tokens = [];
        }
        var token, lastToken, cutSrc;
        var maskedSrc = src;
        var match;
        var keepPrevChar, prevChar;
        if (this.tokens.links) {
          var links = Object.keys(this.tokens.links);
          if (links.length > 0) {
            while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
              if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
                maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
              }
            }
          }
        }
        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
        }
        while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index + match[0].length - 2) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
          this.tokenizer.rules.inline.escapedEmSt.lastIndex--;
        }
        while (src) {
          if (!keepPrevChar) {
            prevChar = "";
          }
          keepPrevChar = false;
          if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some(function(extTokenizer) {
            if (token = extTokenizer.call({
              lexer: _this2
            }, src, tokens)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              return true;
            }
            return false;
          })) {
            continue;
          }
          if (token = this.tokenizer.escape(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.tag(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token.type === "text" && lastToken.type === "text") {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }
          if (token = this.tokenizer.link(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.reflink(src, this.tokens.links)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token.type === "text" && lastToken.type === "text") {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }
          if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.codespan(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.br(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.del(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (token = this.tokenizer.autolink(src, mangle)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
          cutSrc = src;
          if (this.options.extensions && this.options.extensions.startInline) {
            (function() {
              var startIndex = Infinity;
              var tempSrc = src.slice(1);
              var tempStart = void 0;
              _this2.options.extensions.startInline.forEach(function(getStartIndex) {
                tempStart = getStartIndex.call({
                  lexer: this
                }, tempSrc);
                if (typeof tempStart === "number" && tempStart >= 0) {
                  startIndex = Math.min(startIndex, tempStart);
                }
              });
              if (startIndex < Infinity && startIndex >= 0) {
                cutSrc = src.substring(0, startIndex + 1);
              }
            })();
          }
          if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
            src = src.substring(token.raw.length);
            if (token.raw.slice(-1) !== "_") {
              prevChar = token.raw.slice(-1);
            }
            keepPrevChar = true;
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === "text") {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }
          if (src) {
            var errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }
        return tokens;
      };
      _createClass(Lexer3, null, [{
        key: "rules",
        get: function get() {
          return {
            block,
            inline
          };
        }
      }]);
      return Lexer3;
    })();
    var Renderer = /* @__PURE__ */ (function() {
      function Renderer2(options2) {
        this.options = options2 || exports2.defaults;
      }
      var _proto = Renderer2.prototype;
      _proto.code = function code(_code, infostring, escaped) {
        var lang = (infostring || "").match(/\S*/)[0];
        if (this.options.highlight) {
          var out = this.options.highlight(_code, lang);
          if (out != null && out !== _code) {
            escaped = true;
            _code = out;
          }
        }
        _code = _code.replace(/\n$/, "") + "\n";
        if (!lang) {
          return "<pre><code>" + (escaped ? _code : escape(_code, true)) + "</code></pre>\n";
        }
        return '<pre><code class="' + this.options.langPrefix + escape(lang) + '">' + (escaped ? _code : escape(_code, true)) + "</code></pre>\n";
      };
      _proto.blockquote = function blockquote(quote) {
        return "<blockquote>\n" + quote + "</blockquote>\n";
      };
      _proto.html = function html(_html) {
        return _html;
      };
      _proto.heading = function heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
          var id = this.options.headerPrefix + slugger.slug(raw);
          return "<h" + level + ' id="' + id + '">' + text + "</h" + level + ">\n";
        }
        return "<h" + level + ">" + text + "</h" + level + ">\n";
      };
      _proto.hr = function hr() {
        return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
      };
      _proto.list = function list(body, ordered, start) {
        var type = ordered ? "ol" : "ul", startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
        return "<" + type + startatt + ">\n" + body + "</" + type + ">\n";
      };
      _proto.listitem = function listitem(text) {
        return "<li>" + text + "</li>\n";
      };
      _proto.checkbox = function checkbox(checked) {
        return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox"' + (this.options.xhtml ? " /" : "") + "> ";
      };
      _proto.paragraph = function paragraph(text) {
        return "<p>" + text + "</p>\n";
      };
      _proto.table = function table(header, body) {
        if (body) body = "<tbody>" + body + "</tbody>";
        return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
      };
      _proto.tablerow = function tablerow(content) {
        return "<tr>\n" + content + "</tr>\n";
      };
      _proto.tablecell = function tablecell(content, flags) {
        var type = flags.header ? "th" : "td";
        var tag = flags.align ? "<" + type + ' align="' + flags.align + '">' : "<" + type + ">";
        return tag + content + ("</" + type + ">\n");
      };
      _proto.strong = function strong(text) {
        return "<strong>" + text + "</strong>";
      };
      _proto.em = function em(text) {
        return "<em>" + text + "</em>";
      };
      _proto.codespan = function codespan(text) {
        return "<code>" + text + "</code>";
      };
      _proto.br = function br() {
        return this.options.xhtml ? "<br/>" : "<br>";
      };
      _proto.del = function del(text) {
        return "<del>" + text + "</del>";
      };
      _proto.link = function link(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        var out = '<a href="' + href + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += ">" + text + "</a>";
        return out;
      };
      _proto.image = function image(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        var out = '<img src="' + href + '" alt="' + text + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += this.options.xhtml ? "/>" : ">";
        return out;
      };
      _proto.text = function text(_text) {
        return _text;
      };
      return Renderer2;
    })();
    var TextRenderer = /* @__PURE__ */ (function() {
      function TextRenderer2() {
      }
      var _proto = TextRenderer2.prototype;
      _proto.strong = function strong(text) {
        return text;
      };
      _proto.em = function em(text) {
        return text;
      };
      _proto.codespan = function codespan(text) {
        return text;
      };
      _proto.del = function del(text) {
        return text;
      };
      _proto.html = function html(text) {
        return text;
      };
      _proto.text = function text(_text) {
        return _text;
      };
      _proto.link = function link(href, title, text) {
        return "" + text;
      };
      _proto.image = function image(href, title, text) {
        return "" + text;
      };
      _proto.br = function br() {
        return "";
      };
      return TextRenderer2;
    })();
    var Slugger = /* @__PURE__ */ (function() {
      function Slugger2() {
        this.seen = {};
      }
      var _proto = Slugger2.prototype;
      _proto.serialize = function serialize(value) {
        return value.toLowerCase().trim().replace(/<[!\/a-z].*?>/ig, "").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "").replace(/\s/g, "-");
      };
      _proto.getNextSafeSlug = function getNextSafeSlug(originalSlug, isDryRun) {
        var slug = originalSlug;
        var occurenceAccumulator = 0;
        if (this.seen.hasOwnProperty(slug)) {
          occurenceAccumulator = this.seen[originalSlug];
          do {
            occurenceAccumulator++;
            slug = originalSlug + "-" + occurenceAccumulator;
          } while (this.seen.hasOwnProperty(slug));
        }
        if (!isDryRun) {
          this.seen[originalSlug] = occurenceAccumulator;
          this.seen[slug] = 0;
        }
        return slug;
      };
      _proto.slug = function slug(value, options2) {
        if (options2 === void 0) {
          options2 = {};
        }
        var slug2 = this.serialize(value);
        return this.getNextSafeSlug(slug2, options2.dryrun);
      };
      return Slugger2;
    })();
    var Parser = /* @__PURE__ */ (function() {
      function Parser2(options2) {
        this.options = options2 || exports2.defaults;
        this.options.renderer = this.options.renderer || new Renderer();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.textRenderer = new TextRenderer();
        this.slugger = new Slugger();
      }
      Parser2.parse = function parse2(tokens, options2) {
        var parser2 = new Parser2(options2);
        return parser2.parse(tokens);
      };
      Parser2.parseInline = function parseInline2(tokens, options2) {
        var parser2 = new Parser2(options2);
        return parser2.parseInline(tokens);
      };
      var _proto = Parser2.prototype;
      _proto.parse = function parse2(tokens, top) {
        if (top === void 0) {
          top = true;
        }
        var out = "", i, j, k, l2, l3, row, cell, header, body, token, ordered, start, loose, itemBody, item, checked, task, checkbox, ret;
        var l = tokens.length;
        for (i = 0; i < l; i++) {
          token = tokens[i];
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
            ret = this.options.extensions.renderers[token.type].call({
              parser: this
            }, token);
            if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(token.type)) {
              out += ret || "";
              continue;
            }
          }
          switch (token.type) {
            case "space": {
              continue;
            }
            case "hr": {
              out += this.renderer.hr();
              continue;
            }
            case "heading": {
              out += this.renderer.heading(this.parseInline(token.tokens), token.depth, unescape(this.parseInline(token.tokens, this.textRenderer)), this.slugger);
              continue;
            }
            case "code": {
              out += this.renderer.code(token.text, token.lang, token.escaped);
              continue;
            }
            case "table": {
              header = "";
              cell = "";
              l2 = token.header.length;
              for (j = 0; j < l2; j++) {
                cell += this.renderer.tablecell(this.parseInline(token.header[j].tokens), {
                  header: true,
                  align: token.align[j]
                });
              }
              header += this.renderer.tablerow(cell);
              body = "";
              l2 = token.rows.length;
              for (j = 0; j < l2; j++) {
                row = token.rows[j];
                cell = "";
                l3 = row.length;
                for (k = 0; k < l3; k++) {
                  cell += this.renderer.tablecell(this.parseInline(row[k].tokens), {
                    header: false,
                    align: token.align[k]
                  });
                }
                body += this.renderer.tablerow(cell);
              }
              out += this.renderer.table(header, body);
              continue;
            }
            case "blockquote": {
              body = this.parse(token.tokens);
              out += this.renderer.blockquote(body);
              continue;
            }
            case "list": {
              ordered = token.ordered;
              start = token.start;
              loose = token.loose;
              l2 = token.items.length;
              body = "";
              for (j = 0; j < l2; j++) {
                item = token.items[j];
                checked = item.checked;
                task = item.task;
                itemBody = "";
                if (item.task) {
                  checkbox = this.renderer.checkbox(checked);
                  if (loose) {
                    if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
                      item.tokens[0].text = checkbox + " " + item.tokens[0].text;
                      if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
                        item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
                      }
                    } else {
                      item.tokens.unshift({
                        type: "text",
                        text: checkbox
                      });
                    }
                  } else {
                    itemBody += checkbox;
                  }
                }
                itemBody += this.parse(item.tokens, loose);
                body += this.renderer.listitem(itemBody, task, checked);
              }
              out += this.renderer.list(body, ordered, start);
              continue;
            }
            case "html": {
              out += this.renderer.html(token.text);
              continue;
            }
            case "paragraph": {
              out += this.renderer.paragraph(this.parseInline(token.tokens));
              continue;
            }
            case "text": {
              body = token.tokens ? this.parseInline(token.tokens) : token.text;
              while (i + 1 < l && tokens[i + 1].type === "text") {
                token = tokens[++i];
                body += "\n" + (token.tokens ? this.parseInline(token.tokens) : token.text);
              }
              out += top ? this.renderer.paragraph(body) : body;
              continue;
            }
            default: {
              var errMsg = 'Token with "' + token.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }
        return out;
      };
      _proto.parseInline = function parseInline2(tokens, renderer) {
        renderer = renderer || this.renderer;
        var out = "", i, token, ret;
        var l = tokens.length;
        for (i = 0; i < l; i++) {
          token = tokens[i];
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
            ret = this.options.extensions.renderers[token.type].call({
              parser: this
            }, token);
            if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(token.type)) {
              out += ret || "";
              continue;
            }
          }
          switch (token.type) {
            case "escape": {
              out += renderer.text(token.text);
              break;
            }
            case "html": {
              out += renderer.html(token.text);
              break;
            }
            case "link": {
              out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
              break;
            }
            case "image": {
              out += renderer.image(token.href, token.title, token.text);
              break;
            }
            case "strong": {
              out += renderer.strong(this.parseInline(token.tokens, renderer));
              break;
            }
            case "em": {
              out += renderer.em(this.parseInline(token.tokens, renderer));
              break;
            }
            case "codespan": {
              out += renderer.codespan(token.text);
              break;
            }
            case "br": {
              out += renderer.br();
              break;
            }
            case "del": {
              out += renderer.del(this.parseInline(token.tokens, renderer));
              break;
            }
            case "text": {
              out += renderer.text(token.text);
              break;
            }
            default: {
              var errMsg = 'Token with "' + token.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }
        return out;
      };
      return Parser2;
    })();
    var Hooks = /* @__PURE__ */ (function() {
      function Hooks2(options2) {
        this.options = options2 || exports2.defaults;
      }
      var _proto = Hooks2.prototype;
      _proto.preprocess = function preprocess(markdown) {
        return markdown;
      };
      _proto.postprocess = function postprocess(html) {
        return html;
      };
      return Hooks2;
    })();
    Hooks.passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess"]);
    function onError(silent, async, callback) {
      return function(e) {
        e.message += "\nPlease report this to https://github.com/markedjs/marked.";
        if (silent) {
          var msg = "<p>An error occurred:</p><pre>" + escape(e.message + "", true) + "</pre>";
          if (async) {
            return Promise.resolve(msg);
          }
          if (callback) {
            callback(null, msg);
            return;
          }
          return msg;
        }
        if (async) {
          return Promise.reject(e);
        }
        if (callback) {
          callback(e);
          return;
        }
        throw e;
      };
    }
    function parseMarkdown(lexer2, parser2) {
      return function(src, opt, callback) {
        if (typeof opt === "function") {
          callback = opt;
          opt = null;
        }
        var origOpt = _extends({}, opt);
        opt = _extends({}, marked.defaults, origOpt);
        var throwError = onError(opt.silent, opt.async, callback);
        if (typeof src === "undefined" || src === null) {
          return throwError(new Error("marked(): input parameter is undefined or null"));
        }
        if (typeof src !== "string") {
          return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
        }
        checkSanitizeDeprecation(opt);
        if (opt.hooks) {
          opt.hooks.options = opt;
        }
        if (callback) {
          var highlight = opt.highlight;
          var tokens;
          try {
            if (opt.hooks) {
              src = opt.hooks.preprocess(src);
            }
            tokens = lexer2(src, opt);
          } catch (e) {
            return throwError(e);
          }
          var done = function done2(err) {
            var out;
            if (!err) {
              try {
                if (opt.walkTokens) {
                  marked.walkTokens(tokens, opt.walkTokens);
                }
                out = parser2(tokens, opt);
                if (opt.hooks) {
                  out = opt.hooks.postprocess(out);
                }
              } catch (e) {
                err = e;
              }
            }
            opt.highlight = highlight;
            return err ? throwError(err) : callback(null, out);
          };
          if (!highlight || highlight.length < 3) {
            return done();
          }
          delete opt.highlight;
          if (!tokens.length) return done();
          var pending = 0;
          marked.walkTokens(tokens, function(token) {
            if (token.type === "code") {
              pending++;
              setTimeout(function() {
                highlight(token.text, token.lang, function(err, code) {
                  if (err) {
                    return done(err);
                  }
                  if (code != null && code !== token.text) {
                    token.text = code;
                    token.escaped = true;
                  }
                  pending--;
                  if (pending === 0) {
                    done();
                  }
                });
              }, 0);
            }
          });
          if (pending === 0) {
            done();
          }
          return;
        }
        if (opt.async) {
          return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then(function(src2) {
            return lexer2(src2, opt);
          }).then(function(tokens2) {
            return opt.walkTokens ? Promise.all(marked.walkTokens(tokens2, opt.walkTokens)).then(function() {
              return tokens2;
            }) : tokens2;
          }).then(function(tokens2) {
            return parser2(tokens2, opt);
          }).then(function(html2) {
            return opt.hooks ? opt.hooks.postprocess(html2) : html2;
          })["catch"](throwError);
        }
        try {
          if (opt.hooks) {
            src = opt.hooks.preprocess(src);
          }
          var _tokens = lexer2(src, opt);
          if (opt.walkTokens) {
            marked.walkTokens(_tokens, opt.walkTokens);
          }
          var html = parser2(_tokens, opt);
          if (opt.hooks) {
            html = opt.hooks.postprocess(html);
          }
          return html;
        } catch (e) {
          return throwError(e);
        }
      };
    }
    function marked(src, opt, callback) {
      return parseMarkdown(Lexer2.lex, Parser.parse)(src, opt, callback);
    }
    marked.options = marked.setOptions = function(opt) {
      marked.defaults = _extends({}, marked.defaults, opt);
      changeDefaults(marked.defaults);
      return marked;
    };
    marked.getDefaults = getDefaults;
    marked.defaults = exports2.defaults;
    marked.use = function() {
      var extensions = marked.defaults.extensions || {
        renderers: {},
        childTokens: {}
      };
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      args.forEach(function(pack) {
        var opts = _extends({}, pack);
        opts.async = marked.defaults.async || opts.async || false;
        if (pack.extensions) {
          pack.extensions.forEach(function(ext) {
            if (!ext.name) {
              throw new Error("extension name required");
            }
            if (ext.renderer) {
              var prevRenderer = extensions.renderers[ext.name];
              if (prevRenderer) {
                extensions.renderers[ext.name] = function() {
                  for (var _len2 = arguments.length, args2 = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args2[_key2] = arguments[_key2];
                  }
                  var ret = ext.renderer.apply(this, args2);
                  if (ret === false) {
                    ret = prevRenderer.apply(this, args2);
                  }
                  return ret;
                };
              } else {
                extensions.renderers[ext.name] = ext.renderer;
              }
            }
            if (ext.tokenizer) {
              if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
                throw new Error("extension level must be 'block' or 'inline'");
              }
              if (extensions[ext.level]) {
                extensions[ext.level].unshift(ext.tokenizer);
              } else {
                extensions[ext.level] = [ext.tokenizer];
              }
              if (ext.start) {
                if (ext.level === "block") {
                  if (extensions.startBlock) {
                    extensions.startBlock.push(ext.start);
                  } else {
                    extensions.startBlock = [ext.start];
                  }
                } else if (ext.level === "inline") {
                  if (extensions.startInline) {
                    extensions.startInline.push(ext.start);
                  } else {
                    extensions.startInline = [ext.start];
                  }
                }
              }
            }
            if (ext.childTokens) {
              extensions.childTokens[ext.name] = ext.childTokens;
            }
          });
          opts.extensions = extensions;
        }
        if (pack.renderer) {
          (function() {
            var renderer = marked.defaults.renderer || new Renderer();
            var _loop = function _loop2(prop2) {
              var prevRenderer = renderer[prop2];
              renderer[prop2] = function() {
                for (var _len3 = arguments.length, args2 = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                  args2[_key3] = arguments[_key3];
                }
                var ret = pack.renderer[prop2].apply(renderer, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(renderer, args2);
                }
                return ret;
              };
            };
            for (var prop in pack.renderer) {
              _loop(prop);
            }
            opts.renderer = renderer;
          })();
        }
        if (pack.tokenizer) {
          (function() {
            var tokenizer = marked.defaults.tokenizer || new Tokenizer();
            var _loop2 = function _loop22(prop2) {
              var prevTokenizer = tokenizer[prop2];
              tokenizer[prop2] = function() {
                for (var _len4 = arguments.length, args2 = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                  args2[_key4] = arguments[_key4];
                }
                var ret = pack.tokenizer[prop2].apply(tokenizer, args2);
                if (ret === false) {
                  ret = prevTokenizer.apply(tokenizer, args2);
                }
                return ret;
              };
            };
            for (var prop in pack.tokenizer) {
              _loop2(prop);
            }
            opts.tokenizer = tokenizer;
          })();
        }
        if (pack.hooks) {
          (function() {
            var hooks = marked.defaults.hooks || new Hooks();
            var _loop3 = function _loop32(prop2) {
              var prevHook = hooks[prop2];
              if (Hooks.passThroughHooks.has(prop2)) {
                hooks[prop2] = function(arg) {
                  if (marked.defaults.async) {
                    return Promise.resolve(pack.hooks[prop2].call(hooks, arg)).then(function(ret2) {
                      return prevHook.call(hooks, ret2);
                    });
                  }
                  var ret = pack.hooks[prop2].call(hooks, arg);
                  return prevHook.call(hooks, ret);
                };
              } else {
                hooks[prop2] = function() {
                  for (var _len5 = arguments.length, args2 = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                    args2[_key5] = arguments[_key5];
                  }
                  var ret = pack.hooks[prop2].apply(hooks, args2);
                  if (ret === false) {
                    ret = prevHook.apply(hooks, args2);
                  }
                  return ret;
                };
              }
            };
            for (var prop in pack.hooks) {
              _loop3(prop);
            }
            opts.hooks = hooks;
          })();
        }
        if (pack.walkTokens) {
          var _walkTokens = marked.defaults.walkTokens;
          opts.walkTokens = function(token) {
            var values = [];
            values.push(pack.walkTokens.call(this, token));
            if (_walkTokens) {
              values = values.concat(_walkTokens.call(this, token));
            }
            return values;
          };
        }
        marked.setOptions(opts);
      });
    };
    marked.walkTokens = function(tokens, callback) {
      var values = [];
      var _loop4 = function _loop42() {
        var token = _step.value;
        values = values.concat(callback.call(marked, token));
        switch (token.type) {
          case "table": {
            for (var _iterator2 = _createForOfIteratorHelperLoose(token.header), _step2; !(_step2 = _iterator2()).done; ) {
              var cell = _step2.value;
              values = values.concat(marked.walkTokens(cell.tokens, callback));
            }
            for (var _iterator3 = _createForOfIteratorHelperLoose(token.rows), _step3; !(_step3 = _iterator3()).done; ) {
              var row = _step3.value;
              for (var _iterator4 = _createForOfIteratorHelperLoose(row), _step4; !(_step4 = _iterator4()).done; ) {
                var _cell = _step4.value;
                values = values.concat(marked.walkTokens(_cell.tokens, callback));
              }
            }
            break;
          }
          case "list": {
            values = values.concat(marked.walkTokens(token.items, callback));
            break;
          }
          default: {
            if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token.type]) {
              marked.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
                values = values.concat(marked.walkTokens(token[childTokens], callback));
              });
            } else if (token.tokens) {
              values = values.concat(marked.walkTokens(token.tokens, callback));
            }
          }
        }
      };
      for (var _iterator = _createForOfIteratorHelperLoose(tokens), _step; !(_step = _iterator()).done; ) {
        _loop4();
      }
      return values;
    };
    marked.parseInline = parseMarkdown(Lexer2.lexInline, Parser.parseInline);
    marked.Parser = Parser;
    marked.parser = Parser.parse;
    marked.Renderer = Renderer;
    marked.TextRenderer = TextRenderer;
    marked.Lexer = Lexer2;
    marked.lexer = Lexer2.lex;
    marked.Tokenizer = Tokenizer;
    marked.Slugger = Slugger;
    marked.Hooks = Hooks;
    marked.parse = marked;
    var options = marked.options;
    var setOptions = marked.setOptions;
    var use = marked.use;
    var walkTokens = marked.walkTokens;
    var parseInline = marked.parseInline;
    var parse = marked;
    var parser = Parser.parse;
    var lexer = Lexer2.lex;
    exports2.Hooks = Hooks;
    exports2.Lexer = Lexer2;
    exports2.Parser = Parser;
    exports2.Renderer = Renderer;
    exports2.Slugger = Slugger;
    exports2.TextRenderer = TextRenderer;
    exports2.Tokenizer = Tokenizer;
    exports2.getDefaults = getDefaults;
    exports2.lexer = lexer;
    exports2.marked = marked;
    exports2.options = options;
    exports2.parse = parse;
    exports2.parseInline = parseInline;
    exports2.parser = parser;
    exports2.setOptions = setOptions;
    exports2.use = use;
    exports2.walkTokens = walkTokens;
  }
});

// lib/text-input-validation.js
var require_text_input_validation = __commonJS({
  "lib/text-input-validation.js"(exports2, module2) {
    function levenshteinDistance(str1, str2) {
      const len1 = str1.length;
      const len2 = str2.length;
      const matrix = [];
      for (let i = 0; i <= len1; i++) matrix[i] = [i];
      for (let j = 0; j <= len2; j++) matrix[0][j] = j;
      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          if (str1[i - 1] === str2[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + 1
            );
          }
        }
      }
      return matrix[len1][len2];
    }
    function calculateSimilarity(str1, str2) {
      const maxLen = Math.max(str1.length, str2.length);
      if (maxLen === 0) return 1;
      const distance = levenshteinDistance(str1, str2);
      return 1 - distance / maxLen;
    }
    function stripAllWhitespace(s) {
      return String(s).replace(/\s/g, "");
    }
    function validateTextInputString(userAnswer, correctAnswer, options = {}) {
      const caseSensitive = options.caseSensitive === true;
      const fuzzy = options.fuzzy;
      const ignoreWhitespace = options.ignoreWhitespace === true;
      let user = String(userAnswer).trim();
      let correct = String(correctAnswer).trim();
      if (!caseSensitive) {
        user = user.toLowerCase();
        correct = correct.toLowerCase();
      }
      if (ignoreWhitespace) {
        user = stripAllWhitespace(user);
        correct = stripAllWhitespace(correct);
      }
      if (fuzzy !== false && fuzzy !== void 0) {
        let threshold = fuzzy === true ? 0.8 : parseFloat(fuzzy);
        if (isNaN(threshold) || threshold < 0 || threshold > 1) {
          threshold = 0.8;
        }
        const normalizedUser = user.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
        const normalizedCorrect = correct.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
        if (normalizedUser === normalizedCorrect) {
          return true;
        }
        const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
        return similarity >= threshold;
      }
      return user === correct;
    }
    function validateTextInputNumeric(userAnswer, correctAnswer, options = {}) {
      const threshold = options.threshold !== void 0 ? options.threshold : 0.01;
      const precision = options.precision !== void 0 ? options.precision : 2;
      const user = parseFloat(userAnswer);
      const correct = parseFloat(correctAnswer);
      if (isNaN(user) || isNaN(correct)) return false;
      const userRounded = Math.round(user * Math.pow(10, precision)) / Math.pow(10, precision);
      const correctRounded = Math.round(correct * Math.pow(10, precision)) / Math.pow(10, precision);
      return Math.abs(userRounded - correctRounded) <= threshold;
    }
    function validateTextInputNumericWithUnits(userAnswer, correctAnswer, options = {}) {
      const threshold = options.threshold !== void 0 ? options.threshold : 0.01;
      const units = options.units || [];
      const escapedUnits = units.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const unitsPattern = escapedUnits.length > 0 ? escapedUnits.join("|") : "";
      let userStr = String(userAnswer).trim();
      if (unitsPattern) {
        const unitRegex = new RegExp(`^\\s*(${unitsPattern})\\s*|\\s*(${unitsPattern})\\s*$`, "gi");
        userStr = userStr.replace(unitRegex, "").trim();
      }
      let correctStr = String(correctAnswer).trim();
      if (unitsPattern) {
        const unitRegex = new RegExp(`^\\s*(${unitsPattern})\\s*|\\s*(${unitsPattern})\\s*$`, "gi");
        correctStr = correctStr.replace(unitRegex, "").trim();
      }
      userStr = userStr.replace(",", ".");
      correctStr = correctStr.replace(",", ".");
      const userValue = parseFloat(userStr);
      const correctValue = parseFloat(correctStr);
      if (isNaN(userValue) || isNaN(correctValue)) return false;
      return Math.abs(userValue - correctValue) <= threshold;
    }
    function validateTextInputNumericWithCurrency(userAnswer, correctAnswer, options = {}) {
      const threshold = options.threshold !== void 0 ? options.threshold : 0.01;
      const currency = options.currency !== void 0 ? options.currency : "$";
      const escapedCurrency = currency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let userStr = String(userAnswer).trim();
      userStr = userStr.replace(new RegExp(`^\\s*${escapedCurrency}\\s*|\\s*${escapedCurrency}\\s*$`, "g"), "").trim();
      let correctStr = String(correctAnswer).trim();
      correctStr = correctStr.replace(new RegExp(`^\\s*${escapedCurrency}\\s*|\\s*${escapedCurrency}\\s*$`, "g"), "").trim();
      userStr = userStr.replace(",", ".");
      correctStr = correctStr.replace(",", ".");
      const userValue = parseFloat(userStr);
      const correctValue = parseFloat(correctStr);
      if (isNaN(userValue) || isNaN(correctValue)) return false;
      return Math.abs(userValue - correctValue) <= threshold;
    }
    function parseOptionsText(optionsText) {
      const options = {};
      if (!optionsText) return options;
      const optionPairs = optionsText.split(",");
      optionPairs.forEach((pair) => {
        const [key, value] = pair.split("=").map((s) => s.trim());
        if (key && value !== void 0) {
          if (value === "true") {
            options[key] = true;
          } else if (value === "false") {
            options[key] = false;
          } else if (!isNaN(value)) {
            options[key] = parseFloat(value);
          } else {
            options[key] = value;
          }
        }
      });
      return options;
    }
    function parseValidationOptions(answerText) {
      const trimmedAnswer = String(answerText || "").trim();
      const startsWithKind = trimmedAnswer.startsWith("[kind:");
      let validationMatch;
      if (startsWithKind) {
        validationMatch = trimmedAnswer.match(/^\[kind:\s*([^\]]+)\](?:\s+\[options:\s*([^\]]+)\])?$/);
        if (validationMatch) {
          const kind2 = validationMatch[1] ? validationMatch[1].trim() : "string";
          const optionsText2 = validationMatch[2] ? validationMatch[2].trim() : "";
          const options2 = parseOptionsText(optionsText2);
          if (kind2 === "numeric-with-units" && typeof options2.units === "string") {
            options2.units = options2.units.split(",").map((u) => u.trim()).filter(Boolean);
          }
          return {
            correctAnswer: "",
            validation: { kind: kind2, options: options2 }
          };
        }
      } else {
        validationMatch = trimmedAnswer.match(/^(.+?)(?:\s+\[kind:\s*([^\]]+)\])?(?:\s+\[options:\s*([^\]]+)\])?$/);
      }
      if (!validationMatch) {
        return { correctAnswer: trimmedAnswer, validation: {} };
      }
      const correctAnswer = validationMatch[1].trim();
      const kind = validationMatch[2] ? validationMatch[2].trim() : "string";
      const optionsText = validationMatch[3] ? validationMatch[3].trim() : "";
      const options = parseOptionsText(optionsText);
      if (kind === "numeric-with-units" && typeof options.units === "string") {
        options.units = options.units.split(",").map((u) => u.trim()).filter(Boolean);
      }
      return {
        correctAnswer,
        validation: { kind, options }
      };
    }
    function parseTextInputAnswerItems(answerItems) {
      const parsedAnswers = (answerItems || []).map((item) => parseValidationOptions(item)).filter((entry) => {
        const hasAnswerText = String(entry.correctAnswer || "").trim().length > 0;
        const isValidateLater = entry.validation && entry.validation.kind === "validate-later";
        return hasAnswerText || isValidateLater;
      });
      if (parsedAnswers.length === 0) {
        return { correctAnswers: [], correctAnswer: "", validation: {} };
      }
      return {
        correctAnswers: parsedAnswers.map((entry) => ({
          correctAnswer: entry.correctAnswer,
          validation: entry.validation || {}
        })),
        correctAnswer: parsedAnswers[0].correctAnswer,
        validation: parsedAnswers[0].validation || {}
      };
    }
    function getTextInputValidationCandidates(question) {
      const candidates = Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0 ? question.correctAnswers : [{ correctAnswer: question.correctAnswer, validation: question.validation || {} }];
      return candidates.map((candidate) => {
        if (typeof candidate === "string") {
          return { correctAnswer: candidate, validation: question.validation || {} };
        }
        return {
          correctAnswer: candidate.correctAnswer || "",
          validation: candidate.validation || question.validation || {}
        };
      }).filter((candidate) => {
        const kind = candidate.validation && candidate.validation.kind;
        if (kind === "validate-later") return true;
        return String(candidate.correctAnswer || "").trim().length > 0;
      });
    }
    function validateTextInputAnswer(question, userAnswer) {
      const candidates = getTextInputValidationCandidates(question);
      const scorableCandidates = candidates.filter((c) => (c.validation?.kind || "") !== "validate-later");
      if (scorableCandidates.length === 0) {
        return userAnswer && userAnswer.trim() ? null : false;
      }
      if (!userAnswer || !userAnswer.trim()) {
        return false;
      }
      return scorableCandidates.some((candidate) => {
        const validation = candidate.validation || {};
        const options = validation.options || {};
        switch (validation.kind) {
          case "string":
            return validateTextInputString(userAnswer, candidate.correctAnswer, options);
          case "numeric":
            return validateTextInputNumeric(userAnswer, candidate.correctAnswer, options);
          case "numeric-with-units":
            return validateTextInputNumericWithUnits(userAnswer, candidate.correctAnswer, options);
          case "numeric-with-currency":
            return validateTextInputNumericWithCurrency(userAnswer, candidate.correctAnswer, options);
          default:
            return validateTextInputString(userAnswer, candidate.correctAnswer, { caseSensitive: false });
        }
      });
    }
    module2.exports = {
      levenshteinDistance,
      calculateSimilarity,
      stripAllWhitespace,
      validateTextInputString,
      validateTextInputNumeric,
      validateTextInputNumericWithUnits,
      validateTextInputNumericWithCurrency,
      parseValidationOptions,
      parseTextInputAnswerItems,
      getTextInputValidationCandidates,
      validateTextInputAnswer
    };
  }
});

// lib/text-input-answers.js
var require_text_input_answers = __commonJS({
  "lib/text-input-answers.js"(exports2, module2) {
    var RESPONSE_HEADER_REGEX = /^(\d+)\.\s*\*\*[^*\n]+\*\*[ \t]*\r?\n[ \t]*- Selected Answer:[ \t]?/gm;
    var CORRECT_ANSWER_LINE_REGEX = /\r?\n[ \t]*- Correct Answer:/g;
    function lastMatchIndex(regex, text) {
      let index = -1;
      const pattern = new RegExp(regex.source, "g");
      let match;
      while ((match = pattern.exec(text)) !== null) {
        index = match.index;
      }
      return index;
    }
    function parseTextInputAnswers(responsesText) {
      const headers = [...String(responsesText || "").matchAll(new RegExp(RESPONSE_HEADER_REGEX.source, "gm"))];
      const answers = {};
      headers.forEach((header, i) => {
        const start = header.index + header[0].length;
        const end = i + 1 < headers.length ? headers[i + 1].index : responsesText.length;
        const block = responsesText.slice(start, end);
        const cut = lastMatchIndex(CORRECT_ANSWER_LINE_REGEX, block);
        const selectedAnswer = (cut >= 0 ? block.slice(0, cut) : block).trim();
        if (selectedAnswer && selectedAnswer !== "No answer selected") {
          answers[parseInt(header[1], 10) - 1] = selectedAnswer;
        }
      });
      return answers;
    }
    module2.exports = { parseTextInputAnswers };
  }
});

// lib/render-markdown.js
var require_render_markdown = __commonJS({
  "lib/render-markdown.js"(exports2, module2) {
    var { marked } = require_marked();
    var MARKDOWN_RENDERER = new marked.Renderer();
    MARKDOWN_RENDERER.table = function renderMarkdownTable(header, body) {
      return `<div class="table-scroll"><table class="table">
<thead>${header}</thead>
<tbody>${body}</tbody>
</table></div>`;
    };
    var MATH_PATTERNS = [
      /(?<!\\)\$\$(?:\\[\s\S]|[^\\])+?\$\$/g,
      /\\\[[\s\S]+?\\\]/g,
      /\\\([\s\S]+?\\\)/g,
      /(?<!\\)\$(?:\\.|[^\\\n$])+?\$/g
    ];
    var MATH_PATTERNS_STICKY = MATH_PATTERNS.map((re) => new RegExp(re.source, "y"));
    function mathRegionLengthAt(text, index) {
      for (const re of MATH_PATTERNS_STICKY) {
        re.lastIndex = index;
        const m = re.exec(text);
        if (m) return m[0].length;
      }
      return 0;
    }
    function escapeMathDollars(markdown) {
      return markdown.replace(/\\\$/g, '<span class="no-math">$</span>');
    }
    function protectMathRegions(markdown) {
      const store = [];
      let text = markdown;
      for (const re of MATH_PATTERNS) {
        text = text.replace(re, (match) => {
          const token = `MATHPROTECT${store.length}ENDMATHPROTECT`;
          store.push(match);
          return token;
        });
      }
      return { text, store };
    }
    function escapeHtml(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function renderMarkdown(markdown) {
      if (!markdown || typeof markdown !== "string") return "";
      const { text, store } = protectMathRegions(markdown);
      let html = marked.parse(escapeMathDollars(text), { renderer: MARKDOWN_RENDERER });
      store.forEach((math, i) => {
        html = html.replace(`MATHPROTECT${i}ENDMATHPROTECT`, () => escapeHtml(math));
      });
      return html;
    }
    module2.exports = { renderMarkdown, mathRegionLengthAt };
  }
});

// lib/sort-item-entry.js
var require_sort_item_entry = __commonJS({
  "lib/sort-item-entry.js"(exports2, module2) {
    var { mathRegionLengthAt } = require_render_markdown();
    function parseSortItemEntry(entry) {
      const s = String(entry);
      let text = "";
      let i = 0;
      let sepFound = false;
      while (i < s.length) {
        const mathLen = mathRegionLengthAt(s, i);
        if (mathLen) {
          text += s.slice(i, i + mathLen);
          i += mathLen;
          continue;
        }
        const ch = s[i];
        if (ch === "\\" && (s[i + 1] === ":" || s[i + 1] === "\\")) {
          text += s[i + 1];
          i += 2;
          continue;
        }
        if (ch === ":") {
          sepFound = true;
          i++;
          break;
        }
        text += ch;
        i++;
      }
      const correct = sepFound ? s.slice(i) : "";
      return { text: text.trim(), correct: correct.trim() };
    }
    module2.exports = { parseSortItemEntry };
  }
});

// lib/parse-question.js
var require_parse_question = __commonJS({
  "lib/parse-question.js"(exports2, module2) {
    var { Lexer: Lexer2 } = require_marked();
    var { parseTextInputAnswerItems } = require_text_input_validation();
    var { parseTextInputAnswers } = require_text_input_answers();
    var { renderMarkdown } = require_render_markdown();
    var { parseSortItemEntry } = require_sort_item_entry();
    function parseSectionsFromTokens2(tokens) {
      const sections = /* @__PURE__ */ new Map();
      let current = null;
      let buffer = [];
      function flush() {
        if (current !== null) sections.set(current, buffer.slice());
        buffer = [];
      }
      for (const token of tokens) {
        if (token.type === "paragraph") {
          const text = (token.text || "").trim();
          const m = text.match(/^__([^_]+)__\s*$/);
          const mWithContent = text.match(/^__([^_]+)__\s*\n([\s\S]*)$/);
          if (m) {
            flush();
            current = m[1].trim();
            continue;
          }
          if (mWithContent) {
            flush();
            current = mWithContent[1].trim();
            const rest = mWithContent[2].trim();
            if (rest) {
              buffer.push({ type: "paragraph", raw: rest, text: rest });
            }
            continue;
          }
        }
        if (current !== null) buffer.push(token);
      }
      flush();
      return sections;
    }
    function extractQuestionTypeFromMarkdown(markdownText) {
      if (!markdownText || typeof markdownText !== "string" || !markdownText.trim()) return null;
      try {
        const tokens = Lexer2.lex(markdownText);
        const sections = parseSectionsFromTokens2(tokens);
        const type = ((sections.get("Type") || []).map((t) => t.raw || t.text).join("\n") || "").trim();
        return type || null;
      } catch (e) {
        return null;
      }
    }
    function parseSideContentFromSectionTokens(sectionTokens) {
      if (!sectionTokens || sectionTokens.length === 0) return null;
      const contentText = sectionTokens.map((t) => t.raw || t.text || "").join("\n").trim();
      if (!contentText) return null;
      const contentWidthMatch = contentText.match(/\[contentWidth:\s*([^\]]+)\]/i);
      const contentWidth = contentWidthMatch ? contentWidthMatch[1].trim() : null;
      const contentWithoutWidth = contentWidthMatch ? contentText.replace(/\s*\[contentWidth:\s*[^\]]+\]\s*/gi, "").trim() : contentText;
      if (/^https?:\/\//i.test(contentWithoutWidth)) {
        const lines = contentWithoutWidth.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const firstLine = lines[0] || "";
        const openInNewTab = /\[openInNewTab\]/i.test(contentWithoutWidth);
        const url = firstLine.replace(/\s+\[openInNewTab\]\s*$/i, "").trim();
        const out2 = { url, openInNewTab: !!openInNewTab };
        if (contentWidth) out2.contentWidth = contentWidth;
        return out2;
      }
      const pathLines = contentWithoutWidth.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const pathFirst = pathLines[0] || "";
      if (pathFirst.startsWith("/")) {
        const openInNewTab = /\[openInNewTab\]/i.test(contentWithoutWidth);
        const url = pathFirst.replace(/\s+\[openInNewTab\]\s*$/i, "").trim();
        const out2 = { url, openInNewTab: !!openInNewTab };
        if (contentWidth) out2.contentWidth = contentWidth;
        return out2;
      }
      const out = { markdown: contentWithoutWidth };
      if (contentWidth) out.contentWidth = contentWidth;
      return out;
    }
    function attachSideContent(activity, sections) {
      const side = parseSideContentFromSectionTokens(sections.get("Content") || []);
      if (side) activity.content = side;
      return activity;
    }
    function parseExplainYourAnswerSection(rawText) {
      const raw = String(rawText || "").trim();
      if (!raw) return { enabled: false, label: null };
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return { enabled: false, label: null };
      const first = lines[0].toLowerCase();
      const enabled = first === "true" || first === "yes" || first === "enabled";
      if (!enabled) return { enabled: false, label: null };
      if (lines.length === 1) return { enabled: true, label: null };
      const label = lines.slice(1).join("\n").trim();
      return { enabled: true, label: label || null };
    }
    function readListItems2(sectionTokens) {
      const items = [];
      for (const t of sectionTokens || []) {
        if (t.type === "list" && Array.isArray(t.items)) {
          for (const li of t.items) {
            const text = (li.text || "").trim();
            if (text) items.push(text);
          }
        } else if (t.type === "paragraph") {
          const lines = (t.raw || t.text || "").split(/\r?\n/);
          for (const line of lines) {
            const m = line.match(/^\s*[-*]\s+(.*)$/);
            if (m) items.push(m[1].trim());
          }
        }
      }
      return items;
    }
    function parseAnswersFromMarkdown2(markdownText) {
      const tokens = Lexer2.lex(markdownText);
      const sections = parseSectionsFromTokens2(tokens);
      const type = ((sections.get("Type") || []).map((t) => t.raw || t.text).join("\n") || "").trim();
      const responsesSection = sections.get("Responses") || [];
      const responsesText = responsesSection.map((t) => t.raw || t.text || "").join("\n");
      const answers = {};
      if (/^multiple choice$/i.test(type)) {
        const explanations = {};
        const questionBlocks = responsesText.split(/(?=\d+\.\s*\*\*[^*]+\*\*)/);
        questionBlocks.forEach((block) => {
          const questionMatch = block.match(/^(\d+)\.\s*\*\*[^*]+\*\*/);
          if (questionMatch) {
            const questionNumber = parseInt(questionMatch[1], 10);
            const explanationMatch = block.match(/Explanation:\s*([^\n]+)/);
            if (explanationMatch) {
              const questionIndex = questionNumber - 1;
              const explanationStr = explanationMatch[1].trim();
              if (explanationStr) {
                explanations[questionIndex] = explanationStr;
              }
            }
          }
        });
        const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
        let match;
        while ((match = responseRegex.exec(responsesText)) !== null) {
          const questionIndex = parseInt(match[1], 10) - 1;
          const selectedAnswerStr = match[2].trim();
          const selectedAnswers = selectedAnswerStr.split(",").map((s) => s.trim()).filter(Boolean);
          if (selectedAnswers.length > 0 && selectedAnswers[0] !== "No answer selected") {
            answers[questionIndex] = selectedAnswers;
          }
        }
        return { answers, type, explanations };
      } else if (/^fill in the blanks$/i.test(type)) {
        const responseRegex = /(\d+)\.\s*\*\*Blank (\d+)\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
        let match;
        while ((match = responseRegex.exec(responsesText)) !== null) {
          const blankIndex = parseInt(match[2], 10) - 1;
          const selectedAnswer = match[3].trim();
          if (selectedAnswer && selectedAnswer !== "No answer selected") {
            answers[blankIndex] = selectedAnswer;
          }
        }
      } else if (/^matching$/i.test(type)) {
        const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
        let match;
        while ((match = responseRegex.exec(responsesText)) !== null) {
          const itemIndex = parseInt(match[1], 10) - 1;
          const selectedAnswer = match[2].trim();
          if (selectedAnswer && selectedAnswer !== "No answer selected") {
            answers[itemIndex] = selectedAnswer;
          }
        }
      } else if (/^sort into boxes$/i.test(type)) {
        const responseRegex = /(\d+)\.\s*\*\*[\s\S]*?\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
        let match;
        while ((match = responseRegex.exec(responsesText)) !== null) {
          const itemIndex = parseInt(match[1], 10) - 1;
          const selectedAnswer = match[2].trim();
          if (selectedAnswer && selectedAnswer !== "No answer selected") {
            answers[itemIndex] = selectedAnswer;
          }
        }
      } else if (/^text input$/i.test(type)) {
        Object.assign(answers, parseTextInputAnswers(responsesText));
      } else if (/^matrix$/i.test(type)) {
        const explanations = {};
        const questionBlocks = responsesText.split(/(?=\d+\.\s*\*\*[^*]+\*\*)/);
        questionBlocks.forEach((block) => {
          const questionMatch = block.match(/^(\d+)\.\s*\*\*[^*]+\*\*/);
          if (questionMatch) {
            const questionNumber = parseInt(questionMatch[1], 10);
            const explanationMatch = block.match(/Explanation:\s*([^\n]+)/);
            if (explanationMatch) {
              const questionIndex = questionNumber - 1;
              const explanationStr = explanationMatch[1].trim();
              if (explanationStr) {
                explanations[questionIndex] = explanationStr;
              }
            }
          }
        });
        const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
        let match;
        while ((match = responseRegex.exec(responsesText)) !== null) {
          const rowIndex = parseInt(match[1], 10) - 1;
          const selectedAnswer = match[2].trim();
          if (selectedAnswer && selectedAnswer !== "No answer selected") {
            answers[rowIndex] = selectedAnswer;
          }
        }
        if (Object.keys(explanations).length > 0) {
          return { answers, type, explanations };
        }
      }
      return { answers, type };
    }
    function buildActivityFromMarkdown2(markdownText) {
      const tokens = Lexer2.lex(markdownText);
      const sections = parseSectionsFromTokens2(tokens);
      const type = ((sections.get("Type") || []).map((t) => t.raw || t.text).join("\n") || "").trim();
      const question = ((sections.get("Practice Question") || []).map((t) => t.raw || t.text).join("\n") || "").trim();
      if (/^fill in the blanks$/i.test(type)) {
        let rand2 = function() {
          s2 = s2 * 48271 % 2147483647;
          return s2 / 2147483647;
        };
        var rand = rand2;
        const fibTokens = sections.get("Markdown With Blanks") || [];
        const fibMarkdown = fibTokens.map((t) => t.raw || t.text || "").join("\n").trim();
        const suggested = readListItems2(sections.get("Suggested Answers"));
        const lines = fibMarkdown.split(/\r?\n/);
        let promptLines = [];
        let contentLines = [];
        let foundBlockquote = false;
        for (const line of lines) {
          if (/^\s*>/.test(line)) {
            foundBlockquote = true;
            contentLines.push(line.replace(/^\s*>\s?/, ""));
          } else if (foundBlockquote) {
            contentLines.push(line);
          } else {
            if (line.trim()) {
              promptLines.push(line);
            }
          }
        }
        const prompt = promptLines.join("\n").trim();
        const content = contentLines.join("\n").trim();
        const blanks = [];
        let idx = 0;
        const contentWithBlankSpans = content.replace(/\[\[blank(?::([^\]]*))?\]\]/gi, (_, token) => {
          const answer = token != null ? String(token).trim() : null;
          const currentIndex = idx++;
          blanks.push({ index: currentIndex, answer });
          return `<span class="blank" data-blank="${currentIndex}" aria-label="blank ${currentIndex + 1}" tabindex="0"></span>`;
        });
        const suggestedTrimmed = suggested.map((s3) => s3.trim()).filter(Boolean);
        const requiredCounts = /* @__PURE__ */ new Map();
        blanks.forEach((b) => {
          const k = b.answer;
          if (k != null && k !== "") {
            requiredCounts.set(k, (requiredCounts.get(k) || 0) + 1);
          }
        });
        const suggestedCounts = /* @__PURE__ */ new Map();
        suggestedTrimmed.forEach((s3) => {
          suggestedCounts.set(s3, (suggestedCounts.get(s3) || 0) + 1);
        });
        const choices = suggestedTrimmed.slice();
        requiredCounts.forEach((req, k) => {
          const have = suggestedCounts.get(k) || 0;
          for (let i = have; i < req; i++) choices.push(k);
        });
        let s2 = (markdownText.length || 1337) % 2147483647 || 1337;
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(rand2() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        const promptHtml = prompt ? renderMarkdown(prompt) : "";
        const contentHtml = renderMarkdown(contentWithBlankSpans);
        const questionStyleTokens = sections.get("QuestionStyle") || [];
        const questionStyle = (questionStyleTokens.map((t) => t.raw || t.text).join("\n") || "").trim().toLowerCase() || null;
        const fibHeadingTokens = sections.get("Heading") || [];
        const fibHeadingMd = fibHeadingTokens.map((t) => t.raw || t.text).join("\n").trim();
        let fibHeading = null;
        if (fibHeadingMd) {
          fibHeading = { markdown: fibHeadingMd, html: renderMarkdown(fibHeadingMd) };
        }
        return attachSideContent(
          {
            type,
            question,
            fib: {
              raw: fibMarkdown,
              prompt,
              promptHtml,
              content,
              htmlWithPlaceholders: contentHtml,
              blanks,
              choices,
              questionStyle: questionStyle || void 0,
              ...fibHeading ? { heading: fibHeading } : {}
            }
          },
          sections
        );
      }
      if (/^multiple choice$/i.test(type)) {
        let seededShuffle2 = function(array, seed) {
          let s2 = seed;
          function seededRandom() {
            s2 = (s2 * 9301 + 49297) % 233280;
            return s2 / 233280;
          }
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }, generateSeed2 = function(questionText, options) {
          const allText = questionText + options.map((opt) => opt.text + opt.label).join("");
          let hash = 0;
          for (let i = 0; i < allText.length; i++) {
            const char = allText.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        }, processQuestion2 = function() {
          if (!currentQuestion || questionBuffer.length === 0) return;
          const questionText = questionBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
          const options = [];
          const optionRegex = /^([A-Z])\.\s*(.+)$/gm;
          let match;
          const optionMap = /* @__PURE__ */ new Map();
          while ((match = optionRegex.exec(questionText)) !== null) {
            const label = match[1];
            const text = match[2].trim();
            optionMap.set(label, text);
            const textHtml = renderMarkdown(text);
            options.push({
              label,
              text,
              // Keep raw text for backward compatibility
              textHtml,
              // Add HTML version for rendering
              correct: false
              // Will be set from Suggested Answers
            });
          }
          const questionTextOnly = questionText.replace(/^[A-Z]\.\s*.+$/gm, "").trim();
          currentQuestion.text = questionTextOnly || questionText;
          if (currentQuestion.text) {
            currentQuestion.textHtml = renderMarkdown(currentQuestion.text);
          } else {
            currentQuestion.textHtml = "";
          }
          currentQuestion.options = options;
        }, processExplainAnswer2 = function() {
          if (!currentQuestion) return;
          const raw = explainAnswerBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
          const { enabled, label } = parseExplainYourAnswerSection(raw);
          currentQuestion.explainAnswer = enabled;
          if (enabled && label) {
            currentQuestion.explainAnswerLabel = label;
          } else {
            delete currentQuestion.explainAnswerLabel;
          }
        }, processQuestionOptions2 = function() {
          if (!currentQuestion) return;
          const optionsText = questionOptionsBuffer.map((t) => t.raw || t.text || "").join("\n").trim().toLowerCase();
          if (optionsText.includes("shuffle=false") || optionsText.includes("don't shuffle") || optionsText.includes("dont shuffle") || optionsText === "no shuffle") {
            currentQuestion.shuffleOptions = false;
          } else {
            currentQuestion.shuffleOptions = true;
          }
          if (optionsText.includes("multi-select")) {
            currentQuestion.isMultiSelect = true;
          }
          if (optionsText.includes("any") || optionsText.includes("multi-select mode: any") || optionsText.includes("mode: any")) {
            currentQuestion.multiSelectMode = "any";
          } else {
            currentQuestion.multiSelectMode = "all";
          }
        }, processAnswers2 = function() {
          if (!currentQuestion) return;
          if (explainAnswerBuffer.length > 0) {
            processExplainAnswer2();
          } else {
            currentQuestion.explainAnswer = false;
            delete currentQuestion.explainAnswerLabel;
          }
          if (questionOptionsBuffer.length > 0) {
            processQuestionOptions2();
          } else {
            currentQuestion.shuffleOptions = true;
            currentQuestion.multiSelectMode = "all";
          }
          if (answerBuffer.length > 0) {
            const answerItems = readListItems2(answerBuffer);
            const correctAnswers = /* @__PURE__ */ new Set();
            answerItems.forEach((item) => {
              const trimmed = item.trim();
              const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
              if (match) {
                const label = match[1].toUpperCase();
                if (trimmed.toLowerCase().includes("correct")) {
                  correctAnswers.add(label);
                }
              }
            });
            currentQuestion.options.forEach((opt) => {
              opt.correct = correctAnswers.has(opt.label);
            });
            if (correctAnswers.size > 0) {
              currentQuestion.isMultiSelect = correctAnswers.size > 1;
            }
          }
          if (currentQuestion.shuffleOptions !== false) {
            const seed = generateSeed2(currentQuestion.text, currentQuestion.options);
            currentQuestion.options = seededShuffle2(currentQuestion.options, seed);
          }
          currentQuestion.options.forEach((opt, i) => {
            opt.displayLabel = String.fromCharCode(65 + i);
          });
          questions.push(currentQuestion);
        };
        var seededShuffle = seededShuffle2, generateSeed = generateSeed2, processQuestion = processQuestion2, processExplainAnswer = processExplainAnswer2, processQuestionOptions = processQuestionOptions2, processAnswers = processAnswers2;
        const questions = [];
        const allTokens = Lexer2.lex(markdownText);
        let currentQuestion = null;
        let currentSection = null;
        let questionBuffer = [];
        let answerBuffer = [];
        let explainAnswerBuffer = [];
        let questionOptionsBuffer = [];
        let questionNameBuffer = [];
        let headingBuffer = [];
        for (const token of allTokens) {
          if (token.type === "paragraph") {
            const text = (token.text || "").trim();
            const m = text.match(/^__([^_]+)__\s*$/);
            if (m) {
              const sectionName = m[1].trim();
              if (sectionName === "Practice Question") {
                if (currentQuestion) {
                  processAnswers2();
                }
                const nameFromBuffer = questionNameBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
                questionNameBuffer = [];
                currentQuestion = {
                  id: questions.length,
                  name: nameFromBuffer,
                  text: "",
                  options: [],
                  isMultiSelect: false,
                  explainAnswer: false,
                  shuffleOptions: true,
                  multiSelectMode: "all"
                };
                currentSection = "question";
                questionBuffer = [];
                answerBuffer = [];
                explainAnswerBuffer = [];
                questionOptionsBuffer = [];
                continue;
              } else if (sectionName === "Question Name" || sectionName === "Question name") {
                if (currentQuestion && (currentSection === "answers" || currentSection === "explain" || currentSection === "questionOptions")) {
                  processAnswers2();
                  currentQuestion = null;
                }
                currentSection = "questionName";
                questionNameBuffer = [];
                continue;
              } else if (sectionName === "Suggested Answers") {
                if (currentQuestion) {
                  processQuestion2();
                  if (currentSection === "questionOptions" && questionOptionsBuffer.length > 0) {
                    processQuestionOptions2();
                  }
                  currentSection = "answers";
                  answerBuffer = [];
                }
                continue;
              } else if (sectionName === "Question Options" || sectionName === "Question options") {
                if (currentQuestion && currentSection === "question") {
                  processQuestion2();
                  currentSection = "questionOptions";
                  questionOptionsBuffer = [];
                }
                continue;
              } else if (sectionName === "Explain Your Answer" || sectionName === "Explain your answer") {
                if (currentQuestion) {
                  if (currentSection === "questionOptions" && questionOptionsBuffer.length > 0) {
                    processQuestionOptions2();
                  }
                  if (currentSection === "answers" || currentSection === "questionOptions") {
                    currentSection = "explain";
                    explainAnswerBuffer = [];
                  }
                }
                continue;
              } else if (sectionName === "Heading") {
                currentSection = "heading";
                headingBuffer = [];
                continue;
              } else if (sectionName === "Content") {
                currentSection = null;
                continue;
              } else if (sectionName === "Type") {
                currentSection = null;
                continue;
              }
            }
          }
          if (currentSection === "heading") {
            headingBuffer.push(token);
          } else if (currentSection === "questionName") {
            questionNameBuffer.push(token);
          } else if (currentSection === "question" && currentQuestion) {
            questionBuffer.push(token);
          } else if (currentSection === "questionOptions" && currentQuestion) {
            questionOptionsBuffer.push(token);
          } else if (currentSection === "answers" && currentQuestion) {
            answerBuffer.push(token);
          } else if (currentSection === "explain" && currentQuestion) {
            explainAnswerBuffer.push(token);
          }
        }
        if (currentQuestion) {
          if (questionBuffer.length > 0 && currentQuestion.options.length === 0) {
            processQuestion2();
          }
          processAnswers2();
        }
        if (questions.length === 0) {
          throw new Error("No MCQ questions found");
        }
        let heading = null;
        if (headingBuffer.length > 0) {
          const headingText = headingBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
          if (headingText) {
            heading = { markdown: headingText, html: renderMarkdown(headingText) };
          }
        }
        return attachSideContent({ type, question: null, mcq: { questions, heading } }, sections);
      }
      if (/^matching$/i.test(type)) {
        let rand2 = function() {
          s2 = s2 * 48271 % 2147483647;
          return s2 / 2147483647;
        };
        var rand = rand2;
        const matchingTokens = sections.get("Markdown With Blanks") || [];
        const matchingMarkdown = matchingTokens.map((t) => t.raw || t.text || "").join("\n").trim();
        const suggested = readListItems2(sections.get("Suggested Answers"));
        const lines = matchingMarkdown.split(/\r?\n/);
        let promptLines = [];
        let itemLines = [];
        let foundBlockquote = false;
        for (const line of lines) {
          if (/^\s*>/.test(line)) {
            foundBlockquote = true;
            itemLines.push(line.replace(/^\s*>\s?/, ""));
          } else if (foundBlockquote) {
            itemLines.push(line);
          } else {
            if (line.trim()) {
              promptLines.push(line);
            }
          }
        }
        const prompt = promptLines.join("\n").trim();
        const items2 = [];
        let idx = 0;
        for (const line of lines) {
          if (/^\s*>/.test(line)) {
            const itemLine = line.replace(/^\s*>\s?/, "").trim();
            const blankMatch = itemLine.match(/\[\[blank(?::([^\]]*))?\]\]/i);
            if (!blankMatch) continue;
            const answer = blankMatch[1] != null ? String(blankMatch[1]).trim() : null;
            const textBeforeBlank = itemLine.replace(/\[\[blank(?::[^\]]*)?\]\]/gi, "").trim();
            const textHtml = renderMarkdown(textBeforeBlank);
            items2.push({
              index: idx++,
              text: textBeforeBlank,
              textHtml,
              answer
            });
          }
        }
        const suggestedTrimmed = suggested.map((s3) => s3.trim()).filter(Boolean);
        const requiredCounts = /* @__PURE__ */ new Map();
        items2.forEach((item) => {
          const k = item.answer;
          if (k != null && k !== "") {
            requiredCounts.set(k, (requiredCounts.get(k) || 0) + 1);
          }
        });
        const suggestedCounts = /* @__PURE__ */ new Map();
        suggestedTrimmed.forEach((s3) => {
          suggestedCounts.set(s3, (suggestedCounts.get(s3) || 0) + 1);
        });
        const choices = suggestedTrimmed.slice();
        requiredCounts.forEach((req, k) => {
          const have = suggestedCounts.get(k) || 0;
          for (let i = have; i < req; i++) choices.push(k);
        });
        let s2 = (markdownText.length || 1337) % 2147483647 || 1337;
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(rand2() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        const choicesHtml = choices.map((c) => renderMarkdown(c));
        const promptHtml = prompt ? renderMarkdown(prompt) : "";
        const matchingHeadingTokens = sections.get("Heading") || [];
        const matchingHeadingMd = matchingHeadingTokens.map((t) => t.raw || t.text).join("\n").trim();
        let matchingHeading = null;
        if (matchingHeadingMd) {
          matchingHeading = { markdown: matchingHeadingMd, html: renderMarkdown(matchingHeadingMd) };
        }
        return attachSideContent({
          type,
          question: null,
          matching: {
            raw: matchingMarkdown,
            prompt,
            promptHtml,
            items: items2,
            choices,
            choicesHtml,
            ...matchingHeading ? { heading: matchingHeading } : {}
          }
        }, sections);
      }
      if (/^text input$/i.test(type)) {
        let processQuestion2 = function() {
          if (!currentQuestion || questionBuffer.length === 0) return;
          const questionText = questionBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
          currentQuestion.text = questionText;
          if (currentQuestion.text) {
            currentQuestion.textHtml = renderMarkdown(currentQuestion.text);
          } else {
            currentQuestion.textHtml = "";
          }
        }, processAnswers2 = function() {
          if (!currentQuestion) return;
          if (answerBuffer.length > 0) {
            const answerItems = readListItems2(answerBuffer);
            if (answerItems.length > 0) {
              const parsed = parseTextInputAnswerItems(answerItems);
              currentQuestion.correctAnswers = parsed.correctAnswers;
              currentQuestion.correctAnswer = parsed.correctAnswer;
              currentQuestion.validation = parsed.validation;
            }
          }
          questions.push(currentQuestion);
        };
        var processQuestion = processQuestion2, processAnswers = processAnswers2;
        const questions = [];
        const allTokens = Lexer2.lex(markdownText);
        let currentQuestion = null;
        let currentSection = null;
        let questionBuffer = [];
        let answerBuffer = [];
        let headingBuffer = [];
        let questionNameBuffer = [];
        for (const token of allTokens) {
          if (token.type === "paragraph") {
            const text = (token.text || "").trim();
            const m = text.match(/^__([^_]+)__\s*$/);
            if (m) {
              const sectionName = m[1].trim();
              if (sectionName === "Practice Question") {
                if (currentQuestion) {
                  processAnswers2();
                }
                const nameFromBuffer = questionNameBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
                questionNameBuffer = [];
                currentQuestion = {
                  id: questions.length,
                  name: nameFromBuffer,
                  text: "",
                  correctAnswer: "",
                  correctAnswers: [],
                  validation: {}
                };
                currentSection = "question";
                questionBuffer = [];
                answerBuffer = [];
                continue;
              } else if (sectionName === "Question Name" || sectionName === "Question name") {
                if (currentQuestion && currentSection === "answers") {
                  processAnswers2();
                  currentQuestion = null;
                }
                currentSection = "questionName";
                questionNameBuffer = [];
                continue;
              } else if (sectionName === "Correct Answers" || sectionName === "Suggested Answers") {
                if (currentQuestion) {
                  processQuestion2();
                  currentSection = "answers";
                  answerBuffer = [];
                }
                continue;
              } else if (sectionName === "Type") {
                currentSection = null;
                continue;
              } else if (sectionName === "Heading") {
                currentSection = "heading";
                headingBuffer = [];
                continue;
              }
            }
          }
          if (currentSection === "questionName") {
            questionNameBuffer.push(token);
          } else if (currentSection === "question" && currentQuestion) {
            questionBuffer.push(token);
          } else if (currentSection === "answers" && currentQuestion) {
            answerBuffer.push(token);
          } else if (currentSection === "heading") {
            headingBuffer.push(token);
          }
        }
        if (currentQuestion) {
          if (questionBuffer.length > 0 && !currentQuestion.text) {
            processQuestion2();
          }
          processAnswers2();
        }
        if (questions.length === 0) {
          throw new Error("No text input questions found");
        }
        let heading = null;
        if (headingBuffer.length > 0) {
          const headingText = headingBuffer.map((t) => t.raw || t.text || "").join("\n").trim();
          if (headingText) {
            heading = { markdown: headingText, html: renderMarkdown(headingText) };
          }
        }
        const activity = { type, question: null, textInput: { questions, heading } };
        attachSideContent(activity, sections);
        const side = activity.content || null;
        activity.textInput.content = side;
        return activity;
      }
      if (/^matrix$/i.test(type)) {
        const columns = readListItems2(sections.get("Matrix Columns"));
        const rows = readListItems2(sections.get("Matrix Rows"));
        const suggestedRaw = readListItems2(sections.get("Suggested Answers"));
        if (columns.length < 2) {
          throw new Error("Matrix requires at least two entries in __Matrix Columns__");
        }
        if (rows.length === 0) {
          throw new Error("Matrix requires at least one entry in __Matrix Rows__");
        }
        const colSeen = /* @__PURE__ */ new Set();
        for (const c of columns) {
          if (colSeen.has(c)) {
            throw new Error(`Duplicate matrix column label: ${c}`);
          }
          colSeen.add(c);
        }
        const rowSeen = /* @__PURE__ */ new Set();
        for (const r of rows) {
          if (rowSeen.has(r)) {
            throw new Error(`Duplicate matrix row label: ${r}`);
          }
          rowSeen.add(r);
        }
        let correctColumnIndexByRow = null;
        if (suggestedRaw.length > 0) {
          if (suggestedRaw.length !== rows.length) {
            throw new Error(
              `Matrix __Suggested Answers__ must have exactly one line per row (expected ${rows.length}, got ${suggestedRaw.length})`
            );
          }
          const answerByRow = /* @__PURE__ */ new Map();
          for (const line of suggestedRaw) {
            const colonIdx = line.indexOf(":");
            if (colonIdx === -1) {
              throw new Error(`Matrix suggested answer must use "row label: column label" format: ${line}`);
            }
            const rowKey = line.slice(0, colonIdx).trim();
            const colLabel = line.slice(colonIdx + 1).trim();
            if (!rows.includes(rowKey)) {
              throw new Error(`Matrix __Suggested Answers__ row not found in __Matrix Rows__: ${rowKey}`);
            }
            if (answerByRow.has(rowKey)) {
              throw new Error(`Duplicate __Suggested Answers__ entry for row: ${rowKey}`);
            }
            const colIdx = columns.indexOf(colLabel);
            if (colIdx === -1) {
              throw new Error(`Matrix __Suggested Answers__ column not found in __Matrix Columns__: ${colLabel}`);
            }
            answerByRow.set(rowKey, colIdx);
          }
          correctColumnIndexByRow = rows.map((r) => {
            if (!answerByRow.has(r)) {
              throw new Error(`Missing __Suggested Answers__ entry for row: ${r}`);
            }
            return answerByRow.get(r);
          });
        }
        const explainTokens = sections.get("Explain Your Answer") || sections.get("Explain your answer") || [];
        const explainRaw = explainTokens.map((t) => t.raw || t.text).join("\n").trim();
        const {
          enabled: explainAnswer,
          label: explainAnswerLabel
        } = parseExplainYourAnswerSection(explainRaw);
        const headingTokens = sections.get("Heading") || [];
        const headingMd = headingTokens.map((t) => t.raw || t.text).join("\n").trim();
        let matrixHeading = null;
        if (headingMd) {
          matrixHeading = { markdown: headingMd, html: renderMarkdown(headingMd) };
        }
        const questionHtml = question ? renderMarkdown(question) : "";
        return attachSideContent(
          {
            type,
            question,
            questionHtml,
            matrix: {
              columns,
              rows,
              correctColumnIndexByRow,
              explainAnswer,
              ...explainAnswer && explainAnswerLabel ? { explainAnswerLabel } : {},
              ...matrixHeading ? { heading: matrixHeading } : {}
            }
          },
          sections
        );
      }
      const labels = readListItems2(sections.get("Labels"));
      if (/^sort into boxes$/i.test(type)) {
        let rand2 = function() {
          s2 = s2 * 48271 % 2147483647;
          return s2 / 2147483647;
        };
        var rand = rand2;
        const categoriesRaw = readListItems2(sections.get("Categories"));
        const itemEntries = readListItems2(sections.get("Items"));
        let categories = [];
        let items2 = [];
        if (categoriesRaw.length > 0 || itemEntries.length > 0) {
          categories = categoriesRaw.map((c) => c.trim()).filter(Boolean);
          items2 = itemEntries.map(parseSortItemEntry).filter((it) => it.text);
          const hasCategories = items2.some((it) => it.correct);
          if (hasCategories) {
            for (const it of items2) {
              if (!it.correct) {
                throw new Error(`Sort Into Boxes __Items__ is missing a category: ${it.text}`);
              }
              if (!categories.includes(it.correct)) {
                throw new Error(`Sort Into Boxes __Items__ category not found in __Categories__: ${it.text}: ${it.correct}`);
              }
            }
          } else {
            items2 = items2.map((it) => ({ ...it, correct: null }));
          }
        } else {
          let first = "", second = "";
          for (const entry of labels) {
            const [k, ...rest] = entry.split(":");
            const v = rest.join(":").trim();
            const nk = (k || "").toLowerCase();
            if (nk.includes("first")) first = v;
            if (nk.includes("second")) second = v;
          }
          categories = [first || "First Box", second || "Second Box"];
          const firstItems = readListItems2(sections.get("First Box Items"));
          const secondItems = readListItems2(sections.get("Second Box Items"));
          items2 = [
            ...firstItems.map((text) => ({ text, correct: categories[0] })),
            ...secondItems.map((text) => ({ text, correct: categories[1] }))
          ];
        }
        items2 = items2.map((it) => ({ ...it, textHtml: renderMarkdown(it.text) }));
        let s2 = (markdownText.length || 1337) % 2147483647 || 1337;
        for (let i = items2.length - 1; i > 0; i--) {
          const j = Math.floor(rand2() * (i + 1));
          [items2[i], items2[j]] = [items2[j], items2[i]];
        }
        const categoriesHtml = categories.map((c) => renderMarkdown(c));
        const questionHtml = question ? renderMarkdown(question) : "";
        return attachSideContent(
          {
            type,
            question,
            questionHtml,
            categories,
            categoriesHtml,
            items: items2,
            // Retained for backward compatibility with older consumers.
            labels: { first: categories[0] || "", second: categories[1] || "" }
          },
          sections
        );
      }
      let left = "", right = "";
      for (const entry of labels) {
        const [k, ...rest] = entry.split(":");
        const v = rest.join(":").trim();
        const nk = (k || "").toLowerCase();
        if (nk.includes("left")) left = v;
        if (nk.includes("right")) right = v;
      }
      const leftItems = readListItems2(sections.get("Left Label Items"));
      const rightItems = readListItems2(sections.get("Right Label Items"));
      let items;
      if (leftItems.length === 0 && rightItems.length === 0) {
        items = readListItems2(sections.get("Items")).map((text) => ({ text, correct: null }));
      } else {
        items = [
          ...leftItems.map((text) => ({ text, correct: "left" })),
          ...rightItems.map((text) => ({ text, correct: "right" }))
        ];
      }
      let s = (markdownText.length || 1337) % 2147483647 || 1337;
      function rand() {
        s = s * 48271 % 2147483647;
        return s / 2147483647;
      }
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return attachSideContent({ type, question, labels: { left, right }, items }, sections);
    }
    function detectAnswersPresent(activity) {
      if (!activity || !activity.type) return false;
      const type = String(activity.type);
      if (/^multiple choice$/i.test(type)) {
        const qs = activity.mcq && activity.mcq.questions;
        if (!qs || qs.length === 0) return false;
        return qs.some((q) => Array.isArray(q.options) && q.options.some((o) => o.correct));
      }
      if (/^fill in the blanks$/i.test(type)) {
        const blanks = activity.fib && activity.fib.blanks;
        if (!blanks || blanks.length === 0) return false;
        return blanks.some((b) => b.answer != null && b.answer !== "");
      }
      if (/^matching$/i.test(type)) {
        const items = activity.matching && activity.matching.items;
        if (!items || items.length === 0) return false;
        return items.some((it) => it.answer != null && it.answer !== "");
      }
      if (/^sort into boxes$/i.test(type)) {
        if (!Array.isArray(activity.items)) return false;
        return activity.items.some((it) => it.correct != null && it.correct !== "");
      }
      if (/^matrix$/i.test(type)) {
        return Array.isArray(activity.matrix && activity.matrix.correctColumnIndexByRow) && activity.matrix.correctColumnIndexByRow.length > 0;
      }
      if (/^text input$/i.test(type)) {
        const qs = activity.textInput && activity.textInput.questions;
        if (!qs || qs.length === 0) return false;
        return qs.some(
          (q) => q.correctAnswer && q.correctAnswer.trim() !== "" || Array.isArray(q.correctAnswers) && q.correctAnswers.some(
            (ca) => ca.correctAnswer && ca.correctAnswer.trim() !== "" || ca.validation && ca.validation.kind === "validate-later"
          )
        );
      }
      if (!Array.isArray(activity.items)) return false;
      return activity.items.some((it) => it.correct != null && it.correct !== "");
    }
    module2.exports = {
      parseSectionsFromTokens: parseSectionsFromTokens2,
      extractQuestionTypeFromMarkdown,
      parseSideContentFromSectionTokens,
      attachSideContent,
      parseExplainYourAnswerSection,
      readListItems: readListItems2,
      parseAnswersFromMarkdown: parseAnswersFromMarkdown2,
      buildActivityFromMarkdown: buildActivityFromMarkdown2,
      detectAnswersPresent
    };
  }
});

// lib/activity-results-validation.js
var require_activity_results_validation = __commonJS({
  "lib/activity-results-validation.js"(exports2, module2) {
    var { validateTextInputAnswer } = require_text_input_validation();
    function questionIndexFromOrderedResult(result, resultIndex, numQuestions) {
      const n = numQuestions | 0;
      if (typeof resultIndex === "number" && resultIndex >= 0 && resultIndex < n) return resultIndex;
      const m = /^Question\s+(\d+)\s*$/i.exec(String(result?.text || "").trim());
      if (m) {
        const i = parseInt(m[1], 10) - 1;
        if (i >= 0 && i < n) return i;
      }
      return -1;
    }
    function arraysEqual(a, b) {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    }
    function parseCommaSeparatedLabels(str) {
      return String(str || "").split(",").map((s) => s.trim()).filter(Boolean);
    }
    function evaluateMcqSelection(selectedLabels, correctLabels, question) {
      const selected = selectedLabels.map(String);
      const correct = correctLabels.map(String);
      if (question && question.isMultiSelect && question.multiSelectMode === "any") {
        const hasCorrectAnswer = selected.some((sel) => correct.includes(sel));
        const hasIncorrectAnswer = selected.some((sel) => !correct.includes(sel));
        return hasCorrectAnswer && !hasIncorrectAnswer && selected.length > 0;
      }
      return arraysEqual([...selected].sort(), [...correct].sort());
    }
    function evaluateMatrixResult(selected, correct) {
      const sel = String(selected || "").trim();
      const cor = String(correct || "").trim();
      return Boolean(sel) && sel === cor;
    }
    function evaluateExactMatchResult(selected, correct) {
      return selected === correct;
    }
    function evaluateActivityResultCorrect2(activity, result, resultIndex) {
      if (!activity || !activity.type) {
        return evaluateExactMatchResult(result?.selected, result?.correct);
      }
      const type = String(activity.type);
      if (/^multiple choice$/i.test(type)) {
        const n = activity.mcq?.questions?.length ?? 0;
        const questionIndex = questionIndexFromOrderedResult(result, resultIndex, n);
        const question = activity.mcq?.questions?.[questionIndex];
        const selected = parseCommaSeparatedLabels(result.selected);
        const correct = parseCommaSeparatedLabels(result.correct);
        if (question) {
          return evaluateMcqSelection(selected, correct, question);
        }
        const selectedSorted = [...selected].sort().join(", ");
        const correctSorted = [...correct].sort().join(", ");
        return selectedSorted === correctSorted;
      }
      if (/^text input$/i.test(type)) {
        const n = activity.textInput?.questions?.length ?? 0;
        const questionIndex = questionIndexFromOrderedResult(result, resultIndex, n);
        const question = activity.textInput?.questions?.[questionIndex];
        if (question) {
          return validateTextInputAnswer(question, result.selected) === true;
        }
        return evaluateExactMatchResult(result.selected, result.correct);
      }
      if (/^matrix$/i.test(type)) {
        return evaluateMatrixResult(result.selected, result.correct);
      }
      return evaluateExactMatchResult(result.selected, result.correct);
    }
    function isTextInputResultValidateLater(activity, result, resultIndex) {
      if (!activity || !/^text input$/i.test(activity.type)) return false;
      const n = activity.textInput?.questions?.length ?? 0;
      const questionIndex = questionIndexFromOrderedResult(result, resultIndex, n);
      const question = activity.textInput?.questions?.[questionIndex];
      return Boolean(question && question.validation && question.validation.kind === "validate-later");
    }
    function countValidateLaterTextInputResults(activity, results) {
      if (!activity || !/^text input$/i.test(activity.type) || !Array.isArray(results)) return 0;
      return results.filter((r, i) => isTextInputResultValidateLater(activity, r, i)).length;
    }
    module2.exports = {
      questionIndexFromOrderedResult,
      arraysEqual,
      parseCommaSeparatedLabels,
      evaluateMcqSelection,
      evaluateMatrixResult,
      evaluateExactMatchResult,
      evaluateActivityResultCorrect: evaluateActivityResultCorrect2,
      isTextInputResultValidateLater,
      countValidateLaterTextInputResults
    };
  }
});

// lib/build-activity-report.js
var require_build_activity_report = __commonJS({
  "lib/build-activity-report.js"(exports2, module2) {
    var {
      questionIndexFromOrderedResult,
      evaluateActivityResultCorrect: evaluateActivityResultCorrect2,
      isTextInputResultValidateLater,
      countValidateLaterTextInputResults
    } = require_activity_results_validation();
    var MAX_PROMPT_CHARS = 600;
    function stripHtmlToPlain(html) {
      if (!html) return "";
      let s = String(html).replace(/<script[\s\S]*?<\/script>/gi, "");
      s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
      s = s.replace(/<[^>]+>/g, " ");
      s = s.replace(/\s+/g, " ").trim();
      if (s.length > MAX_PROMPT_CHARS) {
        s = `${s.slice(0, MAX_PROMPT_CHARS)}\u2026`;
      }
      return s;
    }
    function formatSelected(value) {
      const v = value === void 0 || value === null ? "" : String(value);
      return v.trim() ? v : "_No answer_";
    }
    function expandMcqLetterParts(labelsCsv) {
      if (!labelsCsv || !String(labelsCsv).trim()) {
        return [];
      }
      return String(labelsCsv).split(",").map((s) => s.trim()).filter(Boolean);
    }
    function pushMcqOptionsList(lines, q) {
      if (!q || !Array.isArray(q.options) || q.options.length === 0) {
        return;
      }
      const sorted = q.options.slice().sort(
        (a, b) => String(a.label || "").localeCompare(String(b.label || ""))
      );
      lines.push("**Options**");
      lines.push("");
      for (const opt of sorted) {
        const lab = String(opt.label || "").trim() || "?";
        const body = stripHtmlToPlain(opt.textHtml) || String(opt.text || "").trim();
        lines.push(body ? `- **${lab}.** ${body}` : `- **${lab}.**`);
      }
      lines.push("");
    }
    function formatMcqLettersForReport(labelsCsv) {
      const parts = expandMcqLetterParts(labelsCsv);
      return parts.length === 0 ? "_No answer_" : parts.join(", ");
    }
    function stripFibBlockquoteLines(content) {
      return String(content || "").split(/\r?\n/).map((line) => line.replace(/^\s*>\s?/, "").trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    function fibFullQuestionWithBlankLabels(content) {
      if (!content || !/\[\[blank:[^\]]+\]\]/i.test(content)) return null;
      let n = 0;
      const replaced = content.replace(/\[\[blank:[^\]]+\]\]/gi, () => {
        n += 1;
        return `[Blank ${n}]`;
      });
      return stripFibBlockquoteLines(replaced);
    }
    function resultStatusLine(activity, result, index) {
      if (isTextInputResultValidateLater(activity, result, index)) {
        return "**Result:** Not scored (submitted for later review)";
      }
      const ok = evaluateActivityResultCorrect2(activity, result, index);
      return ok ? "**Result:** Correct" : "**Result:** Incorrect";
    }
    function buildActivityReportMarkdown2(activity, results) {
      const lines = [];
      const type = activity && activity.type ? String(activity.type) : "Unknown";
      const list = Array.isArray(results) ? results : [];
      lines.push("# Activity report");
      lines.push("");
      lines.push(`**Activity type:** ${type}`);
      lines.push(`**Generated:** ${(/* @__PURE__ */ new Date()).toISOString()}`);
      lines.push("");
      const validateLaterCount = countValidateLaterTextInputResults(activity, list);
      const correctCount = list.filter((r, i) => evaluateActivityResultCorrect2(activity, r, i)).length;
      const totalCount = Math.max(0, list.length - validateLaterCount);
      lines.push("## Summary");
      lines.push("");
      if (list.length === 0) {
        lines.push("_No responses recorded._");
      } else {
        let scoreLine = `**Score:** ${correctCount} / ${totalCount} correct`;
        if (validateLaterCount > 0) {
          scoreLine += ` (${validateLaterCount} ${validateLaterCount === 1 ? "response" : "responses"} not included in score)`;
        }
        lines.push(scoreLine);
      }
      lines.push("");
      lines.push("---");
      lines.push("");
      if (list.length === 0) {
        return lines.join("\n");
      }
      if (/^multiple choice$/i.test(type)) {
        lines.push("## Candidate Response");
        lines.push("");
        list.forEach((result, index) => {
          const n = activity.mcq?.questions?.length ?? 0;
          const qi = questionIndexFromOrderedResult(result, index, n);
          const q = activity.mcq?.questions?.[qi];
          const heading = result.text || `Question ${index + 1}`;
          const prompt = stripHtmlToPlain(q?.textHtml) || (q?.text ? String(q.text).trim() : "");
          lines.push(`### ${heading}`);
          lines.push("");
          if (prompt) {
            lines.push(prompt);
            lines.push("");
          }
          pushMcqOptionsList(lines, q);
          lines.push("**Response**");
          lines.push("");
          lines.push(`- **Candidate's Answer:** ${formatMcqLettersForReport(result.selected)}`);
          lines.push(`- **Correct answer(s):** ${formatMcqLettersForReport(result.correct)}`);
          lines.push(`- ${resultStatusLine(activity, result, index)}`);
          if (result.explanation && String(result.explanation).trim()) {
            lines.push(`- **Your explanation:** ${String(result.explanation).trim()}`);
          }
          lines.push("");
        });
      } else if (/^text input$/i.test(type)) {
        lines.push("## Candidate Response");
        lines.push("");
        list.forEach((result, index) => {
          const n = activity.textInput?.questions?.length ?? 0;
          const qi = questionIndexFromOrderedResult(result, index, n);
          const q = activity.textInput?.questions?.[qi];
          const heading = result.text || `Question ${index + 1}`;
          const prompt = stripHtmlToPlain(q?.textHtml) || (q?.text ? String(q.text).trim() : "");
          lines.push(`### ${heading}`);
          lines.push("");
          if (prompt) {
            lines.push(prompt);
            lines.push("");
          }
          lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
          lines.push(`- **Accepted answer(s):** ${formatSelected(result.correct)}`);
          lines.push(`- ${resultStatusLine(activity, result, index)}`);
          lines.push("");
        });
      } else if (/^matrix$/i.test(type)) {
        lines.push("## Candidate Response");
        lines.push("");
        const matrixHeadingMeta = activity.matrix?.heading;
        if (matrixHeadingMeta) {
          const headerPlain = stripHtmlToPlain(matrixHeadingMeta.html) || String(matrixHeadingMeta.markdown || "").trim();
          if (headerPlain) {
            lines.push("### Heading");
            lines.push("");
            lines.push(headerPlain);
            lines.push("");
          }
        }
        const matrixQuestionPrompt = activity && activity.question ? activity.questionHtml ? stripHtmlToPlain(activity.questionHtml) : String(activity.question).trim() : "";
        if (matrixQuestionPrompt) {
          lines.push("### Question");
          lines.push("");
          lines.push(matrixQuestionPrompt);
          lines.push("");
        }
        const rows = activity.matrix?.rows || [];
        list.forEach((result, index) => {
          const rowLabel = rows[index] !== void 0 ? String(rows[index]) : result.text || `Row ${index + 1}`;
          lines.push(`### ${rowLabel}`);
          lines.push("");
          lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
          lines.push(`- **Expected Column:** ${formatSelected(result.correct)}`);
          lines.push(`- ${resultStatusLine(activity, result, index)}`);
          if (result.explanation && String(result.explanation).trim() && index === 0) {
            lines.push(`- **Your explanation:** ${String(result.explanation).trim()}`);
          }
          lines.push("");
        });
      } else if (/^fill in the blanks$/i.test(type)) {
        lines.push("## Candidate Response");
        lines.push("");
        const prompt = activity.fib?.prompt ? stripHtmlToPlain(activity.fib.promptHtml) || String(activity.fib.prompt).trim() : "";
        if (prompt) {
          lines.push("### Passage");
          lines.push("");
          lines.push(prompt);
          lines.push("");
        }
        const questionLabeled = fibFullQuestionWithBlankLabels(activity.fib?.content || "");
        if (questionLabeled) {
          lines.push("### Question");
          lines.push("");
          lines.push(questionLabeled);
          lines.push("");
        }
        list.forEach((result, index) => {
          lines.push(`### ${result.text || `Blank ${index + 1}`}`);
          lines.push("");
          lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
          lines.push(`- **Expected Answer:** ${formatSelected(result.correct)}`);
          lines.push(`- ${resultStatusLine(activity, result, index)}`);
          lines.push("");
        });
      } else if (/^matching$/i.test(type)) {
        lines.push("## Candidate Response");
        lines.push("");
        const items = activity.matching?.items || [];
        list.forEach((result, index) => {
          const item = items[index];
          const short = item ? stripHtmlToPlain(item.textHtml) || String(item.text || "").trim() : "";
          const heading = result.text || `Item ${index + 1}`;
          lines.push(`### ${heading}`);
          lines.push("");
          if (short) {
            lines.push(short);
            lines.push("");
          }
          lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
          lines.push(`- **Expected match:** ${formatSelected(result.correct)}`);
          lines.push(`- ${resultStatusLine(activity, result, index)}`);
          lines.push("");
        });
      } else {
        lines.push("## Candidate Response");
        lines.push("");
        const pq = activity && activity.question ? activity.questionHtml ? stripHtmlToPlain(activity.questionHtml) : String(activity.question).trim() : "";
        list.forEach((result, index) => {
          lines.push(`### ${result.text || `Item ${index + 1}`}`);
          lines.push("");
          if (pq && index === 0) {
            lines.push(pq);
            lines.push("");
          }
          lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
          lines.push(`- **Expected:** ${formatSelected(result.correct)}`);
          lines.push(`- ${resultStatusLine(activity, result, index)}`);
          lines.push("");
        });
      }
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
    }
    module2.exports = {
      buildActivityReportMarkdown: buildActivityReportMarkdown2,
      stripHtmlToPlain,
      fibFullQuestionWithBlankLabels,
      stripFibBlockquoteLines
    };
  }
});

// lib/build-score-json.js
var require_build_score_json = __commonJS({
  "lib/build-score-json.js"(exports2, module2) {
    var {
      evaluateActivityResultCorrect: evaluateActivityResultCorrect2,
      isTextInputResultValidateLater
    } = require_activity_results_validation();
    function isResultUnscorable(activity, result, index) {
      if (isTextInputResultValidateLater(activity, result, index)) return true;
      if (!result.correct || String(result.correct).trim() === "") return true;
      return false;
    }
    function buildScoreJson2(activity, results) {
      const list = Array.isArray(results) ? results : [];
      const breakoutScores = list.map((result, index) => {
        const title = result.text || `Question ${index + 1}`;
        if (isResultUnscorable(activity, result, index)) {
          return { title, score: 0, maxScore: 0 };
        }
        const correct = evaluateActivityResultCorrect2(activity, result, index);
        return { title, score: correct ? 1 : 0, maxScore: 1 };
      });
      const totalScore = breakoutScores.reduce((sum, q) => sum + q.score, 0);
      const maxScore = breakoutScores.reduce((sum, q) => sum + q.maxScore, 0);
      return { totalScore, maxScore, breakoutScores };
    }
    module2.exports = { buildScoreJson: buildScoreJson2 };
  }
});

// lib/generate-score.js
var fs = require("fs");
var path = require("path");
var { Lexer } = require_marked();
var {
  buildActivityFromMarkdown,
  parseAnswersFromMarkdown,
  parseSectionsFromTokens,
  readListItems
} = require_parse_question();
var { evaluateActivityResultCorrect } = require_activity_results_validation();
var { buildActivityReportMarkdown } = require_build_activity_report();
var { buildScoreJson } = require_build_score_json();
function parseArgs(argv) {
  const args = {};
  const keys = ["--question", "--answer", "--answer-key", "--report", "--score"];
  for (let i = 2; i < argv.length; i++) {
    if (keys.includes(argv[i]) && i + 1 < argv.length) {
      const key = argv[i].replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return args;
}
function usage() {
  console.error(
    "Usage: node generate-score.js \\\n  --question <question.md> \\\n  --answer <answer.md> \\\n  --answer-key <answer-key.md> \\\n  --report <report.md> \\\n  --score <score.json>"
  );
  process.exit(1);
}
function parseAnswerKey(markdown) {
  const tokens = Lexer.lex(markdown);
  const sections = parseSectionsFromTokens(tokens);
  const type = ((sections.get("Type") || []).map((t) => t.raw || t.text).join("\n") || "").trim();
  const keyItems = readListItems(sections.get("Answer Key"));
  const answers = keyItems.map((item) => {
    const colonIdx = item.indexOf(":");
    if (colonIdx === -1) return { key: item.trim(), value: "" };
    return {
      key: item.slice(0, colonIdx).trim(),
      value: item.slice(colonIdx + 1).trim()
    };
  });
  return { type, answers };
}
function mergeAnswerKeyIntoActivity(activity, answerKey) {
  const type = String(activity.type || "");
  if (/^multiple choice$/i.test(type)) {
    const questions = activity.mcq && activity.mcq.questions;
    if (!questions) return;
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Question\s+(\d+)$/i);
      if (!m) return;
      const qIdx = parseInt(m[1], 10) - 1;
      const q = questions[qIdx];
      if (!q) return;
      const correctLabels = value.split(",").map((s) => s.trim()).filter(Boolean);
      q.options.forEach((opt) => {
        opt.correct = correctLabels.includes(opt.label);
      });
      q.isMultiSelect = correctLabels.length > 1;
    });
    return;
  }
  if (/^fill in the blanks$/i.test(type)) {
    const blanks = activity.fib && activity.fib.blanks;
    if (!blanks) return;
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Blank\s+(\d+)$/i);
      if (!m) return;
      const idx = parseInt(m[1], 10) - 1;
      const blank = blanks.find((b) => b.index === idx);
      if (blank) blank.answer = value;
    });
    return;
  }
  if (/^matching$/i.test(type)) {
    const items = activity.matching && activity.matching.items;
    if (!items) return;
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Item\s+(\d+)$/i);
      if (!m) return;
      const idx = parseInt(m[1], 10) - 1;
      if (items[idx]) items[idx].answer = value;
    });
    return;
  }
  if (/^sort into boxes$/i.test(type)) {
    if (!Array.isArray(activity.items)) return;
    answerKey.answers.forEach(({ key, value }) => {
      const item = activity.items.find((it) => it.text === key);
      if (item) item.correct = value;
    });
    return;
  }
  if (/^matrix$/i.test(type)) {
    const matrix = activity.matrix;
    if (!matrix) return;
    const rows = matrix.rows || [];
    const columns = matrix.columns || [];
    const indexByRow = new Array(rows.length).fill(null);
    answerKey.answers.forEach(({ key, value }) => {
      const rowIdx = rows.indexOf(key);
      const colIdx = columns.indexOf(value);
      if (rowIdx >= 0 && colIdx >= 0) {
        indexByRow[rowIdx] = colIdx;
      }
    });
    matrix.correctColumnIndexByRow = indexByRow;
    return;
  }
  if (/^text input$/i.test(type)) {
    const questions = activity.textInput && activity.textInput.questions;
    if (!questions) return;
    const { parseTextInputAnswerItems } = require_text_input_validation();
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Question\s+(\d+)$/i);
      if (!m) return;
      const qIdx = parseInt(m[1], 10) - 1;
      const q = questions[qIdx];
      if (!q) return;
      const parsed = parseTextInputAnswerItems([value]);
      q.correctAnswers = parsed.correctAnswers;
      q.correctAnswer = parsed.correctAnswer;
      q.validation = parsed.validation;
    });
    return;
  }
  if (!Array.isArray(activity.items)) return;
  answerKey.answers.forEach(({ key, value }) => {
    const item = activity.items.find((it) => it.text === key);
    if (item) item.correct = value;
  });
}
function extractResponsePairs(answerMd) {
  const tokens = Lexer.lex(answerMd);
  const sections = parseSectionsFromTokens(tokens);
  const responsesText = (sections.get("Responses") || []).map((t) => t.raw || t.text || "").join("\n");
  const pairs = [];
  const re = /\d+\.\s*\*\*([^*]+)\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(responsesText)) !== null) {
    pairs.push({ text: m[1].trim(), selected: m[2].trim() });
  }
  return pairs;
}
function buildResultsFromAnswerMd(activity, answerMd) {
  const parsed = parseAnswersFromMarkdown(answerMd);
  const answers = parsed.answers || {};
  const explanations = parsed.explanations || {};
  const type = String(activity.type || "");
  if (/^multiple choice$/i.test(type)) {
    const questions = activity.mcq && activity.mcq.questions;
    if (!questions) return [];
    return questions.map((q, idx) => {
      const sel = answers[idx];
      const selected = Array.isArray(sel) ? sel.join(", ") : sel || "";
      const correct = q.options.filter((o) => o.correct).map((o) => o.label).join(", ");
      const result = {
        text: q.name && String(q.name).trim() || `Question ${idx + 1}`,
        selected,
        correct
      };
      if (explanations[idx]) result.explanation = explanations[idx];
      return result;
    });
  }
  if (/^fill in the blanks$/i.test(type)) {
    const blanks = activity.fib && activity.fib.blanks || [];
    return blanks.map((blank, idx) => ({
      text: `Blank ${idx + 1}`,
      selected: answers[idx] || "",
      correct: blank.answer || ""
    }));
  }
  if (/^matching$/i.test(type)) {
    const items2 = activity.matching && activity.matching.items || [];
    return items2.map((item, idx) => ({
      text: `Item ${idx + 1}`,
      selected: answers[idx] || "",
      correct: item.answer || ""
    }));
  }
  if (/^sort into boxes$/i.test(type)) {
    const items2 = activity.items || [];
    const pairs2 = extractResponsePairs(answerMd);
    return items2.map((item, idx) => {
      const pair = pairs2.find((p) => p.text === item.text);
      return {
        text: item.text || `Item ${idx + 1}`,
        selected: pair ? pair.selected : answers[idx] || "",
        correct: item.correct || ""
      };
    });
  }
  if (/^matrix$/i.test(type)) {
    const matrix = activity.matrix || {};
    const rows = matrix.rows || [];
    const columns = matrix.columns || [];
    const correctByRow = matrix.correctColumnIndexByRow || [];
    return rows.map((rowLabel, idx) => {
      const result = {
        text: `Row ${idx + 1}`,
        selected: answers[idx] || "",
        correct: columns[correctByRow[idx]] || ""
      };
      if (explanations[idx]) result.explanation = explanations[idx];
      return result;
    });
  }
  if (/^text input$/i.test(type)) {
    const questions = activity.textInput && activity.textInput.questions || [];
    return questions.map((q, idx) => {
      const answerCandidates = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0 ? q.correctAnswers : [{ correctAnswer: q.correctAnswer || "" }];
      const correctText = answerCandidates.map((c) => typeof c === "string" ? c : c.correctAnswer).filter(Boolean).join(" | ");
      return {
        text: q.name && String(q.name).trim() || `Question ${idx + 1}`,
        selected: answers[idx] || "",
        correct: correctText || q.correctAnswer || ""
      };
    });
  }
  const items = activity.items || [];
  const pairs = extractResponsePairs(answerMd);
  return items.map((item, idx) => {
    const pair = pairs.find((p) => p.text === item.text);
    return {
      text: item.text || `Item ${idx + 1}`,
      selected: pair ? pair.selected : answers[idx] || "",
      correct: item.correct || ""
    };
  });
}
function main() {
  const args = parseArgs(process.argv);
  if (!args.question || !args.answer || !args.answerKey || !args.report || !args.score) {
    usage();
  }
  const questionMd = fs.readFileSync(args.question, "utf8");
  const answerMd = fs.readFileSync(args.answer, "utf8");
  const answerKeyMd = fs.readFileSync(args.answerKey, "utf8");
  const activity = buildActivityFromMarkdown(questionMd);
  const answerKey = parseAnswerKey(answerKeyMd);
  mergeAnswerKeyIntoActivity(activity, answerKey);
  const results = buildResultsFromAnswerMd(activity, answerMd);
  const reportMarkdown = buildActivityReportMarkdown(activity, results);
  const scoreJson = JSON.stringify(buildScoreJson(activity, results), null, 2);
  const reportDir = path.dirname(args.report);
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(args.report, reportMarkdown, "utf8");
  const scoreDir = path.dirname(args.score);
  if (!fs.existsSync(scoreDir)) fs.mkdirSync(scoreDir, { recursive: true });
  fs.writeFileSync(args.score, scoreJson, "utf8");
  console.log(`Report written to ${args.report}`);
  console.log(`Score written to ${args.score}`);
}
main();
