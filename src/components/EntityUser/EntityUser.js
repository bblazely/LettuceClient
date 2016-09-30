(function (w, ng) {
    'use strict';
    ng.module('EntityUser', [{
            files: ['components/EntityUser/css/EntityUserGroupList.css']
        },{
            name: 'Entity',
            files: ['components/Entity/Entity.js']
        },{
            name: 'Facebook',
            files: ['components/Facebook/Facebook.js']
        }], null)
        .service('EntityUser.Service', [
            '$api',
            '$q',
            'UserSession.Service',
            'Entity.Constant',
            function ($api, $q, user_session, C_ENTITY) {

                function get_groups(scope) {
                    var groupPromise = $q.defer();

                    if (!scope) {
                        scope = '';
                    }

                    user_session.get().then(function(session) {
                        $api.v1.get('user/groups/' + scope)
                            .success(function (groups, status, headers) {
                                groupPromise.resolve({l: groups, t: headers('request-time')});
                            })
                            .error(function (data) {
                                groupPromise.reject(data);
                            });
                    });

                    return groupPromise.promise;
                }

                function get_user_id() {
                    var promise = $q.defer();

                    user_session.get().then(function(session) {
                       promise.resolve(parseInt(session.entity_id, 10));
                    });

                    return promise.promise;
                }

                return {
                    groups: get_groups,
                    user_id: get_user_id
                };
            }
        ])
        .directive('entityUser', [
            '$rootScope',
            '$translate',
            '$translatePartialLoader',
            '$stateParams',
            'Entity.Service',
            'Entity.Constant',
            'UserSession.Event',
            function ($rootScope, $translate, $translatePartialLoader, $stateParams, entity, C_ENTITY, E_USER_SESSION) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/EntityUser/fragments/EntityUserTopLevel.tpl.html',
                    scope: {
                        entity_data: '=entityUser'
                    },
                    link: function (scope, element, attr, form) {
                         scope.PERMISSION = C_ENTITY.PERMISSION;

                         // Init: Grab initial permissions
                         entity.permissions(scope.entity_data.entity_id).then(function(perm) {
                            scope.perm = perm;
                         });

                         // Trigger permission load on session change
                         $rootScope.$on(E_USER_SESSION.EVENT_CHANGE_STATE, function(e, action) {
                             console.log('session change detected', $stateParams);
                             if ($stateParams.public_id) {  // Only if we're on a defined page
                                 switch (action) {
                                     case E_USER_SESSION.ACTION_START:
                                         entity.permissions($stateParams.public_id, C_ENTITY.SCHEMA.USER).then(function (perm) {
                                             scope.perm = perm;
                                         });
                                         break;
                                     case E_USER_SESSION.ACTION_END:
                                         scope.perm = null;
                                         break;
                                 }
                             }
                         });
                    }
                };
            }
        ])
        .directive('entityUserGroupList', [
            '$translate',
            '$translatePartialLoader',
            '$api',
            '$state',
            '$rootScope',
            'Entity.Service',
            'EntityUser.Service',
            'SimpleState.Service',
            'SimpleState.Constant',
            'EntityGroup.Event',
            'API.Event',
            function ($translate, $translatePartialLoader, $api, $state, $rootScope, entity, entity_user, simple_state, C_SIMPLE_STATE, E_ENTITY_GROUP, E_API) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/EntityUser/fragments/EntityUserGroupList.tpl.html',
                    scope: {
                        assoc_type: '=?entityUserGroupList'
                    },
                    link: function (scope, element, attr, form) {
                        var user_id = null, group_timestamp = 0;

                        //                              scope.groups.map(function(e) { return e['entity_id']; }).indexOf('Another Invite')


                        // Private
                        $translatePartialLoader.addPart('EntityUser');
                        $translate.refresh();
                        scope.groups = [];
                        if (!scope.assoc_type) {
                            scope.assoc_type = 202;
                        }

                        entity_user.groups(scope.assoc_type).then(function(groups) {
                            group_timestamp = groups.t;
                            console.log(scope.assoc_type, 'loaded at', groups.t);
                            ng.forEach(groups.l, function(entity, id) {
                                scope.groups.push(entity);
                            });

                            if (user_id) {
                                $api.v1.rtu_register(user_id, scope.assoc_type, group_timestamp,
                                    // Add Current User to Group
                                    function (entity_id, request) {
                                        if (scope.groups.filterObjectKeys('entity_id', entity_id).length === 0) {
                                            if (request && request[entity_id]) {
                                                scope.groups.push(request[entity_id]);
                                            } else {
                                                entity.get(entity_id).then(function (group) {
                                                    scope.groups.push(group);
                                                });
                                            }
                                        }
                                    },
                                    // Remove Current User From Group
                                    function (entity_id) {
                                        var pos = scope.groups.map(function (e) {
                                            return e['entity_id'];
                                        }).indexOf(entity_id);
                                        if (pos !== -1) {
                                            scope.groups.splice(pos, 1);
                                        }
                                    },
                                    null,
                                    scope
                                );
                            }
                        });

                        entity_user.user_id().then(function(response) {
                            user_id = response;
                        });
                    }
                };
            }
        ])
}(window, window.angular));
