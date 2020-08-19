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

import {utils} from "./utils.js";
import {Table, Field} from "./classes.js";
import {app} from "./app.js";
import {Logger} from "./js-log.js";
import {datetimepicker} from "./datepicker.js";
import {jsPlumbHelper} from "./jsPlumbHelper.js";



const logger = Logger.getClassLogger("TableDialog");

/**
* The TableDialog adds or edits Tables.
*/
class TableDialog {
	constructor(){
		this.regExNames = new RegExp("^[A-Za-z0-9_-]+$");
		this.validCharacters = "'" + this.regExNames.toString().substring(3, this.regExNames.toString().length - 4) + "'";
	};
	
	/**
	 * Shows the TableDialog as a modal form.
	 * @param tableId The id of the table. If an empty string was passed a new table is generated
	 * @param mode add or edit
	 */
	runTableDialog(tableId, mode) 
	{
		if (jQuery(dbdesigner.namespaceWrapper + "#tableDialog").length == 0) {
			jQuery(dbdesigner.namespaceWrapper + "#holder").load(dbdesigner.context + "assets/partials/tableDialog.html", (data, success, dataType) => {
				logger.log("LOADED THE tableDialog!");
				
				jQuery(dbdesigner.namespaceWrapper + "#tableDialog").on('shown.bs.modal', function(e) {
					//do this every time when the modal is shown
					jQuery(this).find("[autofocus]:first").focus();
				});
				
				jQuery(dbdesigner.namespaceWrapper + "#tableDialog").on('hidden.bs.modal', function (e) {
					//because the default type is Text, we hide and disable the datepicker
					//when the modal is closed
					datetimepicker.hide();
				});
				
				jQuery(dbdesigner.namespaceWrapper +  "#tableDialog").on('keyup',function(e) {
				    if(e.which == 13) {
				    	jQuery(dbdesigner.namespaceWrapper + "#tableDialog #addField").trigger("click");   
				    }
				});	
				
				datetimepicker.init(jQuery(dbdesigner.namespaceWrapper + "#datetimepicker1"), jQuery(dbdesigner.namespaceWrapper + "#datepickerButton"), jQuery(dbdesigner.namespaceWrapper + "#fieldDefault"));
				
				jsPlumbHelper.jsPlumbInstance.draggable(jQuery(dbdesigner.namespaceWrapper + "#tableDialog"));
				
				const $fieldPrimaryLabel = jQuery(dbdesigner.namespaceWrapper + "#fieldPrimaryLabel");
				const $fieldUniqueLabel = jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueLabel");
				const $fieldUniqueCompositeLabel = jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueCompositeLabel");
				const $fieldNotNullLabel = jQuery(dbdesigner.namespaceWrapper + "#fieldNotNullLabel");
				
				$fieldPrimaryLabel.popover({title: "Primary Fields", container: "body", trigger: "hover", animation: true,
					content: `Use primary fields to uniquely identify a record in a table. 
						\nThey are allways unique and not null.
						\nMore than one primary key field will generate a composite primary key.
					`
				});
				
				$fieldUniqueLabel.popover({title: "Single Unique Fields", container: "body", trigger: "hover", animation: true,
					content: `Unique fields must be unique within a table. 
						\nYou can configure them to to not allow null values.
					`
				});
				
				$fieldUniqueCompositeLabel.popover({title: "Composite Unique Fields", container: "body", trigger: "hover", animation: true,
					content: `Composite unique fields are combined with other composite unique fields and must be unique as this combination.
						\nIf there's only one composite unique field in a table, it will be treated like a single unique key. 
						\nYou can configure them to to not allow null values.
					`
				});
				
				$fieldNotNullLabel.popover({title: "Not Null", container: "body", trigger: "hover", animation: true,
					content: `By setting a field to 'not null' the DB ensures that the field has a value other than null.
					\nYou can combine this setting with a unique contraint.
					`
				});
				
				this.runTableDialog(tableId, mode); //recursive call if not loaded before
			});
			return;
	    };
	    
	    //table will be undefined if not existing
	    let table = dbdesigner.tables[tableId];
		
		jQuery(dbdesigner.namespaceWrapper + "#tableDialog #tableName").val((table ? table.name : ""));
		jQuery(dbdesigner.namespaceWrapper + "#tableDialog #tableId").val((table ? table.id : ""));
		jQuery(dbdesigner.namespaceWrapper + "#tableDialog #editMode").val(mode);
		jQuery(dbdesigner.namespaceWrapper + "#tableDialog .fieldRow").remove();
		
		if (mode=='edit') {
			logger.debug("Editing table: " + JSON.stringify(table));
			jQuery(dbdesigner.namespaceWrapper + "#tableDialog").find(".modal-title").text("Edit Table");
			
			jQuery.each(table.fields, (key, field) =>{
				
				// Load the field values into the dialog
				jQuery(dbdesigner.namespaceWrapper + "#fieldName").val(field.name);
				jQuery(dbdesigner.namespaceWrapper + "#fieldId").val(field.id);
				jQuery(dbdesigner.namespaceWrapper + "#fieldType").val(field.type);
				jQuery(dbdesigner.namespaceWrapper + "#fieldSize").val(field.size);
				jQuery(dbdesigner.namespaceWrapper + "#fieldDefault").val(field.defaultValue);
				jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary").prop("checked", field.primaryKey);
				jQuery(dbdesigner.namespaceWrapper + "#fieldUnique").prop("checked", field.unique);
				jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueComposite").prop("checked", field.uniqueComposite);
				jQuery(dbdesigner.namespaceWrapper + "#fieldNotNull").prop("checked", field.notNull);

				// Add row to the table inside the tableDialog.html. No validation needed.
				this.addField(true);
			});
		}else{
			jQuery(dbdesigner.namespaceWrapper + "#tableDialog").find(".modal-title").text("Add Table");
			this.resetNewFieldBoxes();
		};
		
		jQuery(dbdesigner.namespaceWrapper + "#tableDialog").modal({
			  keyboard: false,
			  backdrop: "static",
		});
	}; //runTableDialog

	
	/**
	* Creates a new field and adds it to the tableDialog.
	* Either called from the input boxes of the Dialog ("Add Field" Button) or when a table  is loaded from the canvas.
	* This method creates only the HTML DOM. The JSON / Object is only be saved in saveData.
	* @param isLoading If true no validation is performed. This only happens if we load the table data from the canvas.
	* If the "Add Field" button of the dialog is clicked, Validation will be done.
	* @see runTableDialog()
	* @see dbDesigner.addField()
	*/
	addField(isLoading){
		const logger = Logger.getFunctionLogger("TableDialog", "addField");
		
		const $fieldName = jQuery(dbdesigner.namespaceWrapper + "#fieldName");
		const $fieldId = jQuery(dbdesigner.namespaceWrapper + "#fieldId");
		const $fieldSize = jQuery(dbdesigner.namespaceWrapper + "#fieldSize");
		const $fieldDefault = jQuery(dbdesigner.namespaceWrapper + "#fieldDefault");
		const $fieldType = jQuery(dbdesigner.namespaceWrapper + "#fieldType");
		const $fieldPrimary = jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary");
		const $fieldUnique = jQuery(dbdesigner.namespaceWrapper + "#fieldUnique");
		const $fieldUniqueComposite = jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueComposite");
		const $fieldNotNull = jQuery(dbdesigner.namespaceWrapper + "#fieldNotNull");
		
		//if the field was not saved before, the fieldId is not existing. Use the name instead.
		//this means also that we add a new field instead of editing it. 
		//this is temporary and will be changed when the table is saved
		const fieldData = {
			name: $fieldName.val().trim(),
			id: $fieldId.val() != "" ? $fieldId.val() : $fieldName.val().trim(),
			type: $fieldType.val(),
			size: $fieldType.val() == "Text" ? parseInt($fieldSize.val()) : 0,
			primaryKey: $fieldPrimary.is(':checked'),
			unique: $fieldUnique.is(':checked'),
			uniqueComposite: $fieldUniqueComposite.is(':checked'),
			notNull: $fieldNotNull.is(':checked'),
			defaultValue: $fieldDefault.val()
		};
		
		logger.log("Adding / Updating field: " + fieldData.name);
		
		const $tableBody = jQuery(dbdesigner.namespaceWrapper + "#tableDialogTable tbody");

		if(!isLoading){
			let sizeValid = true;
			if (fieldData.type == "Text"){
				//const fieldSize = parseInt($fieldSize.val());
				sizeValid = (fieldData.size > 0 && fieldData.size <= 65535);
				$fieldSize.val(Math.round(fieldData.size));
			}else{
				$fieldSize.val(0);
			};
			
			if (fieldData.name == ""){
				utils.bsalert({text:"Field name cannot be blank.",type:"danger", delay: 0});
				return;
			}else if (!this.regExNames.test(fieldData.name)){
				utils.bsalert({text:"Field name cannot contain a special character or space. Please use only " + this.validCharacters, type:"danger", delay: 0});
				return;
			}else if (!sizeValid) {
				utils.bsalert({text:"Not a valid size Must be (1 - 65535).", type:'danger', delay: 0});
				return;
			}else if(fieldData.defaultValue !=""){
				//check if types are matching
				if(!this.checkType(fieldData.type, fieldData.defaultValue)){
					utils.bsalert({text:"The default value doesn't match with the fields type.", type:"danger", delay: 0});
					return;
				};
			}else{
				let duplicateFieldName = false;
				jQuery.each($tableBody.children(), function(index, fieldRow) {
					if (jQuery(fieldRow).find(".fieldName").text() == fieldData.name && $fieldId.val() == "") {
						utils.bsalert({text:"A field with this name already exists.", type:"danger", delay: 0});
						duplicateFieldName = true;
						return false;
					};
				});
				
				if(duplicateFieldName) return;
			};
			
			if(fieldData.primaryKey){
				jQuery.each($tableBody.children(), function(index, fieldRow) {
					if (jQuery(fieldRow).find(".hfieldPrimary").text() == "true" && jQuery(fieldRow).find(".fieldName").text() != fieldData.name) {
						utils.bsalert({text:"Foreign keys that reference  multiple primary keys are considered as composite keys.", type:"info"});
						return false;
					};
				});
			}			
		}; //isLoading?
		
		//build a new fieldRow
		let fieldContentHTML = "";
		let shortDefault = ""
		if(fieldData.defaultValue != "" && fieldData.type == "Text" && fieldData.defaultValue.length > 20){
			 shortDefault = utils.shortenString(fieldData.defaultValue, 20);
		};
		
		fieldContentHTML +=	"<th scope='row' class='fieldName'>" + fieldData.name + "</th>";
		fieldContentHTML += "<td class='fieldType'>" + fieldData.type + "</td>";		
		fieldContentHTML += "<td class='fieldSize'>" + (fieldData.size == 0 ? "-" : fieldData.size)  + "</td>";
//		fieldContentHTML += "<td class='fieldDefault'" + (shortDefault != "" ? "data-toggle='popover'" :  "") + ">" + (shortDefault != "" ? shortDefault :  fieldData.defaultValue) + "</td>";
		fieldContentHTML += "<td class='fieldDefault'>" + (shortDefault != "" ? shortDefault :  fieldData.defaultValue) + "</td>";
		fieldContentHTML += "<td class='fieldAttributes'>" + app.createAttributes(fieldData, true, true)  + "</td>";
		fieldContentHTML += "<td style='display:none;' class='hfieldId'>" + fieldData.id  + "</td>";
		fieldContentHTML += "<td style='display:none;' class='hfieldPrimary'>" + (fieldData.primaryKey ? 'true' : 'false')  + "</td>";
		fieldContentHTML += "<td style='display:none;' class='hfieldUnique'>" + (fieldData.unique ? 'true' : 'false')  + "</td>";
		fieldContentHTML += "<td style='display:none;' class='hfieldUniqueComposite'>" + (fieldData.uniqueComposite ? 'true' : 'false')  + "</td>";
		fieldContentHTML += "<td style='display:none;' class='hfieldNotNull'>" + (fieldData.notNull ? 'true' : 'false')  + "</td>";
		fieldContentHTML += "<td style='display:none;' class='hfieldDefault'>" + fieldData.defaultValue + "</td>";
		fieldContentHTML += "<td class='fieldAction'><button type='button' onclick='dbdesigner.deleteField(\"" + fieldData.id + "\")' title='Delete Field' style='font-size: 0.75em;' class='btn btn-sm btn-danger'><span class='fas fa-trash-alt'></span></button>";
		fieldContentHTML += "<button type='button' onclick='dbdesigner.editField(\"" + fieldData.id + "\")' title='Edit Field'  style='font-size: 0.75em;' class='btn btn-sm btn-success'><span class='fas fa-edit'></span></button></td>";
		
		let action = "";
		
		if ($fieldId.val() == "" || isLoading){
			//add the field
			const finalHTML = "<tr class='fieldRow' id='" + fieldData.id + "'>" + fieldContentHTML + "</tr>"
			if (isLoading){ $tableBody.append(finalHTML)} else {$tableBody.prepend(finalHTML)};
			action = "added";
		} else {
			//update an existing field
			jQuery(dbdesigner.namespaceWrapper + "#addField").text("Add Field");
			jQuery(dbdesigner.namespaceWrapper + "#cancelUpdate").remove();
			const $fieldRow = $tableBody.find("#" + fieldData.id + ".fieldRow");
			$fieldRow.empty();
			$fieldRow.append(fieldContentHTML);
			action = "updated";
		};
		
		const $fieldRow = $tableBody.find("#" + fieldData.id + ".fieldRow");
		const $fieldRowDefaultValue = $fieldRow.find(".fieldDefault");
			
		if(shortDefault != ""){
			//create a popover that shows the full default value
			$fieldRowDefaultValue.addClass("popoverText");
			$fieldRowDefaultValue.attr("data-toggle='popover'");
			$fieldRowDefaultValue.popover({title: "", container: "body", trigger: "hover", animation: true, content: fieldData.defaultValue});
		} else {
			$fieldRowDefaultValue.removeClass("popoverText");
			$fieldRowDefaultValue.removeAttr("data-toggle='popover'");
		};
		
		if(!isLoading){
			$fieldName.focus();
			utils.bsalert({text:"The Field '" + fieldData.name + "' was successfully " + action + ".", type:"success"});			
		};
		
		this.resetNewFieldBoxes();
	}; //addField
	
	
	/**
	 * Saves the fields of a table generated or edited by the tableDialog HTML
	 * When done the table / field is created  / updated in the canvas and the storage
	 */
	saveData() {
		const logger = Logger.getFunctionLogger("TableDialog", "saveData");
		
		const tableName = jQuery(dbdesigner.namespaceWrapper + "#tableName").val();
		const tableId = jQuery(dbdesigner.namespaceWrapper + "#tableId").val();
		const editMode = jQuery(dbdesigner.namespaceWrapper + "#editMode").val()
		let $tableDiv;
		let tableNameChanged = false;
		
		//let hasTableNameChanged = false;
		if (jQuery(dbdesigner.namespaceWrapper + ".fieldRow").length==0) {
			utils.bsalert({text:"You must add at least one field.", type:"danger", delay: 0});
			return;
		};
		
		if (!this.validateTableName(tableId, tableName)) {
			return;
		};

		let table;
		
		if (editMode == "add") {
			table = new Table(tableName);
		}else{
			table = dbdesigner.tables[tableId];
			if(table.name != tableName) tableNameChanged = true;
			table.name = tableName;
			$tableDiv = jQuery(dbdesigner.namespaceWrapper +  "#tblDiv" + table.id);
		};
		
		const fieldIds = {};
		const storageActions = [];
		let referencers;
			
		// 1. Loop: check every field that is in the list of fields of the tableDialog
		// This updates or creates fields that are in the fieldRow.
		// If a field is still in the fieldRow (it was not deleted), it is marked with true in the fieldIds object.
		jQuery(dbdesigner.namespaceWrapper + ".fieldRow").each(function(index){
			const fieldName = jQuery(this).find(".fieldName").text();
			const fieldId = jQuery(this).find(".hfieldId").text();
			fieldIds[fieldId] = true;
			
			const fieldData = {
				name: fieldName,
				id: fieldId,
				type: jQuery(this).find(".fieldType").text(),
				size: jQuery(this).find(".fieldType").text() == "Text" ? parseInt(jQuery(this).find(".fieldSize").text()) : 0,
				defaultValue: jQuery(this).find(".hfieldDefault").text() != "" ? jQuery(this).find(".hfieldDefault").text() : null,
				primaryKey: (jQuery(this).find(".hfieldPrimary").text() == "true"),
				unique: (jQuery(this).find(".hfieldUnique").text() == "true"),
				uniqueComposite: (jQuery(this).find(".hfieldUniqueComposite").text() == "true"),
				notNull: (jQuery(this).find(".hfieldNotNull").text() == "true")
			};
			
			if (editMode == "edit") {
				if (fieldId in table.fields) {
					
					//The following should be obsolete now that the type field and the primary attribute are disabled if the field has an existing relation
					//see 'deleteField'
					if(fieldData.type != table.fields[fieldId].type){
						logger.info("Field '" + fieldName + "' has changed the type!");
						
						let isTypeChangeIgnored = false;
						
						if(fieldData.primaryKey){
							referencers = table.fields[fieldId].getReferencers();
							if (referencers.length > 0){
								isTypeChangeIgnored = true;
							};
						};
						
						if(table.fields[fieldId].pkRef != null){
							isTypeChangeIgnored = true;
						};
						
						if(isTypeChangeIgnored){
							fieldData.type = table.fields[fieldId].type;
							fieldData.size = table.fields[fieldId].size;
							utils.bsalert({text:"Type change was ignored because of existing relations!", type:'warning'});
						};
					};
					//END of the code that should be obsolete
					
					if(!table.fields[fieldId].isEqualWith(fieldData)){
						//the field already exists and needs to be updated
						logger.info("Field '" + fieldName + "' already exists. Updating field");
						
						table.fields[fieldId].updateFromObject(fieldData);
						storageActions.push (app.updateField(table, table.fields[fieldId], true));
						
					}else{
						logger.info("Field '" + fieldName + "' already exists but has not been changed.");
					};
				} else {
					//mode = edit. Create a new instance of Field and add it to an existing table
					logger.info("Field '" + fieldName + "' must be added in to the existing table " + table.name);
					table.fields[fieldName] = new Field(fieldData);
					storageActions.push(app.createField(table, table.fields[fieldName]));
				};
			}else{
				//mode = add. Create a new field for a new table. It will be saved with the table later
				logger.info("Field '" + fieldName + "' must be added in the new table " + table.name);
				table.fields[fieldName] = new Field(fieldData);
			};
		}); //each field in fieldRow
		
		if (editMode == "edit") {
			//2. Loop: Remove any exiting fields that have been deleted (and therefor aren't in fieldIds)
			jQuery.each(table.fields, (fieldId, field) => {
				if (field.id && !(field.id in fieldIds)) {
					logger.info("Field '" + field.name + "' must be deleted from the table " + table.name);
					storageActions.push(app.deleteField(table, field));
				};
			});
		};
		
		jQuery(dbdesigner.namespaceWrapper + "#tableDialog").modal("hide");
		
		if (editMode == "add") {
			// a new Table is created and stored together with it's fields
			app.createTable(table)
			.then( () => {
				dbdesigner.tables[table.id] = table;
				
				logger.debug("Creating table: " + table.name + " " + JSON.stringify(table));
				
				app.createThePanel(table, false);
				
	    		utils.bsalert({text:table.name+" added!", type:'success'});
			});
		}else{
			//If the table name has changed
			//add the final table update and run all additional promises that have been created during loop 1 and 2.  
			if(tableNameChanged){
				storageActions.push(app.updateTable(table, false));
			};
			
			//this resolves the promises in sequence
			storageActions.reduce((action, nextAction) => {
				return action.then(() => {
			    	return nextAction;
			    }
			)}, Promise.resolve()).then(()=>{
				//When all id's are set, manipulate the data model
				logger.debug("Recreating table: " + table.name + " " + JSON.stringify(table));
				dbdesigner.tables[table.id] = table;

				if(tableNameChanged){
					const $tableName = $tableDiv.find("[data-table-label='"+ table.id + "']");
					$tableName.html(table.name);
				};
				
				//the table must be revalidated
				const $tbody = $tableDiv.find("tbody");
				const rows = $tbody.children("tr").get();
				app.revalidateFields(rows);
				
				utils.bsalert({text:"Table updated!", type:'success'});
		    });			

			//and this in parallel. Left here for a possible change in the future
//			Promise.all(storageActions)
//			.then( () => {
//				//When all id's are set, manipulate the data model and create the panel
//				logger.debug("Recreating table: " + table.name + " " + JSON.stringify(table));
//				dbdesigner.tables[table.id] = table;
//
//				if(tableNameChanged){
//					const $tableName = $tableDiv.find("[data-table-label='"+ table.id + "']");
//					$tableName.html(table.name);
//				};
//				
//				if(tableWidth !=  $tableDiv.width()){
//					//if the width has changed all enpoints of the table must be revalidated
//					const $tbody = $tableDiv.find("tbody");
//					const rows = $tbody.children("tr").get();
//					app.revalidateFields(rows);
//				};
//				
//				utils.bsalert({text:"Table updated!", type:'success'});
//				
//			});
		};
	}; //saveData
	
