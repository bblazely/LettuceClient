(function (w, ng) {
    'use strict';
    ng.module('EntitySearch', [{
        name: 'Input',
        files: ['components/Utils/Input/Input.js']
    },{
        name: 'API',
        files: ['components/API/API.js']
    }, {
        name: 'Entity',
        files: ['components/Entity/Entity.js']
    },{
        name: 'Widget.PopupContent',
        files: ['components/Widgets/PopupContent/PopupContent.js']
    },{
        name: 'Widget.Iterator',
        files: ['components/Widgets/Iterator/Iterator.js']
    },{
        files: ['components/EntitySearch/css/EntitySearch.css']
    }], null)
        .constant('EntitySearch.Event', {
            EVENT_SELECTED:     'EntitySearch::Selected',
            EVENT_QUERY:        'EntitySearch::Query',
            EVENT_SEARCHING:    'EntitySearch::Searching',
            EVENT_HAS_RESULT:   'EntitySearch::HasResult'
        })
        .directive('entitySearch', ['$state', '$timeout', 'Input.Constant', 'EntitySearch.Event',
            function($state, $timeout, C_INPUT, E_ENTITY_SEARCH) {
                return {
                    restrict: 'AE',
                    scope: {
                        select: '=?onSelect',
                        update: '@?onSelectUpdate'
                    },
                    templateUrl: 'components/EntitySearch/fragments/EntitySearch.tpl.html',
                    require: 'entitySearch',
                    link: function (scope, element, attr, ctrl) {
                        ctrl.hasChild = function(el) {
                            return element[0].contains(el);
                        };
                    },
                    controller: function($scope) {
                        var ctrl = this, flag_searching = false, flag_has_result = false, flag_has_selection = false, trigger;

                        // Define Controller Functions
                        ctrl.selectEntity = function (entity) {
                            if ($scope.update) {
                                trigger[0].value = entity.display_name;
                                trigger[0].blur();
                            }

                            if (!$scope.select) {
                                $state.go('root.entity', {'public_id': entity.public_id});
                            } else {
                                $scope.select(entity);
                            }

                            flag_has_selection = true;
                        };

                        ctrl.clearFlagHasSelection = function () {
                            flag_has_selection = false;
                        };

                        ctrl.registerTrigger = function (el) {
                            trigger = el;
                        };

                        // Define Scope Object
                        $scope.entity_search = {
                            isSearching: function () {
                                return flag_searching;
                            },
                            hasResult: function () {
                                return flag_has_result;
                            },
                            hasSelection: function () {
                                return flag_has_selection;
                            },
                            query: ''
                        };

                        $scope.$on(E_ENTITY_SEARCH.EVENT_SEARCHING, function($event, val) {
                            $event.stopPropagation();
                            if (val !== undefined) {
                                flag_searching = val;
                            } else {
                                flag_searching = !flag_searching;
                            }
                        });

                        $scope.$on(E_ENTITY_SEARCH.EVENT_HAS_RESULT, function($event, val) {
                            $event.stopPropagation();
                            if (val !== undefined) {
                                flag_has_result = val;
                            } else {
                                flag_has_result = !flag_has_result;
                            }
                        });

                        $scope.$on(E_ENTITY_SEARCH.EVENT_QUERY, function($event, query) {
                            $event.stopPropagation();
                            $scope.entity_search.query = query;
                            if (!query) {
                                flag_has_result = false;
                            }
                        });

                        $scope.$on(E_ENTITY_SEARCH.EVENT_SELECTED, function ($event, entity) {
                            $event.stopPropagation();
                            ctrl.selectEntity(entity);
                        });
                    }
                };
            }
        ])
        .directive('entitySearchTrigger', [
            '$timeout', 'EntitySearch.Event',
            function ($timeout, E_ENTITY_SEARCH) {
                return {
                    restrict: 'AC',
                    require: '^entitySearch',
                    link: function (scope, element, attr, entity_search) {
                        // Event Declaration
                        var event = {
                            onFocusIn: function (e) {
                                if (!entity_search.hasChild(e.relatedTarget)) {
                                    $timeout(function () {
                                        element[0].select();    // Select all existing text on a fresh focus (not coming from the list) ready for overwriting
                                    });
                                } else {
                                    element[0].selectionStart = element[0].value.length;    // Move cursor to the end of the text field
                                }

                                entity_search.clearFlagHasSelection();
                            },
                            onKeyDown: function () {
                                $timeout(function () {
                                    scope.$emit(E_ENTITY_SEARCH.EVENT_QUERY, element[0].value);
                                });
                            }
                        };

                        // Event Assignment
                        element.on('focusin', event.onFocusIn);
                        element.on('keydown', event.onKeyDown);

                        // Clean up
                        scope.$on('$destroy', function () {
                            element.off('focusin', event.onFocusIn);
                            element.off('keydown', event.onKeyDown);
                        });

                        // Register with the search handler
                        entity_search.registerTrigger(element);
                    }
                };
            }
        ])
        .directive('entitySearchResultList', [
            '$translate',
            '$translatePartialLoader',
            '$api',
            '$state',
            '$timeout',
            '$q',
            'EntitySearch.Event',
            function ($translate, $translatePartialLoader, $api, $state, $timeout, $q, E_ENTITY_SEARCH) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/EntitySearch/fragments/EntitySearchResultList.tpl.html',
                    require: '^entitySearch',
                    scope: {
                        query:              '=entitySearchQuery',
                        result_limit:       '=?entitySearchResultLimit',
                        more_limit:         '=?entitySearchMoreLimit',
                        schema_id:          '=?entitySearchSchemaId'
                    },
                    link: function(scope, element, attr, entity_search) {
                        scope.searching = function(state) {
                            entity_search.setFlagSearching(state);
                        };

                    },
                    controller: function ($scope) {
                        var current_query = null,
                            ctrl = this,
                            loading_timer = null,   // Timer to control search debounce
                            cancel_search = null,   // Promise used to cancel a running http search request
                            searching_timer,        // Timer to control setting 'searching' semaphore flag
                            result = {},
                            result_offset = {},
                            result_count = {};

                        $scope.result_limit = $scope.result_limit || 5;
                        $scope.schema_id = $scope.schema_id || '';
                        $scope.more_limit = $scope.more_limit || $scope.result_limit;

                        // Private
                        $translatePartialLoader.addPart('EntitySearch');
                        $translate.refresh();

                        function search(query, limit, offset, schema_id) {

                            // Wait 500ms before triggering the search process.
                            if (loading_timer) {
                                $timeout.cancel(loading_timer);
                            }

                            loading_timer = $timeout(function() {
                                loading_timer = null;

                                // Wait 100ms before triggering the 'searching' event flag
                                searching_timer = $timeout(function () {
                                    $scope.$emit(E_ENTITY_SEARCH.EVENT_SEARCHING, true);
                                }, 100);

                                // Cancel the last search if it is still running.
                                if (cancel_search !== null) {
                                    cancel_search.resolve(true);
                                }
                                cancel_search = $q.defer();

                                // Search
                                return $api.v1.get('entity/search/' + query + '/' + limit + '/' + offset + '/' + schema_id, null, cancel_search.promise)
                                    .then(function (response) {
                                        var result_data, result_found = false;

                                        if (query !== current_query) {
                                            result_count = {};
                                            result_data = {};
                                            result_offset = {};
                                        } else {
                                            result_data = result;
                                        }

                                        $timeout.cancel(loading_timer);
                                        $timeout.cancel(searching_timer);

                                        ng.forEach(response.data, function(entity_data, schema_id) {
                                            if (!result_data[schema_id]) {
                                                result_offset[schema_id] = 0;
                                                result_data[schema_id] = [];
                                                result_count[schema_id] = entity_data['tc'];
                                            }

                                            ng.forEach(entity_data['el'], function(entity) {
                                                result_data[schema_id].push(entity);
                                                result_offset[schema_id] += 1;
                                                result_found = true;
                                            });
                                        });

                                        $scope.$emit(E_ENTITY_SEARCH.EVENT_SEARCHING, false);
                                        cancel_search = null;
                                        result = result_data;

                                        if (query !== current_query) {
                                            $scope.$emit(E_ENTITY_SEARCH.EVENT_HAS_RESULT, result_found);
                                        }
                                        current_query = query;
                                    });
                            }, 500);
                        }

                        function search_init(query) {
                            current_query = null;
                            if (query) {
                                search(query, $scope.result_limit, 0, $scope.schema_id);
                            }
                        }

                        ctrl.search_more = function(schema_id) {
                            search(current_query, $scope.more_limit, result_offset[schema_id], schema_id);
                        };

                        ctrl.setResult = function(result) {
                            $scope.$emit(E_ENTITY_SEARCH.EVENT_SELECTED, result);
                        };

                        $scope.search_result_list = {
                            getResult: function () {
                                return result;
                            },
                            getSchemaName: function (schema_id) {
                                switch (parseInt(schema_id, 10)) {
                                    case 100:
                                        return "COMMON_USER";
                                    case 200:
                                        return "COMMON_GROUP";
                                    default:
                                        return "SCHEMA_TYPE_UNKNOWN";
                                }
                            },
                            getResultCount: function (schema_id) {
                                schema_id = parseInt(schema_id, 10);
                                if (result_count[schema_id]) {
                                    return result_count[schema_id];
                                }
                            },
                            getResultOffset: function (schema_id) {
                                schema_id = parseInt(schema_id, 10);
                                if (result_offset[schema_id]) {
                                    return result_offset[schema_id];
                                }
                            },
                            hasMore: function(schema_id) {
                                return result_count[schema_id] > result_offset[schema_id];
                            }
                        };

                        $scope.$watch('query', function (val) {
                            search_init(val);
                        });
                    }
                };
            }
        ])
        .directive('entitySearchResult', [
            'Input.Constant',
            function(C_INPUT) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/EntitySearch/fragments/EntitySearchResultPlate.tpl.html',
                    require: '^entitySearchResultList',
                    scope: {
                        entity: '=entitySearchResult'   // Pass to EntityPlate
                    },
                    link: function (scope, element, attr, result_list) {
                        element.on('click', function (e) {
                            e.preventDefault();
                            result_list.setResult(scope.entity);
                        });

                        element.on('keydown', function (e) {
                            if (e.keyCode === C_INPUT.KEY.ENTER || (e.keyCode === C_INPUT.KEY.TAB && !e.shiftKey)) {
                                e.preventDefault();
                                result_list.setResult(scope.entity);
                            }
                        });

                        scope.$on('$destroy', function () {
                            element.off();
                        });
                    }
                };
            }
        ])
        .directive('entitySearchMore', [
            'Input.Constant',
           function (C_INPUT) {
               return {
                   restrict: 'EA',
                   require: '^entitySearchResultList',
                   scope: {
                       schema_id: '=entitySearchMore'
                   },
                   link: function(scope, element, attr, result_list) {
                       element.on('click', function (e) {
                           e.preventDefault();
                           result_list.search_more(scope.schema_id);
                       });

                       element.on('keydown', function (e) {
                           if (e.keyCode === C_INPUT.KEY.ENTER || (e.keyCode === C_INPUT.KEY.TAB && !e.shiftKey)) {
                               e.preventDefault();
                               result_list.search_more(scope.schema_id);
                           }
                       });

                       scope.$on('$destroy', function () {
                           element.off();
                       });
                   }
               };
           }
        ]);
}(window, window.angular));