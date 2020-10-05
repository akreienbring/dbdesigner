// Copyright 2016 by Prahlad Yeri
// Copyright 2020 by André Kreienbring
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 3 as published by
// the Free Software Foundation.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


import jsplumb from "jsplumb";

import {Table, Field} from "./classes.js";
import {utils} from "./utils.js";
import {Logger} from "./js-log.js";
import {zoomit} from "./zoomit.js";
import {storage} from "./localStorage.js";
import {jsPlumbHelper} from "./jsPlumbHelper.js";


//window.jQuery = $; window.$ = $;
//jQuery.noConflict();

const logger = Logger.getClassLogger("App");
Logger.disableAll();

/**
 * The main application that represents the single page App.
 * In particular it creates the canvas and the tables with their connection
 * by using jsPlump for this purpose.
 * It also maintains the storage by providing several functions that access the storage
 */
class App {
	constructor(){
		this.tableTemplate = "";
		this.isStorageReady = false;
	};
	
	
	/**
	 * Create a string that contains field attributes
	 * @param field the field with attributes set
	 * @param all If true, the primary attribute is included
	 * @param asHTML If true, the attributes are displayed as HTML checkboxes
	 * @return a string of the attributes separated by comma
	 * @see updateFieldRow
	 * @see createFieldRow
	 * @see tableDialog.addField()
	 */
	createAttributes(field, all, asHTML){
		
		if(!asHTML){
			const attributes = [];
			if (field.primaryKey && all) attributes.push('Primary');
			if (field.unique) attributes.push('Unique');
			if (field.uniqueComposite) attributes.push('Unique Composite');
			if (field.deleteCascade) attributes.push('Delete Cascade');
			if (field.notNull) attributes.push('Not Null');
			return attributes.length > 0 ? attributes.join(',') : "";
		}else{
			let attributesHTML =  "<div class='form-check form-check-inline'>"
				if(all){
					attributesHTML += 
						"<input class='form-check-input form-control-xs' type='checkbox' value='primary' disabled" + (field.primaryKey? " checked": "") + ">" +
						"<label class='form-check-label form-control-xs'>P</label>"  +
			  			 "<input class='form-check-input form-control-xs ml-1' type='checkbox' value='deletecascade' disabled" + (field.deleteCascade? " checked": "") + ">" +
						 "<label class='form-check-label form-control-xs'>DC</label>"
				};  			 
						
				attributesHTML += 		 
			  			 "<input class='form-check-input form-control-xs ml-1' type='checkbox' value='unique' disabled" + (field.unique? " checked": "") + ">" +
						 "<label class='form-check-label form-control-xs'>U</label>" +
			  			 "<input class='form-check-input form-control-xs ml-1' type='checkbox' value='uniquecomposite' disabled" + (field.uniqueComposite? " checked": "") + ">" +
						 "<label class='form-check-label form-control-xs'>UC</label>" +
			  			 "<input class='form-check-input form-control-xs ml-1' type='checkbox' value='notnull' disabled" + (field.notNull? " checked": "") + ">" +
						 "<label class='form-check-label form-control-xs'>N</label>" +
					 "</div>";
			
			return attributesHTML;
		};
	};
	
	
	deleteTableDiv(table){
		const tableDiv = dbdesigner.namespaceWrapper +  "#tblDiv" + table.id;  //this is the surrounding DIV
		jsPlumbHelper.jsPlumbInstance.remove(jQuery(tableDiv));
	};
	
	/**
	 * Deletes the given field from the table on the Canvas / Panel.
	 * The jsPlumb endpoints are also deleted.
	 * @see deleteField()
	 */
	deleteFieldRow(field){
		const tableDiv = dbdesigner.namespaceWrapper +  "#tblDiv" + field.tableId;  //this is the surrounding DIV
		const $fieldRow = jQuery(tableDiv + " tbody tr#" + field.tableId + "\\." + field.id); //this is the fieldRow on the canvas
		
		//remove and empty repaint the whole table and therefore reposition endpoints when the table was zoomed
		if (field.pkEndpoint){
			jsPlumbHelper.jsPlumbInstance.deleteEndpoint(field.pkEndpoint);
		};
 		jsPlumbHelper.jsPlumbInstance.deleteEndpoint(field.fkEndpoint);
		jQuery($fieldRow).remove();
	};
	