	/**Check if a given Tablename is valid
	 * @param ownTableId The id of the table that is checked. Empty string if this is a new table.
	 * @param tableName The (new) name of the table
	 * @return true if the tablename is valid else false
	 */
	validateTableName(ownTableId, tableName) {
		if (tableName == null || tableName.trim() == '') {
			utils.bsalert({text:"You must enter a table name.", type:"danger", delay: 0});
			return false;
		} else if (!this.regExNames.test(tableName)){
			utils.bsalert({text:"Table name cannot contain a special character or space. Please use only " + this.validCharacters, type:"danger", delay: 0});
			return false;
		} else{
			let isTableExisting = false;
			jQuery.each(dbdesigner.tables, (tableId, table) =>{
				if(tableName == table.name && tableId != ownTableId){
					isTableExisting = true;
					utils.bsalert({text:"This table name already exists.", type:"danger", delay: 0});
					return false;
				};
			});
			
			return !isTableExisting;
		};
	};


	/**
	 * Join two strings with a separator in between
	 */
	joinWithSep(a, b, separator) {
		if (a.length == 0) {
			return b;
		} else {
			return a + separator + b;
		};
	};

	/**
	 * Reset all elements after a field was added.
	 * @see addField()
	 */
	resetNewFieldBoxes() {
		jQuery(dbdesigner.namespaceWrapper + "#fieldName").val("");
		jQuery(dbdesigner.namespaceWrapper + "#fieldId").val("");
		jQuery(dbdesigner.namespaceWrapper + "#fieldSize").val("255");
		jQuery(dbdesigner.namespaceWrapper + "#fieldSize").removeAttr('disabled');
		jQuery(dbdesigner.namespaceWrapper + "#fieldType").val("Text");
		jQuery(dbdesigner.namespaceWrapper + "#fieldType").removeAttr('disabled');
		jQuery(dbdesigner.namespaceWrapper + "#fieldDefault").val('');
		jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary").prop('checked',false);
		jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary").removeAttr('disabled');
		jQuery(dbdesigner.namespaceWrapper + "#fieldUnique").prop('checked',false);
		jQuery(dbdesigner.namespaceWrapper + "#fieldUnique").removeAttr('disabled');
		jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueComposite").prop('checked',false);
		jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueComposite").removeAttr('disabled');
		jQuery(dbdesigner.namespaceWrapper + "#fieldNotNull").prop('checked',false);
		jQuery(dbdesigner.namespaceWrapper + "#fieldNotNull").removeAttr('disabled');
		datetimepicker.hide();
	};

	
	/**
	 * Edit an existing field.
	 * Triggered when the user clicks the "edit" button of a field in a table.
	 * @param fieldId The id of the field that will be edited.
	 * @see dbdesigner.editField()
	 */
	editField(fieldId){
		logger.log("Editing field: " + fieldId);
		const $fieldRow = jQuery(dbdesigner.namespaceWrapper + "#" + fieldId + ".fieldRow");


		logger.debug("Found FieldName=" + $fieldRow.find(".fieldName").text() + " Original values:");
		logger.debug("fieldId=" + $fieldRow.find(".hfieldId").text());
		logger.debug("fieldSize=" + $fieldRow.find(".fieldSize").text());
		logger.debug("fieldType=" + $fieldRow.find(".fieldType").text());
		logger.debug("fieldDefault=" + $fieldRow.find(".hfieldDefault").text());
		logger.debug("fieldPrimary=" + $fieldRow.find(".hfieldPrimary").text());
		logger.debug("fieldUnique=" + $fieldRow.find(".hfieldUnique").text());
		logger.debug("fieldUniqueCompsite=" + $fieldRow.find(".hfieldUniqueComposite").text());
		logger.debug("fieldNotNull=" + $fieldRow.find(".hfieldNotNull").text());
		
		
		const tableId = jQuery(dbdesigner.namespaceWrapper + "#tableId").val();
		
		// If this table isn't new, check for referencers
		if (dbdesigner.tables[tableId] != undefined) {
			jQuery(dbdesigner.namespaceWrapper + "#fieldType").attr('disabled',false);
			jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary").attr('disabled',false);
			const field = dbdesigner.tables[tableId].fields[fieldId];
			if (field != undefined) {
				if (field.primaryKey){
					const referencers = field.getReferencers();
					if (referencers.length > 0) {
						jQuery(dbdesigner.namespaceWrapper + "#fieldType").attr('disabled',true);
						jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary").attr('disabled',true);
						utils.bsalert({title: "Existing Relations!", text: "The type and the primary attribute of the field cannot be changed. \n\nPlease delete the relations first if this is intended.", type:'danger', delay: 0});
					};
				} else if (field.pkRef != null){
						jQuery(dbdesigner.namespaceWrapper + "#fieldType").attr('disabled',true);
						utils.bsalert({title: "Existing Relations!", text: "The type of the field cannot be changed. \n\nPlease delete the relations first if this is intended.", type:'danger', delay: 0});
				};
			};
		};
		
		//if the type has changed adjust the fields accordingly
		const oldFieldTypeValue = jQuery(dbdesigner.namespaceWrapper + "#fieldType").val();
		const newFieldTypeValue = $fieldRow.find(".fieldType").text();

		//set the values of the field in the table dialog
		jQuery(dbdesigner.namespaceWrapper + "#fieldName").val($fieldRow.find(".fieldName").text());
		jQuery(dbdesigner.namespaceWrapper + "#fieldType").val(newFieldTypeValue);
		jQuery(dbdesigner.namespaceWrapper + "#fieldSize").val($fieldRow.find(".fieldSize").text());
		jQuery(dbdesigner.namespaceWrapper + "#fieldDefault").val($fieldRow.find(".hfieldDefault").text());
		jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary").prop('checked',($fieldRow.find(".hfieldPrimary").text()) == "true");
		jQuery(dbdesigner.namespaceWrapper + "#fieldUnique").prop('checked',($fieldRow.find(".hfieldUnique").text()) == "true");
		jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueComposite").prop('checked',($fieldRow.find(".hfieldUniqueComposite").text()) == "true");
		jQuery(dbdesigner.namespaceWrapper + "#fieldNotNull").prop('checked',($fieldRow.find(".hfieldNotNull").text()) == "true");
		jQuery(dbdesigner.namespaceWrapper + "#fieldId").val($fieldRow.find(".hfieldId").text());
		
		if(newFieldTypeValue != oldFieldTypeValue){
			//if the type of the field has changed, we need to change and validate the fieldDefault.
			logger.log("Field Type has changed from " + oldFieldTypeValue + " to " + newFieldTypeValue);
			this.typeHasChanged();
		};
		
		this.attributeHasChanged();
		
		if (jQuery(dbdesigner.namespaceWrapper + "#cancelUpdate").length == 0){
			//create the cancel update button
			jQuery(dbdesigner.namespaceWrapper + "#addField").text("Update");
			let buttonHTML = "<button id='cancelUpdate' class='btn btn-secondary btn-sm'>Cancel</button>";
			jQuery(dbdesigner.namespaceWrapper + "#tableDialogAction").append(buttonHTML);
			
			jQuery(dbdesigner.namespaceWrapper + "#cancelUpdate").click(() => {
				jQuery(dbdesigner.namespaceWrapper + "#addField").text("Add Field");
				jQuery(dbdesigner.namespaceWrapper + "#cancelUpdate").remove();
				this.resetNewFieldBoxes();
			});
		};
	};
	
