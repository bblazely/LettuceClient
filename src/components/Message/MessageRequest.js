(function (w, ng) {
    'use strict';
    ng.module('MessageRequest', [{
        name: 'Entity',
        files: ['components/Entity/Entity.js']
    }, {
        files: ['components/MessageRequest/css/MessageRequest.css']
    }], null)
        .service('EntityRequest.Service', [
            '$api', '$q',
            function ($api, $q) {

                function get_requests(request_id) {
                    var promise = $q.defer(), request_list;

                    $api.v1.get('request/' + (request_id || ''))
                        .success(function (requests) {
                            // merge new requests in
                            request_list = requests;
                            promise.resolve(request_list);
                        })
                        .error(function (data) {
                            promise.reject(data);
                        });

                    return promise.promise;
                }

                function get_request_count() {
                    var promise = $q.defer();

                    $api.v1.get('request/count')
                        .success(function (data) {
                            console.log('resolve',data);
                            // merge new requests in
                            promise.resolve(data);
                        })
                        .error(function (data) {
                            promise.reject(data);
                        });

                    return promise.promise;
                }


                return {
                    requests:               get_requests,
                    get_request_count:      get_request_count
                };
            }
        ])

        .directive('entityRequestListPopup', [
            '$api',
            'EntityRequest.Service',
            'Entity.Constant',
            function ($api, entity_request, C_ENTITY) {
                return {
                    restrict: 'A',
                    scope: {
                        entity_id: '=entityRequestListPopup'
                    },
                    templateUrl: 'components/EntityRequest/fragments/EntityRequestListPopup.tpl.html',
                    link: function (scope, elem, attr) {
                        scope.message_list_popup = {
                            counter: 0
                        };

                        entity_request.get_request_count().then(function (data) {
                            scope.message_list_popup.counter = data;
                        });

                        // RTU Watcher for request changes
                        $api.v1.rtu_register(scope.entity_id, C_ENTITY.ASSOCIATION.HAS_PENDING, 0,
                            // New Request Issued
                            function (entity_id, request) {
                                console.log('got requests:', request);
                                if (request && request[entity_id]) {
                                    scope.requests.push(request[entity_id]);
                                } else {
                                    entity_request.requests(entity_id).then(function (request) {// TODO: This is completely borked. Copy and paste fail.
                                        scope.entity_request.requests.push(request[entity_id]);
                                    });
                                }
                            },
                            null,
                            null,
                            scope
                        );


                        // TODO get number of available requests and display it as a pill
                    }
                };
            }
        ])

        .directive('entityRequestList', [
            '$api', '$rootScope', 'EntityRequest.Service', 'API.Event', 'Entity.Constant',
            function ($api, $rootScope, entity_request, E_API, C_ENTITY) {
                return {
                    restrict: 'A',
                    scope: {
                        entity_id: '=entityRequestList',
                        counter:     '=entityRequestListCount'
                    },
                    templateUrl: 'components/EntityRequest/fragments/EntityRequestList.tpl.html',
                    controller: function ($scope) {
                        var remove, loaded = false;
                        $scope.message_list = {
                            requests: [],
                            loading: function () {
                                return !loaded;
                            }
                        };

                        // Public
                        remove = function (request_id) {
                            if ($scope.message_list.requests) {
                                var pos = $scope.message_list.requests.map(function (e) {
                                    if (e) {
                                        return e.entity_id;
                                    }
                                    return false;
                                }).indexOf(request_id);
                                if (pos !== -1) {
                                    $scope.message_list.requests.splice(pos, 1);
                                }

                                $scope.counter = $scope.message_list.requests.length;
                            }
                        };

                        // Private
                        entity_request.requests().then(function(requests) {
                            ng.forEach(requests, function(request) {
                                $scope.message_list.requests.push(request);
                            });
                            $scope.counter = $scope.message_list.requests.length;
                            loaded = true;
                        });

                        // RTU Watcher for request changes
                        $api.v1.rtu_register($scope.entity_id, C_ENTITY.ASSOCIATION.HAS_PENDING, 0,
                            // New Request Issued
                            function (entity_id, request) {
                                if (request && request[entity_id]) {
                                    $scope.message_list.requests.push(request[entity_id]);
                                } else {
                                    entity_request.requests(entity_id).then(function (request) {
                                        $scope.message_list.requests.push(request[entity_id]);
                                    });
                                }
                            },
                            // Request Removed
                            function (entity_id) {
                                remove(entity_id);
                            },
                            null,
                            $scope
                        );

                        // Shared Controller Interface
                        this.remove = remove;
                    }
                };
            }
        ])

        .directive('messageRequestPlate', [
            '$api',
            'Entity.Service',
            'EntityRequest.Service',
            function ($api, entity, entity_request) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/Message/fragments/MessageRequestPlate.tpl.html',
                    scope: {
                        message: '=messageRequestPlate'
                    },
                    require: '?^messageList',
                    link: function (scope, element, attr, request_list) {
                        scope.respond = function (action) {

                            $api.v1.put('request', {
                                request_id: scope.message.entity_id,
                                action: action
                            })
                            .success(function(result) {
                            })
                            .error(function(result) {
                                console.log('error with request response');
                            });

                            if (request_list) {
                                request_list.remove(scope.message)
                            }
                        };

                    }
                }
            }
        ])

}(window, window.angular));
