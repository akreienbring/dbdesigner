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

import {app} from "./app.js";
import {tableDialog} from "./tableDialog.js";
import {codeGenerator} from "./codeGenerator.js";
import {utils} from "./utils.js";
import {Logger} from "./js-log.js";

const logger = Logger.getClassLogger("DBDesigner");

/**
 * An interface to the App, used in the HTML Pages:
 * index, tableDialog, resultsDialog, table and bootui HTML
 * Also provides global properties that are needed by various modules
 */
class DBDesigner{
    constructor(context, namespaceWrapper) {
    	this.tables = {};
     	this.version;
    	this.context = context;
    	this.namespaceWrapper = namespaceWrapper + " ";
    	this.codeGenerator = codeGenerator;
    	this.app = app;
    };

	/*
	 * Shows popUps called from the Main Page
	 */
	showBsPopup(options){
		utils.bspopup(options);
	};
	
	/*
	 * Shows the Help Popup. Called from the Main Page
	 */
	showBsHelp(){
		utils.bshelp(app.isStorageReady);
	};
	
	/*
	 * Shows the tableDialog. Called from the Main Page
	 */
	showTableDialog(){
		tableDialog.runTableDialog("", "add");
	};
	
	/*
	 * Shows the code generation Dialog. Called from the Main Page
	 */
	showCodeGeneratorDialog(){
		this.codeGenerator.showCodeGeneratorDialog();
	};
	
	/*
	 * Adds a field to a table. Called from the tableDialog HTML
	 */
	addField(){
		tableDialog.addField(false);
	};
	
	/**
	 * Deletes a field from a table in edit mode. Called from fields that are inserted by tableDialog
	 * @param fieldId the field that will be deleted
	 * @see tableDialog.addField()
	 * @see tableDialog.tryToDelete(fieldId)
	 */
	deleteField(fieldId){
		tableDialog.deleteField(fieldId);
	};
	
	/**
	 * Edits a field from a table in edit mode. Called from fields that are inserted by tableDialog
	 * @param fieldId the field that will be edited
	 * @see tableDialog.addField()
	 * @see tableDialog.editField(fieldId)
	 */
	editField(fieldId){
		tableDialog.editField(fieldId);
	};
	
	/**
	 * Called from the tableDialog if the type of the field has changed. Just a stub for tableDialog.typeHasChanged.
	 * @see tableDialog.typeHasChanged()
	 */
	typeHasChanged(){
		tableDialog.typeHasChanged();
	};
	
	/**
	 * Called from the tableDialog if an attribute of a field has changed. Just a stub for tableDialog.attributeHasChanged.
	 * @see tableDialog.attributeHasChanged()
	 */
	attributeHasChanged(){
		tableDialog.attributeHasChanged();
	};
	
	/*
	 * Saves the date from the tableDialog HTML
	 */
	saveData(){
		tableDialog.saveData();
	};
	
	/**
	 * CURRENTLY UNUSED Left here for knowing how to do this
	 * Shows a dismissable popover for a field in a table
	 * @see app.createThePanel()
	 */
	togglePopup(tableId, fieldId){
		
		//as the fieldName element apperantly does NOT get the focus if clicked, we need give it the focus manually
		//$field.focus();
	};
	