	/**
	 * Deletes a field from a table or loads it into the dialog to be edited
	 * @param fieldId the id of the field that will be deleted
	 * @see dbdesigner.deleteField()
	 */
	deleteField(fieldId) {
		const tableId = jQuery(dbdesigner.namespaceWrapper + "#tableId").val();
		
		// If this table isn't new, check for referencers
		if (dbdesigner.tables[tableId] != undefined) {
			const field = dbdesigner.tables[tableId].fields[fieldId];
			if (field != undefined) {
				const referencers = field.getReferencers();
				if (referencers.length > 0 || field.pkRef != null) {
					utils.bsalert({title: "Existing Relations!", text: "Please delete the relations first if this is intended.", type:'danger', delay: 0});
					return;
				};
			};
		};
		
		jQuery(dbdesigner.namespaceWrapper + "#" + fieldId).remove();
	}	
	
	/**
	 * Only certain combinations of attributes make sense. Toggle them accordingly
	 */ 
	attributeHasChanged(){
		const $fieldPrimary = jQuery(dbdesigner.namespaceWrapper + "#fieldPrimary");
		const $fieldUnique = jQuery(dbdesigner.namespaceWrapper + "#fieldUnique");
		const $fieldUniqueComposite = jQuery(dbdesigner.namespaceWrapper + "#fieldUniqueComposite");
		const $fieldNotNull = jQuery(dbdesigner.namespaceWrapper + "#fieldNotNull");
		
		if ($fieldPrimary.is(':checked')){
			$fieldUnique.prop('checked', false);
			$fieldUnique.attr("disabled", true);
			$fieldUniqueComposite.prop('checked', false);
			$fieldUniqueComposite.attr("disabled", true);
			$fieldNotNull.prop('checked', false);
			$fieldNotNull.attr("disabled", true);
			return;
		} else {
			$fieldUnique.attr("disabled", false);
			$fieldUniqueComposite.attr("disabled", false);
			$fieldNotNull.attr("disabled", false);
		};
		
		if ($fieldUnique.is(':checked')){
			$fieldPrimary.prop('checked', false);
			$fieldPrimary.attr("disabled", true);
			$fieldUniqueComposite.prop('checked', false);
			$fieldUniqueComposite.attr("disabled", true);
			return;
		} else {
			$fieldPrimary.attr("disabled", false);
			$fieldUniqueComposite.attr("disabled", false);
		};
		
		if ($fieldUniqueComposite.is(':checked')){
			$fieldPrimary.prop('checked', false);
			$fieldPrimary.attr("disabled", true);
			$fieldUnique.prop('checked', false);
			$fieldUnique.attr("disabled", true);
			return;
		} else {
			$fieldPrimary.attr("disabled", false);
			$fieldUnique.attr("disabled", false);
		};
	};
	
