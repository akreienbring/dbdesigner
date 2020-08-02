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
import {storage} from "./localStorage.js";
import {utils} from "./utils.js";

import {Logger} from "./js-log.js";

const logger = Logger.getClassLogger("JsPlumbHelper");

/**
 * Wraps the jsPlumb Instance, binds events to it and provides some Helper-Methods to create or detach connections
 */
class JsPlumbHelper {
	constructor(){
		this.jsPlumbInstance = null;
	};
	
	/**
	* Get the connected Table and Field objects from a jsPlumb Connection or Info object
	* @param jsPlumbObj An object that has the source and target properties of a connection set
	* @return An object of the with the properties {sourceTableWithPrimary, sourceFieldWithPrimary, targetTableWithForeign, targetFieldWithForeign}
	*/
	getTables(jsPlumbObj){
		
		try{
			const pkey = jQuery(jsPlumbObj.source).attr('fpname').split(".");  //null if not a primary key
			const fkey = jQuery(jsPlumbObj.target).attr('ffname').split(".");
			
			//pkey[0] is the table name of the source table
			//pkey[1] is the field name of the source table
			//fkey[0] is the table name of the target table
			//fkey[1] is the field name of the tarbet table
			
			return {
				sourceTableWithPrimary:dbdesigner.tables[pkey[0]], 
				sourceFieldWithPrimary:dbdesigner.tables[pkey[0]].fields[pkey[1]],
				targetTableWithForeign:dbdesigner.tables[fkey[0]],
				targetFieldWithForeign:dbdesigner.tables[fkey[0]].fields[fkey[1]]
			};
		} catch (error) {
			//there are no valid source and target that can be connected
			return null;
		} 
	
	};

	/**
	 * CURRENTLY UNUSED! Creates jsPlumb connections between primary keys end foreign keys for the given table. 
	 */
	createTableConnections(table) {
		logger.info("(Re-)Creating the connections for table " + table.name);
		jQuery.each(table.fields, (fieldId, field) =>{
			if (field.pkRef != null) {
				logger.debug("Checking incoming connections for table *'" + table.name + "' and field '" + field.name + "'")
				//recreate an incoming connection
				const tsa = field.pkRef.split('.');
				logger.debug("source: " + tsa[0] + "." + tsa[1]);
				logger.debug("destination: " , field.fkEndpoint);
				jsPlumbHelper.jsPlumbInstance.connect({source: dbdesigner.tables[tsa[0]].fields[tsa[1]].pkEndpoint, target: field.fkEndpoint});
			};
			if (field.primaryKey){
				logger.debug("Checking outgoing connections for table *'" + table.name + "' and field '" + field.name + "'")
				//recreate an outgoing connection
				const referencers = field.getReferencers();
				let targetField = null;				
				for (let i = 0; i < referencers.length; i++) {
					logger.debug("source: " + table.id + "." + field.id);
					targetField = dbdesigner.tables[referencers[i].tableId].fields[referencers[i].fieldId];
					logger.debug("destination: " , targetField.fkEndpoint);
					jsPlumbHelper.jsPlumbInstance.connect({source: field.pkEndpoint, target: targetField.fkEndpoint});
				};
			};
		});
	};

	/**
	 * Creates jsPlumb connections between primary keys end foreign keys for all tables. 
	 * @see loadCanvasState
	 */
	createAllConnections() {
		logger.info("(Re-)Creating the connections");
		jQuery.each(dbdesigner.tables, (tableId, table) =>{
			jQuery.each(table.fields, (fieldId, field) =>{
				logger.debug("Checking incoming connections for table *'" + table.name + "' and field '" + field.name + "'")
				if (field.pkRef != null) {
					const tsa = field.pkRef.split('.');
					logger.debug("source: " + tsa[0] + "." + tsa[1]);
					logger.debug("destination: " , field.fkEndpoint);
					jsPlumbHelper.jsPlumbInstance.connect({source: dbdesigner.tables[tsa[0]].fields[tsa[1]].pkEndpoint, target: field.fkEndpoint});
				};
			});
		});
	};

