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
		var _options;
		var _graph;
		var _container;
		var _view;
		var _paper;

		var ERDView = function(options) {
			_options = options;
			_graph = options.graph;

			Object.defineProperty(this, "options", {
				get() { return _options; }
			});
			Object.defineProperty(this, "paper", {
				get() { return _paper; }
			});
			Object.defineProperty(this, "graph", {
				get() { return _graph; }
			});
			Object.defineProperty(this, "view", {
				get() { return _view; }
			});
			Object.defineProperty(this, "container", {
				get() { return _container; }
			});
			
			createDOMs.call(this);
			initialize.call(this);
		}
		
		
		function createDOMs() {
			var containerEl = _options.el;
			var viewEl = document.createElement("div");
			viewEl.id = containerEl.id + "-view";
			containerEl.appendChild(viewEl);

			_container = containerEl;
			_view = viewEl;
		}

		function initialize() {
			var paper = new joint.dia.Paper({
				el: _view,
				model: _graph,
				cellViewNamespace: _options.namespace,
			});

			_paper = paper;
		}

		return ERDView;
	})();
	
	window.$ERDView = window.$ERDView || $ERDView;
})(window);


// ERDPreview
(function(window) {
	/// <summary>
	/// ERD Preview Class
	/// </summary>
	
	var $ERDPreview = function(options) {
		this._options = options;
		this._graph = options.graph;

		this.initialize();
	}

	$ERDPreview.prototype.initialize = function() {
		var paper = new joint.dia.Paper({
			el: this._options.el,
			model: this._graph,
			cellViewNamespace: this._options.namespace,
			width: 100,
			height: 100,
			interactive: false,
		});

		paper.scale(0.12);

		this.paper = paper;
	};

	$ERDPreview.prototype.computePreviewFrame = function() {

	}

	window.$ERDPreview = window.$ERDPreview || $ERDPreview;
})(window);

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