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
/*
 * Version: ui-components v1.1
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
		// TODO: clarify: this matches also intermediate scopes (ng-repeat, ng-if) 
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

	function getNodeScope(node) {
	    var scope = node.data('$isolateScope');
	    if (scope === undefined) {
	    	scope =  node.data('$scope');
	    }
	    return scope;
	}

	function getScope(node) {
		var element = findDeclaringComponentByUuid(node);
		var scope = getNodeScope(element);
	    return scope;
	}

	function getComp(scope) {
		var compScope = getScope(scope.element);
		if (compScope == null) {
			return null;
		}
	    return compScope.comp;
	}

	function getCompInfo(scope) {
		var compScope = getScope(scope.element);
		if (compScope == null) {
			return null;
		}
	    return compScope.compInfo;
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
	    var uiName = scope.compInfo ? scope.compInfo.name : (isRootUuid(scope.declaredUuid) ? "<root>" : "?comp?");
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
	    var uiName = scope.compInfo ? scope.compInfo.name : (isRootUuid(scope.declaredUuid) ? "<root>" : "?comp?");
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
	
    function getParent(scope) {
    	var parentElement = scope.element.parent();
    	var parent = null;
    	if (parentElement) {
        	parent = getScope(parentElement); 
    	}
        return parent;
    }
	
    function getChildren(scope) {
        var children = [];
        collectChildren(scope, children);
        return children;
    }

    function collectChildren(scope, children) {
        var child = scope.$$childHead;
        while (child != null && child !== scope) {
        	if (!child.$$transcluded) {
	            if (child.declaredUuid) {
	            	children.push(child);
	            } else {
	            	collectChildren(child, children);
	            }
        	}
            child = child.$$nextSibling;
        }
        if (scope.$$nextSibling != null && scope.$$nextSibling.$$transcluded) {
        	collectChildren(scope.$$nextSibling, children);
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
	                if ($injector.has('uiIntegrationProvider')) {
	                	var uiIntegrationProvider = $injector.get('uiIntegrationProvider');
	                	templateUrl = uiIntegrationProvider.getTemplateUrl(pkg, name, tAttrs);
	                }
	                templateUrl = encodeUuid(uuid, templateUrl);
	                //console.log(name + "-template-url: ", $compileNode, tAttrs, "declared-component", getUuid($compileNode), $compileNode, "declaring-component", declaringComponent, getUuid(declaringComponent));
	                declaringComponentHolder.setDeclaringComponent(templateUrl, $compileNode);
	                return templateUrl;
	            },
	            controller: decorateController(pkg, name, attrs, $controller, controller)
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

	function decorateController(pkg, name, attrs, $controller, controller) {
	    return ['$injector', '$scope', '$parse', '$interpolate', '$compile', '$log', function UiComponentController($injector, $scope, $parse, $interpolate, $compile, $log) {

	    	// create component info 
    		$scope.compInfo = {
				pkg: pkg,
	            name: name
			};

    		// create empty comp instance
    		$scope.comp = {};

    		// check, for custom component-instance creation
            if ($injector.has('uiIntegrationProvider')) {
            	var uiIntegrationProvider = $injector.get('uiIntegrationProvider');
		        var customComp = uiIntegrationProvider.createComponentInstance(pkg, name, attrs, $scope);
		        if (customComp) {
		        	$scope.comp = customComp;
		        }
            }
	    	
	        
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
    
    
	uiModule.directive("uiId", function(){
	    return {
	        restrict: 'A',
	        compile: function(tElement, tAttrs, transclude) {
	            //console.log("compile-uiId", tElement, tAttrs, transclude);
	            return compileFns(
	                function uiUidPreLink(scope, iElement, iAttrs, controller) {
	                },
	                function uiUidPostLink(scope, iElement, iAttrs, controller) {
                        function isRepeat(scope) {
                            return scope !== undefined && scope.$index !== undefined && scope.$first !== undefined && scope.$last !== undefined;
                        }
                        if (scope) {
                            var ds = isRepeat(scope.$parent) ? scope.$parent : scope.declaringScope;
	                        var uiId = iAttrs.uiId;
	                        var comp = getComp(scope);
	                        //console.log("link-uiId-post", uiId, scope, tElement, tAttrs, controller, "declaring-scope", ds, "comp", comp);
	                        ds[uiId] = comp;
	                        //console.log("link-uiId-post", scope, tElement, tAttrs, controller);
	                    }
                    }
	            );
	        }
	    };
	});

	/**
	 * The <tt>uiIntegrationProvider</tt> interface can be implemented to customize ui-component creation and template resolving.
	 * The custom implementation needs to be published as 'uiIntegrationProvider' in the [$injector]{@link https://docs.angularjs.org/api/auto/service/$injector}-service of the angular application running the ui-components.
	 * The ui-components implementations checks the $injector, if the 'uiIntegrationProvider' is available and invokes the necessary callback functions.
	 *   
	 * @mixin uiIntegrationProvider
	 * @version 1.1
	 */
	var uiIntegrationProvider = /** @lends uiIntegrationProvider.prototype */{
		/**
		 * Create the component instance that can be referenced as <tt>comp</tt> parameter in the corresponding template of the ui-component.
		 * 
		 * By default, an empty object (<tt>{}</tt>) is created.
		 * 
	     * @param {string} pkg - The package of the ui-component as given in the [ui.component]{@link module:ui.component} function.
	     * @param {string} name - The name of the ui-component as given in the [ui.component]{@link module:ui.component} function.
	     * @param {map} attrs - The attribute specification of the ui-component as given in the [ui.component]{@link module:ui.component} function.
		 * @param {Scope} scope - The angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope} this component will be bound to.
		 */
		createComponentInstance: function(pkg, name, attrs, scope) {
		},
		
	    /**
	     * Return the template url that should be used to load the html-template for the ui-component denoted by <tt>pkg</tt> and <tt>name</tt>.
	     * This callback method allows ui-component users to implement a custom strategy for loading html-templates.
	     * See also [templateUrl]{@link https://docs.angularjs.org/api/ng/service/$compile}-function in angulars directive API documentation.
	     * 
	     * By default, the ui-components use the following strategy to create template-urls
	     * <pre>
	     * templateUrl = (pkg != '' ? pkg + '/' : '') + name + '.html'
	     * </pre>
	     * 
	     * @param {string} pkg - The package of the ui-component as given in the [ui.component]{@link module:ui.component} funciton.
	     * @param {string} name - The name of the ui-component as given in the [ui.component]{@link module:ui.component} funciton.
	     * @param {Attributes} tAttrs - The template [atttributes]{@link https://docs.angularjs.org/api/ng/type/$compile.directive.Attributes} used for angulars template directives.
	     */
		getTemplateUrl: function(pkg, name, tAttrs) {
		}
	};

	/**
	 * The <tt>ui</tt> module provides the access function for creating and traversing ui-components.
	 *  
	 * @exports ui
	 */
	var exports = {
		/**
		 * Creates a ui-component. For fine grained control on ui-component creation and template resolving see also {@link uiIntegrationProvider}.
		 * @param {string} pkg - The package for this component. This is denoted by the path to the <tt>&lt;component&gt;.js</tt> and <tt>&lt;component&gt;.html</tt> files relative to the application folder.
		 * @param {string} name - The name of the component. The name is expected to be a valid camel-case javascript identifier starting with an upper-case letter.
		 * @param {map} attrs - Map of attribute definitions. A map entry consists of the attribute name as key and the binding-specification a value. This follows the convention for 'isolated' scopes as described in section 'Directive Definition Object' for angular [directives]{@link http://docs.angularjs.org/guide/directive}. 
		 * @param {Controller} controller - A controller function using the array-notation of angulars [$injector]{@link http://docs.angularjs.org/api/AUTO.$injector} service.
		 * @param {string} requires - A list of module-names that are required.
		 * @returns {Module} The angular [module]{@link http://docs.angularjs.org/api/angular.Module} this ui-component is defined in.
		 */
		component: function(pkg, name, attrs, controller, requires) {
			var tag = firstDown(name);
		    return createComponent(pkg, name, tag, attrs, controller, requires);
		},
		
		/**
		 * Gets the component instance that is declared for the given angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope}.
		 * @param {Scope} scope - An angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope}.
		 * @returns {object} The component instance that is accociated with the given scope.
		 */
		getComp: function(scope) {
		    return getComp(scope);
		},

		/**
		 * Gets the closest component scope for the given angular element.  
		 * @param {DOMElement} element - The [DOM element]{@link https://docs.angularjs.org/api/ng/function/angular.element} wrapped into jQuery.   
		 * @returns {Scope} The angular [scope]{@link https://docs.angularjs.org/api/ng/type/$rootScope.Scope} holding the closest ui-component.
		 * 
		 * @version 1.1
		 */
		getScope: function(element) {
			return getScope(element);
		},
		
		/**
		 * Gets the parent component-scope for the given component-scope according to the document tree of the rendered page, i. e. after all transcludes are resolved.  
		 * @param {Scope} scope - An angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope} refering to a ui-component.
		 * @returns {Scope} The angular [scope]{@link https://docs.angularjs.org/api/ng/type/$rootScope.Scope} holding the parent ui-component in the document tree.
		 * 
		 * @version 1.1
		 */
        getParent: function(scope) {
            return getParent(scope);
        },
		
		/**
		 * Gets the child component-scopes for the given component-scope according to the document tree of the rendered page, i. e. after all transcludes are resolved.  
		 * @param {Scope} scope - An angular [scope]{@link http://docs.angularjs.org/api/ng.$rootScope.Scope} refering to a ui-component.
		 * @returns {array<Scope>} An array of angular [scopes]{@link https://docs.angularjs.org/api/ng/type/$rootScope.Scope} holding the child ui-component in the document tree.
		 * 
		 * @version 1.1
		 */
        getChildren: function(scope) {
            return getChildren(scope);
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
		 * The log contains the component data hierarchy. 
		 */
		logComps: function() {
			logComps();
		}
	};
	return exports;
})(angular);
