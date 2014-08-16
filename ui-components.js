/*
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013,2014 Generia [https://github.com/generia/ui-components]
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 */
var ui = (function(angular){

	var uiModule = angular.module('ui', []);

	uiModule.config(['$provide', '$httpProvider', function($provide, $httpProvider) {
	    $provide.decorator('$compile', ['$delegate', '$log', function ($delegate, $log) {
	        //$log.info("compile-decorator: ", $delegate);

	        var compile = function(element, transclude, maxPriority) {
                var isString = typeof element === "string";
                if (!isString) {
                    var dc = findDeclaringComponentByUuid(element);
                    //$log.info("decorated compile-function BEG: ", element, transclude, maxPriority, dc);
                    pushDeclaringComponent(dc);
                }
	            var linkFn = $delegate(element, transclude, maxPriority);
	            var uiLinkFn = function(scope, cloneConnectFn){
	                //$log.info("decorated link-function BEG: ", scope, cloneConnectFn);
	                var o = linkFn(scope, cloneConnectFn);
	                //$log.info("decorated link-function END: ", scope, cloneConnectFn, o);
	                return o;
	            };
                if (!isString) {
	            	popDeclaringComponent();
                }
	            //$log.info("decorated compile-function END: ", element, transclude, maxPriority, uiLinkFn);
	            return uiLinkFn;
	        };
	        return compile;
	    }]);
	    $provide.decorator('$parse', ['$delegate', '$log', function ($delegate, $log) {
	        //$log.info("parse-decorator: ", $delegate);

	        var parse = function uiParse(expression) {
	            var parts = decodeUuid(expression);
	            if (parts.uuid) {
	                //$log.info("parse-function BEG:", expression, parts);
	            }
	            var exprFn = $delegate(parts.expr);
	            var exprAssignFn = exprFn.assign;
	            var exprConstant = exprFn.constant;
	            var wrappedFn = function uiParseEval(scope, locals) {
	                var declaringScope = scope;
          			//$log.info("parse-eval-function BEG", expression, scope, locals, "declaring-uuid", parts.uuid, "expr-fn", exprFn);
	                if (parts.uuid) {
	                    declaringScope = getDeclaringScopeByUuid(parts.uuid);
	                }
	                try {
	                    var value = exprFn(declaringScope, locals);
	                    if (parts.uuid) {
	                    }
			            //$log.info("parse-eval-function END", expression, scope, locals, "value", value, "declared-uuid", parts.uuid, "declaring-scope", declaringScope);
	                    return value;
	                } catch (e) {
	                    $log.error("parse-eval-function ERR", expression, scope, locals, "declared-uuid", parts.uuid, "declaring-scope", declaringScope, e);
	                    return null;
	                }
	            };
	            wrappedFn.constant = exprConstant;
	            wrappedFn.expression = expression;
	            
	            if (exprAssignFn) {
	                wrappedFn.assign = function(scope, value) {
	                    var declaringScope = scope;
            			//$log.info("expr-setter BEG", expression, scope, "declaring-uuid", parts.uuid);
	                    if (parts.uuid) {
	                        declaringScope = getDeclaringScopeByUuid(parts.uuid);
	                    }
	                    var result = exprAssignFn(declaringScope, value);
			            //$log.info("expr-setter END", expression, scope, "value", value, "declared-uuid", parts.uuid, "declaring-scope", declaringScope);
	                    return result;
	                };
	            }
	            if (parts.uuid) {
	                //$log.info("parse-function END:", expression, exprFn, exprFn.assign, "assign", exprAssignFn, wrappedFn.assign);
	            }
	            return wrappedFn;
	        };
	        return parse;
	    }]);
	    $provide.decorator('$interpolate', ['$delegate', '$log', function ($delegate, $log) {
	        //$log.info("interpolate-decorator: ", $delegate);

	        var interpolate = function uiInterpolate(text, mustHaveExpression, trustedContext) {
	            //$log.info("interpolate-function BEG:", text);
	            var parts = decodeUuid(text);
	            var exprFn = $delegate(parts.expr, mustHaveExpression, trustedContext);
	            if (exprFn) {
	                var wrappedFn = function uiInterpolateEval(context, locals) {
	                    if (parts.uuid) {
	                        context = getDeclaringScopeByUuid(parts.uuid);
	                    }
	                    //$log.info("interpolate-expr-function BEG", text, parts.expr, mustHaveExpression, trustedContext, "declared-uuid", parts.uuid, "context", context, "locals", locals, "exprFn", exprFn);
	                    try {
	                        var value = exprFn(context, locals);
	                       // $log.info("interpolate-expr-function END", text, parts.expr, mustHaveExpression, trustedContext, "declared-uuid", parts.uuid, "context", context, "locals", locals, "value", value);
	                        return value;
	                    } catch (e) {
	                        $log.error("interpolate-expr-function ERR", text, parts.expr, mustHaveExpression, trustedContext, "declared-uuid", parts.uuid, "context", context, "locals", locals);
	                        return null;
	                    }
	                };
	                wrappedFn.text = text;
	                //$log.info("interpolate-function END:", text, exprFn);
	                return wrappedFn;
	            }
	            return exprFn;
	        };
	        interpolate.startSymbol = $delegate.startSymbol;
	        interpolate.endSymbol = $delegate.endSymbol;
	        return interpolate;
	    }]);
	    $provide.decorator('$rootScope', ['$delegate', '$log', '$rootElement', function ($delegate, $log, $rootElement) {
	        //$log.info("rootScope-decorator: ", $delegate, $rootElement);
	        setUuid($rootElement, getComponentUuid($rootElement, appRootScopes.length));
	        
	        appRootScopes.push($delegate);
	        $delegate.declaredComponentMap = {};
	        $delegate.declaredUuidMap = {};
	        $delegate.uuidScopeMap = {};
	        $delegate.uuidScopeMap[getUuid($rootElement)] = $delegate;
	        setNode($delegate, $rootElement);

            function getPrototypeOf(object) {
				if (typeof Object.getPrototypeOf !== "function") {
					return object.constructor.prototype;
				} else {
					return Object.getPrototypeOf(object);
				}
	        }
	        var elementProto = getPrototypeOf($rootElement);
	        (function(data) {
	        	elementProto.dataUiOrig = data;
	            elementProto.data = function uiData(key, value) {
	                //console.info("data BEG", "key", key, "value", value, "this", this);
	                var result = data.apply(this, arguments);
	                if ((key == '$scope' || key == '$isolateScope') && !angular.isUndefined(value)) {
	                	var scope = value;
	                    setNode(scope, result);
	                    scope.declaredUuid = getUuid(result);
	                    var appRootScope;
	                    if (scope.declaredUuid) {
		                    appRootScope = getRootScopeByUuid(scope.declaredUuid);
		                    appRootScope.uuidScopeMap[scope.declaredUuid] = scope;
	                        scope.declaringUuid = appRootScope.declaredUuidMap[scope.declaredUuid];
	                    } else {
							var declaringScope = getDeclaringScope(scope);
							scope.declaringUuid = declaringScope.declaredUuid;
		                    appRootScope = getRootScopeByUuid(scope.declaringUuid);
	                    }
                        scope.declaringScope = appRootScope.uuidScopeMap[scope.declaringUuid];
	                    /*
	                    var declaringComponent = null;
                        if (scope.declaringScope) {
                            declaringComponent = getNode(scope.declaringScope);
                        }
	                    console.info("$delegate", $delegate, "appRootScope", appRootScope, "attaching scope", scope, " to ", result, "uuid", getUuid(result), "declaring-uuid", getUuid(declaringComponent), "declaring-scope", scope.declaringScope, "declaring-component", declaringComponent, "declared-data", result.data(), "declaring-data", (declaringComponent ? declaringComponent.data() : 'none'));
						*/

	                } else {
	                    //console.info("called data(", key, value, ") -> ", result);
	                }
	                //console.info("data END", "key", key, "value", value, "this", this, "->", result);
	                return result;
	            };
	        })(elementProto.dataUiOrig || elementProto.data);

	        var scopeProto = Object.getPrototypeOf($delegate);
	        (function($new) {
	        	scopeProto.$newUiOrig = $new;
	        	scopeProto.$new = function uiNew(isolate) {
	                var newScope = $new.apply(this, arguments);
	                //console.info("created new scope", newScope, "for parent ", this, " on current declaring-component ", currentDeclaringComponent());
	                return newScope;
	            };
	        })(scopeProto.$newUiOrig || scopeProto.$new);

	        (function($watch) {
	        	scopeProto.$watchUiOrig = $watch;
	        	scopeProto.$watch = function uiWatch(watchExp, listener, objectEquality) {
	                //console.log("Scope.watch BEG", this, "watch-exp", watchExp, "listener", listener);
	                var result = $watch.apply(this, arguments);
	                //console.log("Scope.watch END", this, "watch-exp", watchExp, "listener", listener, " -> ", result);
	                return result;
	            };
	        })(scopeProto.$watchUiOrig || scopeProto.$watch);

	        return $delegate;
	    }]);
	    $provide.decorator('$http', ['$delegate', '$log', 'declaringComponentHolder', function ($delegate, $log, declaringComponentHolder) {
	        //$log.info("httpProvider-decorator: ", $delegate);

	        var getFn = $delegate.get;
	        var wrappedFn = function(url, config) {
	            var parts = decodeUuid(url);
	            if (parts.uuid == null) {
	                return getFn(url, config);
	            }
	            config.declaringUuid = parts.uuid;
	            var future = getFn(parts.expr, config);
	            var successFn = future.success;
	            future.success = function(fn) {
	                var wrappedFn = function(data, status, headers, config) {
	                    var dc = declaringComponentHolder.getDeclaringComponent(url);
	                    //console.log("call success-fn BEG", future, "for url", url, status, "config", config, dc, "declaring-uuid", getUuid(dc));
	                    pushDeclaringComponent(dc);
	                    var o = fn(data, status, headers, config);
	                    popDeclaringComponent();
	                    //console.log("call success-fn END", future, "for url", url, status, "config", config, o);
	                    return o;
	                };
	                return successFn(wrappedFn);
	            };
	            /*
	            var errorFn = future.error;
	            future.error = function(fn) {
	                var wrappedFn = function(data, status, headers, config) {
	                    console.log("call error-fn", data, status, headers, config);
	                };
	                return errorFn(wrappedFn);
	            };
				*/
	            return future;
	        };
	        $delegate.get = wrappedFn;
	        //$log.info("httpProvider-decorator: ", $delegate, $delegate.get);
	        return $delegate;
	    }]);
	}]);

	uiModule.factory('declaringComponentHolder', ['$log', function ($log) {
	    var declaringComponentMap = {};

	    var holder = {};
	    holder.setDeclaringComponent = function (templateUrl, declaringComponent) {
	        declaringComponentMap[templateUrl] = declaringComponent;
	        //$log.info("holder: setting ", templateUrl, " to ", declaringComponent);
	    };
	    holder.getDeclaringComponent = function (templateUrl) {
	        var dc = declaringComponentMap[templateUrl];
	        //$log.info("holder: getting ", templateUrl, " as ", dc);
	        return dc;
	    };
	    return holder;
	}]);


	function logObj(obj) {
	    for(i in obj) {
	        console.log("The value of obj." + i + " = " + obj[i]);
	    }
	}
	function logElement(element) {
	    var tree = buildTree(element);
	    console.log("tree: ", tree);
	}

	function buildTree(element) {
	    var tagName = element.tagName;
	    var attrs = {};
	    angular.forEach(element.attributes, function(attr) {
	        attrs[attr.nodeName] = attr.nodeValue;
	    });
	    var children = [];
	    angular.forEach(element.children, function(child) {
	        children.push(buildTree(child));
	    });
	    var data = angular.element(element).data();
	    var info = {
	        tagName: tagName,
	        attrs: attrs,
	        data: data,
	        children: children
	    };
	    return info;
	}

	var appRootScopes = [];
	
	function getRootScopeByUuid(uuid) {
		var rootId = getRootIdByUuid(uuid);
		return appRootScopes[rootId];
	}
	
	function getRootElement(node) {
		var parent = node;
		while(parent !== undefined && parent.length != 0) {
			var uuid = getUuid(parent);
			if (isRootUuid(uuid)) {
				return parent;
			}
			parent = parent.parent();
		}
		return null;
	}
	
	function isRootUuid(uuid) {
		if (uuid == null) {
			return false;
		}
		var rootScope = getRootScopeByUuid(uuid);
		var rootElement = getNode(rootScope);
		return uuid == getUuid(rootElement);
	}
	
	function getRootIdByUuid(uuid) {
		var parts = uuid.split(".");
		return parts[0];
	}
	
	var componentIdSequence = 0;
	var declaringComponentStack = [];
	
	function getComponentUuid(node, rootId) {
		var uuid = (componentIdSequence++).toString();
		if (rootId != null) {
			uuid = rootId + "." + uuid;
		} else {
			uuid = uuid + "." + uuid;
		}
	    return uuid;
	}
	function pushDeclaringComponent(node) {
	    declaringComponentStack.push(node);
	    //console.log("pushDeclaringComponent:", node);
	}

	function popDeclaringComponent() {
	    var node = declaringComponentStack.pop();
	    //console.log("popDeclaringComponent:", node);
	    return node;
	}

	function currentDeclaringComponent() {
	    if (declaringComponentStack.length > 0) {
	        return declaringComponentStack[declaringComponentStack.length-1];
	    }
	    return null;
	}


	function encodeUuid(uuid, expression) {
	    return "ui(" + uuid + ")-" + expression;
	}

	function decodeUuid(expression) {
	    var regex = /ui\(([0-9]+\.[0-9]+)\)-(.*)/;
	    var result = regex.exec(expression);
	    var parts = {uuid: null, expr: expression};
	    if (result == null) {
	        return parts;
	    }
	    var uuid = result[1];
	    var expr = result[2];
	    if (uuid) {
	        parts = {uuid: uuid, expr: expr};
	    }
	    return parts;
	}

	var uuidAttr = '_uuid';

	function getNode(scope) {
	    if (angular.isUndefined(scope)) {
	        return null;
	    }
		return scope.element;
	}

	function setNode(scope, node) {
		scope.element = node;
	}
	
 	function getUuid(node) {
	    if (angular.isUndefined(node)) {
	        return null;
	    }
	    var uuid = angular.element(node).attr(uuidAttr);
	    if (uuid) {
	        return uuid;
	    }
	    if (node == null) {
	        //console.warn("can't get uuid for node ", node);
	        return null;
	    }
	    return uuid;
	    
	}

	function setUuid(node, uuid) {
		angular.element(node).attr(uuidAttr, uuid);
	}

	function registerDeclaredComponent(node, attrs) {
	    var declaringComponent = currentDeclaringComponent();
	    if (declaringComponent == null) {
	        declaringComponent = findDeclaringComponent(node);
	    }
	    var declaringUuid = getUuid(declaringComponent);
	    var declaredUuid = getComponentUuid(node, getRootIdByUuid(declaringUuid));
	    setUuid(node, declaredUuid);
	    attrs[uuidAttr] = declaredUuid;
	    var appRootScope = getRootScopeByUuid(declaredUuid);
	    //console.log("registerDeclaredComponent: declared-uuid", declaredUuid, "declaring-uuid", declaringUuid, "declared-node", node[0], "declaring-component", declaringComponent);
	    appRootScope.declaredComponentMap[declaredUuid] = declaringComponent;
	    appRootScope.declaredUuidMap[declaredUuid] = declaringUuid;
	    return declaringComponent;
	}


	function getDeclaringComponent(declaredComponent) {
	    declaredComponent = angular.element(declaredComponent);
	    var declaredUuid = getUuid(declaredComponent);
	    if (declaredUuid == null) {
	       // console.log("no uuid for declared-component", declaredComponent);
	        var dc = findDeclaringComponent(declaredComponent);
	        return dc;
	    }
	    return getDeclaringComponentByUuid(declaredUuid);
	}


	function getDeclaringComponentByUuid(declaredUuid) {
	    var appRootScope = getRootScopeByUuid(declaredUuid);
	    var declaringComponent = appRootScope.declaredComponentMap[declaredUuid];
	    if (!isRootUuid(declaredUuid) && (declaringComponent == null || angular.isUndefined(declaringComponent))) {
	        //console.warn("can't find declaring-component for uuid: ", declaredUuid);
	        declaringComponent = getNode(rootScope);
	    }
	    return declaringComponent;
	}

		
	function getDeclaringScope(scope) {
		var parent = scope.$parent;
		while (parent != null) {
			if (parent.declaredUuid) {
				return parent;
			}
			parent = parent.$parent;
		}
		return null;
	}

	function getDeclaringScopeByUuid(declaredUuid) {
	    var declaringScope = null;
	    var appRootScope = getRootScopeByUuid(declaredUuid);
	    var declaringUuid = appRootScope.declaredUuidMap[declaredUuid];
	    if (declaringUuid) {
	        declaringScope = appRootScope.uuidScopeMap[declaringUuid];
	    }
	    if (declaringScope == null) {
	        var declaringComponent = getDeclaringComponentByUuid(declaredUuid);
	        //console.warn("declaring-component not found in scope-map, using declaring-component", declaringComponent, "instead");
	        declaringScope = declaringComponent.data("$scope");
	    }
	    return declaringScope ? declaringScope : null;
	}


	function findDeclaringComponent(node) {
	    var context = findParentNode(node, "ng-isolate-scope");
	    if (context == null) {
	        context = getRootElement(node);
	    }
	    return context;
	}

	function findParentNode(node, styleClass) {
	    var parent = node.parent();
	    var cls = parent.attr("class");
	    if (cls && cls.contains(styleClass)) {
	        return parent;
	    }
	    if (parent && parent != node && parent.length > 0) {
	        return findParentNode(parent, styleClass);
	    }
	    return null;
	}

    function findDeclaringComponentByUuid(node) {
        var uuid = getUuid(node);
        if (uuid) {
            return node;
        }
        var parent = node.parent();
        if (parent && parent != node && parent.length > 0) {
            return findDeclaringComponentByUuid(parent);
        }
        return null;
    }

	function getComp(scope) {
	    var comp = scope.comp;
	    var uuid = scope.declaredUuid;
	    while (angular.isUndefined(comp) && scope.$parent != null && uuid == scope.$parent.declaredUuid) {
	        scope = scope.$parent;
	        comp = scope.comp;
	    }
	    return comp;
	}

	function logScopes() {
		for (var i = 0; i < appRootScopes.length; i++) {
			var appRootScope = appRootScopes[i];
			logScope(appRootScope, "root-scope #" + i + ": ");
		}
	}
	function logScope(scope, ind) {
	    var declaringScope = scope.declaringScope;
	    var declaredNode = scope.element;
	    var declaringNode = declaringScope ? declaringScope.element : null;
	    var transcluded = scope.$$transcluded ? "transcluded " : "";
	    var uiName = scope.comp ? scope.comp.uiName : (isRootUuid(scope.declaredUuid) ? "<root>" : "?comp?");
	    var scopeId = declaringScope ? declaringScope.$id : (isRootUuid(scope.declaredUuid) ? undefined : "?$id?");
	    //console.log(ind, "declared-uuid", scope.declaredUuid, "declaring-uuid", scope.declaringUuid, "declared-node", declaredNode, "declaring-node", declaringNode, "scope: ", scope, "declaring-scope", scope.declaringScope);
	    console.log(ind, transcluded + uiName, "uuid: ", scope.declaredUuid, "->", scope.declaringUuid, "scope: ", scope.$id, "->", scopeId, scope, "node: ", declaredNode, "->", declaringNode);
	    var child = scope.$$childHead;
	    while (child != null && child !== scope) {
	        logScope(child, ind + "  ");
	        child = child.$$nextSibling;
	    }
	}

	function logComps() {
		for (var i = 0; i < appRootScopes.length; i++) {
			var appRootScope = appRootScopes[i];
			logComp(appRootScope, "root-comp #" + i + ": ");
		}
	}
	function logComp(scope, ind) {
	    var declaredNode = scope.element;
	    var uiName = scope.comp ? scope.comp.uiName : (isRootUuid(scope.declaredUuid) ? "<root>" : "?comp?");
	    var declaredComp = scope.comp;
	    var declaredUuid = scope.declaredUuid;
	    if (declaredUuid && !scope.$$transcluded) {
	    	console.log(ind, uiName, "uuid: ", scope.declaredUuid, "comp: ", declaredComp, "node: ", declaredNode);
	    }
	    var child = scope.$$childHead;
	    while (child != null && child !== scope) {
	        logComp(child, ind + (declaredUuid ? "  " : ""));
	        child = child.$$nextSibling;
	    }
	}
	
    function getChildCompScopes(scope) {
        var childCompScopes = [];
        collectChildCompScopes(scope, childCompScopes);
        return childCompScopes;
    }

    function collectChildCompScopes(scope, childCompScopes) {
        var child = scope.$$childHead;
        while (child != null && child !== scope) {
            if (child.declaredUuid && !child.$$transcluded) {
                childCompScopes.push(child);
            } else {
                collectChildCompScopes(child, childCompScopes);
            }
            child = child.$$nextSibling;
        }
    }

	function createComponent(pkg, name, tag, attrs, controller, requires) {
	    var ngScope = {};
	    var module = angular.module(name, requires || []);
	    angular.forEach(attrs, function(spec, attr) {
	        if (spec == '=' || spec == '&' || spec == '~') {
	           // handled in controller._bindUiAttrs 
	        } else {
	            ngScope[attr] = spec;
	        }
	    });
	    module.directive(tag, ['declaringComponentHolder', '$controller', '$injector', function(declaringComponentHolder, $controller, $injector){
	        return {
	            restrict: 'E',
	            replace: true,
	            transclude: true,
	            scope: ngScope,
	            templateUrl: function uiTemplateUrl($compileNode, tAttrs) {
	                /*var declaringComponent = */registerDeclaredComponent($compileNode, tAttrs);
	                var uuid = getUuid($compileNode);
	                angular.forEach(ngScope, function(value, key){
	                    tAttrs[key] = encodeUuid(uuid, tAttrs[key]);
	                });
	                var templateUrl = (pkg != '' ? pkg + '/' : '') + name + '.html';
	                if ($injector.has('templateProvider')) {
	                	var templateProvider = $injector.get('templateProvider');
	                	templateUrl = templateProvider.getTemplateUrl(pkg, name, tAttrs);
	                }
	                templateUrl = encodeUuid(uuid, templateUrl);
	                //console.log(name + "-template-url: ", $compileNode, tAttrs, "declared-component", getUuid($compileNode), $compileNode, "declaring-component", declaringComponent, getUuid(declaringComponent));
	                declaringComponentHolder.setDeclaringComponent(templateUrl, $compileNode);
	                return templateUrl;
	            },
	            controller: decorateController(name, attrs, $controller, controller)
	        };
	    }]);
        return module;
	}

	function firstUp(name) {
	    if (name.length < 1) {
	        return name.toUpperCase();
	    }
	    return name.substring(0,1).toUpperCase() + name.substring(1);
	}

	function firstDown(name) {
	    if (name.length < 1) {
	        return name.toLowerCase();
	    }
	    return name.substring(0,1).toLowerCase() + name.substring(1);
	}

	function decodeComponentAttrName(attrName) {
	    return attrName;
	}

	function encodeComponentAttrName(attrName) {
	    return attrName;
	}
	
	function compileFns(preFn, postFn) {
		var compileFn = {
			pre: preFn,
			post: postFn
		};
		// attach isolateScope flag
		compileFn.pre.isolateScope = true;
		compileFn.post.isolateScope = true;
		return compileFn;
	}

	function decorateController(name, attrs, $controller, controller) {
	    return ['$scope', '$parse', '$interpolate', '$compile', '$log', function UiComponentController($scope, $parse, $interpolate, $compile, $log) {
	        $scope.comp = {
	            uiName: name
	        };
	        var locals = {
	            '$scope': $scope,
	            'comp': $scope.comp
	        };
	        //console.log("decorateController:", name, controller);
	        
	        // initialize comp
	        $controller(controller, locals);
	        
	        // bind attribute expressions
	        bindUiAttrs(name, $scope, attrs, $parse, $interpolate, $compile, $log);
	    }];
	}
	
	function bindUiAttrs(componentName, scope, attrs, $parse, $interpolate, $compile, $log) {
		var element = scope.element;
		// NOTE: create a fake Attributes object, since there is no access to "$compile.directive.Attributes(element)"
		var attributes = {};
        var comp = getComp(scope);
        if (angular.isUndefined(comp)) {
            $log.warn("bindUiAttrs: comp not defined for directive ", directiveName,attr, expr, scope, declaringScope);
        }
		//console.log("bind-attr", element, attrs);
	    angular.forEach(attrs, function(spec, attr) {
        	var directiveName = snake_case(attr, '-');
        	// check, if attr is given at the component-tag
            var expr = element.attr(directiveName);
        	if (expr) {
        		//console.log("bind-attr-bind", spec,attr, directiveName, expr);
        		// use parent here instead of declaringScope to serve ng-repeat scopes as well
        		var parent = scope.$parent;
        		attributes[attr] = expr;
	            bindAttr(componentName, $parse, $interpolate, parent, comp, scope, attributes, spec, attr);
        	}
	    });
	};
	
	var SNAKE_CASE_REGEXP = /[A-Z]/g;
	function snake_case(name, separator){
	  separator = separator || '_';
	  return name.replace(SNAKE_CASE_REGEXP, function(letter, pos) {
	    return (pos ? separator : '') + letter.toLowerCase();
	  });
	}

    var LOCAL_REGEXP = /^\s*([@=&])(\??)\s*(\w*)\s*$/;

    function bindAttr(componentName, $parse, $interpolate, scope, isolateScope, realIsolateScope, attrs, definition, scopeName) {
    	// NOTE: the directive-scope binding was copied from angular's "nodeLinkFn"
    	//       implementing the "scope" hash of a "Directive Definition Object" as in https://docs.angularjs.org/api/ng/service/$compile 
    	
        var match = definition.match(LOCAL_REGEXP) || [],
        attrName = match[3] || scopeName,
        optional = (match[2] == '?'),
        mode = match[1], // @, =, or &
        lastValue,
        parentGet, parentSet, compare;
	
	    //isolateScope.$$isolateBindings[scopeName] = mode + attrName;
	
	    switch (mode) {
	
	      case '@':
	    	 /*
	        attrs.$observe(attrName, function(value) {
	          isolateScope[scopeName] = value;
	        });
	        attrs.$$observers[attrName].$$scope = scope;
	        if( attrs[attrName] ) {
	          // If the attribute has been provided then we trigger an interpolation to ensure
	          // the value is there for use in the link fn
	          isolateScope[scopeName] = $interpolate(attrs[attrName])(scope);
	        }
	        */
	    	throw new Error("The '@' scope-binding on attribute '" + attrName + "' for component '" + componentName + "' is not supported for ui-components.");
	
	      case '=':
	        if (optional && !attrs[attrName]) {
	          return;
	        }
	        parentGet = $parse(attrs[attrName]);
	        if (parentGet.literal) {
	          compare = equals;
	        } else {
	          compare = function(a,b) { return a === b || (a !== a && b !== b); };
	        }
	        parentSet = parentGet.assign || function() {
	          // reset the change, or we will throw this exception on every $digest
	          lastValue = isolateScope[scopeName] = parentGet(scope);
	          /* relax binding requirements, bound expressions need not be assignable
	          throw $compileMinErr('nonassign',
	              "Expression '{0}' used with directive '{1}' is non-assignable!",
	              attrs[attrName], newIsolateScopeDirective.name);
	          */
	        };
	        lastValue = isolateScope[scopeName] = parentGet(scope);
	        realIsolateScope.$watch(function parentValueWatch() {
	          var parentValue = parentGet(scope);
	          if (!compare(parentValue, isolateScope[scopeName])) {
	            // we are out of sync and need to copy
	            if (!compare(parentValue, lastValue)) {
	              // parent changed and it has precedence
	              isolateScope[scopeName] = parentValue;
	            } else {
	              // if the parent can be assigned then do so
	              parentSet(scope, parentValue = isolateScope[scopeName]);
	            }
	          }
	          return lastValue = parentValue;
	        }, null, parentGet.literal);
	        break;
	
	      case '&':
	        parentGet = $parse(attrs[attrName]);
	        isolateScope[scopeName] = function(locals) {
	          return parentGet(scope, locals);
	        };
	        break;
	
	      default:
	    	throw new Error("Invalid scope definition for component '" + componentName + "'." +
	            " Definition: {... " + scopeName + ": '" + definition + "' ...}");
	    }
    }
    
    
	uiModule.directive("uid", function(){
	    return {
	        restrict: 'A',
	        compile: function(tElement, tAttrs, transclude) {
	            //console.log("compile-uid", tElement, tAttrs, transclude);
	            return compileFns(
	                function uiUidPreLink(scope, iElement, iAttrs, controller) {
	                },
	                function uiUidPostLink(scope, iElement, iAttrs, controller) {
                        function isRepeat(scope) {
                            return scope !== undefined && scope.$index !== undefined && scope.$first !== undefined && scope.$last !== undefined;
                        }
                        if (scope) {
                            var ds = isRepeat(scope.$parent) ? scope.$parent : scope.declaringScope;
	                        var uid = iAttrs.uid;
	                        var comp = getComp(scope);
	                        //console.log("link-uid-post", uid, scope, tElement, tAttrs, controller, "declaring-scope", ds, "comp", comp);
	                        ds[uid] = comp;
	                        //console.log("link-uid-post", scope, tElement, tAttrs, controller);
	                    }
                    }
	            );
	        }
	    };
	});

	uiModule.directive("uiShow", ['$parse', '$animate', function($parse, $animate) {
	    return {
	        restrict: 'A',
	        compile: function(tElement, tAttrs, transclude) {
	            var expr = tAttrs["uiShow"];
	            var uuid = getUuid(tElement);
	            var uiExpr = encodeUuid(uuid, expr);
	            //console.log("compile-uiShow", tElement, tAttrs, transclude, expr, uuid, uiExpr, $animate);
	            return compileFns(
	                function(scope, iElement, iAttrs, controller) {
	                    //console.log("link-uid-pre", scope, tElement, tAttrs, controller, "declaring-scope", ds);
	                },
	                function(scope, iElement, iAttrs, controller) {
	                	if (scope) {
		                    //var ds = scope.declaringScope;
		                    //console.log("ui-show-post", scope, tElement, tAttrs, controller, "uuid", getUuid(tElement), "declaring-scope", getUuid(ds), ds);
		                    scope.$watch(uiExpr, function uiShowWatcher(value) {
		                      //  console.log("ui-show-watch", scope, tElement, tAttrs, controller, "uuid", getUuid(tElement), "declaring-scope", getUuid(ds), ds, "->", value);
		                        if (value) {
		                            //iElement.removeClass("ng-hide");
		                        	$animate.removeClass(iElement, 'ng-hide');
		                        } else {
		                        	$animate.addClass(iElement, 'ng-hide');
		                            //iElement.addClass("ng-hide");
		                        }
		                        return value;
		                    });
	                	}
	                }
	            );
	        }
	    };
	}]);
	
	/**
	 * @exports ui
	 */
	var exports = {
		/**
		 * Creates a ui-component.
		 * @param {string} pkg - The package for this component. This is denoted by the path to the `component.js` and `component.html` files relative to the application folder.
		 * @param {string} name - The name of the component. The name is expected to be a valid camel-case javascript identifier starting with an upper-case letter.
		 * @param {map} attrs - Map of attribute definitions. A map entry consists of the attribute name as key and the binding-specification a value. This follows the convention for 'isolated' scopes as described in section 'Directive Definition Object' for angular [directives]{@link http://docs.angularjs.org/guide/directive}. 
		 * @param {Controller} controller - A controller function using the array-notation of angulars [$injector]{@link http://docs.angularjs.org/api/AUTO.$injector} service.
		 * @param {string} requires - A list of module-names that are required.
		 * @returns {Module} The ui-component which comes as angular [module]{@link http://docs.angularjs.org/api/angular.Module}.
		 */
		component: function(pkg, name, attrs, controller, requires) {
			var tag = firstDown(name);
		    return createComponent(pkg, name, tag, attrs, controller, requires);
		},
		/**
		 * Gets the component controller that is declared for the given angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope}.
		 * @param {Scope} scope - An angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope}.
		 */
		getComp: function(scope) {
		    return getComp(scope);
		},

        getChildCompScopes: function(scope) {
            return getChildCompScopes(scope);
        },

		/**
		 * Logs the current scope structure to the browser console. 
		 * The log contains also debugging information about the declaring and declared components together with their DOM elements. 
		 */
		logScopes: function() {
			logScopes();
		},
		/**
		 * Logs the current component structure to the browser console. 
		 * The log contains the component data hierarchie. 
		 */
		logComps: function() {
			logComps();
		}
	};
	return exports;
})(angular);
