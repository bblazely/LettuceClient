(function (w, ng) {
    'use strict';
    ng.module('Message', [{
        name: 'MessageRequest',
        files: [
            'components/Message/css/MessageRequest.css',
            'components/Message/MessageRequest.js'
        ]
    }, {
        files: ['components/Message/css/Message.css']
    }], null)
        .service('Message.Service', [
            '$api', '$q',
            function ($api, $q) {

                function get_messages(message_id) {
                    var promise = $q.defer(), message_list;

                    $api.v1.get('message/' + (message_id || ''))
                        .success(function (messages) {
                            // merge new requests in
                            message_list = messages;
                            promise.resolve(message_list);
                        })
                        .error(function (data) {
                            promise.reject(data);
                        });

                    return promise.promise;
                }

                function get_message_count() {
                    var promise = $q.defer();

                    $api.v1.get('message/count')
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
                    messages:               get_messages,
                    message_count:          get_message_count
                };
            }
        ])

        .directive('messageListPopup', [
            '$api',
            'Message.Service',
            'Entity.Constant',
            function ($api, message, C_ENTITY) {
                return {
                    restrict: 'A',
                    scope: {
                        entity_id: '=messageListPopup'
                    },
                    templateUrl: 'components/Message/fragments/MessageListPopup.tpl.html',
                    link: function (scope, elem, attr) {
                        scope.message_list_popup = {
                            counter: 0
                        };

                        message.message_count().then(function (data) {
                            scope.message_list_popup.counter = data;
                        });

                        // RTU Watcher for message changes
                        // NYI


                        // TODO get number of available requests and display it as a pill
                    }
                };
            }
        ])

        .directive('messageList', [
            '$api', '$rootScope', 'Message.Service', 'API.Event', 'Entity.Constant',
            function ($api, $rootScope, message, E_API, C_ENTITY) {
                return {
                    restrict: 'A',
                    scope: {
                        entity_id:  '=messageList',
                        counter:    '=messageListCount'
                    },
                    templateUrl: 'components/Message/fragments/MessageList.tpl.html',
                    controller: function ($scope) {
                        var remove, loaded = false, tpl;

                        tpl = $scope.tpl = {
                            messages: [],
                            loading: function () {
                                return !loaded;
                            }
                        };

                        // Public
                        remove = function (message_id) {
                            if (tpl.messages) {
                                var pos = tpl.messages.map(function (e) {
                                    if (e) {
                                        return e.entity_id;
                                    }
                                    return false;
                                }).indexOf(message_id);
                                if (pos !== -1) {
                                    tpl.messages.splice(pos, 1);
                                }

                                $scope.counter = tpl.messages.length;
                            }
                        };

                        // Private
                        message.messages().then(function(msg_list) {
                            ng.forEach(msg_list, function(msg) {
                                tpl.messages.push(msg);
                            });
                            $scope.counter = tpl.messages.length;
                            loaded = true;
                        });

                        // RTU Watcher for request changes
                        $api.v1.rtu_register($scope.entity_id, C_ENTITY.ASSOCIATION.MSG__RECIPIENT_OF, 0,
                            // New Request Issued
                            function (entity_id, message) {
                                if (message && message[entity_id]) {
                                    tpl.messages.push(message[entity_id]);
                                } else {
                                    message.messages(entity_id).then(function (m) {
                                        tpl.messages.push(m[entity_id]);
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
}(window, window.angular));