	/**
	* Updates the given field with new values. JsPlumb anchors are checked.
	* @see updateField()
	*/
	updateFieldRow(field){
		const tableDiv = dbdesigner.namespaceWrapper +  "#tblDiv" + field.tableId;  
		const $fieldRow = jQuery(tableDiv + " tbody tr#" + field.tableId + "\\." + field.id); 
		
		$fieldRow.find(".fieldName").html(utils.shortenString(field.name, 13));
		$fieldRow.find(".fieldType").html(field.type.replace("=True","") + (field.size > 0 ? '(' + field.size + ')' : ''));
		$fieldRow.find(".fieldAttributes").html(this.createAttributes(field, false, true));
		
		this.checkEndpoints(field);
	};
	
	/**
	* Creates and adds the HTML of a field row to the DOM. Also the jsPlumb endpoinst are added to the anchor DIV's'
	* @param field The field that is added to a table on the canvas / panel
	* @see createThePanel()
	* @see createField()
	*/
	createFieldRow(field){
		const tableDiv = dbdesigner.namespaceWrapper +  "#tblDiv" + field.tableId;  
		const $fieldRow = jQuery("<tr id='" + field.tableId + "." + field.id + "'>" +
			"<td>" +
				"<div ffname='" + field.tableId + "." + field.id + "' class='anchor invisible'>|</div>" + //jsPlumb anchor
			"</td>" +
			"<td class='roControl'>" +
				"<div class='row-up' onmousedown='dbdesigner.moveField(\"" + field.tableId + "\",\"" + field.id + "\", -1)'><i class='fas fa-caret-up fa-sm fa-fw'></i></div>" +
				"<div class='row-down' onmousedown='dbdesigner.moveField(\"" + field.tableId + "\",\"" + field.id + "\", 1)'><i class='fas fa-caret-down fa-sm fa-fw'></i></div>" +
			"</td>" +
			"<th scope='row' class='fieldInfo fieldName popoverText' data-toggle='popover'>" + utils.shortenString(field.name, 13) +
			"</th>" +
			"<td class='fieldInfo fieldType'>" + field.type.replace("=True","") + (field.size > 0 ? '(' + field.size + ')' : '') + "</td>" +
			"<td class='fieldInfo fieldAttributes'>" + this.createAttributes(field, false, true) + "</td>" +
			"<td>" + 
				"<div fpname='"  + field.tableId + "." + field.id + "' class='anchor invisible'>|</div>" +  //jsPlumb anchor
			"</td>" +
		"</tr>");
		
		jQuery(tableDiv + " tbody").append($fieldRow);
		
		const $fieldName = $fieldRow.find(".fieldName");
		
		//for trigger by focus use (add onClick...) See: dbdesigner.togglePopup
		$fieldName.popover({title: "Field", container: "body", html: true, trigger: "hover", animation: true, content: function (){
			const fieldRow = jQuery(this).closest("tr").get(0);			
			const tableId = fieldRow.id.split(".")[0];
			const fieldId = fieldRow.id.split(".")[1];
			const field = dbdesigner.tables[tableId].fields[fieldId];
			
			return 	"<div style='min-width:150px;'>" + 
						"<span class='fas fa-info-circle fa-lg'></span>" +
						"<div><b>Name:</b> " + field.name + "</div>" +
						"<div><b>Type:</b> " + (field.type == "Serial" ? "Serial (Integer)" : field.type) + "</div>" +
						"<div><b>Size:</b> " + field.size + "</div>" +
						"<div><b>Default:</b> " + (field.defaultValue ? field.defaultValue : "") + "</div>" +
						"<div><b>Attributes:</b> " + app.createAttributes(field, true, false) + "</div>" +
					"</div>";
 		}});
	
		this.checkEndpoints(field);
	};
	
