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

import {Logger} from "./js-log.js";
import {utils} from "./utils.js";

var logger = Logger.getClassLogger("codeGenerator");

//var templateDir = "";

class CodeGenerator {
	 constructor(context) {
		this.templateDir = context + "assets/templates/";
		this.codeGenerators = {"ORM/SQLAlchemy": new ORMSQLAlchemy(this.templateDir), "mysql": new MySQL(this.templateDir), "sqlite": new SQLite(this.templateDir)};
	 };	
	 
	 generateCode(outputType) {

		// Pick code generator based on desired output format
		var selectedCodeGenerator = this.codeGenerators[outputType];
		
		// Combine template with generated code then show the output
		jQuery.get(selectedCodeGenerator.template, (data) => {
			var code = selectedCodeGenerator.generateCode();
			code = data.format({body: code, version: dbdesigner.version});
			this.showResults(code);
		});
	 };
	 
	 showResultsDialog(){
		if (Object.keys(dbdesigner.tables).length==0) {
			utils.bspopup("There should be at least one table");
			return;
		};
		
		utils.bspopup({
			title:"Code Generator",
			type:"radiolist", 
			text:"Select output format", 
			list: Object.keys(this.codeGenerators),
			button1: {text: "Ok", type: "btn-primary"},
			success: (event) =>{
				var outputType = event.value;
				this.generateCode(outputType);
			}
		});
	 };
	 
	/**
	 * Shows a modal window with the code that was generated by a codeGenerator
	 * @param code the code that was generated
	 */
	showResults(code) {
		if (jQuery(dbdesigner.namespaceWrapper + "#resultsDialog").length==0) {
			logger.log('resultsDialog not found in cache');
			jQuery(dbdesigner.namespaceWrapper + "#holderResults").load(dbdesigner.context + "assets/partials/resultsDialog.html?time=" + (new Date()).getTime(), (data) =>{
				logger.log("resultsDialog loaded.");
				
				jQuery(dbdesigner.namespaceWrapper + "#resultsDialog").on('shown.bs.modal', function(e) {
					logger.log("ResultsDialog is shown");
					//prettyPrint(); Is this really necessary?
				});
				
				this.showResults(code);
			});
			return;
		};
		
		jQuery(dbdesigner.namespaceWrapper + "#resultsDialog #theCode").empty();
		jQuery(dbdesigner.namespaceWrapper + "#resultsDialog #theCode").append('<pre class="prettyprint"></pre>');
		jQuery(dbdesigner.namespaceWrapper + "#resultsDialog #theCode pre").text(code);
		jQuery(dbdesigner.namespaceWrapper + "#resultsDialog").modal();
	};
		
	 
}; //class CodeGenerator

/**
 * ORMSQLAlchemy is an internal code Generator 
 * 
 * @param templateDir the directory where the templates are located
 * @return The created code.
 * */
class ORMSQLAlchemy{
    constructor(templateDir) {
    	this.template = templateDir+"sqlalchemy.py";
    }
    
	generateCode(){
		var code = '';
		
		 jQuery.each(dbdesigner.tables, function(tableId, table) {
			code += "class " + table.name + "(Base):\n";
			code += "\t" + "__tablename__ = \"" + table.name + "\"\n";
			jQuery.each(table.fields, function(fieldId, field){
				//embed quotes if they don't already exist
				if (field.type=='Text' || field.type=='String') {
					if (field.defaultValue!=null) {
						var sdef = field.defaultValue;
						if (sdef.indexOf('"') !=0) field.defaultValue = '"' + sdef;
						if (sdef.lastIndexOf('"') != sdef.length-1 || sdef.lastIndexOf('"')==-1) field.defaultValue += '"';
					};
					// Default text size is 255 if user didn't specify a size
					if (field.size==0) {
						field.size = 255;
					};
				};
				
				code += "\t" + field.name + " = Column(" 
				+ field.type + (field.size==0 ? '' : '(' + field.size + ')')
				+ (field.pkRef != null ? ", ForeignKey('" + field.pkRef + "')" : "")
				+ (field.primaryKey ? ", primary_key=True" : "")
				+ (field.unique ? ", unique=True" : "")
				+ (field.notNull ? ", nullable=False" : "")
				+ (field.defaultValue!=null ? ", default=" + field.defaultValue : "")
				+ ")\n";
			});
			code += "\n";
		});

		return code;
	}
};

/**
 * MySQL is an internal code Generator 
 * 
 * @param templateDir the directory where the templates are located
 * @return The created code.
 * 
 */
class MySQL{
    constructor(templateDir) {
    	this.template = templateDir+"mysql.sql";
    	this.rawTypes = {"Text": "varchar", "Integer": "int","Float": "float", "Date": "date", "DateTime": "datetime"};
    	this.deferForeignKeys = true; // Add foreign key constraint after running CREATE TABLE statement?
    }
    
    generateFKConstraint (sourceTableName, sourceTableFields, targetTableName, targetTableFields) {
    	return "alter table " + sourceTableName + " add constraint fk_" + sourceTableName +  "_" + targetTableName 
    			+  " foreign key (" + sourceTableFields +  ") references " + targetTableName +  "(" + targetTableFields  + ");"
    }    
    