	/**
	* Delete the reference to the primary field in the foreign field.
	* Also updates the storage.
	* @param connectedTables An object with the connected tables and fields
	* @see jsPlumb.onConnectionDetached
	* @see jsPlumb.onbeforeStartDetach
	*/
	detachConnection(connectedTables){
		connectedTables.targetFieldWithForeign.pkRef = null;
		const message = `${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`;
		utils.bsalert({title:"Detached connection", text: message, type:"success"});

		storage.updateField(connectedTables.targetTableWithForeign, connectedTables.targetFieldWithForeign, false);
	};
	
	createConnection(connectedTables){
		//set the reference to the primary field in the foreign field
		connectedTables.targetFieldWithForeign.pkRef = connectedTables.sourceTableWithPrimary.id + "." + connectedTables.sourceFieldWithPrimary.id;
		const message = `${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`;
		utils.bsalert({title:"Connection established", text:message, type:"success"});

		storage.updateField(connectedTables.targetTableWithForeign, connectedTables.targetFieldWithForeign, false);
	};
	
	/**
	* Checks if an intended connection is valid.
	* @param connectedTables An object with the connected tables and fields
	* @see jsPlumb.onBeforeDrop
	* @return true if the connection is valid
	*/
	isValidConnection(connectedTables){
		let message = "";
		if(connectedTables.targetFieldWithForeign.pkRef != null){
			message = `The foreign key ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name} is already
				referenced by ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name}
			`;
			utils.bsalert({title:"Existing Reference", text:message, type:"danger"});
			return false;
		};
		
		if (connectedTables.sourceTableWithPrimary.name == connectedTables.targetTableWithForeign.name && connectedTables.sourceFieldWithPrimary.name == connectedTables.targetFieldWithForeign.name) {
			message = "A field cannot have a reference to itself."
			utils.bsalert({title:"Self reference", text:message, type:"danger"});
			return false;
		};
		
		if(connectedTables.sourceTableWithPrimary.name == connectedTables.targetTableWithForeign.name){
			message = "Primary key and Foreign key must be in different tables";
			utils.bsalert({title:"Invalid Reference", text:message, type:"danger"});
			return false;
		};
		
		//Allow Integer and Serial as being equal types
		const sourceType = connectedTables.sourceFieldWithPrimary.type == "Serial" ? "Integer" : connectedTables.sourceFieldWithPrimary.type;
		const targetType = connectedTables.targetFieldWithForeign.type == "Serial" ? "Integer" : connectedTables.targetFieldWithForeign.type;
		if(sourceType != targetType){
			message = `${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name} and
				${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} must have the same type!
			`;
			utils.bsalert({title:"Type difference", text:message, type:"danger"});
			return false;
		};
		
		
		let isRedundant = false;
		jQuery.each(connectedTables.targetTableWithForeign.fields, function(fieldId, field) {
			if (connectedTables.targetFieldWithForeign.name !=  field.name && field.pkRef == connectedTables.sourceTableWithPrimary.name + "." + connectedTables.sourceFieldWithPrimary.name){
				//another field of the same table already has a connection to the same primary key in the source table
				message = `${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} already references ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}
				`;
				utils.bsalert({title:"Redundancy detected", text:message, type:"danger"});
				isRedundant = true;
				return false; // breaks the each loop
			};
		});
		if(isRedundant) return false;
		
		return true;
	};
} //class JsPlumbInstance

const jsPlumbHelper = new JsPlumbHelper();