	/**
	 * Moves a field of the given table up or down
	 * The JSON that represents the tables structure needs to be updated
	 * The fields are moved by an event that is defined in createThePanel()
	 * @param tableId the id of a table
	 * @param sortedFieldId the id of a field in the table
	 * @see app.createThePanel()
	 */
	moveField(tableId, sortedFieldId, offset){
		//offset is either -1 or 1
		const table = dbdesigner.tables[tableId];
		
		let fieldIndex = 0;
		let fieldIndexInTable;
		let arrayOfFields = [];
		
		//create an array with the fields of the object and get the current index of the moved field
		jQuery.each(table.fields, function(fieldId,field) {
			//table.fields[fieldId] = new Field(field);
			if (fieldId == sortedFieldId){
				fieldIndexInTable = fieldIndex;
				//return false;		
			}else{
				fieldIndex += 1;		
			};
			
			arrayOfFields.push(field);
		});
		
		if(arrayOfFields.length > 1){
			logger.log("Field will be moved by " + offset);
			logger.debug("Old order: " + JSON.stringify(table.fields));
			logger.debug("Index of field " + sortedFieldId + " in table " + tableId + " is " + fieldIndexInTable);
			
			//replacedIndex is the index of the field that will be replaced with the field that is moved
			let replacedIndex = fieldIndexInTable + offset;
			if (replacedIndex < 0){
			    replacedIndex = arrayOfFields.length -1;
				logger.debug("lower rotation! Setting replacedIndex = to " + replacedIndex);
			}else if(replacedIndex >= arrayOfFields.length){
			    replacedIndex = 0;
				logger.debug("upper rotation! Setting replacedIndex = to " + replacedIndex);
			}
			
			logger.debug("Going to replace " + replacedIndex + " with index " + fieldIndexInTable);
			
			//save the replaced field
			const replacedField = arrayOfFields[replacedIndex];
			arrayOfFields[replacedIndex] = arrayOfFields[fieldIndexInTable];
			arrayOfFields[fieldIndexInTable] = replacedField;
			
			//recreate the tables fields from the array
			table.fields = {};
			for (let i = 0; i < arrayOfFields.length; i++) {
				table.fields[arrayOfFields[i].id]	= arrayOfFields[i];
			};
		
			logger.debug("New order: " + JSON.stringify(table.fields));
			
			app.updateTable(table, true);
		};
	};
	
	/*
	 * Select the code that was generated. Called from the resultsDialog HTML
	 */
	selectText(element){
		utils.selectText(element);
	};
	
	/*
	 * deletes a Table. Called from the table HTML
	 */
	deleteTable(tableId){
		utils.bspopup({
			title: "Delete Table",
	        text: "Sure you want to delete table '" + this.tables[tableId].name + "' along with all it's relations?",
	        button1: {text: "Yes", type: "btn-danger"},
	        button2: "No",
	        success: (event) =>{
	            if (event.button == "button1") {
	                app.deleteTable(this.tables[tableId]);
	            };
	        }
	    });
	};
	
	/*
	 * edits a Table. Called from the table HTML
	 */
	editTable(tableId){
		tableDialog.runTableDialog(tableId, "edit");
	};
	
	/*
	 * Download the json of the current canvas (the tables). Called from the main page
	 */
	exportCanvas(){
		if (Object.keys(this.tables).length == 0) {
			utils.bspopup({text:'No tables to export.'});
			return;
		};
		utils.downloadSomeText(JSON.stringify(app.getAppData()), 'canvas.json');
	};
	
	/*
	 * import the json for the canvas. Called from the main page
	 */
	importCanvas(){
		logger.log('IMPORT_CANVAS');
		const file = jQuery(this.namespaceWrapper + '#inputCanvasFile')[0].files[0];
	
		const fr = new FileReader();
		fr.readAsText(file);
		fr.onload = (ev) => {
			//the result now is the imported JSON
			logger.log(ev.target.result);
			//load and save the canvas
			app.loadCanvasState(JSON.parse(ev.target.result), true);
		}
		fr.onerror = function (ev) {
	        logger.error("error reading file");
	    }
		jQuery(this.namespaceWrapper + "#inputCanvasFile").val("");
	};
	
	/*
	 * Delete all tables from the canvas.  Called from the main page
	 */
	eraseCanvasState(){
		utils.bspopup({
			title: "Delete all Tables",
	        text: "All your tables will be erased so you can start over. Is this OK?",
	        button1: {text: "Yes", type: "btn-danger"},
	        button2: "No",
	        success: (event) =>{
	            if (event.button == "button1") {
					// Erase tables from the canvas
					app.clearCanvas();
	            };
	        },
	    });
	};
}; //class DBDesigner

export {DBDesigner};