	/**
	 * Adds or removes the jsPlumb endpoints on the given field (row);
	 * @see createFieldRow()
	 * @see updateFieldRow()
	 */
	checkEndpoints(field){
		const tableDiv = dbdesigner.namespaceWrapper +  "#tblDiv" + field.tableId;  

		if (field.primaryKey && field.pkEndpoint == null) {
			// Create an endpoint for PK connections
			//Important: Add a class to the endpoint! That is necessary for identifying the endpoint when zooming!
			const $pkAnchor = jQuery(tableDiv + " div[fpname='" + field.tableId + "." +  field.id + "']");
			field.pkEndpoint = jsPlumbHelper.jsPlumbInstance.addEndpoint($pkAnchor, {
				endpoint: ["Rectangle", {cssClass: 'zoomablePk' + field.tableId + "_" + field.id, width:zoomit.initialEndpointWidth, height:zoomit.initialEndpointHeight}] ,
		        isSource: true, //don't put this in the endpoint type!
				type:"primary",
				anchor:[0.5, 0.5, 0, 0], //right anchor curve from middle
				//scope: field.type,
				connectorOverlays: [ 
					[ "Arrow", { width:10, height:10, location:1, id:"arrow"}],
				]
			});
		} else if(!field.primaryKey && field.pkEndpoint != null){
			//delete the endpoint
			jsPlumbHelper.jsPlumbInstance.deleteEndpoint(field.pkEndpoint);
			field.pkEndpoint = null;
		}; //check primary key
		
		if(field.fkEndpoint == null){
			// Create an endpoint for FK connections
			const $fkAnchor = jQuery(tableDiv + " div[ffname='" + field.tableId + "." +  field.id + "']");
			field.fkEndpoint = jsPlumbHelper.jsPlumbInstance.addEndpoint($fkAnchor, {
				endpoint: ["Rectangle", {cssClass: 'zoomableFk' + field.tableId + "_" + field.id, width:zoomit.initialEndpointWidth, height:zoomit.initialEndpointHeight}] ,
		        isTarget: true,
				type: field.deleteCascade ? "foreignDC" : "foreign",
				anchor:[0.5, 0.5, 0, 0] //left anchor curve from middle
				//scope: field.type,
			});
		} else {
			//set the correct type of the endpoint
			field.deleteCascade ? field.fkEndpoint.setStyle({fill:"red", outlineStroke:"black", outlineWidth:1}) : field.fkEndpoint.setStyle({fill:"blue", outlineStroke:"black", outlineWidth:1});
		};
	};
	
	/**
	 * Recalculate the position of the (primary) endpoints. Their position may be changed by changing fieldnames 
	 * or when the table was reordered
	 * @param fields An array of HTML fields / rows that need to be revalidated
	 * @see createThePanel()
	 * @see updateField()
	 */
	revalidateFields(fields){
		let table;
		let field;
		
		//reposition all rows as they were shifted
		for(let i = 0; i < fields.length; i++){
			jsPlumbHelper.jsPlumbInstance.revalidate(fields[i]);	
			
			if(zoomit.currentZoom != 1){
				//as jsPlumb can not deal with the way we are zooming, the endpoints are readjusted.
				table = dbdesigner.tables[fields[i].id.split(".")[0]];
				field = table.fields[fields[i].id.split(".")[1]];
				zoomit.adjustJsPlumbEndpoints(table, field);
			};	
		};
	};
	