jsPlumb.ready(function(){
	logger.log("jsPlumb is ready");
	
	jsPlumbInstance = jsPlumb.getInstance({
		Connector: "Straight",//Flowchart, Straight, Bezier
		MaxConnections : -1,
		PaintStyle: {stroke: "rgba(50,50,50,1)", strokeWidth:2.5},
		HoverPaintStyle: {strokeWidth:4},
    });
	
	jsPlumbInstance.setContainer(document.querySelector("div.dbdesigner div.canvas"));

	jsPlumbInstance.registerEndpointTypes({
	  "foreign":{         
			paintStyle: {fill:"blue", outlineStroke:"black", outlineWidth:1},
	        endpointHoverStyle: {fill:"red"},
	  },
	  "primary":{          
			paintStyle: {fill:"orange", outlineStroke:"black", outlineWidth:1 },
	        endpointHoverStyle: {fill:"green"}, 
	  },
	});
	
	jsPlumbHelper.jsPlumbInstance = jsPlumbInstance;
		
	/* jsPlumbInstance events */
	
	/**
	* This event is fired when a new or existing connection has been dropped
	* @param info has the following properties:
	*	sourceId - the id of the source element in the connection
	*	targetId - the id of the target element in the connection
	*	scope - the scope of the connection
	*	connection - the actual Connection object that is just about to created
	*	dropEndpoint - this is the actual Endpoint on which the Connection is being dropped.
	* @return if false or nothing is returned the the connection is not established
	*/
	jsPlumbInstance.bind("beforeDrop", function(info) {
		const connectedTables = jsPlumbHelper.getTables(info.connection);
		if(connectedTables){
			logger.debug(`jsPlumb beforeDrop was called for ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`);
			
			if(!jsPlumbHelper.isValidConnection(connectedTables)){
				return false;
			} else {
				jsPlumbHelper.createConnection(connectedTables);
				return true;
			};
		};
	}); 
	
	/**
	* This is called when the user starts to drag a new (unconnected) Connection.
	* @param params contain 
	* 	endpoint the Endpoint from which the user is dragging a Connection
	* 	source the DOM element the Endpoint belongs to
	*	sourceId the ID of the DOM element the Endpoint belongs to
	*/
	jsPlumbInstance.bind("beforeDrag", function(params) {
		logger.debug("jsPlumb beforeDrag was called");
	});

	/**
	* This is called when the user starts to drag an existing (connected) Connection.
	* @param params contain
	*	endpoint the Endpoint from which the user is dragging a Connection
	*	source the DOM element the Endpoint belongs to
	*	sourceId the ID of the DOM element the Endpoint belongs to
	*	connection The Connection that is about to be dragged.
	* @return if false is returned the connection can not be dragged.
	*/
	jsPlumbInstance.bind("beforeStartDetach", function(params) {
		const connectedTables = jsPlumbHelper.getTables(params.connection);
		if(connectedTables){
			logger.debug(`jsPlumb beforeStartDetach was called for ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`);
			
			if(params.endpoint.isTarget){
				logger.debug(`Foreign endpoint ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name} was dragged: DETACH`);
				jsPlumbHelper.detachConnection(connectedTables);
			} else {
				logger.debug(`Primary endpoint ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} was dragged: DO NOTHING`);
			}
		};
	});

	/**
	* This is called when the user has detached a Connection. (By dragging or programmatically)
	* @param connection The connection that is about to be detached
	* @return false - or nothing - from this callback will cause the detach to be abandoned, and the Connection will be reinstated or left on its current target.
	*/
	jsPlumbInstance.bind("beforeDetach", function(connection) {
		const connectedTables = jsPlumbHelper.getTables(connection);
		if(connectedTables){
			logger.debug(`jsPlumb beforeDetach was called for ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`);
	
			return true;  //this way "beforeDrop" is fired afterwards!
		};
	});

	/**
	* Notification an existing Connection is being dragged
	* @param connection The connection that is dragged
	*/
	jsPlumbInstance.bind("connectionDrag", function(connection) {
		const connectedTables = jsPlumbHelper.getTables(connection);
		if(connectedTables){
			logger.debug(`jsPlumb connectionDrag was called for ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`);
		};
	});
	
	/**
	* Fired if a Connection was detached.
	* @param info with the following properties
	*	connection - the Connection that was detached.
	*	sourceId - id of the source element in the Connection before it was detached
	*	targetId - id of the target element in the Connection before it was detached
	*	source - the source element in the Connection before it was detached
	*	target - the target element in the Connection before it was detached
	*	sourceEndpoint - the source Endpoint in the Connection before it was detached
	*	targetEndpoint - the targetEndpoint in the Connection before it was detached
	*/
	jsPlumbInstance.bind("connectionDetached", function(info, originalEvent) {
//		const connectedTables = jsPlumbHelper.getTables(info);
//		if(connectedTables){
//			logger.log(`jsPlumb connectionDetached was called for ${connectedTables.sourceTableWithPrimary.name}.${connectedTables.sourceFieldWithPrimary.name} -> ${connectedTables.targetTableWithForeign.name}.${connectedTables.targetFieldWithForeign.name}`);
//			
//			
//			// Don't do connection detached event if it wasn't caused by a user action
//			if (originalEvent == undefined) return;
//			
//			jsPlumbHelper.detachConnection(connectedTables);
//		};
	});
}); //jsPlumb.ready

export {jsPlumbHelper};