    generateCode(){
		let code = '';
		let constraints = [];

		jQuery.each(dbdesigner.tables, (tableId, table) => {
			logger.info("Generating Code for Table " + table.name);
			
			code += "create table " + table.name + "\n(\n";
			
			const primaryFields = [];
			let primaryCount = 0;
			let targetTable;
			let targetField;
			
			// Collect number and names of primary key and referenced fields
			jQuery.each(table.fields, function(fieldId, field) {
				if (field.primaryKey) {
					primaryFields.push(field.name);
					primaryCount += 1;
				};
			});
			
			let fieldCode = [];
			let referencedTables = [];
			
			//generate the table and field dfinitions
			jQuery.each(table.fields, (fieldId, field) =>
			{
				if (field.type=='Text' || field.type=='String') {
					//embed quotes if they don't already exist
					if (field.defaultValue!=null) {
						const sdef = field.defaultValue;
						if (sdef.indexOf('"') !=0) field.defaultValue = '"' + sdef;
						if (sdef.lastIndexOf('"') != sdef.length-1 || sdef.lastIndexOf('"')==-1) field.defaultValue += '"';
					}
					
					// Default text size is 255 if user didn't specify a size
					if (field.size==0) {
						field.size = 255;
					}
				}
				
				fieldCode.push("\t" + field.name + " " + this.rawTypes[field.type] + (field.size==0 ? '' : '(' + field.size + ')')
				+ (field.notNull ? " not null" : "")
				+ (field.primaryKey && primaryCount == 1 ? " primary key" : "")
				+ (field.unique ? " unique" : "")
				+ (field.defaultValue != null ? " default " + field.defaultValue  : ""));
				
				if (field.pkRef != null) 
				{
					
					targetTable = dbdesigner.tables[field.pkRef.split(".")[0]];
					targetField = targetTable.fields[field.pkRef.split(".")[1]];
					
					//push to generate composite references later
					logger.debug("Pushing [" + targetTable.name+ "." + targetField.name + "," + table.name + "." + field.name +"] to referencedTables");
					referencedTables.push([targetTable.name+ "." + targetField.name, table.name + "." + field.name]);
				};
				
			}); //for each field
			
			//now generate the constraints with respect to composite keys
			let targetTableName;
			let targetFieldName;
			let sourceTableName;
			let sourceFieldName;
			let sourceTableFields = "";
			let targetTableFields = "";
			let lastReferencedTable = "";
			let constraint = "";
			
			//sort the array to have references to the same table in sequence
			if(referencedTables.length > 0){
				referencedTables.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
				logger.debug("sorted referencedTables = " + JSON.stringify(referencedTables));
				
				targetTableName = referencedTables[0][0].split(".")[0];
				targetFieldName = referencedTables[0][0].split(".")[1];
				sourceTableName = referencedTables[0][1].split(".")[0];
				sourceFieldName = referencedTables[0][1].split(".")[1];
				
				targetTableFields = targetFieldName;
				sourceTableFields = sourceFieldName;
				
				lastReferencedTable = targetTableName;
			}; 
			
			for (let i=1; i < referencedTables.length; i++){
				
				if (referencedTables[i][0].split(".")[0] == lastReferencedTable && referencedTables.length > 1){
				}else{
					if (targetTableFields == "") targetTableFields = targetFieldName;
					if (sourceTableFields == "") sourceTableFields = sourceFieldName;
					
					// add any constraints placed by raw formats like mysql and postgres.
					// save constraints in an array (they are added after all tables have been created)
					constraint = this.generateFKConstraint(sourceTableName, sourceTableFields, targetTableName, targetTableFields);
					
					logger.debug("Adding constraint: " + constraint);
					constraints.push(constraint);
					targetTableFields = "";
					sourceTableFields = "";
				};
				
				targetTableName = referencedTables[i][0].split(".")[0];
				targetFieldName = referencedTables[i][0].split(".")[1];
				sourceTableName = referencedTables[i][1].split(".")[0];
				sourceFieldName = referencedTables[i][1].split(".")[1];
				
				if (targetTableFields != ""){
					targetTableFields += ", " + targetFieldName;
					sourceTableFields += ", " + sourceFieldName;
				}else{
					targetTableFields = targetFieldName;
					sourceTableFields = sourceFieldName;
				};
				
				lastReferencedTable = targetTableName;
			};
			
			if (targetTableFields != ""){
				// add any constraints placed by raw formats like mysql and postgres.
				// save constraints in an array (they are added after all tables have been created)
				constraint = this.generateFKConstraint(sourceTableName, sourceTableFields, targetTableName, targetTableFields);
				logger.debug("Adding constraint: " + constraint);
				constraints.push(constraint);
			};
				
			// Add multi-field primary key if needed
			if (primaryCount > 1) {
				fieldCode.push("\tprimary key (" + primaryFields.join(', ') + ")");
			}
			
			// Add foreign key lines now if needed
			if (!this.deferForeignKeys) {
				fieldCode = fieldCode.concat(constraints);
				constraints = [];
			}
			
			// Add all the lines for declaring fields, primary keys, and FKs (if needed)
			code += fieldCode.join(",\n")+"\n);\n";
			
		}); //for each table

		// If foreign keys have to come after everything else, add them here
		if (this.deferForeignKeys) {
			code += constraints.join("\n");
		};
	
		return code;
    }
};

/**
 * SQLite is an internal code Generator.
 * SQLite inherits from MySQL. It's mostly the same syntax, the only difference is that
 * MySQL doesn't support ALTER TABLE ADD CONSTRAINT FOREIGN KEY, so FKs have to be added
 * as part of the CREATE TABLE statement. 
 * 
 * @param templateDir the directory where the templates are located
 * @return The created code.
 * 
 */
class SQLite extends MySQL{
	constructor(templateDir){
		
		super(templateDir);
		
		this.template = templateDir + "sqlite.sql";
		
		// Add foreign key constraint after running CREATE TABLE statement?
		this.deferForeignKeys = false;
	}
	
	generateFKConstraint(firstTableName, firstTableFields, secondTableName, secondTableFields) {
		return "\tforeign key (" + firstTableFields +  ") references " + secondTableName +  "(" + secondTableFields  + ")"
	}
}; 

export {CodeGenerator};