	/**
	 * As valid default values for fields depend on the type of the field, this function determines which default values 
	 * can be entered each time the type changes. It toggles the datepicker to accept appropriate values and checks if they are valid.
	 * This function is also called by the onChange event of the dropdown in the tableDialog.
	 * @see editField()
	 */
	typeHasChanged(){
		const fieldTypeValue = jQuery(dbdesigner.namespaceWrapper + "#fieldType").val();
		const $fieldDefault = jQuery(dbdesigner.namespaceWrapper + "#fieldDefault");
		let fieldDefaultValue = $fieldDefault.val();
		
		//disable / enable fields depending on the type
		$fieldDefault.attr("disabled", false);
		if (fieldTypeValue != "Text"){
			jQuery(dbdesigner.namespaceWrapper + "#fieldSize").val("");
			jQuery(dbdesigner.namespaceWrapper + "#fieldSize").attr("disabled",true);
			
			if (fieldTypeValue == "Serial"){
			 	$fieldDefault.val("");	
				$fieldDefault.attr('disabled',true);
			}; 
		} else {
			jQuery(dbdesigner.namespaceWrapper + "#fieldSize").removeAttr('disabled');
			jQuery(dbdesigner.namespaceWrapper + "#fieldSize").val("255");
		};
		
		//Only Date and DataTime require the datepicker to be used
		if(fieldTypeValue != "Date" && fieldTypeValue != "DateTime" ){
			datetimepicker.hide();
		}else{
			//if Date or DateTime enable the datepicker and select the right format for the datepicker
			datetimepicker.show()
			
			let format;
			if(fieldTypeValue == "Date"){
				format = "L"; //date only
			}else{
				format = "L LT"; //local date & time
			};
			
			datetimepicker.set('format', format);
		};
		
		if(!this.checkType(fieldTypeValue, fieldDefaultValue)){
			//the value of the default value is not valid. Don't set it
			fieldDefaultValue = undefined;
			$fieldDefault.val("");
		};
		
		//set the type of the 'Default' input dependent on the new type
		switch(fieldTypeValue){
		case "Text": 
			$fieldDefault.prop('type','text');
			if(fieldDefaultValue) $fieldDefault.val(fieldDefaultValue);
			break;
		case "Integer": 
		case "Float": 
			$fieldDefault.prop('type','number');
			if(fieldDefaultValue) $fieldDefault.val(fieldDefaultValue);
			break;
		case "Date":
		case "DateTime": 
			$fieldDefault.prop('type','text');
			if(fieldDefaultValue) datetimepicker.set('date', fieldDefaultValue); 
			break;
		}
	};
	
