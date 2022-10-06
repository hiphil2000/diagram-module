"use strict";
/// <reference path="./dependencies/jquery.js" />
/// <reference path="./dependencies/backbone.js" />
/// <reference path="./dependencies/lodash.js" />
/// <reference path="./dependencies/joint.js" />

/*!
Entity Relation Diagramming Library
Inbrien
*/

// ERDView
(function(window) {
	/// <summary>
	/// ERD View Class
	/// </summary>

	var $ERDView = (function() {
		var privates = new WeakMap();
		var _ = function (self) {
			/// <summary>
			/// Private 접근 Shourtcut입니다.
			/// </summary>

			return privates.get(self);
		}
		var _set = function (self, key, value) {
			/// <summary>
			/// Private variable을 설정합니다.
			/// </summary>

			var _ = privates.get(self);
			if (_[key] instanceof Object) {
				Object.assign(_[key], value);
			} else {
				_[key] = value;
			}
			privates.set(self, _);
		};

		var ERDView = function(options) {
			/// <summary>
			/// ERD View의 Constructor
			/// </summary>

			// Initialize privgate variables
			privates.set(this, {
				// Constructor를 통해 받은 View Options
				options: options,
				// ERD View의 Graph(model)
				graph: options.graph,
				// ERD View의 Container Element
				container: null,
				// ERD View의 View Element(JointJS Paper Element)
				view: null,
				// ERD View의 JointJS Paper Object
				paper: null,
				// Panning Event Data
				panData: {
					backgrounds: [],
					isWorking: false,
					transform: null,
					anchorX: null,
					anchorY: null,
					transformX: null,
					transformY: null
				}
			});

			// Initialize properties
			Object.defineProperties(this, {
				options: {
					get() { return _(this).options; }
				},
				paper: {
					get() { return _(this).paper; }
				},
				graph: {
					get() { return _(this).graph; }
				},
				view: {
					get() { return _(this).view; }
				},
				container: {
					get() { return _(this).container; }
				},
			});

			// Create DOMs
			createDOMs.call(this);

			// Initialize ERD View
			initialize.call(this);
		}
		
		function createDOMs() {
			/// <summary>
			/// 필요한 DOM을 생성합니다.
			/// </summary>

			var containerEl = this.options.el;
			var viewEl = document.createElement("div");
			viewEl.id = containerEl.id + "-view";
			containerEl.appendChild(viewEl);

			_set(this, "container", containerEl);
			_set(this, "view", viewEl);
		}

		function initialize() {
			/// <summary>
			/// ERD View instance를 초기화합니다.
			/// </summary>

			// Initialize JointJS Paper
			_set(this, "paper", new joint.dia.Paper({
				el: this.view,
				model: this.graph,
				cellViewNamespace: this.options.namespace,
			}));

			// Set panning feature
			// Panning이 가능한 Element 목록을 초기화합니다.
			_set(this, "panData", {
				backgrounds: [].concat(this.container, this.view, Array.from(this.view.querySelectorAll("svg")))
			});
			window.addEventListener("mousedown", handlePanStart.bind(this));
			window.addEventListener("mousemove", handlePanning.bind(this));
			window.addEventListener("mouseup", handlePanEnd.bind(this));
			window.addEventListener("pointerup", handlePanEnd.bind(this));
		}

		function handlePanStart(e) {
			/// <summary>
			/// Pan Start Event를 처리합니다.
			/// </summary>

			var panData = _(this).panData;
			if (panData.isWorking) {
				return;
			}
			if (!panData.backgrounds.includes(e.target)) {
				return;
			}
			
			var translate = parseTranslate(this.view.style.transform);

			panData.isWorking = true;
			panData.anchorX = e.clientX;
			panData.anchorY = e.clientY;
			panData.transformX = translate[0];
			panData.transformY = translate[1];
		}
		
		function handlePanning(e) {
			/// <summary>
			/// Panning(mouse move) Event를 처리합니다.
			/// </summary>

			var panData = _(this).panData;
			if (!panData.isWorking) {
				return;
			}

			var computeX = panData.transformX + (e.clientX - panData.anchorX);
			var computeY = panData.transformY + (e.clientY - panData.anchorY);

			this.view.style.transform = toTranslate(computeX, computeY);
		}

		function handlePanEnd(e) {
			/// <summary>
			/// Pan End Event를 처리합니다.
			/// </summary>

			var panData = _(this).panData;
			if (!panData.isWorking) {
				return;
			}

			_set(this, "panData", {
				isWorking: false,
				anchorX: null,
				anchorY: null,
				transformX: null,
				transformY: null,
			});
		}

		function parseTranslate(transform) {
			/// <summary>
			/// transform의 translate를 추출합니다.
			/// </summary>
			/// <param name="transform">css transform string</param>
			/// <returns>translate[x, y]</returns>
			
			var match = transform.match(/translate\(([^,]+),([^,]+)\)/);
			return match == null ? [0, 0] : match.slice(1, 3).map(function(x){return parseInt(x.replace("px", ""));});
		}

		function toTranslate(x, y) {
			/// <summary>
			/// translate array를 transform string으로 변환합니다.
			/// </summary>
			/// <param name="x">translate x</param>
			/// <param name="y">translate y</param>
			/// <returns>transform string</returns>
			
			return `translate(${x}px, ${y}px)`;
		}

		return ERDView;
	})();
	
	window.$ERDView = window.$ERDView || $ERDView;
})(window);