	/**
	 * Reads all settings from the tableDialog and positions a new table in the canvas
	 * jsPlumb is used to make the table draggable and show the endpoints to create relations
	 * @param table The table that must be inserted to the canvas
	 * @param isLoading If true the created table will not be zoomed
	 * @see loadCanvasState()
	 * @see tableDialog.saveData()
	 */
	createThePanel(table, isLoading){
		const logger = Logger.getFunctionLogger("App", "createThePanel");

		const tableDiv = dbdesigner.namespaceWrapper +  "#tblDiv" + table.id;  //this is the surrounding DIV
		
    	let tableHtml = this.tableTemplate.format({tableId: table.id});
    	tableHtml = tableHtml.format({tableName: table.name});
	    jQuery(dbdesigner.namespaceWrapper + "#theCanvas").append(tableHtml); 

    	//position the table on the canvas
		//new tables will be positioned at (0,0)
		jQuery(tableDiv).css({
			left: table.position.x,
			top: table.position.y
		});
		
		//get a zoom instance and store it with the table
		table.panzoom = zoomit.makeTableZoomable(jQuery(tableDiv)[0]);
    	
	    //Now lets build the new panel for the given table
	    jQuery.each(table.fields, (fieldId, field) =>{
	    	
	    	logger.info("Processing: " + JSON.stringify(field));
	    	logger.debug("Row length: ", tableDiv, "::", jQuery(tableDiv + " .table tbody tr").length);

			this.createFieldRow(field);
	    }); //JQuery.each field

 		//Add an event that reacts on the move up/down controls
		jQuery(tableDiv).children(".tableDesign").on("click", ".row-up, .row-down", function () {
			const $fieldRow = jQuery(this).closest("tr");
			const $tbody = $fieldRow.closest("tbody");
			const rows = $tbody.children("tr").get();
			if (rows.length == 1) return;
			
			let revalidateFields = rows;
			
			if(jQuery(this).is('.row-up')){
				if($fieldRow.index() != 0){
					$fieldRow.insertBefore($fieldRow.prev());
					//only two rows need to be revalidated
					revalidateFields = [rows[$fieldRow.index()], rows[$fieldRow.index() + 1]];
				}else{
					$tbody.append($fieldRow.get());	
				};
			}else{
				if($fieldRow.index() != rows.length - 1){
					$fieldRow.insertAfter($fieldRow.next());	
					revalidateFields = [rows[$fieldRow.index()], rows[$fieldRow.index() - 1]];
				}else{
					$tbody.prepend($fieldRow.get());
				};
			};
			
			app.revalidateFields(revalidateFields);
		});
		
		// Make table draggable
		jsPlumbHelper.jsPlumbInstance.draggable(jQuery(tableDiv), {
		   //containment: true,
		   containment: "parent", 
		   stop: (event, ui) => {
			   //as this seems to be triggered on a button click => only react when position has changed
			   if(dbdesigner.tables[table.id].position.x != event.pos[0] + 'px' || dbdesigner.tables[table.id].position.y != event.pos[1] + 'px'){
				   dbdesigner.tables[table.id].position.x = event.pos[0] + 'px';
				   dbdesigner.tables[table.id].position.y = event.pos[1] + 'px';
				   this.updateTable(dbdesigner.tables[table.id], false);
			   };
		   }
		});
		
	    if (!isLoading && zoomit.currentZoom != 1) {
			//when loading the zooming is done by loadCanvasState()
			//the timeout solves the problem of not firing the "transitionend" event after zooming!
			setTimeout(function() {
				zoomit.zoomTable(table);
			}, 0);			
	    };
	}; //createThePanel
	
	/**
	 * A JSON is converted to valid tables which are shown on the canvas. Used by 'ImportCanvas´
	 * and called when exiting tables are stored in the local storage on application start
	 * @param appData An object that represents the canvas state.
	 * @param isImport If true a json was imported and the canvas must be cleared and saved after loading
	 * @see app.start(), dbdesigner.importCanvas()
	 */
	loadCanvasState(appData, isImport){
		try {
			logger.log("Loading the canvas");
			
			if(isImport){
				// Clear canvas and set dbdesigner.tables to {} (empty object) to start from a blank state
				this.clearCanvas();
			};
			
			zoomit.currentZoom = appData.zoom;
			
			// Temporarily suspend drawing to speed up load time
			jsPlumbHelper.jsPlumbInstance.setSuspendDrawing(true);
		
			//import the table structures
			jQuery.each(appData.strTables, (tableId, tableData) => {
				dbdesigner.tables[tableId] = new Table(tableData.name);
				
				const table = dbdesigner.tables[tableId];
				table.fields = {};
				table.position = tableData.position;
				table.id = (tableData.id? tableData.id : 0);
				jQuery.each(tableData.fields, function(fieldId,field) {
					table.fields[fieldId] = new Field(field);
				});
				
				//table, isLoading
				this.createThePanel(table, true);
			});
				
			// Create the connections
			jsPlumbHelper.createAllConnections();
			
		} finally {
			//start drawing the repaint set to true
			jsPlumbHelper.jsPlumbInstance.setSuspendDrawing(false, true);
			
			//ONLY AFTER things have been drawn we can zoom!
			if(zoomit.currentZoom != 1){
				//batch should suspend drawing during the zoom (repaint is set to true)
				jsPlumbHelper.jsPlumbInstance.batch(function() {
					zoomit.zoomAll();
				}, true);				
				jQuery(dbdesigner.namespaceWrapper + "#zoomSlider").val(zoomit.currentZoom);
			};
			
			if(isImport) this.saveCanvasState();
		};
	};
	