	/**
	 * Checks if entered values are of a valid type.
	 * @param type the type as String (Text, Integer, Float, Date, DateTime)
	 * @param value the value (passed as a String) to check against the type
	 * @see tableDialog.typeHasChanged()
	 * @see tableDialog.addField()
	 * @return true if value if of the given type, false otherwise.
	 */
	checkType(type, value){
		switch(type){
		case "Text":
			//this should always return true because values of input are string by default
			return (typeof value === 'string' || value instanceof String)
			break;
		case "Integer": 
			if (isNaN(value)) return false;
			var number =  Number(value);
			return  number % 1 === 0;; 
			break;
		case "Float": 
			if (isNaN(value)) return false;
			var number =  Number(value);
			return  number % 1 !== 0;; 
			break;
		case "Date":
		case "DateTime":
			//a Date or DateTime should be of the same format the datepicker uses!
			const datepickerFormat = datetimepicker.get('format'); 
			logger.log ("datepickerFormat is " + datepickerFormat);
			
			const date = moment(value, datepickerFormat).toDate(); //converts the string into a javascript date
			return typeof date.getMonth === 'function'; //only if the conversion was successful we have a real Date Object
			break;
		};
	};
}; //class tableDialog

const tableDialog = new TableDialog;
export {tableDialog};