// ERDPreview
(function(window, joint, util) {
	/// <summary>
	/// ERD Preview Class
	/// </summary>

	var ERDPreviewElementView = joint.dia.ElementView.extend({
		body: null,
		markup: [{
			tagName: "rect",
			selector: "body",
			attributes: {
				fill: "#31d0c6"
			}
		}],
		initFlag: ["RENDER", "UPDATE", "TRANSFORM"],
		presentationAttributes: {
			size: ["UPDATE"],
			position: ["TRANSFORM"],
		},
		confirmUpdate: function(flags) {
			if (this.hasFlag(flags, "RENDER")) this.render();
			if (this.hasFlag(flags, "UPDATE")) this.update();
			if (this.hasFlag(flags, "TRANSFORM")) this.updateTransformation();
		},
		render: function() {
			var doc = util.parseDOMJSON(this.markup);
			this.body = doc.selectors.body;
			this.el.appendChild(doc.fragment);
		},
		update: function() {
			var size = this.model.size();
			this.body.setAttribute("width", size.width);
			this.body.setAttribute("height", size.height);
		}
	})
	
	var $ERDPreview = function(options) {
		this._options = options;
		this._graph = options.graph;

		this.initialize();
	}

	$ERDPreview.prototype.initialize = function() {
		var paper = new joint.dia.Paper({
			el: this._options.el,
			model: this._graph,
			cellViewNamespace: {},
			width: 100,
			height: 100,
			interactive: false,
			elementView: ERDPreviewElementView
		});

		paper.scale(0.12);

		this.paper = paper;
	};

	$ERDPreview.prototype.computePreviewFrame = function() {

	}

	window.$ERDPreview = window.$ERDPreview || $ERDPreview;
})(window, joint, joint.util);

// ERDApp
(function(window) {
	/// <summary>
	/// ERD App Class
	/// </summary>

	/// <summary>
	/// ERD 공용으로 사용되는 namespace 입니다.
	/// </summary>

	var $ERDApp = function(options) {
		this._options = options;
		this.initialize();
	}

	$ERDApp.prototype.initialize = function() {
		if (!window.joint || !Backbone.$) {
			console.error("JointJS 혹은 Backbone의 jQuery 설정이 올바르지 않습니다.");
		}

		if (this._options.beforeInit instanceof Function) {
			this._options.beforeInit.call(this);
		}

		var namespace = Object.assign({}, joint.shapes);
		console.log(namespace);
		
		var graph = new joint.dia.Graph({}, {
			cellNamespace: namespace
		});

		var view = new window.$ERDView({
			el: this._options.viewEl,
			graph: graph,
			namespace: namespace,
		});

		if (this._options.previewEl) {
			var preview = new window.$ERDPreview({
				el: this._options.previewEl,
				graph: graph,
				namespace: namespace,
			});
		}

		this.graph = graph;
		this.view = view;
		this.preview = preview;

		if (this._options.afterInit instanceof Function) {
			this._options.afterInit.call(this);
		}
	}

	window.$ERDApp = window.$ERDApp || $ERDApp;
})(window);