	/**
	* Save current canvas state to the storage.
	* This is only used when a JSON file was imported an all tables need to be saved
	* @see loadCanvasState()
	*/
	saveCanvasState() {
		if (dbdesigner.tables != {} && this.isStorageReady) {
			//only save data if the storage is available
			logger.log("Saving canvas state...")
			storage.set(this.getAppData());
		};
	};
	
	/**
	 * Deletes the jsPlumb connections. Removes all DOM elements with the tableDesign class and clears the canvas
	 * Also removes the dbdesigner data from the storage.
	 * @see dbdesigner.eraseCanvasState()
	 * @see loadCanvasState()
	 */
	clearCanvas() {
		jsPlumbHelper.jsPlumbInstance.empty(jQuery(dbdesigner.namespaceWrapper +  "#theCanvas"));
		
		dbdesigner.tables  = {};
		
		// Clear out the copy stored in storage
		//storage.remove(true);  //ACTIVATE FOR Testing or when an other storage then local storage is used.
		storage.remove();
	};
	
	/**
	 * Get an object that represents the current canvas state
	 * @see dbdesigner exportCanvas()
	 * @see saveCanvasState
	 * @return An object witch contains the current zoom and the tables
	 */
	getAppData(){
		return {zoom: zoomit.currentZoom, strTables: dbdesigner.tables};
	};
	
	/**
	 * Create a single new table in the storage
	 * @param table The table that needs to be created
	 * @return A Promise that is resolved with true if successful
	 * @see tableDialog.saveData()
	 */
	createTable(table){
		return storage.createTable(table);
	};
	
	/**
	 * Updates an existing table in the storage
	 * @param table The table that must be updated
	 * @param updateFields If true the fields must also be updated
	 * @return A Promise that is resolved with true if successful
	 * @see tableDialog.saveData()
	 * @see createThePanel() If the table was dragged
	 */
	updateTable(table, updateFields){
		return storage.updateTable(table, updateFields);
	};
	
	/**
	 * Deletes a table from the storage
	 * @param table The table that will be deleted (including all fields)
	 * @return A Promise that is resolved with true if successful
	 * @see dbdesigner.deleteTable()
	 */
	deleteTable(table){
		return storage.deleteTable(table).then(() =>{
			logger.info("Deleting all references to table " + table.name);
			jQuery.each(table.fields, (fieldId,field) => {
				if(field.primaryKey){
					const referencers = field.getReferencers();
					let referencedTable;
					let referencedField;
					
					for (let i = 0; i < referencers.length; i++) {
						referencedTable = dbdesigner.tables[referencers[i].tableId];
						referencedField = referencedTable.fields[referencers[i].fieldId];
						referencedField.pkRef = null;
						this.updateField(referencedTable, referencedField, false);
					};
				};
			});
			
	    	delete dbdesigner.tables[table.id];
			this.deleteTableDiv(table);
			return;
		});
	};
	
	/**
	 * Create a new field in the storage
	 * @param table The table the field belongs to
	 * @param field The field that will be created
	 * @return A Promise that is resolved with true if successful
	 * @see tabledialog.saveData()
	 */
	createField(table, field){
		return storage.createField(table, field).then(() =>{
			//ATTENTION: the field was just replaced with a NEW field. That breakes the reference!
			//All subsequent actions must be performed on the new field. Therefore:
  			
			this.createFieldRow(table.fields[field.id]);
			if (zoomit.currentZoom != 1) zoomit.adjustJsPlumbEndpoints(table, table.fields[field.id]);

			return;
		});
	};
	
	/** Updates a field in the storage
	 * @param table The table the field belongs to
	 * @param field The field that will be updated
	 * @param updateFieldRow Indicates that the field must be updated on the canvas
	 * @return A Promise that is resolved with true if successful
	 * @see tableDialog.savaData()
	 */
	updateField(table, field, updateFieldRow){
		return storage.updateField(table, field).then(() =>{
			if (updateFieldRow) this.updateFieldRow(field);
			return;
		});
	};
	
