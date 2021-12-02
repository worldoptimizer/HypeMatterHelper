/*!
Hype Matter Helper 1.0.0
copyright (c) 2021 Max Ziebell, (https://maxziebell.de). MIT-license
*/

/*
* Version-History
* 1.0.0	Initial release under MIT-license
*/
if("HypeMatterHelper" in window === false) window['HypeMatterHelper'] = (function () {

	var _extensionName = 'Hype Matter Helper';
	var _installedCSS = false;

	/**
	 * Output an hint to the console to enable physics on an element being queried
	 *
	 * @param {HTMLDivElement} element The element to 
	 */
	function hintPhysicsEnabled(element, isDynamic){
		console.log(_extensionName + ': The element (' + element.id + ') must have '+(isDynamic? 'dynamic': 'static' )+' Physics enabled', element);
	}

	
	/**
	 * creates a node list if possible
	 *
	 * @param {String, Array} actions This can be a string, coma seperated string, array or nested array of coma seperated strings
	 * @return {Array} Returns a flat array
	 */
	 function resolveTargetToNodeList(target, singleNode, baseElm) {

		// it's a NodeList: All good!
		if (NodeList.prototype.isPrototypeOf(target)) {
			return singleNode? target[0] : target;

		// it is a Node: wrap in array to emulate a list
		} else if (Node.prototype.isPrototypeOf(target)) {
			return singleNode? target: [target];

		// it's a string: assume a selector to query all
		} else if (typeof target == 'string') {
			var sceneElm = baseElm || document;
			return singleNode? sceneElm.querySelector(target) : sceneElm.querySelectorAll(target);
		} 
	}


	function HypeDocumentLoad (hypeDocument, element, event) {
		
		/**
		 * This function wraps resolveTargetToNodeList, but defaults to current scene element over document
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 * @param {Boolean} singleNode Setting this to true switches from a nodelist to a single node
		 * @return {NodeList, Array} Makes sure we are dealing with a list
		 */
		 hypeDocument.resolveTargetToNodeList = function(target, singleNode, baseElm) {
			return resolveTargetToNodeList(target, singleNode, baseElm || document.getElementById(hypeDocument.currentSceneId() ));
		}

		/**
		 * Add a className to targets 
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 * @param {String} className the className to add
		 */
		 hypeDocument.addClassToTarget = function(target, className){
			var targetElms = hypeDocument.resolveTargetToNodeList(target);
			targetElms.forEach(function(elm){
				elm.classList.add(className);
			});
		}

		/**
		 * Remove a className from targets 
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 * @param {String} className the className to add
		 */
		hypeDocument.removeClassFromTarget = function(target, className, recursive){
			var targetElms = hypeDocument.resolveTargetToNodeList(target);
			targetElms.forEach(function(elm){
				elm.classList.remove(className);
				if (recursive) {
					elm.querySelectorAll('.'+className).forEach(function(elm){
						elm.classList.remove(className);
					});
				}
			});
		}
		
		/**
		 * Disables all pointer events by assigning a class to all targets. Requires the following class to be present
		 *
		 *		.disable-pointer-events, .disable-pointer-events * {
		 *			pointer-events: none !important;
		 *		}
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 */
		hypeDocument.disablePointerEvents = function(target){
			hypeDocument.addClassToTarget(target, "disable-pointer-events");
		}

		/**
		 * Enables all pointer events by removing a class to all targets.
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 */
		hypeDocument.enablePointerEvents = function(target){
			hypeDocument.removeClassFromTarget(target, "disable-pointer-events", true);
		}
		
		/**
		 * Query intersections of a points and elements using Matter.js
		 *
		 * @param {Nodelist} targetElms The target elements to query against
		 * @param {Vector} point The point containing the properties x and y to test against
		 * @return {Nodelist} Returns a list of targetElms that intersect with sourceElm
		 */
		hypeDocument.queryIntersectionsByPoint = function(target, point) {
			var targetElms = hypeDocument.resolveTargetToNodeList(target);
			var targetBodies = [];

			targetElms.forEach(function(elm){
				var elmBody = hypeDocument.getElementProperty(elm, 'physics-body');
				if (elmBody) {
					targetBodies.push(elmBody);
				} else {
					hintPhysicsEnabled(elm);
				}
			});
			var collisions = Matter.Query.point(targetBodies, point);
			if (collisions.length) return collisions.map(function(body){
				return document.getElementById(body.elementId);
			});
			return [];
		}

		/**
		 * Query intersections between elements using Matter.js
		 *
		 * @param {Node} sourceElm The source element used in each check
		 * @param {Nodelist} targetElms The target elements to query against
		 * @return {Nodelist} Returns a list of targetElms that intersect with sourceElm
		 */
		hypeDocument.queryIntersections = function(source, target) {
			var sourceElm = hypeDocument.resolveTargetToNodeList(source, true);
			if (sourceElm.offsetHeight==0) return;

			var targetElms = hypeDocument.resolveTargetToNodeList(target);
			var sourceBody = hypeDocument.getElementProperty(sourceElm, 'physics-body');

			if (sourceBody) {
				var targetBodies = [];
				targetElms.forEach(function(elm){
					if (elm.offsetHeight==0) return;
					var elmBody = hypeDocument.getElementProperty(elm, 'physics-body');
					if (elmBody) {
						targetBodies.push(elmBody);
					} else {
						hintPhysicsEnabled(elm);
					}
				});
				var collisions = Matter.Query.collides(sourceBody, targetBodies);
				if (collisions.length) {
					return collisions.map(function(collision){
						var isB = sourceElm.id == collision.bodyB.elementId;
						return document.getElementById((isB? collision.bodyA : collision.bodyB).elementId);
					});
				}
			} else {
				hintPhysicsEnabled(sourceElm);
			}
			return [];
		}

		/**
		 * Query intersections of a ray and elements using Matter.js
		 *
		 * @param {Nodelist} targetElms The target elements to query against
		 * @param {Vector} startPoint The startPoint contains the properties x and y of the ray start point
		 * @param {Vector} endPoint The endPoint contains the properties x and y of the ray end point
		 * @param {Number} rayWidth The width of the ray (optional)
		 * @return {Nodelist} Returns a list of targetElms that intersect with sourceElm
		 */
		hypeDocument.queryIntersectionsByRay = function(target, startPoint, endPoint, rayWidth) {
			var targetElms = hypeDocument.resolveTargetToNodeList(target);
			var targetBodies = []; rayWidth = rayWidth || 1;

			targetElms.forEach(function(elm){
				var elmBody = hypeDocument.getElementProperty(elm, 'physics-body');
				if (elmBody) {
					targetBodies.push(elmBody);
				} else {
					hintPhysicsEnabled(elm);
				}
			});
			var collisions = Matter.Query.ray(targetBodies, startPoint, endPoint, rayWidth);
			if (collisions.length) return collisions.map(function(collision){
				return document.getElementById(collision.body.elementId);
			});
			return [];
		}

		/**
		 * Disables physics collisions on all targets by setting a collision filter unused in Hype. The function stores the existing collision filter if needed. 
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 */
		hypeDocument.disablePhysicsCollisions = function(target) {
			var targetElms = hypeDocument.resolveTargetToNodeList(target);

			targetElms.forEach(function(elm){
				var elmBody = hypeDocument.getElementProperty(elm, 'physics-body');
				if (elmBody) {
					if (!elmBody._collisionFilter) {
						elmBody._collisionFilter = Object.assign({}, elmBody.collisionFilter);
					}
					elmBody.collisionFilter = { 'group': -1}
				}
			});
		}

		/**
		 * Enables physics collisions on all targets by restoring the previous collision filter.
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 */
		hypeDocument.enablePhysicsCollisions = function(target) {
			var targetElms = hypeDocument.resolveTargetToNodeList(target);

			targetElms.forEach(function(elm){
				var elmBody = hypeDocument.getElementProperty(elm, 'physics-body');
				if (elmBody && elmBody._collisionFilter) {
					elmBody.collisionFilter = elmBody._collisionFilter;
					delete elmBody._collisionFilter;
				}
			});
		}

		/**
		 * Add a force to an Matter object. It simplifies the process by using an angle. The source of the force is the element position (center), 
		 * but can tweaked using the options to add angular momentum bny either an absolute position or relative position
		 * 
		 * 	There is an options object that can contain the following values
		 * 	```
		 *	{
		 *		position: {
		 *	 		x: 123,
		 *			y: 456,
		 *			relative: true,
		 *		},
		 *		usePercentOfMass: true
		 *	}
		 *	```
		 *
		 * @param {String, NodeList, Node} target allows either type. Strings are considered a selector.
		 * @param {Number} force Is the amount of force to apply. If the option usePercentOfMass is set to true it becomes a percentage value of the mass the force is applied to.
		 * @param {Number} angle Is a angle in degrees 0-359 that is converted into a unit vector to be become multiplied by the forceMagnitude (0 is right, thereafter clockwise)
		 * @param {Object} options This is an optional object containing options like position.x, position.y, position.relative and usePercentOfMass
		 */
		hypeDocument.applyForce = function(target, force, angle, options){
			options = options || {};
			var forceMagnitude, position, targetElms = hypeDocument.resolveTargetToNodeList(target);
			var unitVector = {
				x: Math.cos(angle * Math.PI/180),
				y: Math.sin(angle * Math.PI/180),
			}

			targetElms.forEach(function(elm){
				var elmBody = hypeDocument.getElementProperty(elm, 'physics-body');
				if (!elmBody.isStatic) {
					forceMagnitude = options.usePercentOfMass? force/100 * elmBody.mass : force; 
					if (options.position){
						if (options.position.relative) {
							position = {
								x: elmBody.position.x + options.position.x,
								y: elmBody.position.y + options.position.y,
							}
						} else {
							position = options.position
						}
					} 
					Matter.Body.applyForce(elmBody, position || elmBody.position, { 
						x: unitVector.x * forceMagnitude,
						y: unitVector.y * forceMagnitude
					});
				} else {
					hintPhysicsEnabled(elm, true);
				}
			});
		}
		
		/**
		 * This function only serves as an alias preapplying usePercentOfMass
		 *
		 * See hypeDocument.applyForce
		 */
		hypeDocument.applyForceBasedOnMass = function(target, force, angle, options){
			hypeDocument.applyForce(target, force, angle, Object.assign(options || {}, {
				usePercentOfMass: true
			}));
		}
		
    /* Install CSS needed for this extension */
		if (!_installedCSS) {
			_installedCSS = true;
			var s=document.createElement("style");
			s.setAttribute("type","text/css"); 
			s.appendChild(document.createTextNode('.disable-pointer-events, .disable-pointer-events * { pointer-events: none !important;}'));
			document.getElementsByTagName("head")[0].appendChild(s);
		}
		
	}

	/* setup callbacks */
	if("HYPE_eventListeners" in window === false) { window.HYPE_eventListeners = Array();}
	window.HYPE_eventListeners.push({"type":"HypeDocumentLoad", "callback": HypeDocumentLoad});

	/**
	 * @typedef {Object} HypeMatterHelper
	 * @property {String} version Version of the extension
	 * @property {Function} sample Boilerplate text
	 */
	 var HypeMatterHelper = {
		version: '1.0.0',
		/* expert */
		resolveTargetToNodeList: resolveTargetToNodeList,
	};

	/** 
	 * Reveal Public interface to window['HypeMatterHelper']
	 * return {HypeMatterHelper}
	 */
	return HypeMatterHelper;
	
})();