// TableElement & View
(function(window) {
	var tableElement = joint.dia.Element.extend({
		defaults: {
			type: "sdtm.TableElement",
			tableName: "",
			rows: [],
			rowHeight: 28,
			minWidth: 200,
			attrs: {
				".table_body": {
					refWidth: "100%",
					refHeight: "100%",
					fill: "#FFFFFF",
					stroke: "#000000",
					strokeWidth: "1",
				},
				text: {
					fontFamily: "Arial",
					fontSize: 13,
					stroke: "none",
					fill: "#000000"
				},
				".table_name": {
					refX: 8,
					refY: 14,
					textVerticalAnchor: "middle"
				},
				".rows": {
					refX: 0,
				},
				".row": {
					fill: "transparent"
				},
				".btn_row-add": {
					transform: "translate(185, -20)",
					cursor: "pointer"
				}
			},
			markup: `
				<rect class="table_body" />
				<text class="table_name" />
				<g class="rows"></g>
			`,
			rowMarkup: `
				<g class="row">
					<rect class="row_body" />
					<text class="row_name" />
					<text class="row_type" />
				</g>
			`,
			ports: {
				groups: {
					"relation": {
						// position: "left",
						// FIXME: port position randomized for dev
						position: Math.floor(Math.random() * 10) % 2 === 0 ? "left" : "right",
						attrs: {
							circle: {
								magnet: true,
								r: 8
							}
						}
					}
				}

			},
			size: {
				width: 200,
				height: 28
			},
		},
		initialize: function(attributes, options) {
			joint.dia.Element.prototype.initialize.call(this, attributes, options);
			
			this.on("change:rows", this.handleRowsChange, this);
			this.on("change:rowHeight", function() {
				this.attr(".options/refY", this.rowHeight, {silent: true});
			}, this);
	
			
			this.handleRowsChange();
		},
		
		handleRowsChange: function() {
			// update attrs
			const rows = this.get("rows");
	
			// 신규에 없는 attr 삭제
			const attrs = this.get("attrs");
			ForEachObject(attrs, (item, key) => {
				key = key.toString();
	
				if (!key.startsWith(".row")) {
					return;
				}
	
				if (!rows.find(r => key.toString().includes("." + r.id))) {
					this.removeAttr(key.toString(), {silent: true});
				}
			});
			
			// 생성하지 않은 attr 생성
			const keys = Object.keys(attrs);
			const rowHeight = this.get("rowHeight");
			const rowWidth = this.get("minWidth");
			let offsetY = rowHeight;
			rows.forEach((row) => {
				if (!keys.find(k => k === row.id)) {
					attrs[".row." + row.id] = {transform: `translate(0, ${offsetY})`, stroke: "#000000"};
					attrs[".row." + row.id + " .row_body"] = {width: rowWidth, height: rowHeight};
					attrs[".row." + row.id + " .row_name"] = {text: row.name, refX: 16, refY: rowHeight / 2, textVerticalAnchor: "middle"};
					attrs[".row." + row.id + " .row_type"] = {text: row.type, refX: 100, refY: rowHeight / 2, textVerticalAnchor: "middle"};
					
					offsetY += rowHeight;
	
					const portY = offsetY - rowHeight / 2
	
					if (!this.getPort(row.id)) {
						this.addPort({
							group: "relation",
							id: row.id,
							args: {
								y: portY
							},
						})
					} else {
						this.portProp(row.id, "args/y", portY);
					}
	
				}
			})
	
			this.attr(attrs);
	
			this.adjustLayout();
		},
		
		adjustLayout: function() {
			const width = this.get("minWidth");
			const height = ((this.get("rows").length) + 1) * this.get("rowHeight");
	
			this.resize(width, height);
		},
	
		addRow: function(row) {
			const rows = structuredClone(this.get("rows"));
			rows.push(row);
			this.set("rows", rows);
		},

	}, joint.dia.Element.prototype.defaults);

	var tableElementView = joint.dia.ElementView.extend("sdtm.TableElementView", {
		ROW_ID: "row-id",
		events: {
			"click .btn_row-add": "onAddRow"
		},
		presentationAttributes: joint.dia.ElementView.addPresentationAttributes({
			rows: ["ROWS"]
		}),
		confirmUpdate(flag, opt) {
			joint.dia.ElementView.prototype.confirmUpdate.apply(this, arguments);
			if (this.hasFlag(flag, "ROWS")) {
				this.renderRows();
				return 1;
			} else {
				return 0;
			}
		},	
		renderMarkup() {
			joint.dia.ElementView.prototype.renderMarkup.apply(this, arguments);
			this.$rows = this.$(".rows");
			this.rowElem = V(this.model.get("rowMarkup"));
	
			this.renderRows();
		},	
		renderRows() {
			const rows = this.model.get("rows");
	
			// 신규 Attr에 없는 Element 삭제
			this.$rows.find(".row").each((idx, elem) => {
				if (!rows.find(r => r.id === elem.getAttribute(TableView.ROW_ID))) {
					elem.remove();
				}
			});
	
			rows.forEach((row) => {
				if (this.$rows.find(".row." + row.id).length === 0) {
					const newElem = this.rowElem.clone().addClass(row.id);
					newElem.attr(TableView.ROW_ID, row.id);
					this.$rows.append(newElem.node);
				}
			});
	
			this.update();
		},	
		onAddRow() {
			this.model.addRow({
				id: v4(),
				name: "TestName",
				type: "TestType"
			});
		}
	});

	joint.shapes.sdtm = joint.shapes.sdtm || {};
	Object.assign(joint.shapes.sdtm, {TableElement: tableElement, TableElementView: tableElementView});

	function ForEachObject(object, iterator) {
		const keys = Object.keys(object);
		keys.forEach(key => {
			const item = object[key];
			iterator(item, key);
		});
	}

})(window);