	/** Deletes a field in the storage
	 * @param table The table the field belongs to
	 * @param field The field that will be updated
	 * @return A Promise that is resolved with true if successful
	 * @see tableDialog.savaData()
	 */
	deleteField(table, field){
		return storage.deleteField(table, field).then(() =>{
					
			if (field.pkEndpoint != null) {
				logger.info("Deleting all references to field " + table.name + "." + field.name);

				const referencers = field.getReferencers();
				let referencedTable;
				let referencedField;
				
				for (let i = 0; i < referencers.length; i++) {
					referencedTable = dbdesigner.tables[referencers[i].tableId];
					referencedField = referencedTable.fields[referencers[i].fieldId];
					
					logger.debug("Deleting reference to field " + field.name + " in " + referencedTable.name + "." + referencedField.name);
					referencedField.pkRef = null;
					this.updateField(referencedTable, referencedField, false);
				};			
			};
			
			delete table.fields[field.id];
			this.deleteFieldRow(field);
			return;
		});
	};
	
	/**
	 * Saves the current zoom factor
	 * @param zoom The current zoom factor
	 * @return A Promise that is resolved with true if successful
	 */
	updateZoom(zoom){
		return storage.updateZoom(zoom)
	};
	
	/**
	 * This starts the Application. 
	 * The dbdesigner object must be globally available and the DOM must be loaded
	 */
	start(){
		logger.log("Application is starting");
		logger.log("Detected Bootstrap Version: " + jQuery.fn.tooltip.Constructor.VERSION);
		logger.log("Detected Jquery Version: " + jQuery.fn.jquery);
		
		logger.log("AJAX Error handler activated");
		jQuery(document).ajaxError(function( event, jqxhr, settings, thrownError ) {
			logger.error("URL: " + settings.url + " result: " + thrownError);
		});
		
		const $zoomSlider = jQuery(dbdesigner.namespaceWrapper + "#zoomSlider");
		//set the jsplumb endpoint size. used for anchors.
		zoomit.initialEndpointWidth = 22;
		zoomit.initialEndpointHeight = 18;
		zoomit.$zoomSlider = $zoomSlider;

		$zoomSlider.attr("min", zoomit.minScale);
		$zoomSlider.attr("max", zoomit.maxScale);
		$zoomSlider.attr("step", zoomit.step);
		
		$zoomSlider[0].addEventListener("input", () =>{
			//the user has moved the slider!
		    zoomit.currentZoom = parseFloat($zoomSlider.val()); 
			if(dbdesigner.tables != {} && zoomit.currentZoom != zoomit.lastZoom){
				jsPlumbHelper.jsPlumbInstance.batch(function() {
					zoomit.zoomAll();
				});				
				this.updateZoom(zoomit.currentZoom);
			};
		}, false);
		
		$zoomSlider.on("dbdesigner:zoomfinished", (event) =>{
			//event is available here	
		}, (event, table) => {
			//logger.log("ZOOM for table " + JSON.stringify(table) + " is done");
//			jsPlumbHelper.jsPlumbInstance.setZoom(zoomit.currentZoom);
//			jsPlumbHelper.jsPlumbInstance.revalidate(jQuery(dbdesigner.namespaceWrapper + "#tblDiv" + table.id));			
		});
		
		jQuery.get(dbdesigner.context + "assets/partials/table.html", (tableTemplate) => {
			//store the loaded template, so we don't need to load it again.
			this.tableTemplate = tableTemplate;
			
			//check if storage is available
			storage.isReady().then( (isReady) =>{
				this.isStorageReady = isReady;
				logger.log("isStorageReady? " + isReady);
				if(isReady){
					storage.get().then( (appData) => {
					    if(appData){
							if(jQuery.isEmptyObject(appData.strTables)){
						    	utils.bsWelcome(true);
						    }else{
							    //load existing tables to the Canvas. Save is not necessary
								this.loadCanvasState(appData, false);
						    };
					    }else{
					    	//this is an error. isReady but get failed!
					    	utils.bsalert({text:"Storage is not ready!.", type:"danger", delay: 0});
					    };
					});
				}else{
					utils.bshelp(false);
				};
			});
		});
	}; //start()
}; //class App

const app = new App();

jQuery(window).on('load', function () {
	logger.log("window is loaded");
});

jQuery(document).ready(function () {
	logger.log("document is ready");
}); //document.ready


export {app};