// HTML Element & View
(function(window){
	if (!document.getElementById("css-sdtm-htmlelement")) {
		var style = document.createElement("style");
		style.id = "css-sdtm-htmlelement";
		style.innerHTML = `
			.html-element {
				display: flex;
				flex-direction: column;
				position: absolute;
				overflow: hidden;
				user-select: none;
				pointer-events: none;
			}

			.html-element * {
				pointer-events: initial;
			}
		`
		var ref = document.querySelector("script");
		ref.parentNode.insertBefore(style, ref);
	}

	joint.shapes.sdtm.HtmlElement = joint.dia.Element.extend({
		defaults: joint.util.deepSupplement({
			type: "sdtm.HtmlElement",
			data: {
				text: "",
				select: "",
				checkbox: false,
			},
			attrs: {
				rect: {width: 100, height: 100}
			},
			size: {
				width: 100,
				height: 100
			},
			markup: `
				<rect tabindex="0" />
			`
		}, joint.dia.Element.prototype.defaults)
	});

	function api() {
		return new Promise((res, rej) => {
			setTimeout(() => {
				res({
					jsonData: [
						{text: "dropdown1", value: "1"},
						{text: "dropdown2", value: "2"},
						{text: "dropdown3", value: "3"},
						{text: "dropdown4", value: "4"},
					]
				});
			}, 1000);
		})
	}
	
	joint.shapes.sdtm.HtmlElementView = joint.dia.ElementView.extend({
		template: [
			'<div class="html-element" style="position: absolute;">',
				'<input class="input" type="text" name="text" value="" />',
				'<select name="select"></select>',
				'<label><input type="checkbox" name="checkbox" checked="false" /> checkbox</label>',
			'</div>'
		].join(""),

		initialize: function() {
			joint.dia.ElementView.prototype.initialize.apply(this, arguments);
			
			this.$DOM = $(this.template);

			this.$text = this.$DOM.find('input[name="text"]');
			this.$text.on("input", this.handleData.bind(this));

			this.$select = this.$DOM.find('select[name="select"]');
			this.$select.on("change", this.handleData.bind(this));

			this.$checkbox = this.$DOM.find('input[name="checkbox"]');
			this.$checkbox.on("change", this.handleData.bind(this));
			
			this.model.on("change", this.updateDOM, this);
			this.updateDOM();
		},
		
		render: function() {
			joint.dia.ElementView.prototype.render.apply(this, arguments);
			this.paper.$el.append(this.$DOM);
			this.updateDOM();

			var self = this;
			api().then(function(res) {
				self.$select.html("");
				res.jsonData
					.map(function(item) {
						var option = document.createElement("option");
						option.innerText = item.text;
						option.value = item.value;
						return option;
					})
					.forEach(function(opt) {
						self.$select.append(opt);
					});
			});

			return this;
		},

		updateDOM: function() {
			var bbox = this.model.getBBox();

			this.$DOM.css({
				width: bbox.width,
				height: bbox.height,
				transform: `translate(${bbox.x}px, ${bbox.y}px)`
			});
		},	

		handleData: function(e) {
			var target = e.target;
			var data = this.model.prop("data");
			
			switch(target.name) {
				case "text":
				case "select":
					data[target.name] = target.value;
					break;
				case "checkbox":
					data[target.name] = target.checked;
					break;
			};

			this.model.prop("data", data);
			console.log(this.model.prop("data"));
		},
	})
})(window);